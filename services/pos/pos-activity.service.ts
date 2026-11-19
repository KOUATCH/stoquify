import { createHash } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { currencyFractionDigits } from "@/lib/i18n/organization-money"
import { db } from "@/prisma/db"
import { ApplicationError, NotFoundError } from "@/services/_shared/action-errors"
import { getPOSActivityDay } from "./pos-activity-day"
import { findPOSActivityRows, type POSActivityFeedRow, type POSActivityPosition } from "./pos-activity-feed"
import { toDecimal } from "./money"
import type { POSActivityDetail, POSActivityDetailInput, POSActivityFilters, POSActivityListInput, POSActivityPage, POSActivityRow } from "./pos-activity.types"
import { getPOSReceiptPrintPreview } from "./receipt.service"
import { getPOSWhatsAppReceiptCapability, getPOSWhatsAppReceiptStatusesForScopedSales } from "./whatsapp-receipt.service"

const pageSize = 25

type ActivityActor = {
  organizationId: string
  userId: string
  manager: boolean
  canPrint: boolean
  canReprint: boolean
  canUseWhatsApp: boolean
}

const sessionLabel = {
  id: true, sessionNumber: true, locationId: true, terminalId: true,
} as const

function sessionBoundary(actor: ActivityActor): Prisma.POSSessionWhereInput {
  return {
    organizationId: actor.organizationId,
    location: { organizationId: actor.organizationId },
    terminal: { organizationId: actor.organizationId },
    ...(actor.manager ? {} : { userId: actor.userId }),
  }
}

async function getActivityScope(actor: ActivityActor, input: POSActivityFilters) {
  const { organizationId, userId, manager } = actor
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { currency: true, timezone: true },
  })
  if (!organization) throw new NotFoundError("Point of sale organization is unavailable.")

  const day = getPOSActivityDay(new Date(), organization.timezone, input.date)
  const explicitScope = input.locationId !== undefined || input.terminalId !== undefined || input.sessionId !== undefined
  const current = !explicitScope && day.date === day.today ? await db.pOSSession.findFirst({
    where: {
      ...sessionBoundary({ ...actor, manager: false }),
      status: "ACTIVE",
      stationCurrent: { is: { organizationId } },
    },
    select: sessionLabel,
    orderBy: [{ startTime: "desc" }, { id: "asc" }],
  }) : null

  return {
    ...day,
    organizationId,
    timezone: organization.timezone,
    currency: organization.currency,
    ownUserId: manager ? null : userId,
    locationId: current?.locationId ?? input.locationId ?? null,
    terminalId: current?.terminalId ?? input.terminalId ?? null,
    sessionId: current?.id ?? input.sessionId ?? null,
  }
}

type ActivityScope = Awaited<ReturnType<typeof getActivityScope>>

