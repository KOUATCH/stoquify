"use server"

import { inventoryAction, type ServerActionResult } from "@/lib/error-handling"
import { requirePermission } from "@/lib/security/rbac"
import { ForbiddenError } from "@/services/_shared/action-errors"
import {
  postStockAdjustment,
  type PostStockAdjustmentResult,
} from "@/services/inventory/inventory-adjustment.service"
import {
  createStockCountSession,
  postStockCount,
  submitStockCountSession,
  type CreateStockCountSessionResult,
  type PostStockCountResult,
  type SubmitStockCountSessionResult,
} from "@/services/inventory/inventory-count.service"
import type {
  CreateStockCountSessionInput,
  PostStockAdjustmentInput,
  PostStockCountInput,
  SubmitStockCountSessionInput,
} from "@/services/inventory/inventory-event.schemas"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

const ACTION_SURFACE_PREFIX =
  "actions/inventory/inventoryLossControlActions.ts"

type CreateStockCountActionInput = Omit<
  CreateStockCountSessionInput,
  "organizationId" | "createdById"
> & {
  organizationId?: string
  createdById?: string
}

type SubmitStockCountActionInput = Omit<
  SubmitStockCountSessionInput,
  "organizationId" | "submittedById"
> & {
  organizationId?: string
  submittedById?: string
}

type PostStockCountActionInput = Omit<
  PostStockCountInput,
  "organizationId" | "approvedById"
> & {
  organizationId?: string
  approvedById?: string
}

type PostStockAdjustmentActionInput = Omit<
  PostStockAdjustmentInput,
  "organizationId" | "approvedById"
> & {
  organizationId?: string
  approvedById?: string
}

async function requireInventoryLossCommandAccess(input: {
  organizationId?: string
  resource: string
  resourceId?: string
  surface: string
}) {
  const ctx = await requirePermission("inventory.stock.adjust", {
    resource: input.resource,
    ...(input.resourceId ? { resourceId: input.resourceId } : {}),
    auditAllowed: true,
  })

  if (input.organizationId && input.organizationId !== ctx.orgId) {
    throw new ForbiddenError("Organization mismatch")
  }

  const moduleDecision = await observeModuleAccess({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    moduleSlug: "inventory",
    surfaceType: "action",
    surface: `${ACTION_SURFACE_PREFIX}:${input.surface}`,
    accessIntent: "write",
    mode: "enforce",
    audit: true,
  })

  if (!moduleDecision.allowed) {
    throw new ForbiddenError(
      "Inventory module is not available for this organization",
    )
  }

  return ctx
}

function dateValue(value: Date | null | undefined) {
  return value?.toISOString() ?? null
}

function isNonZeroDecimal(value: { toString(): string } | null | undefined) {
  if (value == null) return false
  return !/^[+-]?0+(?:\.0+)?$/.test(value.toString())
}

function createCountSummary(session: CreateStockCountSessionResult) {
  return {
    id: session.id,
    countNumber: session.countNumber,
    status: session.status,
    locationId: session.locationId,
    countDate: dateValue(session.countDate),
    lineCount: session.lines.length,
    snapshotHash: session.snapshotHash ?? null,
  }
}

function submittedCountSummary(session: SubmitStockCountSessionResult) {
  return {
    id: session.id,
    countNumber: session.countNumber,
    status: session.status,
    locationId: session.locationId,
    submittedAt: dateValue(session.submittedAt),
    countSheetHash: session.countSheetHash ?? null,
    lineCount: session.lines.length,
    varianceLineCount: session.lines.filter((line) =>
      isNonZeroDecimal(line.varianceQuantity),
    ).length,
  }
}

function postedCountSummary(result: PostStockCountResult) {
  return {
    id: result.countSession.id,
    countNumber: result.countSession.countNumber,
    status: result.countSession.status,
    locationId: result.countSession.locationId,
    approvedAt: dateValue(result.countSession.approvedAt),
    postedAt: dateValue(result.countSession.postedAt),
    eventId: result.eventId,
    idempotencyKey: result.idempotencyKey,
    countSheetHash: result.countSheetHash,
    snapshotHash: result.snapshotHash ?? null,
    varianceLineCount: result.varianceLineCount,
    totalVarianceValue: result.totalVarianceValue,
    generatedAdjustmentId: result.generatedAdjustmentId ?? null,
    generatedAdjustmentEventId: result.generatedAdjustmentEventId ?? null,
    generatedAdjustmentLedgerStatus:
      result.generatedAdjustmentLedgerStatus ?? null,
    replayed: result.replayed,
  }
}

