import { AccountingSourceType } from "@prisma/client"
import { z } from "zod"

export const businessEventSourceSchema = z.enum([
  "INTERNAL",
  "API",
  "POS",
  "OFFLINE_POS",
  "PROVIDER_WEBHOOK",
  "IMPORT",
  "WORKER",
  "SYSTEM",
])

export const businessOutboxChannelSchema = z.enum([
  "NOTIFICATION",
  "EMAIL",
  "WEBHOOK",
  "AUTHORITY_SUBMISSION",
  "RECEIPT_PRINT",
  "SYNC_ACK",
  "FISCALIZATION",
  "REPORT_EXPORT",
])

export const businessEventStatusSchema = z.enum([
  "RECORDED",
  "APPLIED",
  "REJECTED",
  "COMPENSATED",
  "FAILED",
])

export const businessOutboxMessageInputSchema = z.object({
  channel: businessOutboxChannelSchema,
  eventName: z.string().trim().min(1),
  destination: z.string().trim().min(1).optional(),
  idempotencyKey: z.string().trim().min(1).optional(),
  payload: z.unknown(),
  availableAt: z.date().optional(),
  maxAttempts: z.number().int().positive().max(25).optional(),
  metadata: z.unknown().optional(),
})

export const recordBusinessEventInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  eventType: z.string().trim().min(1),
  eventSource: businessEventSourceSchema.default("INTERNAL"),
  schemaVersion: z.number().int().positive().default(1),
  idempotencyKey: z.string().trim().min(1),
  payload: z.unknown(),
  payloadHash: z.string().trim().min(1).optional(),
  correlationId: z.string().trim().min(1).optional(),
  occurredAt: z.date().optional(),
  actorId: z.string().trim().min(1).optional(),
  locationId: z.string().trim().min(1).optional(),
  registerId: z.string().trim().min(1).optional(),
  deviceId: z.string().trim().min(1).optional(),
  // Accounting classifications and non-accounting entity names are separate contracts.
  sourceType: z.nativeEnum(AccountingSourceType).optional(),
  sourceEntityType: z.string().trim().min(1).max(128).optional(),
  sourceId: z.string().trim().min(1).optional(),
  postingBatchId: z.string().trim().min(1).optional(),
  documentHash: z.string().trim().min(1).optional(),
  metadata: z.unknown().optional(),
  outboxMessages: z.array(businessOutboxMessageInputSchema).default([]),
}).superRefine((input, ctx) => {
  if (!input.sourceEntityType || input.metadata == null) return
  if (
    typeof input.metadata !== "object" ||
    Array.isArray(input.metadata) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(input.metadata))
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata"], message: "Domain source metadata must be an object." })
    return
  }
  const existing = (input.metadata as Record<string, unknown>).sourceEntityType
  if (existing !== undefined && existing !== input.sourceEntityType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata"], message: "Domain source metadata conflicts with sourceEntityType." })
  }
})

export type RecordBusinessEventInput = z.input<typeof recordBusinessEventInputSchema>
export type ParsedRecordBusinessEventInput = z.output<typeof recordBusinessEventInputSchema>
