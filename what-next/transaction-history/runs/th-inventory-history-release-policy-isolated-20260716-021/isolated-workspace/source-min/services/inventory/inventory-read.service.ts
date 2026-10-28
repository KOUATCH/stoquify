import {
  InventoryTransactionTimeProvenance,
  Prisma,
  TransactionType as PrismaTransactionType,
} from "@prisma/client"
import { z } from "zod"

import { db } from "@/prisma/db"
import {
  configuredHistoryCursorCodec,
  hashNormalizedHistoryFilters,
} from "@/services/history/transaction-history-cursor"
import {
  HistoryCursorError,
  type HistoryCompleteness,
  type HistoryCursorCodec,
  type TransactionHistoryResult,
} from "@/services/history/transaction-history.types"
import type {
  InventoryTransactionDTO,
  LocationTransferDTO,
  StockMovementSummary,
  TransactionType as MovementTransactionType,
  TransferStatus as MovementTransferStatus,
} from "@/types/inventoryMovementTypes"
import type {
  AdjustmentStatus as InventoryAdjustmentStatus,
  AdjustmentType as InventoryAdjustmentType,
  InventoryFilters,
  InventoryLevelWithRelations,
  InventoryTransactionWithRelations,
  StockAdjustmentWithRelations,
  StockTransferWithRelations,
  TransactionFilters,
  TransactionReferenceType as InventoryTransactionReferenceType,
  TransactionType as InventoryTransactionType,
  TransferStatus as InventoryTransferStatus,
} from "@/types/inventoryTypes"

type TransferFilters = {
  search?: string
  status?: MovementTransferStatus
  fromLocationId?: string
  toLocationId?: string
  page?: number
  limit?: number
}

type TransactionMovementFilters = {
  itemId?: string
  locationId?: string
  type?: MovementTransactionType
  dateFrom?: string
  dateTo?: string
  limit?: number
}

type StockMovementSummaryFilters = {
  itemId?: string
  locationId?: string
  dateFrom?: string
  dateTo?: string
}

export type InventoryReadStats = {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  totalTransactions: number
  recentTransactions: InventoryTransactionWithRelations[]
}

