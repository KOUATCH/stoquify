import type { OutcomeWindow, RetentionCommit, RetentionCorrection } from "../retention-outcomes"
import type { RetentionWeek, RetentionWindowObservation } from "../retention-cohorts"

export const outcomeWindow: OutcomeWindow = {
  organizationId: "synthetic-org-a", start: new Date("2026-01-01T00:00:00Z"),
  endExclusive: new Date("2026-01-08T00:00:00Z"), asOf: new Date("2026-01-10T00:00:00Z"),
}
export const commit = (changes: Partial<RetentionCommit> = {}): RetentionCommit => ({
  id: "commit-1", organizationId: "synthetic-org-a", locationId: "site-1", salesOrderId: "sale-1",
  status: "COMMITTED", createdAt: new Date("2026-01-02T10:00:00Z"), committedAt: new Date("2026-01-02T10:00:01Z"), ...changes,
})
export const correction = (changes: Partial<RetentionCorrection> = {}): RetentionCorrection => ({
  id: "correction-1", organizationId: "synthetic-org-a", locationId: "site-1", sourceId: "sale-1",
  eventType: "pos.refund.issued", sourceType: "POS_REFUND", eventSource: "POS", schemaVersion: 1, status: "RECORDED",
  occurredAt: new Date("2026-01-03T10:00:00Z"), recordedAt: new Date("2026-01-03T10:00:00Z"), ...changes,
})

const day = (offset: number) => new Date(Date.UTC(2026, 0, 1 + offset))
export function cohortObservation(week: RetentionWeek, changes: Partial<RetentionWindowObservation> = {}): RetentionWindowObservation {
  return { organizationId: "synthetic-a", activatedAt: day(0), week, start: day((week - 1) * 7), endExclusive: day(week * 7),
    asOf: day(84), traffic: "HUMAN", scheduledTradingDays: 5, coverage: "COMPLETE", completedOperationIds: [`synthetic-sale-week-${week}`], ...changes }
}
// Established cohort: A repeats in every target week, B only Week 1, C has missing
// telemetry. D is a demo; E is closed all week. A separate recent cohort is immature.
export function establishedCohort(week: RetentionWeek) {
  return [
    cohortObservation(week, { organizationId: "synthetic-a", completedOperationIds: [`a-sale-week-${week}`, `a-sale-week-${week}`] }),
    cohortObservation(week, { organizationId: "synthetic-b", completedOperationIds: week === 1 ? ["b-sale"] : [] }),
    cohortObservation(week, { organizationId: "synthetic-c", coverage: "MISSING", completedOperationIds: [] }),
    cohortObservation(week, { organizationId: "synthetic-d", traffic: "DEMO" }),
    cohortObservation(week, { organizationId: "synthetic-e", scheduledTradingDays: 0, completedOperationIds: [] }),
  ]
}
export function recentCohort(week: RetentionWeek) {
  return [cohortObservation(week, { organizationId: "synthetic-recent", activatedAt: day(80), start: day(80 + (week - 1) * 7), endExclusive: day(80 + week * 7) })]
}
