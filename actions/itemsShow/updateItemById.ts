"use server";

import { revalidatePath } from "next/cache";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { updateItemGenericWithRelations } from "@/services/item/item.service";

export const updateItemById = inventoryAction(
  async ({ id, data }: { id: string; data: any }): Promise<ServerActionResult<any>> => {
    const ctx = await requirePermission("inventory.items.update", {
      resource: "Item",
      resourceId: id,
      auditAllowed: true,
    });
    const updatedItem = await updateItemGenericWithRelations(ctx.orgId, id, data);

    revalidatePath("/dashboard/inventory/items");

    return {
      success: true,
      data: updatedItem,
    };
  },
  {
    actionName: 'updateItemById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update',
      resourceType: 'item'
    }
  }
);
