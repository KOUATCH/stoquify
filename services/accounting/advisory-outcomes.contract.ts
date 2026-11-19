import { z } from "zod"
import { WORKPAPER_KINDS, type ReviewWorkpaperBinder } from "./review-workpaper.contract"

const id = z.string().trim().min(1).max(160)
export const advisoryScopeSchema = z.object({ clientOrganizationId: id.optional(), periodId: id, engagementId: id }).strict()
export const advisoryListSchema = advisoryScopeSchema.omit({ engagementId: true })
export const advisoryNarrativeSchema = z.object({
  conclusions: z.array(z.object({ kind: z.enum(WORKPAPER_KINDS), text: z.string().trim().min(10).max(2000) }).strict()).min(1).max(4)
    .refine(rows => new Set(rows.map(row => row.kind)).size === rows.length, "Use one conclusion per schedule."),
  actions: z.array(z.object({ title: z.string().trim().min(10).max(500), ownerId: id,
    dueAt: z.string().datetime(), kind: z.enum(WORKPAPER_KINDS) }).strict()).min(1).max(10),
}).strict()
export const advisoryCommandSchema = advisoryScopeSchema.extend({
  command: z.enum(["DRAFT", "REVIEW", "CHANGES_REQUESTED", "AGREE", "DELIVER"]),
  expectedVersion: z.number().int().min(0), expectedSourceHash: id, expectedReviewHash: id,
  idempotencyKey: z.string().min(8).max(160), narrative: advisoryNarrativeSchema.optional(),
  privateNote: z.string().trim().max(2000).optional(), reason: z.string().trim().min(10).max(1000),
}).strict()
export const advisoryExportSchema = advisoryScopeSchema.extend({ revisionId: id, format: z.enum(["json", "csv", "pdf"]) }).strict()
export const advisoryMetricsSchema = z.object({
  cohort: z.array(advisoryScopeSchema).min(1).max(10), from: z.string().datetime(), to: z.string().datetime(),
}).strict().refine(value => new Date(value.to).getTime() > new Date(value.from).getTime() &&
  new Date(value.to).getTime() - new Date(value.from).getTime() <= 31 * 86400000, "Choose a window of at most 31 days.")
export type AdvisoryNarrative = z.infer<typeof advisoryNarrativeSchema>
export type AdvisoryState = "DRAFT" | "REVIEWED" | "CHANGES_REQUESTED" | "CLIENT_AGREED" | "DELIVERED"
export type AdvisoryDocument = {
  version: 1; engagementId: string; organizationId: string; periodId: string; periodStart: string; periodEnd: string;
  closeRunId: string; sourceHash: string; reviewHash: string; sourceRevision: string; observedAt: string;
  confidence: "REVIEWED_SUPPORT_NOT_AUDIT_OPINION"; limitations: string;
  observations: ReviewWorkpaperBinder["schedules"]; narrative: AdvisoryNarrative;
  preparedById: string; preparedAt: string; reviewedById: string | null; reviewedAt: string | null;
  agreedById: string | null; agreedAt: string | null; deliveredById: string | null; deliveredAt: string | null;
}
export const ADVISORY_LIMITATIONS = "Historical observations copied from independently reviewed workpapers, by account and currency. No forecast, FX aggregation, audit opinion or close certification. Client agreement confirms the listed actions; delivery means publication in the authenticated client workspace, not email receipt. Recheck current source freshness before relying on a retained export."
export type AdvisoryRevisionView = { id: string; version: number; state: AdvisoryState; actorId: string; createdAt: string;
  document: AdvisoryDocument; contentHash: string; freshness: "CURRENT" | "REVIEW_REQUIRED"; privateNote?: string }
export type AdvisoryWorkspace = { engagements: Array<{ id: string; label: string }>; firmView: boolean }
export type AdvisoryDesk = { sourceHash: string; reviewHash: string; workpaperState: string; latestVersion: number;
  revisions: AdvisoryRevisionView[]; owners: Array<{ id: string; name: string }>; firmView: boolean }

export type DurationMetric = { eligible: number; measured: number; missing: number; elapsedMs: number | null }
/** Elapsed time is not active work time. Null is retained when no valid pair exists. */
export function durationMetric(pairs: Array<[string | null, string | null]>): DurationMetric {
  const durations = pairs.flatMap(([start, end]) => {
    const a = start ? Date.parse(start) : NaN, b = end ? Date.parse(end) : NaN
    return Number.isFinite(a) && Number.isFinite(b) && b >= a ? [b - a] : []
  })
  return { eligible: pairs.length, measured: durations.length, missing: pairs.length - durations.length,
    elapsedMs: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null }
}
