import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import { PurchaseOrderStatus, type Prisma, type Supplier } from "@prisma/client"
import { BusinessRuleError, ConflictError, NotFoundError } from "../_shared/action-errors"
import { buildPagination, buildPaginatedResult } from "../_shared/pagination"
import type { PaginatedResult } from "../_shared/types"
import type {
  SupplierCreateInput,
  SupplierListParams,
  SupplierSearchParams,
  SupplierUpdateInput,
} from "./supplier.schemas"

export type SupplierDTO = Supplier

export type SupplierManagementRow = {
  id: string
  organizationId: string
  name: string
  code: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  taxId: string | null
  paymentTerms: number | null
  creditLimit: number | null
  currentBalance: number
  notes: string | null
  isActive: boolean
  preferredLocale: "EN" | "FR"
  createdAt: Date
  updatedAt: Date
  supplierItemsCount: number
  preferredItemsCount: number
  purchaseOrdersCount: number
  openPurchaseOrdersCount: number
  ledgerEntriesCount: number
  totalPurchaseValue: number
  lastPurchaseOrderAt: Date | null
  lastLedgerEntryAt: Date | null
}

export type SupplierManagementSummary = {
  totalSuppliers: number
  activeSuppliers: number
  inactiveSuppliers: number
  linkedItems: number
  preferredItemLinks: number
  purchaseOrders: number
  openPurchaseOrders: number
  totalCreditLimit: number
  totalBalance: number
  averagePaymentTerms: number
  overCreditLimitSuppliers: number
  bilingualSuppliers: number
}

export type SupplierManagementData = {
  suppliers: SupplierManagementRow[]
  summary: SupplierManagementSummary
  topByPurchases: SupplierManagementRow[]
  topByBalance: SupplierManagementRow[]
}

export type SupplierPickerListInput = {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}

export type SupplierPickerListItem = {
  id: string
  name: string
  code: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  taxId: string | null
  paymentTerms: number | null
  creditLimit: number | null
  notes: string | null
  isActive: boolean
  currentBalance: number
  createdAt: Date
  updatedAt: Date
}

export type SupplierPickerListResult = {
  data: SupplierPickerListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type SupplierAnalyticsOrder = {
  id: string
  orderNumber: string
  status: string
  orderDate: Date
  expectedDeliveryDate: Date | null
  total: number
}

export type SupplierAnalyticsLedgerEntry = {
  id: string
  entryDate: Date
  type: string
  debit: number
  credit: number
  balanceAfter: number
  description: string
}

export type SupplierAnalyticsItem = {
  id: string
  itemId: string
  itemName: string
  supplierSku: string | null
  isPreferred: boolean
  leadTimeDays: number | null
  minOrderQuantity: number | null
  unitCost: number | null
}

export type SupplierDetailAnalytics = {
  supplier: SupplierManagementRow
  purchaseOrders: SupplierAnalyticsOrder[]
  ledgerEntries: SupplierAnalyticsLedgerEntry[]
  linkedItems: SupplierAnalyticsItem[]
}

export interface ItemSupplierData {
  itemId: string
  supplierId: string
  supplierProductCode?: string | null
  supplierProductName?: string | null
  unitCost?: number | null
  minimumOrderQuantity?: number | null
  leadTimeDays?: number | null
  isPreferred?: boolean
  notes?: string | null
  isActive?: boolean
}

export interface UpdateItemSupplierData extends Partial<ItemSupplierData> {
  id: string
}

export type ItemSupplierServiceDTO = {
  id: string
  itemId: string
  supplierId: string
  supplierSku: string | null
  supplierName: string | null
  supplierProductCode: string | null
  supplierProductName: string | null
  isPreferred: boolean
  leadTimeDays: number | null
  leadTime: number | null
  minOrderQuantity: number | null
  minimumOrderQuantity: number | null
  minOrderQty: number | null
  unitCost: number | null
  lastPurchaseDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  item?: {
    id: string
    nameEn: string | null
    nameFr: string | null
    name: string
    sku: string | null
  } | null
  supplier?: {
    id: string
    name: string
    code?: string | null
    email?: string | null
    phone?: string | null
  } | null
}

export type ItemWithSupplierServiceDTO = {
  id: string
  name: string
  slug: string
  itemId: string
  supplierId: string
  isPreferred: boolean
  supplierSku: string
  leadTime: number | null
  minOrderQty: number | null
  unitCost: number | null
  lastPurchaseDate: Date | null
  notes: string
  updatedAt: Date
  costPrice: number
  sellingPrice: number
  createdAt: Date
  imageUrls: string
  thumbnail: string | null
  organizationId: string
  sku: string
  supplierItems: {
    id: string
    itemId: string
    supplierId: string
    isPreferred: boolean
    supplierSku: string | null
    supplierName: string | null
    leadTimeDays: number | null
    minOrderQuantity: number | null
    unitCost: number | null
    lastPurchaseDate: Date | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
  }
  supplier: {
    id: string | undefined
    name: string
    email: string | null
  }
}

const MAX_SUPPLIER_PAGE_SIZE = 200
const OPEN_PURCHASE_ORDER_STATUSES = [
  PurchaseOrderStatus.DRAFT,
  PurchaseOrderStatus.SUBMITTED,
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
]

const SUPPLIER_MANAGEMENT_ROW_LIMIT = 500

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return typeof value === "number" ? value : Number(value)
}

function toNullableNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return null
  return typeof value === "number" ? value : Number(value)
}

function cleanId(value: string | null | undefined, fieldName: string) {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new BusinessRuleError(`${fieldName} is required`)
  }
  return trimmed
}

function itemDisplayName(item: { nameEn?: string | null; nameFr?: string | null; sku?: string | null }) {
  return item.nameEn ?? item.nameFr ?? item.sku ?? "Unnamed item"
}

function itemSupplierOrgWhere(organizationId: string): Prisma.ItemSupplierWhereInput {
  return {
    item: { organizationId, deletedAt: null },
    supplier: { organizationId, deletedAt: null },
  }
}

const itemSupplierInclude = {
  item: {
    select: {
      id: true,
      nameEn: true,
      nameFr: true,
      sku: true,
    },
  },
  supplier: {
    select: {
      id: true,
      name: true,
      code: true,
      email: true,
      phone: true,
    },
  },
} satisfies Prisma.ItemSupplierInclude

type ItemSupplierWithRelations = Prisma.ItemSupplierGetPayload<{
  include: typeof itemSupplierInclude
}>

function mapItemSupplierDTO(itemSupplier: ItemSupplierWithRelations): ItemSupplierServiceDTO {
  const minOrderQuantity = toNullableNumber(itemSupplier.minOrderQuantity)
  const unitCost = toNullableNumber(itemSupplier.unitCost)

  return {
    id: itemSupplier.id,
    itemId: itemSupplier.itemId,
    supplierId: itemSupplier.supplierId,
    supplierSku: itemSupplier.supplierSku,
    supplierName: itemSupplier.supplierName,
    supplierProductCode: itemSupplier.supplierSku,
    supplierProductName: itemSupplier.supplierName,
    isPreferred: itemSupplier.isPreferred,
    leadTimeDays: itemSupplier.leadTimeDays,
    leadTime: itemSupplier.leadTimeDays,
    minOrderQuantity,
    minimumOrderQuantity: minOrderQuantity,
    minOrderQty: minOrderQuantity,
    unitCost,
    lastPurchaseDate: itemSupplier.lastPurchaseDate,
    notes: itemSupplier.notes,
    createdAt: itemSupplier.createdAt,
    updatedAt: itemSupplier.updatedAt,
    item: itemSupplier.item
      ? {
          ...itemSupplier.item,
          name: itemDisplayName(itemSupplier.item),
        }
      : null,
    supplier: itemSupplier.supplier,
  }
}

function buildItemSupplierCreateData(
  data: ItemSupplierData,
): Prisma.ItemSupplierUncheckedCreateInput {
  return {
    itemId: cleanId(data.itemId, "Item"),
    supplierId: cleanId(data.supplierId, "Supplier"),
    supplierSku: data.supplierProductCode ?? undefined,
    supplierName: data.supplierProductName ?? undefined,
    unitCost: data.unitCost ?? undefined,
    minOrderQuantity: data.minimumOrderQuantity ?? undefined,
    leadTimeDays: data.leadTimeDays ?? undefined,
    isPreferred: data.isPreferred ?? false,
    notes: data.notes ?? undefined,
  }
}

function buildItemSupplierUpdateData(
  data: Omit<UpdateItemSupplierData, "id">,
): Prisma.ItemSupplierUncheckedUpdateInput {
  const updateData: Prisma.ItemSupplierUncheckedUpdateInput = {}

  if (data.itemId !== undefined) updateData.itemId = cleanId(data.itemId, "Item")
  if (data.supplierId !== undefined) updateData.supplierId = cleanId(data.supplierId, "Supplier")
  if (data.supplierProductCode !== undefined) updateData.supplierSku = data.supplierProductCode
  if (data.supplierProductName !== undefined) updateData.supplierName = data.supplierProductName
  if (data.unitCost !== undefined) updateData.unitCost = data.unitCost
  if (data.minimumOrderQuantity !== undefined) updateData.minOrderQuantity = data.minimumOrderQuantity
  if (data.leadTimeDays !== undefined) updateData.leadTimeDays = data.leadTimeDays
  if (data.isPreferred !== undefined) updateData.isPreferred = data.isPreferred
  if (data.notes !== undefined) updateData.notes = data.notes

  return updateData
}

