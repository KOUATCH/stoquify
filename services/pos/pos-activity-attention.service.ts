import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { ApplicationError, NotFoundError } from "@/services/_shared/action-errors"
import {
  WHATSAPP_RECEIPT_EVENT_NAME,
  WHATSAPP_RECEIPT_EVENT_TYPE,
  WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
  WHATSAPP_RECEIPT_RETRYABLE_REJECTION,
} from "@/services/communication/whatsapp-receipt-outbox.service"

import { getPOSActivityDay } from "./pos-activity-day"
import type { POSAttentionRow } from "./pos-activity-attention.types"
import type { POSActivityFilters } from "./pos-activity.types"
import { getPOSWhatsAppReceiptStatusesForScopedSales } from "./whatsapp-receipt.service"

type AttentionInput = POSActivityFilters & { cursor?: string }
type AttentionActor = { organizationId: string; userId: string }
type AttentionRecord = Omit<POSAttentionRow, "occurredAt" | "status"> & { occurredAt: Date }

const pageSize = 25
const { sql, empty } = Prisma

function utcTimestamp(value: Date) {
  return sql`(${value.toISOString()}::timestamptz AT TIME ZONE 'UTC')`
}

function readCursor(cursor: string, context: string, start: Date, end: Date) {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    if (Array.isArray(value) && value.length === 4 && value[0] === context
      && typeof value[1] === "string" && (value[2] === "cash" || value[2] === "whatsapp")
      && typeof value[3] === "string" && value[3].length > 0 && value[3].length <= 120) {
      const occurredAt = new Date(value[1])
      if (occurredAt >= start && occurredAt < end) return { occurredAt, kind: value[2], id: value[3] }
    }
  } catch {
    // Stale and malformed cursors both restart from the first attention page.
  }
  throw new ApplicationError("VALIDATION_ERROR", "Return to the first page to refresh the list.", 400)
}

