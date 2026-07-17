"use server"

import { inventoryAction, type ServerActionResult } from "@/lib/error-handling"
import { requirePermission } from "@/lib/security/rbac"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import {
  createStockAdjustment as createStockAdjustmentService,
  requestManualItemStockAdjustment,
} from "@/services/inventory/inventory-adjustment.service"
import {
  getInventoryStats as readInventoryStats,
  listInventoryLevels as readInventoryLevels,
  listInventoryTransactionRecords,
  listStockAdjustments as readStockAdjustments,
  listStockTransferRecords,
  toStockAdjustmentRecord,
  toStockTransferRecord,
} from "@/services/inventory/inventory-read.service"
import { postInventoryReservation } from "@/services/inventory/inventory-stock-event.service"
import { createStockTransfer as createStockTransferService } from "@/services/inventory/inventory-transfer.service"
import {
  createItem as createInventoryItem,
  getItemWithRelations,
  listItemsWithRelations,
} from "@/services/item/item.service"
import {
  type CreateItemRequest,
  type CreateStockAdjustmentRequest,
  type CreateStockTransferRequest,
  type InventoryFilters,
  type InventoryLevelWithRelations,
  type InventoryTransactionWithRelations,
  type Item,
  type ItemWithRelations,
  type ReserveInventoryRequest,
  type StockAdjustment,
  type StockAdjustmentWithRelations,
  type StockTransfer,
  type StockTransferWithRelations,
  type TransactionFilters,
  TransactionType,
  type UpdateInventoryLevelRequest,
} from "@/types/inventoryTypes"

export interface InventoryLevel {
  id: string
  itemId: string
  locationId: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  quantityInTransit: number
  quantityOnOrder: number
  unitCost: number
  totalValue: number
  reorderPoint: number
  maxStockLevel: number
  item: {
    id: string
    name: string
    sku: string
    category: string
    unit: string
  }
  location: {
    id: string
    name: string
    type: string
  }
}

export interface InventoryTransaction {
  id: string
  inventoryLevelId: string
  type: string
  quantity: number
  unitCost: number
  totalCost: number
  referenceType: string
  referenceId: string
  itemId: string
  createdAt: Date
  organizationId: string
  createdById: string | null
  referenceNumber?: string | null
  batchNumber?: string | null
  serialNumbers?: number | null
  expiryDate?: string | null
  balanceAfter?: number | null
  item: {
    name: string
  }
}

export interface InventoryStats {
  totalItems: number | undefined
  totalValue: number | undefined
  lowStockItems: number | undefined
  outOfStockItems: number | undefined
  totalTransactions: any
  recentTransactions: InventoryTransactionWithRelations[]
}

export interface InventoryTransactionResponse {
  success: boolean
  data?: InventoryTransaction[]
  error?: string | null
}

export interface InventoryLevelsResponse {
  success: boolean
  data?: InventoryLevel[]
  error?: string | null
}

export interface InventoryStatsResponse {
  success: boolean
  data?: InventoryStats
  error?: string | null
}

const outboundTransactionTypes = new Set<TransactionType>([
  TransactionType.SALE,
  TransactionType.PURCHASE_RETURN,
  TransactionType.TRANSFER_OUT,
  TransactionType.ADJUSTMENT_OUT,
  TransactionType.PRODUCTION_OUT,
  TransactionType.DAMAGED,
  TransactionType.EXPIRED,
  TransactionType.THEFT,
  TransactionType.WRITE_OFF,
  TransactionType.SAMPLE,
  TransactionType.PROMOTION,
])

type InventoryPermissionOptions = {
  permission: string
  resource: string
  resourceId?: string
  auditAllowed?: boolean
}

async function trustedInventoryContext(
  inputOrganizationId: string | undefined,
  options: InventoryPermissionOptions,
) {
  const ctx = await requirePermission(options.permission, {
    resource: options.resource,
    ...(options.resourceId ? { resourceId: options.resourceId } : {}),
    ...(options.auditAllowed !== undefined ? { auditAllowed: options.auditAllowed } : {}),
  })

  if (inputOrganizationId && inputOrganizationId !== ctx.orgId) {
    throw new ForbiddenError("Organization mismatch")
  }

  return {
    organizationId: ctx.orgId,
    userId: ctx.userId,
  }
}

function signedQuantity(type: TransactionType, quantity: number) {
  const absoluteQuantity = Math.abs(quantity)
  return outboundTransactionTypes.has(type) ? -absoluteQuantity : absoluteQuantity
}

