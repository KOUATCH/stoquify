import "server-only"

import { endOfDay, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns"

import { db } from "@/prisma/db"
import type {
  BIActionLink,
  BIChangeDirection,
  BIChangeEvent,
  BIDrillThrough,
  BIFreshness,
  BIKpiCard,
  BIKpiState,
  BIProvenance,
  BIRiskRank,
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
  expectedBalance: number
  actualBalance?: number
  variance?: number
  totalSales: number
  totalCashIn: number
  totalCashOut: number
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
  averagePrice: number
  profitMargin: number
  currentStock: number
  stockStatus: "in_stock" | "low_stock" | "out_of_stock"
}

export interface UserPerformance {
  userId: string
  userName: string
  totalSales: number
  totalTransactions: number
  averageTransaction: number
  sessionsCount: number
  totalHours: number
  averageVariance: number
  performanceScore: number
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

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber()
  }
  return Number(value)
}

const displayName = (user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
  return fullName || user?.email || "Unknown User"
}

const BUSINESS_PULSE_CURRENCY = "XAF"
const BUSINESS_PULSE_MODULE = "analytics" as const
const BUSINESS_PULSE_PERMISSION = "reports.read"
const BUSINESS_PULSE_SOURCES = ["sales", "pos", "inventory"] satisfies SnapshotSourceModule[]

