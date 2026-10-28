import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { moneyToNumber, type MoneyValue } from "@/services/pos/money"
import {
  drawerDashboardServiceSchema,
  type DrawerDashboardPeriod,
  type DrawerDashboardServiceInput,
} from "@/services/pos/drawer-dashboard.schemas"

type Severity = "success" | "info" | "warning" | "critical"

type DrawerEventType =
  | "OPENING_BALANCE"
  | "SALE"
  | "RETURN"
  | "CASH_IN"
  | "CASH_OUT"
  | "CLOSING_BALANCE"
  | "RECONCILIATION"
  | "REFUND"
  | "PAYOUT"

const cashOutTypes: DrawerEventType[] = ["CASH_OUT", "PAYOUT"]
const refundTypes: DrawerEventType[] = ["RETURN", "REFUND"]
const dayMs = 24 * 60 * 60 * 1000

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

function resolveDateRange(period: DrawerDashboardPeriod, startDate?: Date, endDate?: Date) {
  const now = new Date()

  if (period === "custom") {
    const start = startDate ? startOfDay(startDate) : startOfDay(now)
    const end = endDate ? endOfDay(endDate) : endOfDay(now)
    return { startDate: start, endDate: end }
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

  if (period === "mtd") {
    return { startDate: startOfDay(startOfMonth(now)), endDate: endOfDay(now) }
  }

  return { startDate: startOfDay(now), endDate: endOfDay(now) }
}

function userName(user?: { firstName: string | null; lastName: string | null; email: string } | null) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
  return name || user?.email || "Unknown"
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function varianceSeverity(value: number, mediumThreshold: number, highThreshold: number): Severity {
  const absolute = Math.abs(value)
  if (absolute >= highThreshold) return "critical"
  if (absolute >= mediumThreshold) return "warning"
  if (absolute > 0) return "info"
  return "success"
}

function currencyThresholds(currency: string) {
  const normalized = currency.toUpperCase()
  if (["XAF", "XOF"].includes(normalized)) {
    return { medium: 2_000, high: 10_000 }
  }

  return { medium: 10, high: 50 }
}

export type CashDrawerDashboardLocation = {
  id: string
  name: string
  code: string
}

export type CashDrawerDashboardSummary = {
  drawerCount: number
  openDrawerCount: number
  closedDrawerCount: number
  activeSessionCount: number
  closedSessionCount: number
  currentBalance: number
  expectedBalance: number
  liveVariance: number
  openingFloat: number
  cashSales: number
  cashIn: number
  cashOut: number
  refunds: number
  closingCounts: number
  netMovement: number
  sessionVariance: number
  transactionCount: number
  saleCount: number
  totalSales: number
  nonCashTenderTotal: number
  accuracyRate: number
  confidenceScore: number
}

export type CashDrawerDashboardDrawer = {
  id: string
  name: string
  drawerNumber: string
  terminalName: string
  terminalNumber: string
  locationName: string
  isOpen: boolean
  currentBalance: number
  expectedBalance: number
  variance: number
  severity: Severity
  activeSessionNumber: string | null
  activeCashierName: string | null
  lastEventAt: string | null
  periodCashSales: number
  periodCashIn: number
  periodCashOut: number
  periodRefunds: number
  periodEventCount: number
}

export type CashDrawerDashboardSession = {
  id: string
  sessionNumber: string
  status: "ACTIVE" | "SUSPENDED" | "CLOSED" | "RECONCILED"
  terminalName: string
  terminalNumber: string
  locationName: string
  cashierName: string
  startTime: string
  endTime: string | null
  openingBalance: number
  expectedBalance: number
  closingBalance: number | null
  variance: number | null
  totalSales: number
  cashTotal: number
  cardTotal: number
  mobileMoneyTotal: number
  bankTransferTotal: number
  creditTotal: number
  transactionCount: number
  severity: Severity
}

export type CashDrawerDashboardJournalEntry = {
  id: string
  type: DrawerEventType
  amount: number
  reason: string | null
  drawerName: string
  terminalName: string
  locationName: string
  sessionNumber: string | null
  cashierName: string
  balanceBefore: number
  balanceAfter: number
  createdAt: string
}

export type CashDrawerDashboardTrendPoint = {
  key: string
  label: string
  opening: number
  sales: number
  cashIn: number
  cashOut: number
  refunds: number
  closing: number
  net: number
}

export type CashDrawerDashboardAlert = {
  id: string
  code: "HIGH_VARIANCE" | "MEDIUM_VARIANCE" | "STALE_SESSION" | "OPEN_DRAWER_WITHOUT_SESSION" | "READY"
  severity: Severity
  count: number
  amount?: number
}

export type CashDrawerDashboardData = {
  generatedAt: string
  organization: {
    id: string
    name: string
    currency: string
  }
  filters: {
    locationId: string | null
    period: DrawerDashboardPeriod
    startDate: string
    endDate: string
  }
  thresholds: {
    mediumVariance: number
    highVariance: number
  }
  locations: CashDrawerDashboardLocation[]
  summary: CashDrawerDashboardSummary
  drawers: CashDrawerDashboardDrawer[]
  sessions: CashDrawerDashboardSession[]
  journal: CashDrawerDashboardJournalEntry[]
  trend: CashDrawerDashboardTrendPoint[]
  alerts: CashDrawerDashboardAlert[]
}

export async function getCashDrawerDashboard(rawInput: DrawerDashboardServiceInput): Promise<CashDrawerDashboardData> {
  const input = drawerDashboardServiceSchema.parse(rawInput)
  const range = resolveDateRange(input.period, input.startDate, input.endDate)

  if (range.endDate < range.startDate) {
    throw new BusinessRuleError("End date must be after start date")
  }

  const organization = await db.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null, isActive: true },
    select: { id: true, name: true, currency: true },
  })

  if (!organization) throw new NotFoundError("Organization not found")

  const thresholds = currencyThresholds(organization.currency)
  const locationFilter = input.locationId
    ? { id: input.locationId, organizationId: input.organizationId, deletedAt: null }
    : { organizationId: input.organizationId, deletedAt: null }

  const [locations, drawers, sessions, transactions] = await Promise.all([
    db.location.findMany({
      where: { organizationId: input.organizationId, deletedAt: null, isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, code: true },
    }),
    db.cashDrawer.findMany({
      where: { location: locationFilter },
      orderBy: [{ isOpen: "desc" }, { updatedAt: "desc" }],
      include: {
        terminal: { select: { id: true, name: true, terminalNumber: true } },
        location: { select: { id: true, name: true, code: true } },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    db.pOSSession.findMany({
      where: {
        organizationId: input.organizationId,
        ...(input.locationId ? { locationId: input.locationId } : {}),
        startTime: { lte: range.endDate },
        OR: [{ endTime: null }, { endTime: { gte: range.startDate } }],
      },
      orderBy: { startTime: "desc" },
      take: 120,
      include: {
        terminal: { select: { id: true, name: true, terminalNumber: true } },
        location: { select: { id: true, name: true, code: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    db.cashDrawerTransaction.findMany({
      where: {
        createdAt: { gte: range.startDate, lte: range.endDate },
        cashDrawer: { location: locationFilter },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
      include: {
        cashDrawer: {
          include: {
            terminal: { select: { id: true, name: true, terminalNumber: true } },
            location: { select: { id: true, name: true, code: true } },
          },
        },
        session: { select: { id: true, sessionNumber: true, status: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ])

  const activeSessions = sessions.filter((session) => session.status === "ACTIVE")
  const closedSessions = sessions.filter((session) => session.status === "CLOSED" || session.status === "RECONCILED")
  const activeSessionByTerminal = new Map(activeSessions.map((session) => [session.terminalId, session]))
  const transactionsByDrawer = new Map<string, typeof transactions>()

  for (const transaction of transactions) {
    const current = transactionsByDrawer.get(transaction.cashDrawerId) ?? []
    current.push(transaction)
    transactionsByDrawer.set(transaction.cashDrawerId, current)
  }

  const eventAmount = (type: DrawerEventType | DrawerEventType[]) => {
    const types = Array.isArray(type) ? type : [type]
    return sumBy(transactions.filter((transaction) => types.includes(transaction.type as DrawerEventType)), (transaction) =>
      toNumber(transaction.amount),
    )
  }

  const openingFloat = eventAmount("OPENING_BALANCE")
  const cashSales = eventAmount("SALE")
  const cashIn = eventAmount("CASH_IN")
  const cashOut = eventAmount(cashOutTypes)
  const refunds = eventAmount(refundTypes)
  const closingCounts = eventAmount("CLOSING_BALANCE")
  const currentBalance = sumBy(drawers, (drawer) => toNumber(drawer.currentBalance))
  const expectedBalance = sumBy(drawers, (drawer) => toNumber(drawer.expectedBalance))
  const liveVariance = currentBalance - expectedBalance
  const sessionVariance = sumBy(closedSessions, (session) => toNumber(session.variance))
  const exactClosedSessions = closedSessions.filter((session) => Math.abs(toNumber(session.variance)) < 0.01).length
  const mediumVarianceSessions = closedSessions.filter((session) => {
    const variance = Math.abs(toNumber(session.variance))
    return variance >= thresholds.medium && variance < thresholds.high
  })
  const highVarianceSessions = closedSessions.filter((session) => Math.abs(toNumber(session.variance)) >= thresholds.high)
  const openDrawersWithoutSession = drawers.filter((drawer) => drawer.isOpen && !activeSessionByTerminal.has(drawer.terminalId))
  const staleSessions = activeSessions.filter((session) => Date.now() - session.startTime.getTime() > 12 * 60 * 60 * 1000)
  const confidenceScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          highVarianceSessions.length * 14 -
          mediumVarianceSessions.length * 7 -
          openDrawersWithoutSession.length * 12 -
          staleSessions.length * 8 -
          Math.min(20, Math.abs(liveVariance) / thresholds.high * 10),
      ),
    ),
  )

  const drawerRows: CashDrawerDashboardDrawer[] = drawers.map((drawer) => {
    const drawerTransactions = transactionsByDrawer.get(drawer.id) ?? []
    const activeSession = activeSessionByTerminal.get(drawer.terminalId)
    const variance = toNumber(drawer.currentBalance) - toNumber(drawer.expectedBalance)

    return {
      id: drawer.id,
      name: drawer.name,
      drawerNumber: drawer.drawerNumber,
      terminalName: drawer.terminal.name,
      terminalNumber: drawer.terminal.terminalNumber,
      locationName: drawer.location.name,
      isOpen: drawer.isOpen,
      currentBalance: toNumber(drawer.currentBalance),
      expectedBalance: toNumber(drawer.expectedBalance),
      variance,
      severity: varianceSeverity(variance, thresholds.medium, thresholds.high),
      activeSessionNumber: activeSession?.sessionNumber ?? null,
      activeCashierName: activeSession ? userName(activeSession.user) : null,
      lastEventAt: drawer.transactions[0]?.createdAt.toISOString() ?? null,
      periodCashSales: sumBy(drawerTransactions.filter((event) => event.type === "SALE"), (event) => toNumber(event.amount)),
      periodCashIn: sumBy(drawerTransactions.filter((event) => event.type === "CASH_IN"), (event) => toNumber(event.amount)),
      periodCashOut: sumBy(drawerTransactions.filter((event) => cashOutTypes.includes(event.type as DrawerEventType)), (event) =>
        toNumber(event.amount),
      ),
      periodRefunds: sumBy(drawerTransactions.filter((event) => refundTypes.includes(event.type as DrawerEventType)), (event) =>
        toNumber(event.amount),
      ),
      periodEventCount: drawerTransactions.length,
    }
  })

  const sessionRows: CashDrawerDashboardSession[] = sessions.map((session) => {
    const variance = session.variance === null ? null : toNumber(session.variance)

    return {
      id: session.id,
      sessionNumber: session.sessionNumber,
      status: session.status,
      terminalName: session.terminal.name,
      terminalNumber: session.terminal.terminalNumber,
      locationName: session.location.name,
      cashierName: userName(session.user),
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() ?? null,
      openingBalance: toNumber(session.openingBalance),
      expectedBalance: toNumber(session.expectedBalance),
      closingBalance: session.closingBalance === null ? null : toNumber(session.closingBalance),
      variance,
      totalSales: toNumber(session.totalSales),
      cashTotal: toNumber(session.cashTotal),
      cardTotal: toNumber(session.cardTotal),
      mobileMoneyTotal: toNumber(session.mobileMoneyTotal),
      bankTransferTotal: toNumber(session.bankTransferTotal),
      creditTotal: toNumber(session.creditTotal),
      transactionCount: session.transactionCount,
      severity: variance === null ? "info" : varianceSeverity(variance, thresholds.medium, thresholds.high),
    }
  })

  const journalRows: CashDrawerDashboardJournalEntry[] = transactions.slice(0, 80).map((transaction) => ({
    id: transaction.id,
    type: transaction.type as DrawerEventType,
    amount: toNumber(transaction.amount),
    reason: transaction.reason,
    drawerName: transaction.cashDrawer.name,
    terminalName: transaction.cashDrawer.terminal.name,
    locationName: transaction.cashDrawer.location.name,
    sessionNumber: transaction.session?.sessionNumber ?? null,
    cashierName: userName(transaction.user),
    balanceBefore: toNumber(transaction.balanceBefore),
    balanceAfter: toNumber(transaction.balanceAfter),
    createdAt: transaction.createdAt.toISOString(),
  }))

  const trendMap = new Map<string, CashDrawerDashboardTrendPoint>()
  const cursor = startOfDay(range.startDate)
  while (cursor <= range.endDate) {
    const key = dateKey(cursor)
    trendMap.set(key, {
      key,
      label: key,
      opening: 0,
      sales: 0,
      cashIn: 0,
      cashOut: 0,
      refunds: 0,
      closing: 0,
      net: 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const transaction of transactions) {
    const key = dateKey(transaction.createdAt)
    const point = trendMap.get(key)
    if (!point) continue

    const amount = toNumber(transaction.amount)
    if (transaction.type === "OPENING_BALANCE") point.opening += amount
    if (transaction.type === "SALE") point.sales += amount
    if (transaction.type === "CASH_IN") point.cashIn += amount
    if (cashOutTypes.includes(transaction.type as DrawerEventType)) point.cashOut += amount
    if (refundTypes.includes(transaction.type as DrawerEventType)) point.refunds += amount
    if (transaction.type === "CLOSING_BALANCE") point.closing += amount
  }

  const trend = Array.from(trendMap.values()).map((point) => ({
    ...point,
    net: point.opening + point.sales + point.cashIn - point.cashOut - point.refunds,
  }))

  const alerts: CashDrawerDashboardAlert[] = []
  if (highVarianceSessions.length > 0) {
    alerts.push({
      id: "high-variance",
      code: "HIGH_VARIANCE",
      severity: "critical",
      count: highVarianceSessions.length,
      amount: sumBy(highVarianceSessions, (session) => Math.abs(toNumber(session.variance))),
    })
  }
  if (mediumVarianceSessions.length > 0) {
    alerts.push({
      id: "medium-variance",
      code: "MEDIUM_VARIANCE",
      severity: "warning",
      count: mediumVarianceSessions.length,
      amount: sumBy(mediumVarianceSessions, (session) => Math.abs(toNumber(session.variance))),
    })
  }
  if (staleSessions.length > 0) {
    alerts.push({ id: "stale-session", code: "STALE_SESSION", severity: "warning", count: staleSessions.length })
  }
  if (openDrawersWithoutSession.length > 0) {
    alerts.push({
      id: "open-without-session",
      code: "OPEN_DRAWER_WITHOUT_SESSION",
      severity: "critical",
      count: openDrawersWithoutSession.length,
    })
  }
  if (alerts.length === 0) {
    alerts.push({ id: "ready", code: "READY", severity: "success", count: 0 })
  }

  return {
    generatedAt: new Date().toISOString(),
    organization,
    filters: {
      locationId: input.locationId ?? null,
      period: input.period,
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
    },
    thresholds: {
      mediumVariance: thresholds.medium,
      highVariance: thresholds.high,
    },
    locations,
    summary: {
      drawerCount: drawers.length,
      openDrawerCount: drawers.filter((drawer) => drawer.isOpen).length,
      closedDrawerCount: drawers.filter((drawer) => !drawer.isOpen).length,
      activeSessionCount: activeSessions.length,
      closedSessionCount: closedSessions.length,
      currentBalance,
      expectedBalance,
      liveVariance,
      openingFloat,
      cashSales,
      cashIn,
      cashOut,
      refunds,
      closingCounts,
      netMovement: openingFloat + cashSales + cashIn - cashOut - refunds,
      sessionVariance,
      transactionCount: transactions.length,
      saleCount: sumBy(sessions, (session) => session.transactionCount),
      totalSales: sumBy(sessions, (session) => toNumber(session.totalSales)),
      nonCashTenderTotal: sumBy(sessions, (session) =>
        toNumber(session.cardTotal) + toNumber(session.mobileMoneyTotal) + toNumber(session.bankTransferTotal) + toNumber(session.creditTotal),
      ),
      accuracyRate: closedSessions.length > 0 ? Math.round((exactClosedSessions / closedSessions.length) * 100) : 100,
      confidenceScore,
    },
    drawers: drawerRows,
    sessions: sessionRows,
    journal: journalRows,
    trend,
    alerts,
  }
}
