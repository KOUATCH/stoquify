"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError, ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import { getPurchaseOrderAmendmentPreview, applyPurchaseOrderAmendment } from "@/services/purchase-order/purchase-order-amendment.service"
import { purchaseAmendmentQuerySchema, purchaseAmendmentCommandSchema, type PurchaseAmendmentCommand } from "@/services/purchase-order/purchase-order-amendment-contracts"

async function scope() {
  const actor = await requirePermission("purchases.orders.approve", { resource:"PurchaseOrder", auditAllowed:true }), { claims } = await requireSession()
  if(claims.userId!==actor.userId || claims.tenantId!==actor.orgId)throw new ForbiddenError("Current purchase-order identity is required.")
  return { organizationId:actor.orgId,actorId:actor.userId,sessionId:claims.sessionId,sessionToken:claims.sessionToken }
}
function failure(error: unknown) {
  const safe=toSafeActionError(error),code=error instanceof BusinessRuleError && ["OPEN_RECEIPT","RETAINED_OBLIGATIONS"].includes(error.code)?error.code:safe.code
  return { success:false as const,data:null,error:safe.error,code }
}
export async function previewPurchaseOrderAmendment(input: { orderId:string;proposalId:string }) {
  try { return {success:true as const,data:await getPurchaseOrderAmendmentPreview(purchaseAmendmentQuerySchema.parse(input),await scope())} }
  catch(error){return failure(error)}
}
export async function confirmPurchaseOrderAmendment(input: PurchaseAmendmentCommand) {
  try {
    const current=await scope(),data=await applyPurchaseOrderAmendment(purchaseAmendmentCommandSchema.parse(input),current)
    // A committed decision remains recoverable even if cache invalidation fails.
    try { revalidateTag(`purchaseOrders-${current.organizationId}`);revalidateTag(`purchaseOrder-${data.orderId}`);revalidatePath('/[locale]/dashboard/purchase-orders','page');revalidatePath('/[locale]/dashboard/purchase-orders/[id]','page');revalidatePath('/[locale]/dashboard/purchase-orders/[id]/supplier-acknowledgement','page') } catch { /* Retained receipt is authoritative. */ }
    return {success:true as const,data}
  } catch(error){return failure(error)}
}
