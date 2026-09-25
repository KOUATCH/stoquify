import "server-only"
import { createHash } from "node:crypto"
import { db } from "@/prisma/db"
import { ConflictError } from "@/services/_shared/action-errors"

/** The caller must obtain this credential through Better Auth's signed-cookie verification.
 * Never pass a user ID, session ID or token supplied in a request body here.
 * Signing out does not require an active organization, account or role grant.
 */
export async function revokePresentedSession(token: string) {
  return db.$transaction(async tx => {
    const initial = await tx.session.findUnique({ where: { token }, select: { id: true, userId: true, user: { select: { organizationId: true } } } })
    if (!initial) return { serverSession: "absent" as const }

    // Follow account-management lock order, including inactive organizations.
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${initial.user.organizationId} FOR SHARE`
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${initial.userId} FOR SHARE`
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${initial.id} AND token = ${token} FOR UPDATE`
    const current = await tx.session.findUnique({ where: { token }, select: { id: true, userId: true, user: { select: { organizationId: true } } } })
    if (!current) return { serverSession: "absent" as const }
    if (current.id !== initial.id || current.userId !== initial.userId || current.user.organizationId !== initial.user.organizationId) throw new ConflictError("The account session changed. Retry sign-out.")

    const deleted = await tx.session.deleteMany({ where: { id: current.id, token, userId: current.userId } })
    if (deleted.count !== 1) throw new ConflictError("The account session changed. Retry sign-out.")
    const completedAt = new Date().toISOString()
    const receiptId = "selfsignout_" + createHash("sha256").update(current.id).digest("hex")
    await tx.auditLog.create({ data: {
      id: receiptId, entityType: "SecurityEvent", entityId: current.id,
      action: "auth.session.signed_out", userId: current.userId, organizationId: current.user.organizationId,
      changes: { sessionId: current.id, completedAt, source: "current-browser-sign-out", outcome: "revoked" },
    } })
    return { serverSession: "revoked" as const, receiptId, completedAt }
  }, { isolationLevel: "ReadCommitted", timeout: 10000 })
}
