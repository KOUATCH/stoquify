import { db } from "@/prisma/db"
import { Prisma } from "@prisma/client"
import type { Item as ItemModel } from "@prisma/client"
import { updateInventoryLevels } from "@/lib/inventory/update-inventory-levels"
import { itemStandardInclude } from "@/lib/item/includes"
import {
  type CreateItemInput,
  type ItemWithRelations,
  slugify as slugifyItem,
} from "@/lib/item/schemas"
import { TransactionType } from "@/types/inventory"
import type {
  BriefItemPayload,
  ItemDTO,
  ItemWithInventoryLevelsPayload,
} from "@/types/itemTypes"
import { buildPagination, buildPaginatedResult, MAX_PAGE_SIZES } from "../_shared/pagination"
import type { PaginatedParams, PaginatedResult } from "../_shared/types"
import type { ItemCreateInput, ItemUpdateInput } from "./item.schemas"

const DEFAULT_IMAGE_URL =
  "https://14J7oh8kso.ufs.sh/f/HLxTbDBCDLwfAXaapcezIN7vwylKf1PXSCqAuseUG0gx8mhd"

export type { ItemCreateInput, ItemUpdateInput }

type RelatedItemInput = Pick<
  CreateItemInput,
  "categoryId" | "brandId" | "unitId" | "taxRateId"
>

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function imageUrlList(value?: string | null) {
  const cleaned = cleanText(value)
  return cleaned ? [cleaned] : []
}

async function assertItemRelations(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: RelatedItemInput,
) {
  const checks: Array<Promise<unknown>> = []

  if (input.categoryId) {
    checks.push(
      tx.category.findFirstOrThrow({
        where: { id: input.categoryId, organizationId, deletedAt: null },
        select: { id: true },
      }),
    )
  }

  if (input.brandId) {
    checks.push(
      tx.brand.findFirstOrThrow({
        where: { id: input.brandId, organizationId, deletedAt: null },
        select: { id: true },
      }),
    )
  }

  if (input.unitId) {
    checks.push(
      tx.unit.findFirstOrThrow({
        where: { id: input.unitId, organizationId },
        select: { id: true },
      }),
    )
  }

  if (input.taxRateId) {
    checks.push(
      tx.taxRate.findFirstOrThrow({
        where: { id: input.taxRateId, organizationId },
        select: { id: true },
      }),
    )
  }

  await Promise.all(checks)
}

/** Map a Prisma Item row to the API ItemDTO. Decimals → string. */
function toDTO(row: ItemModel): ItemDTO {
  return {
    id: row.id,
    organizationId: row.organizationId,
    nameEn: row.nameEn,
    nameFr: row.nameFr,
    descriptionEn: row.descriptionEn,
    descriptionFr: row.descriptionFr,
    sku: row.sku,
    barcode: row.barcode,
    slug: row.slug,
    costPrice: row.costPrice.toNumber(),
    sellingPrice: row.sellingPrice.toNumber(),
    thumbnail: row.thumbnail,
    imageUrls: row.imageUrls[0] ?? "",
    dimensions: row.dimensions,
    upc: row.upc,
    ean: row.ean,
    mpn: row.mpn,
    isbn: row.isbn,
    categoryId: row.categoryId,
    taxRateId: row.taxRateId,
    brandId: row.brandId,
    unitId: row.unitId,
    weight: row.weight?.toNumber() ?? null,
    minStockLevel: row.minStockLevel.toNumber(),
    maxStockLevel: row.maxStockLevel?.toNumber() ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toBriefDTO(row: ItemModel): BriefItemPayload {
  return {
    id: row.id,
    name: row.nameEn,
    organizationId: row.organizationId,
    sku: row.sku,
    slug: row.slug,
    costPrice: row.costPrice.toNumber(),
    sellingPrice: row.sellingPrice.toNumber(),
    thumbnail: row.thumbnail,
    imageUrls: row.imageUrls[0] ?? "",
    salesCount: 0,
    salesTotal: 0,
    isActive: row.isActive,
    isSerialTracked: row.trackSerialNumbers,
    createdAt: row.createdAt,
  }
}

export async function listItems(
  orgId: string,
  params: PaginatedParams = {},
): Promise<PaginatedResult<ItemWithInventoryLevelsPayload>> {
  const { page = 1, pageSize = 50, search = "" } = params
  const { skip, take, page: p, pageSize: ps } = buildPagination(
    page,
    pageSize,
    MAX_PAGE_SIZES.items,
  )

  const where: Prisma.ItemWhereInput = {
    organizationId: orgId,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { nameEn: { contains: search, mode: "insensitive" as const } },
            { nameFr: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            { barcode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    db.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        brand: { select: { id: true, nameEn: true, nameFr: true } },
        category: { select: { id: true, titleEn: true, titleFr: true } },
        inventoryLevels: {
          select: {
            id: true,
            quantityOnHand: true,
            quantityReserved: true,
            quantityAvailable: true,
            quantityInTransit: true,
            quantityOnOrder: true,
            reorderPoint: true,
            totalValue: true,
          },
        },
      },
    }),
    db.item.count({ where }),
  ])

  const data: ItemWithInventoryLevelsPayload[] = rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    nameEn: row.nameEn,
    nameFr: row.nameFr,
    slug: row.slug,
    sku: row.sku,
    costPrice: row.costPrice.toNumber(),
    sellingPrice: row.sellingPrice.toNumber(),
    thumbnail: row.thumbnail,
    imageUrls: row.imageUrls[0] ?? "",
    isActive: row.isActive,
    isDiscontinued: row.isDiscontinued,
    minStockLevel: row.minStockLevel.toNumber(),
    maxStockLevel: row.maxStockLevel?.toNumber() ?? null,
    reorderLevel: row.reorderLevel.toNumber(),
    reorderQuantity: row.reorderQuantity?.toNumber() ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    brand: row.brand
      ? { id: row.brand.id, brandName: row.brand.nameEn }
      : null,
    category: row.category
      ? { id: row.category.id, title: row.category.titleEn }
      : null,
    categoryId: row.categoryId,
    inventoryLevels: row.inventoryLevels.map((lvl) => ({
      id: lvl.id,
      quantityOnHand: lvl.quantityOnHand.toNumber(),
      quantityReserved: lvl.quantityReserved.toNumber(),
      quantityAvailable: lvl.quantityAvailable.toNumber(),
      quantityInTransit: lvl.quantityInTransit.toNumber(),
      quantityOnOrder: lvl.quantityOnOrder.toNumber(),
      reorderPoint: lvl.reorderPoint.toNumber(),
      totalValue: lvl.totalValue.toNumber(),
    })),
  }))

  return buildPaginatedResult(data, total, p, ps)
}