export async function getSalesAnalyticsReadModel(
  input: SalesAnalyticsReadModelInput,
): Promise<SalesAnalytics> {
  const { organizationId, locationId, startDate, endDate } = input

  try {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    const sales = await db.salesOrder.findMany({
      where: {
        organizationId,
        locationId,
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          not: "CANCELLED",
        },
      },
      include: {
        lines: {
          include: {
            item: {
              select: {
                id: true,
                nameEn: true,
                sku: true,
              },
            },
          },
        },
        payments: true,
      },
    })

    const totalSales = sales.reduce((sum, sale) => sum + toNumber(sale.total), 0)
    const totalTransactions = sales.length
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0
    const totalItems = sales.reduce(
      (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + toNumber(line.quantity), 0),
      0,
    )

    const itemSales = new Map<string, { name: string; sku: string; quantity: number; revenue: number }>()

    sales.forEach((sale) => {
      sale.lines.forEach((line) => {
        if (line.item) {
          const key = line.itemId
          const existing = itemSales.get(key) || {
            name: line.item.nameEn,
            sku: line.item.sku,
            quantity: 0,
            revenue: 0,
          }
          existing.quantity += toNumber(line.quantity)
          existing.revenue += toNumber(line.lineTotal)
          itemSales.set(key, existing)
        }
      })
    })

    const topSellingItems = Array.from(itemSales.entries())
      .map(([itemId, data]) => ({
        itemId,
        itemName: data.name,
        itemSku: data.sku,
        quantitySold: data.quantity,
        totalRevenue: data.revenue,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10)

    const salesByHour = Array.from({ length: 24 }, (_, hour) => {
      const hourSales = sales.filter((sale) => new Date(sale.createdAt).getHours() === hour)
      return {
        hour,
        sales: hourSales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
        transactions: hourSales.length,
      }
    })

    const salesByDay: { date: string; sales: number; transactions: number }[] = []
    const currentDate = new Date(start)
    while (currentDate <= end) {
      const dayStart = startOfDay(currentDate)
      const dayEnd = endOfDay(currentDate)
      const daySales = sales.filter((sale) => sale.createdAt >= dayStart && sale.createdAt <= dayEnd)

      salesByDay.push({
        date: currentDate.toISOString().split("T")[0],
        sales: daySales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
        transactions: daySales.length,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    const paymentMethodMap = new Map<string, { amount: number; count: number }>()
    sales.forEach((sale) => {
      sale.payments.forEach((payment) => {
        const existing = paymentMethodMap.get(payment.method) || { amount: 0, count: 0 }
        existing.amount += toNumber(payment.amount)
        existing.count += 1
        paymentMethodMap.set(payment.method, existing)
      })
    })

    const paymentMethods = Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
      percentage: totalSales > 0 ? (data.amount / totalSales) * 100 : 0,
    }))

    return {
      totalSales,
      totalTransactions,
      averageTransaction,
      totalItems,
      topSellingItems,
      salesByHour,
      salesByDay,
      paymentMethods,
    }
  } catch (error) {
    throwSafeAnalyticsError("getSalesAnalytics", error, "Failed to get sales analytics")
  }
}

export async function getCashReconciliationReportsReadModel(
  input: SalesAnalyticsReadModelInput,
): Promise<CashReconciliationReport[]> {
  const { locationId, startDate, endDate } = input

  try {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    const sessions = await db.pOSSession.findMany({
      where: {
        locationId,
        startTime: {
          gte: start,
          lte: end,
        },
      },
      include: {
        terminal: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        salesOrders: {
          where: {
            status: {
              not: "CANCELLED",
            },
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    })

    const sessionIds = sessions.map((session) => session.id)
    const allTransactions = await db.cashDrawerTransaction.findMany({
      where: {
        sessionId: {
          in: sessionIds,
        },
      },
    })

    const transactionsBySession = allTransactions.reduce((acc, transaction) => {
      if (transaction.sessionId) {
        if (!acc[transaction.sessionId]) {
          acc[transaction.sessionId] = []
        }
        acc[transaction.sessionId].push(transaction)
      }
      return acc
    }, {} as Record<string, typeof allTransactions>)

    return sessions.map((session) => {
      const totalSales = session.salesOrders.reduce((sum, sale) => sum + toNumber(sale.total), 0)
      const sessionTransactions = transactionsBySession[session.id] || []

      const totalCashIn = sessionTransactions
        .filter((transaction) => transaction.type === "CASH_IN")
        .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)

      const totalCashOut = sessionTransactions
        .filter((transaction) => transaction.type === "CASH_OUT")
        .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)

      return {
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        terminalName: session.terminal?.name || "Unknown Terminal",
        userName: displayName(session.user),
        openedAt: session.startTime,
        closedAt: session.endTime || undefined,
        openingBalance: toNumber(session.openingBalance),
        expectedBalance: toNumber(session.expectedBalance),
        actualBalance: session.closingBalance === null ? undefined : toNumber(session.closingBalance),
        variance: session.variance === null ? undefined : toNumber(session.variance),
        totalSales,
        totalCashIn,
        totalCashOut,
        transactionCount: sessionTransactions.length,
        status: session.status,
      }
    })
  } catch (error) {
    throwSafeAnalyticsError("getCashReconciliationReports", error, "Failed to get cash reconciliation reports")
  }
}

export async function getProductPerformanceReadModel(
  input: SalesAnalyticsReadModelInput,
): Promise<ProductPerformance[]> {
  const { organizationId, locationId, startDate, endDate } = input

  try {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    const items = await db.item.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        category: {
          select: {
            titleEn: true,
          },
        },
        inventoryLevels: {
          where: {
            locationId,
          },
        },
        salesOrderLines: {
          where: {
            salesOrder: {
              locationId,
              createdAt: {
                gte: start,
                lte: end,
              },
              status: {
                not: "CANCELLED",
              },
            },
          },
        },
      },
    })

    return items.map((item) => {
      const quantitySold = item.salesOrderLines.reduce((sum, line) => sum + toNumber(line.quantity), 0)
      const totalRevenue = item.salesOrderLines.reduce((sum, line) => sum + toNumber(line.lineTotal), 0)
      const sellingPrice = toNumber(item.sellingPrice)
      const costPrice = toNumber(item.costPrice)
      const reorderLevel = toNumber(item.reorderLevel)
      const averagePrice = quantitySold > 0 ? totalRevenue / quantitySold : sellingPrice
      const profitMargin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0

      const inventoryLevel = item.inventoryLevels[0]
      const currentStock = toNumber(inventoryLevel?.quantityOnHand)

      let stockStatus: ProductPerformance["stockStatus"] = "in_stock"
      if (currentStock === 0) {
        stockStatus = "out_of_stock"
      } else if (currentStock <= reorderLevel) {
        stockStatus = "low_stock"
      }

      return {
        itemId: item.id,
        itemName: item.nameEn,
        itemSku: item.sku,
        category: item.category?.titleEn || "Uncategorized",
        quantitySold,
        totalRevenue,
        averagePrice,
        profitMargin,
        currentStock,
        stockStatus,
      }
    })
  } catch (error) {
    throwSafeAnalyticsError("getProductPerformance", error, "Failed to get product performance")
  }
}

