import { db } from "@/prisma/db"
import { Prisma } from "@prisma/client"
import type { Item as ItemModel } from "@prisma/client"
import { itemStandardInclude } from "@/lib/item/includes"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { postOpeningStock } from "@/services/inventory/inventory-stock-event.service"
import { requestManualItemStockAdjustment } from "@/services/inventory/inventory-adjustment.service"
import {
  type CreateItemInput,
  type ItemWithRelations,
  slugify as slugifyItem,
} from "@/lib/item/schemas"
import type {
  BriefItemPayload,
  ItemDTO,
  ItemPayload,
  ItemWithInventoryLevelsPayload,
} from "@/types/itemTypes"
import { buildPagination, buildPaginatedResult, MAX_PAGE_SIZES } from "../_shared/pagination"
import type { PaginatedParams, PaginatedResult } from "../_shared/types"
import type { ItemCreateInput, ItemUpdateInput } from "./item.schemas"

const DEFAULT_IMAGE_URL =
  "https://14J7oh8kso.ufs.sh/f/HLxTbDBCDLwfAXaapcezIN7vwylKf1PXSCqAuseUG0gx8mhd"

export type { ItemCreateInput, ItemUpdateInput }
export type { ItemWithRelations }

type RelatedItemInput = Pick<
  CreateItemInput,
  "categoryId" | "brandId" | "unitId" | "taxRateId"
>

export type ListItemsWithRelationsInput = {
  organizationId: string
  q?: string
  page?: number
  pageSize?: number
  sortBy?: "createdAt" | "updatedAt" | "nameEn" | "sku" | "sellingPrice" | "costPrice"
  sortOrder?: "asc" | "desc"
  categoryId?: string
  brandId?: string
  unitId?: string
  taxRateId?: string
  isActive?: boolean
}

export type PaginatedItemsWithRelations = {
  data: ItemWithRelations[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ItemBasicInfoUpdateInput = {
  id?: string | null
  organizationId?: unknown
  nameEn?: string
  nameFr?: string | null
  descriptionEn?: string | null
  descriptionFr?: string | null
  imageUrls?: string | string[] | null
  thumbnail?: string | null
}

export type ItemDetailsUpdateInput = {
  id?: string | null
  organizationId?: unknown
  sku?: string
  barcode?: string | null
  dimensions?: string | null
  weight?: number | null
  upc?: string | null
  ean?: string | null
  mpn?: string | null
  isbn?: string | null
}

export type ItemPricingUpdateInput = {
  id?: string | null
  organizationId?: unknown
  costPrice?: number
  sellingPrice?: number
  tax?: number | null
}

export type ItemRelationsUpdateInput = {
  id?: string | null
  organizationId?: unknown
  categoryId?: string | null
  brandId?: string | null
  unitId?: string | null
  taxRateId?: string | null
}

export type ItemStockMutationInput = {
  id?: string | null
  organizationId?: unknown
  minStockLevel?: number | null
  maxStockLevel?: number | null
  unitOfMeasure?: string | null
  adjustInventory?: {
    locationId: string
    deltaQty: number
    unitCost?: number
    notes?: string
  }
}

const disallowedGenericUpdateFields = new Set([
  "id",
  "organizationId",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "inventoryLevels",
  "category",
  "brand",
  "unit",
  "taxRate",
  "featuredReason",
  "featuredAt",
  "discontinuedAt",
  "discontinueReason",
  "discontinueNotes",
  "isFeatured",
  "name",
  "description",
])

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function imageUrlList(value?: string | null) {
  const cleaned = cleanText(value)
  return cleaned ? [cleaned] : []
}

function decimalInput(value: unknown) {
  return new Prisma.Decimal(value == null || value === "" ? 0 : (value as Prisma.Decimal.Value))
}

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value?.toNumber() ?? 0
}

function imageUrlsToString(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.join(",")
  return value ?? ""
}

function normalizeImageUrls(value: unknown): string[] | undefined {
  if (value === undefined) return undefined
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean)
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }
  if (value === null) return []
  return undefined
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>
}

