"use server"

import { requirePermission } from "@/lib/security/rbac"
import { err, ok } from "@/services/_shared/action-response"
import { acquirePOSCheckout, changePOSCheckoutCart, renewPOSCheckout, retainLegacyPOSCheckout } from "@/services/pos/checkout.service"
import { checkoutCartCommandSchema, checkoutWorkspaceSchema, commitSaleSchema } from "@/services/pos/pos.schemas"

export async function retainLegacyPOSCheckoutAction(input: unknown) {
  try {
    const parsed = commitSaleSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.use", { resource: "POSCart", resourceId: parsed.salesOrderId })
    await retainLegacyPOSCheckout({ ...parsed, organizationId: orgId, userId })
    return ok(null)
  } catch (error) { return err(error) }
}

export async function acquirePOSCheckoutAction(input: unknown) {
  try {
    const parsed = checkoutWorkspaceSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.use", { resource: "POSSession", resourceId: parsed.sessionId })
    return ok(await acquirePOSCheckout({ ...parsed, organizationId: orgId, userId }))
  } catch (error) { return err(error) }
}

export async function renewPOSCheckoutAction(input: unknown) {
  try {
    const parsed = checkoutWorkspaceSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.use", { resource: "POSSession", resourceId: parsed.sessionId })
    await renewPOSCheckout({ ...parsed, organizationId: orgId, userId })
    return ok(null)
  } catch (error) { return err(error) }
}

export async function changePOSCheckoutCartAction(input: unknown) {
  try {
    const parsed = checkoutCartCommandSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.use", { resource: "POSCart", resourceId: parsed.salesOrderId, auditAllowed: true })
    return ok(await changePOSCheckoutCart({ ...parsed, organizationId: orgId, userId }))
  } catch (error) { return err(error) }
}
