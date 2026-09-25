import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { purchaseOrderEditSnapshot } from "./purchase-order-edit-record"
import { purchaseApprovalRequestSchema, purchaseApprovalReceiptSchema } from "./purchase-order-approval-contracts"

export const purchaseApprovalScopeSchema = z.object({ organizationId: z.string().min(1), actorId: z.string().min(1), sessionId: z.string().min(1), sessionToken: z.string().min(1) }).strict()
export type PurchaseApprovalScope = z.infer<typeof purchaseApprovalScopeSchema>
export const purchaseApprovalCommandSchema = purchaseApprovalRequestSchema.merge(purchaseApprovalScopeSchema)
type ApprovalOrder = Parameters<typeof purchaseOrderEditSnapshot>[0] & { createdById: string | null; approvedById: string | null; approvedAt: Date | null }
export const purchaseApprovalSnapshot = (order: ApprovalOrder) => ({ ...purchaseOrderEditSnapshot(order), createdById: order.createdById, approvedById: order.approvedById, approvedAt: order.approvedAt?.toISOString() ?? null })
export const purchaseApprovalRevision = (order: ApprovalOrder) => hashBusinessPayload({ version: 1, order: purchaseApprovalSnapshot(order) })
export const purchaseApprovalEventKey = (key: string) => `purchase-order-approval:${key}`

export function assertPurchaseApprovalOrder(order: ApprovalOrder, actorId: string) {
  if (order.status !== "SUBMITTED") throw new BusinessRuleError("Only a submitted purchase order can be approved.")
  if (!order.lines.length) throw new BusinessRuleError("Cannot approve a purchase order without line items")
  if (!order.createdById || order.createdById === actorId) throw new BusinessRuleError("A known requester and a different authorized approver are required.", "SOD_VIOLATION")
}

export async function purchaseApprovalAuthority(tx: Prisma.TransactionClient, scope: PurchaseApprovalScope) {
  const access = await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "purchasing", surfaceType: "action", surface: "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:approvePurchaseOrder", accessIntent: "write", mode: "enforce" })
  if (!access.allowed) throw new ForbiddenError("Current purchasing access is required.")
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" membership ON membership."A" = r.id WHERE membership."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, membership`
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, new Date()) || !hasRbacPermission(permissions, "purchases.orders.read") || !hasRbacPermission(permissions, "purchases.orders.approve")) throw new ForbiddenError("Current purchase-order approval authority is required.")
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId} AND "userId" = ${scope.actorId} FOR SHARE`
  const now = new Date()
  const session = await tx.session.findFirst({ where: { id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId, expiresAt: { gt: now } }, select: { assuranceOrganizationId: true, assuranceVerifiedAt: true, assuranceLevel: true, assuranceMethod: true, assuranceLockedUntil: true } })
  if (!session) throw new ForbiddenError("Your session expired or was revoked. Sign in again.")
  const fresh = session.assuranceOrganizationId === scope.organizationId && session.assuranceMethod === "password" && session.assuranceLevel >= 1 && session.assuranceVerifiedAt != null && session.assuranceVerifiedAt <= now && now.getTime() - session.assuranceVerifiedAt.getTime() <= 300000 && (!session.assuranceLockedUntil || session.assuranceLockedUntil <= now)
  return { fresh }
}

export async function replayPurchaseApproval(tx: Prisma.TransactionClient, orderId: string, scope: PurchaseApprovalScope, key: string, commandHash: string) {
  const event = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: scope.organizationId, eventSource: "INTERNAL", idempotencyKey: purchaseApprovalEventKey(key) } } })
  if (!event) return null
  const payload = event.payload as Record<string, unknown> | null
  if (event.eventType !== "purchase_order.approved" || event.schemaVersion !== 1 || event.sourceType !== null || event.sourceId !== orderId || event.actorId !== scope.actorId || payload?.entityType !== "PurchaseOrder" || payload.commandHash !== commandHash) throw new IdempotencyConflictError("This approval reference belongs to another request.")
  const result = purchaseApprovalReceiptSchema.safeParse(payload.result)
  if (event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || !result.success || result.data.orderId !== orderId || result.data.approvedById !== scope.actorId || result.data.requestReference !== key || result.data.approvedAt !== event.occurredAt.toISOString()) throw new ConflictError("The approval record could not be verified.")
  return { ...result.data, replayed: true }
}
