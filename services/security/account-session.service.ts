import "server-only"
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { ApplicationError, ConflictError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { accountSessionCommand, accountSessionReceipt, type AccountSessionCommand, type AccountSessionPreview } from "./account-session-input"

type Scope = { actorId: string; organizationId: string; sessionId: string; sessionToken: string }
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
const auditWhere = (scope: Scope) => ({ organizationId: scope.organizationId, userId: scope.actorId, entityType: "AccountSessions", entityId: scope.actorId, action: "AUTH_SESSION_REVOKED" })

async function authorize(tx: Prisma.TransactionClient, scope: Scope, now: Date) {
  if (!scope.actorId || !scope.organizationId || !scope.sessionId || !scope.sessionToken) throw new ForbiddenError()
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(expandPermissions(actor.roles.flatMap(role => role.permissions)), "profile.read")) throw new ForbiddenError()
  const current = await tx.session.findFirst({ where: { id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId, expiresAt: { gt: now } }, select: { id: true } })
  if (!current) throw new ApplicationError("AUTH_REQUIRED", "Sign in again to manage your sessions.", 401)
}

async function snapshot(tx: Prisma.TransactionClient, scope: Scope, now: Date) {
  const rows = await tx.session.findMany({ where: { userId: scope.actorId, id: { not: scope.sessionId }, expiresAt: { gt: now } }, orderBy: { id: "asc" }, select: { id: true, createdAt: true, expiresAt: true, userAgent: true } })
  const others = rows.map(row => ({ id: row.id, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(), device: row.userAgent?.slice(0, 300) ?? null }))
  return { actorId: scope.actorId, organizationId: scope.organizationId, sessionId: scope.sessionId, checkedAt: now.toISOString(), snapshotHash: hash({ actorId: scope.actorId, organizationId: scope.organizationId, sessionId: scope.sessionId, others }), others }
}

export async function getAccountSessionPreview(scope: Scope): Promise<AccountSessionPreview> {
  return db.$transaction(async tx => {
    const now = new Date()
    await authorize(tx, scope, now)
    const preview = await snapshot(tx, scope, now)
    const records = await tx.auditLog.findMany({ where: auditWhere(scope), orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10, select: { id: true, changes: true } })
    const history = records.map(record => {
      const receipt = accountSessionReceipt.safeParse((record.changes as Prisma.JsonObject | null)?.receipt)
      if (!receipt.success || receipt.data.id !== record.id || receipt.data.actorId !== scope.actorId || receipt.data.organizationId !== scope.organizationId) throw new ApplicationError("INTERNAL_ERROR", "Session history could not be verified.", 500)
      return receipt.data
    })
    return { ...preview, history }
  }, { isolationLevel: "RepeatableRead", timeout: 10000 })
}

export async function revokeReviewedAccountSessions(scope: Scope, input: AccountSessionCommand) {
  const parsed = accountSessionCommand.safeParse(input)
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Review your sessions before signing them out.", 400)
  const command = parsed.data
  const id = "sessionrevoke_" + hash({ actorId: scope.actorId, organizationId: scope.organizationId, sessionId: scope.sessionId, requestId: command.requestId })
  return db.$transaction(async tx => {
    // All commands for this account serialize before reading the reviewed set.
    // Match organization/member lock order used by account administration.
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId} FOR SHARE`
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM roles WHERE "organizationId" = ${scope.organizationId} ORDER BY id FOR SHARE`
    await tx.$queryRaw`SELECT membership."A" FROM "_UserRoles" membership WHERE membership."B" = ${scope.actorId} ORDER BY membership."A" FOR SHARE`
    await tx.$queryRaw`SELECT id FROM sessions WHERE "userId" = ${scope.actorId} ORDER BY id FOR UPDATE`
    const now = new Date()
    await authorize(tx, scope, now)
    const prior = await tx.auditLog.findFirst({ where: { id, ...auditWhere(scope) }, select: { changes: true } })
    if (prior) {
      const changes = prior.changes as Prisma.JsonObject | null
      if (changes?.requestHash !== hash(command)) throw new IdempotencyConflictError()
      const receipt = accountSessionReceipt.safeParse(changes.receipt)
      if (!receipt.success || receipt.data.id !== id || receipt.data.actorId !== scope.actorId || receipt.data.organizationId !== scope.organizationId || receipt.data.requestId !== command.requestId) throw new ApplicationError("INTERNAL_ERROR", "The saved session result needs review.", 500)
      return { ...receipt.data, replayed: true }
    }
    const preview = await snapshot(tx, scope, now)
    if (preview.snapshotHash !== command.expectedHash) throw new ConflictError("Your sessions changed. Review the current list before continuing.")
    if (!preview.others.length) throw new ApplicationError("VALIDATION_ERROR", "There are no other active sessions to sign out.", 400)
    const deleted = await tx.session.deleteMany({ where: { userId: scope.actorId, AND: [{ id: { in: preview.others.map(row => row.id) } }, { id: { not: scope.sessionId } }] } })
    const receipt = accountSessionReceipt.parse({ id, actorId: scope.actorId, organizationId: scope.organizationId, requestId: command.requestId, completedAt: now.toISOString(), revokedCount: deleted.count, reviewedCount: preview.others.length })
    // Failure to save the evidence rolls back session deletion in the same transaction.
    await tx.auditLog.create({ data: { id, ...auditWhere(scope), changes: { requestHash: hash(command), receipt, reviewedHash: preview.snapshotHash, preservedRequestingSession: true } } })
    return { ...receipt, replayed: false }
  }, { isolationLevel: "ReadCommitted", timeout: 10000 })
}
