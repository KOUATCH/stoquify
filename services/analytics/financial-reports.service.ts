import "server-only"

import { Prisma } from "@prisma/client"
import { format, startOfDay } from "date-fns"
import { createHash } from "node:crypto"

import { completedReportScope, completedReportSales, completedSalesEvidence, reportDecimal, reportGrowth, type CostEvidence } from "./completed-sales-evidence"

import { db } from "@/prisma/db"
import { classifyReportCashMovement, elapsedShiftHours, reportCashMovements, reportCashSessions, reportSessionCount, type CashCountStatus } from "./cash-report-evidence"

export type ReportFreshness = "CURRENT_AS_OF_GENERATION" | "HISTORICAL_PERIOD"
export type ReportEvidenceStatus = "OPERATIONAL_READ_MODEL"
export type ReportCertificationStatus = "INTERNAL_REPORT_ONLY"

export type OptionalLocationId = string | null | undefined

export interface AnalyticsReportReadModelInput {
  organizationId: string
  locationId?: OptionalLocationId
  startDate: Date
  endDate: Date
}

export interface ReportProvenance {
  source: "PRISMA_OPERATIONAL_READ_MODEL"
  sourceLabel: string
  sourceTables: string[]
  periodStart: string
  periodEnd: string
  generatedAt: string
  freshness: ReportFreshness
  evidenceStatus: ReportEvidenceStatus
  certificationStatus: ReportCertificationStatus
  certificationLabel: string
  knownBlockers: string[]
  rowCount: number
  filterHash: string
  currency: string
  timezone?: string
}

export interface FinancialSummaryReport {
  period: string
  provenance: ReportProvenance
  totalRevenue: number
  netRevenue: number
  costEvidence: CostEvidence
  timezone: string
  totalCost: number | null
  grossProfit: number | null
  grossMargin: number | null
  totalTransactions: number
  averageTransactionValue: number
  totalItemsSold: number
  cashSales: number
  cardSales: number
  digitalSales: number
  revenueChange: number | null
  transactionChange: number | null
  profitChange: number | null
  topSellingItems: Array<{
    itemId: string
    itemName: string
    itemSku: string
    quantitySold: number
    revenue: number
    profit: number | null
    itemNameFr: string | null
  }>
  hourlyBreakdown: Array<{
    hour: number
    revenue: number
    transactions: number
  }>
}