async function assertItemAndSupplierInOrganization(
  organizationId: string,
  itemId: string,
  supplierId: string,
) {
  const [item, supplier] = await Promise.all([
    db.item.findFirst({
      where: { id: itemId, organizationId, deletedAt: null },
      select: { id: true },
    }),
    db.supplier.findFirst({
      where: { id: supplierId, organizationId, deletedAt: null },
      select: { id: true },
    }),
  ])

  if (!item || !supplier) {
    throw new NotFoundError("Item or supplier not found for this organization")
  }
}

const supplierManagementSelect = {
  id: true,
  organizationId: true,
  name: true,
  code: true,
  contactPerson: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  taxId: true,
  paymentTerms: true,
  creditLimit: true,
  currentBalance: true,
  notes: true,
  isActive: true,
  preferredLocale: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      supplierItems: true,
      purchaseOrders: true,
      ledgerEntries: true,
    },
  },
} satisfies Prisma.SupplierSelect

type SupplierManagementRecord = Prisma.SupplierGetPayload<{
  select: typeof supplierManagementSelect
}>

export async function listSuppliers(
  orgId: string,
  params: SupplierListParams,
): Promise<PaginatedResult<SupplierDTO>> {
  const { page, pageSize, search, isActive, sortBy, sortOrder } = params
  const { skip, take, page: p, pageSize: ps } = buildPagination(page, pageSize, MAX_SUPPLIER_PAGE_SIZE)

  const where: Prisma.SupplierWhereInput = {
    organizationId: orgId,
    deletedAt: null,
    ...(isActive !== undefined && { isActive }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const orderBy: Prisma.SupplierOrderByWithRelationInput = { [sortBy]: sortOrder }

  const [data, total] = await Promise.all([
    db.supplier.findMany({ where, orderBy, skip, take }),
    db.supplier.count({ where }),
  ])

  return buildPaginatedResult(data as SupplierDTO[], total, p, ps)
}

export async function listSuppliersForPicker(
  orgId: string,
  input: SupplierPickerListInput = {},
): Promise<SupplierPickerListResult> {
  const page = Math.max(1, Number(input.page ?? 1))
  const pageSize = Math.min(200, Math.max(1, Number(input.pageSize ?? 20)))
  const skip = (page - 1) * pageSize
  const search = input.search?.trim()

  const where: Prisma.SupplierWhereInput = {
    organizationId: orgId,
    deletedAt: null,
    ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
            { contactPerson: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [suppliers, total] = await Promise.all([
    db.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        code: true,
        contactPerson: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        taxId: true,
        paymentTerms: true,
        creditLimit: true,
        notes: true,
        isActive: true,
        currentBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.supplier.count({ where }),
  ])

  return {
    data: suppliers.map((supplier) => ({
      ...supplier,
      creditLimit: supplier.creditLimit !== null ? toNumber(supplier.creditLimit) : null,
      currentBalance: toNumber(supplier.currentBalance),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getSupplierById(orgId: string, id: string): Promise<SupplierDTO> {
  const supplier = await db.supplier.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  })
  if (!supplier) throw new NotFoundError("Supplier not found")
  return supplier as SupplierDTO
}

async function nextSupplierCode(orgId: string): Promise<string> {
  const count = await db.supplier.count({ where: { organizationId: orgId } })
  return `SUP-${String(count + 1).padStart(4, "0")}`
}

export async function createSupplier(
  orgId: string,
  input: SupplierCreateInput,
): Promise<SupplierDTO> {
  logger.info("supplier.create", { orgId, name: input.name })

  const code = input.code ?? (await nextSupplierCode(orgId))
  const existing = await db.supplier.findFirst({
    where: { organizationId: orgId, code },
  })
  if (existing) throw new ConflictError(`Supplier with code "${code}" already exists in this organisation`)

  const supplier = await db.supplier.create({
    data: {
      name: input.name,
      code,
      contactPerson: input.contactPerson ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zipCode: input.zipCode ?? null,
      country: input.country ?? null,
      taxId: input.taxId ?? null,
      paymentTerms: input.paymentTerms ?? 30,
      creditLimit: input.creditLimit ?? null,
      notes: input.notes ?? null,
      isActive: input.isActive,
      preferredLocale: input.preferredLocale,
      organizationId: orgId,
    },
  })
  return supplier as SupplierDTO
}

export async function updateSupplier(
  orgId: string,
  id: string,
  input: SupplierUpdateInput,
): Promise<SupplierDTO> {
  const supplier = await db.supplier.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  })
  if (!supplier) throw new NotFoundError("Supplier not found")

  if (input.code && input.code !== supplier.code) {
    const clash = await db.supplier.findFirst({
      where: { organizationId: orgId, code: input.code, NOT: { id } },
    })
    if (clash) {
      throw new ConflictError(`Supplier with code "${input.code}" already exists in this organisation`)
    }
  }

  const updated = await db.supplier.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.contactPerson !== undefined && { contactPerson: input.contactPerson }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.state !== undefined && { state: input.state }),
      ...(input.zipCode !== undefined && { zipCode: input.zipCode }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.taxId !== undefined && { taxId: input.taxId }),
      ...(input.paymentTerms !== undefined && { paymentTerms: input.paymentTerms }),
      ...(input.creditLimit !== undefined && { creditLimit: input.creditLimit }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.preferredLocale !== undefined && { preferredLocale: input.preferredLocale }),
    },
  })
  return updated as SupplierDTO
}

export async function setSupplierActive(
  orgId: string,
  id: string,
  isActive: boolean,
): Promise<SupplierDTO> {
  const supplier = await db.supplier.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  })
  if (!supplier) throw new NotFoundError("Supplier not found")

  const updated = await db.supplier.update({ where: { id }, data: { isActive } })
  return updated as SupplierDTO
}