export async function readPOSActivityAttention(actor: AttentionActor, input: AttentionInput) {
  const { organizationId } = actor
  const { locationId = null, terminalId = null, sessionId = null } = input
  const organization = await db.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } })
  if (!organization) throw new NotFoundError("Point of sale organization is unavailable.")

  const { start, end, date } = getPOSActivityDay(new Date(), organization.timezone, input.date)
  const context = createHash("sha256").update(JSON.stringify([
    "pos-attention", organizationId, actor.userId, organization.timezone, date, locationId, terminalId, sessionId,
  ])).digest("base64url")
  const position = input.cursor ? readCursor(input.cursor, context, start, end) : null
  const after = position ? sql`WHERE a."occurredAt" < ${utcTimestamp(position.occurredAt)}
    OR (a."occurredAt" = ${utcTimestamp(position.occurredAt)} AND (a.kind, a.id) > (${position.kind}, ${position.id}))` : empty

  const records = await db.$queryRaw<AttentionRecord[]>(sql`
    WITH attention AS (
      SELECT sh.id, 'cash'::text AS kind, sh."endTime" AS "occurredAt",
             sh."sessionNumber" AS reference, l.name AS location, t.name AS terminal,
             l.id AS "locationId", t.id AS "terminalId", sh.id AS "sessionId", sh.variance::text
      FROM pos_sessions sh
      JOIN locations l ON l.id = sh."locationId" AND l."organizationId" = sh."organizationId"
      JOIN pos_terminals t ON t.id = sh."terminalId" AND t."organizationId" = sh."organizationId" AND t."locationId" = l.id
      WHERE sh."organizationId" = ${organizationId}
        AND sh.status IN ('CLOSED', 'RECONCILED') AND sh.variance <> 0
        AND sh."endTime" >= ${utcTimestamp(start)} AND sh."endTime" < ${utcTimestamp(end)}
        AND (${locationId}::text IS NULL OR l.id = ${locationId})
        AND (${terminalId}::text IS NULL OR t.id = ${terminalId})
        AND (${sessionId}::text IS NULL OR sh.id = ${sessionId})

      UNION ALL

      SELECT s.id, 'whatsapp'::text, s."orderDate", s."orderNumber", l.name, t.name,
             l.id, t.id, sh.id, NULL::text
      FROM sales_orders s
      JOIN locations l ON l.id = s."locationId" AND l."organizationId" = s."organizationId"
      LEFT JOIN pos_terminals t ON t.id = s."terminalId" AND t."organizationId" = s."organizationId" AND t."locationId" = l.id
      LEFT JOIN pos_sessions sh ON sh.id = s."sessionId" AND sh."organizationId" = s."organizationId"
        AND sh."locationId" = l.id AND sh."terminalId" = t.id
      WHERE s."organizationId" = ${organizationId} AND s.channel = 'POS' AND s."deletedAt" IS NULL
        AND s."orderDate" >= ${utcTimestamp(start)} AND s."orderDate" < ${utcTimestamp(end)}
        AND (s."terminalId" IS NULL OR t.id IS NOT NULL) AND (s."sessionId" IS NULL OR sh.id IS NOT NULL)
        AND (${locationId}::text IS NULL OR l.id = ${locationId})
        AND (${terminalId}::text IS NULL OR t.id = ${terminalId})
        AND (${sessionId}::text IS NULL OR sh.id = ${sessionId})
        AND (s.status IN ('COMPLETED', 'RETURNED') OR (s.status = 'CANCELLED' AND EXISTS (
          SELECT 1 FROM business_events v
          WHERE v."organizationId" = s."organizationId" AND v."sourceId" = s.id AND v."eventSource" = 'POS'
            AND v."eventType" = 'pos.sale.voided' AND v."sourceType" = 'POS_VOID'
            AND v."locationId" = l.id AND v."registerId" = t.id AND v.payload->>'sessionId' = sh.id
        )))
        AND EXISTS (
          SELECT 1 FROM business_events e
          JOIN business_event_outbox o ON o."businessEventId" = e.id AND o."organizationId" = e."organizationId"
          WHERE e."organizationId" = s."organizationId" AND e."sourceId" = s.id AND e."sourceType" = 'POS_SALE'
            AND e."eventType" = ${WHATSAPP_RECEIPT_EVENT_TYPE}
            AND o.channel::text = ${WHATSAPP_RECEIPT_OUTBOX_CHANNEL} AND o."eventName" = ${WHATSAPP_RECEIPT_EVENT_NAME}
          HAVING COUNT(*) > 1 OR BOOL_OR(
            o.status IN ('DEAD_LETTER', 'CANCELLED')
            OR (o.status = 'FAILED' AND o."lastErrorCode" IS DISTINCT FROM ${WHATSAPP_RECEIPT_RETRYABLE_REJECTION})
          )
        )
    )
    SELECT a.* FROM attention a
    ${after}
    ORDER BY a."occurredAt" DESC, a.kind, a.id
    LIMIT ${pageSize + 1}
  `)

  const page = records.slice(0, pageSize)
  // Reuse the canonical projection so concurrently recovered sends drop out of this page.
  const statuses = await getPOSWhatsAppReceiptStatusesForScopedSales(db, organizationId, page.filter(row => row.kind === "whatsapp").map(row => row.id))
  const rows = page.flatMap<POSAttentionRow>((row) => {
    const status = row.kind === "cash" ? "CASH_VARIANCE" : statuses.get(row.id)
    if (status !== "CASH_VARIANCE" && status !== "FAILED" && status !== "UNCERTAIN") return []
    return [{ ...row, occurredAt: row.occurredAt.toISOString(), status }]
  })

  const last = page.at(-1)
  const nextCursor = last && records.length > pageSize
    ? Buffer.from(JSON.stringify([context, last.occurredAt.toISOString(), last.kind, last.id])).toString("base64url")
    : null

  return { rows, nextCursor }
}
