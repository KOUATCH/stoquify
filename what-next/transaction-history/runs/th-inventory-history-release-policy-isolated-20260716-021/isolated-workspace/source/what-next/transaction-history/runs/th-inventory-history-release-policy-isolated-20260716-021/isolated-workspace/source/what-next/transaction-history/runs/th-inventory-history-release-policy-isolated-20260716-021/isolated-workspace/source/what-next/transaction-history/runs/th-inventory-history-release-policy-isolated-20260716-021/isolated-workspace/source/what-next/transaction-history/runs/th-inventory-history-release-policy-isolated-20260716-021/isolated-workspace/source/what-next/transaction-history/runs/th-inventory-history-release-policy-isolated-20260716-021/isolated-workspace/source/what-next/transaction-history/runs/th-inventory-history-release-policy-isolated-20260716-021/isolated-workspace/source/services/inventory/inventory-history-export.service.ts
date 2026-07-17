import { createHash, randomUUID } from "node:crypto"

import { Prisma } from "@prisma/client"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  evaluateAndAuditSensitiveAction,
  type SensitiveActionAuditClient,
} from "@/services/controls/sensitive-action.service"
import { hashNormalizedHistoryFilters } from "@/services/history/transaction-history-cursor"
import {
  streamInventoryMovementHistoryExport,
  type InventoryMovementHistoryAppliedFilters,
  type InventoryMovementHistoryExportOptions,
  type InventoryMovementHistoryInput,
  type InventoryMovementHistoryResult,
  type InventoryMovementHistoryRow,
} from "@/services/inventory/inventory-read.service"

export const INVENTORY_HISTORY_EXPORT_HARD_LIMIT = 10_000

const EXPORT_FILE_TYPE = "application/json"
const EXPORT_SENSITIVITY = "operational" as const

type InventoryHistoryFilters = NonNullable<InventoryMovementHistoryInput["filters"]>

export type InventoryHistoryExportInput = {
  organizationId: string
  actorId: string
  actorPermissions: readonly string[]
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
  filters?: InventoryHistoryFilters
  maximumRows?: number
}

export type InventoryHistoryExportManifest = {
  schemaVersion: 1
  exportId: string
  organizationId: string
  actorId: string
  generatedAt: string
  snapshot: InventoryMovementHistoryResult["snapshot"]
  appliedFilters: InventoryMovementHistoryAppliedFilters
  requestFiltersHash: string
  appliedFiltersHash: string
  contentHash: string
  byteLength: number
  rowCount: number
  maximumRows: number
  fileType: typeof EXPORT_FILE_TYPE
  sensitivity: typeof EXPORT_SENSITIVITY
  watermarkId: string
  completeness: InventoryMovementHistoryResult["completeness"]
  redactionScope: string[]
}

export type InventoryHistoryExportResult = {
  fileName: string
  fileType: typeof EXPORT_FILE_TYPE
  content: string
  manifest: InventoryHistoryExportManifest
  manifestAuditId: string
}

export type InventoryHistoryExportServiceOptions = {
  auditClient?: SensitiveActionAuditClient
  historyOptions?: InventoryMovementHistoryExportOptions
  exportIdFactory?: () => string
  now?: () => Date
}

function resolveDate(value: Date | number | string): Date {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new BusinessRuleError("Inventory history export time is invalid.")
  }
  return date
}

function requestedFilterScope(filters: InventoryHistoryFilters | undefined) {
  const scope: Record<string, unknown> = { ...(filters ?? {}) }
  delete scope.cursor
  delete scope.pageSize

  if (scope.effectiveAsOf instanceof Date) {
    scope.effectiveAsOf = scope.effectiveAsOf.toISOString()
  }
  return scope
}

function appliedFilterScope(filters: InventoryMovementHistoryAppliedFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([key]) => key !== "pageSize"),
  )
}

