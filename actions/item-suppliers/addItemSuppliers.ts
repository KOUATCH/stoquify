"use server"
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
    console.log("Failed to add ItemSupplier", error)
    throw new Error("Failed to add suppliers to item")
  }
 
}

export default addItemSuppliers