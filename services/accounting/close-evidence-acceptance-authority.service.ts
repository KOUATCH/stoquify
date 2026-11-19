import "server-only"

import { Prisma, type AccountantAccessGrant, type Organization, type Role, type Session, type User } from "@prisma/client"

import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ApplicationError, ForbiddenError } from "@/services/_shared/action-errors"
import { evaluateModuleEntitlement, getManagedModuleState } from "@/services/modules/module-entitlement.service"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { accountantScopeKeys, assertManagedAccountantAccess } from "./managed-accountant-access.service"

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
  /** Server-only management policy; never accepted from a command form. */
  restrictOnly?: boolean
  /** Internal AF11 evidence reader only; never taken from a form as authority. */
  requirePayrollRead?: boolean
}

type OrganizationAuthority = Pick<Organization, "id" | "isActive" | "deletedAt" | "requestedModules">
type ActorAuthority = Pick<User, "id" | "organizationId" | "isActive" | "isVerified" | "emailVerified" | "isLocked" | "lockedUntil">
type RoleAuthority = Pick<Role, "id" | "organizationId" | "permissions">
type SessionAuthority = Pick<Session, "id" | "userId" | "expiresAt" | "assuranceVerifiedAt" | "assuranceMethod" | "assuranceOrganizationId" | "assuranceLevel" | "assuranceLockedUntil">
type DelegatedAuthority = Pick<AccountantAccessGrant, "id" | "organizationId" | "accountantUserId" | "activeScopeKey" | "status" | "role" | "effectiveFrom" | "expiresAt" | "revokedAt" | "revokedById">

export type CloseWriteOperation = "assessment" | "assign" | "comment" | "waiver-request" | "waiver-approve" | "review" | "draft-export" | "certified-export"

const closeWritePermissions: Record<CloseWriteOperation, string> = {
  assessment: "accounting.close.run",
  assign: "accounting.close.finding.assign",
  comment: "accounting.close.finding.comment",
  "waiver-request": "accounting.close.waiver.request",
  "waiver-approve": "accounting.close.waiver.approve",
  review: "accounting.close.accountant.review",
  "draft-export": "accounting.close.export",
  "certified-export": "accounting.close.certify",
}

function isCloseWriteOperation(operation: string): operation is CloseWriteOperation {
  return Object.prototype.hasOwnProperty.call(closeWritePermissions, operation)
}

