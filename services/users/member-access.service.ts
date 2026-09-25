import "server-only"
import type { Role, Session } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ApplicationError, BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { isRoleCustodian, isUsableAccount } from "@/services/roles/role-custodian-policy"
import { memberAccessCommand, type MemberAccessCommand, type MemberAccessReceipt } from "./member-access-input"
import { accessDigest, canGrantMemberRole, hasMemberControl, hasRecordedDeactivation, memberAccessRevision, type AccessMember, type AccessMembership } from "./member-access-policy"

export async function changeMemberAccess(input: { organizationId: string; actorId: string; targetUserId: string; command: MemberAccessCommand; session: { id: string; token: string } }): Promise<MemberAccessReceipt> {
  const parsed = memberAccessCommand.safeParse(input.command)
  if (!parsed.success || !input.targetUserId) throw new ApplicationError("VALIDATION_ERROR", "Review the member and selected roles before continuing.", 400)
  if (!input.actorId || !input.organizationId || !input.session?.id || !input.session.token) throw new ForbiddenError()
  if (input.actorId === input.targetUserId) throw new BusinessRuleError("Ask another authorized administrator to change your access.")
  const command = { ...parsed.data, roleIds: [...parsed.data.roleIds].sort() }
  const fingerprint = accessDigest({ targetUserId: input.targetUserId, ...command })
  const auditId = "member_access_" + accessDigest([input.organizationId, input.actorId, command.requestId])
  return db.$transaction(async tx => {
    // Same organization-first lock order as role editing and member deactivation.
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${input.organizationId} FOR UPDATE`
    if (!await tx.organization.findFirst({ where: { id: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } })) throw new NotFoundError("Organization unavailable.")
    const users = await tx.$queryRaw<AccessMember[]>`SELECT id, email, "firstName", "lastName", "updatedAt", "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil" FROM users WHERE "organizationId" = ${input.organizationId} ORDER BY id FOR UPDATE`
    const roles = await tx.$queryRaw<Role[]>`SELECT * FROM roles WHERE "organizationId" = ${input.organizationId} ORDER BY id FOR SHARE`
    const memberships = await tx.$queryRaw<AccessMembership[]>`SELECT membership."A" AS "roleId", membership."B" AS "userId" FROM "_UserRoles" membership INNER JOIN users u ON u.id = membership."B" WHERE u."organizationId" = ${input.organizationId} ORDER BY membership."A", membership."B" FOR UPDATE OF membership`
    const now = new Date(), actor = users.find(user => user.id === input.actorId), member = users.find(user => user.id === input.targetUserId)
    const roleIdsFor = (id: string) => memberships.filter(row => row.userId === id).map(row => row.roleId).sort()
    const permissionsFor = (ids: string[]) => roles.filter(role => ids.includes(role.id)).flatMap(role => role.permissions)
    const actorPermissions = permissionsFor(roleIdsFor(input.actorId))
    if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(actorPermissions, "users.read")) throw new ForbiddenError()
    if (!member) throw new NotFoundError("Member not found.")
    const sessions = await tx.$queryRaw<Session[]>`SELECT * FROM sessions WHERE id = ${input.session.id} AND token = ${input.session.token} AND "userId" = ${input.actorId} FOR SHARE`
    const session = sessions[0]
    if (!session || session.expiresAt <= now || !session.assuranceVerifiedAt || session.assuranceVerifiedAt > now || now.getTime() - session.assuranceVerifiedAt.getTime() > 300000 || session.assuranceMethod !== "password" || session.assuranceOrganizationId !== input.organizationId || session.assuranceLevel < 1 || (session.assuranceLockedUntil && session.assuranceLockedUntil > now)) throw new ApplicationError("FRESH_AUTH_REQUIRED", "Confirm your password before changing member access.", 403)
    const beforeIds = roleIdsFor(member.id)
    if (beforeIds.some(id => !roles.some(role => role.id === id))) throw new BusinessRuleError("This account has an inconsistent role assignment. Retain it for administrator review.")
    const selected = command.roleIds.map(id => roles.find(role => role.id === id))
    if (selected.some(role => !role)) throw new NotFoundError("A selected role is unavailable in this organization.")
    const previous = await tx.auditLog.findFirst({ where: { id: auditId, organizationId: input.organizationId, userId: input.actorId, entityType: "User", entityId: member.id, action: "MEMBER_ACCESS_CHANGED" } })
    const saved = previous?.changes as { fingerprint?: string; receipt?: MemberAccessReceipt; added?: string[]; removed?: string[] } | null
    if (previous && saved?.fingerprint !== fingerprint) throw new IdempotencyConflictError()
    const added = saved?.added ?? command.roleIds.filter(id => !beforeIds.includes(id))
    const removed = saved?.removed ?? beforeIds.filter(id => !command.roleIds.includes(id))
    if (removed.length && !hasMemberControl(actorPermissions, "remove")) throw new ForbiddenError("Role-removal authority is required.")
    if (added.some(id => !canGrantMemberRole(actorPermissions, roles.find(role => role.id === id)!))) throw new ForbiddenError("You cannot assign one or more selected roles.")
    if (command.operation === "reactivate" && (!hasMemberControl(actorPermissions, "activate") || selected.some(role => !canGrantMemberRole(actorPermissions, role!)))) throw new ForbiddenError("Reactivation and assignment authority for every selected role are required.")
    if (saved?.receipt) {
      if (memberAccessRevision(member, beforeIds, roles) !== saved.receipt.revision) throw new ConflictError("This request was recorded, but the member or roles changed. Reload the current state.")
      return { ...saved.receipt, replayed: true }
    }
    if (memberAccessRevision(member, beforeIds, roles) !== command.expectedRevision) throw new ConflictError("The member or role definitions changed. Reload and review your selection.")
    if (command.operation === "roles" && !member.isActive) throw new BusinessRuleError("Review reactivation and its roles together for an inactive account.")
    if (command.operation === "roles" && !added.length && !removed.length) throw new ApplicationError("VALIDATION_ERROR", "Select a role change before saving.", 400)
    if (command.operation === "reactivate") {
      const record = await tx.auditLog.findFirst({ where: { organizationId: input.organizationId, entityType: "User", entityId: member.id, action: "DEACTIVATE_USER" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })
      if (!hasRecordedDeactivation(member, record)) throw new BusinessRuleError("A verified account and matching recorded deactivation are required. Do not clear an unexplained security lock.")
    }
    if (isRoleCustodian(member, permissionsFor(beforeIds), now) && !isRoleCustodian(member, permissionsFor(command.roleIds), now) && !users.some(user => user.id !== member.id && isRoleCustodian(user, permissionsFor(roleIdsFor(user.id)), now))) throw new BusinessRuleError("Keep another active administrator able to manage roles and invite members.")
    const revoked = await tx.session.deleteMany({ where: { userId: member.id } })
    const updatedAt = new Date(Math.max(now.getTime(), member.updatedAt.getTime() + 1))
    const after = { ...member, updatedAt, ...(command.operation === "reactivate" ? { isActive: true, isLocked: false, lockedUntil: null } : {}) }
    await tx.user.update({ where: { id: member.id, organizationId: input.organizationId }, data: {
      roles: { set: command.roleIds.map(id => ({ id })) }, updatedAt,
      ...(command.operation === "reactivate" ? { isActive: true, isLocked: false, lockedUntil: null, failedLoginAttempts: 0, lastFailedLogin: null, verificationToken: null, verificationTokenExpires: null } : {}),
    } })
    const receipt: MemberAccessReceipt = { id: member.id, auditId, revision: memberAccessRevision(after, command.roleIds, roles), operation: command.operation, sessionsRevoked: revoked.count, replayed: false }
    await tx.auditLog.create({ data: { id: auditId, organizationId: input.organizationId, userId: input.actorId, entityType: "User", entityId: member.id, action: "MEMBER_ACCESS_CHANGED", changes: { fingerprint, operation: command.operation, reason: command.reason, reviewedRevision: command.expectedRevision, beforeRoleIds: beforeIds, afterRoleIds: command.roleIds, beforeActive: member.isActive, afterActive: after.isActive, added, removed, receipt } } })
    return receipt
  }, { isolationLevel: "ReadCommitted", timeout: 10000 })
}
