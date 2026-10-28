"use server"

import {
  type ActionResult,
  createItemSchema,
  deleteItemSchema,
  getItemSchema,
  type ItemWithRelations,
  listItemsSchema,
  updateBasicInfoSchema,
  updateDetailsSchema,
  updatePricingSchema,
  updateRelationsSchema,
  updateStockSchema,
  updateTrackingSchema,
} from "@/lib/item/schemas"
import { revalidateItem as revalidateItems } from "@/lib/item/revalidation"
import { getAuthenticatedUser } from "@/config/useAuth"
import { requirePermission } from "@/lib/security/rbac"
import {
  archiveItem,
  createItemFromForm,
  getItemWithRelations,
  listItemsWithRelations,
  updateItemBasicInfoWithRelations,
  updateItemDetailsWithRelations,
  updateItemPricingWithRelations,
  updateItemRelationsWithRelations,
  updateItemStockFromForm,
  updateItemTrackingWithRelations,
} from "@/services/item/item.service"
import { revalidatePath, revalidateTag } from "next/cache"

export type PaginatedItems = {
  data: ItemWithRelations[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Create Item (optionally seed initial inventory at a specific location)
export async function createItemAction(input: unknown): Promise<ActionResult<ItemWithRelations>> {
  try {
    const data = createItemSchema.parse(input)
    const user = await getAuthenticatedUser()
    const created = await createItemFromForm(user.organizationId, user.id, {
      ...data,
      organizationId: user.organizationId,
    })

    revalidateItems(created.id, created.organizationId)

    return {
      success: true,
      data: created,
      message: "Item created successfully",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create item"
    return { success: false, error: message }
  }
}

// Read: Get one
export async function getItemAction(input: unknown): Promise<ActionResult<ItemWithRelations>> {
  try {
    const { id } = getItemSchema.parse(input)
    const ctx = await requirePermission("inventory.items.read", {
      resource: "Item",
      resourceId: id,
      auditAllowed: false,
    })

    const item = await getItemWithRelations(ctx.orgId, id)
    if (!item) {
      return { success: false, error: "Item not found" }
    }
    return { success: true, data: item }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch item"
    return { success: false, error: message }
  }
}

// Read: List with search, filters, pagination
export async function listItemsAction(input: unknown): Promise<ActionResult<PaginatedItems>> {
  try {
    const params = listItemsSchema.parse(input)
    const ctx = await requirePermission("inventory.items.read", {
      resource: "Item",
      auditAllowed: false,
    })

    const data = await listItemsWithRelations({
      ...params,
      organizationId: ctx.orgId,
    })

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list items"
    return { success: false, error: message }
  }
}

// Update: Basic Info
export async function updateItemBasicInfoAction(input: unknown): Promise<ActionResult<ItemWithRelations>> {
  try {
    const data = updateBasicInfoSchema.parse(input)
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: data.id,
      auditAllowed: true,
    })
    const updated = await updateItemBasicInfoWithRelations(ctx.orgId, data.id, data)

    revalidateItems(updated.id, ctx.orgId)
    return { success: true, data: updated, message: "Item updated" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update item"
    return { success: false, error: message }
  }
}

// Update: Item Details (SKU/Barcode/Physical)
export async function updateItemDetailsAction(input: unknown): Promise<ActionResult<ItemWithRelations>> {
  try {
    const data = updateDetailsSchema.parse(input)
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: data.id,
      auditAllowed: true,
    })
    const updated = await updateItemDetailsWithRelations(ctx.orgId, data.id, data)

    revalidateItems(updated.id, ctx.orgId)
    return { success: true, data: updated, message: "Item details updated" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update item details"
    return { success: false, error: message }
  }
}

// Update: Pricing
export async function updateItemPricingAction(input: unknown): Promise<ActionResult<ItemWithRelations>> {
  try {
    const data = updatePricingSchema.parse(input)
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: data.id,
      auditAllowed: true,
    })
    const updated = await updateItemPricingWithRelations(ctx.orgId, data.id, data)

    revalidateItems(updated.id, ctx.orgId)
    return { success: true, data: updated, message: "Item pricing updated" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update pricing"
    return { success: false, error: message }
  }
}

// Update: Relations
export async function updateItemRelationsAction(input: unknown): Promise<ActionResult<ItemWithRelations>> {
  try {
    const data = updateRelationsSchema.parse(input)
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: data.id,
      auditAllowed: true,
    })
    const updated = await updateItemRelationsWithRelations(ctx.orgId, data.id, data)

    revalidateItems(updated.id, ctx.orgId)
    return { success: true, data: updated, message: "Item relations updated" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update relations"
    return { success: false, error: message }
  }
}

// Update: Stock policy + optional inventory adjustment
export async function updateItemStockAction(input: unknown): Promise<ActionResult<ItemWithRelations>> {
  try {
    const data = updateStockSchema.parse(input)
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: data.id,
      auditAllowed: true,
    })
    if (data.adjustInventory && data.adjustInventory.deltaQty !== 0) {
      await requirePermission("inventory.stock.adjust", {
        resource: "StockAdjustment",
        resourceId: data.id,
        auditAllowed: true,
      })
    }

    const updated = await updateItemStockFromForm(ctx.orgId, ctx.userId, data.id, data)

    revalidateItems(updated.id, ctx.orgId)
    return { success: true, data: updated, message: "Stock change submitted for approval" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update stock"
    return { success: false, error: message }
  }
}

// Update: Tracking / Flags
export async function updateItemTrackingAction(input: unknown): Promise<ActionResult<ItemWithRelations>> {
  try {
    const data = updateTrackingSchema.parse(input)
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: data.id,
      auditAllowed: true,
    })
    const updated = await updateItemTrackingWithRelations(ctx.orgId, data.id, data)

    revalidateItems(updated.id, ctx.orgId)
    return { success: true, data: updated, message: "Item tracking updated" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update tracking"
    return { success: false, error: message }
  }
}

// Delete
export async function deleteItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { id } = deleteItemSchema.parse(input)
    const ctx = await requirePermission("inventory.items.delete", {
      resource: "Item",
      resourceId: id,
      auditAllowed: true,
    })
    await archiveItem(ctx.orgId, id)

    revalidateTag("items")
    revalidateTag(`item-${id}`)
    revalidateTag(`org-${ctx.orgId}-items`)
    revalidatePath("/dashboard/inventory/items")

    return { success: true, data: { id }, message: "Item deleted" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete item"
    return { success: false, error: message }
  }
}