export async function deleteSupplier(orgId: string, id: string): Promise<SupplierDTO> {
  const supplier = await db.supplier.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  })
  if (!supplier) throw new NotFoundError("Supplier not found")

  // Block hard delete if there are dependent purchase orders to preserve history.
  const linkedPOs = await db.purchaseOrder.count({
    where: { supplierId: id, organizationId: orgId },
  })
  if (linkedPOs > 0) {
    throw new BusinessRuleError("Cannot delete supplier: it is referenced by purchase orders")
  }

  // Soft-delete to preserve ItemSupplier / ledger history.
  const deleted = await db.supplier.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  })
  return deleted as SupplierDTO
}

export async function searchSuppliersLite(
  orgId: string,
  params: SupplierSearchParams,
): Promise<Array<Pick<Supplier, "id" | "name" | "code" | "email">>> {
  const { q, limit } = params
  const where: Prisma.SupplierWhereInput = {
    organizationId: orgId,
    deletedAt: null,
    isActive: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  return db.supplier.findMany({
    where,
    take: limit,
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, email: true },
  })
}

async function buildSupplierManagementRows(
  organizationId: string,
  suppliers: SupplierManagementRecord[],
) {
  const supplierIds = suppliers.map((supplier) => supplier.id)

  const [
    preferredItemCounts,
    purchaseOrderSummaries,
    openPurchaseOrderCounts,
    ledgerSummaries,
  ] = supplierIds.length
    ? await Promise.all([
        db.itemSupplier.groupBy({
          by: ["supplierId"],
          where: { supplierId: { in: supplierIds }, isPreferred: true },
          _count: { _all: true },
        }),
        db.purchaseOrder.groupBy({
          by: ["supplierId"],
          where: { organizationId, supplierId: { in: supplierIds }, deletedAt: null },
          _count: { _all: true },
          _sum: { total: true },
          _max: { orderDate: true },
        }),
        db.purchaseOrder.groupBy({
          by: ["supplierId"],
          where: {
            organizationId,
            supplierId: { in: supplierIds },
            deletedAt: null,
            status: { in: OPEN_PURCHASE_ORDER_STATUSES },
          },
          _count: { _all: true },
        }),
        db.supplierLedgerEntry.groupBy({
          by: ["supplierId"],
          where: { organizationId, supplierId: { in: supplierIds } },
          _max: { entryDate: true },
        }),
      ])
    : [[], [], [], []]

  const preferredItemsBySupplier = new Map<string, number>()
  preferredItemCounts.forEach((summary) => {
    preferredItemsBySupplier.set(summary.supplierId, summary._count._all)
  })

  const purchaseSummaryBySupplier = new Map<string, { total: number; count: number; lastAt: Date | null }>()
  purchaseOrderSummaries.forEach((summary) => {
    purchaseSummaryBySupplier.set(summary.supplierId, {
      total: toNumber(summary._sum.total),
      count: summary._count._all,
      lastAt: summary._max.orderDate ?? null,
    })
  })

  const openOrdersBySupplier = new Map<string, number>()
  openPurchaseOrderCounts.forEach((summary) => {
    openOrdersBySupplier.set(summary.supplierId, summary._count._all)
  })

  const lastLedgerEntryBySupplier = new Map<string, Date | null>()
  ledgerSummaries.forEach((summary) => {
    lastLedgerEntryBySupplier.set(summary.supplierId, summary._max.entryDate ?? null)
  })

  const rows = suppliers.map((supplier): SupplierManagementRow => {
    const purchaseSummary = purchaseSummaryBySupplier.get(supplier.id)

    return {
      id: supplier.id,
      organizationId: supplier.organizationId,
      name: supplier.name,
      code: supplier.code,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      state: supplier.state,
      zipCode: supplier.zipCode,
      country: supplier.country,
      taxId: supplier.taxId,
      paymentTerms: supplier.paymentTerms,
      creditLimit: supplier.creditLimit !== null ? toNumber(supplier.creditLimit) : null,
      currentBalance: toNumber(supplier.currentBalance),
      notes: supplier.notes,
      isActive: supplier.isActive,
      preferredLocale: supplier.preferredLocale,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      supplierItemsCount: supplier._count.supplierItems,
      preferredItemsCount: preferredItemsBySupplier.get(supplier.id) ?? 0,
      purchaseOrdersCount: purchaseSummary?.count ?? supplier._count.purchaseOrders,
      openPurchaseOrdersCount: openOrdersBySupplier.get(supplier.id) ?? 0,
      ledgerEntriesCount: supplier._count.ledgerEntries,
      totalPurchaseValue: purchaseSummary?.total ?? 0,
      lastPurchaseOrderAt: purchaseSummary?.lastAt ?? null,
      lastLedgerEntryAt: lastLedgerEntryBySupplier.get(supplier.id) ?? null,
    }
  })

  return { rows }
}