const transferReadInclude = {
  fromLocation: {
    select: {
      id: true,
      name: true,
      address: true,
      type: true,
    },
  },
  toLocation: {
    select: {
      id: true,
      name: true,
      address: true,
      type: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  lines: {
    include: {
      item: {
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          sku: true,
          descriptionEn: true,
          costPrice: true,
          sellingPrice: true,
          trackSerialNumbers: true,
          trackBatches: true,
          trackExpiry: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.StockTransferInclude

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber()
  }
  return Number(value) || 0
}

function displayName(entity: any): string {
  if (!entity) return ""
  return entity.nameEn ?? entity.nameFr ?? entity.titleEn ?? entity.titleFr ?? entity.name ?? ""
}

function mapUser(user: any) {
  if (!user) return null
  return {
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    email: user.email,
  }
}

function mapMovementItem(item: any) {
  if (!item) return null
  return {
    id: item.id,
    name: displayName(item),
    sku: item.sku,
    description: item.descriptionEn ?? "",
    costPrice: toNumber(item.costPrice),
    sellingPrice: toNumber(item.sellingPrice),
    trackSerialNumbers: Boolean(item.trackSerialNumbers),
    trackBatches: Boolean(item.trackBatches),
    trackExpiry: Boolean(item.trackExpiry),
  }
}

function movementDateRange(
  dateFrom?: string | Date,
  dateTo?: string | Date,
): Prisma.DateTimeFilter | undefined {
  if (!dateFrom && !dateTo) return undefined

  const range: Prisma.DateTimeFilter = {}
  if (dateFrom) range.gte = dateFrom instanceof Date ? dateFrom : new Date(dateFrom)
  if (dateTo) {
    const endDate = dateTo instanceof Date ? new Date(dateTo) : new Date(dateTo)
    endDate.setHours(23, 59, 59, 999)
    range.lte = endDate
  }
  return range
}

function inventoryTransactionWhere(
  organizationId: string,
  filters: TransactionMovementFilters | TransactionFilters | StockMovementSummaryFilters = {},
): Prisma.InventoryTransactionWhereInput {
  return {
    organizationId,
    ...(filters.itemId ? { itemId: filters.itemId } : {}),
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
    ...("type" in filters && filters.type ? { type: filters.type as any } : {}),
    ...(movementDateRange(filters.dateFrom, filters.dateTo) ? { createdAt: movementDateRange(filters.dateFrom, filters.dateTo) } : {}),
  }
}

export function toLocationTransferDTO(transfer: any): LocationTransferDTO {
  return {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    date: transfer.transferDate,
    fromLocationId: transfer.fromLocationId,
    fromLocation: {
      id: transfer.fromLocation?.id ?? transfer.fromLocationId,
      name: transfer.fromLocation?.name ?? "",
      address: transfer.fromLocation?.address ?? undefined,
      type: transfer.fromLocation?.type as any,
    },
    toLocationId: transfer.toLocationId,
    toLocation: {
      id: transfer.toLocation?.id ?? transfer.toLocationId,
      name: transfer.toLocation?.name ?? "",
      address: transfer.toLocation?.address ?? undefined,
      type: transfer.toLocation?.type as any,
    },
    status: transfer.status as MovementTransferStatus,
    priority: "NORMAL",
    notes: transfer.notes ?? undefined,
    organizationId: transfer.organizationId,
    createdById: transfer.createdById ?? undefined,
    createdBy: mapUser(transfer.createdBy) ?? undefined,
    approvedById: transfer.approvedById ?? undefined,
    approvedBy: mapUser(transfer.approvedBy) ?? undefined,
    requestedDate: transfer.expectedDate ?? undefined,
    approvedDate: transfer.approvedAt ?? undefined,
    receivedDate: transfer.actualDate ?? undefined,
    lines:
      transfer.lines?.map((line: any) => ({
        id: line.id,
        transferId: line.transferId,
        itemId: line.itemId,
        item: mapMovementItem(line.item),
        requestedQuantity: toNumber(line.requestedQuantity),
        shippedQuantity: toNumber(line.shippedQuantity),
        receivedQuantity: toNumber(line.receivedQuantity),
        unitCost: toNumber(line.unitCost),
        totalCost: toNumber(line.requestedQuantity) * toNumber(line.unitCost),
        notes: line.notes ?? undefined,
        serialNumbers: [],
        status: transfer.status === "COMPLETED" ? "RECEIVED" : "PENDING",
        createdAt: line.createdAt,
        updatedAt: line.updatedAt,
      })) ?? [],
    createdAt: transfer.createdAt,
    updatedAt: transfer.updatedAt,
  }
}

export function toStockTransferRecord(transfer: any): StockTransferWithRelations {
  return {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    status: transfer.status as InventoryTransferStatus,
    transferDate: transfer.transferDate,
    expectedDate: transfer.expectedDate,
    actualDate: transfer.actualDate,
    notes: transfer.notes,
    fromLocationId: transfer.fromLocationId,
    toLocationId: transfer.toLocationId,
    organizationId: transfer.organizationId,
    createdById: transfer.createdById,
    approvedById: transfer.approvedById,
    approvedAt: transfer.approvedAt,
    createdAt: transfer.createdAt,
    updatedAt: transfer.updatedAt,
    fromLocation: transfer.fromLocation
      ? { id: transfer.fromLocation.id, name: transfer.fromLocation.name }
      : undefined,
    toLocation: transfer.toLocation ? { id: transfer.toLocation.id, name: transfer.toLocation.name } : undefined,
    createdBy: mapUser(transfer.createdBy) ?? undefined,
    approvedBy: mapUser(transfer.approvedBy) ?? undefined,
    lines:
      transfer.lines?.map((line: any) => ({
        id: line.id,
        transferId: line.transferId,
        itemId: line.itemId,
        requestedQuantity: toNumber(line.requestedQuantity),
        shippedQuantity: toNumber(line.shippedQuantity),
        receivedQuantity: toNumber(line.receivedQuantity),
        unitCost: line.unitCost == null ? null : toNumber(line.unitCost),
        notes: line.notes,
        serialNumbers: [],
        createdAt: line.createdAt,
        updatedAt: line.updatedAt,
        item: line.item
          ? {
              id: line.item.id,
              name: displayName(line.item),
              sku: line.item.sku,
            }
          : undefined,
      })) ?? [],
  }
}

export function toStockAdjustmentRecord(adjustment: any): StockAdjustmentWithRelations {
  return {
    id: adjustment.id,
    adjustmentNumber: adjustment.adjustmentNumber,
    type: adjustment.type as InventoryAdjustmentType,
    reason: adjustment.reason,
    status: adjustment.status as InventoryAdjustmentStatus,
    adjustmentDate: adjustment.adjustmentDate,
    notes: adjustment.notes,
    locationId: adjustment.locationId,
    organizationId: adjustment.organizationId,
    createdById: adjustment.createdById,
    approvedById: adjustment.approvedById,
    approvedAt: adjustment.approvedAt,
    createdAt: adjustment.createdAt,
    updatedAt: adjustment.updatedAt,
    location: adjustment.location ? { id: adjustment.location.id, name: adjustment.location.name } : undefined,
    createdBy: mapUser(adjustment.createdBy) ?? undefined,
    approvedBy: mapUser(adjustment.approvedBy) ?? undefined,
    lines:
      adjustment.lines?.map((line: any) => ({
        id: line.id,
        adjustmentId: line.adjustmentId,
        itemId: line.itemId,
        systemQuantity: toNumber(line.systemQuantity),
        actualQuantity: toNumber(line.actualQuantity),
        adjustedQuantity: toNumber(line.adjustedQuantity),
        unitCost: line.unitCost == null ? null : toNumber(line.unitCost),
        totalCost: line.totalCost == null ? null : toNumber(line.totalCost),
        notes: line.notes,
        serialNumbers: [],
        createdAt: line.createdAt,
        updatedAt: line.updatedAt,
        item: line.item
          ? {
              id: line.item.id,
              name: displayName(line.item),
              sku: line.item.sku,
            }
          : undefined,
      })) ?? [],
  }
}

export async function listStockTransfers(input: {
  organizationId: string
  filters?: TransferFilters
}) {
  const page = Math.max(1, input.filters?.page || 1)
  const limit = Math.min(100, Math.max(1, input.filters?.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.StockTransferWhereInput = {
    organizationId: input.organizationId,
    deletedAt: null,
  }

  const search = input.filters?.search?.trim()
  if (search) {
    where.OR = [
      { transferNumber: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ]
  }
  if (input.filters?.status) where.status = input.filters.status as any
  if (input.filters?.fromLocationId) where.fromLocationId = input.filters.fromLocationId
  if (input.filters?.toLocationId) where.toLocationId = input.filters.toLocationId

  const [transfers, totalCount] = await Promise.all([
    db.stockTransfer.findMany({
      where,
      include: transferReadInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.stockTransfer.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / limit)

  return {
    transfers: transfers.map(toLocationTransferDTO),
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

export async function listStockTransferRecords(organizationId: string): Promise<StockTransferWithRelations[]> {
  const transfers = await db.stockTransfer.findMany({
    where: { organizationId, deletedAt: null },
    include: transferReadInclude,
    orderBy: { createdAt: "desc" },
  })

  return transfers.map(toStockTransferRecord)
}

export async function listInventoryTransactionMovements(input: {
  organizationId: string
  filters?: TransactionMovementFilters
}): Promise<InventoryTransactionDTO[]> {
  const where = inventoryTransactionWhere(input.organizationId, input.filters)
  const transactions = await db.inventoryTransaction.findMany({
    where,
    include: {
      item: {
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          sku: true,
          descriptionEn: true,
          costPrice: true,
          sellingPrice: true,
          trackSerialNumbers: true,
          trackBatches: true,
          trackExpiry: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          address: true,
          type: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, input.filters?.limit || 100)),
  })

  return transactions.map((transaction) => ({
    id: transaction.id,
    createdAt: transaction.createdAt,
    updatedAt: transaction.createdAt,
    locationId: transaction.locationId,
    location: {
      id: transaction.location.id,
      name: transaction.location.name,
      address: transaction.location.address ?? undefined,
      type: transaction.location.type as any,
    },
    itemId: transaction.itemId,
    item: mapMovementItem(transaction.item)!,
    quantity: toNumber(transaction.quantity),
    reservedQuantity: 0,
    organizationId: transaction.organizationId,
    type: transaction.type as MovementTransactionType,
    unitPrice: toNumber(transaction.unitCost),
    totalValue: toNumber(transaction.totalCost),
    reference: transaction.referenceNumber ?? transaction.referenceId ?? undefined,
    notes: transaction.notes ?? undefined,
    transferId: transaction.referenceType === "STOCK_TRANSFER" ? transaction.referenceId ?? undefined : undefined,
    purchaseOrderId: transaction.referenceType === "PURCHASE_ORDER" ? transaction.referenceId ?? undefined : undefined,
    createdById: transaction.createdById ?? undefined,
    createdBy: mapUser(transaction.createdBy) ?? undefined,
    batchNumber: transaction.batchNumber ?? undefined,
    serialNumbers: transaction.serialNumbers ?? [],
    expiryDate: transaction.expiryDate ?? undefined,
  }))
}

export async function listInventoryTransactionRecords(input: {
  organizationId: string
  filters?: TransactionFilters
  limit?: number
}): Promise<InventoryTransactionWithRelations[]> {
  const where = inventoryTransactionWhere(input.organizationId, input.filters)
  const transactions = await db.inventoryTransaction.findMany({
    where,
    include: {
      item: { select: { id: true, nameEn: true, nameFr: true, sku: true } },
      location: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, input.limit || 100)),
  })

  return transactions.map((transaction) => ({
    id: transaction.id,
    type: transaction.type as InventoryTransactionType,
    quantity: toNumber(transaction.quantity),
    unitCost: toNumber(transaction.unitCost),
    totalCost: toNumber(transaction.totalCost),
    notes: transaction.notes,
    createdAt: transaction.createdAt,
    itemId: transaction.itemId,
    locationId: transaction.locationId,
    organizationId: transaction.organizationId,
    createdById: transaction.createdById,
    referenceType: transaction.referenceType as InventoryTransactionReferenceType | null,
    referenceId: transaction.referenceId,
    referenceNumber: transaction.referenceNumber,
    batchNumber: transaction.batchNumber,
    serialNumbers: transaction.serialNumbers ?? [],
    expiryDate: transaction.expiryDate,
    balanceAfter: toNumber(transaction.balanceAfter),
    item: {
      id: transaction.item.id,
      name: displayName(transaction.item),
      sku: transaction.item.sku,
    },
    location: {
      id: transaction.location.id,
      name: transaction.location.name,
    },
    createdBy: transaction.createdBy
      ? {
          id: transaction.createdBy.id,
          name: mapUser(transaction.createdBy)?.name ?? transaction.createdBy.email,
        }
      : undefined,
  }))
}

export async function getStockMovementSummary(input: {
  organizationId: string
  filters?: StockMovementSummaryFilters
}): Promise<StockMovementSummary> {
  const where = inventoryTransactionWhere(input.organizationId, input.filters)
  const [inbound, outbound, transfers, adjustments, transactionCount] = await Promise.all([
    db.inventoryTransaction.aggregate({
      where: { ...where, type: { in: ["TRANSFER_IN", "PURCHASE_RECEIPT", "ADJUSTMENT_IN", "INITIAL_STOCK"] } },
      _sum: { quantity: true, totalCost: true },
    }),
    db.inventoryTransaction.aggregate({
      where: { ...where, type: { in: ["TRANSFER_OUT", "SALE", "ADJUSTMENT_OUT", "DAMAGED", "EXPIRED", "THEFT", "WRITE_OFF"] } },
      _sum: { quantity: true, totalCost: true },
    }),
    db.inventoryTransaction.aggregate({
      where: { ...where, type: { in: ["TRANSFER_IN", "TRANSFER_OUT"] } },
      _sum: { quantity: true },
    }),
    db.inventoryTransaction.aggregate({
      where: { ...where, type: { in: ["ADJUSTMENT_IN", "ADJUSTMENT_OUT"] } },
      _sum: { quantity: true },
    }),
    db.inventoryTransaction.count({ where }),
  ])

  const totalInbound = toNumber(inbound._sum.quantity)
  const totalOutbound = Math.abs(toNumber(outbound._sum.quantity))
  const totalTransfers = Math.abs(toNumber(transfers._sum.quantity))
  const totalAdjustments = toNumber(adjustments._sum.quantity)

  return {
    totalInbound,
    totalOutbound,
    totalTransfers,
    totalAdjustments,
    totalReservations: 0,
    transactionCount,
    netMovement: totalInbound - totalOutbound,
    valueChange: toNumber(inbound._sum.totalCost) - toNumber(outbound._sum.totalCost),
  }
}

export async function listInventoryLevels(input: {
  organizationId: string
  filters?: InventoryFilters
}): Promise<InventoryLevelWithRelations[]> {
  const { organizationId, filters } = input
  const levels = await db.inventoryLevel.findMany({
    where: {
      ...(filters?.locationId ? { locationId: filters.locationId } : {}),
      item: {
        organizationId,
        deletedAt: null,
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.brandId ? { brandId: filters.brandId } : {}),
        ...(filters?.search
          ? {
              OR: [
                { nameEn: { contains: filters.search, mode: "insensitive" } },
                { nameFr: { contains: filters.search, mode: "insensitive" } },
                { sku: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    include: {
      item: {
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          sku: true,
          unit: {
            select: {
              nameEn: true,
              nameFr: true,
              symbol: true,
            },
          },
        },
      },
      location: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  let mapped = levels.map((level) => ({
    id: level.id,
    itemId: level.itemId,
    locationId: level.locationId,
    reorderPoint: toNumber(level.reorderPoint),
    location: {
      id: level.location.id,
      name: level.location.name,
    },
    quantityOnHand: toNumber(level.quantityOnHand),
    quantityReserved: toNumber(level.quantityReserved),
    quantityAvailable: toNumber(level.quantityAvailable),
    quantityInTransit: toNumber(level.quantityInTransit),
    quantityOnOrder: toNumber(level.quantityOnOrder),
    averageCost: toNumber(level.averageCost),
    totalValue: toNumber(level.totalValue),
    lastCountDate: level.lastCountDate,
    lastTransactionAt: level.lastTransactionAt,
    createdAt: level.createdAt,
    updatedAt: level.updatedAt,
    item: {
      id: level.item.id,
      name: level.item.nameEn ?? level.item.nameFr ?? "",
      sku: level.item.sku,
      unit: level.item.unit
        ? {
            name: level.item.unit.nameEn ?? level.item.unit.nameFr ?? level.item.unit.symbol,
            abbreviation: level.item.unit.symbol,
          }
        : undefined,
    },
  }))

  if (filters?.lowStock) {
    mapped = mapped.filter((level) => level.quantityAvailable <= 10)
  }
  if (filters?.outOfStock) {
    mapped = mapped.filter((level) => level.quantityAvailable <= 0)
  }

  return mapped
}

export async function getInventoryStats(organizationId: string): Promise<InventoryReadStats> {
  const [levels, totalTransactions, recentTransactions] = await Promise.all([
    listInventoryLevels({ organizationId }),
    db.inventoryTransaction.count({ where: { organizationId } }),
    listInventoryTransactionRecords({ organizationId, limit: 10 }),
  ])

  return {
    totalItems: levels.length,
    totalValue: levels.reduce((sum, level) => sum + level.totalValue, 0),
    lowStockItems: levels.filter((level) => level.quantityAvailable <= level.reorderPoint && level.quantityAvailable > 0).length,
    outOfStockItems: levels.filter((level) => level.quantityAvailable <= 0).length,
    totalTransactions,
    recentTransactions,
  }
}

export async function listStockAdjustments(organizationId: string): Promise<StockAdjustmentWithRelations[]> {
  const adjustments = await db.stockAdjustment.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      location: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      lines: {
        include: {
          item: { select: { id: true, nameEn: true, nameFr: true, sku: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { adjustmentDate: "desc" },
  })

  return adjustments.map(toStockAdjustmentRecord)
}


const INVENTORY_HISTORY_ADAPTER_ID = "inventory-movement-v1"
const INVENTORY_HISTORY_PAGE_SIZES = [25, 50, 100] as const
const INVENTORY_HISTORY_EXPORT_LIMIT = 10_000

const INBOUND_TRANSACTION_TYPES = [
  PrismaTransactionType.PURCHASE_RECEIPT,
  PrismaTransactionType.SALES_RETURN,
  PrismaTransactionType.TRANSFER_IN,
  PrismaTransactionType.ADJUSTMENT_IN,
  PrismaTransactionType.PRODUCTION_IN,
  PrismaTransactionType.INITIAL_STOCK,
] as const

const OUTBOUND_TRANSACTION_TYPES = [
  PrismaTransactionType.SALE,
  PrismaTransactionType.PURCHASE_RETURN,
  PrismaTransactionType.TRANSFER_OUT,
  PrismaTransactionType.ADJUSTMENT_OUT,
  PrismaTransactionType.PRODUCTION_OUT,
  PrismaTransactionType.DAMAGED,
  PrismaTransactionType.EXPIRED,
  PrismaTransactionType.THEFT,
  PrismaTransactionType.WRITE_OFF,
  PrismaTransactionType.SAMPLE,
  PrismaTransactionType.PROMOTION,
] as const

const TRANSFER_TRANSACTION_TYPES = [
  PrismaTransactionType.TRANSFER_IN,
  PrismaTransactionType.TRANSFER_OUT,
] as const

const ADJUSTMENT_TRANSACTION_TYPES = [
  PrismaTransactionType.ADJUSTMENT_IN,
  PrismaTransactionType.ADJUSTMENT_OUT,
  PrismaTransactionType.DAMAGED,
  PrismaTransactionType.EXPIRED,
  PrismaTransactionType.THEFT,
  PrismaTransactionType.WRITE_OFF,
] as const

const RESERVATION_TRANSACTION_TYPES = [
  PrismaTransactionType.RESERVATION,
  PrismaTransactionType.RESERVATION_RELEASE,
] as const

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const pageSizeSchema = z.union(
  INVENTORY_HISTORY_PAGE_SIZES.map((size) => z.literal(size)) as [
    z.ZodLiteral<25>,
    z.ZodLiteral<50>,
    z.ZodLiteral<100>,
  ],
)

export const inventoryMovementHistoryFiltersSchema = z
  .object({
    itemId: z.string().min(1).optional(),
    locationId: z.string().min(1).optional(),
    type: z.nativeEnum(PrismaTransactionType).optional(),
    dateFrom: dateOnlySchema.optional(),
    dateTo: dateOnlySchema.optional(),
    effectiveAsOf: z.union([z.date(), z.string().datetime({ offset: true })]).optional(),
    pageSize: pageSizeSchema.optional(),
    cursor: z.string().max(4096).optional(),
  })
  .strict()

const inventoryMovementHistoryServiceFiltersSchema = inventoryMovementHistoryFiltersSchema.extend({
  pageSize: pageSizeSchema.default(50),
})

const inventoryMovementHistorySchema = z
  .object({
    organizationId: z.string().min(1),
    filters: inventoryMovementHistoryServiceFiltersSchema.default({}),
  })
  .strict()

export type InventoryMovementHistoryInput = z.input<typeof inventoryMovementHistorySchema>

export type InventoryMovementHistoryAppliedFilters = {
  itemId: string | null
  locationId: string | null
  type: PrismaTransactionType | null
  dateFrom: string | null
  dateTo: string | null
  effectiveAsOf: string | null
  timezone: string
  pageSize: (typeof INVENTORY_HISTORY_PAGE_SIZES)[number]
}

export type InventoryMovementHistoryRow = {
  id: string
  type: PrismaTransactionType
  quantity: string
  unitCost: string
  totalCost: string
  currency: string
  effectiveAt: string
  recordedAt: string
  timeProvenance: InventoryTransactionTimeProvenance
  item: {
    id: string
    name: string
    sku: string
    unit: string | null
  }
  location: {
    id: string
    name: string
  }
  actor: {
    id: string
    name: string | null
  } | null
  reference: {
    type: string | null
    id: string | null
    number: string | null
  }
  correction: {
    reversalOfTransactionId: string | null
    reversedByTransactionId: string | null
  }
  notes: string | null
  batchNumber: string | null
  serialNumbers: string[]
  expiryDate: string | null
}

export type InventoryMovementHistorySummary = {
  transactionCount: number
  totalInbound: string | null
  totalOutbound: string | null
  totalTransfers: string | null
  totalAdjustments: string | null
  totalReservations: string | null
  netMovement: string | null
  valueChange: string
  currency: string
  unit: string | null
}

export type InventoryMovementHistoryResult = TransactionHistoryResult<
  InventoryMovementHistoryRow,
  InventoryMovementHistorySummary,
  InventoryMovementHistoryAppliedFilters
>

type InventoryHistoryClient = Pick<
  Prisma.TransactionClient,
  "organization" | "item" | "inventoryTransaction"
>

export type InventoryMovementHistoryOptions = {
  client?: InventoryHistoryClient
  cursorCodec?: HistoryCursorCodec
  now?: () => Date
  recordedThrough?: Date
}

export type InventoryMovementHistoryExportOptions = InventoryMovementHistoryOptions & {
  maximumRows?: number
}

export class InventoryHistoryExportLimitError extends Error {
  constructor(readonly maximumRows: number) {
    super(
      `Inventory history export exceeds the synchronous limit of ${maximumRows} rows; use a resumable background export.`,
    )
    this.name = "InventoryHistoryExportLimitError"
  }
}

type InventoryHistorySummaryGroup = {
  type: PrismaTransactionType
  _count: { _all: number }
  _sum: {
    quantity: Prisma.Decimal | null
    totalCost: Prisma.Decimal | null
  }
}

function invalidHistoryInput(message: string): never {
  throw new HistoryCursorError("invalid_payload", message)
}

function parseCalendarDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) invalidHistoryInput(`Invalid calendar date: ${value}.`)

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    invalidHistoryInput(`Invalid calendar date: ${value}.`)
  }

  return { year, month, day }
}

function addCalendarDay(value: string): string {
  const { year, month, day } = parseCalendarDate(value)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  return [
    next.getUTCFullYear().toString().padStart(4, "0"),
    (next.getUTCMonth() + 1).toString().padStart(2, "0"),
    next.getUTCDate().toString().padStart(2, "0"),
  ].join("-")
}

function organizationMidnightUtc(value: string, timezone: string): Date {
  const { year, month, day } = parseCalendarDate(value)
  let formatter: Intl.DateTimeFormat
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
  } catch {
    return invalidHistoryInput(`Organization timezone is invalid: ${timezone}.`)
  }

  const targetWallTime = Date.UTC(year, month - 1, day)
  let candidate = targetWallTime
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(candidate))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    )
    const representedWallTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    )
    const adjustment = targetWallTime - representedWallTime
    candidate += adjustment
    if (adjustment === 0) return new Date(candidate)
  }

  return invalidHistoryInput(
    `Could not resolve ${value} at midnight in organization timezone ${timezone}.`,
  )
}

function requiredDecimal(value: Prisma.Decimal | null, label: string): Prisma.Decimal {
  if (value === null) invalidHistoryInput(`History aggregate ${label} is unavailable.`)
  return value
}

function decimalText(value: Prisma.Decimal, scale: number): string {
  return value.toFixed(scale)
}

function sumQuantity(
  groups: InventoryHistorySummaryGroup[],
  types: readonly PrismaTransactionType[],
): Prisma.Decimal {
  return groups
    .filter((group) => types.includes(group.type))
    .reduce(
      (total, group) => total.plus(requiredDecimal(group._sum.quantity, `${group.type} quantity`)),
      new Prisma.Decimal(0),
    )
}

function sumAbsoluteQuantity(
  groups: InventoryHistorySummaryGroup[],
  types: readonly PrismaTransactionType[],
): Prisma.Decimal {
  return groups
    .filter((group) => types.includes(group.type))
    .reduce(
      (total, group) =>
        total.plus(requiredDecimal(group._sum.quantity, `${group.type} quantity`).abs()),
      new Prisma.Decimal(0),
    )
}

function sumCost(
  groups: InventoryHistorySummaryGroup[],
  types: readonly PrismaTransactionType[],
): Prisma.Decimal {
  return groups
    .filter((group) => types.includes(group.type))
    .reduce(
      (total, group) => total.plus(requiredDecimal(group._sum.totalCost, `${group.type} value`)),
      new Prisma.Decimal(0),
    )
}

function historyCursorPredicate(payload: {
  effectiveAt: string
  recordedAt: string
  id: string
}): Prisma.InventoryTransactionWhereInput {
  const effectiveAt = new Date(payload.effectiveAt)
  const recordedAt = new Date(payload.recordedAt)
  return {
    OR: [
      { effectiveAt: { lt: effectiveAt } },
      {
        effectiveAt,
        recordedAt: { lt: recordedAt },
      },
      {
        effectiveAt,
        recordedAt,
        id: { lt: payload.id },
      },
    ],
  }
}

function inventoryHistoryCompleteness(input: {
  legacyTimestampCount: number
  quantityUnit: string | null
}): HistoryCompleteness {
  const sources: HistoryCompleteness["sources"] = [
    input.legacyTimestampCount > 0
      ? {
          source: "inventory_transactions.timeProvenance",
          state: "partial",
          reason: `${input.legacyTimestampCount} row(s) use legacy created-time approximation.`,
        }
      : {
          source: "inventory_transactions.timeProvenance",
          state: "complete",
        },
    input.quantityUnit
      ? {
          source: "inventory_transactions.quantity",
          state: "complete",
        }
      : {
          source: "inventory_transactions.quantity",
          state: "partial",
          reason: "Quantity totals are withheld because the result is not scoped to one known unit.",
        },
  ]

  return {
    state: sources.some((source) => source.state === "partial") ? "partial" : "complete",
    sources,
  }
}


export async function readInventoryMovementHistory(
  rawInput: InventoryMovementHistoryInput,
  options: InventoryMovementHistoryOptions = {},
): Promise<InventoryMovementHistoryResult> {
  const parsed = inventoryMovementHistorySchema.safeParse(rawInput)
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
      .join("; ")
    return invalidHistoryInput(message)
  }

  const client = options.client ?? db
  const generatedAt = (options.now ?? (() => new Date()))()
  if (Number.isNaN(generatedAt.getTime())) {
    return invalidHistoryInput("History response time is invalid.")
  }

  const organization = await client.organization.findUnique({
    where: { id: parsed.data.organizationId },
    select: { id: true, timezone: true, currency: true, deletedAt: true },
  })
  if (!organization || organization.deletedAt) {
    return invalidHistoryInput("Organization history scope was not found.")
  }

  const filters = parsed.data.filters
  const effectiveAsOf = filters.effectiveAsOf
    ? filters.effectiveAsOf instanceof Date
      ? new Date(filters.effectiveAsOf)
      : new Date(filters.effectiveAsOf)
    : undefined

  if (effectiveAsOf && effectiveAsOf.getTime() > generatedAt.getTime()) {
    return invalidHistoryInput("effectiveAsOf cannot be later than the response time.")
  }

  const dateStart = filters.dateFrom
    ? organizationMidnightUtc(filters.dateFrom, organization.timezone)
    : undefined
  const dateEnd = filters.dateTo
    ? organizationMidnightUtc(addCalendarDay(filters.dateTo), organization.timezone)
    : undefined

  if (dateStart && dateEnd && dateStart.getTime() >= dateEnd.getTime()) {
    return invalidHistoryInput("dateFrom must not be later than dateTo.")
  }

  let quantityUnit: string | null = null
  if (filters.itemId) {
    const item = await client.item.findFirst({
      where: {
        id: filters.itemId,
        organizationId: organization.id,
        deletedAt: null,
      },
      select: {
        id: true,
        unit: { select: { symbol: true } },
      },
    })
    if (!item) return invalidHistoryInput("Item history scope was not found.")
    quantityUnit = item.unit?.symbol ?? null
  }

  const filterIdentity = {
    itemId: filters.itemId ?? null,
    locationId: filters.locationId ?? null,
    type: filters.type ?? null,
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    effectiveAsOf: effectiveAsOf?.toISOString() ?? null,
    timezone: organization.timezone,
  }
  const filterHash = hashNormalizedHistoryFilters(filterIdentity)
  const cursorCodec = options.cursorCodec ?? configuredHistoryCursorCodec()
  const cursorPayload = filters.cursor ? cursorCodec.decode(filters.cursor) : undefined

  if (
    cursorPayload &&
    (cursorPayload.tenantId !== organization.id ||
      cursorPayload.adapterId !== INVENTORY_HISTORY_ADAPTER_ID ||
      cursorPayload.filterHash !== filterHash)
  ) {
    return invalidHistoryInput("History cursor does not match the trusted tenant or filters.")
  }

  const requestedRecordedThrough = options.recordedThrough
    ? new Date(options.recordedThrough)
    : undefined
  if (requestedRecordedThrough && Number.isNaN(requestedRecordedThrough.getTime())) {
    return invalidHistoryInput("History knowledge cutoff is invalid.")
  }
  if (
    cursorPayload &&
    requestedRecordedThrough &&
    cursorPayload.recordedThrough !== requestedRecordedThrough.toISOString()
  ) {
    return invalidHistoryInput("History cursor knowledge cutoff does not match the trusted cutoff.")
  }
  const recordedThrough = cursorPayload
    ? new Date(cursorPayload.recordedThrough)
    : requestedRecordedThrough ?? new Date(generatedAt)
  if (recordedThrough.getTime() > generatedAt.getTime()) {
    return invalidHistoryInput("History cursor knowledge cutoff is in the future.")
  }

  const effectiveAt: {
    gte?: Date
    lt?: Date
    lte?: Date
  } = {}
  if (dateStart) effectiveAt.gte = dateStart
  if (dateEnd) effectiveAt.lt = dateEnd
  if (effectiveAsOf) effectiveAt.lte = effectiveAsOf

  const baseWhere: Prisma.InventoryTransactionWhereInput = {
    organizationId: organization.id,
    recordedAt: { lte: recordedThrough },
    ...(filters.itemId ? { itemId: filters.itemId } : {}),
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(Object.keys(effectiveAt).length > 0 ? { effectiveAt } : {}),
  }

  const rowWhere: Prisma.InventoryTransactionWhereInput = cursorPayload
    ? {
        AND: [baseWhere, historyCursorPredicate(cursorPayload)],
      }
    : baseWhere

  const [transactions, summaryGroups, legacyTimestampCount] = await Promise.all([
    client.inventoryTransaction.findMany({
      where: rowWhere,
      select: {
        id: true,
        type: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        effectiveAt: true,
        recordedAt: true,
        timeProvenance: true,
        notes: true,
        referenceType: true,
        referenceId: true,
        referenceNumber: true,
        batchNumber: true,
        serialNumbers: true,
        expiryDate: true,
        reversalOfTransactionId: true,
        reversedByTransaction: { select: { id: true } },
        item: {
          select: {
            id: true,
            nameEn: true,
            nameFr: true,
            sku: true,
            unit: { select: { symbol: true } },
          },
        },
        location: { select: { id: true, name: true } },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ effectiveAt: "desc" }, { recordedAt: "desc" }, { id: "desc" }],
      take: filters.pageSize + 1,
    }),
    client.inventoryTransaction.groupBy({
      by: ["type"],
      where: baseWhere,
      _count: { _all: true },
      _sum: {
        quantity: true,
        totalCost: true,
      },
    }),
    client.inventoryTransaction.count({
      where: {
        AND: [
          baseWhere,
          {
            timeProvenance:
              InventoryTransactionTimeProvenance.LEGACY_CREATED_AT_APPROXIMATION,
          },
        ],
      },
    }),
  ])

  const groups = summaryGroups as InventoryHistorySummaryGroup[]
  const hasMore = transactions.length > filters.pageSize
  const pageRows = transactions.slice(0, filters.pageSize)
  const inboundQuantity = sumQuantity(groups, INBOUND_TRANSACTION_TYPES)
  const outboundQuantity = sumQuantity(groups, OUTBOUND_TRANSACTION_TYPES)
  const quantitiesAreSummable = quantityUnit !== null
  const lastRow = pageRows.at(-1)
  const nextCursor =
    hasMore && lastRow
      ? cursorCodec.encode({
          v: 1,
          scope: "transaction-history",
          tenantId: organization.id,
          adapterId: INVENTORY_HISTORY_ADAPTER_ID,
          filterHash,
          recordedThrough: recordedThrough.toISOString(),
          effectiveAt: lastRow.effectiveAt.toISOString(),
          recordedAt: lastRow.recordedAt.toISOString(),
          id: lastRow.id,
        })
      : null

  const rows: InventoryMovementHistoryRow[] = pageRows.map((transaction) => {
    const actorName = transaction.createdBy
      ? [transaction.createdBy.firstName, transaction.createdBy.lastName]
          .filter(Boolean)
          .join(" ") || null
      : null

    return {
      id: transaction.id,
      type: transaction.type,
      quantity: decimalText(transaction.quantity, 3),
      unitCost: decimalText(transaction.unitCost, 2),
      totalCost: decimalText(transaction.totalCost, 2),
      currency: organization.currency,
      effectiveAt: transaction.effectiveAt.toISOString(),
      recordedAt: transaction.recordedAt.toISOString(),
      timeProvenance: transaction.timeProvenance,
      item: {
        id: transaction.item.id,
        name: transaction.item.nameEn || transaction.item.nameFr || transaction.item.sku,
        sku: transaction.item.sku,
        unit: transaction.item.unit?.symbol ?? null,
      },
      location: transaction.location,
      actor: transaction.createdBy
        ? {
            id: transaction.createdBy.id,
            name: actorName,
          }
        : null,
      reference: {
        type: transaction.referenceType,
        id: transaction.referenceId,
        number: transaction.referenceNumber,
      },
      correction: {
        reversalOfTransactionId: transaction.reversalOfTransactionId,
        reversedByTransactionId: transaction.reversedByTransaction?.id ?? null,
      },
      notes: transaction.notes,
      batchNumber: transaction.batchNumber,
      serialNumbers: transaction.serialNumbers,
      expiryDate: transaction.expiryDate?.toISOString() ?? null,
    }
  })

  const appliedFilters: InventoryMovementHistoryAppliedFilters = {
    ...filterIdentity,
    pageSize: filters.pageSize,
  }

  return {
    rows,
    pageInfo: {
      nextCursor,
      hasMore,
    },
    appliedFilters,
    summary: {
      transactionCount: groups.reduce((total, group) => total + group._count._all, 0),
      totalInbound: quantitiesAreSummable ? decimalText(inboundQuantity, 3) : null,
      totalOutbound: quantitiesAreSummable
        ? decimalText(outboundQuantity.abs(), 3)
        : null,
      totalTransfers: quantitiesAreSummable
        ? decimalText(sumAbsoluteQuantity(groups, TRANSFER_TRANSACTION_TYPES), 3)
        : null,
      totalAdjustments: quantitiesAreSummable
        ? decimalText(sumQuantity(groups, ADJUSTMENT_TRANSACTION_TYPES), 3)
        : null,
      totalReservations: quantitiesAreSummable
        ? decimalText(sumAbsoluteQuantity(groups, RESERVATION_TRANSACTION_TYPES), 3)
        : null,
      netMovement: quantitiesAreSummable
        ? decimalText(inboundQuantity.plus(outboundQuantity), 3)
        : null,
      valueChange: decimalText(
        sumCost(groups, INBOUND_TRANSACTION_TYPES).minus(
          sumCost(groups, OUTBOUND_TRANSACTION_TYPES),
        ),
        2,
      ),
      currency: organization.currency,
      unit: quantityUnit,
    },
    snapshot: {
      ...(effectiveAsOf ? { effectiveAsOf: effectiveAsOf.toISOString() } : {}),
      recordedThrough: recordedThrough.toISOString(),
      generatedAt: generatedAt.toISOString(),
      timezone: organization.timezone,
    },
    completeness: inventoryHistoryCompleteness({
      legacyTimestampCount,
      quantityUnit,
    }),
  }
}

export async function* streamInventoryMovementHistoryExport(
  input: InventoryMovementHistoryInput,
  options: InventoryMovementHistoryExportOptions = {},
): AsyncGenerator<InventoryMovementHistoryResult> {
  const maximumRows = options.maximumRows ?? INVENTORY_HISTORY_EXPORT_LIMIT
  if (!Number.isInteger(maximumRows) || maximumRows < 1) {
    return invalidHistoryInput("Export maximumRows must be a positive integer.")
  }

  const originalFilters = input.filters ?? {}
  let cursor = originalFilters.cursor
  let exportedRows = 0

  do {
    const page = await readInventoryMovementHistory(
      {
        organizationId: input.organizationId,
        filters: {
          ...originalFilters,
          pageSize: 100,
          ...(cursor ? { cursor } : {}),
        },
      },
      options,
    )

    if (
      exportedRows + page.rows.length > maximumRows ||
      (exportedRows + page.rows.length === maximumRows && page.pageInfo.hasMore)
    ) {
      throw new InventoryHistoryExportLimitError(maximumRows)
    }

    exportedRows += page.rows.length
    yield page
    cursor = page.pageInfo.nextCursor ?? undefined
  } while (cursor)
}



