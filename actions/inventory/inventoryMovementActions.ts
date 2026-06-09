"use server"

import { getAuthenticatedUser } from "@/lib/auth-server"
import { inventoryAction, type ServerActionResult } from "@/lib/error-handling"
import { db } from "@/prisma/db"
import type { CreateTransferPayload, TransactionType, TransferStatus } from "@/types/inventoryMovementTypes"
import type { Prisma } from "@prisma/client"
import { revalidatePath, revalidateTag } from "next/cache"

function toNumber(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  if (typeof value.toNumber === "function") return value.toNumber()
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

const transferInclude = {
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
          trackSerialNumbers: true,
          trackBatches: true,
          trackExpiry: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.StockTransferInclude

function mapItem(item: any) {
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

function mapTransfer(transfer: any) {
  return {
    ...transfer,
    date: transfer.transferDate,
    requestedDate: transfer.expectedDate,
    receivedDate: transfer.actualDate,
    approvedDate: transfer.approvedAt,
    priority: "NORMAL",
    createdBy: mapUser(transfer.createdBy),
    approvedBy: mapUser(transfer.approvedBy),
    lines: transfer.lines?.map((line: any) => ({
      ...line,
      requestedQuantity: toNumber(line.requestedQuantity),
      shippedQuantity: toNumber(line.shippedQuantity),
      receivedQuantity: toNumber(line.receivedQuantity),
      unitCost: toNumber(line.unitCost),
      totalCost: toNumber(line.requestedQuantity) * toNumber(line.unitCost),
      serialNumbers: [],
      status: transfer.status === "COMPLETED" ? "RECEIVED" : "PENDING",
      item: mapItem(line.item),
    })) ?? [],
  }
}

const generateTransferNumber = async (organizationId: string): Promise<string> => {
  const lastTransfer = await db.stockTransfer.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { transferNumber: true },
  })

  const nextNumber = lastTransfer ? Number.parseInt(lastTransfer.transferNumber.replace("TR-", "")) + 1 : 1
  return `TR-${nextNumber.toString().padStart(6, "0")}`
}

const createInventoryTransaction = async (
  tx: Prisma.TransactionClient,
  data: {
    itemId: string
    locationId: string
    organizationId: string
    type: TransactionType | "RESERVATION" | "RESERVATION_RELEASE"
    quantity: number
    unitCost: number
    referenceNumber: string
    notes: string
    balanceAfter: number
    createdById?: string | null
  },
) => {
  return tx.inventoryTransaction.create({
    data: {
      itemId: data.itemId,
      locationId: data.locationId,
      organizationId: data.organizationId,
      type: data.type as any,
      quantity: data.quantity,
      unitCost: data.unitCost,
      totalCost: Math.abs(data.quantity) * data.unitCost,
      referenceType: "STOCK_TRANSFER",
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      serialNumbers: [],
      balanceAfter: data.balanceAfter,
      createdById: data.createdById,
    },
  })
}

const updateInventoryForTransfer = async (
  tx: Prisma.TransactionClient,
  itemId: string,
  fromLocationId: string,
  toLocationId: string,
  quantity: number,
  organizationId: string,
  transferNumber: string,
  createdById?: string | null,
) => {
  const source = await tx.inventoryLevel.findUnique({
    where: {
      itemId_locationId: {
        itemId,
        locationId: fromLocationId,
      },
    },
  })

  if (!source) throw new Error("No inventory found for item at source location")

  const sourceOnHand = toNumber(source.quantityOnHand)
  const sourceAvailable = toNumber(source.quantityAvailable)
  const averageCost = toNumber(source.averageCost)

  if (sourceAvailable < quantity) {
    throw new Error(`Insufficient inventory at source location. Available: ${sourceAvailable}, Required: ${quantity}`)
  }

  const nextSourceOnHand = sourceOnHand - quantity
  const nextSourceAvailable = sourceAvailable - quantity

  await tx.inventoryLevel.update({
    where: { id: source.id },
    data: {
      quantityOnHand: nextSourceOnHand,
      quantityAvailable: nextSourceAvailable,
      totalValue: nextSourceOnHand * averageCost,
      lastTransactionAt: new Date(),
      version: { increment: 1 },
    },
  })

  await createInventoryTransaction(tx, {
    itemId,
    locationId: fromLocationId,
    organizationId,
    type: "TRANSFER_OUT",
    quantity: -quantity,
    unitCost: averageCost,
    referenceNumber: transferNumber,
    notes: "Transfer out to location",
    balanceAfter: nextSourceOnHand,
    createdById,
  })

  const destination = await tx.inventoryLevel.findUnique({
    where: {
      itemId_locationId: {
        itemId,
        locationId: toLocationId,
      },
    },
  })

  let nextDestinationOnHand = quantity
  if (destination) {
    const currentDestinationOnHand = toNumber(destination.quantityOnHand)
    const currentDestinationReserved = toNumber(destination.quantityReserved)
    nextDestinationOnHand = currentDestinationOnHand + quantity
    const nextDestinationAvailable = Math.max(0, nextDestinationOnHand - currentDestinationReserved)

    await tx.inventoryLevel.update({
      where: { id: destination.id },
      data: {
        quantityOnHand: nextDestinationOnHand,
        quantityAvailable: nextDestinationAvailable,
        averageCost,
        totalValue: nextDestinationOnHand * averageCost,
        lastTransactionAt: new Date(),
        version: { increment: 1 },
      },
    })
  } else {
    await tx.inventoryLevel.create({
      data: {
        itemId,
        locationId: toLocationId,
        quantityOnHand: quantity,
        quantityAvailable: quantity,
        quantityReserved: 0,
        quantityInTransit: 0,
        quantityOnOrder: 0,
        reorderPoint: 0,
        averageCost,
        totalValue: quantity * averageCost,
        lastTransactionAt: new Date(),
      },
    })
  }

  await createInventoryTransaction(tx, {
    itemId,
    locationId: toLocationId,
    organizationId,
    type: "TRANSFER_IN",
    quantity,
    unitCost: averageCost,
    referenceNumber: transferNumber,
    notes: "Transfer in from location",
    balanceAfter: nextDestinationOnHand,
    createdById,
  })
}

export const createLocationTransfer = inventoryAction(
  async (input: {
    data: CreateTransferPayload
  }): Promise<ServerActionResult<any>> => {
    const { data } = input
    const user = await getAuthenticatedUser()
    const createdById = user?.id || data.createdById

    if (!data.fromLocationId) throw new Error("Source location is required")
    if (!data.toLocationId) throw new Error("Destination location is required")
    if (data.fromLocationId === data.toLocationId) throw new Error("Source and destination locations cannot be the same")
    if (!data.organizationId) throw new Error("Organization ID is required")
    if (!createdById) throw new Error("Created by user ID is required")
    if (!data.lines || data.lines.length === 0) throw new Error("At least one line item is required")

    const [fromLocation, toLocation] = await Promise.all([
      db.location.findFirst({ where: { id: data.fromLocationId, organizationId: data.organizationId } }),
      db.location.findFirst({ where: { id: data.toLocationId, organizationId: data.organizationId } }),
    ])

    if (!fromLocation) throw new Error("Source location not found or does not belong to your organization")
    if (!toLocation) throw new Error("Destination location not found or does not belong to your organization")

    const itemIds = data.lines.map((line) => line.itemId)
    const items = await db.item.findMany({
      where: { id: { in: itemIds }, organizationId: data.organizationId, deletedAt: null },
      select: { id: true, nameEn: true, nameFr: true, costPrice: true },
    })

    if (items.length !== itemIds.length) {
      throw new Error("One or more items not found or do not belong to your organization")
    }

    for (const line of data.lines) {
      const inventory = await db.inventoryLevel.findUnique({
        where: {
          itemId_locationId: {
            itemId: line.itemId,
            locationId: data.fromLocationId,
          },
        },
      })

      const available = toNumber(inventory?.quantityAvailable)
      if (!inventory || available < line.requestedQuantity) {
        const item = items.find((i) => i.id === line.itemId)
        throw new Error(`Insufficient inventory for ${displayName(item)}. Available: ${available}, Required: ${line.requestedQuantity}`)
      }
    }

    const transferNumber = await generateTransferNumber(data.organizationId)

    const transfer = await db.stockTransfer.create({
      data: {
        transferNumber,
        transferDate: new Date(),
        expectedDate: data.requestedDate,
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        status: "DRAFT",
        notes: data.notes || "",
        organizationId: data.organizationId,
        createdById,
        lines: {
          create: data.lines.map((line) => ({
            itemId: line.itemId,
            requestedQuantity: line.requestedQuantity,
            unitCost: toNumber(items.find((item) => item.id === line.itemId)?.costPrice),
            notes: line.notes || "",
          })),
        },
      },
      include: transferInclude,
    })

    revalidateTag("transfers")
    revalidateTag(`transfers-${data.organizationId}`)
    revalidatePath("/dashboard/inventory/transfers")

    return {
      success: true,
      data: {
        transfer: mapTransfer(transfer),
        message: `Transfer ${transferNumber} created successfully`,
      },
    }
  },
  {
    actionName: "createLocationTransfer",
    component: "InventoryTransfers",
    businessContext: {
      domain: "inventory",
      operation: "create",
      resourceType: "location_transfer",
      criticalOperation: true,
    },
  },
)

export const approveTransfer = inventoryAction(
  async (input: {
    transferId: string
    organizationId: string
    approvedById: string
  }): Promise<ServerActionResult<any>> => {
    const { transferId, organizationId, approvedById } = input
    if (!transferId) throw new Error("Transfer ID is required")
    if (!organizationId) throw new Error("Organization ID is required")
    if (!approvedById) throw new Error("Approved by user ID is required")

    const existingTransfer = await db.stockTransfer.findFirst({
      where: { id: transferId, organizationId },
      include: {
        lines: true,
      },
    })

    if (!existingTransfer) throw new Error("Transfer not found or you don't have permission to approve it")
    if (existingTransfer.status !== "DRAFT") throw new Error(`Cannot approve transfer with status: ${existingTransfer.status}`)

    const result = await db.$transaction(async (tx) => {
      for (const line of existingTransfer.lines) {
        await updateInventoryForTransfer(
          tx,
          line.itemId,
          existingTransfer.fromLocationId,
          existingTransfer.toLocationId,
          toNumber(line.requestedQuantity),
          organizationId,
          existingTransfer.transferNumber,
          approvedById,
        )

        await tx.stockTransferLine.update({
          where: { id: line.id },
          data: {
            shippedQuantity: line.requestedQuantity,
            receivedQuantity: line.requestedQuantity,
          },
        })
      }

      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: "COMPLETED",
          approvedById,
          approvedAt: new Date(),
          actualDate: new Date(),
        },
        include: transferInclude,
      })
    })

    revalidateTag("transfers")
    revalidateTag(`transfers-${organizationId}`)
    revalidateTag(`transfer-${transferId}`)
    revalidateTag("inventory")
    revalidateTag(`inventory-${organizationId}`)
    revalidatePath("/dashboard/inventory/transfers")
    revalidatePath("/dashboard/inventory")

    return {
      success: true,
      data: {
        result: mapTransfer(result),
        message: `Transfer ${existingTransfer.transferNumber} approved and completed successfully`,
      },
    }
  },
  {
    actionName: "approveTransfer",
    component: "InventoryTransfers",
    businessContext: {
      domain: "inventory",
      operation: "update",
      resourceType: "transfer_approval",
      criticalOperation: true,
    },
  },
)

