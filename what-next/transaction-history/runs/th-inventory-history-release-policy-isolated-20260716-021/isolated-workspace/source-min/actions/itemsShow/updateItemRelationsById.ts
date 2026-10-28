"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { updateItemRelationsWithRelations } from "@/services/item/item.service";
import { UpdateItemRelationsPayload } from "@/types/itemTypes";
import { revalidatePath } from "next/cache";

export const updateItemRelationsById = inventoryAction(
  async ({ id, data }: { id: string; data: UpdateItemRelationsPayload }): Promise<ServerActionResult<any>> => {
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: id,
      auditAllowed: true,
    });
    const result = await updateItemRelationsWithRelations(ctx.orgId, id, data);

    revalidatePath("/inventory/items");
    return {
      data: result,
      success: true,
    };
  },
  {
    actionName: 'updateItemRelationsById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update',
      resourceType: 'item'
    }
  }
)
