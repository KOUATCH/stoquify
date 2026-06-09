"use server";

import { db } from "@/prisma/db";
import { inventoryAction } from "@/lib/error-handling";
import type { ServerActionResult } from "@/lib/error-handling/types";


export const deleteItem = inventoryAction(
  async (id: string): Promise<ServerActionResult<any>> => {

  try {
      const item = await db.item.findUnique({
        where: { id },
        select: {
          id: true,
          _count: {
            select: {
              salesOrderLines: true,
              purchaseOrderLines: true,
              inventoryTransactions: true,
              transferLines: true,
              adjustmentLines: true,
              goodsReceiptLines: true,
            },
          },
        },
      })

      if (!item) {
        throw new Error('Item not found');
      }

      const relatedRecords =
        item._count.salesOrderLines +
        item._count.purchaseOrderLines +
        item._count.inventoryTransactions +
        item._count.transferLines +
        item._count.adjustmentLines +
        item._count.goodsReceiptLines;

      if (relatedRecords > 0) {
        throw new Error('Item has related records and cannot be deleted');
      }
      const deletedItem = await db.item.delete({
        where: {  id },
      });

      return {
        success: true,
        data: deletedItem
      };

    } catch (error) {
      throw error;
    }
  },
  {
    actionName: 'deleteItem',
    component: 'InventoryManagement',
    businessContext: {
      domain: 'inventory',
      operation: 'delete',
      resourceType: 'item',
      critical: true
    }
  }
);
