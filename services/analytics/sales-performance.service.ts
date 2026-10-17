import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { performanceScopeSchema, type PerformanceScope } from "@/lib/analytics/sales-performance-scope"
import { salesPerformancePeriod, shiftSalesDay } from "./sales-performance-period"

type Input = PerformanceScope & { organizationId: string; canReadCustomers: boolean }
type Bucket = { date: string; value: Prisma.Decimal; count: bigint }
function decimal(value: Prisma.Decimal.Value) {
  const amount = new Prisma.Decimal(value)
  if (!amount.isFinite()) throw new BusinessRuleError("The report contains an invalid amount.")
  return amount
}
export function performanceComparison(current: string | null, previous: string | null) {
  if (current === null || previous === null) return { absolute: null, percent: null }
  const delta = decimal(current).minus(previous)
  return { absolute: delta.toFixed(2), percent: decimal(previous).gt(0) ? delta.div(previous).times(100).toFixed(2) : null }
}
function total(buckets: Bucket[]) {
  const value = buckets.reduce((sum, row) => sum.plus(decimal(row.value)), new Prisma.Decimal(0))
  const count = buckets.reduce((sum, row) => sum + BigInt(row.count), BigInt(0))
  return { value: value.toFixed(2), count: count.toString(), average: count > BigInt(0) ? value.div(count.toString()).toFixed(2) : null }
}

