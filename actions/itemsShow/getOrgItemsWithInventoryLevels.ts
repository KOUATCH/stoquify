"use server";
import { ItemWithInventoryLevelsPayload } from "@/types/itemTypes";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { RbacError, requirePermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { listItemsWithInventoryLevels } from "@/services/item/item.service";

export const getOrgItemsWithInventoryLevels = inventoryAction(
  async (_orgId: string): Promise<ServerActionResult<ItemWithInventoryLevelsPayload[]>> => {
    const ctx = await requirePermission("inventory.items.read", {
      resource: "Item",
      auditAllowed: false,
    });
    const decision = await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "inventory",
      surfaceType: "action",
      surface: "getOrgItemsWithInventoryLevels",
      mode: "enforce",
      accessIntent: "read",
      audit: true,
    });
    if (!decision.allowed) {
      throw new RbacError("Forbidden: inventory module is not available", "FORBIDDEN", 403);
    }

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
