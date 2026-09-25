import "server-only"
import { z } from "zod"
import { db } from "@/prisma/db"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { purchaseLifecycleAuthority, purchaseLifecycleScopeSchema, type PurchaseLifecycleScope } from "./purchase-order-lifecycle"
import { purchaseLifecycleEventType, purchaseLifecycleReceiptSchema } from "./purchase-order-lifecycle-contracts"

export async function readPurchaseOrderDecisionHistory(lookupInput: string, scopeInput: PurchaseLifecycleScope) {
  const lookup = z.string().trim().min(1).max(191).parse(lookupInput), scope = purchaseLifecycleScopeSchema.parse(scopeInput)
  return db.$transaction(async tx => {
    await purchaseLifecycleAuthority(tx, scope, "history")
    const orders = await tx.purchaseOrder.findMany({ where: { organizationId: scope.organizationId, OR: [{ id: lookup }, { orderNumber: lookup }] }, select: { id: true, orderNumber: true, status: true, deletedAt: true }, take: 2 })
    if (!orders.length) throw new NotFoundError("Purchase order not found")
    if (orders.length !== 1) throw new ConflictError("Use the exact order identifier to resolve this ambiguous reference.")
    const order = orders[0]
    const events = await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, sourceId: order.id, eventSource: "INTERNAL", idempotencyKey: { startsWith: "purchase-order-lifecycle:" }, eventType: { in: ["submit", "cancel", "complete", "archive"].map(kind => purchaseLifecycleEventType(kind as "submit" | "cancel" | "complete" | "archive")) } }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 101 })
    const decisions = events.slice(0, 100).map(event => {
      const payload = event.payload as Record<string, unknown> | null, result = purchaseLifecycleReceiptSchema.safeParse(payload?.result)
      if (!result.success || event.sourceType !== null || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || payload?.entityType !== "PurchaseOrder" || event.eventType !== purchaseLifecycleEventType(result.data.kind) || result.data.orderId !== order.id || result.data.actorId !== event.actorId || result.data.recordedAt !== event.occurredAt.toISOString() || event.idempotencyKey !== `purchase-order-lifecycle:${result.data.requestReference}` || !(payload.reason === null || typeof payload.reason === "string")) throw new ConflictError("The retained purchase-order evidence could not be verified.")
      return { ...result.data, reason: payload.reason as string | null }
    })
    return { organizationId: scope.organizationId, actorId: scope.actorId, orderId: order.id, orderNumber: order.orderNumber, archived: !!order.deletedAt, decisions, hasEarlier: events.length > 100 }
  }, { isolationLevel: "ReadCommitted", timeout: 15000 })
}
