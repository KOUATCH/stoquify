import { z } from "zod"
import type { ScheduleBalances } from "./balance-sheet-contract"

export const WORKPAPER_KINDS = ["CASH", "RECEIVABLES", "PAYABLES", "INVENTORY"] as const
export type WorkpaperKind = typeof WORKPAPER_KINDS[number]
export const WORKPAPER_LIMIT = 50
const id = z.string().trim().min(1).max(200)
const hash = z.string().regex(/^sha256:[a-f0-9]{64}$/)
export const workpaperScopeSchema = z.object({ clientOrganizationId: id.optional(), periodId: id }).strict()
export const workpaperDecisionSchema = workpaperScopeSchema.extend({
  expectedSourceHash: hash, idempotencyKey: id,
  decision: z.enum(["PREPARED", "REVIEWED", "CHANGES_REQUESTED"]),
  preparationId: id.optional(), conclusion: z.string().trim().min(10).max(2000),
}).strict()
export const workpaperRollForwardSchema = workpaperScopeSchema.extend({ fromPeriodId: id, idempotencyKey: id }).strict()
export const workpaperExportSchema = workpaperScopeSchema.extend({
  expectedSourceHash: hash, expectedReviewHash: hash, idempotencyKey: id,
  format: z.enum(["json", "csv", "pdf"]),
}).strict()
export type WorkpaperAccount = {
  ledgerAccountId: string; accountCode: string; currency: string; kind: WorkpaperKind | null
  availability: "RECONCILED" | "UNAVAILABLE"; reason: string | null
  sourceRevision: string | null; sourceHash: string | null; evidenceId: string | null; evidenceHash: string | null
  approvedById: string | null; approvedAt: string | null
  balances: { ledger: ScheduleBalances; schedule: ScheduleBalances; differences: ScheduleBalances } | null
}
export type WorkpaperDecision = {
  id: string; actorId: string; at: string; sourceHash: string; decision: "PREPARED" | "REVIEWED" | "CHANGES_REQUESTED"
  preparationId: string | null; conclusion: string; current: boolean
}
export type ReviewWorkpaperBinder = {
  version: 1; organizationId: string; periodId: string; periodStart: string; periodEnd: string; closeRunId: string
  sourceRevision: string; sourceHash: string; reviewHash: string; observedAt: string
  classification: "DRAFT_WORKPAPERS_NOT_CERTIFIED"
  schedules: Array<{ kind: WorkpaperKind; availability: "RECONCILED" | "UNAVAILABLE"; accounts: WorkpaperAccount[] }>
  unclassifiedAccounts: WorkpaperAccount[]
  decisions: WorkpaperDecision[]; reviewState: "UNPREPARED" | "PREPARED" | "REVIEWED" | "CHANGES_REQUESTED" | "STALE"
  previousPeriods: Array<{ id: string; name: string }>
  rolledForwardFrom: string | null
}
export const WORKPAPER_LIMITATIONS = "Draft supporting workpapers only. No close certification, external approval or audit opinion. Each account/currency stands alone; no FX conversion or cross-currency total. Missing or changed support is unavailable, never zero. Cash support does not replace settlement reconciliation. Source item descriptions, customer/supplier details, free-text conclusions and attachments are excluded from exports; retained evidence IDs and hashes provide traceability."
