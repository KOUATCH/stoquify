import { currentPracticeRecords, summarizePractice, practiceCommandSchema, practiceReadSchema, type PracticeRecord, type PracticePayload } from "../firm-practice.contract"
const row = (recordKey: string, payload: PracticePayload, version = 1, extras: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id: recordKey + version, recordKey, version, payload, subjectUserId: payload.kind === "PLAN" ? payload.assigneeId : payload.kind === "EFFORT" ? "alice" : null,
  actorId: "alice", recordedById: "alice", reviewedById: null, operation: "SAVE", reason: "Synthetic explanation", createdAt: "2026-09-01T00:00:00Z", ...extras })
it("keeps missing plans and effort unknown, but explicit zero remains zero", () => {
  const result = summarizePractice([row("plan:alice", { kind: "PLAN", assigneeId: "alice", minutes: 0 }),
    row("effort:1", { kind: "EFFORT", minutes: 0, workDate: "2026-09-01", advisoryRevisionId: null, reviewDecisionId: null })], ["alice", "bob"])
  expect(result.allocation[0]).toMatchObject({ plannedMinutes: 0, recordedMinutes: 0, effortVarianceMinutes: 0, recordingCoverage: "PARTIAL_DECLARATIONS" })
  expect(result.allocation[1]).toMatchObject({ plannedMinutes: null, recordedMinutes: null, effortVarianceMinutes: null, recordingCoverage: "UNKNOWN" })
})
it("counts only effective revisions, retains corrections and independent review attribution", () => {
  const payload = { kind: "EFFORT" as const, minutes: 120, workDate: "2026-09-01", advisoryRevisionId: null, reviewDecisionId: null }
  const rows = [row("effort:1", payload), row("effort:1", { ...payload, minutes: 180 }, 2), row("effort:1", { ...payload, minutes: 180 }, 3, { operation: "REVIEW", actorId: "bob", reviewedById: "bob" })]
  expect(currentPracticeRecords(rows)).toHaveLength(1)
  expect(summarizePractice(rows, ["alice"])).toMatchObject({ corrections: 1, allocation: [{ recordedMinutes: 180, reviewedDeclarations: 1 }] })
})
it("keeps unassigned work and negative remaining budgets visible without inventing capacity", () => {
  const result = summarizePractice([row("plan:unassigned", { kind: "PLAN", assigneeId: null, minutes: 240 }),
    row("plan:alice", { kind: "PLAN", assigneeId: "alice", minutes: 60 }), row("effort:1", { kind: "EFFORT", minutes: 90, workDate: "2026-09-01", advisoryRevisionId: null, reviewDecisionId: null })], ["alice"])
  expect(result.plannedSubtotalMinutes).toBe(300)
  expect(result.allocation.find(r => r.assigneeId === "alice")?.effortVarianceMinutes).toBe(30)
  expect(result.allocation.find(r => r.assigneeId === null)).toMatchObject({ plannedMinutes: 240, recordedMinutes: null })
})
it("calculates exact same-currency planning ratios and never supplies profit or actual fee variance", () => {
  const result = summarizePractice([row("plan:alice", { kind: "PLAN", assigneeId: "alice", minutes: 240 }),
    row("fee:XAF", { kind: "FEE", currency: "XAF", amount: "100.10" }), row("fee:EUR", { kind: "FEE", currency: "EUR", amount: "200.20" })], ["alice"])
  expect(result.economics).toEqual([{ currency: "EUR", feeBudget: "200.20", feePerPlannedHour: "50.05", actualFeeVariance: null, profitability: null },
    { currency: "XAF", feeBudget: "100.10", feePerPlannedHour: "25.03", actualFeeVariance: null, profitability: null }])
})
it.each([null, 0])("does not divide by a missing or zero plan (%s)", value => {
  const rows = [row("fee:XAF", { kind: "FEE", currency: "XAF", amount: "100.00" })]
  if (value !== null) rows.push(row("plan:alice", { kind: "PLAN", assigneeId: "alice", minutes: value }))
  expect(summarizePractice(rows, []).economics[0].feePerPlannedHour).toBeNull()
})
it("bounds explicit cohorts and rejects unknown command/authority fields", () => {
  expect(practiceReadSchema.safeParse({ cohort: [] }).success).toBe(false)
  expect(practiceReadSchema.safeParse({ cohort: Array(11).fill({ clientOrganizationId: "c", periodId: "p", engagementId: "e" }) }).success).toBe(false)
  const input = { clientOrganizationId: "c", periodId: "p", engagementId: "e", recordKey: "fee:XAF", command: "SAVE", expectedVersion: 0,
    idempotencyKey: "synthetic-key", reason: "Synthetic budget", payload: { kind: "FEE", currency: "XAF", amount: "1.00" } }
  expect(practiceCommandSchema.safeParse(input).success).toBe(true)
  expect(practiceCommandSchema.safeParse({ ...input, actorId: "other" }).success).toBe(false)
  expect(practiceCommandSchema.safeParse({ ...input, payload: { ...input.payload, amount: "-1.00" } }).success).toBe(false)
  expect(practiceCommandSchema.safeParse({ ...input, payload: { ...input.payload, currency: "ZZZ" } }).success).toBe(false)
})
