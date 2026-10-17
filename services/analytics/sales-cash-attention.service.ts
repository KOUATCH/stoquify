import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { salesInsightsScope, type SalesInsightsInput } from "./sales-insights-scope"
import { reportDecimal } from "./completed-sales-evidence"

/** Saved daily cash evidence, independent of order status/channel and record search. */
export async function getSalesCashAttention(input: SalesInsightsInput) {
  return db.$transaction(async tx => {
    const { scope, organization, locations, now, period } = await salesInsightsScope(tx, input)
    const locationIds = scope.locationId ? [scope.locationId] : locations.map(row => row.id)
    const reports = await tx.dailySalesReport.findMany({
      where: { organizationId: organization.id, locationId: { in: locationIds }, date: { gte: new Date(period.start + "T00:00:00Z"), lte: new Date(period.end + "T00:00:00Z") } },
      select: { id: true, date: true, locationId: true, variance: true, reportGeneratedAt: true, isFinalized: true },
      orderBy: [{ date: "desc" }, { locationId: "asc" }, { id: "asc" }], take: 1001,
    })
    if (reports.length > 1000) throw new BusinessRuleError("Cash report evidence exceeds the bounded dashboard scope")
    return { currency: organization.currency, timezone: organization.timezone, checkedAt: now.toISOString(), start: period.start, end: period.end,
      expectedDays: period.days * locationIds.length, coveredDays: reports.length,
      findings: reports.filter(row => !reportDecimal(row.variance).isZero()).map(row => ({ id: row.id, date: row.date.toISOString().slice(0, 10), locationId: row.locationId,
        location: locations.find(location => location.id === row.locationId)?.name ?? row.locationId,
        amount: reportDecimal(row.variance).toFixed(2), recordedAt: row.reportGeneratedAt.toISOString(), finalized: row.isFinalized })),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export type SalesCashAttention = Awaited<ReturnType<typeof getSalesCashAttention>>
