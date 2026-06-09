"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { db } from "@/prisma/db";
import { ItemWithInventoryLevelsPayload } from "@/types/itemTypes";

export const getOrgItemsWithInventoryLevelsLocation = inventoryAction(
  async ({ orgId, locationId }: { orgId: string; locationId: string }): Promise<ServerActionResult<ItemWithInventoryLevelsPayload[]>> => {
    // Validate orgId
    if (!orgId) {
      throw new Error("Organization ID is required");
    }

    // Fetch items for the organization
    const items = await db.item.findMany({
      where: {
        organizationId: orgId,
        isActive: true, // Optional: filter for active items only
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        nameEn: true,
        nameFr: true,
        descriptionEn: true,
        descriptionFr: true,
        slug: true,
        costPrice: true,
        sellingPrice: true,
        createdAt: true,
        updatedAt: true,
        imageUrls: true,
        thumbnail: true,
        organizationId: true,
        isActive: true,
        isDiscontinued: true,
        sku: true,
        minStockLevel: true,
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
            where:{
              locationId
            },
             select: {
            id: true,
            quantityOnHand: true,
            quantityReserved: true,
            quantityAvailable: true,
            quantityInTransit: true,
            quantityOnOrder: true,
            reorderPoint: true,
            totalValue: true,
          },
        },
      },
    });

    // Check if items array is empty (more appropriate than checking !items)
    if (items.length === 0) {
      // Return empty array instead of throwing error for better UX
      return {
        data: [],
        success: true
      };
    }

    const transformedItems: ItemWithInventoryLevelsPayload[] = items.map((item) => ({
      id: item.id,
      nameEn: item.nameEn,
      nameFr: item.nameFr,
      descriptionEn: item.descriptionEn,
      descriptionFr: item.descriptionFr,
      name: item.nameEn,
      description: item.descriptionEn,
      slug: item.slug,
      costPrice: Number(item.costPrice),
      sellingPrice: Number(item.sellingPrice),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls.join(",") : "",
      thumbnail: item.thumbnail,
      organizationId: item.organizationId,
      isActive: item.isActive,
      isDiscontinued: item.isDiscontinued,
      sku: item.sku,
      minStockLevel: Number(item.minStockLevel),
      brand: item.brand
        ? {
            id: item.brand.id,
            brandName: item.brand.nameEn,
          }
        : null,
      category: item.category
        ? {
            id: item.category.id,
            title: item.category.titleEn,
          }
        : null,
      inventoryLevels: item.inventoryLevels.map((level) => ({
        id: level.id,
        quantityOnHand: Number(level.quantityOnHand),
        quantityReserved: Number(level.quantityReserved),
        quantityAvailable: Number(level.quantityAvailable),
        quantityInTransit: Number(level.quantityInTransit),
        quantityOnOrder: Number(level.quantityOnOrder),
        reorderPoint: Number(level.reorderPoint),
        totalValue: Number(level.totalValue),
      })),
    }));

    return {
      data: transformedItems,
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
