import { z } from "zod"
export { suspenseCorrectionExportSchema as suspenseResolutionExportSchema } from "./payment-suspense-correction.contracts"

const id = z.string().trim().min(1).max(191)
export const suspenseResolutionDraftSchema = z.object({
  suspenseItemId: id,
  clearingJournalId: id,
  outcome: z.enum(["RESOLVED", "WRITTEN_OFF"]),
  reason: z.string().trim().min(5).max(2000),
}).strict()
export type SuspenseResolutionDraft = z.infer<typeof suspenseResolutionDraftSchema>

export const suspenseResolutionProposalSchema = suspenseResolutionDraftSchema.extend({
  expectedRevision: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  idempotencyKey: z.string().uuid(),
}).strict()
export type SuspenseResolutionProposal = z.infer<typeof suspenseResolutionProposalSchema>

export const suspenseResolutionDecisionSchema = z.object({
  suspenseItemId: id, proposalId: id,
  expectedRevision: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().min(5).max(2000),
}).strict()
export type SuspenseResolutionDecision = z.infer<typeof suspenseResolutionDecisionSchema>

export const suspenseResolutionClearingKey = (journalId: string) => `suspense-resolution-clearing:${journalId}`
