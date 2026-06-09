"use server"

import { db } from "@/prisma/db"
import { endOfDay, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns"

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

export async function getSalesAnalytics(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
): Promise<SalesAnalytics> {
  try {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    // Get sales data from real database
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

    // Calculate total items from sale lines
    const totalItems = sales.reduce(
      (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + toNumber(line.quantity), 0),
      0,
    )

    // Top selling items
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

    // Sales by hour
    const salesByHour = Array.from({ length: 24 }, (_, hour) => {
      const hourSales = sales.filter((sale) => new Date(sale.createdAt).getHours() === hour)
      return {
        hour,
        sales: hourSales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
        transactions: hourSales.length,
      }
    })

    // Sales by day
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

    // Payment methods
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
    console.error("Error getting sales analytics:", error)
    throw new Error("Failed to get sales analytics")
  }
}

export async function getCashReconciliationReports(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
): Promise<CashReconciliationReport[]> {
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

    // Get cash drawer transactions for all sessions
    const sessionIds = sessions.map(session => session.id)
    const allTransactions = await db.cashDrawerTransaction.findMany({
      where: {
        sessionId: {
          in: sessionIds,
        },
      },
    })

    // Group transactions by session
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
        .filter((t) => t.type === "CASH_IN")
        .reduce((sum, t) => sum + toNumber(t.amount), 0)

      const totalCashOut = sessionTransactions
        .filter((t) => t.type === "CASH_OUT")
        .reduce((sum, t) => sum + toNumber(t.amount), 0)

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
    console.error("Error getting cash reconciliation reports:", error)
    throw new Error("Failed to get cash reconciliation reports")
  }
}

export async function getProductPerformance(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
): Promise<ProductPerformance[]> {
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

      let stockStatus: "in_stock" | "low_stock" | "out_of_stock" = "in_stock"
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
    console.error("Error getting product performance:", error)
    throw new Error("Failed to get product performance")
  }
}

export async function getUserPerformance(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
): Promise<UserPerformance[]> {
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

        // Calculate total hours worked
        const totalHours = sessions.reduce((sum, session) => {
          if (session.endTime) {
            const hours = (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60)
            return sum + hours
          }
          return sum
        }, 0)

        // Calculate average variance
        const sessionsWithVariance = sessions.filter((s) => s.variance !== null)
        const averageVariance =
          sessionsWithVariance.length > 0
            ? sessionsWithVariance.reduce((sum, s) => sum + Math.abs(toNumber(s.variance)), 0) / sessionsWithVariance.length
            : 0

        // Calculate performance score (0-100)
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
    console.error("Error getting user performance:", error)
    throw new Error("Failed to get user performance")
  }
}

export async function getDashboardSummary(organizationId: string, locationId: string) {
  try {
    const today = new Date()
    const yesterday = subDays(today, 1)
    const thisWeek = startOfWeek(today)
    const thisMonth = startOfMonth(today)

    // Today's stats
    const todayStats = await getSalesAnalytics(organizationId, locationId, today, today)

    // Yesterday's stats for comparison
    const yesterdayStats = await getSalesAnalytics(organizationId, locationId, yesterday, yesterday)

    // This week's stats
    const weekStats = await getSalesAnalytics(organizationId, locationId, thisWeek, today)

    // This month's stats
    const monthStats = await getSalesAnalytics(organizationId, locationId, thisMonth, today)

    // Active sessions
    const activeSessions = await db.pOSSession.count({
      where: {
        locationId,
        status: "ACTIVE",
      },
    })

    // Low stock items
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
    console.error("Error getting dashboard summary:", error)
    throw new Error("Failed to get dashboard summary")
  }
}