export async function getSupplierManagementDataForOrg(
  organizationId: string,
): Promise<SupplierManagementData> {
  const baseWhere: Prisma.SupplierWhereInput = { organizationId, deletedAt: null }

  const [
    suppliers,
    totalSuppliers,
    activeSuppliers,
    bilingualSuppliers,
    linkedItems,
    preferredItemLinks,
    financialSummary,
    purchaseOrderTotals,
    openPurchaseOrders,
    overCreditLimitRows,
    topPurchaseGroups,
    topBalanceSuppliers,
  ] = await Promise.all([
    db.supplier.findMany({
      where: baseWhere,
      orderBy: [
        { isActive: "desc" },
        { name: "asc" },
      ],
      take: SUPPLIER_MANAGEMENT_ROW_LIMIT,
      select: supplierManagementSelect,
    }),
    db.supplier.count({ where: baseWhere }),
    db.supplier.count({ where: { ...baseWhere, isActive: true } }),
    db.supplier.count({ where: { ...baseWhere, preferredLocale: "FR" } }),
    db.itemSupplier.count({ where: { supplier: baseWhere } }),
    db.itemSupplier.count({ where: { supplier: baseWhere, isPreferred: true } }),
    db.supplier.aggregate({
      where: baseWhere,
      _sum: { creditLimit: true, currentBalance: true },
      _avg: { paymentTerms: true },
    }),
    db.purchaseOrder.aggregate({
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    }),
    db.purchaseOrder.count({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: OPEN_PURCHASE_ORDER_STATUSES },
      },
    }),
    db.$queryRaw<Array<{ count: number | bigint | string }>>`
      SELECT COUNT(*)::int AS count
      FROM "suppliers"
      WHERE "organizationId" = ${organizationId}
        AND "deletedAt" IS NULL
        AND "creditLimit" IS NOT NULL
        AND "currentBalance" > "creditLimit"
    `,
    db.purchaseOrder.groupBy({
      by: ["supplierId"],
      where: { organizationId, deletedAt: null },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
    db.supplier.findMany({
      where: baseWhere,
      orderBy: { currentBalance: "desc" },
      take: 5,
      select: supplierManagementSelect,
    }),
  ])

  const { rows } = await buildSupplierManagementRows(organizationId, suppliers)
  const topPurchaseSupplierIds = topPurchaseGroups.map((summary) => summary.supplierId)
  const topPurchaseSuppliers = topPurchaseSupplierIds.length
    ? await db.supplier.findMany({
        where: { ...baseWhere, id: { in: topPurchaseSupplierIds } },
        select: supplierManagementSelect,
      })
    : []
  const [{ rows: topPurchaseRows }, { rows: topBalanceRows }] = await Promise.all([
    buildSupplierManagementRows(organizationId, topPurchaseSuppliers),
    buildSupplierManagementRows(organizationId, topBalanceSuppliers),
  ])
  const topPurchaseRank = new Map(topPurchaseSupplierIds.map((id, index) => [id, index]))

  return {
    suppliers: rows,
    summary: {
      totalSuppliers,
      activeSuppliers,
      inactiveSuppliers: totalSuppliers - activeSuppliers,
      linkedItems,
      preferredItemLinks,
      purchaseOrders: purchaseOrderTotals._count._all,
      openPurchaseOrders,
      totalCreditLimit: toNumber(financialSummary._sum.creditLimit),
      totalBalance: toNumber(financialSummary._sum.currentBalance),
      averagePaymentTerms: toNumber(financialSummary._avg.paymentTerms),
      overCreditLimitSuppliers: Number(overCreditLimitRows[0]?.count ?? 0),
      bilingualSuppliers,
    },
    topByPurchases: topPurchaseRows.sort(
      (first, second) => (topPurchaseRank.get(first.id) ?? 0) - (topPurchaseRank.get(second.id) ?? 0),
    ),
    topByBalance: topBalanceRows,
  }
}

