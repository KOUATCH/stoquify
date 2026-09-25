import "server-only"

import { readBusinessPulseSnapshot, type BusinessPulseSnapshot } from "./business-pulse-snapshot"
import { resolveBusinessPulseLinks } from "./business-pulse-links"
import { BusinessRuleError } from "@/services/_shared/action-errors"

import { db } from "@/prisma/db"
import { Prisma } from "@prisma/client"
import { completedReportScope, completedReportSales, reportDecimal } from "./completed-sales-evidence"
import { classifyReportCashMovement, reportCashMovements, reportCashSessions, reportSessionCount, type CashCountStatus } from "./cash-report-evidence"
import { getCashierPerformanceReportReadModel, getItemPerformanceReportReadModel, buildReportProvenance, type ReportProvenance } from "./financial-reports.service"
import type {
  BIActionLink,
  BIChangeDirection,
  BIChangeEvent,
  BIDrillThrough,
  BIFreshness,
  BIKpiCard,
  BIKpiState,
  BIProvenance,
  BIUnassessedObservation,
  BISeverity,
} from "@/services/bi/bi-contracts"
import type {
  BusinessPulseActionItem,
  BusinessPulseCommandData,
  BusinessPulseSummary,
} from "@/services/analytics/business-pulse-contracts"
import type { SnapshotSourceModule } from "@/services/snapshots/snapshot-contracts"
import { ApplicationError, toSafeActionError } from "@/services/_shared/action-errors"

export interface SalesAnalyticsReadModelInput {
  organizationId: string
  locationId: string
  startDate: Date
  endDate: Date
}

export interface AnalyticsLocationInput {
  organizationId: string
  locationId: string
}

export interface BusinessPulseCommandInput {
  organizationId: string
  locationId?: string | null
  permissions?: readonly string[]
  locale?: "en" | "fr"
}

export interface SalesAnalytics {
  totalSales: number
  totalTransactions: number
  averageTransaction: number
  totalItems: number
  topSellingItems: {
    itemId: string
    itemName: string
    itemSku: string
    quantitySold: number
    totalRevenue: number
  }[]
  salesByHour: {
    hour: number
    sales: number
    transactions: number
  }[]
  salesByDay: {
    date: string
    sales: number
    transactions: number
  }[]
  paymentMethods: {
    method: string
    amount: number
    count: number
    percentage: number
  }[]
}

export interface CashReconciliationReport {
  sessionId: string
  sessionNumber: string
  terminalName: string
  userName: string
  openedAt: Date
  closedAt?: Date
  openingBalance: number
  expectedBalance: number | null
  actualBalance?: number
  variance?: number
  totalSales: number
  totalCashIn: number | null
  totalCashOut: number | null
  countStatus: CashCountStatus
  provenance: ReportProvenance
  transactionCount: number
  status: string
}

export interface ProductPerformance {
  itemId: string
  itemName: string
  itemSku: string
  category: string
  quantitySold: number
  totalRevenue: number
  averagePrice: number | null
  profitMargin: number | null
  provenance: ReportProvenance
  currentStock: number
  stockStatus: "in_stock" | "low_stock" | "out_of_stock"
}

export interface UserPerformance {
  userId: string
  userName: string
  totalSales: number
  totalTransactions: number
  averageTransaction: number | null
  sessionsCount: number
  totalHours: number
  averageVariance: number | null
  performanceScore: null
  recordedCountSessions: number
  openCountSessions: number
  inconsistentCountSessions: number
  provenance: ReportProvenance
}

function throwSafeAnalyticsError(action: string, error: unknown, userMessage: string): never {
  const safeError = toSafeActionError(error, {
    action,
    component: "SalesAnalyticsReadModel",
    userMessage,
    metadata: { action },
  })

  throw new ApplicationError(safeError.code, safeError.error, safeError.status, true, {
    correlationId: safeError.correlationId,
  })
}

const displayName = (user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
  return fullName || user?.email || "Unknown User"
}

const BUSINESS_PULSE_MODULE = "analytics" as const
const BUSINESS_PULSE_PERMISSION = "reports.read"
const BUSINESS_PULSE_SOURCES = ["sales", "pos", "inventory"] satisfies SnapshotSourceModule[]

