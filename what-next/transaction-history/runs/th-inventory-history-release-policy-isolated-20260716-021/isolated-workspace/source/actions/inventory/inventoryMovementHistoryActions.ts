"use server"

import { TransactionType as InventoryTransactionType } from "@prisma/client"
import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  exportInventoryMovementHistory,
  INVENTORY_HISTORY_EXPORT_HARD_LIMIT,
  type InventoryHistoryExportResult,
} from "@/services/inventory/inventory-history-export.service"
import {
  readInventoryMovementHistory,
  type InventoryMovementHistoryResult,
} from "@/services/inventory/inventory-read.service"

export type { InventoryHistoryExportResult, InventoryMovementHistoryResult }

const historyFiltersSchema = z
  .object({
    itemId: z.string().min(1).optional(),
    locationId: z.string().min(1).optional(),
    type: z.nativeEnum(InventoryTransactionType).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    effectiveAsOf: z.union([z.date(), z.string().datetime({ offset: true })]).optional(),
    pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]).optional(),
    cursor: z.string().max(4096).optional(),
  })
  .strict()

const historyReadActionSchema = z.object({ filters: historyFiltersSchema.optional() }).strict()
const historyExportActionSchema = historyReadActionSchema.extend({
  maximumRows: z.number().int().min(1).max(INVENTORY_HISTORY_EXPORT_HARD_LIMIT).optional(),
})

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function actionPayload(input: unknown) {
  const record = asRecord(input)
  return {
    filters: record.filters,
    maximumRows: record.maximumRows,
  }
}

const readHistory = protect<unknown, InventoryMovementHistoryResult>(
  {
    permission: "inventory.levels.read",
    auditResource: "InventoryTransactionHistory",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "inventory",
      surface: "inventory.levels.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = historyReadActionSchema.parse({
      filters: actionPayload(input).filters,
    })

    return readInventoryMovementHistory({
      organizationId: ctx.orgId,
      filters: parsed.filters,
    })
  },
)

export async function getInventoryMovementHistoryAction(input: unknown = {}) {
  return readHistory(input)
}

const exportHistory = protect<unknown, InventoryHistoryExportResult>(
  {
    permission: "reports.export",
    auditResource: "InventoryTransactionHistoryExport",
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "inventory",
      surface: "inventory.history.export",
      accessIntent: "export",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = historyExportActionSchema.parse(actionPayload(input))
    const now = new Date()

    return exportInventoryMovementHistory({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? null,
      now,
      filters: parsed.filters,
      maximumRows: parsed.maximumRows,
    })
  },
)

export async function exportInventoryMovementHistoryAction(input: unknown = {}) {
  return exportHistory(input)
}
