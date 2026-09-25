import "server-only"
import { Prisma } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"
import { commitSaleSchema } from "./pos.schemas"

export type CheckoutScope = { organizationId: string; userId: string; sessionId: string }
export const CHECKOUT_LEASE_MS = 60_000

export function checkoutScope(scope: CheckoutScope) {
  return { sessionId: scope.sessionId, organizationId: scope.organizationId, actorId: scope.userId }
}

export async function assertCheckoutLeaseInTx(tx: Prisma.TransactionClient, scope: CheckoutScope, leaseId: string, allowPending = false, allowReviewed = false) {
  const workspace = await tx.pOSCheckoutWorkspace.findFirst({ where: checkoutScope(scope) })
  if (!workspace || workspace.leaseId !== leaseId || !workspace.leaseExpiresAt || workspace.leaseExpiresAt <= new Date()) {
    throw new ConflictError("POS_CHECKOUT_OWNERSHIP_REQUIRED")
  }
  const reviewed = workspace.pendingRequest && typeof workspace.pendingRequest === "object" && !Array.isArray(workspace.pendingRequest) && workspace.pendingRequest._cartReview === true
  if (workspace.pendingRequest && !allowPending && !(allowReviewed && reviewed)) throw new ConflictError("POS_CHECKOUT_RECOVERY_REQUIRED")
  const updated = await tx.pOSCheckoutWorkspace.updateMany({
    where: { ...checkoutScope(scope), leaseId, leaseExpiresAt: workspace.leaseExpiresAt },
    data: { leaseExpiresAt: new Date(Date.now() + CHECKOUT_LEASE_MS) },
  })
  if (updated.count !== 1) throw new ConflictError("POS_CHECKOUT_OWNERSHIP_REQUIRED")
  return workspace
}

export async function assertNoQueuedCheckoutInTx(tx: Prisma.TransactionClient, scope: CheckoutScope) {
  const queued = await tx.pOSOfflineEvent.count({ where: {
    organizationId: scope.organizationId, sessionId: scope.sessionId,
    status: { in: ["PENDING_REPLAY", "RECORDED", "BLOCKED", "CONFLICT", "QUARANTINED"] },
  } })
  if (queued) throw new ConflictError("POS_CHECKOUT_OFFLINE_PENDING")
  const offlineBlockers = await tx.pOSOfflineSyncCertificate.count({ where: {
    organizationId: scope.organizationId, closeBlocker: true,
    terminal: { sessions: { some: { id: scope.sessionId, organizationId: scope.organizationId } } },
  } })
  if (offlineBlockers) throw new ConflictError("POS_CHECKOUT_OFFLINE_PENDING")
}

export async function retireShiftDraftsInTx(tx: Prisma.TransactionClient, scope: CheckoutScope) {
  await assertNoQueuedCheckoutInTx(tx, scope)
  const claimed = await tx.pOSCommitResult.count({ where: {
    organizationId: scope.organizationId, actorId: scope.userId, sessionId: scope.sessionId, status: "CLAIMED",
  } })
  if (claimed) throw new ConflictError("POS_CHECKOUT_RECOVERY_REQUIRED")
  const retired = await tx.salesOrder.updateMany({ where: {
    organizationId: scope.organizationId, createdById: scope.userId, sessionId: scope.sessionId,
    channel: "POS", status: "DRAFT", posCartState: "ACTIVE", deletedAt: null,
  }, data: { posCartState: "RETIRED", version: { increment: 1 } } })
  if (retired.count) await tx.auditLog.create({ data: {
    organizationId: scope.organizationId, userId: scope.userId, entityType: "POSSession", entityId: scope.sessionId,
    action: "POS_SHIFT_DRAFTS_RETIRED", changes: { count: retired.count, reason: "SHIFT_CLOSED", contentsPreserved: true },
  } })
  await tx.pOSCheckoutWorkspace.updateMany({ where: checkoutScope(scope), data: { leaseId: null, leaseExpiresAt: null } })
}

export function retainedCheckoutRequest(value: Prisma.JsonValue | null) {
  return value === null ? null : commitSaleSchema.parse(value)
}
