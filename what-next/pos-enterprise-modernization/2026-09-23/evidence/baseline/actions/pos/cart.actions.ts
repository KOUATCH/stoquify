"use server"

import { revalidateTag } from "next/cache"
import { err, ok } from "@/services/_shared/action-response"
import { posReadResult, posReadError } from "@/services/pos/pos-read-result"
import { requirePermission } from "@/lib/security/rbac"
import { addPOSCartLine, getActivePOSCart, removePOSCartLine, updatePOSCartLine } from "@/services/pos/pos.service"
import { activeCartSchema, addCartLineSchema, removeCartLineSchema, updateCartLineSchema } from "@/services/pos/pos.schemas"
import { POSCartWriteAccessError } from "@/services/pos/cart-write-access"
import { checkoutLeaseSchema } from "@/services/pos/pos.schemas"

function cartWriteError(error: unknown) {
  if (error instanceof POSCartWriteAccessError) return { success: false as const, data: null, error: error.message, code: "POS_CART_WRITE_UNAVAILABLE" as const }
  return err(error)
}

export async function getActivePOSCartAction(input: unknown) {
  try {
    const parsed = activeCartSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.use", {
      resource: "POSCart",
      resourceId: parsed.sessionId ?? parsed.terminalId,
    })
    const cart = await getActivePOSCart({ ...parsed, organizationId: orgId, userId })
    return posReadResult(cart, { orgId, userId })
  } catch (error) {
    return posReadError(error)
  }
}

export async function addPOSCartLineAction(input: unknown) {
  try {
    const parsed = addCartLineSchema.merge(checkoutLeaseSchema).parse(input)
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
    return cartWriteError(error)
  }
}

export async function updatePOSCartLineAction(input: unknown) {
  try {
    const parsed = updateCartLineSchema.merge(checkoutLeaseSchema).parse(input)
    const { orgId, userId } = await requirePermission("pos.use", {
      resource: "POSCart",
      resourceId: parsed.salesOrderId,
      auditAllowed: true,
    })
    const cart = await updatePOSCartLine({ ...parsed, organizationId: orgId, userId })

    revalidateTag("pos-cart")

    return ok(cart)
  } catch (error) {
    return cartWriteError(error)
  }
}

export async function removePOSCartLineAction(input: unknown) {
  try {
    const parsed = removeCartLineSchema.merge(checkoutLeaseSchema).parse(input)
    const { orgId, userId } = await requirePermission("pos.use", {
      resource: "POSCart",
      resourceId: parsed.salesOrderId,
      auditAllowed: true,
    })
    const cart = await removePOSCartLine({ ...parsed, organizationId: orgId, userId })

    revalidateTag("pos-cart")

    return ok(cart)
  } catch (error) {
    return cartWriteError(error)
  }
}
