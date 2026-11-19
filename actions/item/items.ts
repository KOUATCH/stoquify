"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
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
  updateItemFromFormSchema,
} from "@/lib/item/schemas"
import { revalidateItem as revalidateItems } from "@/lib/item/revalidation"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  archiveItem,
  createItemFromForm,
  type ItemEditDTO,
  getItemWithRelations,
  listItemsWithRelations,
  updateItemFromForm,
  updateItemBasicInfoWithRelations,
  updateItemDetailsWithRelations,
  updateItemPricingWithRelations,
  updateItemRelationsWithRelations,
  updateItemStockFromForm,
  updateItemTrackingWithRelations,
} from "@/services/item/item.service"
import { ApplicationError, BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { revalidatePath, revalidateTag } from "next/cache"
import { ZodError } from "zod"

// Only reviewed, fixed business messages may cross this legacy string boundary.
// A typed/provider code or a thrown string alone does not make its text public.
function itemActionError(error: unknown, action: string, fallback: string): string {
  let userMessage = fallback
  if (error instanceof ZodError) {
    userMessage = "Invalid input. Please review the form and try again."
  } else if (error instanceof ApplicationError && error.expose) {
    if (
      (error instanceof NotFoundError && [
        "Item not found",
        "Item not found or inactive for this organization.",
        "Inventory location not found or inactive for this organization.",
        "Adjustment location not found.",
        "Active organization not found",
      ].includes(error.message)) ||
      (error instanceof ConflictError && [
        "Another item with this SKU already exists",
        "Operation policy is ambiguous",
        "The stored operation policy requires reconciliation",
        "Capability dependencies require reconciliation",
      ].includes(error.message)) ||
      (error instanceof BusinessRuleError && [
        "Upload an image before saving this item.",
        "This image is unavailable. Upload it again before saving.",
        "Item is not inventory-tracked.",
        "A default active location is required before requesting a stock adjustment.",
        "One or more adjustment items were not found for this organization.",
      ].includes(error.message)) ||
      (error.code === "FORBIDDEN" && error.message ===
        "This capability is not accepting new work. Existing records and permitted completion workflows remain available.")
    ) {
      userMessage = error.message
    } else if (error.code === "AUTH_REQUIRED") {
      userMessage = "Unauthenticated"
    } else if (error.code === "FORBIDDEN") {
      userMessage = "Forbidden"
    }
  } else if (error instanceof Error && "code" in error) {
    if (error.code === "UNAUTHENTICATED" || error.code === "NO_ACTIVE_ORG") userMessage = "Unauthenticated"
    if (error.code === "FORBIDDEN") userMessage = "Forbidden"
  }
  return safeLoggedActionErrorMessage("Item action failed", error, { action }, userMessage)
}

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
    const ctx = await requirePermission("inventory.items.create", {
      resource: "Item",
      auditAllowed: true,
    })
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "inventory",
      surfaceType: "action",
      surface: "actions/item/items.ts#createItemAction",
      accessIntent: "write",
      mode: "observe",
    })

    const data = createItemSchema.parse(input)

    if (data.organizationId !== ctx.orgId) {
      throw new ForbiddenError("You cannot create an item for another organization")
    }

    const created = await createItemFromForm(ctx.orgId, ctx.userId, {
      ...data,
      organizationId: ctx.orgId,
    })

    revalidateItems(created.id, created.organizationId)

    return {
      success: true,
      data: created,
      message: "Item created successfully",
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Create item action failed",
        error,
        { action: "createItemAction" },
        "Failed to create item. Review the item details and try again.",
      ),
    }
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
    const message = itemActionError(error, "getItemAction", "Failed to fetch item")
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
    const message = itemActionError(error, "listItemsAction", "Failed to list items")
    return { success: false, error: message }
  }
}

// Canonical edit-item action: one explicit item-master update, no stock movement.
export async function updateItemFromFormAction(input: unknown): Promise<ActionResult<ItemEditDTO>> {
  try {
    const data = updateItemFromFormSchema.parse(input)
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: data.id,
      auditAllowed: true,
    })


    const moduleDecision = await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "inventory",
      surfaceType: "action",
      surface: "actions/item/items.ts#updateItemFromFormAction",
      accessIntent: "write",
      mode: "enforce",
    })
    if (!moduleDecision.allowed) {
      throw new ForbiddenError("Inventory module access is not active")
    }

    const updated = await updateItemFromForm(ctx.orgId, data.id, data)
    revalidateItems(updated.id, ctx.orgId)
    return { success: true, data: updated, message: "Item updated successfully" }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Edit item action failed",
        error,
        { action: "updateItemFromFormAction" },
        "Failed to save the item. Your changes are still available; review them and try again.",
      ),
    }
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
    const message = itemActionError(error, "updateItemBasicInfoAction", "Failed to update item")
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
    const message = itemActionError(error, "updateItemDetailsAction", "Failed to update item details")
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
    const message = itemActionError(error, "updateItemPricingAction", "Failed to update pricing")
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
    const message = itemActionError(error, "updateItemRelationsAction", "Failed to update relations")
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
    const message = itemActionError(error, "updateItemStockAction", "Failed to update stock")
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
    const message = itemActionError(error, "updateItemTrackingAction", "Failed to update tracking")
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
    const message = itemActionError(error, "deleteItemAction", "Failed to delete item")
    return { success: false, error: message }
  }
}
