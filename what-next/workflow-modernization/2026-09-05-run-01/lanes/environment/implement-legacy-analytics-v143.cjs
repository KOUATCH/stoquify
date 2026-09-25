const fs=require('fs'),file='services/analytics/sales-analytics.service.ts';let s=fs.readFileSync(file,'utf8');
s=s.replace('import { db } from "@/prisma/db"','import { db } from "@/prisma/db"\nimport { Prisma } from "@prisma/client"\nimport { completedReportScope, completedReportSales, reportDecimal } from "./completed-sales-evidence"\nimport { classifyReportCashMovement, reportCashMovements, reportCashSessions, reportSessionCount, type CashCountStatus } from "./cash-report-evidence"\nimport { getCashierPerformanceReportReadModel, getItemPerformanceReportReadModel, buildReportProvenance, type ReportProvenance } from "./financial-reports.service"');
s=s.replace('  expectedBalance: number\n','  expectedBalance: number | null\n').replace('  totalCashIn: number\n  totalCashOut: number\n','  totalCashIn: number | null\n  totalCashOut: number | null\n  countStatus: CashCountStatus\n  provenance: ReportProvenance\n').replace('  averagePrice: number\n  profitMargin: number\n','  averagePrice: number | null\n  profitMargin: number | null\n  provenance: ReportProvenance\n').replace('  averageTransaction: number\n  sessionsCount:', '  averageTransaction: number | null\n  sessionsCount:').replace('  averageVariance: number\n  performanceScore: number\n','  averageVariance: number | null\n  performanceScore: null\n  recordedCountSessions: number\n  openCountSessions: number\n  inconsistentCountSessions: number\n  provenance: ReportProvenance\n');
// Preserve safe action error handling and canonical exported action names.
function replaceFunction(name,next,body){const a=s.indexOf('export async function '+name+'('),b=s.indexOf('export async function '+next+'(',a);if(a<0||b<0)throw Error(name);s=s.slice(0,a)+body+'\n\n'+s.slice(b)}
replaceFunction('getSalesAnalyticsReadModel','getCashReconciliationReportsReadModel',`export async function getSalesAnalyticsReadModel(input: SalesAnalyticsReadModelInput): Promise<SalesAnalytics> {
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
}`);
replaceFunction('getCashReconciliationReportsReadModel','getProductPerformanceReadModel',`export async function getCashReconciliationReportsReadModel(input: SalesAnalyticsReadModelInput): Promise<CashReconciliationReport[]> {
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
}`);
replaceFunction('getProductPerformanceReadModel','getUserPerformanceReadModel',`export async function getProductPerformanceReadModel(input: SalesAnalyticsReadModelInput): Promise<ProductPerformance[]> {
  try {
    const rows = await getItemPerformanceReportReadModel(input)
    return rows.map(row => ({ itemId: row.itemId, itemName: row.itemName, itemSku: row.itemSku, category: row.category, quantitySold: row.quantitySold, totalRevenue: row.totalRevenue,
      averagePrice: row.quantitySold > 0 ? row.averageSellingPrice : null, profitMargin: row.profitMargin, currentStock: row.currentStock, stockStatus: row.stockStatus, provenance: row.provenance }))
  } catch (error) {
    throwSafeAnalyticsError("getProductPerformance", error, "Failed to get product performance")
  }
}`);
replaceFunction('getUserPerformanceReadModel','getDashboardSummaryReadModel',`export async function getUserPerformanceReadModel(input: SalesAnalyticsReadModelInput): Promise<UserPerformance[]> {
  try {
    const rows = await getCashierPerformanceReportReadModel(input)
    return rows.map(row => ({ userId: row.cashierId, userName: row.cashierName, totalSales: row.totalSales, totalTransactions: row.totalTransactions, averageTransaction: row.averageTransactionValue, sessionsCount: row.sessionsWorked,
      totalHours: row.elapsedShiftHours, averageVariance: row.absoluteVariance !== null && row.recordedCountSessions > 0 ? row.absoluteVariance / row.recordedCountSessions : null, performanceScore: null,
      recordedCountSessions: row.recordedCountSessions, openCountSessions: row.openCountSessions, inconsistentCountSessions: row.inconsistentCountSessions, provenance: row.provenance })).sort((a, b) => b.totalSales - a.totalSales)
  } catch (error) {
    throwSafeAnalyticsError("getUserPerformance", error, "Failed to get user performance")
  }
}`);
s=s.replace('    const yesterday = subDays(today, 1)','    await db.$transaction(tx => completedReportScope(tx, { ...input, startDate: today, endDate: today }))\n    const yesterday = subDays(today, 1)');
s=s.replace('const activeSessions = await db.pOSSession.count({\n      where: {\n        locationId,','const activeSessions = await db.pOSSession.count({\n      where: {\n        organizationId,\n        locationId,');
// Legacy numeric helper was only used by replaced readers.
if((s.match(/toNumber\(/g)||[]).length===0)throw Error('unexpected source');
const start=s.indexOf('const toNumber = (value: unknown)'),end=s.indexOf('const displayName =',start);if(start>=0)s=s.slice(0,start)+s.slice(end);
fs.writeFileSync(file,s);
