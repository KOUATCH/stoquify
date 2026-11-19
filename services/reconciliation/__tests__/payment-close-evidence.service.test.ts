import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"
import { getPaymentCloseEvidence } from "../payment-close-evidence.service"
import { buildReconciliationEvidenceManifestInTx, stableReconciliationEvidenceStringify } from "../payment-reconciliation-evidence.service"
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../payment-reconciliation-evidence.service", () => ({
  ...jest.requireActual("../payment-reconciliation-evidence.service"),
  buildReconciliationEvidenceManifestInTx: jest.fn(),
}))
const period = { id: "sep", startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30T23:59:59.999Z") }
const cutoff = new Date("2026-10-05T12:00:00Z")
const scope = createCloseControlScope("org-a", period, cutoff)
const tx = {
  providerAccount: { findMany: jest.fn() },
  accountingPeriod: { findFirst: jest.fn() }, reconciliationRun: { findMany: jest.fn() },
  suspenseItem: { findMany: jest.fn(), count: jest.fn() }, paymentException: { groupBy: jest.fn(), count: jest.fn() },
  providerEvent: { count: jest.fn() }, statementLine: { count: jest.fn(), findMany: jest.fn() },
  statementFile: { findMany: jest.fn() }, reconciliationNoActivityEvidence: { findMany: jest.fn() },
  paymentTransaction: { count: jest.fn() },
}
beforeEach(() => {
  jest.clearAllMocks(); (db.$transaction as jest.Mock).mockImplementation(work => work(tx))
  tx.accountingPeriod.findFirst.mockResolvedValue(period)
  tx.providerAccount.findMany.mockResolvedValue([])
  tx.reconciliationRun.findMany.mockResolvedValue([]); tx.suspenseItem.findMany.mockResolvedValue([])
  tx.paymentException.groupBy.mockResolvedValue([])
  tx.statementFile.findMany.mockResolvedValue([{ id: "statement", fileHash: "statement-hash", periodStart: period.startDate, periodEnd: period.endDate }])
  tx.statementLine.findMany.mockResolvedValue([{ currencyCode: "XAF" }])
  tx.reconciliationNoActivityEvidence.findMany.mockResolvedValue([])
  for (const fn of [tx.suspenseItem.count, tx.paymentException.count, tx.providerEvent.count, tx.statementLine.count, tx.paymentTransaction.count]) fn.mockResolvedValue(0)
  jest.mocked(buildReconciliationEvidenceManifestInTx).mockResolvedValue({ sourceHash: "current-source" } as never)
})

function signedRun(id: string) {
  const certificatePayload = { evidence: { sourceHash: "current-source" } }
  return { id, businessDate: period.startDate, status: "SIGNED", signedAt: cutoff,
    certificatePayload, certificateHash: createHash("sha256").update(stableReconciliationEvidenceStringify(certificatePayload)).digest("hex"),
    periodStart: period.startDate, periodEnd: new Date(+period.endDate + 1), accountingPeriodId: period.id }
}

function arrangeAccountRuns(runs: object[], collectedRuns = runs) {
  tx.providerAccount.findMany.mockResolvedValue([{ id: "account-a", displayName: "Cash rail", currencyCode: "XAF", status: "ACTIVE", settlementLagDays: 0, metadata: {} }])
  tx.reconciliationRun.findMany.mockImplementation(({ where }) => Promise.resolve(where.providerAccountId === "account-a" ? runs : collectedRuns))
}
it("rejects another tenant's period before reading financial evidence", async () => {
  tx.accountingPeriod.findFirst.mockResolvedValue(null)
  await expect(getPaymentCloseEvidence(scope)).rejects.toThrow("not found")
  expect(tx.accountingPeriod.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-a", id: "sep" } }))
  expect(tx.reconciliationRun.findMany).not.toHaveBeenCalled()
})
it("rejects changed dates or a forged scope hash", async () => {
  await expect(getPaymentCloseEvidence({ ...scope, scopeHash: "forged" })).rejects.toThrow("changed")
  tx.accountingPeriod.findFirst.mockResolvedValue({ ...period, endDate: new Date("2026-10-01") })
  await expect(getPaymentCloseEvidence(scope)).rejects.toThrow("conflict")
})
it("counts the full population beyond dashboard limits and does not net currencies", async () => {
  arrangeAccountRuns(Array.from({ length: 27 }, (_, i) => signedRun(`r${i}`)))
  tx.suspenseItem.findMany.mockResolvedValue(["USD", "XAF"].map(currencyCode => ({ id: currencyCode, type: "UNMATCHED_PAYMENT", amount: new Prisma.Decimal("20.15"), currencyCode, status: "OPEN", slaDeadline: null, correlationId: null })))
  const result = await getPaymentCloseEvidence(scope)
  expect(result.summary).toMatchObject({ signedRunCount: 27, openSuspenseCount: 2 })
  expect(result.recentRuns).toHaveLength(27)
  expect(result.suspenseQueue.map(row => row.currencyCode)).toEqual(["USD", "XAF"])
  expect(tx.reconciliationRun.findMany.mock.calls[0][0]).not.toHaveProperty("take")
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  expect(result.accountCoverage.accounts[0].signedRuns).toHaveLength(27)
  expect(result.recentRuns[0]).toMatchObject({ signedAt: cutoff.toISOString(), certificateHash: signedRun("r0").certificateHash })
})
it.each<{ label: string; fields: Record<string, unknown>; stale?: boolean }>([
  { label: "stale source", fields: {}, stale: true },
  { label: "tampered certificate", fields: { certificateHash: "a".repeat(64) } },
  { label: "missing certificate hash", fields: { certificateHash: null } },
  { label: "missing certificate payload", fields: { certificatePayload: null } },
])("keeps $label pending without positive current-proof fields", async ({ fields, stale }) => {
  arrangeAccountRuns([{ ...signedRun("unverified"), ...fields }])
  if (stale) jest.mocked(buildReconciliationEvidenceManifestInTx).mockResolvedValue({ sourceHash: "changed-source" } as never)
  const result = await getPaymentCloseEvidence(scope)
  expect(result.accountCoverage.accounts[0].signedRuns).toEqual([])
  expect(result.summary).toMatchObject({ signedRunCount: 0, pendingRunCount: 1 })
  expect(result.recentRuns[0]).toMatchObject({ signedAt: null, certificateHash: null })
})
it("does not promote a signed run absent from validated account coverage", async () => {
  tx.reconciliationRun.findMany.mockResolvedValue([signedRun("uncovered")])
  const result = await getPaymentCloseEvidence(scope)
  expect(result.accountCoverage.accounts).toEqual([])
  expect(result.summary).toMatchObject({ signedRunCount: 0, pendingRunCount: 1 })
  expect(result.recentRuns[0]).toMatchObject({ signedAt: null, certificateHash: null })
})
it("requires the collected certificate hash to match the validated run", async () => {
  const run = signedRun("mismatch")
  arrangeAccountRuns([run], [{ ...run, certificateHash: "different-certificate" }])
  const result = await getPaymentCloseEvidence(scope)
  expect(result.accountCoverage.accounts[0].signedRuns).toEqual([{ id: run.id, hash: run.certificateHash }])
  expect(result.summary).toMatchObject({ signedRunCount: 0, pendingRunCount: 1 })
  expect(result.recentRuns[0]).toMatchObject({ signedAt: null, certificateHash: null })
})
it("does not count voided runs as pending or expose their former signature", async () => {
  arrangeAccountRuns([{ ...signedRun("voided"), status: "VOIDED" }])
  const result = await getPaymentCloseEvidence(scope)
  expect(result.summary).toMatchObject({ signedRunCount: 0, pendingRunCount: 0 })
  expect(result.recentRuns[0]).toMatchObject({ signedAt: null, certificateHash: null })
})
it("does not treat a signature recorded after the cutoff as close evidence", async () => {
  tx.reconciliationRun.findMany.mockResolvedValue([{ id: "late", businessDate: period.startDate, status: "SIGNED", signedAt: new Date(cutoff.getTime() + 1), certificateHash: "late" }])
  const result = await getPaymentCloseEvidence(scope)
  expect(result.summary).toMatchObject({ signedRunCount: 0, pendingRunCount: 1 })
  expect(result.recentRuns[0]).toMatchObject({ signedAt: null, certificateHash: null })
})
it("retains a period-assigned run with an inconsistent economic date as a blocker", async () => {
  tx.reconciliationRun.findMany.mockResolvedValue([{ id: "wrong-date", businessDate: new Date("2026-10-02"), status: "SIGNED", signedAt: cutoff, certificateHash: "wrong" }])
  expect((await getPaymentCloseEvidence(scope)).summary).toMatchObject({ signedRunCount: 0, pendingRunCount: 1 })
})
it("keeps unassigned controls explicit and fails closed on collector errors", async () => {
  tx.suspenseItem.count.mockResolvedValue(2)
  expect((await getPaymentCloseEvidence(scope)).organizationControls).toMatchObject({ unassignedSuspense: 2 })
  tx.statementLine.count.mockRejectedValue(new Error("read failed"))
  await expect(getPaymentCloseEvidence(scope)).rejects.toThrow("read failed")
})
