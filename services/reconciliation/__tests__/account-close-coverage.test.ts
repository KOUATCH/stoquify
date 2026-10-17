import { coverageGaps, eligibleNoActivity, noActivityEvidenceHash } from "../account-close-coverage"
import { readAccountCloseCoverage } from "../account-close-coverage.service"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"
const start = new Date("2026-09-01"), end = new Date("2026-09-30T23:59:59.999Z"), cutoff = new Date("2026-10-06")
const scope = createCloseControlScope("org", { id: "sep", startDate: start, endDate: end }, cutoff)
const payload = { organizationId: "org", providerAccountId: "a", periodId: "sep", periodStart: start, periodEnd: end, currencyCode: "XAF", sourceReference: "retained-document:zero-statement", sourceDocumentHash: "sha256:" + "a".repeat(64), reason: "External statement confirms no activity", proposedById: "preparer" }
const evidence = { ...payload, id: "proof", evidenceHash: noActivityEvidenceHash(payload), idempotencyKey: "key", createdAt: new Date("2026-10-01"), status: "APPROVED", approvedById: "reviewer", approvedAt: new Date("2026-10-02"), revokedAt: null, revokedById: null, revocationReason: null }
const eligibility = { organizationId: "org", providerAccountId: "a", periodId: "sep", start, end, cutoff, currencyCode: "XAF", activityCount: 0, obligationCount: 0 }

it("unions overlapping/adjacent intervals without losing a single millisecond gap", () => {
  expect(coverageGaps(0, 9, [{ start: 5, end: 9 }, { start: 0, end: 4 }])).toEqual([])
  expect(coverageGaps(0, 9, [{ start: 0, end: 3 }, { start: 5, end: 9 }])).toEqual([{ start: new Date(4).toISOString(), end: new Date(4).toISOString() }])
  expect(coverageGaps(0, 9, [{ start: 3, end: 2 }])).toHaveLength(1)
})
it("requires independently approved, hash-bound evidence", () => {
  expect(eligibleNoActivity(evidence, eligibility)).toBe(true)
  for (const change of [{ status: "PROPOSED" }, { approvedById: "preparer" }, { approvedAt: new Date(+cutoff + 1) }, { status: "REVOKED", revokedAt: cutoff }, { reason: "Changed supporting rationale" }, { sourceReference: "" }, { currencyCode: "USD" }, { organizationId: "foreign" }, { periodEnd: new Date(+end - 1) }]) {
    expect(eligibleNoActivity({ ...evidence, ...change }, eligibility)).toBe(false)
  }
  expect(eligibleNoActivity(evidence, { ...eligibility, activityCount: 1 })).toBe(false)
  expect(eligibleNoActivity(evidence, { ...eligibility, obligationCount: 1 })).toBe(false)
})

