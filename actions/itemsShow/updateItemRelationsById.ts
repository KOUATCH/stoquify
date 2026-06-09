"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { db } from "@/prisma/db";
import { UpdateItemRelationsPayload } from "@/types/itemTypes";
import { revalidatePath } from "next/cache";

export const updateItemRelationsById = inventoryAction(
  async ({ id, data }: { id: string; data: UpdateItemRelationsPayload }): Promise<ServerActionResult<any>> => {
    // Use a transaction for atomic operations
    const result = await db.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id },
      });

      if (!item) {
        throw new Error("Item not found");
      }

      const updatedItem = await tx.item.update({
        where: { id },
        data: { ...data }
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
    actionName: 'updateItemRelationsById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update',
      resourceType: 'item'
    }
  }
)
