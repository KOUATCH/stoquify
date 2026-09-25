import "server-only"
import type { Prisma, Session } from "@prisma/client"
import { db } from "@/prisma/db"
import { verifyPassword } from "@/lib/password"
import { CREDENTIAL_PROVIDER_ID, hashPolicyCompliantPassword, syncUserCredentialPassword } from "@/lib/security/auth-credentials"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { SecurityEventType } from "@/lib/security/audit-log"
import { passwordChangeRequest } from "./password-change-input"

export type PasswordChangeInput = {
  actor: { id: string; organizationId: string }
  actorPermissions: readonly string[]
  targetUserId: string
  oldPassword: string
  newPassword: string
  session: { id: string; token: string }
}
type UserState = {
  id: string; organizationId: string; email: string; password: string | null
  isActive: boolean; isVerified: boolean; emailVerified: boolean; isLocked: boolean; lockedUntil: Date | null
  verificationToken: string | null
}
type Credential = { id: string; userId: string; accountId: string; password: string | null }
const userSelect = { id: true, organizationId: true, email: true, password: true, isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, verificationToken: true } as const
const denied = (status: number, code: string, error: string) => ({ status, code, error, data: null })
const activeActor = (user: UserState | undefined, organizationId: string) => Boolean(user?.isActive && user.organizationId === organizationId && (user.isVerified || user.emailVerified) && (!user.isLocked || (user.lockedUntil && user.lockedUntil <= new Date())))
function sessionFailure(session: Session | null | undefined, input: PasswordChangeInput) {
  const now = Date.now()
  if (!session || session.id !== input.session.id || session.token !== input.session.token || session.userId !== input.actor.id || session.expiresAt.getTime() <= now) return denied(401, "AUTH_REQUIRED", "Sign in again before changing credentials.")
  if (!session.assuranceVerifiedAt || session.assuranceVerifiedAt.getTime() > now || now - session.assuranceVerifiedAt.getTime() > 300000 || session.assuranceOrganizationId !== input.actor.organizationId || session.assuranceMethod !== "password" || session.assuranceLevel < 1 || (session.assuranceLockedUntil && session.assuranceLockedUntil.getTime() > now)) return denied(403, "FRESH_AUTH_REQUIRED", "Confirm your current password before continuing.")
  return null
}
function validCredentials(rows: Credential[], userId: string) {
  return rows.length <= 1 && rows.every(row => row.userId === userId && row.accountId === userId)
}
function generation(user: UserState, credentials: Credential[]) {
  return JSON.stringify([user.email, user.password, credentials.map(row => [row.id, row.userId, row.accountId, row.password])])
}