function fixture() {
  const tx = {
    accountingPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "sep", startDate: start, endDate: end }) },
    providerAccount: { findMany: jest.fn().mockResolvedValue(["a", "b"].map(id => ({ id, displayName: id, currencyCode: "XAF", status: "ARCHIVED", settlementLagDays: 2, metadata: { statementCadenceDays: 7 } }))) },
    statementFile: { findMany: jest.fn().mockImplementation(({ where }) => Promise.resolve(where.providerAccountId === "a" ? [{ id: "statement", fileHash: "source-hash", periodStart: start, periodEnd: end }] : [])) },
    reconciliationRun: { findMany: jest.fn().mockImplementation(({ where }) => Promise.resolve(where.providerAccountId === "a" ? [{ id: "run", status: "SIGNED", signedAt: cutoff, certificateHash: "signed-hash", periodStart: start, periodEnd: new Date(+end + 1), businessDate: start, accountingPeriodId: "sep" }] : [])) },
    reconciliationNoActivityEvidence: { findMany: jest.fn().mockResolvedValue([]) },
    providerEvent: { count: jest.fn().mockResolvedValue(0) }, paymentTransaction: { count: jest.fn().mockResolvedValue(0) },
    statementLine: { findMany: jest.fn().mockImplementation(({ where }) => Promise.resolve(where.providerAccountId === "a" ? [{ currencyCode: "XAF" }] : [])) },
    suspenseItem: { count: jest.fn().mockResolvedValue(0) }, paymentException: { count: jest.fn().mockResolvedValue(0) },
  }
  return tx
}
it("one reconciled account cannot mask another account, including archived accounts", async () => {
  const tx = fixture()
  const result = await readAccountCloseCoverage(tx as any, scope)
  expect(result).toMatchObject({ requiredAccountCount: 2, coveredAccountCount: 1, blockedAccountCount: 1 })
  expect(result.accounts[0].status).toBe("RECONCILED")
  expect(result.accounts[1].reasons).toEqual(["MISSING_STATEMENT", "MISSING_SIGNOFF", "NO_ACTIVITY_EVIDENCE_REQUIRED"])
  expect(tx.providerAccount.findMany.mock.calls[0][0].where).not.toHaveProperty("status")
  expect(result.accounts[0]).toMatchObject({ cadenceDays: 7, settlementLagDays: 2, overdue: false })
})
it("requires complete statement and daily signoff coverage, regardless of settlement grace", async () => {
  const tx = fixture()
  tx.reconciliationRun.findMany.mockResolvedValue([{ id: "day", status: "SIGNED", signedAt: cutoff, certificateHash: "h", periodStart: start, periodEnd: new Date(+start + 86400000), businessDate: start, accountingPeriodId: "sep" }])
  tx.statementFile.findMany.mockResolvedValue([{ id: "s", fileHash: "h", periodStart: start, periodEnd: new Date(+start + 86400000 - 1) }])
  const row = (await readAccountCloseCoverage(tx as any, scope)).accounts[0]
  expect(row.reasons).toEqual(["PARTIAL_STATEMENT", "PARTIAL_SIGNOFF"])
  expect(row.signoffGaps[0]).toEqual({ start: "2026-09-02T00:00:00.000Z", end: end.toISOString() })
})
it("allows explicit no-activity proof, but rejects late activity and open obligations", async () => {
  const tx = fixture()
  const proofB = { ...evidence, providerAccountId: "b" }; proofB.evidenceHash = noActivityEvidenceHash(proofB)
  tx.reconciliationNoActivityEvidence.findMany.mockResolvedValue([proofB])
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[1].status).toBe("NO_ACTIVITY_APPROVED")
  tx.providerEvent.count.mockResolvedValue(1)
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[1].status).toBe("BLOCKED")
  tx.providerEvent.count.mockResolvedValue(0); tx.suspenseItem.count.mockResolvedValue(1)
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[1].reasons).toContain("OPEN_OBLIGATIONS")
})
it("does not infer no activity from empty signed runs, empty statements, or no accounts", async () => {
  const tx = fixture(); tx.statementLine.findMany.mockResolvedValue([])
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[0].reasons).toEqual(["NO_ACTIVITY_EVIDENCE_REQUIRED"])
  tx.providerAccount.findMany.mockResolvedValue([])
  expect(await readAccountCloseCoverage(tx as any, scope)).toMatchObject({ requiredAccountCount: 0, coveredAccountCount: 0, accounts: [] })
})
it("fails closed on currency mismatch, source failure, and foreign period", async () => {
  const tx = fixture(); tx.statementLine.findMany.mockResolvedValue([{ currencyCode: "USD" }])
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[0].reasons).toContain("CURRENCY_MISMATCH")
  tx.statementFile.findMany.mockRejectedValue(new Error("unavailable"))
  await expect(readAccountCloseCoverage(tx as any, scope)).rejects.toThrow("unavailable")
  tx.accountingPeriod.findFirst.mockResolvedValue(null)
  await expect(readAccountCloseCoverage(tx as any, scope)).rejects.toThrow("scope")
})
