"use server";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";
import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";
import { UpdateItemBasicInfoPayload } from "@/types/itemTypes";

export const updateItemBasicInfoById = inventoryAction(
  async ({ id, data }: { id: string; data: UpdateItemBasicInfoPayload }): Promise<ServerActionResult<any>> => {
    // Use a transaction for atomic operations
    const result = await db.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id },
      });

      if (!item) {
        throw new Error("Item not found");
      }

      const { id: _id, organizationId, imageUrls, ...updateData } = data;

      const updatedItem = await tx.item.update({
        where: { id },
        data: {
          ...updateData,
          imageUrls:
            imageUrls === undefined
              ? undefined
              : Array.isArray(imageUrls)
                ? imageUrls
                : imageUrls
                  ? [imageUrls]
                  : [],
        }
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
    actionName: 'updateItemBasicInfoById',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'update',
      resourceType: 'item'
    }
  }
)