export async function getUserPerformanceReadModel(
  input: SalesAnalyticsReadModelInput,
): Promise<UserPerformance[]> {
  const { organizationId, locationId, startDate, endDate } = input

  try {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    const users = await db.user.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        posSessions: {
          where: {
            locationId,
            startTime: {
              gte: start,
              lte: end,
            },
          },
          include: {
            salesOrders: {
              where: {
                status: {
                  not: "CANCELLED",
                },
              },
            },
          },
        },
      },
    })

    return users
      .map((user) => {
        const sessions = user.posSessions
        const sessionSales = sessions.flatMap((session) => session.salesOrders)

        const totalSales = sessionSales.reduce((sum, sale) => sum + toNumber(sale.total), 0)
        const totalTransactions = sessionSales.length
        const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0
        const sessionsCount = sessions.length

        const totalHours = sessions.reduce((sum, session) => {
          if (session.endTime) {
            const hours = (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60)
            return sum + hours
          }
          return sum
        }, 0)

        const sessionsWithVariance = sessions.filter((session) => session.variance !== null)
        const averageVariance =
          sessionsWithVariance.length > 0
            ? sessionsWithVariance.reduce((sum, session) => sum + Math.abs(toNumber(session.variance)), 0) / sessionsWithVariance.length
            : 0

        let performanceScore = 100
        if (averageVariance > 10) performanceScore -= 20
        else if (averageVariance > 5) performanceScore -= 10
        if (totalTransactions < 10) performanceScore -= 10
        if (averageTransaction < 20) performanceScore -= 10

        return {
          userId: user.id,
          userName: displayName(user),
          totalSales,
          totalTransactions,
          averageTransaction,
          sessionsCount,
          totalHours,
          averageVariance,
          performanceScore: Math.max(0, performanceScore),
        }
      })
      .filter((user) => user.sessionsCount > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
  } catch (error) {
    throwSafeAnalyticsError("getUserPerformance", error, "Failed to get user performance")
  }
}

export async function getDashboardSummaryReadModel(input: AnalyticsLocationInput) {
  const { organizationId, locationId } = input

  try {
    const today = new Date()
    const yesterday = subDays(today, 1)
    const thisWeek = startOfWeek(today)
    const thisMonth = startOfMonth(today)

    const todayStats = await getSalesAnalyticsReadModel({ organizationId, locationId, startDate: today, endDate: today })
    const yesterdayStats = await getSalesAnalyticsReadModel({ organizationId, locationId, startDate: yesterday, endDate: yesterday })
    const weekStats = await getSalesAnalyticsReadModel({ organizationId, locationId, startDate: thisWeek, endDate: today })
    const monthStats = await getSalesAnalyticsReadModel({ organizationId, locationId, startDate: thisMonth, endDate: today })

    const activeSessions = await db.pOSSession.count({
      where: {
        locationId,
        status: "ACTIVE",
      },
    })

    const lowStockItems = await db.item.count({
      where: {
        organizationId,
        isActive: true,
        inventoryLevels: {
          some: {
            locationId,
            quantityOnHand: {
              lte: 10,
            },
          },
        },
      },
    })

    return {
      today: {
        sales: todayStats.totalSales,
        transactions: todayStats.totalTransactions,
        averageTransaction: todayStats.averageTransaction,
        salesChange: todayStats.totalSales - yesterdayStats.totalSales,
        transactionsChange: todayStats.totalTransactions - yesterdayStats.totalTransactions,
      },
      week: {
        sales: weekStats.totalSales,
        transactions: weekStats.totalTransactions,
        averageTransaction: weekStats.averageTransaction,
      },
      month: {
        sales: monthStats.totalSales,
        transactions: monthStats.totalTransactions,
        averageTransaction: monthStats.averageTransaction,
      },
      activeSessions,
      lowStockItems,
      topSellingItems: todayStats.topSellingItems.slice(0, 5),
    }
  } catch (error) {
    throwSafeAnalyticsError("getDashboardSummary", error, "Failed to get dashboard summary")
  }
}
export type DashboardSummaryReadModel = Awaited<ReturnType<typeof getDashboardSummaryReadModel>>

type ComposeBusinessPulseCommandInput = {
  organizationId: string
  locationId: string
  summary: DashboardSummaryReadModel
  now?: Date
  currency?: string
}

export async function getBusinessPulseCommandReadModel(
  input: BusinessPulseCommandInput,
): Promise<BusinessPulseCommandData> {
  try {
    const locationId = input.locationId ?? (await resolveBusinessPulseLocationId(input.organizationId))

    if (!locationId) {
      return composeBlockedBusinessPulseCommandData({
        organizationId: input.organizationId,
        now: new Date(),
      })
    }

    const summary = await getDashboardSummaryReadModel({
      organizationId: input.organizationId,
      locationId,
    })

    return composeBusinessPulseCommandData({
      organizationId: input.organizationId,
      locationId,
      summary,
      now: new Date(),
    })
  } catch (error) {
    throwSafeAnalyticsError("getBusinessPulseCommand", error, "Failed to get business pulse command data")
  }
}

