import { z } from "zod"

const id = z.string().trim().min(1).max(191)
const revision = z.string().regex(/^sha256:[a-f0-9]{64}$/)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, "Choose a valid accounting date")

export const suspenseCorrectionDraftSchema = z.object({
  suspenseItemId: id, reason: z.string().trim().min(5).max(2000), reversalDate: date,
}).strict()
export const suspenseCorrectionProposalSchema = suspenseCorrectionDraftSchema.extend({
  expectedRevision: revision, idempotencyKey: z.string().uuid(),
}).strict()
export const suspenseCorrectionDecisionSchema = z.object({
  suspenseItemId: id, proposalId: id, expectedRevision: revision,
  decision: z.enum(["APPROVE", "REJECT"]), reason: z.string().trim().min(5).max(2000),
}).strict()
export type SuspenseCorrectionDraft = z.infer<typeof suspenseCorrectionDraftSchema>
export type SuspenseCorrectionProposal = z.infer<typeof suspenseCorrectionProposalSchema>
export type SuspenseCorrectionDecision = z.infer<typeof suspenseCorrectionDecisionSchema>
export const suspenseCorrectionReviewSchema = z.object({ suspenseItemId: id, proposalId: id }).strict()
export const suspenseCorrectionHistorySchema = z.object({
  suspenseItemId: id,
  cursor: z.object({ createdAt: z.string().datetime(), id }).strict().nullable().optional(),
}).strict()
export type SuspenseCorrectionHistoryInput = z.infer<typeof suspenseCorrectionHistorySchema>
export const suspenseCorrectionExportSchema = z.object({
  suspenseItemId: id, recordId: id, expectedRevision: revision, idempotencyKey: z.string().uuid(),
}).strict()
export type SuspenseCorrectionExportInput = z.infer<typeof suspenseCorrectionExportSchema>
