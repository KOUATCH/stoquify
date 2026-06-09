"use server"

import { db } from "@/prisma/db"
import { endOfDay, format, startOfDay } from "date-fns"
import { Prisma, type SalesOrderStatus } from "@prisma/client"

export interface FinancialSummaryReport {
  period: string
  totalRevenue: number
  totalCost: number
  grossProfit: number
  grossMargin: number
  totalTransactions: number
  averageTransactionValue: number
  totalItemsSold: number
  cashSales: number
  cardSales: number
  digitalSales: number
  revenueChange: number
  transactionChange: number
  profitChange: number
  topSellingItems: Array<{
    itemId: string
    itemName: string
    itemSku: string
    quantitySold: number
    revenue: number
    profit: number
  }>
  hourlyBreakdown: Array<{
    hour: number
    revenue: number
    transactions: number
  }>
}

export interface CashierPerformanceReport {
  cashierId: string
  cashierName: string
  totalSales: number
  totalTransactions: number
  averageTransactionValue: number
  sessionsWorked: number
  totalHoursWorked: number
  salesPerHour: number
  totalCashHandled: number
  cashVariance: number
  averageVariance: number
  variancePercentage: number
  transactionsPerHour: number
  performanceScore: number
  sessions: Array<{
    sessionId: string
    sessionNumber: string
    startTime: Date
    endTime: Date | null
    openingBalance: number
    closingBalance: number | null
    variance: number | null
    totalSales: number
    transactionCount: number
  }>
}

export interface ItemPerformanceReport {
  itemId: string
  itemName: string
  itemSku: string
  category: string
  brand: string
  quantitySold: number
  totalRevenue: number
  totalCost: number
  grossProfit: number
  profitMargin: number
  averageSellingPrice: number
  currentStock: number
  stockValue: number
  turnoverRate: number
  daysOfStock: number
  stockStatus: "in_stock" | "low_stock" | "out_of_stock"
  salesTrend: "increasing" | "decreasing" | "stable"
  revenueChange: number
  quantityChange: number
}

export interface CashFlowReport {
  period: string
  totalCashSales: number
  cashFromReturns: number
  otherCashIn: number
  totalCashIn: number
  cashRefunds: number
  cashPayouts: number
  otherCashOut: number
  totalCashOut: number
  netCashFlow: number
  dailyBreakdown: Array<{
    date: string
    cashIn: number
    cashOut: number
    netFlow: number
    runningBalance: number
  }>
  drawerReconciliation: Array<{
    sessionId: string
    sessionNumber: string
    stationName: string
    cashierName: string
    openingBalance: number
    expectedClosing: number
    actualClosing: number | null
    variance: number | null
    status: string
  }>
}

type DecimalValue = Prisma.Decimal | number | string | null | undefined
type OptionalLocationId = string | null | undefined

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

const completedSalesStatuses: SalesOrderStatus[] = ["COMPLETED", "DELIVERED"]

function scopedLocationId(locationId: OptionalLocationId) {
  return locationId && locationId !== "all" ? locationId : undefined
}

async function getSalesOrders(organizationId: string, locationId: OptionalLocationId, start: Date, end: Date) {
  const locationScope = scopedLocationId(locationId)

  return db.salesOrder.findMany({
    where: {
      organizationId,
      ...(locationScope ? { locationId: locationScope } : {}),
      deletedAt: null,
      orderDate: { gte: start, lte: end },
      status: { in: completedSalesStatuses },
    },
    include: {
      lines: {
        include: {
          item: {
            select: {
              id: true,
              nameEn: true,
              sku: true,
              costPrice: true,
            },
          },
        },
      },
      payments: {
        where: { deletedAt: null },
        select: { method: true, amount: true, status: true },
      },
    },
  })
}

