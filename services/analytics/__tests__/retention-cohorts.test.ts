import { evaluateRetentionWindow, summarizeRetentionCohort } from "../retention-cohorts"
import { cohortObservation, establishedCohort, recentCohort } from "./retention-fixtures"

it.each([1, 4, 8, 12] as const)("computes explicit Week %i eligibility, coverage and repeated work", week => {
  const summary = summarizeRetentionCohort(establishedCohort(week))
  expect(summary).toMatchObject({ cohortSize: 5, eligible: 3, observed: 2, unknown: 1, excluded: 1, notScheduled: 1,
    immature: 0, repeated: week === 1 ? 2 : 1, noObservedRepeat: week === 1 ? 0 : 1,
    observedRepeatRate: week === 1 ? 1 : 0.5, missingObservationRate: 1 / 3 })
  expect(summary.rows[0].distinctCompletedOperations).toBe(1)
})
it.each([1, 4, 8, 12] as const)("keeps the recent cohort immature for Week %i even if an operation exists", week => {
  expect(summarizeRetentionCohort(recentCohort(week))).toMatchObject({ cohortSize: 1, immature: 1, eligible: 0,
    observedRepeatRate: null, missingObservationRate: null })
})
it.each(["DEMO", "TEST", "AUTOMATED"] as const)("excludes %s from human adoption", traffic => {
  expect(evaluateRetentionWindow(cohortObservation(1, { traffic }))).toMatchObject({ state: "EXCLUDED", distinctCompletedOperations: null })
})
it.each(["PARTIAL", "MISSING"] as const)("does not turn %s coverage into inactivity even with some events", coverage => {
  expect(evaluateRetentionWindow(cohortObservation(1, { coverage }))).toMatchObject({ state: "UNKNOWN", distinctCompletedOperations: null })
})
it("keeps unknown provenance and calendar unknown", () => {
  expect(evaluateRetentionWindow(cohortObservation(1, { traffic: "UNKNOWN" })).state).toBe("UNKNOWN")
  expect(evaluateRetentionWindow(cohortObservation(1, { scheduledTradingDays: null })).state).toBe("UNKNOWN")
})
it("does not infer activation from registration or sales", () => {
  expect(evaluateRetentionWindow(cohortObservation(1, { activatedAt: null })).state).toBe("NOT_ACTIVATED")
})
it("uses the exclusive end as the maturity boundary", () => {
  const row = cohortObservation(1)
  expect(evaluateRetentionWindow({ ...row, asOf: new Date(row.endExclusive.getTime() - 1) }).state).toBe("IMMATURE")
  expect(evaluateRetentionWindow({ ...row, asOf: row.endExclusive }).state).toBe("OBSERVED_REPEAT")
})
it("reports an observed zero without labelling churn", () => {
  expect(evaluateRetentionWindow(cohortObservation(4, { completedOperationIds: [] }))).toMatchObject({ state: "NO_OBSERVED_REPEAT", distinctCompletedOperations: 0 })
})
it("rejects duplicate organizations and mixed week denominators", () => {
  expect(() => summarizeRetentionCohort([cohortObservation(1), cohortObservation(1)])).toThrow("one observation")
  expect(() => summarizeRetentionCohort([cohortObservation(1), cohortObservation(4, { organizationId: "other" })])).toThrow("one retention week")
})
it("has no rate for an empty cohort", () => {
  expect(summarizeRetentionCohort([])).toMatchObject({ cohortSize: 0, eligible: 0, observedRepeatRate: null })
})
it.each([{ scheduledTradingDays: -1 }, { scheduledTradingDays: 8 }, { start: new Date("invalid") }, { completedOperationIds: [" "] }])("rejects invalid evidence: %j", changes => {
  expect(() => evaluateRetentionWindow(cohortObservation(1, changes))).toThrow("Invalid retention")
})
