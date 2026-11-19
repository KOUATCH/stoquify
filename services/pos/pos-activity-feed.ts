import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { posActivityKinds, type POSActivityKind } from "./pos-activity.types"

export type POSActivityFeedRow = {
  id: string
  kind: POSActivityKind
  kindRank: number
  occurredAt: Date
  reference: string
  status: string
  amount: string | null
  locationId: string
  terminalId: string | null
  sessionId: string | null
  locationLabel: string
  terminalLabel: string | null
  sessionLabel: string | null
  cashier: string | null
  customerName: string | null
  customerPhoneLastFour: string | null
  saleId: string | null
  actorId: string | null
}

export type POSActivityPosition = { occurredAt: Date; kindRank: number; id: string }

type FeedScope = {
  organizationId: string
  ownUserId: string | null
  locationId: string | null
  terminalId: string | null
  sessionId: string | null
  start: Date
  end: Date
  timezone: string
}

type FeedQuery = FeedScope & {
  receiptsOnly: boolean
  search?: string
  total?: string | null
  fromTime?: string | null
  toTime?: string | null
  after?: POSActivityPosition
  detail?: { kind: POSActivityKind; id: string }
  limit: number
}

const { sql, empty, join } = Prisma

// The stored Prisma timestamps represent UTC without an attached PostgreSQL zone.
function utcTimestamp(value: Date) {
  return sql`(${value.toISOString()}::timestamptz AT TIME ZONE 'UTC')`
}

function scopeConditions(scope: FeedScope) {
  const { organizationId, ownUserId, locationId, terminalId, sessionId } = scope
  return sql`
    l."organizationId" = ${organizationId}
    AND (${locationId}::text IS NULL OR l.id = ${locationId})
    AND (${terminalId}::text IS NULL OR t.id = ${terminalId})
    AND (${sessionId}::text IS NULL OR sh.id = ${sessionId})
    AND (${ownUserId}::text IS NULL OR sh."userId" = ${ownUserId})
  `
}

function salesLanes(scope: FeedQuery, kinds: readonly POSActivityKind[]) {
  const { organizationId, start, end, timezone, total, fromTime, toTime } = scope
  const saleRelations = sql`
    FROM sales_orders s
    JOIN locations l ON l.id = s."locationId"
    LEFT JOIN pos_terminals t ON t.id = s."terminalId" AND t."organizationId" = s."organizationId" AND t."locationId" = l.id
    LEFT JOIN pos_sessions sh ON sh.id = s."sessionId" AND sh."organizationId" = s."organizationId"
      AND sh."locationId" = l.id AND sh."terminalId" = t.id
  `
  const saleScope = sql`
    s."organizationId" = ${organizationId} AND s.channel = 'POS' AND s."deletedAt" IS NULL AND ${scopeConditions(scope)}
    AND (s."terminalId" IS NULL OR t.id IS NOT NULL) AND (s."sessionId" IS NULL OR sh.id IS NOT NULL)
  `
  const saleLabels = sql`
    l.id AS "locationId", l.name AS "locationLabel", t.id AS "terminalId", t.name AS "terminalLabel",
    sh.id AS "sessionId", sh."sessionNumber" AS "sessionLabel", s.id AS "saleId", s."customerId"
  `
  const lanes: Prisma.Sql[] = []

  if (kinds.includes("sale")) {
    // Apply the clock filter to both occurrences of a repeated local minute.
    // The date range above still limits the underlying indexed UTC timestamps.
    const localMinute = sql`date_trunc('minute', timezone(${timezone}, timezone('UTC', s."orderDate")))::time`
    const receiptTotal = total != null ? sql`AND s.total = ${total}::numeric` : empty
    const receiptStart = fromTime ? sql`AND ${localMinute} >= ${fromTime}::time` : empty
    const receiptEnd = toTime ? sql`AND ${localMinute} <= ${toTime}::time` : empty
    const voided = sql`
      OR (s.status = 'CANCELLED' AND EXISTS (
        SELECT 1 FROM business_events v
        WHERE v."organizationId" = s."organizationId" AND v."sourceId" = s.id AND v."eventSource" = 'POS'
          AND v."eventType" = 'pos.sale.voided' AND v."sourceType" = 'POS_VOID'
          AND v."locationId" = l.id AND v."registerId" = t.id AND v.payload->>'sessionId' = sh.id
      ))
    `
    lanes.push(sql`
      SELECT s.id, 'sale' AS kind, 0 AS "kindRank", s."orderDate" AS "occurredAt",
        s."orderNumber" AS reference, s.status::text, s.total::text AS amount, ${saleLabels},
        COALESCE(s."createdById", sh."userId") AS "actorId"
      ${saleRelations}
      WHERE ${saleScope} AND s."orderDate" >= ${utcTimestamp(start)} AND s."orderDate" < ${utcTimestamp(end)}
        AND (s.status IN ('COMPLETED', 'RETURNED') ${voided})
        ${receiptTotal} ${receiptStart} ${receiptEnd}
    `)
  }

  const correctionKinds = kinds.filter((kind) => kind === "return" || kind === "void")
  for (const kind of correctionKinds) {
    const eventType = kind === "return" ? "pos.refund.issued" : "pos.sale.voided"
    const sourceType = kind === "return" ? "POS_REFUND" : "POS_VOID"
    const amount = kind === "return" ? sql`CASE WHEN e.payload->>'totalRefunded' ~ '^[0-9]+([.][0-9]+)?$' THEN e.payload->>'totalRefunded' END` : sql`s.total::text`
    lanes.push(sql`
      SELECT e.id, ${kind}::text AS kind, ${posActivityKinds.indexOf(kind)}::int AS "kindRank", e."occurredAt",
        s."orderNumber" AS reference, 'RECORDED' AS status, ${amount} AS amount, ${saleLabels}, e."actorId"
      ${saleRelations}
      JOIN business_events e ON e."organizationId" = s."organizationId" AND e."sourceId" = s.id
        AND e."locationId" = l.id AND e."registerId" = t.id AND e.payload->>'sessionId' = sh.id
      WHERE ${saleScope} AND e."eventSource" = 'POS' AND e."eventType" = ${eventType} AND e."sourceType"::text = ${sourceType}
        AND e."occurredAt" >= ${utcTimestamp(start)} AND e."occurredAt" < ${utcTimestamp(end)}
    `)
  }
  return lanes
}

