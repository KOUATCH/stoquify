"use server"

import { db } from "@/prisma/db"
import { endOfDay, startOfDay } from "date-fns"
import { Prisma, type SalesOrderStatus } from "@prisma/client"

export interface FinancialMetrics {
  revenue: {
    total: number
    growth: number
    recurring: number
    oneTime: number
    forecast: number
    target: number
    achievement: number
  }
  profitability: {
    grossProfit: number
    grossMargin: number
    netProfit: number
    netMargin: number
    ebitda: number
    ebitdaMargin: number
    operatingProfit: number
  }
  expenses: {
    total: number
    cogs: number
    operational: number
    salaries: number
    rent: number
    utilities: number
    marketing: number
    other: number
  }
  cashFlow: {
    operating: number
    investing: number
    financing: number
    netCashFlow: number
    cashOnHand: number
    burnRate: number
  }
  assets: {
    total: number
    current: number
    inventory: number
    receivables: number
    cash: number
    fixedAssets: number
  }
  liabilities: {
    total: number
    current: number
    payables: number
    accrued: number
    longTerm: number
    loans: number
  }
  ratios: {
    currentRatio: number
    quickRatio: number
    debtToEquity: number
    roe: number
    roa: number
    grossMarginTrend: number
    inventoryTurnover: number
    receivablesTurnover: number
  }
  taxes: {
    salesTax: number
    incomeTax: number
    payrollTax: number
    totalTaxLiability: number
    taxRate: number
  }
}

type DecimalValue = Prisma.Decimal | number | string | null | undefined

const activeSalesStatuses: SalesOrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"]

function toNumber(value: DecimalValue): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  return value.toNumber()
}

async function getSalesOrders(organizationId: string, locationId: string, start: Date, end: Date) {
  return db.salesOrder.findMany({
    where: {
      organizationId,
      locationId,
      deletedAt: null,
      orderDate: { gte: start, lte: end },
      status: { in: activeSalesStatuses },
    },
    include: {
      lines: {
        include: {
          item: { select: { nameEn: true, sku: true, costPrice: true, sellingPrice: true } },
        },
      },
      payments: { where: { deletedAt: null }, select: { method: true, amount: true } },
    },
  })
}