function postedAdjustmentSummary(result: PostStockAdjustmentResult) {
  return {
    id: result.adjustment.id,
    adjustmentNumber: result.adjustment.adjustmentNumber,
    type: result.adjustment.type,
    status: result.adjustment.status,
    eventId: result.eventId,
    idempotencyKey: result.idempotencyKey,
    documentHash: result.documentHash,
    evidenceHash: result.evidenceHash ?? null,
    movementTransactionIds: result.movementTransactionIds,
    ledgerStatus: result.ledger.status,
    postingBatchId: result.ledger.postingBatchId,
    journalEntryId: result.ledger.journalEntryId ?? null,
    blockerCode: result.ledger.blockerCode ?? null,
    replayed: result.replayed,
  }
}

export const createStockCountSessionAction = inventoryAction(
  async (
    input: CreateStockCountActionInput,
  ): Promise<ServerActionResult<ReturnType<typeof createCountSummary>>> => {
    const { organizationId, ...command } = input
    const ctx = await requireInventoryLossCommandAccess({
      organizationId,
      resource: "StockCountSession",
      surface: "createStockCountSessionAction",
    })

    const session = await createStockCountSession({
      ...command,
      organizationId: ctx.orgId,
      createdById: ctx.userId,
    })

    return { success: true, data: createCountSummary(session) }
  },
  {
    actionName: "createStockCountSessionAction",
    component: "InventoryLossControl",
    businessContext: {
      domain: "inventory",
      operation: "create",
      resourceType: "stock_count_session",
      criticalOperation: true,
    },
  },
)

export const submitStockCountSessionAction = inventoryAction(
  async (
    input: SubmitStockCountActionInput,
  ): Promise<ServerActionResult<ReturnType<typeof submittedCountSummary>>> => {
    const { organizationId, ...command } = input
    const ctx = await requireInventoryLossCommandAccess({
      organizationId,
      resource: "StockCountSession",
      resourceId: input.countSessionId,
      surface: "submitStockCountSessionAction",
    })

    const session = await submitStockCountSession({
      ...command,
      organizationId: ctx.orgId,
      submittedById: ctx.userId,
    })

    return { success: true, data: submittedCountSummary(session) }
  },
  {
    actionName: "submitStockCountSessionAction",
    component: "InventoryLossControl",
    businessContext: {
      domain: "inventory",
      operation: "update",
      resourceType: "stock_count_submission",
      criticalOperation: true,
    },
  },
)

export const postStockCountAction = inventoryAction(
  async (
    input: PostStockCountActionInput,
  ): Promise<ServerActionResult<ReturnType<typeof postedCountSummary>>> => {
    const { organizationId, ...command } = input
    const ctx = await requireInventoryLossCommandAccess({
      organizationId,
      resource: "StockCountSession",
      resourceId: input.countSessionId,
      surface: "postStockCountAction",
    })

    const result = await postStockCount({
      ...command,
      organizationId: ctx.orgId,
      approvedById: ctx.userId,
    })

    return { success: true, data: postedCountSummary(result) }
  },
  {
    actionName: "postStockCountAction",
    component: "InventoryLossControl",
    businessContext: {
      domain: "inventory",
      operation: "update",
      resourceType: "stock_count_approval",
      criticalOperation: true,
    },
  },
)

export const postStockAdjustmentAction = inventoryAction(
  async (
    input: PostStockAdjustmentActionInput,
  ): Promise<ServerActionResult<ReturnType<typeof postedAdjustmentSummary>>> => {
    const { organizationId, ...command } = input
    const ctx = await requireInventoryLossCommandAccess({
      organizationId,
      resource: "StockAdjustment",
      resourceId: input.adjustmentId,
      surface: "postStockAdjustmentAction",
    })

    const result = await postStockAdjustment({
      ...command,
      organizationId: ctx.orgId,
      approvedById: ctx.userId,
    })

    return { success: true, data: postedAdjustmentSummary(result) }
  },
  {
    actionName: "postStockAdjustmentAction",
    component: "InventoryLossControl",
    businessContext: {
      domain: "inventory",
      operation: "update",
      resourceType: "stock_adjustment_approval",
      criticalOperation: true,
    },
  },
)
