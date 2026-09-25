import "server-only"
import { createHash } from "node:crypto"
import type { Prisma, Role, Session } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ApplicationError, BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { isRoleCustodian, isUsableAccount, type CustodianAccount } from "@/services/roles/role-custodian-policy"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { invitationRevision } from "./invitation-revision"
import { USER_INVITATION_DELIVERY } from "./user-invitation-delivery-contract"
import { userDeactivationCommand, type UserDeactivationCommand, type UserDeactivationReceipt } from "./user-deactivation-input"

type Member = CustodianAccount & { id: string; email: string; updatedAt: Date }
type Membership = { roleId: string; userId: string }
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")

async function cancelRecipientInvitations(tx: Prisma.TransactionClient, input: {
  organizationId: string; actorId: string; email: string; command: UserDeactivationCommand
}) {
  const pending = await tx.invite.findMany({ where: { organizationId: input.organizationId, email: { equals: input.email, mode: "insensitive" }, status: "PENDING" }, orderBy: { id: "asc" } })
  for (const invite of pending) {
    const payload = { inviteId: invite.id, revision: invitationRevision(invite), reason: "Account deactivated: " + input.command.reason, requestId: input.command.requestId, actorId: input.actorId, organizationId: input.organizationId }
    const hash = hashBusinessPayload(payload)
    await tx.invite.update({ where: { id: invite.id, organizationId: input.organizationId }, data: { status: "CANCELLED" } })
    const event = await tx.businessEvent.create({ data: {
      organizationId: input.organizationId, eventType: "identity.user_invitation.cancelled.v1", eventSource: "API",
      idempotencyKey: "user-deactivation/" + input.command.requestId + "/" + invite.id, payloadHash: hash, payload,
      actorId: input.actorId, sourceId: invite.id, occurredAt: new Date(), status: "APPLIED", processedAt: new Date(),
      audits: { create: { organizationId: input.organizationId, action: "RECORDED", actorId: input.actorId, eventSource: "API", payloadHash: hash, reason: payload.reason } },
    }, select: { id: true } })
    // Sent and in-flight delivery records remain historical; cancellation cannot recall email.
    await tx.businessEventOutbox.updateMany({ where: { organizationId: input.organizationId, eventName: USER_INVITATION_DELIVERY, businessEvent: { sourceId: invite.id, organizationId: input.organizationId }, status: { in: ["PENDING", "FAILED", "DEFERRED"] } }, data: { status: "CANCELLED", lastErrorCode: "INVITATION_CANCELLED", lastErrorMessage: null } })
    await tx.auditLog.create({ data: { organizationId: input.organizationId, userId: input.actorId, entityType: "UserInvite", entityId: invite.id, action: "INVITE_CANCELLED", changes: { cancellationId: event.id, previousStatus: invite.status, previousRevision: payload.revision, reason: payload.reason, authorityBasis: "account-deactivation" } } })
  }
  return pending.length
}

