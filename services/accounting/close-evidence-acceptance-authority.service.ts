import "server-only"

import { Prisma, type AccountantAccessGrant, type Organization, type Role, type Session, type User } from "@prisma/client"

import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ApplicationError, ForbiddenError } from "@/services/_shared/action-errors"
import { evaluateModuleEntitlement, getManagedModuleState } from "@/services/modules/module-entitlement.service"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"

export type CloseEvidenceAcceptanceAuthorityInput = {
  homeOrganizationId: string
  organizationId: string
  actorId: string
  /** From the authenticated server context, never a command/form field. */
  session: { id: string; token: string } | null | undefined
  /** Only the internal work-desk caller may select its additional permission. */
  requireWorkDeskAccess?: boolean
  /** Internal replacement writer also requires authority to assign findings. */
  requireFindingAssignment?: boolean
  /** Recovery decisions require the same read scope used for investigation. */
  requireCloseRead?: boolean
}

type OrganizationAuthority = Pick<Organization, "id" | "isActive" | "deletedAt" | "requestedModules">
type ActorAuthority = Pick<User, "id" | "organizationId" | "isActive" | "isVerified" | "emailVerified" | "isLocked" | "lockedUntil">
type RoleAuthority = Pick<Role, "id" | "organizationId" | "permissions">
type SessionAuthority = Pick<Session, "id" | "userId" | "expiresAt" | "assuranceVerifiedAt" | "assuranceMethod" | "assuranceOrganizationId" | "assuranceLevel" | "assuranceLockedUntil">
type DelegatedAuthority = Pick<AccountantAccessGrant, "id" | "organizationId" | "accountantUserId" | "activeScopeKey" | "status" | "role" | "effectiveFrom" | "expiresAt" | "revokedAt" | "revokedById">

function freshAuthenticationRequired(): never {
  throw new ApplicationError("FRESH_AUTH_REQUIRED", "Confirm your password again before accepting close evidence.", 403)
}

/**
 * Use inside the acceptance ReadCommitted transaction, before correlation,
 * period, run and finding locks. Organizations are sorted and locked first,
 * matching role/member/module writers. Then lock module authority, the home
 * actor, tenant roles, memberships, the exact session and delegated grant.
 * Grant revocation updates that row without later upgrading organization locks.
 * Retain these locks through commit; a revocation either wins first or waits.
 *
 * Revalidate AFTER later business-lock waits with the database publication time.
 * Locked rows cannot be revoked underneath us, but session freshness and grant
 * validity still expire while waiting. The returned checker exposes no secrets.
 */
export async function lockCloseEvidenceAcceptanceAuthorityInTx(
  tx: Prisma.TransactionClient,
  input: CloseEvidenceAcceptanceAuthorityInput,
): Promise<{ revalidate(at?: Date): Promise<void> }> {
  return lockCloseEvidenceAuthorityInTx(tx, input, "accept")
}

export async function lockCloseEvidenceWorkAuthorityInTx(
  tx: Prisma.TransactionClient,
  input: CloseEvidenceAcceptanceAuthorityInput & { operation: "request" | "respond" },
): Promise<{ revalidate(at?: Date): Promise<void> }> {
  return lockCloseEvidenceAuthorityInTx(tx, input, input.operation)
}

/** Called only for a new request, after its organization/module/actor locks.
 * The recipient need not be online, but must be able to read and respond.
 * Exact historical replays do not create another assignment and skip this check.
 */
export async function lockCloseEvidenceRecipientInTx(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; recipientId: string },
): Promise<{ revalidate(at?: Date): void }> {
  const { organizationId, recipientId } = input
  const users = await tx.$queryRaw<ActorAuthority[]>(Prisma.sql`
    SELECT "id", "organizationId", "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil"
    FROM "users" WHERE "id" = ${recipientId} AND "organizationId" = ${organizationId} FOR SHARE`)
  const roles = await tx.$queryRaw<RoleAuthority[]>(Prisma.sql`
    SELECT "id", "organizationId", "permissions" FROM "roles"
    WHERE "organizationId" = ${organizationId} ORDER BY "id" FOR SHARE`)
  const memberships = await tx.$queryRaw<Array<{ roleId: string }>>(Prisma.sql`
    SELECT membership."A" AS "roleId" FROM "_UserRoles" membership
    INNER JOIN "roles" role ON role."id" = membership."A"
    WHERE membership."B" = ${recipientId} AND role."organizationId" = ${organizationId}
    ORDER BY membership."A" FOR SHARE OF membership`)
  const assigned = new Set(memberships.map(row => row.roleId))
  const permissions = expandPermissions(roles.filter(role => role.organizationId === organizationId && assigned.has(role.id)).flatMap(role => role.permissions))
  function revalidate(at = new Date()) {
    const recipient = users.length === 1 ? users[0] : null
    if (!Number.isFinite(at.getTime()) || !recipient || recipient.id !== recipientId || recipient.organizationId !== organizationId ||
      !isUsableAccount(recipient, at) || !["accounting.close.read", "accounting.close.finding.comment"].every(permission => hasRbacPermission(permissions, permission))) {
      throw new ForbiddenError("The response owner must have a usable account and current Close read and comment permissions.")
    }
  }
  revalidate()
  return { revalidate }
}

