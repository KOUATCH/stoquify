import { z } from "zod"
import { openingScopeSchema } from "./opening-position.contract"

const key = z.string().trim().min(8).max(100)
const id = z.string().trim().min(1).max(150)
export const approveOpeningSchema = openingScopeSchema.extend({
  revisionId: id, expectedDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  conclusion: z.string().trim().min(10).max(2000), idempotencyKey: key,
}).strict()
export const applyOpeningSchema = openingScopeSchema.extend({
  executionId: id, idempotencyKey: key, confirmFinancialApply: z.literal(true),
}).strict()
export const cancelOpeningSchema = openingScopeSchema.extend({
  executionId: id, reason: z.string().trim().min(10).max(2000),
}).strict()
export type OpeningCutoverWorkspace = {
  organizationId: string; clientOperator: boolean;
  executions: Array<{
    id: string; revisionId: string; status: string; manifestDigest: string; approvedById: string;
    approvedAt: string; expiresAt: string; appliedAt: string | null; periodId: string; periodVersion: number;
    reconciliation: unknown; reconciliationHash: string | null; cancellationReason: string | null;
    operations: Array<{ domain: string; sourceId: string; receiptHash: string }>;
  }>;
}