async function reloadSupplierManagementRow(organizationId: string, supplierId: string) {
  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, organizationId, deletedAt: null },
    select: supplierManagementSelect,
  })

  if (!supplier) return null

  const { rows } = await buildSupplierManagementRows(organizationId, [supplier])
  return rows[0] ?? null
}

export async function createSupplierForManagement(
  organizationId: string,
  input: SupplierCreateInput,
): Promise<SupplierManagementRow> {
  const supplier = await createSupplier(organizationId, input)
  const row = await reloadSupplierManagementRow(organizationId, supplier.id)

  if (!row) {
    throw new BusinessRuleError("Supplier was created but could not be reloaded")
  }

  return row
}

export async function updateSupplierForManagement(
  organizationId: string,
  supplierId: string,
  input: SupplierUpdateInput,
): Promise<SupplierManagementRow> {
  await updateSupplier(organizationId, supplierId, input)
  const row = await reloadSupplierManagementRow(organizationId, supplierId)

  if (!row) {
    throw new BusinessRuleError("Supplier was updated but could not be reloaded")
  }

  return row
}

export async function removeSupplierForManagement(
  organizationId: string,
  supplierId: string,
): Promise<{ id: string; mode: "archived" | "deactivated" }> {
  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, organizationId, deletedAt: null },
    select: {
      id: true,
      _count: {
        select: {
          purchaseOrders: true,
          supplierItems: true,
          ledgerEntries: true,
        },
      },
    },
  })

  if (!supplier) {
    throw new NotFoundError("Supplier not found")
  }

  const hasHistory =
    supplier._count.purchaseOrders > 0 ||
    supplier._count.supplierItems > 0 ||
    supplier._count.ledgerEntries > 0

  await db.supplier.update({
    where: { id: supplierId },
    data: hasHistory
      ? { isActive: false }
      : { isActive: false, deletedAt: new Date() },
  })

  return { id: supplierId, mode: hasHistory ? "deactivated" : "archived" }
}

export async function listItemSuppliersForOrganization(
  organizationId: string,
): Promise<ItemSupplierServiceDTO[]> {
  const itemSuppliers = await db.itemSupplier.findMany({
    where: itemSupplierOrgWhere(organizationId),
    include: itemSupplierInclude,
    orderBy: { createdAt: "desc" },
  })

  return itemSuppliers.map(mapItemSupplierDTO)
}

export async function getAllItemSuppliersForOrganization(
  organizationId: string,
): Promise<ItemSupplierServiceDTO[]> {
  const itemSuppliers = await db.itemSupplier.findMany({
    where: itemSupplierOrgWhere(organizationId),
    include: itemSupplierInclude,
    orderBy: { createdAt: "desc" },
  })

  return itemSuppliers.map(mapItemSupplierDTO)
}

export async function getItemSupplierForOrganizationById(
  organizationId: string,
  itemSupplierId: string,
): Promise<ItemSupplierServiceDTO> {
  const itemSupplier = await db.itemSupplier.findFirst({
    where: {
      id: cleanId(itemSupplierId, "Item supplier"),
      ...itemSupplierOrgWhere(organizationId),
    },
    include: itemSupplierInclude,
  })

  if (!itemSupplier) {
    throw new NotFoundError("Item supplier not found")
  }

  return mapItemSupplierDTO(itemSupplier)
}

