"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { db } from "@/prisma/db"
import { getSession } from "@/lib/auth-server"
import { resolveActionOrganization } from "@/services/_shared/resolve-action-organization"
import { removeItemSupplierForOrganization } from "@/services/supplier/supplier.service"
import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"

function itemDisplayName(item: { nameEn?: string | null; nameFr?: string | null; sku?: string | null }) {
  return item.nameEn ?? item.nameFr ?? item.sku ?? "Unnamed item"
}

function withItemDisplayName<T extends { item?: { nameEn?: string | null; nameFr?: string | null; sku?: string | null } | null }>(
  itemSupplier: T
) {
  const itemSupplierRow = itemSupplier as T & {
    supplierSku?: string | null
    supplierName?: string | null
    minOrderQuantity?: unknown
  }
  const legacyAliases = {
    supplierProductCode: itemSupplierRow.supplierSku,
    supplierProductName: itemSupplierRow.supplierName,
    minimumOrderQuantity: itemSupplierRow.minOrderQuantity,
  }

  if (!itemSupplier.item) return itemSupplier

  return {
    ...itemSupplier,
    ...legacyAliases,
    item: {
      ...itemSupplier.item,
      name: itemDisplayName(itemSupplier.item),
    },
  }
}

function itemSupplierOrgWhere(organizationId: string): Prisma.ItemSupplierWhereInput {
  return {
    item: { organizationId },
    supplier: { organizationId },
  }
}

function buildItemSupplierCreateData(
  data: ItemSupplierData
): Prisma.ItemSupplierUncheckedCreateInput {
  return {
    itemId: data.itemId,
    supplierId: data.supplierId,
    supplierSku: data.supplierProductCode,
    supplierName: data.supplierProductName,
    unitCost: data.unitCost,
    minOrderQuantity: data.minimumOrderQuantity,
    leadTimeDays: data.leadTimeDays,
    isPreferred: data.isPreferred ?? false,
    notes: data.notes,
  }
}

function buildItemSupplierUpdateData(
  data: Omit<UpdateItemSupplierData, "id">
): Prisma.ItemSupplierUncheckedUpdateInput {
  const updateData: Prisma.ItemSupplierUncheckedUpdateInput = {}

  if (data.itemId !== undefined) updateData.itemId = data.itemId
  if (data.supplierId !== undefined) updateData.supplierId = data.supplierId
  if (data.supplierProductCode !== undefined) updateData.supplierSku = data.supplierProductCode
  if (data.supplierProductName !== undefined) updateData.supplierName = data.supplierProductName
  if (data.unitCost !== undefined) updateData.unitCost = data.unitCost
  if (data.minimumOrderQuantity !== undefined) updateData.minOrderQuantity = data.minimumOrderQuantity
  if (data.leadTimeDays !== undefined) updateData.leadTimeDays = data.leadTimeDays
  if (data.isPreferred !== undefined) updateData.isPreferred = data.isPreferred
  if (data.notes !== undefined) updateData.notes = data.notes

  return updateData
}

export interface ItemSupplierData {
  itemId: string
  supplierId: string
  supplierProductCode?: string
  supplierProductName?: string
  unitCost?: number
  minimumOrderQuantity?: number
  leadTimeDays?: number
  isPreferred?: boolean
  notes?: string
  isActive?: boolean
}

export interface UpdateItemSupplierData extends Partial<ItemSupplierData> {
  id: string
}

export async function getItemSuppliers(organizationId?: string) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: "Unauthorized", data: [] }
    }

    const orgId = organizationId || (session.user as any).organizationId as string

    if (!orgId) {
      return { success: false, error: "No organization ID", data: [] }
    }

    const itemSuppliers = await db.itemSupplier.findMany({
      where: {
        ...itemSupplierOrgWhere(orgId),
      },
      include: {
        item: {
          select: {
            id: true,
            nameEn: true,
            nameFr: true,
            sku: true,
            category: true
          }
        },
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return {
      success: true,
      data: itemSuppliers.map(withItemDisplayName),
      error: null
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching item suppliers",
        error,
        { action: "getItemSuppliers" },
        "Failed to fetch item suppliers",
      ),
      data: []
    }
  }
}

export async function getItemSupplierById(id: string) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: "Unauthorized", data: null }
    }

    const itemSupplier = await db.itemSupplier.findFirst({
      where: {
        id: id,
        ...itemSupplierOrgWhere((session.user as any).organizationId as string)
      },
      include: {
        item: {
          select: {
            id: true,
            nameEn: true,
            nameFr: true,
            sku: true,
            category: true
          }
        },
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!itemSupplier) {
      return { success: false, error: "Item supplier not found", data: null }
    }

    return {
      success: true,
      data: withItemDisplayName(itemSupplier),
      error: null
    }
  } catch (error) {
    return { 
      success: false, 
      error: safeLoggedActionErrorMessage(
        "Error fetching item supplier",
        error,
        { action: "getItemSupplierById" },
        "Failed to fetch item supplier",
      ), 
      data: null 
    }
  }
}