export async function deactivateUserForOrganization(input: {
  organizationId: string; targetUserId: string; actorId: string
  command?: UserDeactivationCommand
  session?: { id: string; token: string }
}): Promise<UserDeactivationReceipt> {
  if (input.targetUserId === input.actorId) throw new BusinessRuleError("You cannot deactivate your own account.")
  const parsed = userDeactivationCommand.safeParse(input.command)
  if (!parsed.success || !input.targetUserId) throw new ApplicationError("VALIDATION_ERROR", "Review the current account and enter a reason before deactivating it.", 400)
  if (!input.actorId || !input.organizationId || !input.session?.id || !input.session.token) throw new ForbiddenError("A current organization session is required.")
  const command = parsed.data
  const fingerprint = digest({ targetUserId: input.targetUserId, expectedUpdatedAt: command.expectedUpdatedAt, reason: command.reason })
  const auditId = "user_deactivation_" + digest([input.organizationId, input.actorId, command.requestId])
  return db.$transaction(async tx => {
    // Organization-first serialization is shared with role editing.
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${input.organizationId} FOR UPDATE`
    if (!await tx.organization.findFirst({ where: { id: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } })) throw new NotFoundError("Organization unavailable.")
    const users = await tx.$queryRaw<Member[]>`SELECT id, email, "updatedAt", "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil" FROM users WHERE "organizationId" = ${input.organizationId} ORDER BY id FOR UPDATE`
    const roles = await tx.$queryRaw<Role[]>`SELECT * FROM roles WHERE "organizationId" = ${input.organizationId} ORDER BY id FOR SHARE`
    const members = await tx.$queryRaw<Membership[]>`SELECT membership."A" AS "roleId", membership."B" AS "userId" FROM "_UserRoles" membership INNER JOIN roles r ON r.id = membership."A" WHERE r."organizationId" = ${input.organizationId} ORDER BY membership."A", membership."B" FOR SHARE OF membership`
    const now = new Date(), actor = users.find(user => user.id === input.actorId)
    const permissionsFor = (id: string) => roles.filter(role => members.some(member => member.userId === id && member.roleId === role.id)).flatMap(role => role.permissions)
    if (!actor || !isUsableAccount(actor, now) || !["users.deactivate", "users.delete"].some(permission => hasRbacPermission(permissionsFor(actor.id), permission))) throw new ForbiddenError("Your current account cannot deactivate members.")
    const sessions = await tx.$queryRaw<Session[]>`SELECT * FROM sessions WHERE id = ${input.session!.id} AND token = ${input.session!.token} AND "userId" = ${input.actorId} FOR SHARE`
    const session = sessions[0]
    if (!session || session.expiresAt <= now || !session.assuranceVerifiedAt || session.assuranceVerifiedAt > now || now.getTime() - session.assuranceVerifiedAt.getTime() > 300000 || session.assuranceMethod !== "password" || session.assuranceOrganizationId !== input.organizationId || session.assuranceLevel < 1 || (session.assuranceLockedUntil && session.assuranceLockedUntil > now)) throw new ApplicationError("FRESH_AUTH_REQUIRED", "Confirm your password before deactivating a member.", 403)
    const user = users.find(user => user.id === input.targetUserId)
    if (!user) throw new NotFoundError("User not found.")
    const previous = await tx.auditLog.findFirst({ where: { id: auditId, organizationId: input.organizationId, userId: input.actorId, entityType: "User", action: "DEACTIVATE_USER" } })
    if (previous) {
      const changes = previous.changes as { fingerprint?: string; receipt?: UserDeactivationReceipt } | null
      if (changes?.fingerprint !== fingerprint || changes.receipt?.id !== user.id) throw new IdempotencyConflictError()
      if (user.isActive || !user.isLocked || user.updatedAt.toISOString() !== changes.receipt.updatedAt) throw new ConflictError("This deactivation was recorded, but the account has since changed. Reload its current state.")
      return { ...changes.receipt, replayed: true }
    }
    if (user.updatedAt.toISOString() !== new Date(command.expectedUpdatedAt).toISOString()) throw new ConflictError("The account changed. Refresh and review it before continuing.")
    if (!user.isActive) throw new ConflictError("The account is already inactive. Refresh the member list.")
    if (isRoleCustodian(user, permissionsFor(user.id), now) && !users.some(other => other.id !== user.id && isRoleCustodian(other, permissionsFor(other.id), now))) throw new BusinessRuleError("Keep another active administrator able to manage roles and invite members before deactivating this account.")
    const pendingInvitesCancelled = await cancelRecipientInvitations(tx, { organizationId: input.organizationId, actorId: input.actorId, email: user.email, command })
    const revoked = await tx.session.deleteMany({ where: { userId: user.id } })
    const updatedAt = new Date(Math.max(now.getTime(), user.updatedAt.getTime() + 1))
    await tx.user.update({ where: { id: user.id, organizationId: input.organizationId }, data: { isActive: false, isLocked: true, lockedUntil: null, verificationToken: null, verificationTokenExpires: null, updatedAt } })
    const receipt: UserDeactivationReceipt = { id: user.id, auditId, updatedAt: updatedAt.toISOString(), sessionsRevoked: revoked.count, pendingInvitesCancelled, replayed: false }
    await tx.auditLog.create({ data: { id: auditId, organizationId: input.organizationId, userId: input.actorId, entityType: "User", entityId: user.id, action: "DEACTIVATE_USER", changes: { fingerprint, reason: command.reason, reviewedUpdatedAt: command.expectedUpdatedAt, before: { isActive: user.isActive, isLocked: user.isLocked }, after: { isActive: false, isLocked: true }, receipt } } })
    return receipt
  }, { isolationLevel: "ReadCommitted", timeout: 10000 })
}