// ===== ITEMS =====
export const getItems = inventoryAction(
  async (input: {
    organizationId: string
    filters?: InventoryFilters
  }): Promise<ServerActionResult<ItemWithRelations[]>> => {
    const { organizationId, filters } = input
    const ctx = await trustedInventoryContext(organizationId, {
      permission: "inventory.items.read",
      resource: "Item",
    })
    const result = await listItemsWithRelations({
      organizationId: ctx.organizationId,
      q: filters?.search,
      categoryId: filters?.categoryId,
      brandId: filters?.brandId,
      pageSize: 100,
      isActive: true,
    })

    return { success: true, data: result.data as unknown as ItemWithRelations[] }
  },
  {
    actionName: "getItems",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "read",
      resourceType: "items",
      criticalOperation: false,
    },
  },
)

export const getItem = inventoryAction(
  async (input: { id: string }): Promise<ServerActionResult<ItemWithRelations | null>> => {
    const { id } = input
    const ctx = await trustedInventoryContext(undefined, {
      permission: "inventory.items.read",
      resource: "Item",
      resourceId: id,
    })
    const item = await getItemWithRelations(ctx.organizationId, id)
    return { success: true, data: item as unknown as ItemWithRelations | null }
  },
  {
    actionName: "getItem",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "read",
      resourceType: "item",
      criticalOperation: false,
    },
  },
)

export const createItem = inventoryAction(
  async (input: {
    organizationId: string
    data: CreateItemRequest
  }): Promise<ServerActionResult<Item>> => {
    const { organizationId, data } = input
    const ctx = await trustedInventoryContext(organizationId, {
      permission: "inventory.items.create",
      resource: "Item",
      auditAllowed: true,
    })
    const item = await createInventoryItem(ctx.organizationId, ctx.userId, {
      nameEn: data.name,
      nameFr: null,
      sku: data.sku,
      descriptionEn: data.description ?? null,
      descriptionFr: null,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      categoryId: data.categoryId ?? null,
      brandId: data.brandId ?? null,
    })

    return { success: true, data: item as unknown as Item }
  },
  {
    actionName: "createItem",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "create",
      resourceType: "item",
      criticalOperation: false,
    },
  },
)

// ===== INVENTORY LEVELS =====
export const getInventoryLevels = inventoryAction(
  async (input: {
    organizationId: string
    filters?: InventoryFilters
  }): Promise<ServerActionResult<InventoryLevelWithRelations[]>> => {
    const { organizationId, filters } = input
    const ctx = await trustedInventoryContext(organizationId, {
      permission: "inventory.levels.read",
      resource: "InventoryLevel",
    })
    const levels = await readInventoryLevels({ organizationId: ctx.organizationId, filters })
    return { success: true, data: levels }
  },
  {
    actionName: "getInventoryLevels",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "read",
      resourceType: "inventory_levels",
      criticalOperation: false,
    },
  },
)

export const updateInventoryLevel = inventoryAction(
  async (input: {
    data: UpdateInventoryLevelRequest
  }): Promise<ServerActionResult<unknown>> => {
    const { data } = input
    const ctx = await trustedInventoryContext(undefined, {
      permission: "inventory.levels.adjust",
      resource: "InventoryLevel",
      auditAllowed: true,
    })
    const adjustment = await requestManualItemStockAdjustment({
      organizationId: ctx.organizationId,
      itemId: data.itemId,
      locationId: data.locationId,
      actorId: ctx.userId,
      quantityChange: signedQuantity(data.type, data.quantity),
      mode: "delta",
      unitCost: data.unitCost,
      reason: data.notes ?? "Manual inventory level update",
      notes: data.referenceNumber ?? null,
    })

    return { success: true, data: adjustment }
  },
  {
    actionName: "updateInventoryLevel",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "update",
      resourceType: "inventory_level",
      criticalOperation: true,
    },
  },
)

export const reserveInventory = inventoryAction(
  async (input: {
    data: ReserveInventoryRequest
  }): Promise<ServerActionResult<unknown[]>> => {
    const { data } = input
    const ctx = await trustedInventoryContext(data.organizationId, {
      permission: "inventory.levels.adjust",
      resource: "InventoryReservation",
      auditAllowed: true,
    })
    const reservations = await Promise.all(
      data.reservations.map((reservation) =>
        postInventoryReservation({
          itemId: reservation.itemId,
          locationId: reservation.locationId,
          organizationId: ctx.organizationId,
          quantity: reservation.quantity,
          actorId: ctx.userId,
          reason: "Inventory reserved",
        }),
      ),
    )

    return { success: true, data: reservations }
  },
  {
    actionName: "reserveInventory",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "update",
      resourceType: "inventory_reservation",
      criticalOperation: true,
    },
  },
)

export const releaseInventory = inventoryAction(
  async (): Promise<ServerActionResult<never>> => {
    throw new BusinessRuleError("Inventory reservation release requires a service-owned release workflow before it can be used.")
  },
  {
    actionName: "releaseInventory",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "update",
      resourceType: "inventory_reservation",
      criticalOperation: true,
    },
  },
)

