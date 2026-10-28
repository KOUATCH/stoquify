"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { isRbacError, requireAllPermissions } from "@/lib/security/rbac"
import { addItemSuppliersToItemForOrganization } from "@/services/supplier/supplier.service"
import { revalidatePath } from "next/cache"

const ITEM_SUPPLIER_CREATE_PERMISSIONS = [
  "inventory.items.update",
  "purchases.suppliers.create",
] as const

function getActionErrorMessage(error: unknown) {
  if (isRbacError(error)) return error.message
  if (error instanceof Error) {
    if (
      error.message === "Item not found" ||
      error.message === "One or more suppliers were not found for this organization"
    ) {
      return error.message
    }
  }
  return "Failed to add suppliers to item"
}

const addItemSuppliers = async (itemId: string, supplierIds: string[]) => {
  try {
    const ctx = await requireAllPermissions(ITEM_SUPPLIER_CREATE_PERMISSIONS, {
      resource: "item-suppliers",
      resourceId: itemId,
    })

    await addItemSuppliersToItemForOrganization(ctx.orgId, itemId, supplierIds)
    revalidatePath(`/dashboard/inventory/items/${itemId}`)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Failed to add ItemSupplier",
        error,
        { action: "addItemSuppliers" },
        getActionErrorMessage(error),
      ),
    }
  }
}

export default addItemSuppliers
