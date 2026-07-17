"use server";

import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { archiveItem } from "@/services/item/item.service";

export const deleteItem = inventoryAction(
  async (id: string): Promise<ServerActionResult<any>> => {
    const ctx = await requirePermission("inventory.items.delete", {
      resource: "Item",
      resourceId: id,
      auditAllowed: true,
    });
    const deletedItem = await archiveItem(ctx.orgId, id);

    return {
      success: true,
      data: deletedItem
    };
  },
  {
    actionName: 'deleteItem',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'delete',
      resourceType: 'item',
      critical: true
    }
  }
);
