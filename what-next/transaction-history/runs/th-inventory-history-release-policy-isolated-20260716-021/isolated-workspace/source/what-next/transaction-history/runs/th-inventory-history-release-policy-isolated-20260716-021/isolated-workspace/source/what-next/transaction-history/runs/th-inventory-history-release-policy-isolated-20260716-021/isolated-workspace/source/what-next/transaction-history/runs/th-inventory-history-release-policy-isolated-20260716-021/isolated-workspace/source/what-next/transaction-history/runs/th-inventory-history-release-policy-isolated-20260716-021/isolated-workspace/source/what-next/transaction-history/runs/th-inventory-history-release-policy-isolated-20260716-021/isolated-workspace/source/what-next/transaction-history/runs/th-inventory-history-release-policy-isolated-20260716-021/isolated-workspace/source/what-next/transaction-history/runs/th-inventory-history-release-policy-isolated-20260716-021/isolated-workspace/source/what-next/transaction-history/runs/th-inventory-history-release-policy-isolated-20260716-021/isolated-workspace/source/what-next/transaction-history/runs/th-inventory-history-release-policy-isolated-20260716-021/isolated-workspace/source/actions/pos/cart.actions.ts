"use server"

import { revalidateTag } from "next/cache"
import { err, ok } from "@/services/_shared/action-response"
import { requirePermission } from "@/lib/security/rbac"
import { addPOSCartLine, getActivePOSCart, removePOSCartLine, updatePOSCartLine } from "@/services/pos/pos.service"
import { activeCartSchema, addCartLineSchema, removeCartLineSchema, updateCartLineSchema } from "@/services/pos/pos.schemas"

export async function getActivePOSCartAction(input: unknown) {
  try {
    const parsed = activeCartSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.use", {
      resource: "POSCart",
      resourceId: parsed.sessionId ?? parsed.terminalId,
    })
    const cart = await getActivePOSCart({ ...parsed, organizationId: orgId, userId })
    return ok(cart)
  } catch (error) {
    return err(error)
  }
}

export async function addPOSCartLineAction(input: unknown) {
  try {
    const parsed = addCartLineSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.use", {
      resource: "POSCart",
      resourceId: parsed.sessionId ?? parsed.terminalId,
      auditAllowed: true,
    })
    const cart = await addPOSCartLine({ ...parsed, organizationId: orgId, userId })

    revalidateTag("pos-cart")
    revalidateTag(`pos-stock-${parsed.locationId}`)

    return ok(cart)
  } catch (error) {
    return err(error)
  }
}

export async function updatePOSCartLineAction(input: unknown) {
  try {
    const parsed = updateCartLineSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.use", {
      resource: "POSCart",
      resourceId: parsed.salesOrderId,
      auditAllowed: true,
    })
    const cart = await updatePOSCartLine({ ...parsed, organizationId: orgId, userId })

    revalidateTag("pos-cart")

    return ok(cart)
  } catch (error) {
    return err(error)
  }
}

export async function removePOSCartLineAction(input: unknown) {
  try {
    const parsed = removeCartLineSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.use", {
      resource: "POSCart",
      resourceId: parsed.salesOrderId,
      auditAllowed: true,
    })
    const cart = await removePOSCartLine({ ...parsed, organizationId: orgId, userId })

    revalidateTag("pos-cart")

    return ok(cart)
  } catch (error) {
    return err(error)
  }
}