export async function changeUserPasswordWorkflow(input: PasswordChangeInput) {
  const parsed = passwordChangeRequest.safeParse(input)
  if (!parsed.success || !input.actor?.id || !input.actor.organizationId || !input.session?.id || !input.session.token) return denied(400, "VALIDATION_ERROR", "Check the password-change details.")
  const { targetUserId, oldPassword, newPassword } = parsed.data
  const { organizationId, id: actorId } = input.actor
  const selfService = actorId === targetUserId
  const permission = selfService ? "profile.password.update" : "users.password.reset"
  if (!hasRbacPermission(input.actorPermissions, permission)) return denied(403, "FORBIDDEN", "You cannot change these credentials.")
  const actor = await db.user.findFirst({ where: { id: actorId, organizationId }, select: { ...userSelect, organization: { select: { isActive: true, deletedAt: true } }, roles: { where: { organizationId }, select: { permissions: true } } } })
  if (!activeActor(actor ?? undefined, organizationId) || !actor?.organization.isActive || actor.organization.deletedAt || !hasRbacPermission(expandPermissions(actor.roles.flatMap(role => role.permissions)), permission)) return denied(403, "FORBIDDEN", "Your current access does not allow this change.")
  const firstSessionFailure = sessionFailure(await db.session.findFirst({ where: { id: input.session.id, token: input.session.token, userId: actorId } }), input)
  if (firstSessionFailure) return firstSessionFailure
  const target = selfService ? actor : await db.user.findFirst({ where: { id: targetUserId, organizationId }, select: userSelect })
  if (!target || !target.isActive || target.organizationId !== organizationId || target.id !== targetUserId) return denied(404, "USER_UNAVAILABLE", "This account is unavailable for a password change.")
  const credentials = await db.account.findMany({ where: { providerId: CREDENTIAL_PROVIDER_ID, OR: [{ userId: targetUserId }, { accountId: targetUserId }] }, orderBy: { id: "asc" }, take: 2, select: { id: true, userId: true, accountId: true, password: true } })
  if (!validCredentials(credentials, targetUserId)) return denied(409, "CREDENTIAL_REVIEW_REQUIRED", "The account's credential record needs administrator review.")
  const expectedGeneration = generation(target, credentials), currentHash = credentials[0]?.password ?? target.password
  if (selfService && (!oldPassword || !currentHash || !await verifyPassword(oldPassword, currentHash))) return denied(403, "INVALID_CREDENTIALS", "The current password could not be verified.")
  if (currentHash && await verifyPassword(newPassword, currentHash)) return denied(400, "RECENTLY_USED", "Choose a password different from the current password.")
  const policy = await hashPolicyCompliantPassword({ password: newPassword, userId: targetUserId, email: target.email })
  if (!policy.ok) return denied(400, policy.code, policy.message)

  try {
    return await db.$transaction(async tx => {
      // Password verification/policy/hash work is complete before row locks.
      const organizations = await tx.$queryRaw<{ isActive: boolean; deletedAt: Date | null }[]>`
        SELECT "isActive", "deletedAt" FROM organizations WHERE id = ${organizationId} FOR SHARE`
      if (!organizations[0]?.isActive || organizations[0].deletedAt) return denied(403, "FORBIDDEN", "The organization is no longer available.")
      // Stable ordering avoids two administrators locking each other's accounts in reverse order.
      const users = await tx.$queryRaw<UserState[]>`
        SELECT id, "organizationId", email, password, "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil", "verificationToken"
        FROM users WHERE "organizationId" = ${organizationId} AND id IN (${actorId}, ${targetUserId}) ORDER BY id FOR UPDATE`
      const currentActor = users.find(row => row.id === actorId), currentTarget = users.find(row => row.id === targetUserId)
      if (!activeActor(currentActor, organizationId)) return denied(403, "FORBIDDEN", "Your account authority changed. Sign in again.")
      if (!currentTarget?.isActive || currentTarget.organizationId !== organizationId) return denied(404, "USER_UNAVAILABLE", "This account is no longer available.")
      const roles = await tx.$queryRaw<{ permissions: string[] }[]>`
        SELECT r.permissions FROM roles r INNER JOIN "_UserRoles" membership ON membership."A" = r.id
        WHERE membership."B" = ${actorId} AND r."organizationId" = ${organizationId}
        ORDER BY r.id FOR SHARE OF r, membership`
      if (!hasRbacPermission(expandPermissions(roles.flatMap(row => row.permissions)), permission)) return denied(403, "FORBIDDEN", "Your permission changed. Refresh your session.")
      const currentCredentials = await tx.$queryRaw<Credential[]>`
        SELECT id, "userId", "accountId", password FROM accounts
        WHERE "providerId" = ${CREDENTIAL_PROVIDER_ID} AND ("userId" = ${targetUserId} OR "accountId" = ${targetUserId})
        ORDER BY id LIMIT 2 FOR UPDATE`
      if (!validCredentials(currentCredentials, targetUserId) || generation(currentTarget, currentCredentials) !== expectedGeneration) return denied(409, "CREDENTIAL_CHANGED", "The account changed during this request. Sign in again before retrying.")
      const sessions = await tx.$queryRaw<Session[]>`
        SELECT * FROM sessions WHERE id = ${input.session.id} AND token = ${input.session.token} AND "userId" = ${actorId} FOR UPDATE`
      const finalSessionFailure = sessionFailure(sessions[0], input)
      if (finalSessionFailure) return finalSessionFailure
      await syncUserCredentialPassword(tx, { userId: targetUserId, passwordHash: policy.hash, revokeSessions: true })
      // A completed authenticated change invalidates earlier reset links; retain unrelated OTPs.
      if (/^[a-z0-9]{32}$/.test(currentTarget.verificationToken ?? "")) await tx.user.update({ where: { id: targetUserId }, data: { verificationToken: null, verificationTokenExpires: null } })
      await tx.auditLog.create({ data: { organizationId, userId: actorId, entityType: "SecurityEvent", entityId: targetUserId, action: SecurityEventType.AUTH_PASSWORD_CHANGED, changes: { targetUserId, selfService, sessionsRevoked: true, resetLinksInvalidated: /^[a-z0-9]{32}$/.test(currentTarget.verificationToken ?? "") } as Prisma.InputJsonValue } })
      return { status: 200, code: null, error: null, data: { selfService, sessionsRevoked: true } }
    }, { isolationLevel: "ReadCommitted", timeout: 10000 })
  } catch (error) {
    if ((error as { code?: string })?.code === "P2034" || (error as { code?: string })?.code === "P2002") return denied(409, "CREDENTIAL_CHANGED", "A concurrent account change prevented this request. Sign in again before retrying.")
    throw error
  }
}
