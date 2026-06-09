"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { db } from "@/prisma/db";
import { ItemPayload } from "@/types/itemTypes";

export const getOrgItems = inventoryAction(
  async (orgId: string): Promise<ServerActionResult<ItemPayload[]>> => {
    // Fetch items for the organization
    const items = await db.item.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        nameEn: true,
        nameFr: true,
        slug: true,
        costPrice: true,
        sellingPrice: true,
        createdAt: true,
        imageUrls: true,
        thumbnail: true,
        organizationId: true,
        sku: true,
        descriptionEn: true,
        descriptionFr: true,
      },
    });

    if (!items || items.length === 0) {
      throw new Error("No items found for this organization");
    }

    // Transform to match ItemPayload with backwards compatibility
    const transformedItems: ItemPayload[] = items.map(item => ({
      id: item.id,
      name: item.nameEn, // Use English name as default
      slug: item.slug,
      costPrice: Number(item.costPrice),
      sellingPrice: Number(item.sellingPrice),
      createdAt: item.createdAt,
      imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls.join(',') : '',
      thumbnail: item.thumbnail,
      organizationId: item.organizationId,
      sku: item.sku,
      description: item.descriptionEn || '',
    }));

    return {
      success: true,
      data: transformedItems
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
