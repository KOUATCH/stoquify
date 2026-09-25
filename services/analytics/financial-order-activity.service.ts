import "server-only"
import { Prisma, type SalesOrderStatus } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { dailySalesPeriod } from "./daily-sales-period"
import { resolveOrganizationAnalyticalContext } from "./analytical-context-contracts"

const statuses: SalesOrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"]
type Scope = { organizationId: string; locationId: string; startDate: Date; endDate: Date }

/** Confirmed order activity, not posted revenue, collected cash or financial statements. */
export async function getFinancialOrderActivity(input: Scope) {
  if (!input.organizationId?.trim() || !input.locationId?.trim() || !(input.startDate instanceof Date) || !(input.endDate instanceof Date) || !Number.isFinite(input.startDate.getTime()) || !Number.isFinite(input.endDate.getTime()) || input.endDate < input.startDate) {
    throw new BusinessRuleError("Choose a valid organization, location and date range.")
  }
  return db.$transaction(async tx => {
    const organization = await tx.organization.findFirst({ where: { id: input.organizationId, isActive: true, deletedAt: null }, select: { id: true, currency: true, timezone: true } })
    if (!organization) throw new NotFoundError("Organization not found")
    const allLocations = ["all", "*"].includes(input.locationId.trim().toLowerCase())
    const locationId = allLocations ? null : input.locationId
    if (locationId && !await tx.location.findFirst({ where: { id: locationId, organizationId: organization.id }, select: { id: true } })) throw new NotFoundError("Report location not found")
    const first = dailySalesPeriod(input.startDate, organization.timezone), last = dailySalesPeriod(input.endDate, organization.timezone)
    const calendarDays = (last.calendarDate.getTime() - first.calendarDate.getTime()) / 86_400_000 + 1
    const previousDate = new Date(first.calendarDate.getTime() - calendarDays * 86_400_000).toISOString().slice(0, 10)
    const previousStart = dailySalesPeriod(previousDate, organization.timezone).start
    const resolved = resolveOrganizationAnalyticalContext({ organizationId: organization.id, currency: organization.currency, timezone: organization.timezone, generatedAt: new Date(), periodStart: first.start, periodEndExclusive: last.endExclusive, locationId })
    if (resolved.state !== "ready") throw new BusinessRuleError("The organization reporting context needs valid currency, timezone and scope.")
    const scope: Prisma.SalesOrderWhereInput = { organizationId: organization.id, ...(locationId ? { locationId } : {}), deletedAt: null, status: { in: statuses } }
    const aggregate = async (start: Date, endExclusive: Date) => {
      const result = await tx.salesOrder.aggregate({ where: { ...scope, orderDate: { gte: start, lt: endExclusive } }, _sum: { total: true }, _count: { _all: true } })
      const value = result._sum.total ?? (result._count._all === 0 ? new Prisma.Decimal(0) : null)
      if (!value?.isFinite()) throw new BusinessRuleError("Order value is unavailable for the selected period.")
      return { value: value.toFixed(2), count: result._count._all, periodStart: start.toISOString(), periodEndExclusive: endExclusive.toISOString() }
    }
    const [current, previous] = await Promise.all([aggregate(first.start, last.endExclusive), aggregate(previousStart, first.start)])
    const previousValue = new Prisma.Decimal(previous.value)
    return {
      context: resolved.context,
      source: "CONFIRMED_ORDER_TOTALS" as const,
      statuses,
      current,
      previous,
      valueGrowthPercent: previousValue.gt(0) ? new Prisma.Decimal(current.value).minus(previousValue).dividedBy(previousValue).times(100).toFixed(2) : null,
      comparison: "PRECEDING_EQUAL_CALENDAR_DAYS" as const,
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