export async function createItemSupplier(data: ItemSupplierData) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if the item supplier relationship already exists
    const existingRelation = await db.itemSupplier.findFirst({
      where: {
        itemId: data.itemId,
        supplierId: data.supplierId,
        ...itemSupplierOrgWhere((session.user as any).organizationId as string),
      }
    })

    if (existingRelation) {
      return { success: false, error: "Item supplier relationship already exists" }
    }

    const [item, supplier] = await Promise.all([
      db.item.findFirst({
        where: { id: data.itemId, organizationId: (session.user as any).organizationId as string },
        select: { id: true },
      }),
      db.supplier.findFirst({
        where: { id: data.supplierId, organizationId: (session.user as any).organizationId as string },
        select: { id: true },
      }),
    ])

    if (!item || !supplier) {
      return { success: false, error: "Item or supplier not found for this organization" }
    }

    const itemSupplier = await db.itemSupplier.create({
      data: buildItemSupplierCreateData(data),
      include: {
        item: {
          select: {
            id: true,
            nameEn: true,
            nameFr: true,
            sku: true,
            category: true
          }
        },
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            phone: true
          }
        }
      }
    })

    revalidatePath("/dashboard/inventory/items")
    revalidatePath("/dashboard/purchases/suppliers")

    return { success: true, data: withItemDisplayName(itemSupplier) }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error creating item supplier",
        error,
        { action: "createItemSupplier" },
        "Failed to create item supplier",
      ),
    }
  }
}

export async function updateItemSupplier(data: UpdateItemSupplierData) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    const { id, ...updateData } = data

    const existingRelation = await db.itemSupplier.findFirst({
      where: {
        id,
        ...itemSupplierOrgWhere((session.user as any).organizationId as string),
      },
      select: { id: true },
    })

    if (!existingRelation) {
      return { success: false, error: "Item supplier not found" }
    }

    const itemSupplier = await db.itemSupplier.update({
      where: { id },
      data: buildItemSupplierUpdateData(updateData),
      include: {
        item: {
          select: {
            id: true,
            nameEn: true,
            nameFr: true,
            sku: true,
            category: true
          }
        },
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            phone: true
          }
        }
      }
    })

    revalidatePath("/dashboard/inventory/items")
    revalidatePath("/dashboard/purchases/suppliers")

    return { success: true, data: withItemDisplayName(itemSupplier) }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating item supplier",
        error,
        { action: "updateItemSupplier" },
        "Failed to update item supplier",
      ),
    }
  }
}

export async function deleteItemSupplier(id: string) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    const itemSupplier = await removeItemSupplierForOrganization(
      (session.user as any).organizationId as string,
      id,
    )

    revalidatePath("/dashboard/inventory/items")
    revalidatePath("/dashboard/purchases/suppliers")

    return { success: true, data: itemSupplier }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error deleting item supplier",
        error,
        { action: "deleteItemSupplier" },
        "Failed to delete item supplier",
      ),
    }
  }
}

export async function getAllOrgItemSuppliers(organizationId: string) {
  try {
    const scopedOrgId = await resolveActionOrganization(organizationId, "item suppliers")

    const itemSuppliers = await db.itemSupplier.findMany({
      where: {
        ...itemSupplierOrgWhere(scopedOrgId),
      },
      select: {
        id: true,
        itemId: true,
        supplierId: true,
        supplierSku: true,
        supplierName: true,
        unitCost: true,
        minOrderQuantity: true,
        isPreferred: true,
        item: {
          select: {
            id: true,
            nameEn: true,
            nameFr: true,
            sku: true
          }
        },
        supplier: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return {
      success: true,
      data: itemSuppliers.map(withItemDisplayName),
      error: null
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching all org item suppliers",
        error,
        { action: "getAllOrgItemSuppliers" },
        "Failed to fetch all org item suppliers",
      ),
      data: []
    }
  }
}

export async function getItemSuppliersByItemId(itemId: string) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: "Unauthorized", data: [] }
    }

    const itemSuppliers = await db.itemSupplier.findMany({
      where: {
        itemId: itemId,
        ...itemSupplierOrgWhere((session.user as any).organizationId as string),
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: [
        { isPreferred: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return {
      success: true,
      data: itemSuppliers,
      error: null
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching item suppliers by item ID",
        error,
        { action: "getItemSuppliersByItemId" },
        "Failed to fetch item suppliers by item ID",
      ),
      data: []
    }
  }
}
