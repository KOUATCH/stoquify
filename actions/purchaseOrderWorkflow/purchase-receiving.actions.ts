"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError, ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import { getPurchaseReceivingWorkbench, previewPurchaseReceiving, confirmPurchaseReceiving } from "@/services/purchase-order/purchase-receiving-workbench.service"
import type { PurchaseReceivingCommand, PurchaseReceivingDraft } from "@/services/purchase-order/purchase-receiving-contracts"

async function scope(write: boolean) {
  const actor = await requirePermission(write ? "purchases.orders.receive" : "purchases.orders.read", { resource: "PurchaseOrder", auditAllowed: write })
  const { claims } = await requireSession()
  if (claims.userId !== actor.userId || claims.tenantId !== actor.orgId) throw new ForbiddenError("Current receiving identity is required.")
  return { organizationId: actor.orgId, actorId: actor.userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }
}
function failure(error: unknown) {
  const safe = toSafeActionError(error)
  return { success: false as const, data: null, error: safe.error, code: error instanceof BusinessRuleError && error.code === "RECEIPT_EVIDENCE_REQUIRED" ? error.code : safe.code }
}
export async function loadPurchaseReceiving(orderId: string) {
  try { return { success: true as const, data: await getPurchaseReceivingWorkbench(orderId, await scope(false)) } }
  catch (error) { return failure(error) }
}
export async function reviewPurchaseReceiving(draft: PurchaseReceivingDraft) {
  try { return { success: true as const, data: await previewPurchaseReceiving(draft, await scope(true)) } }
  catch (error) { return failure(error) }
}
export async function submitPurchaseReceiving(command: PurchaseReceivingCommand) {
  try {
    const current = await scope(true), data = await confirmPurchaseReceiving(command, current)
    // The durable decision remains available when a cache refresh fails after commit.
    try {
      revalidateTag(`purchaseOrders-${current.organizationId}`)
      revalidateTag(`purchaseOrder-${data.orderId}`)
      revalidateTag(`inventory-${current.organizationId}`)
      revalidateTag("inventory")
      revalidatePath('/[locale]/dashboard/purchase-orders', 'page')
      revalidatePath('/[locale]/dashboard/purchase-orders/[id]', 'page')
      revalidatePath('/[locale]/dashboard/inventory', 'page')
    } catch { /* A retained decision is authoritative. */ }
    return { success: true as const, data }
  } catch (error) { return failure(error) }
}
