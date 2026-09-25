import "server-only"
import { Prisma } from "@prisma/client"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { ConflictError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { purchaseApprovalScopeSchema, type PurchaseApprovalScope } from "./purchase-order-approval"
import { purchaseLifecycleEventType, purchaseLifecyclePermission, purchaseLifecycleReceiptSchema, type PurchaseLifecycleKind } from "./purchase-order-lifecycle-contracts"

export { purchaseApprovalScopeSchema as purchaseLifecycleScopeSchema }
export type PurchaseLifecycleScope = PurchaseApprovalScope
export const purchaseLifecycleEventKey = (key: string) => `purchase-order-lifecycle:${key}`

// Current authority is required for new effects and for recovery of a retained receipt.
export async function purchaseLifecycleAuthority(tx: Prisma.TransactionClient, scope: PurchaseLifecycleScope, kind: PurchaseLifecycleKind | "history") {
  const access = await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "purchasing", surfaceType: "action", surface: kind === "history" ? "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:getPurchaseOrderDecisionHistory" : "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:executePurchaseOrderLifecycle", accessIntent: kind === "history" ? "read" : "write", mode: "enforce" })
  if (!access.allowed) throw new ForbiddenError("Current purchasing access is required.")
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" membership ON membership."A" = r.id WHERE membership."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, membership`
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const now = new Date(), permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(permissions, "purchases.orders.read") || (kind !== "history" && !hasRbacPermission(permissions, purchaseLifecyclePermission(kind)))) throw new ForbiddenError("Current purchase-order authority is required.")
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId} AND "userId" = ${scope.actorId} FOR SHARE`
  const session = await tx.session.findFirst({ where: { id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId, expiresAt: { gt: now } }, select: { assuranceOrganizationId: true, assuranceVerifiedAt: true, assuranceLevel: true, assuranceMethod: true, assuranceLockedUntil: true } })
  if (!session) throw new ForbiddenError("Your session expired or was revoked. Sign in again.")
  const fresh = session.assuranceOrganizationId === scope.organizationId && session.assuranceMethod === "password" && session.assuranceLevel >= 1 && session.assuranceVerifiedAt != null && session.assuranceVerifiedAt <= now && now.getTime() - session.assuranceVerifiedAt.getTime() <= 300000 && (!session.assuranceLockedUntil || session.assuranceLockedUntil <= now)
  return { requiresFreshAuth: (kind === "cancel" || kind === "archive") && !fresh }
}

export async function replayPurchaseLifecycle(tx: Prisma.TransactionClient, orderId: string, scope: PurchaseLifecycleScope, kind: PurchaseLifecycleKind, key: string, commandHash: string) {
  const event = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: scope.organizationId, eventSource: "INTERNAL", idempotencyKey: purchaseLifecycleEventKey(key) } } })
  if (!event) return null
  const payload = event.payload as Record<string, unknown> | null
  if (event.eventType !== purchaseLifecycleEventType(kind) || event.schemaVersion !== 1 || event.sourceType !== null || event.sourceId !== orderId || event.actorId !== scope.actorId || payload?.entityType !== "PurchaseOrder" || payload.commandHash !== commandHash) throw new IdempotencyConflictError("This reference belongs to another purchase-order request.")
  const result = purchaseLifecycleReceiptSchema.safeParse(payload.result)
  if (event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || !result.success || result.data.orderId !== orderId || result.data.actorId !== scope.actorId || result.data.kind !== kind || result.data.requestReference !== key || result.data.recordedAt !== event.occurredAt.toISOString()) throw new ConflictError("The purchase-order decision record could not be verified.")
  return { ...result.data, replayed: true }
}
