import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { moneyToNumber, type MoneyValue } from "@/services/pos/money"
import {
  financeDashboardServiceSchema,
  type FinanceDashboardPeriod,
  type FinanceDashboardServiceInput,
} from "@/services/finance/finance-dashboard.schemas"

type Severity = "success" | "info" | "warning" | "critical"

const dayMs = 24 * 60 * 60 * 1000
const payableStatuses = ["SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"] as const
const revenueStatuses = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"] as const

function toNumber(value: MoneyValue) {
  return moneyToNumber(value)
}

function sumBy<T>(rows: T[], selector: (row: T) => number) {
  return rows.reduce((total, row) => total + selector(row), 0)
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfQuarter(date: Date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1)
}

function resolveDateRange(period: FinanceDashboardPeriod, startDate?: Date, endDate?: Date) {
  const now = new Date()

  if (period === "custom") {
    return {
      startDate: startDate ? startOfDay(startDate) : startOfDay(now),
      endDate: endDate ? endOfDay(endDate) : endOfDay(now),
    }
  }

  if (period === "yesterday") {
    const yesterday = new Date(now.getTime() - dayMs)
    return { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) }
  }

  if (period === "7d") {
    return { startDate: startOfDay(new Date(now.getTime() - 6 * dayMs)), endDate: endOfDay(now) }
  }

  if (period === "30d") {
    return { startDate: startOfDay(new Date(now.getTime() - 29 * dayMs)), endDate: endOfDay(now) }
  }

  if (period === "qtd") {
    return { startDate: startOfDay(startOfQuarter(now)), endDate: endOfDay(now) }
  }

  if (period === "ytd") {
    return { startDate: startOfDay(startOfYear(now)), endDate: endOfDay(now) }
  }

  if (period === "today") {
    return { startDate: startOfDay(now), endDate: endOfDay(now) }
  }

  return { startDate: startOfDay(startOfMonth(now)), endDate: endOfDay(now) }
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function personName(person?: { name?: string | null; email?: string | null; code?: string | null } | null) {
  return person?.name || person?.email || person?.code || "Unknown"
}

function userName(user?: { firstName: string | null; lastName: string | null; email: string } | null) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
  return name || user?.email || "System"
}

function ageBucket(date: Date, now: Date) {
  const days = Math.max(0, Math.floor((now.getTime() - date.getTime()) / dayMs))
  if (days <= 30) return "current"
  if (days <= 60) return "d31"
  if (days <= 90) return "d61"
  return "d90"
}

function addAging(buckets: FinanceAgingSummary, bucket: keyof FinanceAgingSummary, amount: number) {
  buckets[bucket] += amount
}

export type FinanceLocationOption = {
  id: string
  name: string
  code: string
}

export type FinanceAgingSummary = {
  current: number
  d31: number
  d61: number
  d90: number
}

export type FinanceSummary = {
  cashPosition: number
  netCashFlow: number
  revenue: number
  expenses: number
  purchases: number
  grossProfit: number
  grossMargin: number
  paymentsCollected: number
  paymentsPending: number
  refunds: number
  receivables: number
  payables: number
  workingCapital: number
  openReceivableCount: number
  openPayableCount: number
  overdueReceivableAmount: number
  overduePayableAmount: number
  taxCollected: number
  taxOnPurchases: number
  drawerVariance: number
  financeConfidence: number
}

export type FinancePaymentMethod = {
  method: string
  amount: number
  count: number
}

export type FinanceTrendPoint = {
  key: string
  label: string
  inflow: number
  outflow: number
  revenue: number
  expenses: number
  purchases: number
  net: number
}

export type FinanceCounterparty = {
  id: string
  name: string
  balance: number
  terms: number | null
  severity: Severity
}

export type FinanceRecentPayment = {
  id: string
  paymentNumber: string
  amount: number
  method: string
  status: string
  direction: "in" | "out" | "unknown"
  counterparty: string
  processedBy: string
  createdAt: string
}

export type FinanceAlert = {
  id: string
  severity: Severity
  code: "OVERDUE_AR" | "OVERDUE_AP" | "NEGATIVE_MARGIN" | "PENDING_PAYMENTS" | "CASH_GAP" | "READY"
  count: number
  amount?: number
}

export type FinanceDashboardData = {
  generatedAt: string
  organization: {
    id: string
    name: string
    currency: string
  }
  filters: {
    view: string
    locationId: string | null
    period: FinanceDashboardPeriod
    startDate: string
    endDate: string
  }
  locations: FinanceLocationOption[]
  summary: FinanceSummary
  aging: {
    receivables: FinanceAgingSummary
    payables: FinanceAgingSummary
  }
  paymentMethods: FinancePaymentMethod[]
  trend: FinanceTrendPoint[]
  topReceivables: FinanceCounterparty[]
  topPayables: FinanceCounterparty[]
  recentPayments: FinanceRecentPayment[]
  alerts: FinanceAlert[]
}

