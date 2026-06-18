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
  occurredAt: z.date().optional(),
  actorId: z.string().trim().min(1).optional(),
  locationId: z.string().trim().min(1).optional(),
  registerId: z.string().trim().min(1).optional(),
  deviceId: z.string().trim().min(1).optional(),
  sourceType: z.string().trim().min(1).optional(),
  sourceId: z.string().trim().min(1).optional(),
  postingBatchId: z.string().trim().min(1).optional(),
  documentHash: z.string().trim().min(1).optional(),
  metadata: z.unknown().optional(),
  outboxMessages: z.array(businessOutboxMessageInputSchema).default([]),
})

export type RecordBusinessEventInput = z.input<typeof recordBusinessEventInputSchema>
export type ParsedRecordBusinessEventInput = z.output<typeof recordBusinessEventInputSchema>

