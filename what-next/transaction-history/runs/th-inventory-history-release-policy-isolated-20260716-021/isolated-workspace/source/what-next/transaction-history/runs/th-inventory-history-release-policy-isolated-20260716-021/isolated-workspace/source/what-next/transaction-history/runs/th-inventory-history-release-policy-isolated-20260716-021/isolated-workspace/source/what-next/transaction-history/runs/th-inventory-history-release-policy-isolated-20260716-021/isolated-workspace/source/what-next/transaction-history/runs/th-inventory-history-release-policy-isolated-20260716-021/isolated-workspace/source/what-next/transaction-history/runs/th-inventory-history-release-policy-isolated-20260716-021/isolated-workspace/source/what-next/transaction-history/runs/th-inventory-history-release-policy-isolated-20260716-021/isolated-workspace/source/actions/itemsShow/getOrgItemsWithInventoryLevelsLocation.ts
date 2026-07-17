"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { listItemsWithInventoryLevels } from "@/services/item/item.service";
import { ItemWithInventoryLevelsPayload } from "@/types/itemTypes";

export const getOrgItemsWithInventoryLevelsLocation = inventoryAction(
  async ({ locationId }: { orgId: string; locationId: string }): Promise<ServerActionResult<ItemWithInventoryLevelsPayload[]>> => {
    const ctx = await requirePermission("inventory.items.read", {
      resource: "Item",
      auditAllowed: false,
    });

    return {
      data: await listItemsWithInventoryLevels(ctx.orgId, { locationId }),
      success: true
    };
  },
  {
    actionName: 'getOrgItemsWithInventoryLevelsLocation',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'read',
      resourceType: 'item'
    }
  }
)
