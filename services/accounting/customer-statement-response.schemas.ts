import { z } from "zod"

const id = z.string().trim().min(1).max(191)
export const statementResponseListSchema = z.object({
  customerId: id, cursor: id.optional(), reference: id.optional(),
  limit: z.number().int().min(1).max(25).default(10),
}).strict()
export const statementResponseHistorySchema = z.object({
  customerId: id, actionId: id, beforeVersion: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(25).default(10),
}).strict()
export const statementResponseReviewSchema = z.object({
  customerId: id, actionId: id,
  outcome: z.enum(["ACKNOWLEDGED", "RESOLVED", "REJECTED", "CANCELLED"]),
  expectedStateHash: z.string().regex(/^[a-f0-9]{64}$/),
  reason: z.string().trim().min(3).max(1000),
  requestId: z.string().uuid(),
}).strict()
export type StatementResponseReview = z.infer<typeof statementResponseReviewSchema>
