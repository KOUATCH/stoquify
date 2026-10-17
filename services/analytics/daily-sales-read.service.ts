import "server-only"
import { Prisma, type SalesOrderStatus } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { resolveOrganizationAnalyticalContext, type OrganizationAnalyticalContext } from "./analytical-context-contracts"
import { dailySalesPeriod } from "./daily-sales-period"

export type DailySalesReadInput = { organizationId: string; locationId?: string; date?: string | Date }
type DailyItem = { itemId: string; nameEn: string | null; nameFr: string | null; sku: string | null; quantity: string; value: string }
export type DailySalesReadModel = {
  context: OrganizationAnalyticalContext
  date: string
  locations: Array<{ id: string; name: string; retained: boolean }>
  locationId: string | null
  source: { kind: "NO_LOCATIONS" | "STORED_REPORT" | "ORDER_AGGREGATION"; recordId: string | null; recordedAt: string | null; finalized: boolean | null }
  metrics: { value: string; count: number; quantity: string; average: string | null } | null
  recordedCash: { opening: string; closing: string; cashIn: string; cashOut: string; variance: string } | null
  recordedPayments: { cash: string; card: string; mobileMoney: string; bankTransfer: string; credit: string } | null
  topItems: DailyItem[]
}
const statuses: SalesOrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"]
function amount(value: Prisma.Decimal | null, scale: number, count = 1): string {
  if (count === 0 && value === null) return new Prisma.Decimal(0).toFixed(scale)
  if (!value?.isFinite()) throw new BusinessRuleError("The daily report contains an unavailable amount.")
  return value.toFixed(scale)
}

/** At most 366 saved dates and one order lookup; no report generation or writes.
 * Saved reports own their day, including saved zero-transaction reports. */
