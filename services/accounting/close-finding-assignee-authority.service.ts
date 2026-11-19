import "server-only"

import { Prisma, type AccountantAccessGrant, type Organization, type Role, type User } from "@prisma/client"

import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { evaluateModuleEntitlement, getManagedModuleState } from "@/services/modules/module-entitlement.service"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { accountantScopeKeys, assertManagedAccountantAccess } from "./managed-accountant-access.service"

type AssigneeOrganization = Pick<Organization, "id" | "isActive" | "deletedAt" | "requestedModules">
type AssigneeAccount = Pick<User, "id" | "organizationId" | "isActive" | "isVerified" | "emailVerified" | "isLocked" | "lockedUntil">
type AssigneeRole = Pick<Role, "id" | "organizationId" | "permissions">
type AssigneeGrant = Pick<AccountantAccessGrant, "id" | "organizationId" | "accountantUserId" | "activeScopeKey" | "status" | "role" | "effectiveFrom" | "expiresAt" | "revokedAt" | "revokedById">

export type CloseFindingAssigneeOrganizations = {
  organizationId: string
  assigneeId: string
  homeOrganizationId: string
  organizations: AssigneeOrganization[]
}

const unavailable = () => new ForbiddenError("The finding owner must have a usable account and current Close contribution access.")

/** Called before the assigner's authority locks. The initial lookup is only an
 * organization hint; the account is reloaded and checked under these locks.
 * Both organizations are locked in the same order as other close writers.
 */
export async function prelockCloseFindingAssigneeOrganizationsInTx(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; assigneeId: string },
): Promise<CloseFindingAssigneeOrganizations> {
  const hint = await tx.user.findUnique({ where: { id: input.assigneeId }, select: { id: true, organizationId: true } })
  if (!hint || hint.id !== input.assigneeId || !hint.organizationId) throw unavailable()
  const ids = [...new Set([input.organizationId, hint.organizationId])].sort()
  const organizations = await tx.$queryRaw<AssigneeOrganization[]>(Prisma.sql`
    SELECT "id", "isActive", "deletedAt", "requestedModules" FROM "organizations"
    WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR SHARE`)
  if (organizations.length !== ids.length || ids.some(id => !organizations.some(organization => organization.id === id && organization.isActive && organization.deletedAt === null))) throw unavailable()
  return { ...input, homeOrganizationId: hint.organizationId, organizations }
}

/** An assignee need not be signed in or have assignment/approval authority.
 * Local contributors need read/comment permissions. External contributors also
 * need the client's current review/preparation mandate and managed linkage.
 * Call revalidate after business-lock waits and before returning the command.
 */
export async function lockCloseFindingAssigneeInTx(
  tx: Prisma.TransactionClient,
  input: CloseFindingAssigneeOrganizations,
): Promise<{ revalidate(at?: Date): Promise<void> }> {
  const { organizationId, homeOrganizationId, assigneeId, organizations } = input
  const ids = [...new Set([organizationId, homeOrganizationId])].sort()
  const modules = new Map<string, Awaited<ReturnType<typeof getManagedModuleState>>>()
  for (const id of ids) {
    await tx.$queryRaw(Prisma.sql`SELECT "organizationId" FROM "tenant_module_configurations" WHERE "organizationId" = ${id} FOR SHARE`)
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "tenant_module_grants" WHERE "organizationId" = ${id} ORDER BY "moduleSlug", "id" FOR SHARE`)
    modules.set(id, await getManagedModuleState(id, tx))
  }
  const users = await tx.$queryRaw<AssigneeAccount[]>(Prisma.sql`
    SELECT "id", "organizationId", "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil"
    FROM "users" WHERE "id" = ${assigneeId} AND "organizationId" = ${homeOrganizationId} FOR SHARE`)
  const roles = await tx.$queryRaw<AssigneeRole[]>(Prisma.sql`
    SELECT "id", "organizationId", "permissions" FROM "roles"
    WHERE "organizationId" = ${homeOrganizationId} ORDER BY "id" FOR SHARE`)
  const memberships = await tx.$queryRaw<Array<{ roleId: string }>>(Prisma.sql`
    SELECT membership."A" AS "roleId" FROM "_UserRoles" membership
    INNER JOIN "roles" role ON role."id" = membership."A"
    WHERE membership."B" = ${assigneeId} AND role."organizationId" = ${homeOrganizationId}
    ORDER BY membership."A" FOR SHARE OF membership`)
  const memberRoleIds = new Set(memberships.map(row => row.roleId))
  const permissions = expandPermissions(roles.filter(role => role.organizationId === homeOrganizationId && memberRoleIds.has(role.id)).flatMap(role => role.permissions))
  const grants = homeOrganizationId === organizationId ? [] : await tx.$queryRaw<AssigneeGrant[]>(Prisma.sql`
    SELECT "id", "organizationId", "accountantUserId", "activeScopeKey", "status", "role", "effectiveFrom", "expiresAt", "revokedAt", "revokedById"
    FROM "accountant_access_grants" WHERE "organizationId" = ${organizationId}
      AND "accountantUserId" = ${assigneeId} AND "activeScopeKey" IN (${Prisma.join(accountantScopeKeys(organizationId, assigneeId))})
    ORDER BY "id" FOR SHARE`)

  async function revalidate(at = new Date()) {
    const user = users.length === 1 ? users[0] : null
    if (!Number.isFinite(at.getTime()) || !user || user.id !== assigneeId || user.organizationId !== homeOrganizationId || !isUsableAccount(user, at) ||
      !["accounting.close.read", "accounting.close.finding.comment"].every(permission => hasRbacPermission(permissions, permission)) ||
      ids.some(id => !organizations.some(organization => organization.id === id && organization.isActive && organization.deletedAt === null))) throw unavailable()
    if (homeOrganizationId !== organizationId) {
      const grant = grants.length === 1 ? grants[0] : null
      if (!grant || grant.organizationId !== organizationId || grant.accountantUserId !== assigneeId || !accountantScopeKeys(organizationId, assigneeId).includes(grant.activeScopeKey ?? "") ||
        grant.status !== "ACTIVE" || grant.revokedAt !== null || grant.revokedById !== null || !["REVIEWER", "PREPARER"].includes(grant.role) ||
        grant.effectiveFrom > at || grant.expiresAt <= at || grant.effectiveFrom >= grant.expiresAt) throw unavailable()
      await assertManagedAccountantAccess({ homeOrganizationId, clientOrganizationId: organizationId, accountantUserId: assigneeId,
        grantId: grant.id, activeScopeKey: grant.activeScopeKey, capability: "REVIEW", permission: "accounting.close.finding.comment", now: at }, tx, true)
    }
    for (const scope of [
      { id: homeOrganizationId, moduleSlug: "accounting", accessIntent: "read" },
      { id: organizationId, moduleSlug: "close_assurance", accessIntent: "write" },
    ] as const) {
      const organization = organizations.find(row => row.id === scope.id)!
      if (!evaluateModuleEntitlement({ organizationId: scope.id, userId: assigneeId, actorPermissions: permissions,
        moduleSlug: scope.moduleSlug, accessIntent: scope.accessIntent, surfaceType: "action", surface: "close-assurance.finding-assignee", mode: "enforce",
        requestedModules: organization.requestedModules, explicitEntitlements: modules.get(scope.id)!.explicitEntitlements, now: at }).allowed) throw unavailable()
    }
  }
  await revalidate()
  return { revalidate }
}
