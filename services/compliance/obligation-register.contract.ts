import { z } from "zod"

export const obligationCodes = ["CLOSE_EVIDENCE_COLLECTION", "CM_VAT_MONTHLY", "CM_CNPS_EVIDENCE"] as const
export const obligationScopeSchema = z.object({ clientOrganizationId: z.string().trim().min(1).max(160).optional(), includePayroll: z.boolean().default(false) }).strict()
const id = z.string().trim().min(1).max(160)
export const obligationCommandSchema = z.object({
  clientOrganizationId: id.optional(), command: z.enum(["SAVE", "REVIEW", "RETURN"]),
  instanceId: id.optional(), expectedVersion: z.number().int().min(0),
  code: z.enum(obligationCodes), periodId: id,
  applicability: z.enum(["UNKNOWN", "APPLICABLE", "NOT_APPLICABLE"]),
  dueAt: z.string().datetime().nullable(), claimOwnership: z.boolean().default(false),
  evidenceId: id.nullable(), reason: z.string().trim().min(10).max(600),
  expectedSourceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  idempotencyKey: z.string().trim().min(8).max(160),
}).strict()
export type ObligationCode = typeof obligationCodes[number]
export type ObligationCommand = z.infer<typeof obligationCommandSchema>
export type ObligationSource = {
  code: ObligationCode; countryCode: string; classification: "OPERATIONAL" | "REGULATORY_REVIEW_REQUIRED";
  sourceVersion: string; sourceHash: string; effectiveFrom: string | null; effectiveTo: string | null;
  sourceCheckedOn: string | null; refreshBy: string | null; officialSources: { url: string; retrievedOn: string }[];
  qualifiedReview: null; statutoryVerified: false; coverage: "OPERATIONAL" | "UNREVIEWED" | "EXPIRED" | "UNSUPPORTED";
}
export type ObligationItem = {
  instanceId: string; version: number; code: ObligationCode; periodId: string; ownerId: string;
  applicability: ObligationCommand["applicability"]; dueAt: string | null;
  status: "UNKNOWN" | "NOT_APPLICABLE" | "OPEN" | "OVERDUE" | "FULFILLED_WITH_EVIDENCE";
  deadlineState: "UNSCHEDULED" | "DUE" | "OVERDUE"; sourceChanged: boolean; evidenceChanged: boolean;
  source: ObligationSource; retainedSourceVersion: string; decision: string; evidenceId: string | null;
  evidenceClass: "NONE" | "CLOSE_PACK" | "MANUAL_SUBMISSION" | "MANUAL_ACKNOWLEDGEMENT" | "SANDBOX" | "UNVERIFIED_AUTHORITY" | "REDACTED";
  liveFilingAccepted: false; payrollRedacted: boolean;
  history: { version: number; actorId: string; at: string; reason: string; decision: string; sourceVersion: string; dueAt: string | null; applicability: string }[];
}
export type ObligationRegister = {
  observedAt: string; clientOrganizationId: string; actorId: string; countryCode: string;
  sources: ObligationSource[]; periods: { id: string; name: string }[]; items: ObligationItem[];
  evidence: { id: string; code: ObligationCode; periodId: string; label: string }[];
  payrollIncluded: boolean; limit: number;
}
