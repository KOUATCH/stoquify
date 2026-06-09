"use server";

import { db } from "@/prisma/db";
import { ItemCreateDTO } from "@/types/item";
import { TransactionType } from "@/types/inventory";
import { revalidatePath } from "next/cache";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";

const DEFAULT_IMAGE_URL = "https://14J7oh8kso.ufs.sh/f/HLxTbDBCDLwfAXaapcezIN7vwylKf1PXSCqAuseUG0gx8mhd";

export const createActionItem = inventoryAction(
  async (data: ItemCreateDTO & {
    locationId?: string;
    initialQuantity?: number;
    unitCost?: number;
    organizationId: string;
    userId?: string;
  }): Promise<ServerActionResult<any>> => {
    // Remove quantity from the item data since it's not part of the Item model
    const { locationId, initialQuantity, unitCost, userId, ...itemData } = data;

    const formattedData = {
      ...itemData,
      organizationId: data.organizationId,
      costPrice: Number(itemData.costPrice ?? 0),
      sellingPrice: Number(itemData.sellingPrice ?? 0),
      imageUrls: [itemData.imageUrls ?? DEFAULT_IMAGE_URL],
      // Ensure all required fields are present
      slug: itemData.slug || itemData.nameEn.toLowerCase().replace(/\s+/g, '-'),
      sku: itemData.sku || `SKU-${Date.now()}`, // Generate SKU if not provided
    };

    const result = await db.$transaction(async (tx) => {
      // Check if item already exists
      const existingItem = await tx.item.findUnique({
        where: {
          organizationId_sku: {
            organizationId: data.organizationId,
            sku: formattedData.sku,
          },
        },
      });

      if (existingItem) {
        throw new Error(`Item with SKU "${formattedData.sku}" already exists for this organization`);
      }

      // Create the item
      const newItem = await tx.item.create({ 
        data: formattedData 
      });

      // If initialQuantity is provided, create an initial inventory level
      if (initialQuantity !== undefined && initialQuantity > 0) {
        if (!locationId) {
          throw new Error("Location is required when creating initial inventory");
        }

        // Create initial inventory level
        await tx.inventoryLevel.create({
          data: {
            itemId: newItem.id,
            locationId: locationId,
            quantityOnHand: initialQuantity,
            quantityAvailable: initialQuantity,
            averageCost: unitCost || formattedData.costPrice,
            totalValue: (unitCost || formattedData.costPrice) * initialQuantity,
            lastTransactionAt: new Date(),
          },
        });

        // Create initial inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            type: TransactionType.INITIAL_STOCK,
            quantity: initialQuantity,
            unitCost: unitCost || formattedData.costPrice,
            totalCost: (unitCost || formattedData.costPrice) * initialQuantity,
            notes: `Initial stock for ${newItem.nameEn}`,
            itemId: newItem.id,
            locationId: locationId,
            organizationId: data.organizationId,
            createdById: userId,
            serialNumbers: [],
            balanceAfter: initialQuantity,
          },
        });
      }

      return {
        success: true,
        data: newItem,
      };
    });

    revalidatePath("/inventory/items");
    return result;
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