export function composeBusinessPulseCommandData(input: ComposeBusinessPulseCommandInput): BusinessPulseCommandData {
  const now = input.now ?? new Date()
  const generatedAt = now.toISOString()
  const periodStart = startOfDay(now).toISOString()
  const periodEnd = endOfDay(now).toISOString()
  const currency = input.currency ?? BUSINESS_PULSE_CURRENCY
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
    label: "Open inventory",
    href: "/dashboard/inventory/stock",
    requiredPermission: "inventory.read",
    moduleSlug: "inventory",
  })

  const summary = toBusinessPulseSummary(input.summary)
  const state: BIKpiState = "ready"
  const evidenceGrade = "operational" as const
  const trustState = "operational" as const

  const cards: BIKpiCard[] = [
    businessPulseCard({
      id: "business-pulse-today-sales",
      organizationId: input.organizationId,
      title: "Today's revenue",
      detail: `${formatAmount(summary.todaySales, currency)} from trusted sales orders today.`,
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
      drillThrough: routeDrillThrough("Open POS", "/dashboard/pos", "pos.read"),
      actionLink: actionLink({
        id: "business-pulse-open-pos",
        label: "Open POS",
        href: "/dashboard/pos",
        requiredPermission: "pos.read",
        moduleSlug: "pos",
      }),
    }),
    businessPulseCard({
      id: "business-pulse-low-stock",
      organizationId: input.organizationId,
      title: "Low-stock items",
      detail: `${summary.lowStockItems} active item(s) are at or below the analytics stock threshold.`,
      value: summary.lowStockItems,
      unit: "items",
      format: "number",
      freshness,
      provenance,
      drillThrough: routeDrillThrough("Open stock", "/dashboard/inventory/stock", "inventory.read"),
      actionLink: inventoryAction,
    }),
  ]

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
    commandBrief: {
      id: "business-pulse-command-brief",
      organizationId: input.organizationId,
      title: "Business Pulse Analytics",
      summary: `${formatAmount(summary.todaySales, currency)} in sales today, ${summary.todayTransactions} transaction(s), ${summary.activeSessions} active POS session(s), and ${summary.lowStockItems} low-stock item(s).`,
      conclusion: actionsToday.length
        ? `${actionsToday.length} action(s) need attention before the next operating review.`
        : "No urgent business pulse action is visible from the trusted analytics read model.",
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

function composeBlockedBusinessPulseCommandData(input: { organizationId: string; now: Date }): BusinessPulseCommandData {
  const generatedAt = input.now.toISOString()
  const periodStart = startOfDay(input.now).toISOString()
  const periodEnd = endOfDay(input.now).toISOString()
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
    currency: BUSINESS_PULSE_CURRENCY,
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
        requiredPermission: "system.settings.read",
        moduleSlug: "settings",
      }),
      drillThrough: routeDrillThrough("Open locations", "/dashboard/settings/locations", "system.settings.read"),
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
    },
  }
}

