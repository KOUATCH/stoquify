"use server"

import { getAuthenticatedUser } from "@/lib/auth-server"
import { inventoryAction, type ServerActionResult } from "@/lib/error-handling"
import { requirePermission } from "@/lib/security/rbac"
import { AuthRequiredError, BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import { postInventoryReservation } from "@/services/inventory/inventory-stock-event.service"
import {
  getStockMovementSummary as readStockMovementSummary,
  listInventoryTransactionMovements,
  listStockTransfers,
  toLocationTransferDTO,
} from "@/services/inventory/inventory-read.service"
import { createStockTransfer, postStockTransfer } from "@/services/inventory/inventory-transfer.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { CreateTransferPayload, TransactionType, TransferStatus } from "@/types/inventoryMovementTypes"
import { revalidatePath, revalidateTag } from "next/cache"

async function requireInventoryHistoryReadAccess(input: { organizationId: string; resource: string; surface: string }) {
  const ctx = await requirePermission("inventory.levels.read", {
    resource: input.resource,
    auditAllowed: true,
  })
  if (input.organizationId !== ctx.orgId) {
    throw new ForbiddenError("Organization mismatch")
  }

  const moduleDecision = await observeModuleAccess({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    moduleSlug: "inventory",
    surfaceType: "action",
    surface: input.surface,
    accessIntent: "read",
    mode: "enforce",
    audit: true,
  })
  if (!moduleDecision.allowed) {
    throw new ForbiddenError("Inventory module is not available for this organization")
  }

  return ctx
}

export const createLocationTransfer = inventoryAction(
  async (input: {
    data: CreateTransferPayload
  }): Promise<ServerActionResult<any>> => {
    const { data } = input
    const ctx = await requirePermission("inventory.stock.transfer", {
      resource: "StockTransfer",
      auditAllowed: true,
    })
    const { transfer } = await createStockTransfer({
      organizationId: ctx.orgId,
      createdById: ctx.userId,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      requestedDate: data.requestedDate,
      notes: data.notes,
      lines: data.lines,
    })

    revalidateTag("transfers")
    revalidateTag(`transfers-${ctx.orgId}`)
    revalidatePath("/dashboard/inventory/transfers")

    return {
      success: true,
      data: {
        transfer: toLocationTransferDTO(transfer),
        message: `Transfer ${transfer.transferNumber} created successfully`,
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
    const { transferId } = input
    if (!transferId) throw new BusinessRuleError("Transfer ID is required")
    const ctx = await requirePermission("inventory.stock.transfer", {
      resource: "StockTransfer",
      resourceId: transferId,
      auditAllowed: true,
    })

    const result = await postStockTransfer({
      transferId,
      organizationId: ctx.orgId,
      approvedById: ctx.userId,
    })

    revalidateTag("transfers")
    revalidateTag(`transfers-${ctx.orgId}`)
    revalidateTag(`transfer-${transferId}`)
    revalidateTag("inventory")
    revalidateTag(`inventory-${ctx.orgId}`)
    revalidatePath("/dashboard/inventory/transfers")
    revalidatePath("/dashboard/inventory")

    return {
      success: true,
      data: {
        result: toLocationTransferDTO(result.transfer),
        message: result.replayed
          ? `Transfer ${result.transfer.transferNumber} was already completed`
          : `Transfer ${result.transfer.transferNumber} approved and completed successfully`,
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
    if (!organizationId) throw new BusinessRuleError("Organization ID is required")
    const ctx = await requireInventoryHistoryReadAccess({
      organizationId,
      resource: "StockTransferHistory",
      surface: "actions/inventory/inventoryMovementActions.ts:getTransfers",
    })
    const data = await listStockTransfers({
      organizationId: ctx.orgId,
      filters,
    })

    return {
      success: true,
      data,
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
    if (!organizationId) throw new BusinessRuleError("Organization ID is required")
    const ctx = await requireInventoryHistoryReadAccess({
      organizationId,
      resource: "InventoryTransactionHistory",
      surface: "actions/inventory/inventoryMovementActions.ts:getInventoryTransactionsMovement",
    })
    const transactions = await listInventoryTransactionMovements({
      organizationId: ctx.orgId,
      filters,
    })

    return {
      success: true,
      data: transactions,
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
    const { itemId, locationId, quantity, reason, organizationId, expiresAt } = input
    if (!itemId) throw new BusinessRuleError("Item ID is required")
    if (!locationId) throw new BusinessRuleError("Location ID is required")
    if (!organizationId) throw new BusinessRuleError("Organization ID is required")
    if (quantity <= 0) throw new BusinessRuleError("Quantity must be greater than 0")

    const user = await getAuthenticatedUser()
    if (!user?.id) throw new AuthRequiredError("Authenticated user is required to reserve inventory")

    const result = await postInventoryReservation({
      itemId,
      locationId,
      organizationId,
      quantity,
      actorId: user.id,
      reason,
      expiresAt,
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
    if (!organizationId) throw new BusinessRuleError("Organization ID is required")
    const ctx = await requireInventoryHistoryReadAccess({
      organizationId,
      resource: "InventoryTransactionHistorySummary",
      surface: "actions/inventory/inventoryMovementActions.ts:getStockMovementSummary",
    })
    const summary = await readStockMovementSummary({
      organizationId: ctx.orgId,
      filters: { itemId, locationId, dateFrom, dateTo },
    })

    return {
      success: true,
      data: summary,
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
