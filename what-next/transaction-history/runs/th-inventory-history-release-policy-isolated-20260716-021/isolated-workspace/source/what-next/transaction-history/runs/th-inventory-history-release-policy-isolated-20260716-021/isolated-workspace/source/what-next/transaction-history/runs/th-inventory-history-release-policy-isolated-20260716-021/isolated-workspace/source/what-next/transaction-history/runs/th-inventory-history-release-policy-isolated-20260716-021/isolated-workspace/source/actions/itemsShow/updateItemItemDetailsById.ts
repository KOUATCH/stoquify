"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { updateItemDetailsWithRelations } from "@/services/item/item.service";
import { revalidatePath } from "next/cache";
import { UpdateItemDetailsPayload } from "@/types/itemTypes";

export const updateItemDetailsById = inventoryAction(
  async ({ id, data }: { id: string; data: UpdateItemDetailsPayload }): Promise<ServerActionResult<any>> => {
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: id,
      auditAllowed: true,
    });
    const result = await updateItemDetailsWithRelations(ctx.orgId, id, data);

    revalidatePath("/inventory/items");
    return {
      data: result,
      success: true,
    };
  },
  {
    actionName: 'updateItemDetailsById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update',
      resourceType: 'item'
    }
  }
)
