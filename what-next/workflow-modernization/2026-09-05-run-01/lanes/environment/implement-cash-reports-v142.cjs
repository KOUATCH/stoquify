const fs=require('fs'),path=require('path');const root=process.cwd(),file=path.join(root,'services/analytics/financial-reports.service.ts');let s=fs.readFileSync(file,'utf8');
s=s.replace('import { Prisma, type SalesOrderStatus }','import { Prisma }').replace('{ endOfDay, format, startOfDay }','{ format, startOfDay }').replace('import { BusinessRuleError } from "@/services/_shared/action-errors"','import { classifyReportCashMovement, elapsedShiftHours, reportCashMovements, reportCashSessions, reportSessionCount, type CashCountStatus } from "./cash-report-evidence"');
s=s.replace(/const completedSalesStatuses:[\s\S]*?\r?\n\r?\n/, '').replace(/async function getReportCurrency\([\s\S]*?\r?\n}\r?\n\r?\n/,'');
s=s.replace(/export interface CashierPerformanceReport \{[\s\S]*?\r?\n}\r?\n/,`export interface CashierPerformanceReport {
  provenance: ReportProvenance
  cashierId: string
  cashierName: string
  totalSales: number
  totalTransactions: number
  averageTransactionValue: number | null
  sessionsWorked: number
  elapsedShiftHours: number
  cashReceipts: number | null
  cashOutflows: number | null
  cashVariance: number | null
  absoluteVariance: number | null
  recordedCountSessions: number
  openCountSessions: number
  outsidePeriodCountSessions: number
  inconsistentCountSessions: number
  inconsistentMovements: number
  /** Deprecated: operational counts do not establish employee performance. */
  performanceScore: null
  sessions: Array<{
    sessionId: string
    sessionNumber: string
    startTime: Date
    endTime: Date | null
    expectedClosing: number | null
    closingBalance: number | null
    variance: number | null
    countStatus: CashCountStatus
    totalSales: number
    transactionCount: number
  }>
}
`);
s=s.replace(/export interface CashFlowReport \{[\s\S]*?\r?\n}\r?\n/,`export interface CashFlowReport {
  period: string
  provenance: ReportProvenance
  totalCashSales: number | null
  otherCashIn: number | null
  totalCashIn: number | null
  cashReturns: number | null
  cashRefunds: number | null
  cashPayouts: number | null
  otherCashOut: number | null
  totalCashOut: number | null
  netCashFlow: number | null
  inconsistentMovements: number
  excludedCounts: { opening: number; closing: number; reconciliation: number }
  dailyBreakdown: Array<{ date: string; cashIn: number | null; cashOut: number | null; netFlow: number | null; cumulativeNetMovement: number | null }>
  drawerReconciliation: Array<{
    sessionId: string
    sessionNumber: string
    stationName: string
    cashierName: string
    openingBalance: number
    expectedClosing: number | null
    actualClosing: number | null
    variance: number | null
    countStatus: CashCountStatus
    endTime: Date | null
  }>
}
`);
const a=s.indexOf('export async function getCashierPerformanceReportReadModel('),b=s.indexOf('export async function getItemPerformanceReportReadModel(',a);
s=s.slice(0,a)+`export async function getCashierPerformanceReportReadModel(input: AnalyticsReportReadModelInput): Promise<CashierPerformanceReport[]> {
  return db.$transaction(async tx => {
    const scope = await completedReportScope(tx, input), observedAt = new Date()
    const sessions = await reportCashSessions(tx, scope), movements = await reportCashMovements(tx, scope)
    const provenance = buildReportProvenance({ ...scope, sourceTables: ["pOSSession", "salesOrder", "cashDrawerTransaction", "user"], rowCount: sessions.length + movements.length })
    const groups = new Map<string, typeof sessions>()
    for (const session of sessions) groups.set(session.userId, [...(groups.get(session.userId) ?? []), session])
    return Array.from(groups, ([cashierId, shifts]) => {
      const ids = new Set(shifts.map(shift => shift.id)), zero = new Prisma.Decimal(0)
      const rows = shifts.map(shift => {
        const count = reportSessionCount(shift, scope)
        return { sessionId: shift.id, sessionNumber: shift.sessionNumber, startTime: shift.startTime, endTime: shift.endTime, expectedClosing: count.expected, closingBalance: count.counted, variance: count.variance, countStatus: count.status, totalSales: shift.salesOrders.reduce((sum, order) => sum.plus(reportDecimal(order.total)), zero).toNumber(), transactionCount: shift.salesOrders.length }
      })
      const recorded = rows.filter(row => row.countStatus === "RECORDED"), inconsistentCountSessions = rows.filter(row => row.countStatus === "INCONSISTENT").length
      const cash = movements.filter(row => row.sessionId && ids.has(row.sessionId)).map(classifyReportCashMovement)
      const inconsistentMovements = cash.filter(row => row.kind === "INCONSISTENT").length
      const cashAmount = (kind: "INFLOW" | "OUTFLOW") => inconsistentMovements ? null : cash.filter(row => row.kind === kind).reduce((sum, row) => sum.plus(row.amount), zero).toNumber()
      const variance = (absolute: boolean) => !recorded.length || inconsistentCountSessions ? null : recorded.reduce((sum, row) => sum.plus(absolute ? reportDecimal(row.variance).abs() : reportDecimal(row.variance)), zero).toNumber()
      const sales = shifts.flatMap(shift => shift.salesOrders), totalSales = sales.reduce((sum, order) => sum.plus(reportDecimal(order.total)), zero)
      return { provenance, cashierId, cashierName: displayUser(shifts[0].user), totalSales: totalSales.toNumber(), totalTransactions: sales.length, averageTransactionValue: sales.length ? totalSales.div(sales.length).toNumber() : null,
        sessionsWorked: shifts.length, elapsedShiftHours: shifts.reduce((sum, shift) => sum + elapsedShiftHours(shift, scope, observedAt), 0), cashReceipts: cashAmount("INFLOW"), cashOutflows: cashAmount("OUTFLOW"), cashVariance: variance(false), absoluteVariance: variance(true),
        recordedCountSessions: recorded.length, openCountSessions: rows.filter(row => row.countStatus === "OPEN").length, outsidePeriodCountSessions: rows.filter(row => row.countStatus === "OUTSIDE_PERIOD").length, inconsistentCountSessions, inconsistentMovements, performanceScore: null, sessions: rows }
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

`+s.slice(b);
const c=s.indexOf('export async function getCashFlowReportReadModel(');
s=s.slice(0,c)+`export async function getCashFlowReportReadModel(input: AnalyticsReportReadModelInput): Promise<CashFlowReport> {
  return db.$transaction(async tx => {
    const scope = await completedReportScope(tx, input)
    const transactions = await reportCashMovements(tx, scope), sessions = await reportCashSessions(tx, scope)
    const zero = new Prisma.Decimal(0), classified = transactions.map(row => ({ ...row, ...classifyReportCashMovement(row) }))
    const inconsistentMovements = classified.filter(row => row.kind === "INCONSISTENT").length
    const sum = (predicate: (row: typeof classified[number]) => boolean) => classified.filter(predicate).reduce((total, row) => total.plus(row.amount), zero)
    const amount = (type: string) => inconsistentMovements ? null : sum(row => row.type === type).toNumber()
    const cashIn = sum(row => row.kind === "INFLOW"), cashOut = sum(row => row.kind === "OUTFLOW")
    const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: scope.timezone, year: "numeric", month: "2-digit", day: "2-digit" })
    const daily = new Map<string, { incoming: Prisma.Decimal; outgoing: Prisma.Decimal; inconsistent: boolean }>()
    for (const row of classified) {
      if (!["INFLOW", "OUTFLOW", "INCONSISTENT"].includes(row.kind)) continue
      const parts = dateFormat.formatToParts(row.createdAt), part = (type: string) => parts.find(value => value.type === type)!.value
      const date = part("year") + "-" + part("month") + "-" + part("day"), bucket = daily.get(date) ?? { incoming: zero, outgoing: zero, inconsistent: false }
      if (row.kind === "INFLOW") bucket.incoming = bucket.incoming.plus(row.amount)
      if (row.kind === "OUTFLOW") bucket.outgoing = bucket.outgoing.plus(row.amount)
      if (row.kind === "INCONSISTENT") bucket.inconsistent = true
      daily.set(date, bucket)
    }
    let cumulative: Prisma.Decimal | null = zero
    const dailyBreakdown = [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, bucket]) => {
      const net = bucket.incoming.minus(bucket.outgoing)
      cumulative = bucket.inconsistent || cumulative === null ? null : cumulative.plus(net)
      return { date, cashIn: bucket.inconsistent ? null : bucket.incoming.toNumber(), cashOut: bucket.inconsistent ? null : bucket.outgoing.toNumber(), netFlow: bucket.inconsistent ? null : net.toNumber(), cumulativeNetMovement: cumulative?.toNumber() ?? null }
    })
    return { period: periodLabel(scope.start, scope.end), provenance: buildReportProvenance({ ...scope, sourceTables: ["cashDrawerTransaction", "pOSSession", "terminal", "user"], rowCount: transactions.length + sessions.length }),
      totalCashSales: amount("SALE"), otherCashIn: amount("CASH_IN"), totalCashIn: inconsistentMovements ? null : cashIn.toNumber(), cashReturns: amount("RETURN"), cashRefunds: amount("REFUND"), cashPayouts: amount("PAYOUT"), otherCashOut: amount("CASH_OUT"), totalCashOut: inconsistentMovements ? null : cashOut.toNumber(), netCashFlow: inconsistentMovements ? null : cashIn.minus(cashOut).toNumber(), inconsistentMovements,
      excludedCounts: { opening: classified.filter(row => row.kind === "OPENING_COUNT").length, closing: classified.filter(row => row.kind === "CLOSING_COUNT").length, reconciliation: classified.filter(row => row.kind === "RECONCILIATION").length }, dailyBreakdown,
      drawerReconciliation: sessions.map(session => { const count = reportSessionCount(session, scope); return { sessionId: session.id, sessionNumber: session.sessionNumber, stationName: session.terminal.name || session.terminal.terminalNumber, cashierName: displayUser(session.user), openingBalance: reportDecimal(session.openingBalance).toNumber(), expectedClosing: count.expected, actualClosing: count.counted, variance: count.variance, countStatus: count.status, endTime: session.endTime } }),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
`;
fs.writeFileSync(file,s);
