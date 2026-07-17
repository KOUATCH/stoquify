"use server";

import { ItemCreateDTO } from "@/types/item";
import { revalidatePath } from "next/cache";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { requirePermission } from "@/lib/security/rbac";
import { BusinessRuleError } from "@/services/_shared/action-errors";
import { createItem } from "@/services/item/item.service";

export const createActionItem = inventoryAction(
  async (data: ItemCreateDTO & {
    locationId?: string;
    initialQuantity?: number;
    unitCost?: number;
    organizationId: string;
    userId?: string;
  }): Promise<ServerActionResult<any>> => {
    const ctx = await requirePermission("inventory.items.create", {
      resource: "Item",
      auditAllowed: true,
    });

    const { locationId, initialQuantity, unitCost, organizationId: _clientOrganizationId, userId: _clientUserId, ...itemData } = data;

    if (initialQuantity !== undefined && initialQuantity > 0 && !locationId) {
      throw new BusinessRuleError("Location is required when creating initial inventory");
    }

    const item = await createItem(ctx.orgId, ctx.userId, {
      nameEn: itemData.nameEn,
      nameFr: itemData.nameFr ?? null,
      descriptionEn: itemData.descriptionEn ?? null,
      descriptionFr: itemData.descriptionFr ?? null,
      sku: itemData.sku,
      slug: itemData.slug,
      costPrice: Number(itemData.costPrice ?? 0),
      sellingPrice: Number(itemData.sellingPrice ?? 0),
      imageUrls: itemData.imageUrls,
      thumbnail: itemData.thumbnail,
      locationId,
      initialQuantity,
      unitCost,
    });

    revalidatePath("/inventory/items");
    return {
      success: true,
      data: item,
    };
  },
  {
    actionName: 'createActionItem',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'create',
      resourceType: 'item',
      critical: true
    }
  }
);

export default createActionItem;
