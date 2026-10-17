export const RETENTION_COHORT_VERSION = "core-work-week-v1" as const
export type RetentionWeek = 1 | 4 | 8 | 12
export type RetentionWindowObservation = {
  organizationId: string
  activatedAt: Date | null
  week: RetentionWeek
  // Calendar-resolved bounds supplied by the reviewed organization calendar.
  start: Date
  endExclusive: Date
  asOf: Date
  traffic: "HUMAN" | "DEMO" | "TEST" | "AUTOMATED" | "UNKNOWN"
  scheduledTradingDays: number | null
  coverage: "COMPLETE" | "PARTIAL" | "MISSING"
  completedOperationIds: readonly string[]
}
export type RetentionWindowState = "NOT_ACTIVATED" | "EXCLUDED" | "IMMATURE" | "NOT_SCHEDULED" | "UNKNOWN" | "OBSERVED_REPEAT" | "NO_OBSERVED_REPEAT"

/** This consumes qualified human outcomes, never raw page visits or unclassified
 * sales. Window maturity/coverage are independent of whether an event was seen. */
export function evaluateRetentionWindow(input: RetentionWindowObservation): { version: typeof RETENTION_COHORT_VERSION; organizationId: string; week: RetentionWeek; state: RetentionWindowState; distinctCompletedOperations: number | null } {
  const dates = [input.start, input.endExclusive, input.asOf, ...(input.activatedAt ? [input.activatedAt] : [])]
  if (!input.organizationId.trim() || ![1, 4, 8, 12].includes(input.week) ||
      dates.some(date => !(date instanceof Date) || !Number.isFinite(date.getTime())) || input.endExclusive <= input.start ||
      (input.activatedAt && input.start < input.activatedAt) ||
      (input.scheduledTradingDays !== null && (!Number.isInteger(input.scheduledTradingDays) || input.scheduledTradingDays < 0 || input.scheduledTradingDays > 7)) ||
      input.completedOperationIds.some(id => !id.trim())) throw new Error("Invalid retention observation.")
  let state: RetentionWindowState
  if (["DEMO", "TEST", "AUTOMATED"].includes(input.traffic)) state = "EXCLUDED"
  else if (!input.activatedAt) state = "NOT_ACTIVATED"
  else if (input.asOf < input.endExclusive) state = "IMMATURE"
  else if (input.scheduledTradingDays === 0) state = "NOT_SCHEDULED"
  else if (input.traffic !== "HUMAN" || input.scheduledTradingDays === null || input.coverage !== "COMPLETE") state = "UNKNOWN"
  else state = input.completedOperationIds.length ? "OBSERVED_REPEAT" : "NO_OBSERVED_REPEAT"
  return { version: RETENTION_COHORT_VERSION, organizationId: input.organizationId, week: input.week, state,
    distinctCompletedOperations: state === "OBSERVED_REPEAT" || state === "NO_OBSERVED_REPEAT" ? new Set(input.completedOperationIds).size : null }
}

/** One segment/activation cohort and one week per call. Unknown observations are
 * visible in the eligible denominator, never silently called inactivity/churn. */
export function summarizeRetentionCohort(observations: readonly RetentionWindowObservation[]) {
  if (new Set(observations.map(row => row.organizationId)).size !== observations.length || new Set(observations.map(row => row.week)).size > 1) {
    throw new Error("Use one observation per organization and one retention week.")
  }
  const rows = observations.map(evaluateRetentionWindow)
  const count = (state: RetentionWindowState) => rows.filter(row => row.state === state).length
  const repeated = count("OBSERVED_REPEAT"), noObservedRepeat = count("NO_OBSERVED_REPEAT"), unknown = count("UNKNOWN")
  const observed = repeated + noObservedRepeat
  return { version: RETENTION_COHORT_VERSION, cohortSize: rows.length, eligible: observed + unknown,
    observed, repeated, noObservedRepeat, unknown, immature: count("IMMATURE"), excluded: count("EXCLUDED"),
    notActivated: count("NOT_ACTIVATED"), notScheduled: count("NOT_SCHEDULED"),
    observedRepeatRate: observed ? repeated / observed : null,
    missingObservationRate: observed + unknown ? unknown / (observed + unknown) : null, rows }
}
