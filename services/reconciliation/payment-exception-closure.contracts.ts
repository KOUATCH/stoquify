import { z } from "zod"

const id = z.string().trim().min(1).max(191)
const revision = z.string().regex(/^sha256:[a-f0-9]{64}$/)
export const exceptionClosureReadSchema = z.object({ exceptionId: id, purpose: z.literal("REOPEN_SOURCE").optional() }).strict()
const cursor = z.object({ createdAt: z.string().datetime(), id }).strict().nullable().optional()
export const exceptionClosureCasesSchema = z.object({ view: z.enum(["OPEN", "ALL"]).default("OPEN"), suspenseItemId: id.optional(), cursor }).strict()
export const exceptionClosureHistorySchema = exceptionClosureReadSchema.extend({ cursor }).strict()
export const exceptionClosureReviewSchema = exceptionClosureReadSchema.extend({ proposalId: id }).strict()
export const exceptionClosureProposalSchema = exceptionClosureReadSchema.extend({ reason: z.string().trim().min(5).max(2000), expectedRevision: revision, idempotencyKey: z.string().uuid() }).strict()
export const exceptionClosureDecisionSchema = z.object({ exceptionId: id, proposalId: id, expectedRevision: revision, decision: z.enum(["APPROVE", "REJECT"]), reason: z.string().trim().min(5).max(2000) }).strict()
export type ExceptionClosureProposal = z.infer<typeof exceptionClosureProposalSchema>
export type ExceptionClosureDecision = z.infer<typeof exceptionClosureDecisionSchema>
