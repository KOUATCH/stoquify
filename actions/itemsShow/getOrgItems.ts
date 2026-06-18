"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { listActiveItemPayloads } from "@/services/item/item.service";
import { ItemPayload } from "@/types/itemTypes";

export const getOrgItems = inventoryAction(
  async (_orgId: string): Promise<ServerActionResult<ItemPayload[]>> => {
    const ctx = await requirePermission("inventory.items.read", {
      resource: "Item",
      auditAllowed: false,
    });

    return {
      success: true,
      data: await listActiveItemPayloads(ctx.orgId)
    };
  },
  {
    actionName: 'getOrgItems',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'read',
      resourceType: 'item'
    }
  }
)

export default getOrgItems
