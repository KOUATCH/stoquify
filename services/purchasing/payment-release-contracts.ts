import { z } from "zod"
import { paymentRequestApprovalSchema } from "./payment-request-contracts"
export const paymentReleaseDraftSchema = z.object({
  paymentRequestId: paymentRequestApprovalSchema.shape.paymentRequestId,
  executionReference: z.string().trim().min(3).max(191),
  executedAt: z.string().datetime({ offset: true }),
  evidenceUri: z.string().trim().max(1000).url().refine(value => /^https?:\/\//i.test(value)),
  evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()
export const paymentReleaseCommandSchema = z.object({ draft: paymentReleaseDraftSchema, expectedRevision: paymentRequestApprovalSchema.shape.expectedRevision, idempotencyKey: paymentRequestApprovalSchema.shape.idempotencyKey }).strict()
export const paymentReleaseQueueQuerySchema = z.object({ search: z.string().trim().max(120).default(""), after: paymentRequestApprovalSchema.shape.paymentRequestId.optional() }).strict()
export type PaymentReleaseDraft = z.infer<typeof paymentReleaseDraftSchema>
export type PaymentReleaseCommand = z.infer<typeof paymentReleaseCommandSchema>
export type PaymentReleaseQueueQuery = z.input<typeof paymentReleaseQueueQuerySchema>
