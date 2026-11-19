import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleEntitlement, getManagedModuleState } from "@/services/modules/module-entitlement.service"

export function accountantScopeKeys(clientId: string, userId: string) {
  return [`${clientId}:${userId}`, `managed:${clientId}:${userId}`]
}

type Input = {
  homeOrganizationId: string; clientOrganizationId: string; accountantUserId: string
  grantId: string; activeScopeKey: string | null; capability: "READ" | "REVIEW" | "EXPORT"
  permission?: string; now?: Date
}
type Client = typeof db | Prisma.TransactionClient

/** No flag fallback: a failed link/authority lookup propagates as a denial/error.
 * A write caller must already hold the exact mandate row before locking below. */
export async function assertManagedAccountantAccess(input: Input, client: Client = db, lock = false) {
  const link = await client.firmEngagementGrantLink.findUnique({ where: { grantId: input.grantId } })
  if (!link) {
    if (input.activeScopeKey?.startsWith("managed:")) throw new ForbiddenError("Managed mandate linkage is unavailable.")
    return
  }
  if (link.firmOrganizationId !== input.homeOrganizationId || link.clientOrganizationId !== input.clientOrganizationId || link.accountantUserId !== input.accountantUserId) throw new ForbiddenError()
  if (lock) {
    await client.$queryRaw(Prisma.sql`SELECT id FROM firm_engagements WHERE id=${link.engagementId} FOR SHARE`)
    await client.$queryRaw(Prisma.sql`SELECT id FROM firm_engagement_assignments WHERE "engagementId"=${link.engagementId}
      AND "accountantUserId"=${input.accountantUserId} ORDER BY id FOR SHARE`)
  }
  const [engagement, assignments, actor, target] = await Promise.all([
    client.firmEngagement.findUnique({ where: { id: link.engagementId } }),
    client.firmEngagementAssignment.findMany({ where: { engagementId: link.engagementId, accountantUserId: input.accountantUserId, endedAt: null }, take: 2 }),
    client.user.findFirst({ where: { id: input.accountantUserId, organizationId: input.homeOrganizationId }, include: { roles: true, organization: true } }),
    client.organization.findUnique({ where: { id: input.clientOrganizationId } }),
  ])
  const now = input.now ?? new Date(), assignment = assignments.length === 1 ? assignments[0] : null
  if (!Number.isFinite(now.getTime()) || !actor || !isUsableAccount(actor, now) || !actor.organization.isActive || actor.organization.deletedAt ||
      !target?.isActive || target.deletedAt || !engagement || engagement.status !== "ACTIVE" ||
      engagement.firmOrganizationId !== input.homeOrganizationId || engagement.clientOrganizationId !== input.clientOrganizationId ||
      engagement.effectiveFrom > now || engagement.expiresAt <= now || !assignment ||
      assignment.firmOrganizationId !== input.homeOrganizationId || assignment.clientOrganizationId !== input.clientOrganizationId ||
      assignment.effectiveFrom > now || assignment.expiresAt <= now ||
      (input.capability !== "READ" && (engagement.scope === "READ_ONLY" || assignment.scope === "READ_ONLY"))) throw new ForbiddenError("Current firm engagement and assignment are required.")
  const permissions = expandPermissions(actor.roles.filter(r => r.organizationId === input.homeOrganizationId).flatMap(r => r.permissions))
  const required = input.permission ?? (input.capability === "EXPORT" ? "accounting.exports.create" : input.capability === "REVIEW" ? "accounting.close.accountant.review" : "accounting.audit.read")
  if (!hasRbacPermission(permissions, required)) throw new ForbiddenError("Current action permission is required.")
  for (const [organization, moduleSlug, accessIntent] of [
    [actor.organization, "accounting", "read"], [target, "close_assurance", input.capability === "EXPORT" ? "export" : "read"],
  ] as const) {
    const managed = await getManagedModuleState(organization.id, client)
    if (!evaluateModuleEntitlement({ organizationId: organization.id, userId: actor.id, actorPermissions: permissions,
      moduleSlug, accessIntent, surfaceType: "action", surface: "firm-engagement-access", mode: "enforce",
      requestedModules: organization.requestedModules, explicitEntitlements: managed.explicitEntitlements, now }).allowed) throw new ForbiddenError("Current module access is required.")
  }
}
