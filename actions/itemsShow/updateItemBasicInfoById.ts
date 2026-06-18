"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { updateItemBasicInfoWithRelations } from "@/services/item/item.service";
import { revalidatePath } from "next/cache";
import { UpdateItemBasicInfoPayload } from "@/types/itemTypes";

export const updateItemBasicInfoById = inventoryAction(
  async ({ id, data }: { id: string; data: UpdateItemBasicInfoPayload }): Promise<ServerActionResult<any>> => {
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: id,
      auditAllowed: true,
    });
    const result = await updateItemBasicInfoWithRelations(ctx.orgId, id, data);

    revalidatePath("/inventory/items");
    return {
      data: result,
      success: true,
    };
  },
  {
    actionName: 'updateItemBasicInfoById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update',
      resourceType: 'item'
    }
  }
)