export interface CashierPerformanceReport {
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

export interface ItemPerformanceReport {
  provenance: ReportProvenance
  itemId: string
  itemName: string
  itemSku: string
  category: string
  brand: string
  quantitySold: number
  totalRevenue: number
  netRevenue: number
  itemNameFr: string | null
  costEvidence: CostEvidence
  totalCost: number | null
  grossProfit: number | null
  profitMargin: number | null
  averageSellingPrice: number
  currentStock: number
  availableToSell: number
  reservedStock: number
  stockValue: number
  turnoverRate: number
  daysOfStock: number | null
  daysOfAvailableStock: number | null
  stockScope: "organization" | "location"
  stockScopeLabel: string
  stockStatus: "in_stock" | "low_stock" | "out_of_stock"
  salesTrend: "increasing" | "decreasing" | "stable" | "unavailable"
  revenueChange: number | null
  quantityChange: number | null
}

export interface CashFlowReport {
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

type DecimalValue = Prisma.Decimal | number | string | null | undefined

function toNumber(value: DecimalValue): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  return value.toNumber()
}

function displayUser(user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) {
  if (!user) return "Unknown"
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return name || user.email || "Unknown"
}

function periodLabel(start: Date, end: Date) {
  return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`
}

function stableHash(value: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(value, Object.keys(value).sort())).digest("hex")
}

export function scopedLocationId(locationId: OptionalLocationId) {
  return locationId && locationId !== "all" ? locationId : undefined
}

export function buildReportProvenance(input: {
  organizationId: string
  locationId: OptionalLocationId
  start: Date
  end: Date
  sourceTables: string[]
  rowCount: number
  currency: string
  timezone?: string
}): ReportProvenance {
  const now = new Date()
  const locationScope = scopedLocationId(input.locationId)
  const filterHash = stableHash({
    organizationId: input.organizationId,
    locationId: locationScope ?? "all",
    periodStart: input.start.toISOString(),
    periodEnd: input.end.toISOString(),
    sourceTables: input.sourceTables.join(","),
    currency: input.currency,
    timezone: input.timezone,
  })

  return {
    source: "PRISMA_OPERATIONAL_READ_MODEL",
    sourceLabel: "Service-backed operational database read model",
    sourceTables: input.sourceTables,
    currency: input.currency,
    timezone: input.timezone,
    periodStart: input.start.toISOString(),
    periodEnd: input.end.toISOString(),
    generatedAt: now.toISOString(),
    freshness: input.end >= startOfDay(now) ? "CURRENT_AS_OF_GENERATION" : "HISTORICAL_PERIOD",
    evidenceStatus: "OPERATIONAL_READ_MODEL",
    certificationStatus: "INTERNAL_REPORT_ONLY",
    certificationLabel: "Internal management report only",
    knownBlockers: [
      "Not a statutory OHADA certified export",
      "Not signed by Close & Assurance pack controls",
    ],
    rowCount: input.rowCount,
    filterHash,
  }
}

export async function getFinancialSummaryReportReadModel(input: AnalyticsReportReadModelInput): Promise<FinancialSummaryReport> {
  return db.$transaction(async tx => {
    const scope = await completedReportScope(tx, input)
    const sales = await completedReportSales(tx, scope)
    const previousSales = await completedReportSales(tx, scope, scope.previousStart, scope.start)
    const current = await completedSalesEvidence(tx, scope.organizationId, sales)
    const previous = await completedSalesEvidence(tx, scope.organizationId, previousSales)
    const payments = sales.flatMap(order => order.payments)
    const tender = (methods: string[]) => payments.filter(payment => methods.includes(payment.method)).reduce((sum, payment) => sum.plus(reportDecimal(payment.amount)), new Prisma.Decimal(0)).toNumber()
    const hours = new Map(Array.from({ length: 24 }, (_, hour) => [hour, { revenue: new Prisma.Decimal(0), transactions: 0 }]))
    const hourFormatter = new Intl.DateTimeFormat("en", { timeZone: scope.timezone, hour: "2-digit", hourCycle: "h23" })
    for (const order of sales) {
      const bucket = hours.get(Number(hourFormatter.format(order.orderDate)))!
      bucket.revenue = bucket.revenue.plus(reportDecimal(order.total)); bucket.transactions += 1
    }
    return {
      period: periodLabel(scope.start, scope.end), timezone: scope.timezone,
      provenance: buildReportProvenance({ ...scope, sourceTables: ["salesOrder", "salesOrderLine", "payment", "inventoryTransaction", "item"], rowCount: sales.length }),
      totalRevenue: current.revenue.toNumber(), netRevenue: current.net.toNumber(), totalCost: current.cost?.toNumber() ?? null,
      grossProfit: current.profit?.toNumber() ?? null, grossMargin: current.profit !== null && current.net.gt(0) ? current.profit.div(current.net).times(100).toNumber() : null,
      costEvidence: current.costEvidence, totalTransactions: sales.length, totalItemsSold: current.quantity.toNumber(),
      averageTransactionValue: sales.length ? current.revenue.div(sales.length).toNumber() : 0,
      cashSales: tender(["CASH"]), cardSales: tender(["CARD"]), digitalSales: tender(["MOBILE_MONEY", "BANK_TRANSFER", "STORE_CREDIT"]),
      revenueChange: reportGrowth(current.revenue, previous.revenue), transactionChange: reportGrowth(new Prisma.Decimal(sales.length), new Prisma.Decimal(previousSales.length)), profitChange: reportGrowth(current.profit, previous.profit),
      topSellingItems: Array.from(current.items.entries()).map(([itemId, item]) => ({ itemId, itemName: item.name, itemNameFr: item.nameFr, itemSku: item.sku, quantitySold: item.quantity.toNumber(), revenue: item.revenue.toNumber(), profit: item.cost === null ? null : item.net.minus(item.cost).toNumber() })).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      hourlyBreakdown: Array.from(hours.entries()).map(([hour, bucket]) => ({ hour, revenue: bucket.revenue.toNumber(), transactions: bucket.transactions })),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function getCashierPerformanceReportReadModel(input: AnalyticsReportReadModelInput): Promise<CashierPerformanceReport[]> {
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
      const variance = (absolute: boolean) => !recorded.length || inconsistentCountSessions ? null : recorded.reduce((sum, row) => sum.plus(absolute ? reportDecimal(row.variance!).abs() : reportDecimal(row.variance!)), zero).toNumber()
      const sales = shifts.flatMap(shift => shift.salesOrders), totalSales = sales.reduce((sum, order) => sum.plus(reportDecimal(order.total)), zero)
      return { provenance, cashierId, cashierName: displayUser(shifts[0].user), totalSales: totalSales.toNumber(), totalTransactions: sales.length, averageTransactionValue: sales.length ? totalSales.div(sales.length).toNumber() : null,
        sessionsWorked: shifts.length, elapsedShiftHours: shifts.reduce((sum, shift) => sum + elapsedShiftHours(shift, scope, observedAt), 0), cashReceipts: cashAmount("INFLOW"), cashOutflows: cashAmount("OUTFLOW"), cashVariance: variance(false), absoluteVariance: variance(true),
        recordedCountSessions: recorded.length, openCountSessions: rows.filter(row => row.countStatus === "OPEN").length, outsidePeriodCountSessions: rows.filter(row => row.countStatus === "OUTSIDE_PERIOD").length, inconsistentCountSessions, inconsistentMovements, performanceScore: null, sessions: rows }
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function getItemPerformanceReportReadModel(input: AnalyticsReportReadModelInput): Promise<ItemPerformanceReport[]> {
  return db.$transaction(async tx => {
    const scope = await completedReportScope(tx, input)
    const current = await completedSalesEvidence(tx, scope.organizationId, await completedReportSales(tx, scope))
    const previous = await completedSalesEvidence(tx, scope.organizationId, await completedReportSales(tx, scope, scope.previousStart, scope.start))
    const items = await tx.item.findMany({
      where: { organizationId: scope.organizationId, OR: [{ deletedAt: null, isActive: true }, { id: { in: [...current.items.keys()] } }] },
      include: { category: { select: { titleEn: true } }, brand: { select: { nameEn: true } }, inventoryLevels: { where: scope.locationId ? { locationId: scope.locationId } : undefined, select: { quantityOnHand: true, quantityAvailable: true, quantityReserved: true, totalValue: true } } },
    })
    const provenance = buildReportProvenance({ ...scope, sourceTables: ["item", "inventoryLevel", "salesOrderLine", "salesOrder", "inventoryTransaction"], rowCount: items.length })
    return items.map(item => {
      const sale = current.items.get(item.id), prior = previous.items.get(item.id), zero = new Prisma.Decimal(0)
      const revenue = sale?.revenue ?? zero, net = sale?.net ?? zero, quantity = sale?.quantity ?? zero, cost = sale ? sale.cost : zero
      const profit = cost === null ? null : net.minus(cost)
      const stock = (field: "quantityOnHand" | "quantityAvailable" | "quantityReserved" | "totalValue") => item.inventoryLevels.reduce((sum, level) => sum.plus(reportDecimal(level[field])), zero).toNumber()
      const currentStock = stock("quantityOnHand"), availableToSell = stock("quantityAvailable"), quantitySold = quantity.toNumber()
      const revenueChange = reportGrowth(revenue, prior?.revenue ?? zero), quantityChange = reportGrowth(quantity, prior?.quantity ?? zero)
      return {
        provenance, itemId: item.id, itemName: item.nameEn, itemNameFr: item.nameFr, itemSku: item.sku, category: item.category?.titleEn || "Uncategorized", brand: item.brand?.nameEn || "Unbranded",
        quantitySold, totalRevenue: revenue.toNumber(), netRevenue: net.toNumber(), totalCost: cost?.toNumber() ?? null, grossProfit: profit?.toNumber() ?? null, profitMargin: profit !== null && net.gt(0) ? profit.div(net).times(100).toNumber() : null,
        costEvidence: sale?.costEvidence ?? { basis: "ORIGINAL_STOCK_ISSUES", coveredGroups: 0, uncoveredGroups: 0 },
        averageSellingPrice: quantity.gt(0) ? revenue.div(quantity).toNumber() : toNumber(item.sellingPrice),
        currentStock, availableToSell, reservedStock: stock("quantityReserved"), stockValue: stock("totalValue"),
        turnoverRate: currentStock > 0 ? quantitySold / currentStock : quantitySold > 0 ? quantitySold : 0,
        daysOfStock: quantitySold > 0 ? currentStock / quantitySold * scope.calendarDays : null, daysOfAvailableStock: quantitySold > 0 ? availableToSell / quantitySold * scope.calendarDays : null,
        stockScope: scope.locationId ? "location" : "organization", stockScopeLabel: scope.locationId ? "Selected report location" : "Organization-wide stock",
        stockStatus: availableToSell <= 0 ? "out_of_stock" : availableToSell <= toNumber(item.minStockLevel) ? "low_stock" : "in_stock",
        salesTrend: quantityChange === null ? "unavailable" : quantityChange > 0 ? "increasing" : quantityChange < 0 ? "decreasing" : "stable", revenueChange, quantityChange,
      }
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function getCashFlowReportReadModel(input: AnalyticsReportReadModelInput): Promise<CashFlowReport> {
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
