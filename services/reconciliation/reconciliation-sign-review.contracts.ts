import { z } from "zod"

export const reconciliationSignReviewSchema = z.object({ runId: z.string().trim().min(1).max(191) }).strict()
export const reconciliationReviewedSignSchema = reconciliationSignReviewSchema.extend({
  expectedSourceVersionHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  expectedEvidenceRevision: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  correlationId: z.string().uuid(),
}).strict()
export type ReconciliationReviewedSignCommand = z.infer<typeof reconciliationReviewedSignSchema>