export async function getFinanceDashboard(rawInput: FinanceDashboardServiceInput): Promise<FinanceDashboardData> {
  const input = financeDashboardServiceSchema.parse(rawInput)
  const range = resolveDateRange(input.period, input.startDate, input.endDate)

  if (range.endDate < range.startDate) {
    throw new Error("End date must be after start date")
  }

  const locationCondition = input.locationId ? { locationId: input.locationId } : {}
  const paymentLocationCondition: Prisma.PaymentWhereInput = input.locationId
    ? {
        OR: [
          { salesOrder: { locationId: input.locationId } },
          { purchaseOrder: { locationId: input.locationId } },
        ],
      }
    : {}

  const [
    organization,
    locations,
    salesOrders,
    openSalesOrders,
    purchaseOrders,
    openPurchaseOrders,
    expenses,
    payments,
    recentPayments,
    refunds,
    customers,
    suppliers,
    cashDrawers,
  ] = await Promise.all([
    db.organization.findFirst({
      where: { id: input.organizationId, isActive: true, deletedAt: null },
      select: { id: true, name: true, currency: true },
    }),
    db.location.findMany({
      where: { organizationId: input.organizationId, isActive: true, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, code: true },
    }),
    db.salesOrder.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        orderDate: { gte: range.startDate, lte: range.endDate },
        status: { in: [...revenueStatuses] },
        ...locationCondition,
      },
      include: {
        customer: { select: { id: true, name: true, paymentTerms: true } },
        payments: { select: { amount: true, status: true, method: true } },
      },
      orderBy: { orderDate: "desc" },
      take: 250,
    }),
    db.salesOrder.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        paymentStatus: { in: ["PENDING", "PARTIAL"] },
        status: { notIn: ["DRAFT", "CANCELLED"] },
        ...locationCondition,
      },
      include: {
        customer: { select: { id: true, name: true, paymentTerms: true, currentBalance: true } },
        payments: { select: { amount: true, status: true } },
      },
      orderBy: { orderDate: "asc" },
      take: 250,
    }),
    db.purchaseOrder.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        orderDate: { gte: range.startDate, lte: range.endDate },
        status: { notIn: ["DRAFT", "CANCELLED"] },
        ...locationCondition,
      },
      include: { supplier: { select: { id: true, name: true, paymentTerms: true } }, payments: { select: { amount: true, status: true } } },
      orderBy: { orderDate: "desc" },
      take: 250,
    }),
    db.purchaseOrder.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        status: { in: [...payableStatuses] },
        ...locationCondition,
      },
      include: {
        supplier: { select: { id: true, name: true, paymentTerms: true, currentBalance: true } },
        payments: { select: { amount: true, status: true } },
      },
      orderBy: { orderDate: "asc" },
      take: 250,
    }),
    db.expense.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        expenseDate: { gte: range.startDate, lte: range.endDate },
        ...(input.locationId ? { OR: [{ locationId: input.locationId }, { locationId: null }] } : {}),
      },
      include: { category: { select: { nameEn: true, nameFr: true } }, supplier: { select: { id: true, name: true } } },
      orderBy: { expenseDate: "desc" },
      take: 250,
    }),
    db.payment.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        createdAt: { gte: range.startDate, lte: range.endDate },
        ...paymentLocationCondition,
      },
      include: {
        salesOrder: { include: { customer: { select: { id: true, name: true } } } },
        purchaseOrder: { include: { supplier: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    db.payment.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        ...paymentLocationCondition,
      },
      include: {
        processedBy: { select: { firstName: true, lastName: true, email: true } },
        salesOrder: { include: { customer: { select: { id: true, name: true } } } },
        purchaseOrder: { include: { supplier: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    db.paymentRefund.findMany({
      where: {
        organizationId: input.organizationId,
        createdAt: { gte: range.startDate, lte: range.endDate },
        status: { notIn: ["FAILED", "CANCELLED"] },
      },
      select: { amount: true, status: true },
    }),
    db.customer.findMany({
      where: { organizationId: input.organizationId, isActive: true, deletedAt: null },
      orderBy: { currentBalance: "desc" },
      take: 100,
      select: { id: true, name: true, currentBalance: true, paymentTerms: true },
    }),
    db.supplier.findMany({
      where: { organizationId: input.organizationId, isActive: true, deletedAt: null },
      orderBy: { currentBalance: "desc" },
      take: 100,
      select: { id: true, name: true, currentBalance: true, paymentTerms: true },
    }),
    db.cashDrawer.findMany({
      where: {
        location: {
          organizationId: input.organizationId,
          deletedAt: null,
          ...(input.locationId ? { id: input.locationId } : {}),
        },
      },
      select: { currentBalance: true, expectedBalance: true },
    }),
  ])

  if (!organization) {
    throw new Error("Organization not found")
  }

  const revenue = sumBy(salesOrders, (order) => toNumber(order.total))
  const taxCollected = sumBy(salesOrders, (order) => toNumber(order.taxAmount))
  const purchases = sumBy(purchaseOrders, (order) => toNumber(order.total))
  const taxOnPurchases = sumBy(purchaseOrders, (order) => toNumber(order.taxAmount))
  const expensesTotal = sumBy(expenses, (expense) => toNumber(expense.amount))
  const refundsTotal = sumBy(refunds, (refund) => toNumber(refund.amount))
  const paymentsCollected = sumBy(
    payments.filter((payment) => payment.salesOrderId && payment.status !== "CANCELLED"),
    (payment) => toNumber(payment.amount),
  )
  const paymentsOutbound = sumBy(
    payments.filter((payment) => payment.purchaseOrderId && payment.status !== "CANCELLED"),
    (payment) => toNumber(payment.amount),
  )
  const paymentsPending = sumBy(
    payments.filter((payment) => payment.status === "PENDING"),
    (payment) => toNumber(payment.amount),
  )
  const receivables = sumBy(customers, (customer) => Math.max(0, toNumber(customer.currentBalance)))
  const payables = sumBy(suppliers, (supplier) => Math.max(0, toNumber(supplier.currentBalance)))
  const cashPosition = sumBy(cashDrawers, (drawer) => toNumber(drawer.currentBalance))
  const drawerVariance = sumBy(cashDrawers, (drawer) => toNumber(drawer.currentBalance) - toNumber(drawer.expectedBalance))
  const grossProfit = revenue - purchases - expensesTotal - refundsTotal
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  const netCashFlow = paymentsCollected - paymentsOutbound - expensesTotal - refundsTotal
  const now = new Date()

  const receivableAging: FinanceAgingSummary = { current: 0, d31: 0, d61: 0, d90: 0 }
  const payableAging: FinanceAgingSummary = { current: 0, d31: 0, d61: 0, d90: 0 }
  let overdueReceivableAmount = 0
  let overduePayableAmount = 0

  for (const order of openSalesOrders) {
    const paid = sumBy(order.payments ?? [], (payment) => payment.status === "CANCELLED" ? 0 : toNumber(payment.amount))
    const openAmount = Math.max(0, toNumber(order.total) - paid)
    const dueDate = new Date(order.orderDate.getTime() + (order.customer.paymentTerms ?? 30) * dayMs)
    addAging(receivableAging, ageBucket(dueDate, now), openAmount)
    if (dueDate < now) overdueReceivableAmount += openAmount
  }

  for (const order of openPurchaseOrders) {
    const paid = sumBy(order.payments ?? [], (payment) => payment.status === "CANCELLED" ? 0 : toNumber(payment.amount))
    const openAmount = Math.max(0, toNumber(order.total) - paid)
    const dueDate = new Date(order.orderDate.getTime() + (order.supplier.paymentTerms ?? 30) * dayMs)
    addAging(payableAging, ageBucket(dueDate, now), openAmount)
    if (dueDate < now) overduePayableAmount += openAmount
  }

  const methodMap = new Map<string, FinancePaymentMethod>()
  for (const payment of payments) {
    const current = methodMap.get(payment.method) ?? { method: payment.method, amount: 0, count: 0 }
    current.amount += toNumber(payment.amount)
    current.count += 1
    methodMap.set(payment.method, current)
  }

  const trendMap = new Map<string, FinanceTrendPoint>()
  const cursor = startOfDay(range.startDate)
  while (cursor <= range.endDate) {
    const key = dateKey(cursor)
    trendMap.set(key, { key, label: key, inflow: 0, outflow: 0, revenue: 0, expenses: 0, purchases: 0, net: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const order of salesOrders) {
    const point = trendMap.get(dateKey(order.orderDate))
    if (point) {
      point.revenue += toNumber(order.total)
      point.inflow += sumBy(order.payments ?? [], (payment) => payment.status === "CANCELLED" ? 0 : toNumber(payment.amount))
    }
  }

  for (const order of purchaseOrders) {
    const point = trendMap.get(dateKey(order.orderDate))
    if (point) {
      point.purchases += toNumber(order.total)
      point.outflow += sumBy(order.payments ?? [], (payment) => payment.status === "CANCELLED" ? 0 : toNumber(payment.amount))
    }
  }

  for (const expense of expenses) {
    const point = trendMap.get(dateKey(expense.expenseDate))
    if (point) {
      point.expenses += toNumber(expense.amount)
      point.outflow += toNumber(expense.amount)
    }
  }

  const trend = Array.from(trendMap.values()).map((point) => ({ ...point, net: point.inflow - point.outflow }))

  const topReceivables = customers
    .filter((customer) => toNumber(customer.currentBalance) > 0)
    .slice(0, 8)
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      balance: toNumber(customer.currentBalance),
      terms: customer.paymentTerms ?? null,
      severity: toNumber(customer.currentBalance) > 0 && (customer.paymentTerms ?? 30) > 45 ? "warning" as Severity : "info" as Severity,
    }))

  const topPayables = suppliers
    .filter((supplier) => toNumber(supplier.currentBalance) > 0)
    .slice(0, 8)
    .map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      balance: toNumber(supplier.currentBalance),
      terms: supplier.paymentTerms ?? null,
      severity: toNumber(supplier.currentBalance) > 0 && (supplier.paymentTerms ?? 30) <= 15 ? "warning" as Severity : "info" as Severity,
    }))

  const recentPaymentRows = recentPayments.map((payment) => {
    const direction: FinanceRecentPayment["direction"] = payment.salesOrderId ? "in" : payment.purchaseOrderId ? "out" : "unknown"
    const counterparty = payment.salesOrder?.customer
      ? personName(payment.salesOrder.customer)
      : payment.purchaseOrder?.supplier
        ? personName(payment.purchaseOrder.supplier)
        : "Unlinked"

    return {
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      amount: toNumber(payment.amount),
      method: payment.method,
      status: payment.status,
      direction,
      counterparty,
      processedBy: userName(payment.processedBy),
      createdAt: payment.createdAt.toISOString(),
    }
  })

  const alerts: FinanceAlert[] = []
  if (overdueReceivableAmount > 0) {
    alerts.push({ id: "overdue-ar", code: "OVERDUE_AR", severity: "warning", count: openSalesOrders.length, amount: overdueReceivableAmount })
  }
  if (overduePayableAmount > 0) {
    alerts.push({ id: "overdue-ap", code: "OVERDUE_AP", severity: "critical", count: openPurchaseOrders.length, amount: overduePayableAmount })
  }
  if (grossProfit < 0) {
    alerts.push({ id: "negative-margin", code: "NEGATIVE_MARGIN", severity: "critical", count: 1, amount: grossProfit })
  }
  if (paymentsPending > 0) {
    alerts.push({ id: "pending-payments", code: "PENDING_PAYMENTS", severity: "info", count: payments.filter((payment) => payment.status === "PENDING").length, amount: paymentsPending })
  }
  if (netCashFlow < 0) {
    alerts.push({ id: "cash-gap", code: "CASH_GAP", severity: "warning", count: 1, amount: netCashFlow })
  }
  if (alerts.length === 0) {
    alerts.push({ id: "ready", code: "READY", severity: "success", count: 0 })
  }

  const riskPenalty =
    (overdueReceivableAmount > 0 ? 10 : 0) +
    (overduePayableAmount > 0 ? 12 : 0) +
    (paymentsPending > 0 ? 4 : 0) +
    (grossProfit < 0 ? 16 : 0) +
    (netCashFlow < 0 ? 8 : 0) +
    Math.min(12, Math.abs(drawerVariance) / 1000)

  return {
    generatedAt: new Date().toISOString(),
    organization,
    filters: {
      view: input.view,
      locationId: input.locationId ?? null,
      period: input.period,
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
    },
    locations,
    summary: {
      cashPosition,
      netCashFlow,
      revenue,
      expenses: expensesTotal,
      purchases,
      grossProfit,
      grossMargin,
      paymentsCollected,
      paymentsPending,
      refunds: refundsTotal,
      receivables,
      payables,
      workingCapital: receivables - payables + cashPosition,
      openReceivableCount: openSalesOrders.length,
      openPayableCount: openPurchaseOrders.length,
      overdueReceivableAmount,
      overduePayableAmount,
      taxCollected,
      taxOnPurchases,
      drawerVariance,
      financeConfidence: Math.max(0, Math.min(100, Math.round(100 - riskPenalty))),
    },
    aging: {
      receivables: receivableAging,
      payables: payableAging,
    },
    paymentMethods: Array.from(methodMap.values()).sort((a, b) => b.amount - a.amount),
    trend,
    topReceivables,
    topPayables,
    recentPayments: recentPaymentRows,
    alerts,
  }
}
