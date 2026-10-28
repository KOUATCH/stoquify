"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import {
  assertCanUseOrganization,
  isRbacError,
  requireAllPermissions,
} from "@/lib/security/rbac"
import {
  createItemSupplierForOrganization,
  getAllItemSuppliersForOrganization,
  getItemSupplierForOrganizationById,
  getItemSuppliersForItemInOrganization,
  listItemSuppliersForOrganization,
  removeItemSupplierForOrganization,
  updateItemSupplierForOrganization,
  type ItemSupplierData,
  type UpdateItemSupplierData,
} from "@/services/supplier/supplier.service"
import { revalidatePath } from "next/cache"

export type { ItemSupplierData, UpdateItemSupplierData }

const ITEM_SUPPLIER_PERMISSIONS = {
  read: ["inventory.items.read", "purchases.suppliers.read"],
  create: ["inventory.items.update", "purchases.suppliers.create"],
  update: ["inventory.items.update", "purchases.suppliers.update"],
  delete: ["inventory.items.update", "purchases.suppliers.delete"],
} as const

const ACTIONABLE_ERROR_MESSAGES = new Set([
  "Item not found",
  "Item supplier not found",
  "Item supplier relationship already exists",
  "Item or supplier not found for this organization",
  "One or more suppliers were not found for this organization",
])

function getItemSupplierActionErrorMessage(error: unknown, fallback: string) {
  if (isRbacError(error)) return error.message

  if (error instanceof Error) {
    if (ACTIONABLE_ERROR_MESSAGES.has(error.message)) return error.message
    if (error.message.startsWith("Item with ID ")) return error.message
  }

  return fallback
}

function itemSupplierActionError(
  message: string,
  error: unknown,
  action: string,
  fallback: string,
) {
  return safeLoggedActionErrorMessage(
    message,
    error,
    { action },
    getItemSupplierActionErrorMessage(error, fallback),
  )
}

async function requireItemSupplierAccess(
  permissions: readonly string[],
  resourceId?: string,
  requestedOrganizationId?: string | null,
) {
  const ctx = await requireAllPermissions(permissions, {
    resource: "item-suppliers",
    resourceId,
  })
  const requestedOrgId = requestedOrganizationId?.trim()

  if (requestedOrgId) {
    await assertCanUseOrganization(ctx, requestedOrgId)
  }

  return ctx.orgId
}

function revalidateItemSupplierPaths(itemId?: string | null) {
  revalidatePath("/dashboard/inventory/items")
  revalidatePath("/dashboard/purchases/suppliers")

  if (itemId) {
    revalidatePath(`/dashboard/inventory/items/${itemId}`)
  }
}

export async function getItemSuppliers(organizationId?: string) {
  try {
    const orgId = await requireItemSupplierAccess(
      ITEM_SUPPLIER_PERMISSIONS.read,
      organizationId,
      organizationId,
    )
    const itemSuppliers = await listItemSuppliersForOrganization(orgId)

    return {
      success: true,
      data: itemSuppliers,
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: itemSupplierActionError(
        "Error fetching item suppliers",
        error,
        "getItemSuppliers",
        "Failed to fetch item suppliers",
      ),
      data: [],
    }
  }
}

export async function getItemSupplierById(id: string) {
  try {
    const orgId = await requireItemSupplierAccess(ITEM_SUPPLIER_PERMISSIONS.read, id)
    const itemSupplier = await getItemSupplierForOrganizationById(orgId, id)

    return {
      success: true,
      data: itemSupplier,
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: itemSupplierActionError(
        "Error fetching item supplier",
        error,
        "getItemSupplierById",
        "Failed to fetch item supplier",
      ),
      data: null,
    }
  }
}

export async function createItemSupplier(data: ItemSupplierData) {
  try {
    const orgId = await requireItemSupplierAccess(
      ITEM_SUPPLIER_PERMISSIONS.create,
      data.itemId,
    )
    const itemSupplier = await createItemSupplierForOrganization(orgId, data)

    revalidateItemSupplierPaths(data.itemId)

    return { success: true, data: itemSupplier }
  } catch (error) {
    return {
      success: false,
      error: itemSupplierActionError(
        "Error creating item supplier",
        error,
        "createItemSupplier",
        "Failed to create item supplier",
      ),
    }
  }
}

export async function updateItemSupplier(data: UpdateItemSupplierData) {
  try {
    const orgId = await requireItemSupplierAccess(
      ITEM_SUPPLIER_PERMISSIONS.update,
      data.id,
    )
    const itemSupplier = await updateItemSupplierForOrganization(orgId, data)

    revalidateItemSupplierPaths(itemSupplier.itemId)

    return { success: true, data: itemSupplier }
  } catch (error) {
    return {
      success: false,
      error: itemSupplierActionError(
        "Error updating item supplier",
        error,
        "updateItemSupplier",
        "Failed to update item supplier",
      ),
    }
  }
}

export async function deleteItemSupplier(id: string) {
  try {
    const orgId = await requireItemSupplierAccess(ITEM_SUPPLIER_PERMISSIONS.delete, id)
    const itemSupplier = await removeItemSupplierForOrganization(orgId, id)

    revalidateItemSupplierPaths(itemSupplier.itemId)

    return { success: true, data: itemSupplier }
  } catch (error) {
    return {
      success: false,
      error: itemSupplierActionError(
        "Error deleting item supplier",
        error,
        "deleteItemSupplier",
        "Failed to delete item supplier",
      ),
    }
  }
}

export async function getAllOrgItemSuppliers(organizationId: string) {
  try {
    const orgId = await requireItemSupplierAccess(
      ITEM_SUPPLIER_PERMISSIONS.read,
      organizationId,
      organizationId,
    )
    const itemSuppliers = await getAllItemSuppliersForOrganization(orgId)

    return {
      success: true,
      data: itemSuppliers,
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: itemSupplierActionError(
        "Error fetching all org item suppliers",
        error,
        "getAllOrgItemSuppliers",
        "Failed to fetch all org item suppliers",
      ),
      data: [],
    }
  }
}

export async function getItemSuppliersByItemId(itemId: string) {
  try {
    const orgId = await requireItemSupplierAccess(ITEM_SUPPLIER_PERMISSIONS.read, itemId)
    const itemSuppliers = await getItemSuppliersForItemInOrganization(orgId, itemId)

    return {
      success: true,
      data: itemSuppliers,
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: itemSupplierActionError(
        "Error fetching item suppliers by item ID",
        error,
        "getItemSuppliersByItemId",
        "Failed to fetch item suppliers by item ID",
      ),
      data: [],
    }
  }
}
