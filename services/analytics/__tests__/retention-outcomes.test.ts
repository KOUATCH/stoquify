import { projectRetentionOutcomes } from "../retention-outcomes"
import { commit, correction, outcomeWindow as scope } from "./retention-fixtures"

it("counts financial commit once across repeated reads and receipt completion", () => {
  const rows = [commit(), commit({ status: "COMPLETED" }), commit()]
  const result = projectRetentionOutcomes(scope, rows, [])
  expect(result.completedOperations).toBe(1)
  expect(result.diagnostics.duplicates).toBe(2)
  expect(result.outcomes[0]).toMatchObject({ operationId: "sale-1", outcome: "COMPLETED", evidenceQuality: "DURABLE_COMMIT" })
  expect(projectRetentionOutcomes(scope, [...rows].reverse(), [])).toEqual(result)
})
it("does not report claimed/uncertain work as completed or require receipt success", () => {
  const result = projectRetentionOutcomes(scope, [commit({ status: "CLAIMED", committedAt: null }), commit({ id: "ok", salesOrderId: "ok" })], [])
  expect(result.completedOperations).toBe(1)
  expect(result.diagnostics.unfinalized).toBe(1)
})
it.each([null, new Date("invalid")])("does not fabricate a missing/invalid commit time: %s", committedAt => {
  const result = projectRetentionOutcomes(scope, [commit({ committedAt })], [])
  expect(result.completedOperations).toBe(0); expect(result.diagnostics.invalid).toBe(1)
})
it("removes conflicting sale identities instead of selecting a convenient row", () => {
  const rows = [commit(), commit({ id: "other", locationId: "site-2" })]
  const result = projectRetentionOutcomes(scope, rows, [])
  expect(result.completedOperations).toBe(0); expect(result.diagnostics.conflictingOperations).toBe(1)
  expect(projectRetentionOutcomes(scope, rows.reverse(), [])).toEqual(result)
})
it.each([
  ["refund", correction()],
  ["void", correction({ eventType: "pos.sale.voided", sourceType: "POS_VOID" })],
])("retains the original completion and an explicit %s correction", (_name, row) => {
  const result = projectRetentionOutcomes(scope, [commit()], [row, row])
  expect(result.completedOperations).toBe(1); expect(result.correctionEvents).toBe(1)
  expect(result.outcomes.map(item => item.outcome)).toEqual(["COMPLETED", "REVERSED"])
})
it("shows a correction for an earlier sale without inventing an in-window completion", () => {
  const result = projectRetentionOutcomes(scope, [], [correction()])
  expect(result.completedOperations).toBe(0); expect(result.correctionEvents).toBe(1)
})
it("allows database transaction time to precede the application occurrence timestamp", () => {
  const result = projectRetentionOutcomes(scope, [], [correction({ recordedAt: new Date("2026-01-03T09:59:59Z") })])
  expect(result.correctionEvents).toBe(1)
})
it("removes conflicting correction records", () => {
  const result = projectRetentionOutcomes(scope, [], [correction(), correction({ sourceId: "other-sale" })])
  expect(result.correctionEvents).toBe(0); expect(result.diagnostics.conflictingOperations).toBe(1)
})
it.each([
  { eventType: "pos.sale.failed" }, { status: "FAILED" as const }, { status: "REJECTED" as const },
  { sourceType: "POS_SALE" as const }, { eventSource: "WORKER" as const }, { schemaVersion: 2 }, { sourceId: null },
])("does not promote unsupported correction evidence: %j", changes => {
  const result = projectRetentionOutcomes(scope, [], [correction(changes)])
  expect(result.correctionEvents).toBe(0); expect(result.diagnostics.invalid).toBe(1)
})
it("fails closed on cross-tenant commits and corrections, including mixed batches", () => {
  expect(() => projectRetentionOutcomes(scope, [commit(), commit({ organizationId: "foreign" })], [])).toThrow("authorized scope")
  expect(() => projectRetentionOutcomes(scope, [], [correction({ organizationId: "foreign" })])).toThrow("authorized scope")
})
it("fails closed on foreign locations in a narrowed scope", () => {
  expect(() => projectRetentionOutcomes({ ...scope, locationId: "site-2" }, [commit()], [])).toThrow("authorized scope")
  expect(() => projectRetentionOutcomes({ ...scope, locationId: "site-2" }, [], [correction()])).toThrow("authorized scope")
})
it("uses half-open time windows and excludes evidence recorded after as-of", () => {
  const result = projectRetentionOutcomes(scope, [commit({ committedAt: scope.endExclusive })], [correction({ recordedAt: new Date("2026-02-01") })])
  expect(result.outcomes).toEqual([])
})
it("never emits payloads, actor IDs, money or fabricated role/human attribution", () => {
  const row = { ...commit(), actorId: "private-person", resultEnvelope: { customer: "private-customer" } }
  const event = { ...correction(), payload: { providerSecret: "private-secret" } }
  const result = projectRetentionOutcomes(scope, [row], [event])
  expect(JSON.stringify(result)).not.toMatch(/private-|actorId|resultEnvelope|payload/)
  expect(result.outcomes.every(item => item.role === "UNKNOWN" && item.traffic === "UNKNOWN")).toBe(true)
  expect(result.humanAdoption).toEqual({ state: "UNKNOWN", eligibleCompletedOperations: null, unclassifiedCompletedOperations: 1 })
})
it("retains unknown adoption on an empty read instead of calling it churn", () => {
  const result = projectRetentionOutcomes(scope, [], [])
  expect(result.completedOperations).toBe(0); expect(result.humanAdoption.eligibleCompletedOperations).toBeNull()
  expect(result.coverage).toBe("SOURCE_ROWS_ONLY")
})
it.each([
  { start: new Date("invalid") }, { endExclusive: new Date("2026-03-01"), asOf: new Date("2026-04-01") },
  { endExclusive: scope.start }, { asOf: scope.start }, { organizationId: " " },
])("rejects invalid/unbounded windows: %j", changes => {
  expect(() => projectRetentionOutcomes({ ...scope, ...changes }, [], [])).toThrow("31 days")
})
