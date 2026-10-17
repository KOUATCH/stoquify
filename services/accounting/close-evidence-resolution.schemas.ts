import { z } from "zod"

const id = z.string().trim().min(1).max(200), hash = z.string().regex(/^[a-f0-9]{64}$/)
export const proposeCloseHistorySchema = z.object({
  periodId: id, requestId: id, expectedRevision: hash, correlationId: id,
  selectedRequestId: id, selectedResponseId: id.nullable(), selectedAcceptanceId: id.nullable(),
  reason: z.string().trim().min(10).max(4000),
  exclusions: z.array(z.object({ id, reason: z.string().trim().min(10).max(2000) }).strict()).min(1).max(99),
}).strict()
export const approveCloseHistorySchema = z.object({ proposalId: id, correlationId: id, notes: z.string().trim().min(10).max(4000) }).strict()
export const closeHistoryDecisionSchema = z.object({ proposalId: id, correlationId: id, decision: z.enum(["WITHDRAWN", "REJECTED"]), reason: z.string().trim().min(10).max(4000) }).strict()
export const closeRecoveryCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("propose"), input: proposeCloseHistorySchema }).strict(),
  z.object({ kind: z.literal("approve"), input: approveCloseHistorySchema }).strict(),
  z.object({ kind: z.literal("close"), input: closeHistoryDecisionSchema }).strict(),
])
export type CloseRecoveryCommand = z.infer<typeof closeRecoveryCommandSchema>
