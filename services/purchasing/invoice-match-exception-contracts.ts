import { z } from "zod"

const id = z.string().min(1).max(160)
export const invoiceMatchExceptionDraftSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("request"), invoiceId: id, reason: z.string().trim().min(3).max(500), evidenceReference: z.string().trim().min(8).max(500), expiresAt: z.string().datetime({ offset: true }) }).strict(),
  z.object({ kind: z.literal("review"), invoiceId: id, exceptionId: id, decision: z.enum(["APPROVE", "REJECT"]), decisionReason: z.string().trim().min(3).max(500).optional() }).strict(),
]).superRefine((v,c) => { if (v.kind === "review" && v.decision === "REJECT" && !v.decisionReason) c.addIssue({ code: z.ZodIssueCode.custom, message: "A rejection reason is required.", path: ["decisionReason"] }) })
export const invoiceMatchExceptionCommandSchema = z.object({ draft: invoiceMatchExceptionDraftSchema, expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), idempotencyKey: z.string().min(8).max(128) }).strict()
export const invoiceMatchExceptionQuerySchema = z.object({ kind: z.enum(["request", "review"]), search: z.string().trim().max(120).default(""), after: id.optional() }).strict()
export const invoiceMatchExceptionHistoryQuerySchema = z.object({ kind: z.enum(["request", "review"]), invoiceId: id, before: id.optional() }).strict()
export const invoiceMatchExceptionDecisionSchema = z.object({ organizationId: id, actorId: id, invoiceId: id, invoiceNumber: id, exceptionId: id, kind: z.enum(["request", "review"]), status: z.enum(["OPEN", "APPROVED", "REJECTED"]), requestReference: z.string().min(8).max(128), reviewedRevision: z.string().regex(/^[a-f0-9]{64}$/), recordedAt: z.string().datetime(), sourceEventId: id, sourceVerification: z.enum(["VERIFIED", "UNVERIFIED"]).optional(), expiresAt: z.string().datetime(), variance: z.string(), currency: z.string().length(3) }).strict().superRefine((v,c)=>{if(v.sourceVerification === "UNVERIFIED" && v.status !== "REJECTED")c.addIssue({code:z.ZodIssueCode.custom,message:"Unverified source cannot authorize an exception."});if((v.kind === "request") !== (v.status === "OPEN"))c.addIssue({code:z.ZodIssueCode.custom,message:"Operation and outcome disagree."})})
export type InvoiceMatchExceptionDraft = z.infer<typeof invoiceMatchExceptionDraftSchema>
export type InvoiceMatchExceptionCommand = z.infer<typeof invoiceMatchExceptionCommandSchema>
export type InvoiceMatchExceptionQuery = z.input<typeof invoiceMatchExceptionQuerySchema>
export type InvoiceMatchExceptionHistoryQuery = z.infer<typeof invoiceMatchExceptionHistoryQuerySchema>
export type InvoiceMatchExceptionDecision = z.infer<typeof invoiceMatchExceptionDecisionSchema>
