"use server";

import { revalidatePath } from "next/cache";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import type { UpdateItemStockPayload } from "@/types/itemTypes";
import { requirePermission } from "@/lib/security/rbac";
import { requestManualItemStockAdjustment } from "@/services/inventory/inventory-adjustment.service";
import { updateItemStockPolicy } from "@/services/item/item.service";

interface StockAdjustmentData {
  quantityChange: number;
  reason: string;
  notes?: string;
  adjustmentType?: string;
}

export const updateItemStockById = inventoryAction(
  async ({ id, data }: { id: string; data: StockAdjustmentData | UpdateItemStockPayload }): Promise<ServerActionResult<any>> => {
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: id,
      auditAllowed: true,
    });

    if ("quantityChange" in data) {
      const result = await requestManualItemStockAdjustment({
        organizationId: ctx.orgId,
        itemId: id,
        actorId: ctx.userId,
        quantityChange: data.quantityChange,
        mode: data.adjustmentType === "set" ? "set" : "delta",
        reason: data.reason,
        notes: data.notes,
      });

      revalidatePath("/dashboard/inventory/items");

      return {
        success: true,
        data: {
          ...result.item,
          pendingStockAdjustment: result.adjustment,
          requiresApproval: result.requiresApproval,
          quantityDelta: result.quantityDelta,
          targetQuantity: result.targetQuantity,
        },
      };
    }

    const updatedItem = await updateItemStockPolicy(ctx.orgId, id, {
      minStockLevel: data.minStockLevel,
      maxStockLevel: data.maxStockLevel,
    });

    revalidatePath("/dashboard/inventory/items");

    return {
      success: true,
      data: updatedItem,
    };
  },
  {
    actionName: 'updateItemStockById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update_stock',
      resourceType: 'item',
      critical: true
    }
  }
);