export async function getItem(orgId: string, id: string): Promise<ItemDTO | null> {
  const row = await db.item.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  })
  return row ? toDTO(row) : null
}

export async function createItem(
  orgId: string,
  userId: string,
  input: ItemCreateInput,
): Promise<ItemDTO> {
  const slug =
    input.slug ||
    input.nameEn
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
  const sku = input.sku || `SKU-${Date.now()}`
  const imageUrls: string[] = Array.isArray(input.imageUrls)
    ? input.imageUrls
    : input.imageUrls
      ? [input.imageUrls]
      : [DEFAULT_IMAGE_URL]

  return db.$transaction(async (tx) => {
    const existing = await tx.item.findFirst({
      where: { organizationId: orgId, sku },
      select: { id: true },
    })
    if (existing) throw new Error(`Item with SKU "${sku}" already exists`)

    const newItem = await tx.item.create({
      data: {
        organizationId: orgId,
        nameEn: input.nameEn,
        nameFr: input.nameFr ?? null,
        descriptionEn: input.descriptionEn ?? null,
        descriptionFr: input.descriptionFr ?? null,
        sku,
        slug,
        costPrice: new Prisma.Decimal(input.costPrice ?? 0),
        sellingPrice: new Prisma.Decimal(input.sellingPrice ?? 0),
        imageUrls,
        thumbnail: input.thumbnail ?? null,
        categoryId: input.categoryId ?? null,
        brandId: input.brandId ?? null,
        unitId: input.unitId ?? null,
        taxRateId: input.taxRateId ?? null,
      },
    })

    if (
      input.locationId &&
      input.initialQuantity !== undefined &&
      input.initialQuantity > 0
    ) {
      const cost = new Prisma.Decimal(input.unitCost ?? input.costPrice ?? 0)
      const qty = new Prisma.Decimal(input.initialQuantity)
      const total = cost.mul(qty)

      await tx.inventoryLevel.create({
        data: {
          itemId: newItem.id,
          locationId: input.locationId,
          quantityOnHand: qty,
          quantityAvailable: qty,
          averageCost: cost,
          totalValue: total,
          lastTransactionAt: new Date(),
        },
      })

      await tx.inventoryTransaction.create({
        data: {
          type: TransactionType.INITIAL_STOCK,
          quantity: qty,
          unitCost: cost,
          totalCost: total,
          notes: `Initial stock for ${newItem.nameEn}`,
          itemId: newItem.id,
          locationId: input.locationId,
          organizationId: orgId,
          createdById: userId,
          serialNumbers: [],
          balanceAfter: qty,
        },
      })
    }

    return toDTO(newItem)
  })
}