function freshAuthenticationRequired(closeWrite = false): never {
  throw new ApplicationError("FRESH_AUTH_REQUIRED", closeWrite
    ? "Confirm your password again before continuing this close operation."
    : "Confirm your password again before accepting close evidence.", 403)
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

export async function lockAccountantExportAuthorityInTx(tx: Prisma.TransactionClient, input: CloseEvidenceAcceptanceAuthorityInput) {
  return lockCloseEvidenceAuthorityInTx(tx, input, "export")
}

/** Legacy close writers use the same persisted authority and lock order as
 * evidence acceptance. They are client-local; delegated work uses its existing
 * evidence/workpaper owners. Operation selection is server-owned, never form input. */
export async function lockCloseWriteAuthorityInTx(
  tx: Prisma.TransactionClient,
  input: CloseEvidenceAcceptanceAuthorityInput,
  operation: CloseWriteOperation,
): Promise<{ revalidate(at?: Date): Promise<void> }> {
  if (!isCloseWriteOperation(operation) || input.homeOrganizationId !== input.organizationId) throw new ForbiddenError()
  return lockCloseEvidenceAuthorityInTx(tx, input, operation)
}

/** Reading an original pack never grants authority to create a certification. */
export async function lockClosePackRetrievalAuthorityInTx(
  tx: Prisma.TransactionClient,
  input: CloseEvidenceAcceptanceAuthorityInput,
  options: { certified: boolean },
): Promise<{ revalidate(at?: Date): Promise<void> }> {
  if (input.homeOrganizationId !== input.organizationId) throw new ForbiddenError()
  return lockCloseEvidenceAuthorityInTx(tx, input, options.certified ? "certified-pack-read" : "draft-export")
}

/** Workpapers share the live consent/session/module locks, without granting
 * close approval or allowing a read-only mandate to write review records. */
export async function lockWorkpaperAuthorityInTx(tx: Prisma.TransactionClient, input: CloseEvidenceAcceptanceAuthorityInput,
  operation: "workpaper-read" | "workpaper-prepare" | "workpaper-review") {
  return lockCloseEvidenceAuthorityInTx(tx, { ...input, requireCloseRead: true }, operation)
}

export async function lockFirmManagementAuthorityInTx(tx: Prisma.TransactionClient, input: CloseEvidenceAcceptanceAuthorityInput, readOnly = false) {
  return lockCloseEvidenceAuthorityInTx(tx, input, readOnly ? "management-read" : "management")
}

/** Financial cutover is client-local. A firm review mandate is never posting authority. */
export async function lockOpeningApplyAuthorityInTx(tx: Prisma.TransactionClient, input: CloseEvidenceAcceptanceAuthorityInput) {
  return lockCloseEvidenceAuthorityInTx(tx, { ...input, requireCloseRead: true }, "opening-apply")
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
  operation: "accept" | "request" | "respond" | "export" | "management" | "management-read" | "workpaper-read" | "workpaper-prepare" | "workpaper-review" | "opening-apply" | "certified-pack-read" | CloseWriteOperation,
): Promise<{ revalidate(at?: Date): Promise<void> }> {
  const { homeOrganizationId, organizationId, actorId, requireWorkDeskAccess, requireFindingAssignment, requireCloseRead } = input
  const sessionId = input.session?.id
  const sessionToken = input.session?.token
  const management = operation === "management" || operation === "management-read"
  const closeWritePermission = isCloseWriteOperation(operation) ? closeWritePermissions[operation] : null
  const closeWrite = closeWritePermission !== null || operation === "certified-pack-read"
  const freshRequired = operation === "accept" || operation === "export" || operation === "management" || operation === "workpaper-review" || operation === "opening-apply" || operation === "waiver-approve" || operation === "certified-export" || operation === "certified-pack-read"
  const sessionRequired: () => never = () => {
    if (freshRequired) freshAuthenticationRequired(closeWrite)
    throw new ApplicationError("AUTH_REQUIRED", closeWrite
      ? "A current authenticated session is required for this close operation."
      : "A current authenticated session is required for close evidence work.", 401)
  }
  if (!sessionId || !sessionToken) sessionRequired()
  if (!homeOrganizationId || !organizationId || !actorId) throw new ForbiddenError()
  if (operation === "respond" && homeOrganizationId !== organizationId) throw new ForbiddenError()
  if (operation === "opening-apply" && homeOrganizationId !== organizationId) throw new ForbiddenError("Only a current client financial operator may approve or apply opening balances.")

  const organizationIds = [...new Set([homeOrganizationId, organizationId])].sort()
  const organizations = await tx.$queryRaw<OrganizationAuthority[]>(Prisma.sql`
    SELECT "id", "isActive", "deletedAt", "requestedModules" FROM "organizations"
    WHERE "id" IN (${Prisma.join(organizationIds)}) ORDER BY "id" FOR SHARE`)
  if (organizations.length !== organizationIds.length || organizationIds.some(id =>
    !organizations.some(org => org.id === id && ((management && input.restrictOnly && id !== homeOrganizationId) || (org.isActive && org.deletedAt === null))),
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
  const grants = homeOrganizationId === organizationId || management ? [] : await tx.$queryRaw<DelegatedAuthority[]>(Prisma.sql`
    SELECT "id", "organizationId", "accountantUserId", "activeScopeKey", "status", "role",
      "effectiveFrom", "expiresAt", "revokedAt", "revokedById"
    FROM "accountant_access_grants" WHERE "organizationId" = ${organizationId}
      AND "accountantUserId" = ${actorId} AND "activeScopeKey" IN (${Prisma.join(accountantScopeKeys(organizationId, actorId))})
    ORDER BY "id" FOR SHARE`)

  async function revalidate(at = new Date()): Promise<void> {
    if (!Number.isFinite(at.getTime())) sessionRequired()
    const actor = actors.length === 1 ? actors[0] : null
    if (!actor || actor.id !== actorId || actor.organizationId !== homeOrganizationId || !isUsableAccount(actor, at)) {
      throw new ForbiddenError("A usable home-organization account is required to accept close evidence.")
    }
    const requiredPermission = closeWritePermission ?? (operation === "certified-pack-read" ? "accounting.close.export" : management ? "accounting.close.accountant.invite" : operation === "opening-apply" ? "accounting.journal.post" : operation === "export" ? "accounting.exports.create" : operation === "workpaper-read" ? "accounting.close.read" : operation === "accept" || operation === "workpaper-review" ? "accounting.close.accountant.review" : operation === "request" ? "accounting.close.evidence.request" : "accounting.close.finding.comment")
    if (operation === "opening-apply" && !["accounting.close.accountant.review", "inventory.stock.adjust", "inventory.adjust.approve", "purchasing.ap.invoice.post", "customers.update"].every(permission => hasRbacPermission(permissions, permission))) {
      throw new ForbiddenError("Current journal, stock approval, payable posting and customer permissions are required for this multi-domain cutover.")
    }
    if (input.requirePayrollRead && (homeOrganizationId !== organizationId || !hasRbacPermission(permissions, "payroll.reports.read"))) {
      throw new ForbiddenError("Payroll evidence requires a current client-local payroll reporting role.")
    }
    if (!hasRbacPermission(permissions, requiredPermission) ||
      (((operation === "request" || operation === "respond") || requireCloseRead) && !hasRbacPermission(permissions, "accounting.close.read")) ||
      (requireFindingAssignment && !hasRbacPermission(permissions, "accounting.close.finding.assign")) ||
      (requireWorkDeskAccess && !hasRbacPermission(permissions, "accounting.audit.read"))) {
      throw new ForbiddenError("Current permission is required for this close evidence operation.")
    }
    if (!session || session.id !== sessionId || session.userId !== actorId || session.expiresAt <= at) sessionRequired()
    if (freshRequired && (!session.assuranceVerifiedAt || session.assuranceVerifiedAt > at ||
      at.getTime() - session.assuranceVerifiedAt.getTime() > 300_000 ||
      session.assuranceMethod !== "password" || session.assuranceOrganizationId !== homeOrganizationId ||
      session.assuranceLevel < 1 || (session.assuranceLockedUntil && session.assuranceLockedUntil > at))) {
      freshAuthenticationRequired(closeWrite)
    }
    if (homeOrganizationId !== organizationId && !management) {
      const grant = grants.length === 1 ? grants[0] : null
      if (!grant || grant.organizationId !== organizationId || grant.accountantUserId !== actorId ||
        !accountantScopeKeys(organizationId, actorId).includes(grant.activeScopeKey ?? "") || grant.status !== "ACTIVE" ||
        grant.revokedAt !== null || grant.revokedById !== null ||
        !(operation === "workpaper-read" ? ["READ_ONLY", "REVIEWER", "PREPARER"] : ["REVIEWER", "PREPARER"]).includes(grant.role) ||
        grant.effectiveFrom > at || grant.expiresAt <= at || grant.effectiveFrom >= grant.expiresAt) {
        throw new ForbiddenError("Current client consent with review access is required to accept close evidence.")
      }
      await assertManagedAccountantAccess({ homeOrganizationId, clientOrganizationId: organizationId,
        accountantUserId: actorId, grantId: grant.id, activeScopeKey: grant.activeScopeKey,
        capability: operation === "export" ? "EXPORT" : operation === "workpaper-read" ? "READ" : "REVIEW", permission: requiredPermission, now: at }, tx, true)
    }
    for (const scope of [
      { id: homeOrganizationId, moduleSlug: "accounting", accessIntent: operation === "management" || operation === "workpaper-prepare" || operation === "workpaper-review" || operation === "opening-apply" ? "write" : "read" },
      ...(input.requirePayrollRead ? [{ id: organizationId, moduleSlug: "payroll" as const, accessIntent: "read" as const }] : []),
      ...(operation === "opening-apply" ? (["inventory", "purchasing", "sales"] as const).map(moduleSlug => ({ id: organizationId, moduleSlug, accessIntent: "write" as const })) : []),
      ...((management && (input.restrictOnly || operation === "management-read")) ? [] : [{ id: organizationId, moduleSlug: "close_assurance" as const, accessIntent: management || operation === "workpaper-read" ? "read" as const : operation === "export" || operation === "draft-export" || operation === "certified-pack-read" ? "export" as const : "write" as const }]),
    ] as const) {
      const organization = organizations.find(org => org.id === scope.id)!
      const decision = evaluateModuleEntitlement({
        organizationId: scope.id,
        userId: actorId,
        actorPermissions: permissions,
        moduleSlug: scope.moduleSlug,
        accessIntent: scope.accessIntent,
        surfaceType: "action",
        surface: closeWrite ? `close-assurance.${operation}` : operation === "accept" ? "close-assurance.acceptMissingCloseEvidenceResponse" : operation === "request" ? "close-assurance.requestMissingCloseEvidence" : "close-assurance.respondToMissingCloseEvidence",
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
