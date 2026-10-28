"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { listItemsBrief } from "@/services/item/item.service";
import type { BriefItemPayload } from "@/types/itemTypes";

export const getBriefOrgItems = inventoryAction(
  async (_organizationId: string): Promise<ServerActionResult<BriefItemPayload[]>> => {
    const ctx = await requirePermission("inventory.items.read", {
      resource: "Item",
      auditAllowed: false,
    });

    return {
      success: true,
      data: await listItemsBrief(ctx.orgId),
    };
  },
  {
    actionName: 'getBriefOrgItems',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'read',
      resourceType: 'item'
    }
  }
)

export default getBriefOrgItems
