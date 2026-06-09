"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";
import { UpdateItemPricingPayload } from "@/types/itemTypes";

export const updateItemPricingById = inventoryAction(
  async ({ id, data }: { id: string; data: UpdateItemPricingPayload }): Promise<ServerActionResult<any>> => {
    // Use a transaction for atomic operations
    const result = await db.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id },
      });

      if (!item) {
        throw new Error("Item not found");
      }
      // Exclude 'id' from data before updating
      const { id: _id, ...updateData } = data;
      const updatedItem = await tx.item.update({
        where: { id },
        data: updateData
      });

      revalidatePath("/inventory/items");
      return updatedItem;
    });

    return {
      data: result,
      success: true,
    };
  },
  {
    actionName: 'updateItemPricingById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update',
      resourceType: 'item'
    }
  }
)
