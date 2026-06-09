"use server";
import { db } from "@/prisma/db";
import { ItemWithInventoryLevelsPayload } from "@/types/itemTypes";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";

export const getOrgItemsWithInventoryLevels = inventoryAction(
  async (orgId: string): Promise<ServerActionResult<ItemWithInventoryLevelsPayload[]>> => {
    console.log('getOrgItemsWithInventoryLevels called with orgId:', orgId);

    // Validate orgId
    if (!orgId) {
      throw new Error("Organization ID is required");
    }

    // First, let's check if there are any items at all for this org
    const allItemsCount = await db.item.count({
      where: {
        organizationId: orgId,
      },
    });
    console.log('Total items for org:', allItemsCount);

    const activeItemsCount = await db.item.count({
      where: {
        organizationId: orgId,
        isActive: true,
      },
    });
    console.log('Active items for org:', activeItemsCount);

    // Fetch items without imageUrls first to avoid schema conflicts
    const itemsWithoutImages = await db.item.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
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
        updatedAt: true,
        thumbnail: true,
        organizationId: true,
        isActive: true,
        isDiscontinued: true,
        sku: true,
        minStockLevel: true,
        maxStockLevel: true,
        reorderLevel: true,
        brand: {
          select: {
            id: true,
            nameEn: true,
            nameFr: true,
          }
        },
        category: {
          select: {
            id: true,
            titleEn: true,
            titleFr: true,
          }
        },
        inventoryLevels: {
          select: {
            id: true,
            quantityOnHand: true,
            quantityReserved: true,
            quantityAvailable: true,
            quantityInTransit: true,
            quantityOnOrder: true,
            reorderPoint: true,
            totalValue: true,
            locationId: true,
            location: {
              select: {
                id: true,
                name: true,
                isDefault: true,
              }
            },
          },
        },
      },
    });

    console.log('Found items without images:', itemsWithoutImages.length);

    // Get imageUrls separately using raw query
    let imageUrlsData: { id: string; imageUrls: string }[] = [];
    try {
      imageUrlsData = await db.$queryRaw`
        SELECT id, CAST("imageUrls" AS TEXT) as "imageUrls"
        FROM items
        WHERE "organizationId" = ${orgId} AND "isActive" = true
      ` as { id: string; imageUrls: string }[];
      console.log('ImageUrls data:', imageUrlsData.length);
    } catch (queryError) {
      console.error('Raw query error:', queryError);
      // Fall back to empty imageUrls if raw query fails
      imageUrlsData = itemsWithoutImages.map(item => ({ id: item.id, imageUrls: '' }));
    }

    // Check if items array is empty (more appropriate than checking !items)
    if (itemsWithoutImages.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Create a map for quick imageUrls lookup
    const imageUrlsMap = new Map(
      imageUrlsData.map(img => [img.id, img.imageUrls])
    );

    // Transform the items to match the expected structure
    const transformedItems: ItemWithInventoryLevelsPayload[] = itemsWithoutImages.map((item) => ({
      id: item.id,
      nameEn: item.nameEn,
      nameFr: item.nameFr,
      name: item.nameEn, // Use English name as default
      slug: item.slug,
      costPrice: Number(item.costPrice),
      sellingPrice: Number(item.sellingPrice),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      imageUrls: imageUrlsMap.get(item.id) || "", // Get imageUrls from separate query
      thumbnail: item.thumbnail,
      organizationId: item.organizationId,
      isActive: item.isActive,
      isDiscontinued: item.isDiscontinued,
      sku: item.sku,
      minStockLevel: Number(item.minStockLevel),
      maxStockLevel: item.maxStockLevel === null ? null : Number(item.maxStockLevel),
      reorderLevel: Number(item.reorderLevel),
      brand: item.brand
        ? {
            id: item.brand.id,
            brandName: item.brand.nameEn,
          }
        : null,
      category: item.category ? {
        id: item.category.id,
        title: item.category.titleEn // Use English title as default
      } : null,
      inventoryLevels: item.inventoryLevels.map((level) => ({
        id: level.id,
        quantityOnHand: Number(level.quantityOnHand),
        quantityReserved: Number(level.quantityReserved),
        quantityAvailable: Number(level.quantityAvailable),
        quantityInTransit: Number(level.quantityInTransit),
        quantityOnOrder: Number(level.quantityOnOrder),
        reorderPoint: Number(level.reorderPoint),
        totalValue: Number(level.totalValue),
        location: level.location,
      })),
    }));

    return {
      success: true,
      data: transformedItems
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
