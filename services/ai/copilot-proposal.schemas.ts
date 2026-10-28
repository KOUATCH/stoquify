import { z } from "zod"

export const COPILOT_PROPOSAL_TYPES = [
  "NAVIGATE_TO_WORKFLOW",
  "PREPARE_REVIEW_CHECKLIST",
  "REQUEST_HUMAN_REVIEW",
] as const

export const copilotEvidenceRefSchema = z
  .object({
    id: z.string().trim().min(1).max(180),
    subjectType: z.string().trim().min(1).max(120),
    subjectId: z.string().trim().min(1).max(240),
    sourceModule: z.string().trim().min(1).max(80),
    sourceHash: z.string().trim().max(180).nullable(),
    evidenceGrade: z.enum([
      "raw",
      "operational",
      "posted",
      "reconciled",
      "certified",
      "blocked",
    ]),
    freshness: z.enum([
      "fresh",
      "stale",
      "partial",
      "blocked",
      "failed",
      "empty",
      "unknown",
    ]),
    available: z.boolean(),
  })
  .strict()

export const createCopilotProposalSchema = z
  .object({
    runId: z.string().cuid(),
    proposalType: z.enum(COPILOT_PROPOSAL_TYPES),
    targetRoute: z.string().trim().startsWith("/dashboard/").max(300),
    requiredPermission: z.string().trim().min(1).max(120),
    title: z.string().trim().min(3).max(180),
    detail: z.string().trim().min(3).max(500),
    evidence: z.array(copilotEvidenceRefSchema).min(1).max(12),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    asOf: z.coerce.date(),
    expiresAt: z.coerce.date(),
    idempotencyKey: z
      .string()
      .trim()
      .min(8)
      .max(191)
      .regex(/^[a-zA-Z0-9:_-]+$/),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.periodEnd < value.periodStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodEnd"],
        message: "periodEnd must not precede periodStart",
      })
    }
    if (value.expiresAt <= value.asOf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "expiresAt must be later than asOf",
      })
    }
  })

export const decideCopilotProposalSchema = z
  .object({
    proposalId: z.string().cuid(),
    decision: z.enum(["ACCEPTED", "REJECTED"]),
    reason: z.string().trim().min(5).max(500),
  })
  .strict()

export const listCopilotProposalsSchema = z
  .object({
    status: z
      .enum(["DRAFT", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"])
      .optional(),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict()

export type CreateCopilotProposalInput = z.infer<
  typeof createCopilotProposalSchema
>
export type DecideCopilotProposalInput = z.infer<
  typeof decideCopilotProposalSchema
>