export async function getSalesAnalyticsReadModel(input: SalesAnalyticsReadModelInput): Promise<SalesAnalytics> {
  try {
    return await db.$transaction(async tx => {
      const scope = await completedReportScope(tx, input), sales = await completedReportSales(tx, scope), zero = new Prisma.Decimal(0)
      const total = sales.reduce((sum, sale) => sum.plus(reportDecimal(sale.total)), zero)
      const items = new Map<string, { name: string; sku: string; quantity: Prisma.Decimal; revenue: Prisma.Decimal }>()
      const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, amount: zero, transactions: 0 }))
      const calendar = new Intl.DateTimeFormat("en-CA", { timeZone: scope.timezone, year: "numeric", month: "2-digit", day: "2-digit" })
      const dateKey = (date: Date) => { const parts = calendar.formatToParts(date), part = (type: string) => parts.find(value => value.type === type)!.value; return part("year") + "-" + part("month") + "-" + part("day") }
      const hour = new Intl.DateTimeFormat("en", { timeZone: scope.timezone, hour: "2-digit", hourCycle: "h23" })
      const days = new Map<string, { amount: Prisma.Decimal; transactions: number }>()
      const first = Date.parse(dateKey(scope.start) + "T00:00:00Z")
      for (let i = 0; i < scope.calendarDays; i++) days.set(new Date(first + i * 86400000).toISOString().slice(0, 10), { amount: zero, transactions: 0 })
      const tenders = new Map<string, { amount: Prisma.Decimal; count: number }>()
      for (const sale of sales) {
        const amount = reportDecimal(sale.total), h = hours[Number(hour.format(sale.orderDate))], day = days.get(dateKey(sale.orderDate))!
        h.amount = h.amount.plus(amount); h.transactions++; day.amount = day.amount.plus(amount); day.transactions++
        for (const line of sale.lines) {
          const item = items.get(line.itemId) ?? { name: line.item.nameEn, sku: line.item.sku, quantity: zero, revenue: zero }
          item.quantity = item.quantity.plus(reportDecimal(line.quantity)); item.revenue = item.revenue.plus(reportDecimal(line.lineTotal)); items.set(line.itemId, item)
        }
        for (const payment of sale.payments) {
          const tender = tenders.get(payment.method) ?? { amount: zero, count: 0 }
          tender.amount = tender.amount.plus(reportDecimal(payment.amount)); tender.count++; tenders.set(payment.method, tender)
        }
      }
      return { totalSales: total.toNumber(), totalTransactions: sales.length, averageTransaction: sales.length ? total.div(sales.length).toNumber() : 0,
        totalItems: [...items.values()].reduce((sum, item) => sum.plus(item.quantity), zero).toNumber(),
        topSellingItems: [...items].map(([itemId, item]) => ({ itemId, itemName: item.name, itemSku: item.sku, quantitySold: item.quantity.toNumber(), totalRevenue: item.revenue.toNumber() })).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 10),
        salesByHour: hours.map(row => ({ hour: row.hour, sales: row.amount.toNumber(), transactions: row.transactions })),
        salesByDay: [...days].map(([date, row]) => ({ date, sales: row.amount.toNumber(), transactions: row.transactions })),
        paymentMethods: [...tenders].map(([method, row]) => ({ method, amount: row.amount.toNumber(), count: row.count, percentage: total.gt(0) ? row.amount.div(total).times(100).toNumber() : 0 })),
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  } catch (error) {
    throwSafeAnalyticsError("getSalesAnalytics", error, "Failed to get sales analytics")
  }
}

