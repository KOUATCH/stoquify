import "server-only"

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { completedReportScope, reportDecimal } from "./completed-sales-evidence"
import { dailySalesPeriod } from "./daily-sales-period"

/** Sunday remains the existing week convention. Boundaries use the tenant calendar. */
export function businessPulsePeriods(now: Date, timezone: string) {
  const today = dailySalesPeriod(now, timezone), day = today.calendarDate
  const localBoundary = (date: Date) => dailySalesPeriod(date.toISOString().slice(0, 10), timezone).start
  return { today: today.start, endExclusive: today.endExclusive,
    yesterday: localBoundary(new Date(day.getTime() - 86400000)),
    week: localBoundary(new Date(day.getTime() - day.getUTCDay() * 86400000)),
    month: localBoundary(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1))) }
}

export async function readBusinessPulseSnapshot(input: { organizationId: string; locationId?: string | null }, now = new Date()) {
  return db.$transaction(async tx => {
    // Validate even when no active site exists; missing organization is not a valid empty report.
    const initial = await completedReportScope(tx, { organizationId: input.organizationId, startDate: now, endDate: now })
    const locationId = input.locationId ?? (await tx.location.findFirst({ where: { organizationId: input.organizationId, isActive: true, deletedAt: null }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], select: { id: true } }))?.id ?? null
    const scope = locationId ? await completedReportScope(tx, { organizationId: input.organizationId, locationId, startDate: now, endDate: now }) : initial
    const periods = businessPulsePeriods(now, scope.timezone)
    const context = { organizationId: scope.organizationId, locationId, currency: scope.currency, timezone: scope.timezone, generatedAt: now.toISOString(), periodStart: periods.today.toISOString(), periodEnd: new Date(periods.endExclusive.getTime() - 1).toISOString() }
    if (!locationId) return { context, summary: null }
    // This is an operating pulse. Historical access remains available in the dated reports.
    if (scope.locationId && !await tx.location.findFirst({ where: { id: scope.locationId, organizationId: scope.organizationId, isActive: true, deletedAt: null }, select: { id: true } })) return { context, summary: null }
    const first = new Date(Math.min(periods.yesterday.getTime(), periods.week.getTime(), periods.month.getTime()))
    const location = scope.locationId ? { locationId: scope.locationId } : {}
    const sales = await tx.salesOrder.findMany({
      where: { organizationId: scope.organizationId, ...location, deletedAt: null, status: { in: ["COMPLETED", "DELIVERED"] }, orderDate: { gte: first, lt: periods.endExclusive } },
      select: { id: true, orderDate: true, total: true, lines: { select: { itemId: true, quantity: true, lineTotal: true, item: { select: { nameEn: true, sku: true } } } } },
    })
    const zero = new Prisma.Decimal(0)
    const period = (start: Date, end = periods.endExclusive) => {
      const rows = sales.filter(sale => sale.orderDate >= start && sale.orderDate < end)
      const amount = rows.reduce((sum, sale) => sum.plus(reportDecimal(sale.total)), zero)
      return { amount, sales: amount.toNumber(), transactions: rows.length, averageTransaction: rows.length ? amount.div(rows.length).toNumber() : 0 }
    }
    const today = period(periods.today), yesterday = period(periods.yesterday, periods.today), week = period(periods.week), month = period(periods.month)
    const items = new Map<string, { name: string; sku: string; quantity: Prisma.Decimal; revenue: Prisma.Decimal }>()
    for (const sale of sales.filter(sale => sale.orderDate >= periods.today)) for (const line of sale.lines) {
      const item = items.get(line.itemId) ?? { name: line.item.nameEn, sku: line.item.sku, quantity: zero, revenue: zero }
      item.quantity = item.quantity.plus(reportDecimal(line.quantity)); item.revenue = item.revenue.plus(reportDecimal(line.lineTotal)); items.set(line.itemId, item)
    }
    const activeSessions = await tx.pOSSession.count({ where: { organizationId: scope.organizationId, ...location, status: "ACTIVE" } })
    // Compare each site's available stock with its own policy; reservations cannot be sold again.
    // Count an item once across sites. Missing levels are unknown, not zero stock.
    const trackedItems = { organizationId: scope.organizationId, isActive: true, deletedAt: null, trackInventory: true }
    const activeItems = await tx.item.count({ where: trackedItems })
    const stock = await tx.inventoryLevel.findMany({
      where: { ...location, item: trackedItems, location: { organizationId: scope.organizationId, isActive: true, deletedAt: null } },
      select: { itemId: true, quantityAvailable: true, reorderPoint: true },
    })
    const lowStockItems = new Set(stock.filter(level => reportDecimal(level.quantityAvailable).lte(reportDecimal(level.reorderPoint))).map(level => level.itemId)).size
    const itemsWithRecords = new Set(stock.map(level => level.itemId)).size
    const stockCoverage = { activeItems, itemsWithRecords, itemsWithoutRecords: activeItems - itemsWithRecords }
    return { context, summary: {
      today: { sales: today.sales, transactions: today.transactions, averageTransaction: today.averageTransaction, salesChange: today.amount.minus(yesterday.amount).toNumber(), transactionsChange: today.transactions - yesterday.transactions },
      week: { sales: week.sales, transactions: week.transactions, averageTransaction: week.averageTransaction },
      month: { sales: month.sales, transactions: month.transactions, averageTransaction: month.averageTransaction },
      activeSessions, lowStockItems, stockCoverage,
      topSellingItems: [...items].map(([itemId, item]) => ({ itemId, itemName: item.name, itemSku: item.sku, quantitySold: item.quantity.toNumber(), totalRevenue: item.revenue.toNumber() })).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5),
    } }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export type BusinessPulseSnapshot = Awaited<ReturnType<typeof readBusinessPulseSnapshot>>
