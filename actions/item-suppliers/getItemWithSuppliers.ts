"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { db } from "@/prisma/db"
import type { ItemWithSupplierDTO, SupplierItemResponse } from "@/types/itemTypes"

/**
 * Retrieves an item with its associated suppliers via ItemSupplier (supplierItems)
 * Maps Prisma fields to UI-friendly names:
 *   - leadTimeDays -> leadTime
 *   - minOrderQuantity -> minOrderQty
 */
export default async function getItemWithSuppliersById(id: string): Promise<SupplierItemResponse> {
  if (!id || typeof id !== "string") {
    return {
      success: false,
      data: [],
      error: "Invalid item ID provided"

    }
  }

  try {
    const toNumber = (value: any): number => {
      if (value === null || value === undefined) return 0
      if (typeof value === "number") return value
      if (typeof value === "string") return Number(value) || 0
      if (typeof value.toNumber === "function") return value.toNumber()
      return Number(value) || 0
    }

    const item = await db.item.findUnique({
      where: { id },
      select: {
        id: true,
        nameEn: true,
        nameFr: true,
        slug: true,
        sku: true,
        imageUrls: true,
        thumbnail: true,
        costPrice: true,
        sellingPrice: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        // supplierId:true,
        supplierItems: {
          select: {
            id: true,
            itemId: true,
            supplierId: true,
            isPreferred: true,
            supplierSku: true,
            supplierName: true, // available if you want to show supplier's alias for this item
            leadTimeDays: true,
            minOrderQuantity: true,
            unitCost: true,
            lastPurchaseDate: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!item) {
      return {
         success: false,
         data: [], 
        error: `Item with ID ${id} not found` 
    }
    }

    const itemSuppliers = (item.supplierItems ?? []).map((rel: any) => ({
      id: rel.id,
      name: item.nameEn ?? item.nameFr ?? item.sku,
      slug: item.slug,
      itemId: rel.itemId,
      supplierId: rel.supplierId,
      isPreferred: rel.isPreferred,
      supplierSku: rel.supplierSku ?? "",
      leadTime: rel.leadTimeDays ?? null,
      minOrderQty: rel.minOrderQuantity ?? null,
      unitCost: rel.unitCost ? toNumber(rel.unitCost) : null,
      lastPurchaseDate: rel.lastPurchaseDate ?? null,
      notes: rel.notes ?? "",
      createdAt: rel.createdAt,
      updatedAt: rel.updatedAt,
      costPrice: toNumber(item.costPrice),
      sellingPrice: toNumber(item.sellingPrice),
      imageUrls: item.imageUrls?.[0] ?? "",
      thumbnail: item.thumbnail,
      organizationId: item.organizationId,
      sku: item.sku,
      supplierItems: rel,
      supplier: {
        id: rel.supplier?.id,
        name: rel.supplier?.name ?? rel.supplierName ?? "Unknown",
        email: rel.supplier?.email ?? null,
      },
    })) as ItemWithSupplierDTO[]

    return {
      success: true,
      data: itemSuppliers,
      error: null

    }
  } catch (error) {
    return {
      success: false,
      data: [],
      error: safeLoggedActionErrorMessage(
        "Error fetching item suppliers for item",
        error,
        { action: "getItemWithSuppliersById" },
        "Failed to fetch item suppliers",
      )

    }
  }
}
