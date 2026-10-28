"use server";
import { ItemWithInventoryLevelsPayload } from "@/types/itemTypes";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { listItemsWithInventoryLevels } from "@/services/item/item.service";

export const getOrgItemsWithInventoryLevels = inventoryAction(
  async (_orgId: string): Promise<ServerActionResult<ItemWithInventoryLevelsPayload[]>> => {
    const ctx = await requirePermission("inventory.items.read", {
      resource: "Item",
      auditAllowed: false,
    });

    return {
      success: true,
      data: await listItemsWithInventoryLevels(ctx.orgId)
    };
  },
  {
    actionName: 'getOrgItemsWithInventoryLevels',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'read',
      resourceType: 'items_with_levels'
    }
  }
);