export const getTransfers = inventoryAction(
  async (input: {
    organizationId: string
    filters?: {
      search?: string
      status?: TransferStatus
      fromLocationId?: string
      toLocationId?: string
      page?: number
      limit?: number
    }
  }): Promise<ServerActionResult<any>> => {
    const { organizationId, filters } = input
    if (!organizationId) throw new Error("Organization ID is required")

    const page = Math.max(1, filters?.page || 1)
    const limit = Math.min(100, Math.max(1, filters?.limit || 20))
    const skip = (page - 1) * limit

    const where: Prisma.StockTransferWhereInput = {
      organizationId,
      deletedAt: null,
    }

    if (filters?.search?.trim()) {
      where.OR = [
        { transferNumber: { contains: filters.search.trim(), mode: "insensitive" } },
        { notes: { contains: filters.search.trim(), mode: "insensitive" } },
      ]
    }

    if (filters?.status) where.status = filters.status as any
    if (filters?.fromLocationId) where.fromLocationId = filters.fromLocationId
    if (filters?.toLocationId) where.toLocationId = filters.toLocationId

    const [transfers, totalCount] = await Promise.all([
      db.stockTransfer.findMany({
        where,
        include: transferInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.stockTransfer.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return {
      success: true,
      data: {
        transfers: transfers.map(mapTransfer),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    }
  },
  {
    actionName: "getTransfers",
    component: "InventoryTransfers",
    businessContext: {
      domain: "inventory",
      operation: "read",
      resourceType: "transfers",
      criticalOperation: false,
    },
  },
)

export const getInventoryTransactionsMovement = inventoryAction(
  async (input: {
    organizationId: string
    filters?: {
      itemId?: string
      locationId?: string
      type?: TransactionType
      dateFrom?: string
      dateTo?: string
      limit?: number
    }
  }): Promise<ServerActionResult<any>> => {
    const { organizationId, filters } = input
    if (!organizationId) throw new Error("Organization ID is required")

    const where: Prisma.InventoryTransactionWhereInput = { organizationId }

    if (filters?.itemId) where.itemId = filters.itemId
    if (filters?.locationId) where.locationId = filters.locationId
    if (filters?.type) where.type = filters.type as any

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

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
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100,
    })

    return {
      success: true,
      data: transactions.map((transaction) => ({
        ...transaction,
        quantity: toNumber(transaction.quantity),
        reservedQuantity: 0,
        unitPrice: toNumber(transaction.unitCost),
        totalValue: toNumber(transaction.totalCost),
        item: mapItem(transaction.item),
      })),
    }
  },
  {
    actionName: "getInventoryTransactionsMovement",
    component: "InventoryTransactions",
    businessContext: {
      domain: "inventory",
      operation: "read",
      resourceType: "inventory_transactions",
      criticalOperation: false,
    },
  },
)

export const reserveInventoryMovement = inventoryAction(
  async (input: {
    itemId: string
    locationId: string
    quantity: number
    reason: string
    organizationId: string
    expiresAt?: Date
  }): Promise<ServerActionResult<any>> => {
    const { itemId, locationId, quantity, reason, organizationId } = input
    if (!itemId) throw new Error("Item ID is required")
    if (!locationId) throw new Error("Location ID is required")
    if (!organizationId) throw new Error("Organization ID is required")
    if (quantity <= 0) throw new Error("Quantity must be greater than 0")

    const user = await getAuthenticatedUser()
    const result = await db.$transaction(async (tx) => {
      const inventory = await tx.inventoryLevel.findUnique({
        where: {
          itemId_locationId: {
            itemId,
            locationId,
          },
        },
      })

      if (!inventory) throw new Error("Inventory record not found")

      const availableQuantity = toNumber(inventory.quantityAvailable)
      if (availableQuantity < quantity) {
        throw new Error(`Insufficient available inventory. Available: ${availableQuantity}, Required: ${quantity}`)
      }

      const nextReserved = toNumber(inventory.quantityReserved) + quantity
      const nextAvailable = availableQuantity - quantity

      await tx.inventoryLevel.update({
        where: { id: inventory.id },
        data: {
          quantityReserved: nextReserved,
          quantityAvailable: nextAvailable,
          lastTransactionAt: new Date(),
          version: { increment: 1 },
        },
      })

      return createInventoryTransaction(tx, {
        itemId,
        locationId,
        organizationId,
        type: "RESERVATION",
        quantity: 0,
        unitCost: toNumber(inventory.averageCost),
        referenceNumber: "INVENTORY_RESERVATION",
        notes: reason,
        balanceAfter: toNumber(inventory.quantityOnHand),
        createdById: user.id,
      })
    })

    revalidateTag("inventory")
    revalidateTag(`inventory-${organizationId}`)

    return {
      success: true,
      data: {
        result,
        message: "Inventory reserved successfully",
      },
    }
  },
  {
    actionName: "reserveInventoryMovement",
    component: "InventoryReservation",
    businessContext: {
      domain: "inventory",
      operation: "update",
      resourceType: "inventory_reservation",
      criticalOperation: true,
    },
  },
)

export async function getInventoryTransactions(
  organizationId: string,
  filters?: {
    itemId?: string
    locationId?: string
    type?: TransactionType
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
) {
  return getInventoryTransactionsMovement({ organizationId, filters })
}

export async function reserveInventory(
  itemId: string,
  locationId: string,
  quantity: number,
  reason: string,
  organizationId: string,
  expiresAt?: Date,
) {
  return reserveInventoryMovement({ itemId, locationId, quantity, reason, organizationId, expiresAt })
}

export const getStockMovementSummary = inventoryAction(
  async (input: {
    organizationId: string
    itemId?: string
    locationId?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<ServerActionResult<any>> => {
    const { organizationId, itemId, locationId, dateFrom, dateTo } = input
    if (!organizationId) throw new Error("Organization ID is required")

    const where: Prisma.InventoryTransactionWhereInput = { organizationId }

    if (itemId) where.itemId = itemId
    if (locationId) where.locationId = locationId

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

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
      success: true,
      data: {
        totalInbound,
        totalOutbound,
        totalTransfers,
        totalAdjustments,
        totalReservations: 0,
        transactionCount,
        netMovement: totalInbound - totalOutbound,
        valueChange: toNumber(inbound._sum.totalCost) - toNumber(outbound._sum.totalCost),
      },
    }
  },
  {
    actionName: "getStockMovementSummary",
    component: "InventoryAnalytics",
    businessContext: {
      domain: "inventory",
      operation: "read",
      resourceType: "stock_movement_summary",
      criticalOperation: false,
    },
  },
)
