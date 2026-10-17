import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"
import { getPaymentCloseEvidence } from "../payment-close-evidence.service"
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
const period = { id: "sep", startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30T23:59:59.999Z") }
const cutoff = new Date("2026-10-05T12:00:00Z")
const scope = createCloseControlScope("org-a", period, cutoff)
const tx = {
  providerAccount: { findMany: jest.fn() },
  accountingPeriod: { findFirst: jest.fn() }, reconciliationRun: { findMany: jest.fn() },
  suspenseItem: { findMany: jest.fn(), count: jest.fn() }, paymentException: { groupBy: jest.fn(), count: jest.fn() },
  providerEvent: { count: jest.fn() }, statementLine: { count: jest.fn() },
}
beforeEach(() => {
  jest.clearAllMocks(); (db.$transaction as jest.Mock).mockImplementation(work => work(tx))
  tx.accountingPeriod.findFirst.mockResolvedValue(period)
  tx.providerAccount.findMany.mockResolvedValue([])
  tx.reconciliationRun.findMany.mockResolvedValue([]); tx.suspenseItem.findMany.mockResolvedValue([])
  tx.paymentException.groupBy.mockResolvedValue([])
  for (const fn of [tx.suspenseItem.count, tx.paymentException.count, tx.providerEvent.count, tx.statementLine.count]) fn.mockResolvedValue(0)
})
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
  tx.reconciliationRun.findMany.mockResolvedValue(Array.from({ length: 27 }, (_, i) => ({ id: `r${i}`, businessDate: period.startDate, status: "SIGNED", signedAt: cutoff, certificateHash: `h${i}` })))
  tx.suspenseItem.findMany.mockResolvedValue(["USD", "XAF"].map(currencyCode => ({ id: currencyCode, type: "UNMATCHED_PAYMENT", amount: new Prisma.Decimal("20.15"), currencyCode, status: "OPEN", slaDeadline: null, correlationId: null })))
  const result = await getPaymentCloseEvidence(scope)
  expect(result.summary).toMatchObject({ signedRunCount: 27, openSuspenseCount: 2 })
  expect(result.recentRuns).toHaveLength(27)
  expect(result.suspenseQueue.map(row => row.currencyCode)).toEqual(["USD", "XAF"])
  expect(tx.reconciliationRun.findMany.mock.calls[0][0]).not.toHaveProperty("take")
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
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
