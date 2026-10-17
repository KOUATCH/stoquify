"use server"

import { z } from "zod"
import { revalidateTag } from "next/cache"
import { isRbacError, requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { ApplicationError, ForbiddenError } from "@/services/_shared/action-errors"
import { savePurchaseAuthoring, getPurchaseAuthoring, listPurchaseAuthoring, preparePurchaseAuthoring, createPurchaseOrderFromAuthoring, discardPurchaseAuthoring, type PurchaseAuthoringActor } from "@/services/purchase-order/purchase-order-authoring.service"

type Failure = "INVALID_INPUT" | "RESTRICTED" | "STALE" | "NOT_FOUND" | "UNAVAILABLE"
async function run<T>(operation: (actor: PurchaseAuthoringActor) => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; code: Failure }> {
  try {
    const ctx = await requirePermission("purchases.orders.create", { resource: "PurchaseOrderAuthoringDraft" })
    const { claims } = await requireSession()
    if (claims.userId !== ctx.userId || claims.tenantId !== ctx.orgId) throw new ForbiddenError()
    return { ok: true, data: await operation({ orgId: ctx.orgId, userId: ctx.userId, permissions: ctx.permissions, sessionId: claims.sessionId, sessionToken: claims.sessionToken }) }
  } catch (error) {
    if (isRbacError(error)) return { ok: false, code: "RESTRICTED" }
    if (error instanceof z.ZodError) return { ok: false, code: "INVALID_INPUT" }
    if (error instanceof ApplicationError) {
      if (["AUTH_REQUIRED", "FORBIDDEN", "TENANT_SCOPE_VIOLATION"].includes(error.code)) return { ok: false, code: "RESTRICTED" }
      if (["CONFLICT", "IDEMPOTENCY_CONFLICT", "CONCURRENCY_CONFLICT"].includes(error.code)) return { ok: false, code: "STALE" }
      if (error.code === "NOT_FOUND") return { ok: false, code: "NOT_FOUND" }
    }
    // An unavailable response never asserts that a previous create did not commit.
    return { ok: false, code: "UNAVAILABLE" }
  }
}

export async function savePurchaseAuthoringAction(input: unknown) { return run(actor => savePurchaseAuthoring(actor, input)) }
export async function getPurchaseAuthoringAction(input: unknown) { return run(actor => getPurchaseAuthoring(actor, input)) }
export async function listPurchaseAuthoringAction(input: unknown) { return run(actor => listPurchaseAuthoring(actor, input)) }
export async function preparePurchaseAuthoringAction(input: unknown) { return run(actor => preparePurchaseAuthoring(actor, input)) }
export async function discardPurchaseAuthoringAction(input: unknown) { return run(actor => discardPurchaseAuthoring(actor, input)) }
export async function createPurchaseOrderFromAuthoringAction(input: unknown) {
  return run(async actor => {
    const result = await createPurchaseOrderFromAuthoring(actor, input)
    if (result.receipt) {
      try { revalidateTag("purchaseOrders"); revalidateTag(`purchaseOrders-${actor.orgId}`); revalidateTag(`purchaseOrder-${result.receipt.orderId}`) } catch { /* Receipt survives cache failure. */ }
    }
    return result
  })
}
