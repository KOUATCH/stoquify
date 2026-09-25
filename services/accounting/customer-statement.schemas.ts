import { z } from "zod"

const id = z.string().trim().min(1).max(191)
const boundedKey = z.string().trim().min(8).max(191)
const sha256Evidence = z.string().regex(/^sha256:[0-9a-f]{64}$/)

export const createCustomerStatementInputSchema = z.object({
  customerId: id,
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  currency: z.string().trim().min(3).max(3).transform((value) => value.toUpperCase()),
  idempotencyKey: boundedKey,
  correlationId: boundedKey,
})

export const queueCustomerStatementDeliveryInputSchema = z.object({
  statementSnapshotId: id,
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  destination: z.string().trim().min(3).max(254),
  consentBasis: z.enum(["EXPLICIT", "RECIPIENT_REQUESTED"]),
  consentEvidenceHash: sha256Evidence,
  consentCapturedAt: z.coerce.date(),
  allowDispute: z.boolean().optional(),
  allowPromiseToPay: z.boolean().optional(),
  locale: z.enum(["EN", "FR"]).optional(),
  tokenTtlSeconds: z.number().int().min(300).max(90 * 24 * 60 * 60).optional(),
  idempotencyKey: boundedKey,
  correlationId: boundedKey,
})

export const revokeCustomerStatementAccessInputSchema = z.object({
  tokenId: id,
  reason: z.string().trim().min(3).max(500),
})

export const retryCustomerStatementInputSchema = z.object({
  customerId: id, statementId: id, deliveryId: id,
  expectedRevision: z.string().regex(/^[0-9a-f]{64}$/),
  reason: z.string().trim().min(3).max(500), idempotencyKey: z.string().uuid(),
}).strict()
export type RetryCustomerStatementInput = z.infer<typeof retryCustomerStatementInputSchema>

export const statementRecipientCommandSchema = z.object({
  actionType: z.enum(["DISPUTE", "PROMISE_TO_PAY"]),
  customerReceivableDocumentId: id.nullable().optional().default(null),
  requestedAmount: z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/).refine(value => Number(value) > 0),
  promisedFor: z.string().max(40).refine(value => Number.isFinite(Date.parse(value))).nullable().optional().default(null),
  note: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().trim().min(8).max(160),
  correlationId: z.string().trim().min(8).max(160),
}).strict().superRefine((value, ctx) => {
  if (value.actionType === "DISPUTE" && (!value.customerReceivableDocumentId || value.promisedFor)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customerReceivableDocumentId"], message: "A dispute requires a document and no promise date" })
  }
  if (value.actionType === "PROMISE_TO_PAY" && !value.promisedFor) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["promisedFor"], message: "A promise requires a date" })
  }
})
export type StatementRecipientCommand = z.infer<typeof statementRecipientCommandSchema>