// ===== INVENTORY TRANSACTIONS =====
export const getInventoryTransactions = inventoryAction(
  async (input: {
    organizationId: string
    filters?: TransactionFilters
  }): Promise<ServerActionResult<InventoryTransactionWithRelations[]>> => {
    const { organizationId, filters } = input
    const ctx = await trustedInventoryContext(organizationId, {
      permission: "inventory.levels.read",
      resource: "InventoryTransaction",
    })
    const transactions = await listInventoryTransactionRecords({
      organizationId: ctx.organizationId,
      filters,
    })

    return { success: true, data: transactions }
  },
  {
    actionName: "getInventoryTransactions",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "read",
      resourceType: "inventory_transactions",
      criticalOperation: false,
    },
  },
)

export const getInventoryStats = inventoryAction(
  async (): Promise<ServerActionResult<InventoryStats>> => {
    const ctx = await trustedInventoryContext(undefined, {
      permission: "inventory.read",
      resource: "InventoryDashboard",
    })
    const stats = await readInventoryStats(ctx.organizationId)
    return { success: true, data: stats as InventoryStats }
  },
  {
    actionName: "getInventoryStats",
    component: "InventoryDashboard",
    businessContext: {
      domain: "inventory",
      operation: "read",
      resourceType: "inventory_stats",
      criticalOperation: false,
    },
  },
)

// ===== STOCK ADJUSTMENTS =====
export const getStockAdjustments = inventoryAction(
  async (input: {
    organizationId: string
  }): Promise<ServerActionResult<StockAdjustmentWithRelations[]>> => {
    const { organizationId } = input
    const ctx = await trustedInventoryContext(organizationId, {
      permission: "inventory.levels.read",
      resource: "StockAdjustment",
    })
    const adjustments = await readStockAdjustments(ctx.organizationId)
    return { success: true, data: adjustments }
  },
  {
    actionName: "getStockAdjustments",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "read",
      resourceType: "stock_adjustments",
      criticalOperation: false,
    },
  },
)

export const createStockAdjustment = inventoryAction(
  async (input: {
    data: CreateStockAdjustmentRequest
  }): Promise<ServerActionResult<StockAdjustment>> => {
    const { data } = input
    const ctx = await trustedInventoryContext(undefined, {
      permission: "inventory.stock.adjust",
      resource: "StockAdjustment",
      auditAllowed: true,
    })
    const adjustment = await createStockAdjustmentService({
      organizationId: ctx.organizationId,
      locationId: data.locationId,
      type: data.type as any,
      reason: data.reason,
      notes: data.notes,
      createdById: ctx.userId,
      lines: data.lines.map((line) => ({
        itemId: line.itemId,
        systemQuantity: line.systemQuantity,
        actualQuantity: line.actualQuantity,
        adjustedQuantity: line.actualQuantity - line.systemQuantity,
        unitCost: line.unitCost,
        notes: line.notes,
      })),
    })

    return { success: true, data: toStockAdjustmentRecord(adjustment) as unknown as StockAdjustment }
  },
  {
    actionName: "createStockAdjustment",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "create",
      resourceType: "stock_adjustment",
      criticalOperation: true,
    },
  },
)

// ===== STOCK TRANSFERS =====
export const getStockTransfers = inventoryAction(
  async (input: {
    organizationId: string
  }): Promise<ServerActionResult<StockTransferWithRelations[]>> => {
    const { organizationId } = input
    const ctx = await trustedInventoryContext(organizationId, {
      permission: "TRANSFERS_READ",
      resource: "StockTransfer",
    })
    const transfers = await listStockTransferRecords(ctx.organizationId)
    return { success: true, data: transfers }
  },
  {
    actionName: "getStockTransfers",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "read",
      resourceType: "stock_transfers",
      criticalOperation: false,
    },
  },
)

export const createStockTransfer = inventoryAction(
  async (input: {
    data: CreateStockTransferRequest
  }): Promise<ServerActionResult<StockTransfer>> => {
    const { data } = input
    const ctx = await trustedInventoryContext(undefined, {
      permission: "inventory.stock.transfer",
      resource: "StockTransfer",
      auditAllowed: true,
    })
    const result = await createStockTransferService({
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      requestedDate: data.expectedDate,
      notes: data.notes,
      lines: data.lines,
    })

    return { success: true, data: toStockTransferRecord(result.transfer) as unknown as StockTransfer }
  },
  {
    actionName: "createStockTransfer",
    component: "InventoryManagement",
    businessContext: {
      domain: "inventory",
      operation: "create",
      resourceType: "stock_transfer",
      criticalOperation: true,
    },
  },
)