function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`
}

function assertMaximumRows(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > INVENTORY_HISTORY_EXPORT_HARD_LIMIT) {
    throw new BusinessRuleError(
      `Inventory history exports must contain between 1 and ${INVENTORY_HISTORY_EXPORT_HARD_LIMIT} rows.`,
    )
  }
}

async function auditInventoryReadDenial(
  auditClient: SensitiveActionAuditClient,
  input: InventoryHistoryExportInput,
  exportId: string,
) {
  await auditClient.auditLog.create({
    data: {
      entityType: "InventoryTransactionHistoryExport",
      entityId: exportId,
      action: "INVENTORY_HISTORY_EXPORT_CONTROL_DENIED",
      organizationId: input.organizationId,
      userId: input.actorId,
      changes: {
        action: "inventory.history.export",
        allowed: false,
        permission: "inventory.levels.read",
        reasonCode: "MISSING_INVENTORY_HISTORY_READ_PERMISSION",
      } as Prisma.InputJsonValue,
    },
  })
}

export async function exportInventoryMovementHistory(
  input: InventoryHistoryExportInput,
  options: InventoryHistoryExportServiceOptions = {},
): Promise<InventoryHistoryExportResult> {
  if (input.filters?.cursor) {
    throw new BusinessRuleError("Inventory history exports must start from a fresh snapshot.")
  }

  const maximumRows = input.maximumRows ?? INVENTORY_HISTORY_EXPORT_HARD_LIMIT
  assertMaximumRows(maximumRows)

  const generatedAt = resolveDate(input.now ?? options.now?.() ?? new Date())
  const exportId = (options.exportIdFactory ?? randomUUID)()
  const watermarkId = `stoquify:inventory-history:${input.organizationId}:${exportId}`
  const auditClient = options.auditClient ?? db
  const requestFiltersHash = sha256(
    hashNormalizedHistoryFilters({
      organizationId: input.organizationId,
      filters: requestedFilterScope(input.filters),
    }),
  )

  const decision = await evaluateAndAuditSensitiveAction(auditClient, {
    action: "inventory.history.export",
    actorId: input.actorId,
    organizationId: input.organizationId,
    actorPermissions: input.actorPermissions,
    resourceType: "InventoryTransactionHistoryExport",
    resourceId: exportId,
    lastAuthAt: input.lastAuthAt,
    now: generatedAt,
    exportContext: {
      scope: "inventory.transaction-history.requested",
      filtersHash: requestFiltersHash,
      rowCount: 0,
      fileType: EXPORT_FILE_TYPE,
      sensitivity: EXPORT_SENSITIVITY,
      watermarkId,
    },
    metadata: { maximumRows },
  })
  assertSensitiveActionAllowed(decision)

  if (!hasRbacPermission(input.actorPermissions, "inventory.levels.read")) {
    await auditInventoryReadDenial(auditClient, input, exportId)
    throw new ForbiddenError("You are not allowed to read inventory history.")
  }

  const rows: InventoryMovementHistoryRow[] = []
  let firstPage: InventoryMovementHistoryResult | null = null
  let appliedFiltersHash: string | null = null

  for await (const page of streamInventoryMovementHistoryExport(
    {
      organizationId: input.organizationId,
      filters: input.filters,
    },
    {
      ...options.historyOptions,
      maximumRows,
    },
  )) {
    const pageFiltersHash = sha256(
      hashNormalizedHistoryFilters(appliedFilterScope(page.appliedFilters)),
    )

    if (!firstPage) {
      firstPage = page
      appliedFiltersHash = pageFiltersHash
    } else if (
      page.snapshot.recordedThrough !== firstPage.snapshot.recordedThrough ||
      pageFiltersHash !== appliedFiltersHash
    ) {
      throw new BusinessRuleError("Inventory history export snapshot continuity was lost.")
    }

    rows.push(...page.rows)
  }

  if (!firstPage || !appliedFiltersHash) {
    throw new BusinessRuleError("Inventory history export did not produce a verifiable snapshot.")
  }

  const artifact = {
    schemaVersion: 1,
    exportId,
    organizationId: input.organizationId,
    generatedAt: generatedAt.toISOString(),
    watermarkId,
    snapshot: firstPage.snapshot,
    appliedFilters: firstPage.appliedFilters,
    completeness: firstPage.completeness,
    rowCount: rows.length,
    rows,
  }
  const content = JSON.stringify(artifact)
  const contentHash = sha256(content)
  const byteLength = Buffer.byteLength(content, "utf8")
  const manifest: InventoryHistoryExportManifest = {
    schemaVersion: 1,
    exportId,
    organizationId: input.organizationId,
    actorId: input.actorId,
    generatedAt: generatedAt.toISOString(),
    snapshot: firstPage.snapshot,
    appliedFilters: firstPage.appliedFilters,
    requestFiltersHash,
    appliedFiltersHash,
    contentHash,
    byteLength,
    rowCount: rows.length,
    maximumRows,
    fileType: EXPORT_FILE_TYPE,
    sensitivity: EXPORT_SENSITIVITY,
    watermarkId,
    completeness: firstPage.completeness,
    redactionScope: [
      "No user contact or authentication fields",
      "No organization secrets or integration credentials",
      "Operational actor display names retained for audit traceability",
    ],
  }

  const manifestAudit = await auditClient.auditLog.create({
    data: {
      entityType: "InventoryTransactionHistoryExport",
      entityId: exportId,
      action: "INVENTORY_HISTORY_EXPORT_MANIFEST",
      organizationId: input.organizationId,
      userId: input.actorId,
      changes: manifest as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    fileName: `inventory-history-${generatedAt.toISOString().slice(0, 10)}-${exportId}.json`,
    fileType: EXPORT_FILE_TYPE,
    content,
    manifest,
    manifestAuditId: manifestAudit.id,
  }
}