async function lockCloseEvidenceAuthorityInTx(
  tx: Prisma.TransactionClient,
  input: CloseEvidenceAcceptanceAuthorityInput,
  operation: "accept" | "request" | "respond",
): Promise<{ revalidate(at?: Date): Promise<void> }> {
  const { homeOrganizationId, organizationId, actorId, requireWorkDeskAccess, requireFindingAssignment, requireCloseRead } = input
  const sessionId = input.session?.id
  const sessionToken = input.session?.token
  const sessionRequired: () => never = () => {
    if (operation === "accept") freshAuthenticationRequired()
    throw new ApplicationError("AUTH_REQUIRED", "A current authenticated session is required for close evidence work.", 401)
  }
  if (!sessionId || !sessionToken) sessionRequired()
  if (!homeOrganizationId || !organizationId || !actorId) throw new ForbiddenError()
  if (operation === "respond" && homeOrganizationId !== organizationId) throw new ForbiddenError()

  const organizationIds = [...new Set([homeOrganizationId, organizationId])].sort()
  const organizations = await tx.$queryRaw<OrganizationAuthority[]>(Prisma.sql`
    SELECT "id", "isActive", "deletedAt", "requestedModules" FROM "organizations"
    WHERE "id" IN (${Prisma.join(organizationIds)}) ORDER BY "id" FOR SHARE`)
  if (organizations.length !== organizationIds.length || organizationIds.some(id =>
    !organizations.some(org => org.id === id && org.isActive && org.deletedAt === null),
  )) throw new ForbiddenError("An active organization is required to accept close evidence.")

  // Organization locks also cover the first transition from legacy intent to
  // managed grants, when there is no configuration row yet to lock.
  const modules = new Map<string, Awaited<ReturnType<typeof getManagedModuleState>>>()
  for (const id of organizationIds) {
    await tx.$queryRaw(Prisma.sql`SELECT "organizationId" FROM "tenant_module_configurations"
      WHERE "organizationId" = ${id} FOR SHARE`)
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "tenant_module_grants"
      WHERE "organizationId" = ${id} ORDER BY "moduleSlug", "id" FOR SHARE`)
    modules.set(id, await getManagedModuleState(id, tx))
  }

  const actors = await tx.$queryRaw<ActorAuthority[]>(Prisma.sql`
    SELECT "id", "organizationId", "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil"
    FROM "users" WHERE "id" = ${actorId} AND "organizationId" = ${homeOrganizationId} FOR SHARE`)
  const roles = await tx.$queryRaw<RoleAuthority[]>(Prisma.sql`
    SELECT "id", "organizationId", "permissions" FROM "roles"
    WHERE "organizationId" = ${homeOrganizationId} ORDER BY "id" FOR SHARE`)
  const memberships = await tx.$queryRaw<Array<{ roleId: string }>>(Prisma.sql`
    SELECT membership."A" AS "roleId" FROM "_UserRoles" membership
    INNER JOIN "roles" role ON role."id" = membership."A"
    WHERE membership."B" = ${actorId} AND role."organizationId" = ${homeOrganizationId}
    ORDER BY membership."A" FOR SHARE OF membership`)
  const membershipIds = new Set(memberships.map(row => row.roleId))
  const permissions = expandPermissions(roles.filter(role =>
    role.organizationId === homeOrganizationId && membershipIds.has(role.id),
  ).flatMap(role => role.permissions))

  const sessions = await tx.$queryRaw<SessionAuthority[]>(Prisma.sql`
    SELECT "id", "userId", "expiresAt", "assuranceVerifiedAt", "assuranceMethod",
      "assuranceOrganizationId", "assuranceLevel", "assuranceLockedUntil"
    FROM "sessions" WHERE "id" = ${sessionId} AND "token" = ${sessionToken}
      AND "userId" = ${actorId} FOR SHARE`)
  const session = sessions.length === 1 ? sessions[0] : null
  const grants = homeOrganizationId === organizationId ? [] : await tx.$queryRaw<DelegatedAuthority[]>(Prisma.sql`
    SELECT "id", "organizationId", "accountantUserId", "activeScopeKey", "status", "role",
      "effectiveFrom", "expiresAt", "revokedAt", "revokedById"
    FROM "accountant_access_grants" WHERE "organizationId" = ${organizationId}
      AND "accountantUserId" = ${actorId} AND "activeScopeKey" = ${`${organizationId}:${actorId}`}
    ORDER BY "id" FOR SHARE`)

  async function revalidate(at = new Date()): Promise<void> {
    if (!Number.isFinite(at.getTime())) sessionRequired()
    const actor = actors.length === 1 ? actors[0] : null
    if (!actor || actor.id !== actorId || actor.organizationId !== homeOrganizationId || !isUsableAccount(actor, at)) {
      throw new ForbiddenError("A usable home-organization account is required to accept close evidence.")
    }
    const requiredPermission = operation === "accept" ? "accounting.close.accountant.review" : operation === "request" ? "accounting.close.evidence.request" : "accounting.close.finding.comment"
    if (!hasRbacPermission(permissions, requiredPermission) ||
      ((operation !== "accept" || requireCloseRead) && !hasRbacPermission(permissions, "accounting.close.read")) ||
      (requireFindingAssignment && !hasRbacPermission(permissions, "accounting.close.finding.assign")) ||
      (requireWorkDeskAccess && !hasRbacPermission(permissions, "accounting.audit.read"))) {
      throw new ForbiddenError("Current permission is required for this close evidence operation.")
    }
    if (!session || session.id !== sessionId || session.userId !== actorId || session.expiresAt <= at) sessionRequired()
    if (operation === "accept" && (!session.assuranceVerifiedAt || session.assuranceVerifiedAt > at ||
      at.getTime() - session.assuranceVerifiedAt.getTime() > 300_000 ||
      session.assuranceMethod !== "password" || session.assuranceOrganizationId !== homeOrganizationId ||
      session.assuranceLevel < 1 || (session.assuranceLockedUntil && session.assuranceLockedUntil > at))) {
      freshAuthenticationRequired()
    }
    if (homeOrganizationId !== organizationId) {
      const grant = grants.length === 1 ? grants[0] : null
      if (!grant || grant.organizationId !== organizationId || grant.accountantUserId !== actorId ||
        grant.activeScopeKey !== `${organizationId}:${actorId}` || grant.status !== "ACTIVE" ||
        grant.revokedAt !== null || grant.revokedById !== null ||
        !["REVIEWER", "PREPARER"].includes(grant.role) ||
        grant.effectiveFrom > at || grant.expiresAt <= at || grant.effectiveFrom >= grant.expiresAt) {
        throw new ForbiddenError("Current client consent with review access is required to accept close evidence.")
      }
    }
    for (const scope of [
      { id: homeOrganizationId, moduleSlug: "accounting", accessIntent: "read" },
      { id: organizationId, moduleSlug: "close_assurance", accessIntent: "write" },
    ] as const) {
      const organization = organizations.find(org => org.id === scope.id)!
      const decision = evaluateModuleEntitlement({
        organizationId: scope.id,
        userId: actorId,
        actorPermissions: permissions,
        moduleSlug: scope.moduleSlug,
        accessIntent: scope.accessIntent,
        surfaceType: "action",
        surface: operation === "accept" ? "close-assurance.acceptMissingCloseEvidenceResponse" : operation === "request" ? "close-assurance.requestMissingCloseEvidence" : "close-assurance.respondToMissingCloseEvidence",
        mode: "enforce",
        requestedModules: organization.requestedModules,
        explicitEntitlements: modules.get(scope.id)!.explicitEntitlements,
        now: at,
      })
      if (!decision.allowed) throw new ForbiddenError("Current module access does not permit accepting close evidence.")
    }
  }

  await revalidate()
  return { revalidate }
}