export async function createItemSupplierForOrganization(
  organizationId: string,
  data: ItemSupplierData,
): Promise<ItemSupplierServiceDTO> {
  const createData = buildItemSupplierCreateData(data)
  await assertItemAndSupplierInOrganization(organizationId, createData.itemId, createData.supplierId)

  const existingRelation = await db.itemSupplier.findFirst({
    where: {
      itemId: createData.itemId,
      supplierId: createData.supplierId,
      ...itemSupplierOrgWhere(organizationId),
    },
    select: { id: true },
  })

  if (existingRelation) {
    throw new ConflictError("Item supplier relationship already exists")
  }

  const itemSupplier = await db.itemSupplier.create({
    data: createData,
    include: itemSupplierInclude,
  })

  return mapItemSupplierDTO(itemSupplier)
}

export async function updateItemSupplierForOrganization(
  organizationId: string,
  data: UpdateItemSupplierData,
): Promise<ItemSupplierServiceDTO> {
  const id = cleanId(data.id, "Item supplier")
  const { id: _id, ...updateData } = data
  const existingRelation = await db.itemSupplier.findFirst({
    where: {
      id,
      ...itemSupplierOrgWhere(organizationId),
    },
    select: {
      id: true,
      itemId: true,
      supplierId: true,
    },
  })

  if (!existingRelation) {
    throw new NotFoundError("Item supplier not found")
  }

  const targetItemId = updateData.itemId ?? existingRelation.itemId
  const targetSupplierId = updateData.supplierId ?? existingRelation.supplierId
  await assertItemAndSupplierInOrganization(organizationId, targetItemId, targetSupplierId)

  if (targetItemId !== existingRelation.itemId || targetSupplierId !== existingRelation.supplierId) {
    const duplicateRelation = await db.itemSupplier.findFirst({
      where: {
        id: { not: id },
        itemId: targetItemId,
        supplierId: targetSupplierId,
        ...itemSupplierOrgWhere(organizationId),
      },
      select: { id: true },
    })

    if (duplicateRelation) {
      throw new ConflictError("Item supplier relationship already exists")
    }
  }

  const itemSupplier = await db.itemSupplier.update({
    where: { id },
    data: buildItemSupplierUpdateData(updateData),
    include: itemSupplierInclude,
  })

  return mapItemSupplierDTO(itemSupplier)
}

export async function removeItemSupplierForOrganization(
  organizationId: string,
  itemSupplierId: string,
): Promise<ItemSupplierServiceDTO> {
  const itemSupplier = await db.itemSupplier.findFirst({
    where: {
      id: cleanId(itemSupplierId, "Item supplier"),
      ...itemSupplierOrgWhere(organizationId),
    },
    select: { id: true },
  })

  if (!itemSupplier) {
    throw new NotFoundError("Item supplier not found")
  }

  const deleted = await db.itemSupplier.delete({
    where: { id: itemSupplier.id },
    include: itemSupplierInclude,
  })

  return mapItemSupplierDTO(deleted)
}