export async function getLatestDailySalesDay(input: { organizationId: string; locationId: string }) {
  return db.$transaction(async tx => {
    const organization = await tx.organization.findFirst({ where: { id: input.organizationId, isActive: true, deletedAt: null }, select: { id: true, timezone: true } })
    if (!organization) throw new NotFoundError("Organization not found")
    const location = await tx.location.findFirst({ where: { id: input.locationId, organizationId: organization.id }, select: { id: true } })
    if (!location) throw new NotFoundError("Report location not found")
    const today = dailySalesPeriod(undefined, organization.timezone)
    const fromDate = new Date(today.calendarDate.getTime() - 365 * 86_400_000).toISOString().slice(0, 10)
    const from = dailySalesPeriod(fromDate, organization.timezone)
    const reports = await tx.dailySalesReport.findMany({
      where: { organizationId: organization.id, locationId: location.id, date: { gte: from.calendarDate, lte: today.calendarDate } },
      select: { date: true, totalTransactions: true }, orderBy: { date: "desc" }, take: 366,
    })
    const savedDays = reports.map(report => dailySalesPeriod(report.date.toISOString().slice(0, 10), organization.timezone))
    const order = await tx.salesOrder.findFirst({
      where: { organizationId: organization.id, locationId: location.id, deletedAt: null, status: { in: statuses },
        orderDate: { gte: from.start, lt: today.endExclusive },
        ...(savedDays.length ? { NOT: { OR: savedDays.map(day => ({ orderDate: { gte: day.start, lt: day.endExclusive } })) } } : {}),
      }, select: { orderDate: true }, orderBy: [{ orderDate: "desc" }, { id: "desc" }],
    })
    const saved = reports.find(report => report.totalTransactions > 0)?.date.toISOString().slice(0, 10)
    const live = order ? dailySalesPeriod(order.orderDate, organization.timezone).date : undefined
    return { date: [saved, live].filter((value): value is string => Boolean(value)).sort().at(-1) ?? null, from: fromDate, through: today.date, locationId: location.id }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function getDailySalesReadModel(input: DailySalesReadInput): Promise<DailySalesReadModel> {
  return db.$transaction(async tx => {
    const organization = await tx.organization.findFirst({ where: { id: input.organizationId, isActive: true, deletedAt: null }, select: { id: true, currency: true, timezone: true } })
    if (!organization) throw new NotFoundError("Organization not found")
    const generatedAt = new Date(), period = dailySalesPeriod(input.date, organization.timezone, generatedAt)
    const locations = await tx.location.findMany({ where: { organizationId: organization.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }, { id: "asc" }], select: { id: true, name: true, isActive: true, deletedAt: true } })
    if (input.locationId !== undefined && !locations.some(location => location.id === input.locationId)) throw new NotFoundError("Report location not found")
    const locationId = input.locationId ?? locations.find(location => location.isActive && !location.deletedAt)?.id ?? locations[0]?.id ?? null
    const resolved = resolveOrganizationAnalyticalContext({ organizationId: organization.id, currency: organization.currency, timezone: organization.timezone, generatedAt, periodStart: period.start, periodEndExclusive: period.endExclusive, locationId })
    if (resolved.state !== "ready") throw new BusinessRuleError("The organization reporting context needs valid currency, timezone and scope.")
    const base: DailySalesReadModel = {
      context: resolved.context, date: period.date, locations: locations.map(location => ({ id: location.id, name: location.name, retained: !location.isActive || Boolean(location.deletedAt) })), locationId,
      source: { kind: "NO_LOCATIONS", recordId: null, recordedAt: null, finalized: null }, metrics: null, recordedCash: null, recordedPayments: null, topItems: [],
    }
    if (!locationId) return base
    const report = await tx.dailySalesReport.findFirst({ where: { organizationId: organization.id, locationId, date: period.calendarDate }, include: { itemSales: { orderBy: [{ totalRevenue: "desc" }, { id: "asc" }], take: 5 } } })
    if (report) return {
      ...base, source: { kind: "STORED_REPORT", recordId: report.id, recordedAt: report.reportGeneratedAt.toISOString(), finalized: report.isFinalized },
      metrics: { value: amount(report.totalRevenue, 2), count: report.totalTransactions, quantity: amount(report.totalQuantitySold, 3), average: amount(report.averageTransactionValue, 2) },
      recordedCash: { opening: amount(report.openingBalance, 2), closing: amount(report.closingBalance, 2), cashIn: amount(report.cashIn, 2), cashOut: amount(report.cashOut, 2), variance: amount(report.variance, 2) },
      recordedPayments: { cash: amount(report.cashSales, 2), card: amount(report.cardSales, 2), mobileMoney: amount(report.mobileMoneySales, 2), bankTransfer: amount(report.bankTransferSales, 2), credit: amount(report.creditSales, 2) },
      topItems: report.itemSales.map(item => ({ itemId: item.itemId, nameEn: item.itemNameEn, nameFr: item.itemNameFr, sku: item.itemSku, quantity: amount(item.quantitySold, 3), value: amount(item.totalRevenue, 2) })),
    }
    const where: Prisma.SalesOrderWhereInput = { organizationId: organization.id, locationId, deletedAt: null, status: { in: statuses }, orderDate: { gte: period.start, lt: period.endExclusive } }
    const lineWhere: Prisma.SalesOrderLineWhereInput = { salesOrder: where }
    const [orders, lines, groups] = await Promise.all([
      tx.salesOrder.aggregate({ where, _sum: { total: true }, _count: { _all: true } }),
      tx.salesOrderLine.aggregate({ where: lineWhere, _sum: { quantity: true }, _count: { _all: true } }),
      tx.salesOrderLine.groupBy({ by: ["itemId"], where: lineWhere, _sum: { quantity: true, lineTotal: true }, orderBy: [{ _sum: { lineTotal: "desc" } }, { itemId: "asc" }], take: 5 }),
    ])
    const items = await tx.item.findMany({ where: { organizationId: organization.id, id: { in: groups.map(group => group.itemId) } }, select: { id: true, nameEn: true, nameFr: true, sku: true } })
    return { ...base, source: { kind: "ORDER_AGGREGATION", recordId: null, recordedAt: null, finalized: null },
      metrics: { value: amount(orders._sum.total, 2, orders._count._all), count: orders._count._all, quantity: amount(lines._sum.quantity, 3, lines._count._all), average: orders._count._all ? new Prisma.Decimal(amount(orders._sum.total, 2)).dividedBy(orders._count._all).toFixed(2) : null },
      topItems: groups.map(group => { const item = items.find(value => value.id === group.itemId); return { itemId: group.itemId, nameEn: item?.nameEn ?? null, nameFr: item?.nameFr ?? null, sku: item?.sku ?? null, quantity: amount(group._sum.quantity, 3), value: amount(group._sum.lineTotal, 2) } }),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
