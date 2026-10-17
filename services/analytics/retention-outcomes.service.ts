import "server-only"

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { assertCanUseOrganization, requireAllPermissions, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { projectRetentionOutcomes, validateOutcomeWindow, type OutcomeWindow } from "./retention-outcomes"

export const RETENTION_SOURCE_LIMIT = 1000
export const retentionCommitSelect = {
  id: true, organizationId: true, locationId: true, salesOrderId: true,
  status: true, committedAt: true, createdAt: true,
} satisfies Prisma.POSCommitResultSelect
export const retentionCorrectionSelect = {
  id: true, organizationId: true, locationId: true, sourceId: true, sourceType: true,
  eventType: true, eventSource: true, schemaVersion: true, status: true, occurredAt: true, recordedAt: true,
} satisfies Prisma.BusinessEventSelect

/** Server-only report entry point. Authorization cannot be supplied by a caller.
 * No endpoint/dashboard is added. Reads have no write-side instrumentation or backfill. */
export async function getRetentionOutcomeReadModel(input: { organizationId?: string; locationId?: string; start: Date; endExclusive: Date }) {
  const ctx = await requireAllPermissions(["reports.read", "sales.read"], { resource: "RetentionOutcomes" })
  const organizationId = input.organizationId ?? ctx.orgId
  await assertCanUseOrganization(ctx, organizationId)
  const decision = await observeModuleAccess({
    organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions,
    moduleSlug: "sales", surfaceType: "report", accessIntent: "read", mode: "enforce",
    surface: "services/analytics/retention-outcomes.service.ts#getRetentionOutcomeReadModel",
  })
  if (!decision.allowed) throw new RbacError("Forbidden: sales module is not available", "FORBIDDEN", 403)
  const scope: OutcomeWindow = { ...input, organizationId: ctx.orgId, asOf: new Date() }
  try { validateOutcomeWindow(scope) } catch { throw new BusinessRuleError("Choose an elapsed outcome window of at most 31 days.") }
  return db.$transaction(async tx => {
    if (!await tx.organization.findFirst({ where: { id: ctx.orgId, isActive: true, deletedAt: null }, select: { id: true } })) {
      throw new NotFoundError("Organization not found")
    }
    if (scope.locationId && !await tx.location.findFirst({ where: { id: scope.locationId, organizationId: ctx.orgId }, select: { id: true } })) {
      throw new NotFoundError("Report location not found")
    }
    const location = scope.locationId ? { locationId: scope.locationId } : {}
    const period = { gte: scope.start, lt: scope.endExclusive }
    const commits = await tx.pOSCommitResult.findMany({
      where: { organizationId: ctx.orgId, ...location, createdAt: { lte: scope.asOf },
        OR: [{ committedAt: period }, { committedAt: null, createdAt: period }] },
      select: retentionCommitSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: RETENTION_SOURCE_LIMIT + 1,
    })
    const corrections = await tx.businessEvent.findMany({
      where: { organizationId: ctx.orgId, ...location, eventSource: "POS",
        eventType: { in: ["pos.refund.issued", "pos.sale.voided"] },
        occurredAt: period, recordedAt: { lte: scope.asOf } },
      select: retentionCorrectionSelect, orderBy: [{ occurredAt: "asc" }, { id: "asc" }], take: RETENTION_SOURCE_LIMIT + 1,
    })
    if (commits.length > RETENTION_SOURCE_LIMIT || corrections.length > RETENTION_SOURCE_LIMIT) {
      throw new BusinessRuleError("Choose a narrower outcome window; the source limit was exceeded.")
    }
    return projectRetentionOutcomes(scope, commits, corrections)
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