export async function getCashReconciliationReportsReadModel(input: SalesAnalyticsReadModelInput): Promise<CashReconciliationReport[]> {
  try {
    return await db.$transaction(async tx => {
      const scope = await completedReportScope(tx, input), sessions = await reportCashSessions(tx, scope), movements = await reportCashMovements(tx, scope), zero = new Prisma.Decimal(0)
      const provenance = buildReportProvenance({ ...scope, sourceTables: ["pOSSession", "cashDrawerTransaction", "salesOrder"], rowCount: sessions.length + movements.length })
      return sessions.map(session => {
        const count = reportSessionCount(session, scope), cash = movements.filter(row => row.sessionId === session.id).map(classifyReportCashMovement)
        const amount = (kind: string) => cash.some(row => row.kind === "INCONSISTENT") ? null : cash.filter(row => row.kind === kind).reduce((sum, row) => sum.plus(row.amount), zero).toNumber()
        return { sessionId: session.id, sessionNumber: session.sessionNumber, terminalName: session.terminal.name || session.terminal.terminalNumber, userName: displayName(session.user),
          openedAt: session.startTime, closedAt: session.endTime ?? undefined, openingBalance: reportDecimal(session.openingBalance).toNumber(), expectedBalance: count.expected, actualBalance: count.counted ?? undefined, variance: count.variance ?? undefined,
          totalSales: session.salesOrders.reduce((sum, sale) => sum.plus(reportDecimal(sale.total)), zero).toNumber(), totalCashIn: amount("INFLOW"), totalCashOut: amount("OUTFLOW"), transactionCount: session.salesOrders.length, status: session.status, countStatus: count.status, provenance }
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  } catch (error) {
    throwSafeAnalyticsError("getCashReconciliationReports", error, "Failed to get cash reconciliation reports")
  }
}

export async function getProductPerformanceReadModel(input: SalesAnalyticsReadModelInput): Promise<ProductPerformance[]> {
  try {
    const rows = await getItemPerformanceReportReadModel(input)
    return rows.map(row => ({ itemId: row.itemId, itemName: row.itemName, itemSku: row.itemSku, category: row.category, quantitySold: row.quantitySold, totalRevenue: row.totalRevenue,
      averagePrice: row.quantitySold > 0 ? row.averageSellingPrice : null, profitMargin: row.profitMargin, currentStock: row.currentStock, stockStatus: row.stockStatus, provenance: row.provenance }))
  } catch (error) {
    throwSafeAnalyticsError("getProductPerformance", error, "Failed to get product performance")
  }
}

export async function getUserPerformanceReadModel(input: SalesAnalyticsReadModelInput): Promise<UserPerformance[]> {
  try {
    const rows = await getCashierPerformanceReportReadModel(input)
    return rows.map(row => ({ userId: row.cashierId, userName: row.cashierName, totalSales: row.totalSales, totalTransactions: row.totalTransactions, averageTransaction: row.averageTransactionValue, sessionsCount: row.sessionsWorked,
      totalHours: row.elapsedShiftHours, averageVariance: row.absoluteVariance !== null && row.recordedCountSessions > 0 ? row.absoluteVariance / row.recordedCountSessions : null, performanceScore: null,
      recordedCountSessions: row.recordedCountSessions, openCountSessions: row.openCountSessions, inconsistentCountSessions: row.inconsistentCountSessions, provenance: row.provenance })).sort((a, b) => b.totalSales - a.totalSales)
  } catch (error) {
    throwSafeAnalyticsError("getUserPerformance", error, "Failed to get user performance")
  }
}

export async function getDashboardSummaryReadModel(input: AnalyticsLocationInput) {
  try {
    const snapshot = await readBusinessPulseSnapshot(input)
    if (!snapshot.summary) throw new BusinessRuleError("An active location is required.")
    return snapshot.summary
  } catch (error) {
    throwSafeAnalyticsError("getDashboardSummary", error, "Failed to get dashboard summary")
  }
}
export type DashboardSummaryReadModel = Awaited<ReturnType<typeof getDashboardSummaryReadModel>>

type ComposeBusinessPulseCommandInput = {
  organizationId: string
  locationId: string
  summary: DashboardSummaryReadModel
  context: BusinessPulseSnapshot["context"]
}

export async function getBusinessPulseCommandReadModel(
  input: BusinessPulseCommandInput,
): Promise<BusinessPulseCommandData> {
  try {
    const snapshot = await readBusinessPulseSnapshot(input)
    const data = snapshot.summary
      ? composeBusinessPulseCommandData({ organizationId: input.organizationId, locationId: snapshot.context.locationId!, summary: snapshot.summary, context: snapshot.context })
      : composeBlockedBusinessPulseCommandData(snapshot.context)
    return resolveBusinessPulseLinks(data, input.permissions, input.locale)
  } catch (error) {
    throwSafeAnalyticsError("getBusinessPulseCommand", error, "Failed to get business pulse command data")
  }
}

export function composeBusinessPulseCommandData(input: ComposeBusinessPulseCommandInput): BusinessPulseCommandData {
  const { generatedAt, periodStart, periodEnd, currency, timezone } = input.context
  const freshness = buildBusinessPulseFreshness(generatedAt)
  const provenance = buildBusinessPulseProvenance({
    organizationId: input.organizationId,
    locationId: input.locationId,
    generatedAt,
    periodStart,
    periodEnd,
  })
  const analyticsAction = actionLink({
    id: "business-pulse-open-analytics",
    label: "Open analytics",
    href: "/dashboard/analytics",
    requiredPermission: BUSINESS_PULSE_PERMISSION,
    moduleSlug: BUSINESS_PULSE_MODULE,
  })
  const inventoryAction = actionLink({
    id: "business-pulse-open-inventory",
    label: "Browse item records (all locations)",
    href: "/dashboard/inventory/items",
    requiredPermission: "inventory.items.read",
    moduleSlug: "inventory",
  })

  const summary = toBusinessPulseSummary(input.summary)
  const stockCoverage = input.summary.stockCoverage
  const state: BIKpiState = stockCoverage.itemsWithoutRecords > 0 ? "partial" : "ready"
  const evidenceGrade = "operational" as const
  const trustState = "operational" as const

  const cards: BIKpiCard[] = [
    businessPulseCard({
      id: "business-pulse-today-sales",
      organizationId: input.organizationId,
      title: "Today's revenue",
      detail: `${formatAmount(summary.todaySales, currency)} from completed or delivered sales orders recorded for today.`,
      value: summary.todaySales,
      unit: currency,
      format: "currency",
      freshness,
      provenance,
      drillThrough: routeDrillThrough("Open sales analytics", "/dashboard/analytics", BUSINESS_PULSE_PERMISSION),
      actionLink: analyticsAction,
    }),
    businessPulseCard({
      id: "business-pulse-transactions",
      organizationId: input.organizationId,
      title: "Transactions",
      detail: `${summary.todayTransactions} completed transaction(s) are in today's analytics read model.`,
      value: summary.todayTransactions,
      unit: "transactions",
      format: "number",
      freshness,
      provenance,
      drillThrough: routeDrillThrough("Open transactions", "/dashboard/analytics", BUSINESS_PULSE_PERMISSION),
      actionLink: analyticsAction,
    }),
    businessPulseCard({
      id: "business-pulse-active-sessions",
      organizationId: input.organizationId,
      title: "Active POS sessions",
      detail: `${summary.activeSessions} open POS session(s) can still affect today's cash picture.`,
      value: summary.activeSessions,
      unit: "sessions",
      format: "number",
      freshness,
      provenance,
      drillThrough: routeDrillThrough("Open POS", "/dashboard/pos", "OPERATE_POS"),
      actionLink: actionLink({
        id: "business-pulse-open-pos",
        label: "Open POS",
        href: "/dashboard/pos",
        requiredPermission: "OPERATE_POS",
        moduleSlug: "pos",
      }),
    }),
    businessPulseCard({
      id: "business-pulse-low-stock",
      organizationId: input.organizationId,
      title: "Low-stock items",
      detail: `${summary.lowStockItems} active item(s) have available stock at or below a location’s reorder point, including out-of-stock items. Missing stock records are not counted.`,
      value: summary.lowStockItems,
      unit: "items",
      format: "number",
      freshness,
      provenance,
      drillThrough: routeDrillThrough("Browse item records (all locations)", "/dashboard/inventory/items", "inventory.items.read"),
      actionLink: inventoryAction,
    }),
  ]
  const stockCard = cards.find(card => card.id === "business-pulse-low-stock")!
  stockCard.state = stockCoverage.itemsWithoutRecords > 0 ? "partial" : stockCoverage.activeItems === 0 ? "empty" : "ready"
  if (stockCoverage.itemsWithRecords === 0) {
    stockCard.value = stockCoverage.activeItems === 0 ? "No inventory-tracked items" : "Unavailable"
    stockCard.format = "text"
  }

  const changes = buildBusinessPulseChanges({
    organizationId: input.organizationId,
    summary,
    freshness,
    provenance,
    generatedAt,
    currency,
    analyticsAction,
  })
  const actionsToday = buildBusinessPulseActions({
    organizationId: input.organizationId,
    summary,
    freshness,
    analyticsAction,
    inventoryAction,
  })
  const risks = buildBusinessPulseRisks({
    organizationId: input.organizationId,
    summary,
    freshness,
    analyticsAction,
    inventoryAction,
    currency,
  })

  return {
    organizationId: input.organizationId,
    locationId: input.locationId,
    generatedAt,
    periodStart,
    periodEnd,
    currency,
    timezone,
    commandBrief: {
      id: "business-pulse-command-brief",
      organizationId: input.organizationId,
      title: "Business Pulse Analytics",
      summary: `${formatAmount(summary.todaySales, currency)} in sales today, ${summary.todayTransactions} transaction(s), ${summary.activeSessions} active POS session(s), and ${summary.lowStockItems} low-stock item(s).`,
      conclusion: actionsToday.length
        ? `${actionsToday.length} suggested review(s). Urgency, owner and deadline have not been assessed.`
        : "No review suggestion from these limited checks. This is not a health or completeness assessment.",
      mode: "brief",
      generatedAt,
      periodStart,
      periodEnd,
      state,
      evidenceGrade,
      trustState,
      freshness,
      provenance,
      sourceModules: BUSINESS_PULSE_SOURCES,
      blockers: [],
      redactions: [],
      primaryAction: actionsToday[0]?.actionLink ?? analyticsAction,
      drillThrough: routeDrillThrough("Open analytics", "/dashboard/analytics", BUSINESS_PULSE_PERMISSION),
      reviewState: null,
    },
    cards,
    changes,
    actionsToday,
    risks,
    summary,
  }
}

function composeBlockedBusinessPulseCommandData(input: BusinessPulseSnapshot["context"]): BusinessPulseCommandData {
  const { generatedAt, periodStart, periodEnd } = input
  const freshness = buildBusinessPulseFreshness(generatedAt, "blocked")
  const blocker = {
    id: "business-pulse-location-blocker",
    severity: "high" as const,
    gate: "analytics.location",
    title: "No active location found",
    detail: "Business Pulse Analytics needs one active tenant location before it can produce command data.",
    sourceTables: ["Location"],
    nextAction: "Create or reactivate a tenant location.",
  }
  const provenance = buildBusinessPulseProvenance({
    organizationId: input.organizationId,
    locationId: "blocked",
    generatedAt,
    periodStart,
    periodEnd,
  })

  return {
    organizationId: input.organizationId,
    locationId: "blocked",
    generatedAt,
    periodStart,
    periodEnd,
    currency: input.currency,
    timezone: input.timezone,
    commandBrief: {
      id: "business-pulse-command-brief",
      organizationId: input.organizationId,
      title: "Business Pulse Analytics",
      summary: "No active location is available for the analytics command read model.",
      conclusion: "Resolve the location prerequisite before relying on dashboard analytics.",
      mode: "brief",
      generatedAt,
      periodStart,
      periodEnd,
      state: "blocked",
      evidenceGrade: "blocked",
      trustState: "blocked",
      freshness,
      provenance,
      sourceModules: BUSINESS_PULSE_SOURCES,
      blockers: [blocker],
      redactions: [],
      primaryAction: actionLink({
        id: "business-pulse-open-locations",
        label: "Open locations",
        href: "/dashboard/settings/locations",
        requiredPermission: "locations.read",
        moduleSlug: "settings",
      }),
      drillThrough: routeDrillThrough("Open locations", "/dashboard/settings/locations", "locations.read"),
      reviewState: null,
    },
    cards: [],
    changes: [],
    actionsToday: [],
    risks: [],
    summary: {
      todaySales: 0,
      todayTransactions: 0,
      todayAverageTransaction: 0,
      salesChange: 0,
      transactionChange: 0,
      weekSales: 0,
      monthSales: 0,
      activeSessions: 0,
      lowStockItems: 0,
      stockCoverage: null,
    },
  }
}

function toBusinessPulseSummary(summary: DashboardSummaryReadModel): BusinessPulseSummary {
  return {
    todaySales: summary.today.sales,
    todayTransactions: summary.today.transactions,
    todayAverageTransaction: summary.today.averageTransaction,
    salesChange: summary.today.salesChange,
    transactionChange: summary.today.transactionsChange,
    weekSales: summary.week.sales,
    monthSales: summary.month.sales,
    activeSessions: summary.activeSessions,
    lowStockItems: summary.lowStockItems,
    stockCoverage: summary.stockCoverage,
  }
}

function buildBusinessPulseChanges(input: {
  organizationId: string
  summary: BusinessPulseSummary
  freshness: BIFreshness
  provenance: BIProvenance
  generatedAt: string
  currency: string
  analyticsAction: BIActionLink
}): BIChangeEvent[] {
  const previousSales = input.summary.todaySales - input.summary.salesChange
  const previousTransactions = input.summary.todayTransactions - input.summary.transactionChange

  return [
    {
      id: "business-pulse-sales-change",
      organizationId: input.organizationId,
      moduleSlug: BUSINESS_PULSE_MODULE,
      requiredPermission: BUSINESS_PULSE_PERMISSION,
      title: "Today’s recorded sales versus yesterday’s full day",
      detail: `${formatSignedAmount(input.summary.salesChange, input.currency)}: today’s recorded activity versus the whole of yesterday.`,
      businessImpact: salesChangeImpact(input.summary.salesChange, input.currency),
      direction: directionFromDelta(input.summary.salesChange),
      severity: "info",
      state: "ready",
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      sourceModules: ["sales", "pos"],
      changedAt: input.generatedAt,
      previousValue: previousSales,
      currentValue: input.summary.todaySales,
      unit: input.currency,
      format: "currency",
      provenance: input.provenance,
      blockers: [],
      redactions: [],
      drillThrough: routeDrillThrough("Open analytics", "/dashboard/analytics", BUSINESS_PULSE_PERMISSION),
      actionLink: input.analyticsAction,
    },
    {
      id: "business-pulse-transaction-change",
      organizationId: input.organizationId,
      moduleSlug: BUSINESS_PULSE_MODULE,
      requiredPermission: BUSINESS_PULSE_PERMISSION,
      title: "Today’s transactions versus yesterday’s full day",
      detail: `${formatSignedNumber(input.summary.transactionChange)} transaction(s): today’s recorded activity versus the whole of yesterday.`,
      businessImpact: transactionChangeImpact(input.summary.transactionChange),
      direction: directionFromDelta(input.summary.transactionChange),
      severity: "info",
      state: "ready",
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      sourceModules: ["sales", "pos"],
      changedAt: input.generatedAt,
      previousValue: previousTransactions,
      currentValue: input.summary.todayTransactions,
      unit: "transactions",
      format: "number",
      provenance: input.provenance,
      blockers: [],
      redactions: [],
      drillThrough: routeDrillThrough("Open analytics", "/dashboard/analytics", BUSINESS_PULSE_PERMISSION),
      actionLink: input.analyticsAction,
    },
  ]
}

function buildBusinessPulseActions(input: {
  organizationId: string
  summary: BusinessPulseSummary
  freshness: BIFreshness
  analyticsAction: BIActionLink
  inventoryAction: BIActionLink
}): BusinessPulseActionItem[] {
  const actions: BusinessPulseActionItem[] = []

  if (input.summary.salesChange < 0) {
    actions.push({
      id: "business-pulse-action-revenue-drop",
      title: "Review the sales comparison",
      nextStep: "Today’s recorded sales are being compared with yesterday’s full day. Check opening hours and comparable trading periods before interpreting the difference.",
      severity: "info",
      state: "ready",
      actionLink: input.analyticsAction,
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      dueLabel: null,
      ownerLabel: null,
      blockers: [],
      redactions: [],
    })
  }

  if (input.summary.lowStockItems > 0) {
    actions.push({
      id: "business-pulse-action-low-stock",
      title: "Review low-stock exposure",
      nextStep: `${input.summary.lowStockItems} item(s) need review against their location reorder points. The item catalogue shows records across all locations.`,
      severity: "info",
      state: "ready",
      actionLink: input.inventoryAction,
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      dueLabel: null,
      ownerLabel: null,
      blockers: [],
      redactions: [],
    })
  }

  return actions
}

function buildBusinessPulseRisks(input: {
  organizationId: string
  summary: BusinessPulseSummary
  freshness: BIFreshness
  analyticsAction: BIActionLink
  inventoryAction: BIActionLink
  currency: string
}): BIUnassessedObservation[] {
  const observations: BIUnassessedObservation[] = []
  const common = { organizationId: input.organizationId, severity: "info" as const, severityScore: null, moneyImpact: null, urgency: null, state: "ready" as const, evidenceGrade: "operational" as const, trustState: "operational" as const, freshness: input.freshness, blockers: [], redactions: [] }
  if (input.summary.salesChange < 0) observations.push({
    ...common, id: "business-pulse-risk-revenue-drop", moduleSlug: BUSINESS_PULSE_MODULE,
    rank: observations.length + 1,
    title: "Sales comparison needs context",
    detail: `${formatSignedAmount(input.summary.salesChange, input.currency)}: today’s recorded sales versus yesterday’s full day.`,
    businessImpact: "This difference is not a measured loss or forecast. Opening hours, demand and comparable trading periods have not been assessed.",
    sourceModules: ["sales", "pos"],
    drillThrough: routeDrillThrough("Open analytics", "/dashboard/analytics", BUSINESS_PULSE_PERMISSION),
    actionLink: input.analyticsAction,
  })
  if (input.summary.lowStockItems > 0) observations.push({
    ...common, id: "business-pulse-risk-low-stock", moduleSlug: "inventory",
    rank: observations.length + 1,
    title: "Stock at or below replenishment policy",
    detail: `${input.summary.lowStockItems} item(s) have available stock at or below a location’s reorder point, including out-of-stock items.`,
    businessImpact: "Review demand, lead times and incoming stock before deciding when to replenish. Sales impact and urgency have not been assessed.",
    sourceModules: ["inventory"],
    drillThrough: routeDrillThrough("Browse item records (all locations)", "/dashboard/inventory/items", "inventory.items.read"),
    actionLink: input.inventoryAction,
  })
  // Zero completed sales alone does not establish an operational risk.
  return observations
}

function businessPulseCard(input: {
  id: string
  organizationId: string
  title: string
  detail: string
  value: number | string | null
  unit: string
  format: BIKpiCard["format"]
  freshness: BIFreshness
  provenance: BIProvenance
  drillThrough: BIDrillThrough
  actionLink: BIActionLink
}): BIKpiCard {
  return {
    id: input.id,
    organizationId: input.organizationId,
    moduleSlug: BUSINESS_PULSE_MODULE,
    requiredPermission: BUSINESS_PULSE_PERMISSION,
    title: input.title,
    detail: input.detail,
    value: input.value,
    unit: input.unit,
    format: input.format,
    state: "ready",
    evidenceGrade: "operational",
    trustState: "operational",
    freshness: input.freshness,
    provenance: input.provenance,
    blockers: [],
    redactions: [],
    drillThrough: input.drillThrough,
    actionLink: input.actionLink,
  }
}

function buildBusinessPulseFreshness(generatedAt: string, state: BIFreshness["state"] = "fresh"): BIFreshness {
  return {
    state,
    generatedAt,
    sourceMaxUpdatedAt: null,
    maxAgeMinutes: 60,
    stale: state !== "fresh",
    staleReason: state === "fresh" ? null : "Business pulse prerequisite is not satisfied.",
  }
}

function buildBusinessPulseProvenance(input: {
  organizationId: string
  locationId: string
  generatedAt: string
  periodStart: string
  periodEnd: string
}): BIProvenance {
  return {
    organizationId: input.organizationId,
    locationId: input.locationId,
    sourceKind: "analytics.business_pulse",
    sourceId: `analytics.business_pulse:${input.organizationId}:${input.locationId}`,
    sourceHash: null,
    sourceModules: BUSINESS_PULSE_SOURCES,
    generatedAt: input.generatedAt,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  }
}

function actionLink(input: Omit<BIActionLink, "disabled" | "disabledReason">): BIActionLink {
  return {
    ...input,
    disabled: false,
    disabledReason: null,
  }
}

function routeDrillThrough(label: string, href: string, requiredPermission: string): BIDrillThrough {
  return {
    available: true,
    type: "route",
    label,
    href,
    requiredPermission,
  }
}

function directionFromDelta(delta: number): BIChangeDirection {
  // Movement is not a judgment of performance when the periods are not comparable.
  return delta === 0 ? "unchanged" : "changed"
}

function salesChangeImpact(delta: number, currency: string) {
  return `${formatSignedAmount(delta, currency)} comparing today’s recorded activity with yesterday’s full day. This is not a like-for-like performance comparison.`
}

function transactionChangeImpact(delta: number) {
  return `${formatSignedNumber(delta)} transaction(s) comparing today’s recorded activity with yesterday’s full day. Opening hours and demand have not been assessed.`
}

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)
}

function formatSignedAmount(value: number, currency: string) {
  return `${value >= 0 ? "+" : "-"}${formatAmount(Math.abs(value), currency)}`
}

function formatSignedNumber(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString("en-US")}`
}
