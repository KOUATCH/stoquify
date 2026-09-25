import "server-only"

import { Prisma, type CashDrawerTransaction } from "@prisma/client"
import { completedReportScope, reportDecimal } from "./completed-sales-evidence"

export type CashReportScope = Awaited<ReturnType<typeof completedReportScope>>
type Movement = Pick<CashDrawerTransaction, "type" | "amount" | "balanceBefore" | "balanceAfter">
export type CashMovementKind = "INFLOW" | "OUTFLOW" | "OPENING_COUNT" | "CLOSING_COUNT" | "RECONCILIATION" | "INCONSISTENT"

/** Drawer amounts are unsigned. RETURN is the POS void outflow, not incoming cash.
 * Opening floats and closing/reconciliation counts never establish operating cash flow. */
export function classifyReportCashMovement(row: Movement): { kind: CashMovementKind; amount: Prisma.Decimal; difference: Prisma.Decimal } {
  const amount = reportDecimal(row.amount), before = reportDecimal(row.balanceBefore), after = reportDecimal(row.balanceAfter), difference = after.minus(before)
  const result = (kind: CashMovementKind) => ({ kind, amount, difference })
  if (amount.lt(0)) return result("INCONSISTENT")
  if (row.type === "OPENING_BALANCE") return result(after.eq(amount) ? "OPENING_COUNT" : "INCONSISTENT")
  if (row.type === "CLOSING_BALANCE") return result(after.eq(amount) ? "CLOSING_COUNT" : "INCONSISTENT")
  if (row.type === "RECONCILIATION") return result("RECONCILIATION")
  if (["SALE", "CASH_IN"].includes(row.type)) return result(difference.eq(amount) ? "INFLOW" : "INCONSISTENT")
  if (["REFUND", "RETURN", "CASH_OUT", "PAYOUT"].includes(row.type)) return result(difference.eq(amount.negated()) ? "OUTFLOW" : "INCONSISTENT")
  return result("INCONSISTENT")
}

export function reportCashDrawerScope(scope: CashReportScope) {
  return { ...(scope.locationId ? { locationId: scope.locationId } : {}), location: { organizationId: scope.organizationId }, terminal: { organizationId: scope.organizationId } }
}

export async function reportCashMovements(tx: Prisma.TransactionClient, scope: CashReportScope) {
  return tx.cashDrawerTransaction.findMany({
    where: { createdAt: { gte: scope.start, lt: scope.endExclusive }, cashDrawer: reportCashDrawerScope(scope) },
    select: { id: true, type: true, amount: true, balanceBefore: true, balanceAfter: true, createdAt: true, cashDrawerId: true, sessionId: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
}

export async function reportCashSessions(tx: Prisma.TransactionClient, scope: CashReportScope) {
  return tx.pOSSession.findMany({
    where: { organizationId: scope.organizationId, ...(scope.locationId ? { locationId: scope.locationId } : {}), startTime: { lt: scope.endExclusive }, OR: [{ endTime: null }, { endTime: { gte: scope.start } }] },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      terminal: { select: { name: true, terminalNumber: true, organizationId: true, locationId: true } },
      salesOrders: { where: { organizationId: scope.organizationId, deletedAt: null, status: { in: ["COMPLETED", "DELIVERED"] }, orderDate: { gte: scope.start, lt: scope.endExclusive }, ...(scope.locationId ? { locationId: scope.locationId } : {}) }, select: { id: true, total: true } },
      cashDrawerTransactions: { where: { type: "CLOSING_BALANCE", cashDrawer: reportCashDrawerScope(scope) }, select: { id: true, amount: true, balanceBefore: true, balanceAfter: true, cashDrawer: { select: { terminalId: true, locationId: true } } } },
    },
    orderBy: [{ startTime: "asc" }, { id: "asc" }],
  })
}

type ReportSession = Awaited<ReturnType<typeof reportCashSessions>>[number]
export type CashCountStatus = "OPEN" | "RECORDED" | "OUTSIDE_PERIOD" | "INCONSISTENT"

/** Availability of an operational closing count, not an independent approval or employee rating. */
export function reportSessionCount(session: ReportSession, scope: CashReportScope) {
  const expected = session.expectedBalance === null ? null : reportDecimal(session.expectedBalance)
  const counted = session.closingBalance === null ? null : reportDecimal(session.closingBalance)
  const variance = session.variance === null ? null : reportDecimal(session.variance)
  const isClosed = ["CLOSED", "RECONCILED"].includes(session.status)
  let status: CashCountStatus = "OPEN"
  if (isClosed) {
    const closing = session.cashDrawerTransactions[0]
    const consistent = session.endTime !== null && session.endTime >= session.startTime && expected !== null && counted !== null && variance !== null && counted.minus(expected).eq(variance)
      && session.cashDrawerTransactions.length === 1 && closing && reportDecimal(closing.amount).eq(counted) && reportDecimal(closing.balanceBefore).eq(expected) && reportDecimal(closing.balanceAfter).eq(counted)
      && closing.cashDrawer.terminalId === session.terminalId && closing.cashDrawer.locationId === session.locationId
      && session.terminal.organizationId === scope.organizationId && session.terminal.locationId === session.locationId
    status = !consistent ? "INCONSISTENT" : session.endTime! >= scope.start && session.endTime! < scope.endExclusive ? "RECORDED" : "OUTSIDE_PERIOD"
  } else if (session.endTime || counted !== null || variance !== null || session.cashDrawerTransactions.length) status = "INCONSISTENT"
  return { status, expected: expected?.toNumber() ?? null, counted: counted?.toNumber() ?? null, variance: status === "RECORDED" || status === "OUTSIDE_PERIOD" ? variance!.toNumber() : null }
}

export function elapsedShiftHours(session: Pick<ReportSession, "startTime" | "endTime">, scope: CashReportScope, observedAt: Date) {
  const start = Math.max(session.startTime.getTime(), scope.start.getTime())
  const end = Math.min((session.endTime ?? observedAt).getTime(), scope.endExclusive.getTime(), observedAt.getTime())
  return Math.max(0, end - start) / 3_600_000
}
