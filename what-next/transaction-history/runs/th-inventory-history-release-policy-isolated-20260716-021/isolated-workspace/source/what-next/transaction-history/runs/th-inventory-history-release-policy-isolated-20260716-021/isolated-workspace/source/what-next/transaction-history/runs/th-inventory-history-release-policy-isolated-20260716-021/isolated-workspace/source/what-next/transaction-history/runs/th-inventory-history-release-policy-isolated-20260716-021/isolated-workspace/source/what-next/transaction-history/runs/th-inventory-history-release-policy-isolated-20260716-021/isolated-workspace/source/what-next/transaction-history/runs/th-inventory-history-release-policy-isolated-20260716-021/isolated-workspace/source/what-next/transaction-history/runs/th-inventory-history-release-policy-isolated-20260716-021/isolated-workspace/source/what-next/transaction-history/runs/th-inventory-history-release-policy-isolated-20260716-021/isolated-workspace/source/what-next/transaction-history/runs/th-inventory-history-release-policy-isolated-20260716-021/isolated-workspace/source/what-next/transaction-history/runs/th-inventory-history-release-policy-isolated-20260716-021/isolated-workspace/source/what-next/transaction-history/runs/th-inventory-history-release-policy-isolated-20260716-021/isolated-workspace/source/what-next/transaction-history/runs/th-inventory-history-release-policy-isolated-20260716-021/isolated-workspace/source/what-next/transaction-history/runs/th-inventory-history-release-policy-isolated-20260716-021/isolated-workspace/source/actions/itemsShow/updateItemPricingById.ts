"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { updateItemPricingWithRelations } from "@/services/item/item.service";
import { revalidatePath } from "next/cache";
import { UpdateItemPricingPayload } from "@/types/itemTypes";

export const updateItemPricingById = inventoryAction(
  async ({ id, data }: { id: string; data: UpdateItemPricingPayload }): Promise<ServerActionResult<any>> => {
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: id,
      auditAllowed: true,
    });
    const result = await updateItemPricingWithRelations(ctx.orgId, id, data);

    revalidatePath("/inventory/items");
    return {
      data: result,
      success: true,
    };
  },
  {
    actionName: 'updateItemPricingById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update',
      resourceType: 'item'
    }
  }
)