async function listScopeOptions(actor: ActivityActor, scope: ActivityScope): Promise<POSActivityPage["options"]> {
  const { organizationId } = actor
  const sessionWhere = sessionBoundary(actor)
  const [locations, terminals, sessions] = await Promise.all([
    db.location.findMany({
      where: {
        organizationId,
        ...(actor.manager ? {} : { posSessions: { some: sessionWhere } }),
      },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    db.pOSStation.findMany({
      where: {
        organizationId,
        location: { organizationId },
        ...(actor.manager ? {} : { sessions: { some: sessionWhere } }),
      },
      select: { id: true, name: true, locationId: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    db.pOSSession.findMany({
      where: {
        ...sessionWhere,
        OR: [
          {
            startTime: { lt: scope.end },
            OR: [{ endTime: { gte: scope.start } }, { endTime: null, status: { in: ["ACTIVE", "SUSPENDED"] } }],
          },
          ...(scope.sessionId ? [{ id: scope.sessionId }] : []),
        ],
      },
      select: sessionLabel,
      orderBy: [{ startTime: "desc" }, { id: "asc" }],
    }),
  ])
  return {
    locations: locations.map(({ id, name }) => ({ id, label: name })),
    terminals: terminals.map(({ id, name, locationId }) => ({ id, label: name, locationId })),
    sessions: sessions.map(({ id, sessionNumber, locationId, terminalId }) => ({ id, label: sessionNumber, locationId, terminalId })),
  }
}

function getReceiptFilters(input: POSActivityListInput, currency: string) {
  if (input.view !== "receipts") return { total: null, fromTime: null, toTime: null }
  const total = input.total?.trim() || null
  const fromTime = input.fromTime?.trim() || null
  const toTime = input.toTime?.trim() || null
  const clockTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/
  if ((fromTime && !clockTime.test(fromTime)) || (toTime && !clockTime.test(toTime)) || (fromTime && toTime && fromTime > toTime)) {
    throw new ApplicationError("VALIDATION_ERROR", "Enter a valid time range within the business date.", 400)
  }

  // SalesOrder.total is stored as Decimal(14, 2). Accept a localized decimal
  // separator but require ungrouped digits and preserve the exact stored value.
  if (!total) return { total, fromTime, toTime }
  if (!/^\d{1,12}(?:[.,]\d{1,2})?$/.test(total)) {
    throw new ApplicationError("VALIDATION_ERROR", "Enter a valid receipt total without grouping separators.", 400)
  }
  const amount = toDecimal(total.replace(",", "."))
  if (amount.decimalPlaces() > currencyFractionDigits(currency)) {
    throw new ApplicationError("VALIDATION_ERROR", "Enter a receipt total in the organization's currency.", 400)
  }
  return { total: amount.toFixed(), fromTime, toTime }
}

function cursorContext(actor: ActivityActor, scope: ActivityScope, view: string, search: string, filters: ReturnType<typeof getReceiptFilters>) {
  const { total, fromTime, toTime } = filters
  return createHash("sha256").update(JSON.stringify([
    actor.organizationId, actor.userId, actor.manager, scope.date, scope.timezone,
    scope.locationId, scope.terminalId, scope.sessionId, view, search,
    ...(total !== null || fromTime || toTime ? [total, fromTime, toTime] : []),
  ])).digest("base64url")
}

function parseCursor(cursor: string, context: string, scope: ActivityScope): POSActivityPosition {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    if (Array.isArray(value) && value.length === 4 && value[0] === context &&
      typeof value[1] === "string" && typeof value[2] === "number" && Number.isInteger(value[2]) && value[2] >= 0 && value[2] <= 5 &&
      typeof value[3] === "string" && value[3].length > 0 && value[3].length <= 120) {
      const occurredAt = new Date(value[1])
      if (occurredAt >= scope.start && occurredAt < scope.end) return { occurredAt, kindRank: value[2], id: value[3] }
    }
  } catch {
    // All malformed or stale cursors have the same safe recovery.
  }
  throw new ApplicationError("VALIDATION_ERROR", "Refresh activity to start from the latest records.", 400)
}

async function formatRows(actor: ActivityActor, rows: POSActivityFeedRow[]): Promise<POSActivityRow[]> {
  const saleIds = [...new Set(rows.flatMap((row) => row.saleId ? [row.saleId] : []))]
  const completedIds = rows.flatMap((row) => row.kind === "sale" && row.status === "COMPLETED" && row.saleId ? [row.saleId] : [])
  const deliveryEnabled = actor.canUseWhatsApp && getPOSWhatsAppReceiptCapability(actor.organizationId).available
  const [delivery, eligibleSales] = await Promise.all([
    getPOSWhatsAppReceiptStatusesForScopedSales(db, actor.organizationId, saleIds),
    completedIds.length && (actor.canPrint || actor.canReprint || deliveryEnabled) ? db.salesOrder.findMany({
      where: {
        organizationId: actor.organizationId,
        id: { in: completedIds },
        status: "COMPLETED",
        deletedAt: null,
        location: { organizationId: actor.organizationId, isActive: true, deletedAt: null },
        terminal: { is: { organizationId: actor.organizationId } },
        session: { is: { organizationId: actor.organizationId } },
        customer: { organizationId: actor.organizationId },
      },
      select: {
        id: true,
        session: { select: { userId: true } },
        posCommitResults: {
          where: {
            organizationId: actor.organizationId,
            actorId: actor.userId,
            status: { in: ["COMMITTED", "COMPLETED"] },
          },
          select: { id: true, locationId: true, terminalId: true, sessionId: true },
          take: 1,
        },
      },
    }) : [],
  ])
  const eligible = new Map(eligibleSales.map((sale) => [sale.id, sale]))

  return rows.map((row) => {
    const sale = row.saleId ? eligible.get(row.saleId) : undefined
    const ownReceipt = sale?.session?.userId === actor.userId
    const canPrint = row.kind === "sale" && Boolean(sale && ownReceipt && actor.canPrint)
    const canReprint = row.kind === "sale" && Boolean(sale && actor.canReprint)
    const whatsAppStatus = row.saleId ? delivery.get(row.saleId) ?? null : null
    const commitment = sale?.posCommitResults[0]
    return {
      id: row.id, kind: row.kind, occurredAt: row.occurredAt.toISOString(), reference: row.reference,
      status: row.status, amount: row.amount,
      location: { id: row.locationId, label: row.locationLabel },
      terminal: row.terminalId && row.terminalLabel ? { id: row.terminalId, label: row.terminalLabel } : null,
      session: row.sessionId && row.sessionLabel ? { id: row.sessionId, label: row.sessionLabel } : null,
      cashier: row.cashier, saleId: row.saleId, whatsAppStatus,
      customer: row.customerName ? { name: row.customerName, phoneLastFour: row.customerPhoneLastFour } : null,
      printMode: canPrint ? "print" : canReprint ? "reprint" : null,
      canReprint: canPrint || canReprint,
      canSendWhatsApp: row.kind === "sale" && deliveryEnabled && ownReceipt && !whatsAppStatus &&
        commitment?.locationId === row.locationId && commitment?.terminalId === row.terminalId && commitment?.sessionId === row.sessionId,
    }
  })
}

export async function readPOSActivity(actor: ActivityActor, input: POSActivityListInput): Promise<POSActivityPage> {
  const scope = await getActivityScope(actor, input)
  const { today, date, timezone, currency, locationId, terminalId, sessionId } = scope
  const view = input.view ?? "all"
  const search = input.search ?? ""
  const receiptFilters = getReceiptFilters(input, currency)
  const context = cursorContext(actor, scope, view, search, receiptFilters)
  const after = input.cursor ? parseCursor(input.cursor, context, scope) : undefined
  const [options, feed] = await Promise.all([
    listScopeOptions(actor, scope),
    findPOSActivityRows({ ...scope, ...receiptFilters, receiptsOnly: view === "receipts", search, after, limit: pageSize + 1 }),
  ])
  const visibleRows = feed.slice(0, pageSize)
  const last = visibleRows.at(-1)
  const nextCursor = last && feed.length > pageSize
    ? Buffer.from(JSON.stringify([context, last.occurredAt.toISOString(), last.kindRank, last.id])).toString("base64url")
    : null
  return {
    today, date, timezone, currency, accessMode: actor.manager ? "manager" : "own",
    filters: { locationId, terminalId, sessionId, view, search, ...receiptFilters },
    options, rows: await formatRows(actor, visibleRows), nextCursor,
  }
}

async function getSaleDetails(actor: ActivityActor, row: POSActivityFeedRow, result: POSActivityDetail) {
  const { organizationId } = actor
  const { saleId, sessionId, locationId, terminalId } = row
  if (!saleId) return
  const [sale, correctionEvents] = await Promise.all([
    db.salesOrder.findFirst({
      where: { id: saleId, organizationId, channel: "POS", deletedAt: null, locationId, terminalId, sessionId },
      select: {
        subtotal: true, discount: true, taxAmount: true, total: true, orderDate: true,
        lines: {
          where: { item: { organizationId } },
          select: { id: true, quantity: true, unitPrice: true, lineTotal: true, item: { select: { nameEn: true, nameFr: true, sku: true } } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
        payments: {
          where: { organizationId, deletedAt: null },
          select: { id: true, paymentNumber: true, amount: true, method: true, status: true, cashTendered: true, changeGiven: true },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
    }),
    sessionId ? db.businessEvent.findMany({
      where: {
        organizationId, sourceId: saleId, locationId, registerId: terminalId, eventSource: "POS",
        payload: { path: ["sessionId"], equals: sessionId },
        OR: [
          { eventType: "pos.refund.issued", sourceType: "POS_REFUND" },
          { eventType: "pos.sale.voided", sourceType: "POS_VOID" },
        ],
      },
      select: { id: true, eventType: true, occurredAt: true, payload: true },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    }) : [],
  ])
  if (!sale) throw new NotFoundError("Activity record is unavailable.")
  result.totals = {
    subtotal: sale.subtotal.toString(), discount: sale.discount.toString(), tax: sale.taxAmount.toString(), total: sale.total.toString(),
  }
  result.lines = sale.lines.map((line) => ({
    id: line.id, name: line.item.nameEn || line.item.nameFr || line.item.sku, sku: line.item.sku,
    quantity: line.quantity.toString(), unitPrice: line.unitPrice.toString(), total: line.lineTotal.toString(),
  }))
  result.tenders = sale.payments.map((payment) => ({
    id: payment.id, reference: payment.paymentNumber, method: payment.method, status: payment.status,
    amount: payment.amount.toString(), cashTendered: payment.cashTendered?.toString() ?? null, changeGiven: payment.changeGiven?.toString() ?? null,
  }))
  result.corrections = correctionEvents.filter((event) => event.id !== row.id).map(({ id, eventType, occurredAt, payload }) => {
    const kind = eventType === "pos.sale.voided" ? "void" : "return"
    const value = payload && typeof payload === "object" && !Array.isArray(payload) ? payload.totalRefunded : null
    return {
      id, kind, occurredAt: occurredAt.toISOString(),
      amount: kind === "void" ? sale.total.toString() : typeof value === "string" && /^[0-9]+([.][0-9]+)?$/.test(value) ? value : null,
    }
  })
  if (row.kind !== "sale") result.corrections.unshift({
    id: saleId, kind: "sale", occurredAt: sale.orderDate.toISOString(), amount: sale.total.toString(),
  })
}

async function getDrawerBalances(actor: ActivityActor, row: POSActivityFeedRow): Promise<POSActivityDetail["drawerBalances"]> {
  if (row.kind === "drawer") {
    const drawer = await db.cashDrawerTransaction.findFirst({
      where: {
        id: row.id, sessionId: row.sessionId, userId: row.actorId ?? undefined,
        cashDrawer: { locationId: row.locationId, terminalId: row.terminalId ?? undefined, location: { organizationId: actor.organizationId } },
      },
      select: { balanceBefore: true, balanceAfter: true },
    })
    if (!drawer) return null
    return { opening: null, closing: null, expected: null, variance: null, before: drawer.balanceBefore.toString(), after: drawer.balanceAfter.toString() }
  }

  const shift = await db.pOSSession.findFirst({
    where: { id: row.id, ...sessionBoundary(actor), locationId: row.locationId, terminalId: row.terminalId ?? undefined },
    select: { openingBalance: true, closingBalance: true, expectedBalance: true, variance: true },
  })
  if (!shift) return null
  const closed = row.kind === "shift_close"
  return {
    opening: shift.openingBalance.toString(),
    closing: closed ? shift.closingBalance?.toString() ?? null : null,
    expected: closed ? shift.expectedBalance?.toString() ?? null : null,
    variance: closed ? shift.variance?.toString() ?? null : null,
    before: null, after: null,
  }
}

async function enforceReceiptPreview(actor: ActivityActor, result: POSActivityDetail) {
  if (!result.saleId || (!result.printMode && !result.canSendWhatsApp)) return
  try {
    const preview = await getPOSReceiptPrintPreview({
      organizationId: actor.organizationId, locationId: result.location.id, locale: "EN",
      selection: result.printMode === "reprint" ? { orderNumber: result.reference } : { salesOrderId: result.saleId, actorId: actor.userId },
    })
    if (!preview.certification.legalDeliveryBlocked) return
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error
  }
  result.printMode = null
  result.canReprint = false
  result.canSendWhatsApp = false
}

export async function readPOSActivityDetail(actor: ActivityActor, input: POSActivityDetailInput): Promise<POSActivityDetail> {
  const scope = await getActivityScope(actor, input)
  const [source] = await findPOSActivityRows({ ...scope, receiptsOnly: false, detail: { kind: input.kind, id: input.id }, limit: 1 })
  if (!source) throw new NotFoundError("Activity record is unavailable for this date and register.")
  const [row] = await formatRows(actor, [source])
  const detail: POSActivityDetail = { ...row, lines: [], tenders: [], corrections: [], totals: null, drawerBalances: null }
  if (source.saleId) {
    await Promise.all([getSaleDetails(actor, source, detail), enforceReceiptPreview(actor, detail)])
  } else {
    detail.drawerBalances = await getDrawerBalances(actor, source)
  }
  return detail
}
