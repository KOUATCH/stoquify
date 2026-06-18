"use server"
import { safeLoggedActionErrorMessage } from '@/actions/_shared/safe-action-responses';
import { db } from '@/prisma/db';


import { revalidatePath } from 'next/cache';

const addItemSuppliers = async (itemId: string, supplierIds: string[]) => {
  try {
    const itemSuppliers = supplierIds.map((supplierId) => ({
      itemId,
      supplierId,
      // isPrefered: false,
    }))
    await db.itemSupplier.createMany({
      data:  itemSuppliers, 
      skipDuplicates:true
    })
    revalidatePath(`/dashboard/inventory/items/${itemId}`)
    return{ success:true}
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Failed to add ItemSupplier",
        error,
        { action: "addItemSuppliers" },
        "Failed to add suppliers to item",
      ),
    }
  }
 
}

export default addItemSuppliers