function itemPayload(row: Pick<
  ItemModel,
  | "id"
  | "nameEn"
  | "slug"
  | "costPrice"
  | "sellingPrice"
  | "createdAt"
  | "imageUrls"
  | "thumbnail"
  | "organizationId"
  | "sku"
  | "descriptionEn"
>): ItemPayload {
  return {
    id: row.id,
    name: row.nameEn,
    slug: row.slug,
    costPrice: row.costPrice.toNumber(),
    sellingPrice: row.sellingPrice.toNumber(),
    createdAt: row.createdAt,
    imageUrls: imageUrlsToString(row.imageUrls),
    thumbnail: row.thumbnail,
    organizationId: row.organizationId,
    sku: row.sku,
    description: row.descriptionEn || "",
  }
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

function toInventoryPayload(
  row: Prisma.ItemGetPayload<{
    include: {
      brand: { select: { id: true; nameEn: true; nameFr: true } }
      category: { select: { id: true; titleEn: true; titleFr: true } }
      inventoryLevels: {
        select: {
          id: true
          quantityOnHand: true
          quantityReserved: true
          quantityAvailable: true
          quantityInTransit: true
          quantityOnOrder: true
          reorderPoint: true
          totalValue: true
        }
      }
    }
  }>,
): ItemWithInventoryLevelsPayload {
  return {
    id: row.id,
    organizationId: row.organizationId,
    nameEn: row.nameEn,
    nameFr: row.nameFr,
    descriptionEn: row.descriptionEn,
    descriptionFr: row.descriptionFr,
    name: row.nameEn,
    description: row.descriptionEn,
    slug: row.slug,
    sku: row.sku,
    costPrice: row.costPrice.toNumber(),
    sellingPrice: row.sellingPrice.toNumber(),
    thumbnail: row.thumbnail,
    imageUrls: imageUrlsToString(row.imageUrls),
    isActive: row.isActive,
    isDiscontinued: row.isDiscontinued,
    minStockLevel: row.minStockLevel.toNumber(),
    maxStockLevel: row.maxStockLevel?.toNumber() ?? null,
    reorderLevel: row.reorderLevel.toNumber(),
    reorderQuantity: row.reorderQuantity?.toNumber() ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    brand: row.brand ? { id: row.brand.id, brandName: row.brand.nameEn } : null,
    category: row.category ? { id: row.category.id, title: row.category.titleEn } : null,
    categoryId: row.categoryId,
    inventoryLevels: row.inventoryLevels.map((level) => ({
      id: level.id,
      quantityOnHand: level.quantityOnHand.toNumber(),
      quantityReserved: level.quantityReserved.toNumber(),
      quantityAvailable: level.quantityAvailable.toNumber(),
      quantityInTransit: level.quantityInTransit.toNumber(),
      quantityOnOrder: level.quantityOnOrder.toNumber(),
      reorderPoint: level.reorderPoint.toNumber(),
      totalValue: level.totalValue.toNumber(),
    })),
  }
}

function itemWhereFromListInput(input: ListItemsWithRelationsInput): Prisma.ItemWhereInput {
  return {
    organizationId: input.organizationId,
    deletedAt: null,
    ...(input.q
      ? {
          OR: [
            { nameEn: { contains: input.q, mode: "insensitive" as const } },
            { nameFr: { contains: input.q, mode: "insensitive" as const } },
            { sku: { contains: input.q, mode: "insensitive" as const } },
            { barcode: { contains: input.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(input.brandId ? { brandId: input.brandId } : {}),
    ...(input.unitId ? { unitId: input.unitId } : {}),
    ...(input.taxRateId ? { taxRateId: input.taxRateId } : {}),
    ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
  }
}

function buildGenericItemUpdateData(data: Record<string, unknown>): Prisma.ItemUpdateInput {
  const updateData: Prisma.ItemUpdateInput = {}
  const updateRecord = updateData as Record<string, unknown>

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || disallowedGenericUpdateFields.has(key)) continue

    switch (key) {
      case "costPrice":
      case "sellingPrice":
      case "weight":
      case "minStockLevel":
      case "maxStockLevel":
      case "reorderLevel":
      case "reorderQuantity":
        updateRecord[key] = decimalInput(value)
        break
      case "imageUrls":
        updateData.imageUrls = normalizeImageUrls(value)
        break
      case "nameEn":
      case "nameFr":
      case "descriptionEn":
      case "descriptionFr":
      case "slug":
      case "sku":
      case "barcode":
      case "dimensions":
      case "upc":
      case "ean":
      case "mpn":
      case "isbn":
      case "thumbnail":
      case "categoryId":
      case "brandId":
      case "unitId":
      case "taxRateId":
      case "isActive":
      case "isDiscontinued":
      case "trackInventory":
      case "trackSerialNumbers":
      case "trackBatches":
      case "trackExpiry":
        updateRecord[key] = value
        break
      default:
        break
    }
  }

  return updateData
}

async function assertItemInTenant(
  client: typeof db | Prisma.TransactionClient,
  organizationId: string,
  itemId: string,
) {
  const item = await client.item.findFirst({
    where: { id: itemId, organizationId, deletedAt: null },
    select: { id: true },
  })
  if (!item) throw new NotFoundError("Item not found")
  return item
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

export const getItemEditDTO = getItem

export type ItemApiListOptions = {
  page?: number
  limit?: number
}

export type ItemApiListResult<T> = {
  data: T[]
  pagination: {
    itemCount: number
    page: number
    limit: number
    totalPages: number
  }
}

export type BriefItemApiDTO = {
  id: string
  nameEn: string
  name: string
  createdAt: Date
  thumbnail: string | null
  costPrice: number
  sellingPrice: number
  slug: string
}

function normalizeApiPagination(options: ItemApiListOptions = {}) {
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 100)
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

export async function listItemApiDTOs(
  orgId: string,
  options: ItemApiListOptions = {},
): Promise<ItemApiListResult<ItemDTO>> {
  const { page, limit, skip } = normalizeApiPagination(options)
  const where: Prisma.ItemWhereInput = { organizationId: orgId, deletedAt: null }

  const [items, totalCount] = await Promise.all([
    db.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.item.count({ where }),
  ])

  return {
    data: items.map(toDTO),
    pagination: {
      itemCount: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function listBriefItemApiDTOs(
  orgId: string,
  options: ItemApiListOptions = {},
): Promise<ItemApiListResult<BriefItemApiDTO>> {
  const { page, limit, skip } = normalizeApiPagination(options)
  const where: Prisma.ItemWhereInput = { organizationId: orgId, deletedAt: null }

  const [items, totalCount] = await Promise.all([
    db.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nameEn: true,
        createdAt: true,
        thumbnail: true,
        costPrice: true,
        sellingPrice: true,
        slug: true,
      },
      skip,
      take: limit,
    }),
    db.item.count({ where }),
  ])

  return {
    data: items.map((item) => ({
      id: item.id,
      nameEn: item.nameEn,
      name: item.nameEn,
      createdAt: item.createdAt,
      thumbnail: item.thumbnail,
      costPrice: item.costPrice.toNumber(),
      sellingPrice: item.sellingPrice.toNumber(),
      slug: item.slug,
    })),
    pagination: {
      itemCount: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function getItemWithRelations(orgId: string, id: string): Promise<ItemWithRelations | null> {
  return db.item.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: itemStandardInclude,
  })
}

export async function listItemsWithRelations(
  input: ListItemsWithRelationsInput,
): Promise<PaginatedItemsWithRelations> {
  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 20
  const sortBy = input.sortBy ?? "createdAt"
  const sortOrder = input.sortOrder ?? "desc"
  const where = itemWhereFromListInput(input)

  const [total, data] = await Promise.all([
    db.item.count({ where }),
    db.item.findMany({
      where,
      include: itemStandardInclude,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getBriefItemById(orgId: string, id: string) {
  const item = await db.item.findFirst({
    where: {
      id,
      organizationId: orgId,
      deletedAt: null,
    },
    select: {
      nameEn: true,
      nameFr: true,
      sku: true,
      updatedAt: true,
      id: true,
    },
  })

  return item ? { ...item, name: item.nameEn } : null
}

export async function listActiveItemPayloads(orgId: string): Promise<ItemPayload[]> {
  const rows = await db.item.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      nameEn: true,
      slug: true,
      costPrice: true,
      sellingPrice: true,
      createdAt: true,
      imageUrls: true,
      thumbnail: true,
      organizationId: true,
      sku: true,
      descriptionEn: true,
    },
  })

  return rows.map(itemPayload)
}

export async function listItemsWithInventoryLevels(
  orgId: string,
  options: { locationId?: string } = {},
): Promise<ItemWithInventoryLevelsPayload[]> {
  const rows = await db.item.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      brand: { select: { id: true, nameEn: true, nameFr: true } },
      category: { select: { id: true, titleEn: true, titleFr: true } },
      inventoryLevels: {
        ...(options.locationId ? { where: { locationId: options.locationId } } : {}),
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
  })

  return rows.map(toInventoryPayload)
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
    if (existing) throw new ConflictError(`Item with SKU "${sku}" already exists`)

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
      await postOpeningStock(
        {
          organizationId: orgId,
          itemId: newItem.id,
          locationId: input.locationId,
          quantity: input.initialQuantity,
          unitCost: input.unitCost ?? input.costPrice ?? 0,
          createdById: userId,
          referenceNumber: sku,
          notes: `Initial stock for ${newItem.nameEn}`,
        },
        tx,
      )
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

    if (existingSku) throw new ConflictError(`Item with SKU "${sku}" already exists`)
    if (existingSlug) throw new ConflictError(`Item with slug "${slug}" already exists`)
    if (existingBarcode) throw new ConflictError(`Item with barcode "${barcode}" already exists`)

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

      await postOpeningStock(
        {
          organizationId: orgId,
          itemId: item.id,
          locationId: inventory.locationId,
          quantity: inventory.quantity,
          unitCost: inventory.unitCost ?? item.costPrice.toNumber(),
          createdById: inventory.createdById ?? userId,
          referenceNumber: inventory.referenceNumber ?? sku,
          notes: inventory.notes ?? "Initial item stock",
        },
        tx,
      )
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
  if (!existing) throw new NotFoundError("Item not found")

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

export async function updateItemBasicInfoWithRelations(
  orgId: string,
  id: string,
  input: ItemBasicInfoUpdateInput,
): Promise<ItemWithRelations> {
  await assertItemInTenant(db, orgId, id)

  return db.item.update({
    where: { id },
    data: stripUndefined({
      nameEn: input.nameEn,
      nameFr: input.nameFr,
      descriptionEn: input.descriptionEn,
      descriptionFr: input.descriptionFr,
      thumbnail: input.thumbnail,
      imageUrls: normalizeImageUrls(input.imageUrls),
    }),
    include: itemStandardInclude,
  })
}

export async function updateItemDetailsWithRelations(
  orgId: string,
  id: string,
  input: ItemDetailsUpdateInput,
): Promise<ItemWithRelations> {
  await assertItemInTenant(db, orgId, id)

  if (input.sku) {
    const conflict = await db.item.findFirst({
      where: {
        organizationId: orgId,
        sku: input.sku,
        id: { not: id },
        deletedAt: null,
      },
      select: { id: true },
    })
    if (conflict) throw new ConflictError("Another item with this SKU already exists")
  }

  return db.item.update({
    where: { id },
    data: stripUndefined({
      sku: input.sku,
      barcode: input.barcode,
      dimensions: input.dimensions,
      weight: input.weight === undefined ? undefined : decimalInput(input.weight),
      upc: input.upc,
      ean: input.ean,
      mpn: input.mpn,
      isbn: input.isbn,
    }),
    include: itemStandardInclude,
  })
}

export async function updateItemPricingWithRelations(
  orgId: string,
  id: string,
  input: ItemPricingUpdateInput,
): Promise<ItemWithRelations> {
  await assertItemInTenant(db, orgId, id)

  return db.item.update({
    where: { id },
    data: stripUndefined({
      costPrice: input.costPrice === undefined ? undefined : decimalInput(input.costPrice),
      sellingPrice: input.sellingPrice === undefined ? undefined : decimalInput(input.sellingPrice),
    }),
    include: itemStandardInclude,
  })
}

export async function updateItemRelationsWithRelations(
  orgId: string,
  id: string,
  input: ItemRelationsUpdateInput,
): Promise<ItemWithRelations> {
  await assertItemInTenant(db, orgId, id)
  await assertItemRelations(db as unknown as Prisma.TransactionClient, orgId, input)

  return db.item.update({
    where: { id },
    data: {
      categoryId: input.categoryId ?? null,
      brandId: input.brandId ?? null,
      unitId: input.unitId ?? null,
      taxRateId: input.taxRateId ?? null,
    },
    include: itemStandardInclude,
  })
}

export async function updateItemGenericWithRelations(
  orgId: string,
  id: string,
  input: Record<string, unknown>,
): Promise<
  Prisma.ItemGetPayload<{
    include: { inventoryLevels: true; category: true; brand: true; unit: true }
  }>
> {
  const updateData = buildGenericItemUpdateData(input)
  if (Object.keys(updateData).length === 0) {
    const item = await db.item.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: { inventoryLevels: true, category: true, brand: true, unit: true },
    })
    if (!item) throw new NotFoundError("Item not found")
    return item
  }

  await assertItemInTenant(db, orgId, id)

  return db.item.update({
    where: { id },
    data: updateData,
    include: { inventoryLevels: true, category: true, brand: true, unit: true },
  })
}

export async function updateItemTrackingWithRelations(
  orgId: string,
  id: string,
  input: {
    isActive?: boolean | null
    isSerialTracked?: boolean | null
    slug?: string | null
  },
): Promise<ItemWithRelations> {
  await assertItemInTenant(db, orgId, id)

  return db.item.update({
    where: { id },
    data: stripUndefined({
      isActive: input.isActive ?? undefined,
      trackSerialNumbers: input.isSerialTracked ?? undefined,
      slug: typeof input.slug === "string" ? (input.slug === "" ? slugifyItem(id) : slugifyItem(input.slug)) : undefined,
    }),
    include: itemStandardInclude,
  })
}

export type UpdateItemStockPolicyInput = {
  minStockLevel?: number | null
  maxStockLevel?: number | null
}

export type ItemStockPolicyResult = Prisma.ItemGetPayload<{
  include: { inventoryLevels: true }
}>

export async function updateItemStockPolicy(
  orgId: string,
  id: string,
  input: UpdateItemStockPolicyInput,
): Promise<ItemStockPolicyResult> {
  const existing = await db.item.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    select: { id: true },
  })

  if (!existing) throw new NotFoundError("Item not found")

  return db.item.update({
    where: { id },
    data: {
      ...(input.minStockLevel !== undefined
        ? {
            minStockLevel:
              input.minStockLevel === null
                ? new Prisma.Decimal(0)
                : new Prisma.Decimal(input.minStockLevel),
          }
        : {}),
      ...(input.maxStockLevel !== undefined
        ? {
            maxStockLevel:
              input.maxStockLevel === null
                ? null
                : new Prisma.Decimal(input.maxStockLevel),
          }
        : {}),
    },
    include: {
      inventoryLevels: true,
    },
  })
}

export async function updateItemStockFromForm(
  orgId: string,
  userId: string,
  id: string,
  input: ItemStockMutationInput,
): Promise<ItemWithRelations> {
  return db.$transaction(async (tx) => {
    const existingItem = await tx.item.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: itemStandardInclude,
    })

    if (!existingItem) throw new NotFoundError("Item not found")

    const updatedItem = await tx.item.update({
      where: { id },
      data: stripUndefined({
        minStockLevel:
          input.minStockLevel === undefined ? undefined : decimalInput(input.minStockLevel),
        maxStockLevel:
          input.maxStockLevel === undefined || input.maxStockLevel === null
            ? input.maxStockLevel
            : decimalInput(input.maxStockLevel),
      }),
      include: itemStandardInclude,
    })

    if (input.adjustInventory && input.adjustInventory.deltaQty !== 0) {
      await requestManualItemStockAdjustment(
        {
          organizationId: orgId,
          itemId: updatedItem.id,
          locationId: input.adjustInventory.locationId,
          actorId: userId,
          quantityChange: input.adjustInventory.deltaQty,
          mode: "delta",
          unitCost: input.adjustInventory.unitCost ?? existingItem.costPrice.toNumber(),
          reason: input.adjustInventory.notes ?? "Manual stock adjustment",
          notes: input.adjustInventory.notes ?? null,
        },
        tx,
      )
    }

    return updatedItem
  })
}

export async function archiveItem(
  orgId: string,
  id: string,
): Promise<ItemWithRelations> {
  const item = await db.item.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    select: {
      id: true,
      _count: {
        select: {
          inventoryTransactions: true,
          adjustmentLines: true,
          transferLines: true,
          goodsReceiptLines: true,
          supplierInvoiceLines: true,
          stockCountLines: true,
          dailySalesReportItems: true,
        },
      },
    },
  })

  if (!item) throw new NotFoundError("Item not found")

  const evidenceBearingRecords =
    item._count.inventoryTransactions +
    item._count.adjustmentLines +
    item._count.transferLines +
    item._count.goodsReceiptLines +
    item._count.supplierInvoiceLines +
    item._count.stockCountLines +
    item._count.dailySalesReportItems

  if (evidenceBearingRecords > 0) {
    return db.item.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, isDiscontinued: true },
      include: itemStandardInclude,
    })
  }

  return db.item.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    include: itemStandardInclude,
  })
}

export async function deleteItem(orgId: string, id: string): Promise<ItemDTO> {
  const deleted = await archiveItem(orgId, id)
  return toDTO(deleted as ItemModel)
}

// Convenience for components that just need a flat list.
export async function listItemsBrief(orgId: string): Promise<BriefItemPayload[]> {
  const rows = await db.item.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })
  return rows.map(toBriefDTO)
}
