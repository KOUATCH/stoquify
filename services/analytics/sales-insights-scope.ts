import "server-only"
import { Prisma } from "@prisma/client"
import { performanceScopeSchema, type PerformanceScope } from "@/lib/analytics/sales-performance-scope"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { salesPerformancePeriod } from "./sales-performance-period"

export type SalesInsightsInput = PerformanceScope & { organizationId: string }
export async function salesInsightsScope(tx: Prisma.TransactionClient, input: SalesInsightsInput) {
  const scope = performanceScopeSchema.parse(input)
  const organization = await tx.organization.findFirst({ where: { id: input.organizationId, isActive: true, deletedAt: null }, select: { id: true, currency: true, timezone: true } })
  if (!organization) throw new NotFoundError("Organization not found")
  if (!/^[A-Z]{3}$/.test(organization.currency)) throw new BusinessRuleError("A valid report currency is required.")
  const locations = await tx.location.findMany({ where: { organizationId: organization.id }, select: { id: true, name: true } })
  if (scope.locationId && !locations.some(row => row.id === scope.locationId)) throw new NotFoundError("Report location not found")
  const now = new Date()
  return { scope, organization, locations, now, period: salesPerformancePeriod(scope, organization.timezone, now) }
}
