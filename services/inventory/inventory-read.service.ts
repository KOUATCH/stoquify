import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
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
