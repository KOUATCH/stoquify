"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";
import { UpdateItemDetailsPayload } from "@/types/itemTypes";

export const updateItemDetailsById = inventoryAction(
  async ({ id, data }: { id: string; data: UpdateItemDetailsPayload }): Promise<ServerActionResult<any>> => {
    // Use a transaction for atomic operations
    const result = await db.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id },
      });

      if (!item) {
        throw new Error("Item not found");
      }
      // Exclude 'id' from the update data to avoid type errors
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
    actionName: 'updateItemDetailsById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update',
      resourceType: 'item'
    }
  }
)