function sessionLanes(scope: FeedScope, kinds: readonly POSActivityKind[]) {
  return kinds.filter((kind) => kind === "shift_open" || kind === "shift_close").map((kind) => {
    const occurredAt = kind === "shift_open" ? sql`sh."startTime"` : sql`sh."endTime"`
    const amount = kind === "shift_open" ? sql`sh."openingBalance"` : sql`sh."closingBalance"`
    const status = kind === "shift_open" ? "OPENED" : "CLOSED"
    return sql`
      SELECT sh.id, ${kind}::text AS kind, ${posActivityKinds.indexOf(kind)}::int AS "kindRank", ${occurredAt} AS "occurredAt",
        sh."sessionNumber" AS reference, ${status}::text AS status, ${amount}::text AS amount,
        l.id AS "locationId", l.name AS "locationLabel", t.id AS "terminalId", t.name AS "terminalLabel",
        sh.id AS "sessionId", sh."sessionNumber" AS "sessionLabel", NULL::text AS "saleId", NULL::text AS "customerId", sh."userId" AS "actorId"
      FROM pos_sessions sh
      JOIN locations l ON l.id = sh."locationId"
      JOIN pos_terminals t ON t.id = sh."terminalId" AND t."organizationId" = sh."organizationId" AND t."locationId" = l.id
      WHERE sh."organizationId" = ${scope.organizationId} AND ${scopeConditions(scope)}
        AND ${occurredAt} >= ${utcTimestamp(scope.start)} AND ${occurredAt} < ${utcTimestamp(scope.end)}
    `
  })
}