async function resolveBusinessPulseLocationId(organizationId: string) {
  const location = await db.location.findFirst({
    where: {
      organizationId,
      isActive: true,
      deletedAt: null,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  })

  return location?.id ?? null
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
      title: "Revenue movement versus yesterday",
      detail: `${formatSignedAmount(input.summary.salesChange, input.currency)} versus yesterday.`,
      businessImpact: salesChangeImpact(input.summary.salesChange, input.currency),
      direction: directionFromDelta(input.summary.salesChange),
      severity: severityFromDelta(input.summary.salesChange),
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
      title: "Transaction movement versus yesterday",
      detail: `${formatSignedNumber(input.summary.transactionChange)} transaction(s) versus yesterday.`,
      businessImpact: transactionChangeImpact(input.summary.transactionChange),
      direction: directionFromDelta(input.summary.transactionChange),
      severity: input.summary.transactionChange < 0 ? "medium" : "info",
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
      title: "Investigate revenue drop",
      nextStep: "Compare today's sales, cashier activity, and payment mix before the next operating review.",
      severity: severityFromDelta(input.summary.salesChange),
      state: "ready",
      actionLink: input.analyticsAction,
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      dueLabel: "Today",
      ownerLabel: "Sales manager",
      blockers: [],
      redactions: [],
    })
  }

  if (input.summary.lowStockItems > 0) {
    actions.push({
      id: "business-pulse-action-low-stock",
      title: "Review low-stock exposure",
      nextStep: `${input.summary.lowStockItems} item(s) are at or below the stock threshold and may constrain sales.`,
      severity: input.summary.lowStockItems >= 5 ? "high" : "medium",
      state: "ready",
      actionLink: input.inventoryAction,
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      dueLabel: "Today",
      ownerLabel: "Inventory lead",
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
}): BIRiskRank[] {
  const risks: BIRiskRank[] = []
  let rank = 1

  if (input.summary.salesChange < 0) {
    risks.push({
      id: "business-pulse-risk-revenue-drop",
      organizationId: input.organizationId,
      moduleSlug: BUSINESS_PULSE_MODULE,
      rank: rank++,
      title: "Revenue is down versus yesterday",
      detail: `${formatSignedAmount(input.summary.salesChange, input.currency)} against yesterday's trusted sales read model.`,
      businessImpact: "The team may need to inspect product mix, cashier flow, stock availability, or payment friction today.",
      severity: severityFromDelta(input.summary.salesChange),
      severityScore: input.summary.salesChange <= -100000 ? 80 : 55,
      moneyImpact: Math.abs(input.summary.salesChange),
      urgency: "today",
      state: "ready",
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      sourceModules: ["sales", "pos"],
      blockers: [],
      redactions: [],
      drillThrough: routeDrillThrough("Open analytics", "/dashboard/analytics", BUSINESS_PULSE_PERMISSION),
      actionLink: input.analyticsAction,
    })
  }

  if (input.summary.lowStockItems > 0) {
    risks.push({
      id: "business-pulse-risk-low-stock",
      organizationId: input.organizationId,
      moduleSlug: "inventory",
      rank: rank++,
      title: "Low-stock items can limit today's sales",
      detail: `${input.summary.lowStockItems} item(s) are at or below the analytics stock threshold.`,
      businessImpact: "Stock pressure can turn customer demand into missed sales if replenishment is not reviewed.",
      severity: input.summary.lowStockItems >= 5 ? "high" : "medium",
      severityScore: input.summary.lowStockItems >= 5 ? 75 : 50,
      moneyImpact: null,
      urgency: input.summary.lowStockItems >= 5 ? "today" : "soon",
      state: "ready",
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      sourceModules: ["inventory", "sales"],
      blockers: [],
      redactions: [],
      drillThrough: routeDrillThrough("Open inventory", "/dashboard/inventory/stock", "inventory.read"),
      actionLink: input.inventoryAction,
    })
  }

  if (input.summary.todayTransactions === 0) {
    risks.push({
      id: "business-pulse-risk-no-transactions",
      organizationId: input.organizationId,
      moduleSlug: BUSINESS_PULSE_MODULE,
      rank: rank++,
      title: "No transaction activity today",
      detail: "The analytics read model has no completed sales transactions for today.",
      businessImpact: "A zero-sales day may be expected, but it should be checked against branch opening and POS readiness.",
      severity: "low",
      severityScore: 30,
      moneyImpact: null,
      urgency: "watch",
      state: "ready",
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      sourceModules: ["sales", "pos"],
      blockers: [],
      redactions: [],
      drillThrough: routeDrillThrough("Open analytics", "/dashboard/analytics", BUSINESS_PULSE_PERMISSION),
      actionLink: input.analyticsAction,
    })
  }

  return risks
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
    sourceMaxUpdatedAt: generatedAt,
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
  if (delta > 0) return "improved"
  if (delta < 0) return "worsened"
  return "unchanged"
}

function severityFromDelta(delta: number): BISeverity {
  if (delta <= -100000) return "high"
  if (delta < 0) return "medium"
  return "info"
}

function salesChangeImpact(delta: number, currency: string) {
  if (delta > 0) return `Revenue improved by ${formatAmount(delta, currency)} versus yesterday.`
  if (delta < 0) return `Revenue dropped by ${formatAmount(Math.abs(delta), currency)} versus yesterday.`
  return "Revenue is unchanged versus yesterday."
}

function transactionChangeImpact(delta: number) {
  if (delta > 0) return `Transaction count improved by ${delta} versus yesterday.`
  if (delta < 0) return `Transaction count dropped by ${Math.abs(delta)} versus yesterday.`
  return "Transaction count is unchanged versus yesterday."
}

function formatAmount(value: number, currency: string) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${currency}`
}

function formatSignedAmount(value: number, currency: string) {
  return `${value >= 0 ? "+" : "-"}${formatAmount(Math.abs(value), currency)}`
}

function formatSignedNumber(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString("en-US")}`
}
