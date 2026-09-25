import { z } from "zod"
import { paymentRequestApprovalSchema } from "./payment-request-contracts"
export const paymentPostingRecoveryDraftSchema=z.object({paymentRequestId:paymentRequestApprovalSchema.shape.paymentRequestId}).strict()
export const paymentPostingRecoveryCommandSchema=paymentPostingRecoveryDraftSchema.extend({expectedRevision:paymentRequestApprovalSchema.shape.expectedRevision,idempotencyKey:paymentRequestApprovalSchema.shape.idempotencyKey}).strict()
export const paymentPostingRecoveryResultSchema=z.object({
  organizationId:z.string().min(1),actorId:z.string().min(1),paymentRequestId:z.string().min(1),paymentNumber:z.string().min(1),
  requestReference:z.string().min(1),reviewedRevision:z.string().regex(/^[a-f0-9]{64}$/),recordedAt:z.string().datetime(),
  executionEventId:z.string().min(1),postingBatchId:z.string().min(1),journalEntryId:z.string().min(1),accountingSourceLinkId:z.string().min(1),
  paymentTransactionId:z.string().min(1),resolvedExceptionId:z.string().min(1),nextExceptionId:z.string().min(1),
  total:z.string().regex(/^\d+\.\d{2}$/),currency:z.string().regex(/^[A-Z]{3}$/),ledgerStatus:z.literal("POSTED"),reconciliationStatus:z.literal("AWAITING_STATEMENT_MATCH"),
}).strict()
export type PaymentPostingRecoveryDraft=z.infer<typeof paymentPostingRecoveryDraftSchema>
export type PaymentPostingRecoveryCommand=z.infer<typeof paymentPostingRecoveryCommandSchema>
