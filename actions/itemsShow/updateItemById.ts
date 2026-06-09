"use server";

import { db } from "@/prisma/db";
import { UpdateItemPayload } from "@/types/itemTypes";
import { revalidatePath } from "next/cache";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";

export const updateItemById = inventoryAction(
  async ({ id, data }: { id: string; data: any }): Promise<ServerActionResult<any>> => {
  try {
    // Use a transaction for atomic operations
    return await db.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id },
        include: {
          inventoryLevels: true,
          category: true,
          brand: true,
          unit: true,
        },
      });

      if (!item) {
        throw new Error("Item not found");
      }

      // Filter out undefined values and prepare update data
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined && value !== null)
      );

      // Remove fields that don't exist in schema
      delete updateData.featuredReason;
      delete updateData.featuredAt;
      delete updateData.discontinuedAt;
      delete updateData.discontinueReason;
      delete updateData.discontinueNotes;
      delete updateData.isFeatured;
      delete updateData.name;
      delete updateData.description;

      const updatedItem = await tx.item.update({
        where: { id },
        data: updateData,
        include: {
          inventoryLevels: true,
          category: true,
          brand: true,
          unit: true,
        },
      });

      revalidatePath("/dashboard/inventory/items");

      return {
        success: true,
        data: updatedItem,
      };
     });
  } catch (error) {
    throw error;
  }
  },
  {
    actionName: 'updateItemById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update',
      resourceType: 'item'
    }
  }
);
