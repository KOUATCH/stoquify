"use server";

import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import type { UpdateItemStockPayload } from "@/types/itemTypes";

interface StockAdjustmentData {
  quantityChange: number;
  reason: string;
  notes?: string;
  adjustmentType?: string;
}

export const updateItemStockById = inventoryAction(
  async ({ id, data }: { id: string; data: StockAdjustmentData | UpdateItemStockPayload }): Promise<ServerActionResult<any>> => {
    // Use a transaction for atomic operations
    return await db.$transaction(async (tx) => {
      // First, get the item with its inventory levels
      const item = await tx.item.findUnique({
        where: { id },
        include: {
          inventoryLevels: true,
        },
      });

      if (!item) {
        throw new Error("Item not found");
      }

      if (!("quantityChange" in data)) {
        const updatedItem = await tx.item.update({
          where: { id },
          data: {
            minStockLevel: data.minStockLevel,
            maxStockLevel: data.maxStockLevel,
          },
          include: {
            inventoryLevels: true,
          },
        });

        revalidatePath("/dashboard/inventory/items");

        return {
          success: true,
          data: updatedItem,
        };
      }

      // Get current inventory level (assuming first one is primary)
      let currentInventory = item.inventoryLevels[0];
      let currentQuantity = 0;

      if (!currentInventory) {
        // Get the default location for the organization
        const defaultLocation = await tx.location.findFirst({
          where: {
            organizationId: item.organizationId,
            isDefault: true,
          },
        });

        if (!defaultLocation) {
          throw new Error("No default location found for organization");
        }

        // Create a new inventory level if none exists
        currentInventory = await tx.inventoryLevel.create({
          data: {
            id: crypto.randomUUID(),
            itemId: id,
            locationId: defaultLocation.id,
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityAvailable: 0,
            quantityInTransit: 0,
            quantityOnOrder: 0,
            reorderPoint: 10,
            averageCost: Number(item.costPrice ?? 0),
            totalValue: 0,
            lastCountDate: new Date(),
            lastTransactionAt: new Date(),
            updatedAt: new Date(),
          },
        });
      } else {
        currentQuantity = Number(currentInventory.quantityOnHand ?? 0);
      }

      let newQuantity: number;

      if (data.adjustmentType === 'set') {
        // Set to specific quantity
        newQuantity = Math.max(0, data.quantityChange);
      } else {
        // Increase or decrease by quantityChange
        newQuantity = Math.max(0, currentQuantity + data.quantityChange);
      }

      // Update the inventory level
      const updatedInventory = await tx.inventoryLevel.update({
        where: { id: currentInventory.id },
        data: {
          quantityOnHand: newQuantity,
          quantityAvailable: newQuantity, // Update available quantity too
          totalValue: newQuantity * Number(item.costPrice ?? 0),
          lastTransactionAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create a stock movement record (if you have a stockMovements table)
      // You might need to create this table/model if it doesn't exist
      /*
      await tx.stockMovement.create({
        data: {
          itemId: id,
          movementType: data.quantityChange > 0 ? 'INCREASE' : 'DECREASE',
          quantity: Math.abs(data.quantityChange),
          reason: data.reason,
          notes: data.notes,
          userId: '', // You'd get this from session
          createdAt: new Date(),
        },
      });
      */

      revalidatePath("/dashboard/inventory/items");

      return {
        success: true,
        data: {
          ...item,
          inventoryLevels: [updatedInventory, ...item.inventoryLevels.slice(1)]
        }
      };
    });
  },
  {
    actionName: 'updateItemStockById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update_stock',
      resourceType: 'item',
      critical: true
    }
  }
);