export async function getItemSuppliersForItemInOrganization(
  organizationId: string,
  itemId: string,
): Promise<ItemSupplierServiceDTO[]> {
  const item = await db.item.findFirst({
    where: {
      id: cleanId(itemId, "Item"),
      organizationId,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!item) {
    throw new NotFoundError("Item not found")
  }

  const itemSuppliers = await db.itemSupplier.findMany({
    where: {
      itemId: item.id,
      ...itemSupplierOrgWhere(organizationId),
    },
    include: itemSupplierInclude,
    orderBy: [
      { isPreferred: "desc" },
      { createdAt: "desc" },
    ],
  })

  return itemSuppliers.map(mapItemSupplierDTO)
}

export async function addItemSuppliersToItemForOrganization(
  organizationId: string,
  itemId: string,
  supplierIds: string[],
): Promise<{ count: number }> {
  const scopedItemId = cleanId(itemId, "Item")
  const uniqueSupplierIds = Array.from(
    new Set(supplierIds.map((supplierId) => cleanId(supplierId, "Supplier"))),
  )

  const item = await db.item.findFirst({
    where: { id: scopedItemId, organizationId, deletedAt: null },
    select: { id: true },
  })

  if (!item) {
    throw new NotFoundError("Item not found")
  }

  if (uniqueSupplierIds.length === 0) {
    return { count: 0 }
  }

  const suppliers = await db.supplier.findMany({
    where: {
      id: { in: uniqueSupplierIds },
      organizationId,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (suppliers.length !== uniqueSupplierIds.length) {
    throw new NotFoundError("One or more suppliers were not found for this organization")
  }

  return db.itemSupplier.createMany({
    data: uniqueSupplierIds.map((supplierId) => ({
      itemId: item.id,
      supplierId,
    })),
    skipDuplicates: true,
  })
}

export async function getItemWithSuppliersForOrganization(
  organizationId: string,
  itemId: string,
): Promise<ItemWithSupplierServiceDTO[]> {
  const item = await db.item.findFirst({
    where: {
      id: cleanId(itemId, "Item"),
      organizationId,
      deletedAt: null,
    },
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
      supplierItems: {
        where: {
          supplier: {
            organizationId,
            deletedAt: null,
          },
        },
        select: {
          id: true,
          itemId: true,
          supplierId: true,
          isPreferred: true,
          supplierSku: true,
          supplierName: true,
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
    throw new NotFoundError(`Item with ID ${itemId} not found`)
  }

  return (item.supplierItems ?? []).map((relation) => {
    const minOrderQuantity = toNullableNumber(relation.minOrderQuantity)
    const unitCost = toNullableNumber(relation.unitCost)

    return {
      id: relation.id,
      name: itemDisplayName(item),
      slug: item.slug,
      itemId: relation.itemId,
      supplierId: relation.supplierId,
      isPreferred: relation.isPreferred,
      supplierSku: relation.supplierSku ?? "",
      leadTime: relation.leadTimeDays,
      minOrderQty: minOrderQuantity,
      unitCost,
      lastPurchaseDate: relation.lastPurchaseDate,
      notes: relation.notes ?? "",
      createdAt: relation.createdAt,
      updatedAt: relation.updatedAt,
      costPrice: toNumber(item.costPrice),
      sellingPrice: toNumber(item.sellingPrice),
      imageUrls: item.imageUrls?.[0] ?? "",
      thumbnail: item.thumbnail,
      organizationId: item.organizationId,
      sku: item.sku,
      supplierItems: {
        id: relation.id,
        itemId: relation.itemId,
        supplierId: relation.supplierId,
        isPreferred: relation.isPreferred,
        supplierSku: relation.supplierSku,
        supplierName: relation.supplierName,
        leadTimeDays: relation.leadTimeDays,
        minOrderQuantity,
        unitCost,
        lastPurchaseDate: relation.lastPurchaseDate,
        notes: relation.notes,
        createdAt: relation.createdAt,
        updatedAt: relation.updatedAt,
      },
      supplier: {
        id: relation.supplier?.id,
        name: relation.supplier?.name ?? relation.supplierName ?? "Unknown",
        email: relation.supplier?.email ?? null,
      },
    }
  })
}

export async function getSupplierDetailAnalyticsForOrg(
  organizationId: string,
  supplierId: string,
): Promise<SupplierDetailAnalytics> {
  const row = await reloadSupplierManagementRow(organizationId, supplierId)

  if (!row) {
    throw new NotFoundError("Supplier not found")
  }

  const [purchaseOrders, ledgerEntries, linkedItems] = await Promise.all([
    db.purchaseOrder.findMany({
      where: { organizationId, supplierId, deletedAt: null },
      orderBy: { orderDate: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderDate: true,
        expectedDeliveryDate: true,
        total: true,
      },
    }),
    db.supplierLedgerEntry.findMany({
      where: { organizationId, supplierId },
      orderBy: { entryDate: "desc" },
      take: 8,
      select: {
        id: true,
        entryDate: true,
        type: true,
        debit: true,
        credit: true,
        balanceAfter: true,
        description: true,
      },
    }),
    db.itemSupplier.findMany({
      where: { supplierId },
      orderBy: [
        { isPreferred: "desc" },
        { updatedAt: "desc" },
      ],
      take: 8,
      select: {
        id: true,
        itemId: true,
        supplierSku: true,
        isPreferred: true,
        leadTimeDays: true,
        minOrderQuantity: true,
        unitCost: true,
        item: {
          select: {
            nameEn: true,
            nameFr: true,
          },
        },
      },
    }),
  ])

  return {
    supplier: row,
    purchaseOrders: purchaseOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      total: toNumber(order.total),
    })),
    ledgerEntries: ledgerEntries.map((entry) => ({
      id: entry.id,
      entryDate: entry.entryDate,
      type: entry.type,
      debit: toNumber(entry.debit),
      credit: toNumber(entry.credit),
      balanceAfter: toNumber(entry.balanceAfter),
      description: entry.description,
    })),
    linkedItems: linkedItems.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      itemName: item.item.nameEn ?? item.item.nameFr ?? "Unnamed item",
      supplierSku: item.supplierSku,
      isPreferred: item.isPreferred,
      leadTimeDays: item.leadTimeDays,
      minOrderQuantity: item.minOrderQuantity ? toNumber(item.minOrderQuantity) : null,
      unitCost: item.unitCost ? toNumber(item.unitCost) : null,
    })),
  }
}
