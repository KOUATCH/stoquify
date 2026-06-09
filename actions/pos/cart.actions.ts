"use server"

import { revalidateTag } from "next/cache"
import { err, ok } from "@/services/_shared/action-response"
import { requireOrg } from "@/services/_shared/require-org"
import { addPOSCartLine, getActivePOSCart, removePOSCartLine, updatePOSCartLine } from "@/services/pos/pos.service"
import { activeCartSchema, addCartLineSchema, removeCartLineSchema, updateCartLineSchema } from "@/services/pos/pos.schemas"

export async function getActivePOSCartAction(input: unknown) {
  try {
    const { orgId, userId } = await requireOrg()
    const parsed = activeCartSchema.parse(input)
    const cart = await getActivePOSCart({ ...parsed, organizationId: orgId, userId })
    return ok(cart)
  } catch (error) {
    return err(error)
  }
}

export async function addPOSCartLineAction(input: unknown) {
  try {
    const { orgId, userId } = await requireOrg()
    const parsed = addCartLineSchema.parse(input)
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
    const { orgId, userId } = await requireOrg()
    const parsed = updateCartLineSchema.parse(input)
    const cart = await updatePOSCartLine({ ...parsed, organizationId: orgId, userId })

    revalidateTag("pos-cart")

    return ok(cart)
  } catch (error) {
    return err(error)
  }
}

export async function removePOSCartLineAction(input: unknown) {
  try {
    const { orgId, userId } = await requireOrg()
    const parsed = removeCartLineSchema.parse(input)
    const cart = await removePOSCartLine({ ...parsed, organizationId: orgId, userId })

    revalidateTag("pos-cart")

    return ok(cart)
  } catch (error) {
    return err(error)
  }
}