function drawerLane(scope: FeedScope) {
  const { organizationId, ownUserId, locationId, terminalId, sessionId, start, end } = scope
  return sql`
    SELECT d.id, 'drawer' AS kind, 5 AS "kindRank", d."createdAt" AS "occurredAt", cd."drawerNumber" AS reference,
      d.type::text AS status, d.amount::text,
      l.id AS "locationId", l.name AS "locationLabel", t.id AS "terminalId", t.name AS "terminalLabel",
      sh.id AS "sessionId", sh."sessionNumber" AS "sessionLabel", NULL::text AS "saleId", NULL::text AS "customerId", d."userId" AS "actorId"
    FROM cash_drawer_transactions d
    JOIN cash_drawers cd ON cd.id = d."cashDrawerId"
    JOIN locations l ON l.id = cd."locationId" AND l."organizationId" = ${organizationId}
    JOIN pos_terminals t ON t.id = cd."terminalId" AND t."organizationId" = ${organizationId} AND t."locationId" = l.id
    LEFT JOIN pos_sessions sh ON sh.id = d."sessionId" AND sh."organizationId" = ${organizationId}
      AND sh."locationId" = l.id AND sh."terminalId" = t.id
    WHERE d.type IN ('CASH_IN', 'CASH_OUT', 'RECONCILIATION', 'PAYOUT')
      AND d."createdAt" >= ${utcTimestamp(start)} AND d."createdAt" < ${utcTimestamp(end)}
      AND (d."sessionId" IS NULL OR sh.id IS NOT NULL)
      AND (${locationId}::text IS NULL OR l.id = ${locationId})
      AND (${terminalId}::text IS NULL OR t.id = ${terminalId})
      AND (${sessionId}::text IS NULL OR sh.id = ${sessionId})
      AND (${ownUserId}::text IS NULL OR (d."userId" = ${ownUserId} AND (sh.id IS NULL OR sh."userId" = ${ownUserId})))
  `
}

export async function findPOSActivityRows(query: FeedQuery) {
  const { after, detail, limit, search, receiptsOnly, organizationId } = query
  const kinds: readonly POSActivityKind[] = detail ? [detail.kind] : receiptsOnly ? ["sale"] : posActivityKinds
  const lanes = [...salesLanes(query, kinds), ...sessionLanes(query, kinds)]
  if (kinds.includes("drawer")) lanes.push(drawerLane(query))
  const cursorCondition = after ? sql`AND (
    a."occurredAt" < ${utcTimestamp(after.occurredAt)}
    OR (a."occurredAt" = ${utcTimestamp(after.occurredAt)} AND (a."kindRank", a.id) > (${after.kindRank}::int, ${after.id}))
  )` : empty
  const phoneDigits = sql`regexp_replace(c.phone, '[^0-9]+', '', 'g')`
  const phoneLastFour = sql`CASE WHEN length(${phoneDigits}) > 4 THEN right(${phoneDigits}, 4) END`
  const phoneSearch = search && /^[0-9]{4}$/.test(search) ? sql`OR ${phoneLastFour} = ${search}` : empty
  const searchCondition = search ? sql`AND (
    strpos(lower(a.reference), lower(${search})) > 0 OR strpos(lower(a.id), lower(${search})) > 0
    OR strpos(lower(COALESCE(a."saleId", '')), lower(${search})) > 0
    OR strpos(lower(COALESCE(a."sessionLabel", '')), lower(${search})) > 0
    OR strpos(lower(c.name), lower(${search})) > 0
    ${phoneSearch}
    OR EXISTS (SELECT 1 FROM payments p WHERE p."salesOrderId" = a."saleId" AND p."organizationId" = ${organizationId}
      AND p."deletedAt" IS NULL AND strpos(lower(p."paymentNumber"), lower(${search})) > 0)
  )` : empty
  const detailCondition = detail ? sql`AND a.id = ${detail.id}` : empty

  return db.$queryRaw<POSActivityFeedRow[]>(sql`
    SELECT a.*, NULLIF(trim(concat_ws(' ', u."firstName", u."lastName")), '') AS cashier,
      NULLIF(trim(c.name), '') AS "customerName", ${phoneLastFour} AS "customerPhoneLastFour"
    FROM (${join(lanes, " UNION ALL ")}) a
    LEFT JOIN users u ON u.id = a."actorId"
    LEFT JOIN customers c ON c.id = a."customerId" AND c."organizationId" = ${organizationId}
      AND c."deletedAt" IS NULL AND c.code IS DISTINCT FROM 'WALK_IN'
    WHERE true ${cursorCondition} ${searchCondition} ${detailCondition}
    ORDER BY a."occurredAt" DESC, a."kindRank" ASC, a.id ASC
    LIMIT ${limit}
  `)
}
