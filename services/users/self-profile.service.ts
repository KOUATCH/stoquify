import "server-only"
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { ApplicationError, ConflictError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { selfProfileCommand, selfProfileReceipt, type SelfProfileCommand, type SelfProfileRead } from "./self-profile-input"

export type SelfProfileScope = { actorId: string; organizationId: string; sessionId: string; sessionToken: string }
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
const selection = { id: true, name: true, firstName: true, lastName: true, jobTitle: true, email: true, emailVerified: true, phone: true, image: true, updatedAt: true } as const
type Profile = Prisma.UserGetPayload<{ select: typeof selection }>
const fieldsOf = (user: Profile) => ({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", jobTitle: user.jobTitle ?? "" })
const revision = (user: Profile, scope: SelfProfileScope) => hash({ actorId: scope.actorId, organizationId: scope.organizationId, name: user.name, ...fieldsOf(user), updatedAt: user.updatedAt.toISOString() })
const auditWhere = (scope: SelfProfileScope) => ({ entityType: "SelfProfile", entityId: scope.actorId, action: "SELF_PROFILE_UPDATED", userId: scope.actorId, organizationId: scope.organizationId })

async function authority(tx: Prisma.TransactionClient, scope: SelfProfileScope, write = false) {
  if (!scope.actorId || !scope.organizationId || !scope.sessionId || !scope.sessionToken) throw new ForbiddenError()
  const now = new Date(), actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(permissions, "profile.read") || (write && !hasRbacPermission(permissions, "profile.update"))) throw new ForbiddenError("Your current access does not allow this profile operation.")
  const session = await tx.session.findFirst({ where: { id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId, expiresAt: { gt: now } }, select: { id: true } })
  if (!session) throw new ApplicationError("AUTH_REQUIRED", "Sign in again before continuing.", 401)
  return { canUpdate: hasRbacPermission(permissions, "profile.update") }
}

export async function getSelfProfile(scope: SelfProfileScope): Promise<SelfProfileRead> {
  return db.$transaction(async tx => {
    const access = await authority(tx, scope)
    const user = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId }, select: selection })
    if (!user) throw new ForbiddenError()
    const records = await tx.auditLog.findMany({ where: auditWhere(scope), orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10, select: { id: true, changes: true } })
    const history = records.map(row => {
      const parsed = selfProfileReceipt.safeParse((row.changes as Prisma.JsonObject | null)?.receipt)
      if (!parsed.success || parsed.data.id !== row.id || parsed.data.actorId !== scope.actorId || parsed.data.organizationId !== scope.organizationId) throw new ApplicationError("INTERNAL_ERROR", "Profile history could not be verified.", 500)
      return parsed.data
    })
    return { actorId: scope.actorId, organizationId: scope.organizationId, fields: fieldsOf(user), displayName: user.name ?? [user.firstName, user.lastName].filter(Boolean).join(" "), email: user.email, emailVerified: user.emailVerified, phone: user.phone, image: user.image, ...access, checkedAt: new Date().toISOString(), updatedAt: user.updatedAt.toISOString(), snapshotHash: revision(user, scope), history }
  }, { isolationLevel: "RepeatableRead", timeout: 10000 })
}

export async function updateSelfProfile(scope: SelfProfileScope, input: SelfProfileCommand) {
  const parsed = selfProfileCommand.safeParse(input)
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check your profile details and review the current account record.", 400)
  const command = parsed.data, id = "selfprofile_" + hash({ actorId: scope.actorId, organizationId: scope.organizationId, requestId: command.requestId })
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId} FOR SHARE`
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
    await tx.$queryRaw`SELECT r.id FROM roles r INNER JOIN "_UserRoles" membership ON membership."A" = r.id WHERE membership."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, membership`
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId} AND token = ${scope.sessionToken} AND "userId" = ${scope.actorId} FOR SHARE`
    await authority(tx, scope, true)
    const prior = await tx.auditLog.findFirst({ where: { id, ...auditWhere(scope) }, select: { changes: true } })
    if (prior) {
      const changes = prior.changes as Prisma.JsonObject | null
      if (changes?.requestHash !== hash(command)) throw new IdempotencyConflictError()
      const receipt = selfProfileReceipt.safeParse(changes.receipt)
      if (!receipt.success || receipt.data.id !== id || receipt.data.actorId !== scope.actorId || receipt.data.organizationId !== scope.organizationId || receipt.data.requestId !== command.requestId) throw new ApplicationError("INTERNAL_ERROR", "The saved profile result needs review.", 500)
      return { ...receipt.data, replayed: true }
    }
    const before = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId }, select: selection })
    if (!before) throw new ForbiddenError()
    if (revision(before, scope) !== command.expectedHash) throw new ConflictError("The account record changed. Reload it and review your edits.")
    const values = { ...command.fields, name: [command.fields.firstName, command.fields.lastName].filter(Boolean).join(" ") }
    const changedFields = (["firstName", "lastName", "jobTitle", "name"] as const).filter(key => (before[key] ?? "") !== values[key])
    const now = new Date()
    if (changedFields.length) await tx.user.update({ where: { id: scope.actorId }, data: { ...values, lastName: values.lastName || null, jobTitle: values.jobTitle || null, updatedAt: new Date(Math.max(now.getTime(), before.updatedAt.getTime() + 1)) } })
    const receipt = selfProfileReceipt.parse({ id, actorId: scope.actorId, organizationId: scope.organizationId, requestId: command.requestId, savedAt: now.toISOString(), fields: command.fields, displayName: values.name, changedFields })
    await tx.auditLog.create({ data: { id, ...auditWhere(scope), changes: { before: { ...fieldsOf(before), name: before.name }, receipt, requestHash: hash(command), reviewedHash: command.expectedHash } } })
    return { ...receipt, replayed: false }
  }, { isolationLevel: "ReadCommitted", timeout: 10000 })
}