export async function getSalesPerformance(input: Input) {
  const { canReadCustomers, ...raw } = input
  const scope = performanceScopeSchema.parse(raw)
  const pageSize = Number(scope.pageSize ?? 25)
  return db.$transaction(async tx => {
    const organization = await tx.organization.findFirst({ where: { id: input.organizationId, isActive: true, deletedAt: null }, select: { id: true, currency: true, timezone: true } })
    if (!organization) throw new NotFoundError("Organization not found")
    if (!/^[A-Z]{3}$/.test(organization.currency)) throw new BusinessRuleError("A valid report currency is required.")
    const locations = await tx.location.findMany({ where: { organizationId: organization.id }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } })
    if (scope.locationId && !locations.some(location => location.id === scope.locationId)) throw new NotFoundError("Report location not found")
    const now = new Date(), period = salesPerformancePeriod(scope, organization.timezone, now)
    const statuses = scope.status ? [scope.status] : ["COMPLETED", "DELIVERED"]
    const aggregate = (start: Date, end: Date) => tx.$queryRaw<Bucket[]>(Prisma.sql`
      SELECT to_char(("orderDate" AT TIME ZONE 'UTC') AT TIME ZONE ${organization.timezone}, 'YYYY-MM-DD') AS date,
        SUM(total) AS value, COUNT(*) AS count
      FROM sales_orders WHERE "organizationId" = ${organization.id} AND "deletedAt" IS NULL
        AND status::text IN (${Prisma.join(statuses)})
        AND "orderDate" >= (${start.toISOString()}::timestamptz AT TIME ZONE 'UTC')
        AND "orderDate" < (${end.toISOString()}::timestamptz AT TIME ZONE 'UTC')
        ${scope.locationId ? Prisma.sql`AND "locationId" = ${scope.locationId}` : Prisma.empty}
        ${scope.channel ? Prisma.sql`AND channel::text = ${scope.channel}` : Prisma.empty}
      GROUP BY 1 ORDER BY 1`)
    const currentBuckets = await aggregate(period.startAt, period.endAt)
    const previousBuckets = period.previousEndAt ? await aggregate(period.previousStartAt, period.previousEndAt) : null
    const current = total(currentBuckets), previous = previousBuckets ? total(previousBuckets) : null
    const where: Prisma.SalesOrderWhereInput = { organizationId: organization.id, deletedAt: null, status: { in: statuses as Array<"COMPLETED" | "DELIVERED"> }, orderDate: { gte: period.startAt, lt: period.endAt },
      ...(scope.locationId ? { locationId: scope.locationId } : {}), ...(scope.channel ? { channel: scope.channel } : {}),
      ...(scope.search ? { OR: [{ orderNumber: { contains: scope.search, mode: "insensitive" } }, ...(canReadCustomers ? [{ customer: { organizationId: organization.id, name: { contains: scope.search, mode: "insensitive" as const } } }] : [])] } : {}),
    }
    let after: Prisma.SalesOrderWhereInput = {}
    if (scope.cursor) {
      const cursor = await tx.salesOrder.findFirst({ where: { AND: [where, { id: scope.cursor }] }, select: { id: true, orderDate: true } })
      if (!cursor) throw new BusinessRuleError("The record page changed. Return to the first page.")
      after = { OR: [{ orderDate: { lt: cursor.orderDate } }, { orderDate: cursor.orderDate, id: { lt: cursor.id } }] }
    }
    const records = await tx.salesOrder.findMany({ where: { AND: [where, after] }, orderBy: [{ orderDate: "desc" }, { id: "desc" }], take: pageSize + 1,
      select: { id: true, orderNumber: true, orderDate: true, total: true, status: true, channel: true, paymentStatus: true,
        ...(canReadCustomers ? { customerId: true } : {}) },
    })
    const customers = canReadCustomers && records.length ? await tx.customer.findMany({ where: { organizationId: organization.id, id: { in: records.slice(0, pageSize).map(order => order.customerId) } }, select: { id: true, name: true } }) : []
    return { currency: organization.currency, timezone: organization.timezone, checkedAt: now.toISOString(), locations,
      scope: { ...scope, organizationId: organization.id, start: period.start, end: period.end }, canReadCustomers,
      period: { start: period.startAt.toISOString(), endExclusive: period.endAt.toISOString(), partial: period.partial, previousStart: period.previousStartAt.toISOString(), previousEndExclusive: period.previousEndAt?.toISOString() ?? null },
      current, previous, changes: { value: performanceComparison(current.value, previous?.value ?? null), count: performanceComparison(current.count, previous?.count ?? null), average: performanceComparison(current.average, previous?.average ?? null) },
      trend: Array.from({ length: period.days }, (_, index) => { const date = shiftSalesDay(period.start, index), bucket = currentBuckets.find(row => row.date === date); return { date, value: bucket ? decimal(bucket.value).toFixed(2) : "0.00", count: bucket ? bucket.count.toString() : "0" } }),
      records: records.slice(0, pageSize).map(order => ({ id: order.id, number: order.orderNumber, date: order.orderDate.toISOString(), value: decimal(order.total).toFixed(2), status: order.status, channel: order.channel, paymentStatus: order.paymentStatus,
        customer: customers.find(customer => customer.id === order.customerId)?.name ?? null })),
      nextCursor: records.length > pageSize ? records[pageSize - 1].id : null,
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export type SalesPerformance = Awaited<ReturnType<typeof getSalesPerformance>>

export async function getSalesPerformanceOrder(input: { organizationId: string; orderId: string; canReadCustomers: boolean }) {
  return db.$transaction(async tx => {
    const organization = await tx.organization.findFirst({ where: { id: input.organizationId, isActive: true, deletedAt: null }, select: { id: true, currency: true, timezone: true } })
    if (!organization) throw new NotFoundError("Organization not found")
    const order = await tx.salesOrder.findFirst({ where: { id: input.orderId, organizationId: organization.id, deletedAt: null, status: { in: ["COMPLETED", "DELIVERED"] } },
      select: { orderNumber: true, orderDate: true, status: true, channel: true, paymentStatus: true, subtotal: true, discount: true, taxAmount: true, shippingCost: true, total: true,
        ...(input.canReadCustomers ? { customerId: true } : {}) },
    })
    if (!order) throw new NotFoundError("Sales record not found")
    const customer = input.canReadCustomers ? await tx.customer.findFirst({ where: { id: order.customerId, organizationId: organization.id }, select: { name: true } }) : null
    return { number: order.orderNumber, date: order.orderDate.toISOString(), status: order.status, channel: order.channel, paymentStatus: order.paymentStatus,
      customer: customer?.name ?? null,
      currency: organization.currency, timezone: organization.timezone,
      amounts: { subtotal: decimal(order.subtotal).toFixed(2), discount: decimal(order.discount).toFixed(2), tax: decimal(order.taxAmount).toFixed(2), shipping: decimal(order.shippingCost).toFixed(2), total: decimal(order.total).toFixed(2) } }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
