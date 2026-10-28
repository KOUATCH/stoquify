"use server"

import { TransactionType as InventoryTransactionType } from "@prisma/client"
import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  createInventoryHistoryExportDownloadGrant,
  enqueueInventoryHistoryBackgroundExport,
  INVENTORY_HISTORY_BACKGROUND_EXPORT_MAX_ROWS,
  getInventoryHistoryBackgroundExportStatus,
} from "@/services/inventory/inventory-history-background-export.service"

type BackgroundExportStatus = Awaited<
  ReturnType<typeof getInventoryHistoryBackgroundExportStatus>
>
type BackgroundExportGrant = Awaited<
  ReturnType<typeof createInventoryHistoryExportDownloadGrant>
>

const historyFiltersSchema = z
  .object({
    itemId: z.string().min(1).optional(),
    locationId: z.string().min(1).optional(),
    type: z.nativeEnum(InventoryTransactionType).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    effectiveAsOf: z.string().datetime({ offset: true }).optional(),
  })
  .strict()

const enqueueSchema = z
  .object({
    idempotencyKey: z.string().trim().min(8).max(128),
    filters: historyFiltersSchema.optional(),
    maximumRows: z.number().int().min(10_001).max(INVENTORY_HISTORY_BACKGROUND_EXPORT_MAX_ROWS).optional(),
    retentionSeconds: z.number().int().min(300).max(7 * 24 * 60 * 60).optional(),
    maxAttempts: z.number().int().min(1).max(10).optional(),
  })
  .strict()

const statusSchema = z.object({ jobId: z.string().min(1) }).strict()
const downloadGrantSchema = statusSchema.extend({
  grantSeconds: z.number().int().min(60).max(30 * 60).optional(),
})

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function enqueuePayload(input: unknown) {
  const record = asRecord(input)
  return {
    idempotencyKey: record.idempotencyKey,
    filters: record.filters,
    maximumRows: record.maximumRows,
    retentionSeconds: record.retentionSeconds,
    maxAttempts: record.maxAttempts,
  }
}

const enqueueBackgroundExport = protect<unknown, BackgroundExportStatus>(
  {
    permission: "reports.export",
    auditResource: "InventoryTransactionHistoryBackgroundExport",
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "inventory",
      surface: "inventory.history.background-export",
      accessIntent: "export",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = enqueueSchema.parse(enqueuePayload(input))
    const now = new Date()

    return enqueueInventoryHistoryBackgroundExport({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? null,
      now,
      idempotencyKey: parsed.idempotencyKey,
      filters: parsed.filters,
      maximumRows: parsed.maximumRows,
      retentionSeconds: parsed.retentionSeconds,
      maxAttempts: parsed.maxAttempts,
    })
  },
)

export async function enqueueInventoryMovementHistoryBackgroundExportAction(
  input: unknown,
) {
  return enqueueBackgroundExport(input)
}

const readBackgroundExportStatus = protect<unknown, BackgroundExportStatus>(
  {
    permission: "reports.export",
    auditResource: "InventoryTransactionHistoryBackgroundExportStatus",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "inventory",
      surface: "inventory.history.background-export",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = statusSchema.parse({ jobId: asRecord(input).jobId })
    return getInventoryHistoryBackgroundExportStatus({
      organizationId: ctx.orgId,
      actorPermissions: ctx.permissions,
      jobId: parsed.jobId,
    })
  },
)

export async function getInventoryMovementHistoryBackgroundExportStatusAction(
  input: unknown,
) {
  return readBackgroundExportStatus(input)
}

const grantBackgroundExportDownload = protect<unknown, BackgroundExportGrant>(
  {
    permission: "reports.export",
    auditResource: "InventoryTransactionHistoryBackgroundExportDownload",
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "inventory",
      surface: "inventory.history.background-export",
      accessIntent: "export",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const record = asRecord(input)
    const parsed = downloadGrantSchema.parse({
      jobId: record.jobId,
      grantSeconds: record.grantSeconds,
    })
    const now = new Date()

    return createInventoryHistoryExportDownloadGrant({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? null,
      now,
      jobId: parsed.jobId,
      grantSeconds: parsed.grantSeconds,
    })
  },
)

export async function createInventoryMovementHistoryBackgroundExportDownloadGrantAction(
  input: unknown,
) {
  return grantBackgroundExportDownload(input)
}
