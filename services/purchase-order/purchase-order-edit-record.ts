import "server-only"
import { Prisma, type PurchaseOrder, type PurchaseOrderLine } from "@prisma/client"
import { z } from "zod"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { ConflictError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import type { UpdatePurchaseOrderInput } from "./purchase-order.schemas"

type RevisionOrder = Pick<PurchaseOrder, "id" | "organizationId" | "orderNumber" | "status" | "orderDate" | "expectedDeliveryDate" | "supplierId" | "locationId" | "paymentTerms" | "notes" | "shippingCost" | "subtotal" | "taxAmount" | "discount" | "total" | "updatedAt" | "deletedAt"> & {
  lines: Array<Pick<PurchaseOrderLine, "id" | "itemId" | "orderedQuantity" | "receivedQuantity" | "unitCost" | "discount" | "taxRate" | "taxAmount" | "lineTotal" | "notes">>
}
const decimal = (value: Prisma.Decimal | number | null) => value == null ? null : new Prisma.Decimal(value).toString()

export function purchaseOrderEditSnapshot(order: RevisionOrder) {
  return {
    id: order.id, organizationId: order.organizationId, orderNumber: order.orderNumber, status: order.status,
    orderDate: order.orderDate.toISOString(), expectedDeliveryDate: order.expectedDeliveryDate?.toISOString() ?? null,
    supplierId: order.supplierId, locationId: order.locationId, paymentTerms: order.paymentTerms, notes: order.notes,
    shippingCost: decimal(order.shippingCost), subtotal: decimal(order.subtotal), taxAmount: decimal(order.taxAmount), discount: decimal(order.discount), total: decimal(order.total),
    updatedAt: order.updatedAt?.toISOString() ?? null, deletedAt: order.deletedAt?.toISOString() ?? null,
    lines: order.lines.map(line => ({ id: line.id, itemId: line.itemId, orderedQuantity: decimal(line.orderedQuantity), receivedQuantity: decimal(line.receivedQuantity), unitCost: decimal(line.unitCost), discount: decimal(line.discount), taxRate: decimal(line.taxRate), taxAmount: decimal(line.taxAmount), lineTotal: decimal(line.lineTotal), notes: line.notes })).sort((a, b) => a.id.localeCompare(b.id)),
  }
}

export const purchaseOrderEditRevision = (order: RevisionOrder) => hashBusinessPayload({ version: 1, order: purchaseOrderEditSnapshot(order) })

// Ordinary draft editing requires a live current session, not an additional
// approval/password ceremony. Approval remains its own consequential workflow.
export type PurchaseOrderEditScope = Pick<UpdatePurchaseOrderInput, "organizationId" | "updatedById" | "sessionId" | "sessionToken">
export async function assertPurchaseOrderEditAuthority(tx: Prisma.TransactionClient, input: PurchaseOrderEditScope) {
  const access = await evaluateModuleAccessInTx(tx, { organizationId: input.organizationId, userId: input.updatedById, moduleSlug: "purchasing", surfaceType: "action", surface: "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:updatePurchaseOrder", accessIntent: "write", mode: "enforce" })
  if (!access.allowed) throw new ForbiddenError("Current purchasing access is required to edit this draft.")
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.updatedById} AND "organizationId" = ${input.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" membership ON membership."A" = r.id WHERE membership."B" = ${input.updatedById} AND r."organizationId" = ${input.organizationId} ORDER BY r.id FOR SHARE OF r, membership`
  const actor = await tx.user.findFirst({ where: { id: input.updatedById, organizationId: input.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: input.organizationId }, select: { permissions: true } } } })
  const now = new Date(), permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(permissions, "purchases.orders.read") || !hasRbacPermission(permissions, "purchases.orders.update")) throw new ForbiddenError("Current purchase-order editing authority is required.")
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${input.sessionId} AND "userId" = ${input.updatedById} FOR SHARE`
  const session = await tx.session.findFirst({ where: { id: input.sessionId, token: input.sessionToken, userId: input.updatedById, expiresAt: { gt: new Date() } }, select: { id: true } })
  if (!session) throw new ForbiddenError("Your session expired or was revoked. Sign in before saving this draft.")
}

const receiptSchema = z.object({ requestReference: z.string().min(1), orderId: z.string().min(1), revision: z.string().regex(/^[a-f0-9]{64}$/), savedAt: z.string().datetime() }).strict()
export type PurchaseOrderEditReceipt = z.infer<typeof receiptSchema> & { replayed: boolean }
export const purchaseOrderEditEventKey = (key: string) => "purchase-order-edit:" + key

export async function replayPurchaseOrderEdit(tx: Prisma.TransactionClient, input: UpdatePurchaseOrderInput, commandHash: string): Promise<PurchaseOrderEditReceipt | null> {
  const event = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: input.organizationId, eventSource: "INTERNAL", idempotencyKey: purchaseOrderEditEventKey(input.idempotencyKey) } } })
  if (!event) return null
  const payload = event.payload as Record<string, unknown> | null
  if (event.eventType !== "purchase_order.draft_updated" || event.status !== "APPLIED" || event.schemaVersion !== 1 || event.sourceType !== null || event.sourceId !== input.id || event.actorId !== input.updatedById || payload?.entityType !== "PurchaseOrder" || payload.commandHash !== commandHash) throw new IdempotencyConflictError("This save reference belongs to a different request.")
  const result = receiptSchema.safeParse(payload.result)
  if (event.payloadHash !== hashBusinessPayload(event.payload) || !result.success || result.data.orderId !== input.id || result.data.requestReference !== input.idempotencyKey || result.data.savedAt !== event.occurredAt.toISOString()) throw new ConflictError("The saved draft receipt could not be verified.")
  return { ...result.data, replayed: true }
}