export async function createItemFromForm(
  orgId: string,
  userId: string,
  input: CreateItemInput,
): Promise<ItemWithRelations> {
  const nameEn = input.nameEn.trim()
  const sku = input.sku.trim()
  const slug = input.slug ? slugifyItem(input.slug) : slugifyItem(`${nameEn}-${sku}`)
  const barcode = cleanText(input.barcode)

  return db.$transaction(async (tx) => {
    const [existingSku, existingSlug, existingBarcode] = await Promise.all([
      tx.item.findFirst({
        where: { organizationId: orgId, sku },
        select: { id: true },
      }),
      tx.item.findFirst({
        where: { organizationId: orgId, slug },
        select: { id: true },
      }),
      barcode
        ? tx.item.findFirst({
            where: { organizationId: orgId, barcode },
            select: { id: true },
          })
        : Promise.resolve(null),
    ])

    if (existingSku) throw new Error(`Item with SKU "${sku}" already exists`)
    if (existingSlug) throw new Error(`Item with slug "${slug}" already exists`)
    if (existingBarcode) throw new Error(`Item with barcode "${barcode}" already exists`)

    await assertItemRelations(tx, orgId, input)

    const item = await tx.item.create({
      data: {
        organizationId: orgId,
        nameEn,
        nameFr: cleanText(input.nameFr),
        descriptionEn: cleanText(input.descriptionEn),
        descriptionFr: cleanText(input.descriptionFr),
        imageUrls: imageUrlList(input.imageUrls),
        thumbnail: cleanText(input.thumbnail),
        sku,
        barcode,
        upc: cleanText(input.upc),
        ean: cleanText(input.ean),
        mpn: cleanText(input.mpn),
        isbn: cleanText(input.isbn),
        dimensions: cleanText(input.dimensions),
        weight: input.weight ?? null,
        costPrice: new Prisma.Decimal(input.costPrice ?? 0),
        sellingPrice: new Prisma.Decimal(input.sellingPrice ?? 0),
        categoryId: input.categoryId ?? null,
        brandId: input.brandId ?? null,
        unitId: input.unitId ?? null,
        taxRateId: input.taxRateId ?? null,
        minStockLevel: new Prisma.Decimal(input.minStockLevel ?? 0),
        maxStockLevel:
          input.maxStockLevel === null || input.maxStockLevel === undefined
            ? null
            : new Prisma.Decimal(input.maxStockLevel),
        isActive: input.isActive ?? true,
        trackSerialNumbers: input.isSerialTracked ?? false,
        slug,
      },
      include: itemStandardInclude,
    })

    if (input.initialInventory && input.initialInventory.quantity > 0) {
      const inventory = input.initialInventory

      await updateInventoryLevels(tx, {
        itemId: item.id,
        locationId: inventory.locationId,
        deltaQty: inventory.quantity,
        unitCost: inventory.unitCost ?? item.costPrice.toNumber(),
        organizationId: orgId,
        meta: {
          notes: inventory.notes ?? "Initial item stock",
          createdById: inventory.createdById ?? userId,
          referenceType: "GOODS_RECEIPT",
          referenceNumber: inventory.referenceNumber,
          batchNumber: inventory.batchNumber,
          serialNumbers: inventory.serialNumbers,
          expiryDate: inventory.expiryDate,
        },
      })
    }

    return item
  })
}

export async function updateItem(
  orgId: string,
  id: string,
  input: ItemUpdateInput,
): Promise<ItemDTO> {
  const existing = await db.item.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  })
  if (!existing) throw new Error("Item not found")

  const updated = await db.item.update({
    where: { id },
    data: {
      ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
      ...(input.nameFr !== undefined ? { nameFr: input.nameFr ?? null } : {}),
      ...(input.descriptionEn !== undefined
        ? { descriptionEn: input.descriptionEn ?? null }
        : {}),
      ...(input.descriptionFr !== undefined
        ? { descriptionFr: input.descriptionFr ?? null }
        : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.costPrice !== undefined
        ? { costPrice: new Prisma.Decimal(input.costPrice) }
        : {}),
      ...(input.sellingPrice !== undefined
        ? { sellingPrice: new Prisma.Decimal(input.sellingPrice) }
        : {}),
      ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail ?? null } : {}),
      ...(input.imageUrls !== undefined ? { imageUrls: input.imageUrls } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isDiscontinued !== undefined
        ? { isDiscontinued: input.isDiscontinued }
        : {}),
    },
  })
  return toDTO(updated)
}

export async function deleteItem(orgId: string, id: string): Promise<ItemDTO> {
  const item = await db.item.findFirst({ where: { id, organizationId: orgId } })
  if (!item) throw new Error("Item not found")

  // Soft delete — Item schema has deletedAt. Preserves the historical record
  // for sales/inventory transactions that reference this item.
  const deleted = await db.item.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  })
  return toDTO(deleted)
}

// Convenience for components that just need a flat list.
export async function listItemsBrief(orgId: string): Promise<BriefItemPayload[]> {
  const rows = await db.item.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })
  return rows.map(toBriefDTO)
}
