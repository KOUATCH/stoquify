import { z } from "zod"
import { statementResponseReviewSchema, type StatementResponseReview } from "@/services/accounting/customer-statement-response.schemas"

export type StatementReviewScope = { organizationId: string; actorId: string; customerId: string }
const draftSchema = z.object({
  actionId: z.string().min(1).max(191), expectedStateHash: z.string().regex(/^[a-f0-9]{64}$/),
  outcome: z.enum(["ACKNOWLEDGED", "RESOLVED", "REJECTED", "CANCELLED"]), reason: z.string().max(1000),
}).strict()
const storedSchema = z.object({
  version: z.literal(1), organizationId: z.string(), actorId: z.string(), customerId: z.string(),
  draft: draftSchema.nullable(), command: statementResponseReviewSchema.nullable(),
}).strict()
export type StatementReviewDraft = z.infer<typeof draftSchema>
export type RetainedStatementReview = { draft: StatementReviewDraft | null; command: StatementResponseReview | null }
const key = (scope: StatementReviewScope) => `statement-response-review:v1:${encodeURIComponent(scope.organizationId)}:${encodeURIComponent(scope.actorId)}:${encodeURIComponent(scope.customerId)}`
export function readStatementReview(storage: Pick<Storage, "getItem">, scope: StatementReviewScope): RetainedStatementReview {
  const raw = storage.getItem(key(scope))
  if (!raw) return { draft: null, command: null }
  if (raw.length > 10000) throw new Error("Review recovery record is invalid")
  const value = storedSchema.parse(JSON.parse(raw))
  if (value.organizationId !== scope.organizationId || value.actorId !== scope.actorId || value.customerId !== scope.customerId || (value.command && value.command.customerId !== scope.customerId)) throw new Error("Review recovery scope mismatch")
  return { draft: value.command ? { actionId: value.command.actionId, expectedStateHash: value.command.expectedStateHash, outcome: value.command.outcome, reason: value.command.reason } : value.draft, command: value.command }
}
export function saveStatementReview(storage: Pick<Storage, "setItem" | "removeItem">, scope: StatementReviewScope, value: RetainedStatementReview) {
  if (!value.draft && !value.command) { storage.removeItem(key(scope)); return }
  storage.setItem(key(scope), JSON.stringify(storedSchema.parse({ version: 1, ...scope, ...value })))
}