export async function getFinancialSummaryReport(
  organizationId: string,
  locationId: OptionalLocationId,
  startDate: Date,
  endDate: Date,
): Promise<FinancialSummaryReport> {
  const start = startOfDay(startDate)
  const end = endOfDay(endDate)
  const salesOrders = await getSalesOrders(organizationId, locationId, start, end)

  const totalRevenue = salesOrders.reduce((sum, order) => sum + toNumber(order.total), 0)
  const totalCost = salesOrders.reduce(
    (sum, order) =>
      sum +
      order.lines.reduce(
        (lineSum, line) => lineSum + toNumber(line.item.costPrice) * toNumber(line.quantity),
        0,
      ),
    0,
  )
  const grossProfit = totalRevenue - totalCost
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const totalTransactions = salesOrders.length
  const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  const totalItemsSold = salesOrders.reduce(
    (sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + toNumber(line.quantity), 0),
    0,
  )

  const payments = salesOrders.flatMap((order) => order.payments)
  const cashSales = payments.filter((payment) => payment.method === "CASH").reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const cardSales = payments.filter((payment) => payment.method === "CARD").reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const digitalSales = payments
    .filter((payment) => ["MOBILE_MONEY", "BANK_TRANSFER", "STORE_CREDIT"].includes(payment.method))
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0)

  const periodLength = end.getTime() - start.getTime()
  const comparisonStart = new Date(start.getTime() - periodLength)
  const comparisonEnd = new Date(end.getTime() - periodLength)
  const comparisonOrders = await getSalesOrders(organizationId, locationId, comparisonStart, comparisonEnd)
  const comparisonRevenue = comparisonOrders.reduce((sum, order) => sum + toNumber(order.total), 0)
  const comparisonTransactions = comparisonOrders.length
  const comparisonCost = comparisonOrders.reduce(
    (sum, order) =>
      sum +
      order.lines.reduce(
        (lineSum, line) => lineSum + toNumber(line.item.costPrice) * toNumber(line.quantity),
        0,
      ),
    0,
  )
  const comparisonProfit = comparisonRevenue - comparisonCost

  const revenueChange = comparisonRevenue > 0 ? ((totalRevenue - comparisonRevenue) / comparisonRevenue) * 100 : 0
  const transactionChange =
    comparisonTransactions > 0 ? ((totalTransactions - comparisonTransactions) / comparisonTransactions) * 100 : 0
  const profitChange = comparisonProfit > 0 ? ((grossProfit - comparisonProfit) / comparisonProfit) * 100 : 0

  const itemSales = new Map<string, { name: string; sku: string; quantity: number; revenue: number; cost: number }>()
  for (const order of salesOrders) {
    for (const line of order.lines) {
      const existing = itemSales.get(line.itemId) || {
        name: line.item.nameEn,
        sku: line.item.sku,
        quantity: 0,
        revenue: 0,
        cost: 0,
      }
      existing.quantity += toNumber(line.quantity)
      existing.revenue += toNumber(line.lineTotal)
      existing.cost += toNumber(line.item.costPrice) * toNumber(line.quantity)
      itemSales.set(line.itemId, existing)
    }
  }

  const topSellingItems = Array.from(itemSales.entries())
    .map(([itemId, data]) => ({
      itemId,
      itemName: data.name,
      itemSku: data.sku,
      quantitySold: data.quantity,
      revenue: data.revenue,
      profit: data.revenue - data.cost,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const hourly = new Map<number, { revenue: number; transactions: number }>()
  for (let hour = 0; hour < 24; hour += 1) hourly.set(hour, { revenue: 0, transactions: 0 })
  for (const order of salesOrders) {
    const bucket = hourly.get(order.orderDate.getHours())!
    bucket.revenue += toNumber(order.total)
    bucket.transactions += 1
  }

  return {
    period: periodLabel(start, end),
    totalRevenue,
    totalCost,
    grossProfit,
    grossMargin,
    totalTransactions,
    averageTransactionValue,
    totalItemsSold,
    cashSales,
    cardSales,
    digitalSales,
    revenueChange,
    transactionChange,
    profitChange,
    topSellingItems,
    hourlyBreakdown: Array.from(hourly.entries()).map(([hour, data]) => ({ hour, ...data })),
  }
}

export async function getCashierPerformanceReport(
  organizationId: string,
  locationId: OptionalLocationId,
  startDate: Date,
  endDate: Date,
): Promise<CashierPerformanceReport[]> {
  const start = startOfDay(startDate)
  const end = endOfDay(endDate)
  const locationScope = scopedLocationId(locationId)

  const sessions = await db.pOSSession.findMany({
    where: {
      organizationId,
      ...(locationScope ? { locationId: locationScope } : {}),
      startTime: { gte: start, lte: end },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      salesOrders: {
        where: { deletedAt: null, status: { in: completedSalesStatuses } },
        select: { id: true, total: true },
      },
    },
    orderBy: { startTime: "asc" },
  })

  const byCashier = new Map<string, CashierPerformanceReport>()
  for (const session of sessions) {
    const cashierId = session.userId
    const sessionSales = session.salesOrders.reduce((sum, order) => sum + toNumber(order.total), 0)
    const hoursWorked = ((session.endTime ?? new Date()).getTime() - session.startTime.getTime()) / 3_600_000
    const sessionVariance = session.variance === null ? null : toNumber(session.variance)

    const report =
      byCashier.get(cashierId) ||
      ({
        cashierId,
        cashierName: displayUser(session.user),
        totalSales: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        sessionsWorked: 0,
        totalHoursWorked: 0,
        salesPerHour: 0,
        totalCashHandled: 0,
        cashVariance: 0,
        averageVariance: 0,
        variancePercentage: 0,
        transactionsPerHour: 0,
        performanceScore: 0,
        sessions: [],
      } satisfies CashierPerformanceReport)

    report.totalSales += sessionSales
    report.totalTransactions += session.transactionCount
    report.sessionsWorked += 1
    report.totalHoursWorked += Math.max(hoursWorked, 0)
    report.totalCashHandled += toNumber(session.cashTotal)
    report.cashVariance += sessionVariance ?? 0
    report.sessions.push({
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      startTime: session.startTime,
      endTime: session.endTime,
      openingBalance: toNumber(session.openingBalance),
      closingBalance: session.closingBalance === null ? null : toNumber(session.closingBalance),
      variance: sessionVariance,
      totalSales: sessionSales,
      transactionCount: session.transactionCount,
    })
    byCashier.set(cashierId, report)
  }

  return Array.from(byCashier.values()).map((report) => {
    const averageTransactionValue = report.totalTransactions > 0 ? report.totalSales / report.totalTransactions : 0
    const salesPerHour = report.totalHoursWorked > 0 ? report.totalSales / report.totalHoursWorked : 0
    const transactionsPerHour = report.totalHoursWorked > 0 ? report.totalTransactions / report.totalHoursWorked : 0
    const averageVariance = report.sessionsWorked > 0 ? report.cashVariance / report.sessionsWorked : 0
    const variancePercentage = report.totalCashHandled > 0 ? (Math.abs(report.cashVariance) / report.totalCashHandled) * 100 : 0
    const performanceScore = Math.max(0, Math.min(100, 100 - variancePercentage))
    return {
      ...report,
      averageTransactionValue,
      salesPerHour,
      transactionsPerHour,
      averageVariance,
      variancePercentage,
      performanceScore,
    }
  })
}

export async function getItemPerformanceReport(
  organizationId: string,
  locationId: OptionalLocationId,
  startDate: Date,
  endDate: Date,
): Promise<ItemPerformanceReport[]> {
  const start = startOfDay(startDate)
  const end = endOfDay(endDate)
  const locationScope = scopedLocationId(locationId)

  const items = await db.item.findMany({
    where: { organizationId, deletedAt: null, isActive: true },
    include: {
      category: { select: { titleEn: true } },
      brand: { select: { nameEn: true } },
      inventoryLevels: { where: locationScope ? { locationId: locationScope } : undefined, select: { quantityOnHand: true, totalValue: true } },
      salesOrderLines: {
        where: {
          salesOrder: {
            organizationId,
            ...(locationScope ? { locationId: locationScope } : {}),
            deletedAt: null,
            orderDate: { gte: start, lte: end },
            status: { in: completedSalesStatuses },
          },
        },
        select: { quantity: true, lineTotal: true },
      },
    },
  })

  return items.map((item) => {
    const quantitySold = item.salesOrderLines.reduce((sum, line) => sum + toNumber(line.quantity), 0)
    const totalRevenue = item.salesOrderLines.reduce((sum, line) => sum + toNumber(line.lineTotal), 0)
    const totalCost = quantitySold * toNumber(item.costPrice)
    const grossProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const averageSellingPrice = quantitySold > 0 ? totalRevenue / quantitySold : toNumber(item.sellingPrice)
    const currentStock = item.inventoryLevels.reduce((sum, level) => sum + toNumber(level.quantityOnHand), 0)
    const stockValue = item.inventoryLevels.reduce((sum, level) => sum + toNumber(level.totalValue), 0)
    const turnoverRate = currentStock > 0 ? quantitySold / currentStock : quantitySold > 0 ? quantitySold : 0
    const daysOfStock = quantitySold > 0 ? (currentStock / quantitySold) * 30 : 0
    const minStock = toNumber(item.minStockLevel)
    const stockStatus: ItemPerformanceReport["stockStatus"] =
      currentStock <= 0 ? "out_of_stock" : currentStock <= minStock ? "low_stock" : "in_stock"

    return {
      itemId: item.id,
      itemName: item.nameEn,
      itemSku: item.sku,
      category: item.category?.titleEn || "Uncategorized",
      brand: item.brand?.nameEn || "Unbranded",
      quantitySold,
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      averageSellingPrice,
      currentStock,
      stockValue,
      turnoverRate,
      daysOfStock,
      stockStatus,
      salesTrend: "stable",
      revenueChange: 0,
      quantityChange: 0,
    }
  })
}

export async function getCashFlowReport(
  organizationId: string,
  locationId: OptionalLocationId,
  startDate: Date,
  endDate: Date,
): Promise<CashFlowReport> {
  const start = startOfDay(startDate)
  const end = endOfDay(endDate)
  const locationScope = scopedLocationId(locationId)

  const transactions = await db.cashDrawerTransaction.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      cashDrawer: {
        ...(locationScope ? { locationId: locationScope } : {}),
        location: { organizationId },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const totalCashSales = transactions
    .filter((transaction) => transaction.type === "SALE")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const cashFromReturns = transactions
    .filter((transaction) => transaction.type === "RETURN")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const otherCashIn = transactions
    .filter((transaction) => transaction.type === "CASH_IN" || transaction.type === "OPENING_BALANCE")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const cashRefunds = transactions
    .filter((transaction) => transaction.type === "REFUND")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const cashPayouts = transactions
    .filter((transaction) => transaction.type === "PAYOUT")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const otherCashOut = transactions
    .filter((transaction) => transaction.type === "CASH_OUT" || transaction.type === "CLOSING_BALANCE")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)

  const totalCashIn = totalCashSales + cashFromReturns + otherCashIn
  const totalCashOut = cashRefunds + cashPayouts + otherCashOut
  const netCashFlow = totalCashIn - totalCashOut

  const dailyMap = new Map<string, { cashIn: number; cashOut: number }>()
  for (const transaction of transactions) {
    const key = format(transaction.createdAt, "yyyy-MM-dd")
    const bucket = dailyMap.get(key) || { cashIn: 0, cashOut: 0 }
    const amount = toNumber(transaction.amount)
    if (["SALE", "RETURN", "CASH_IN", "OPENING_BALANCE"].includes(transaction.type)) {
      bucket.cashIn += amount
    } else if (["REFUND", "PAYOUT", "CASH_OUT", "CLOSING_BALANCE"].includes(transaction.type)) {
      bucket.cashOut += amount
    }
    dailyMap.set(key, bucket)
  }

  let runningBalance = 0
  const dailyBreakdown = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => {
      const netFlow = bucket.cashIn - bucket.cashOut
      runningBalance += netFlow
      return { date, cashIn: bucket.cashIn, cashOut: bucket.cashOut, netFlow, runningBalance }
    })

  const sessions = await db.pOSSession.findMany({
    where: {
      organizationId,
      ...(locationScope ? { locationId: locationScope } : {}),
      startTime: { gte: start, lte: end },
    },
    include: {
      terminal: { select: { name: true, terminalNumber: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { startTime: "asc" },
  })

  return {
    period: periodLabel(start, end),
    totalCashSales,
    cashFromReturns,
    otherCashIn,
    totalCashIn,
    cashRefunds,
    cashPayouts,
    otherCashOut,
    totalCashOut,
    netCashFlow,
    dailyBreakdown,
    drawerReconciliation: sessions.map((session) => ({
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      stationName: session.terminal.name || session.terminal.terminalNumber,
      cashierName: displayUser(session.user),
      openingBalance: toNumber(session.openingBalance),
      expectedClosing: toNumber(session.expectedBalance),
      actualClosing: session.closingBalance === null ? null : toNumber(session.closingBalance),
      variance: session.variance === null ? null : toNumber(session.variance),
      status: session.status,
    })),
  }
}