export async function getFinancialMetrics(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
): Promise<FinancialMetrics> {
  const start = startOfDay(startDate)
  const end = endOfDay(endDate)
  const periodLength = end.getTime() - start.getTime()
  const prevStart = new Date(start.getTime() - periodLength)
  const prevEnd = new Date(end.getTime() - periodLength)

  const [currentSales, previousSales, inventoryLevels, cashTransactions] = await Promise.all([
    getSalesOrders(organizationId, locationId, start, end),
    getSalesOrders(organizationId, locationId, prevStart, prevEnd),
    db.inventoryLevel.findMany({
      where: { locationId, item: { organizationId } },
      include: { item: { select: { costPrice: true } } },
    }),
    db.cashDrawerTransaction.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        cashDrawer: { locationId, location: { organizationId } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const totalRevenue = currentSales.reduce((sum, sale) => sum + toNumber(sale.total), 0)
  const previousRevenue = previousSales.reduce((sum, sale) => sum + toNumber(sale.total), 0)
  const growth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
  const totalCogs = currentSales.reduce(
    (sum, sale) =>
      sum +
      sale.lines.reduce((lineSum, line) => lineSum + toNumber(line.item.costPrice) * toNumber(line.quantity), 0),
    0,
  )
  const grossProfit = totalRevenue - totalCogs
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const inventoryValue = inventoryLevels.reduce(
    (sum, level) => sum + toNumber(level.quantityOnHand) * toNumber(level.item.costPrice),
    0,
  )

  const estimatedOperationalExpenses = totalRevenue * 0.15
  const estimatedSalaries = totalRevenue * 0.12
  const estimatedRent = 5000
  const estimatedUtilities = 1200
  const estimatedMarketing = totalRevenue * 0.02
  const estimatedOther = totalRevenue * 0.01
  const totalExpenses = totalCogs + estimatedOperationalExpenses
  const netProfit = totalRevenue - totalExpenses
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  const cashIn = cashTransactions
    .filter((transaction) => transaction.type === "CASH_IN" || transaction.type === "SALE")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const cashOut = cashTransactions
    .filter((transaction) => transaction.type === "CASH_OUT" || transaction.type === "PAYOUT" || transaction.type === "REFUND")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
  const operatingCashFlow = cashIn - cashOut
  const investingCashFlow = -15000
  const financingCashFlow = -8000
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow
  const currentCashBalance = cashTransactions.length
    ? toNumber(cashTransactions[cashTransactions.length - 1].balanceAfter)
    : 0

  const currentAssets = inventoryValue + currentCashBalance + totalRevenue * 0.1
  const totalAssets = currentAssets + 500000
  const currentLiabilities = totalRevenue * 0.08
  const totalLiabilities = currentLiabilities + 150000
  const equity = totalAssets - totalLiabilities
  const salesTax = totalRevenue * 0.0875
  const incomeTax = netProfit > 0 ? netProfit * 0.25 : 0
  const payrollTax = estimatedSalaries * 0.153
  const totalTaxLiability = salesTax + incomeTax + payrollTax

  return {
    revenue: {
      total: totalRevenue,
      growth,
      recurring: totalRevenue * 0.7,
      oneTime: totalRevenue * 0.3,
      forecast: totalRevenue * 1.1,
      target: totalRevenue * 0.95,
      achievement: totalRevenue > 0 ? (totalRevenue / (totalRevenue * 0.95)) * 100 : 0,
    },
    profitability: {
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      ebitda: netProfit + incomeTax + 5000,
      ebitdaMargin: totalRevenue > 0 ? ((netProfit + incomeTax + 5000) / totalRevenue) * 100 : 0,
      operatingProfit: grossProfit - estimatedOperationalExpenses,
    },
    expenses: {
      total: totalExpenses,
      cogs: totalCogs,
      operational: estimatedOperationalExpenses,
      salaries: estimatedSalaries,
      rent: estimatedRent,
      utilities: estimatedUtilities,
      marketing: estimatedMarketing,
      other: estimatedOther,
    },
    cashFlow: {
      operating: operatingCashFlow,
      investing: investingCashFlow,
      financing: financingCashFlow,
      netCashFlow,
      cashOnHand: currentCashBalance,
      burnRate: estimatedOperationalExpenses / 30,
    },
    assets: {
      total: totalAssets,
      current: currentAssets,
      inventory: inventoryValue,
      receivables: totalRevenue * 0.1,
      cash: currentCashBalance,
      fixedAssets: 500000,
    },
    liabilities: {
      total: totalLiabilities,
      current: currentLiabilities,
      payables: currentLiabilities * 0.7,
      accrued: currentLiabilities * 0.3,
      longTerm: 150000,
      loans: 100000,
    },
    ratios: {
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
      quickRatio: currentLiabilities > 0 ? (currentAssets - inventoryValue) / currentLiabilities : 0,
      debtToEquity: equity > 0 ? totalLiabilities / equity : 0,
      roe: equity > 0 ? (netProfit / equity) * 100 : 0,
      roa: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0,
      grossMarginTrend: 0,
      inventoryTurnover: inventoryValue > 0 ? totalCogs / inventoryValue : 0,
      receivablesTurnover: totalRevenue > 0 ? totalRevenue / (totalRevenue * 0.1) : 0,
    },
    taxes: {
      salesTax,
      incomeTax,
      payrollTax,
      totalTaxLiability,
      taxRate: netProfit > 0 ? (incomeTax / netProfit) * 100 : 25,
    },
  }
}

export async function getDailyReportData(organizationId: string, locationId: string, date: Date) {
  const start = startOfDay(date)
  const end = endOfDay(date)

  const dailyReport = await db.dailySalesReport.findFirst({
    where: { organizationId, locationId, date: start },
    include: {
      itemSales: true,
    },
  })

  if (dailyReport) {
    return {
      session: {
        id: "daily-report",
        sessionNumber: `DR-${date.toISOString().split("T")[0]}`,
        startTime: start,
        endTime: end,
        status: dailyReport.isFinalized ? "closed" : "active",
        cashierName: "Multiple Users",
        terminalName: "All Terminals",
      },
      metrics: {
        totalSales: toNumber(dailyReport.totalRevenue),
        totalTransactions: dailyReport.totalTransactions,
        averageTransaction: toNumber(dailyReport.averageTransactionValue),
        totalItemsSold: toNumber(dailyReport.totalQuantitySold),
        cashTotal: toNumber(dailyReport.cashSales),
        cardTotal: toNumber(dailyReport.cardSales),
        digitalTotal:
          toNumber(dailyReport.mobileMoneySales) +
          toNumber(dailyReport.bankTransferSales) +
          toNumber(dailyReport.creditSales),
        openingBalance: toNumber(dailyReport.openingBalance),
        closingBalance: toNumber(dailyReport.closingBalance),
        expectedBalance: toNumber(dailyReport.openingBalance) + toNumber(dailyReport.cashSales),
        variance: toNumber(dailyReport.variance),
        cashIn: toNumber(dailyReport.cashIn),
        cashOut: toNumber(dailyReport.cashOut),
      },
      topItems: dailyReport.itemSales.slice(0, 5).map((item) => ({
        itemId: item.itemId,
        itemName: item.itemNameEn,
        itemSku: item.itemSku,
        quantitySold: toNumber(item.quantitySold),
        totalRevenue: toNumber(item.totalRevenue),
        sellingPrice: toNumber(item.sellingPrice),
      })),
    }
  }

  const salesOrders = await getSalesOrders(organizationId, locationId, start, end)
  const totalSales = salesOrders.reduce((sum, order) => sum + toNumber(order.total), 0)
  const totalTransactions = salesOrders.length
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

  const itemSales = new Map<string, { name: string; sku: string; quantity: number; revenue: number; price: number }>()
  for (const order of salesOrders) {
    for (const line of order.lines) {
      const existing = itemSales.get(line.itemId) || {
        name: line.item.nameEn,
        sku: line.item.sku,
        quantity: 0,
        revenue: 0,
        price: toNumber(line.item.sellingPrice),
      }
      existing.quantity += toNumber(line.quantity)
      existing.revenue += toNumber(line.lineTotal)
      itemSales.set(line.itemId, existing)
    }
  }

  return {
    session: {
      id: "daily-calculation",
      sessionNumber: `DC-${date.toISOString().split("T")[0]}`,
      startTime: start,
      endTime: end,
      status: "active",
      cashierName: "Multiple Users",
      terminalName: "All Terminals",
    },
    metrics: {
      totalSales,
      totalTransactions,
      averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      totalItemsSold,
      cashTotal: cashSales,
      cardTotal: cardSales,
      digitalTotal: digitalSales,
      openingBalance: 200,
      closingBalance: null,
      expectedBalance: 200 + cashSales,
      variance: null,
      cashIn: cashSales,
      cashOut: 0,
    },
    topItems: Array.from(itemSales.entries())
      .map(([itemId, data]) => ({
        itemId,
        itemName: data.name,
        itemSku: data.sku,
        quantitySold: data.quantity,
        totalRevenue: data.revenue,
        sellingPrice: data.price,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5),
  }
}
