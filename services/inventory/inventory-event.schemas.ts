import { z } from "zod"

const requiredId = z.string().trim().min(1)
const decimalInput = z.union([z.number(), z.string()]).transform((value) => String(value))
const positiveDecimalInput = decimalInput.refine((value) => Number(value) > 0, {
  message: "Value must be greater than zero",
})

export const adjustmentTypeSchema = z.enum([
  "CYCLE_COUNT",
  "PHYSICAL_COUNT",
  "DAMAGED",
  "EXPIRED",
  "THEFT",
  "WRITE_OFF",
  "FOUND",
  "CORRECTION",
  "OTHER",
])

export const postStockTransferInputSchema = z.object({
  organizationId: requiredId,
  transferId: requiredId,
  approvedById: requiredId,
  idempotencyKey: requiredId.optional(),
  occurredAt: z.date().optional(),
  documentHash: requiredId.optional(),
  correlationId: requiredId.optional(),
})

export type PostStockTransferInput = z.input<typeof postStockTransferInputSchema>
export type ParsedPostStockTransferInput = z.output<typeof postStockTransferInputSchema>

export const createStockTransferLineInputSchema = z.object({
  itemId: requiredId,
  requestedQuantity: positiveDecimalInput,
  notes: z.string().trim().optional(),
})

export const createStockTransferInputSchema = z.object({
  organizationId: requiredId,
  fromLocationId: requiredId,
  toLocationId: requiredId,
  createdById: requiredId,
  requestedDate: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
  lines: z.array(createStockTransferLineInputSchema).min(1),
})

export type CreateStockTransferInput = z.input<typeof createStockTransferInputSchema>
export type ParsedCreateStockTransferInput = z.output<typeof createStockTransferInputSchema>

export const rebuildInventoryProjectionInputSchema = z.object({
  organizationId: requiredId,
  itemId: requiredId.optional(),
  locationId: requiredId.optional(),
  asOf: z.date().optional(),
  toleranceQuantity: z.union([z.number(), z.string()]).optional(),
  toleranceValue: z.union([z.number(), z.string()]).optional(),
})

export type RebuildInventoryProjectionInput = z.input<typeof rebuildInventoryProjectionInputSchema>
export type ParsedRebuildInventoryProjectionInput = z.output<typeof rebuildInventoryProjectionInputSchema>

export const reconcileInventoryClass3InputSchema = z.object({
  organizationId: requiredId,
  periodId: requiredId.optional(),
  locationId: requiredId.optional(),
  currency: z.string().trim().min(1).default("XAF"),
  toleranceValue: z.union([z.number(), z.string()]).optional(),
})

export type ReconcileInventoryClass3Input = z.input<typeof reconcileInventoryClass3InputSchema>
export type ParsedReconcileInventoryClass3Input = z.output<typeof reconcileInventoryClass3InputSchema>

export const createStockAdjustmentLineInputSchema = z.object({
  itemId: requiredId,
  systemQuantity: decimalInput.optional(),
  actualQuantity: decimalInput.optional(),
  adjustedQuantity: decimalInput,
  unitCost: decimalInput.optional(),
  notes: z.string().trim().optional(),
  evidenceHash: requiredId.optional(),
  stockCountLineId: requiredId.optional(),
  metadata: z.unknown().optional(),
})

export const createStockAdjustmentInputSchema = z.object({
  organizationId: requiredId,
  locationId: requiredId,
  type: adjustmentTypeSchema,
  reason: z.string().trim().min(1),
  createdById: requiredId,
  adjustmentDate: z.date().optional(),
  notes: z.string().trim().optional(),
  evidenceHash: requiredId.optional(),
  documentHash: requiredId.optional(),
  sourceCountSessionId: requiredId.optional(),
  metadata: z.unknown().optional(),
  lines: z.array(createStockAdjustmentLineInputSchema).min(1),
})

export type CreateStockAdjustmentInput = z.input<typeof createStockAdjustmentInputSchema>
export type ParsedCreateStockAdjustmentInput = z.output<typeof createStockAdjustmentInputSchema>

export const postStockAdjustmentInputSchema = z.object({
  organizationId: requiredId,
  adjustmentId: requiredId,
  approvedById: requiredId,
  idempotencyKey: requiredId.optional(),
  occurredAt: z.date().optional(),
  evidenceHash: requiredId.optional(),
  documentHash: requiredId.optional(),
  correlationId: requiredId.optional(),
})

export type PostStockAdjustmentInput = z.input<typeof postStockAdjustmentInputSchema>
export type ParsedPostStockAdjustmentInput = z.output<typeof postStockAdjustmentInputSchema>

export const createStockCountSessionInputSchema = z.object({
  organizationId: requiredId,
  locationId: requiredId,
  createdById: requiredId,
  countNumber: requiredId.optional(),
  countDate: z.date().optional(),
  notes: z.string().trim().optional(),
  itemIds: z.array(requiredId).optional(),
  metadata: z.unknown().optional(),
})

export type CreateStockCountSessionInput = z.input<typeof createStockCountSessionInputSchema>
export type ParsedCreateStockCountSessionInput = z.output<typeof createStockCountSessionInputSchema>

export const submitStockCountLineInputSchema = z.object({
  lineId: requiredId.optional(),
  itemId: requiredId.optional(),
  countedQuantity: decimalInput,
  reasonCode: z.string().trim().optional(),
  evidenceHash: requiredId.optional(),
  metadata: z.unknown().optional(),
})

export const submitStockCountSessionInputSchema = z.object({
  organizationId: requiredId,
  countSessionId: requiredId,
  submittedById: requiredId,
  countSheetHash: requiredId,
  lines: z.array(submitStockCountLineInputSchema).min(1),
})

export type SubmitStockCountSessionInput = z.input<typeof submitStockCountSessionInputSchema>
export type ParsedSubmitStockCountSessionInput = z.output<typeof submitStockCountSessionInputSchema>

export const postStockCountInputSchema = z.object({
  organizationId: requiredId,
  countSessionId: requiredId,
  approvedById: requiredId,
  idempotencyKey: requiredId.optional(),
  occurredAt: z.date().optional(),
  countSheetHash: requiredId.optional(),
  correlationId: requiredId.optional(),
})

export type PostStockCountInput = z.input<typeof postStockCountInputSchema>
export type ParsedPostStockCountInput = z.output<typeof postStockCountInputSchema>

export const stockAdjustmentEvidenceInputSchema = z.object({
  evidenceHash: requiredId,
  value: positiveDecimalInput.optional(),
})
