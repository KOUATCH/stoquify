import { z } from "zod"

const id = z.string().trim().min(1).max(191)
export const reconciliationPreparationReadSchema = z.object({ runId: id }).strict()
export const reconciliationPreparationSchema = reconciliationPreparationReadSchema.extend({
  reason: z.string().trim().min(5).max(2000),
  expectedRevision: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  idempotencyKey: z.string().uuid(),
}).strict()
export type ReconciliationPreparationCommand = z.infer<typeof reconciliationPreparationSchema>
const cursor = z.object({ id, createdAt: z.string().datetime() }).strict().nullable().optional()
export const reconciliationPreparationQuerySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("runs"), search: z.string().trim().max(100).default(""), view: z.enum(["REVIEW", "ALL"]).default("REVIEW"), cursor }).strict(),
  z.object({ kind: z.literal("history"), runId: id, cursor }).strict(),
])
export type ReconciliationPreparationQuery = z.infer<typeof reconciliationPreparationQuerySchema>
