"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { isRbacError, requireAllPermissions } from "@/lib/security/rbac"
import { getItemWithSuppliersForOrganization } from "@/services/supplier/supplier.service"
import type { SupplierItemResponse } from "@/types/itemTypes"

const ITEM_SUPPLIER_READ_PERMISSIONS = [
  "inventory.items.read",
  "purchases.suppliers.read",
] as const

function getActionErrorMessage(error: unknown) {
  if (isRbacError(error)) return error.message
  if (error instanceof Error && error.message.startsWith("Item with ID ")) {
    return error.message
  }
  return "Failed to fetch item suppliers"
}

export default async function getItemWithSuppliersById(id: string): Promise<SupplierItemResponse> {
  if (!id || typeof id !== "string") {
    return {
      success: false,
      data: [],
      error: "Invalid item ID provided",
    }
  }

  try {
    const ctx = await requireAllPermissions(ITEM_SUPPLIER_READ_PERMISSIONS, {
      resource: "item-suppliers",
      resourceId: id,
    })
    const itemSuppliers = await getItemWithSuppliersForOrganization(ctx.orgId, id)

    return {
      success: true,
      data: itemSuppliers as SupplierItemResponse["data"],
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      error: safeLoggedActionErrorMessage(
        "Error fetching item suppliers for item",
        error,
        { action: "getItemWithSuppliersById" },
        getActionErrorMessage(error),
      ),
    }
  }
}
