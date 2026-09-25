/** @jest-environment node */
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getPaymentReconciliationSummary } from "../payment-reconciliation-summary.service"
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
const tx = { providerAccount: { groupBy: jest.fn() }, reconciliationRun: { groupBy: jest.fn() }, suspenseItem: { groupBy: jest.fn() }, paymentException: { groupBy: jest.fn() }, providerEvent: { count: jest.fn() }, statementLine: { count: jest.fn() } }
const count = (status: string, value: number) => ({ status, _count: { _all: value } })
beforeEach(() => {
  jest.clearAllMocks(); (db.$transaction as jest.Mock).mockImplementation(work => work(tx))
  tx.providerAccount.groupBy.mockResolvedValue([count("ACTIVE", 31), count("SUSPENDED", 5)])
  tx.reconciliationRun.groupBy.mockResolvedValue([count("SIGNED", 20)])
  tx.suspenseItem.groupBy.mockResolvedValue([]); tx.paymentException.groupBy.mockResolvedValue([])
  tx.providerEvent.count.mockResolvedValue(40); tx.statementLine.count.mockResolvedValue(12)
})
it("uses whole-tenant aggregates with one consistent snapshot and no page limits", async () => {
  tx.suspenseItem.groupBy.mockResolvedValue([{ currencyCode: "XAF", _count: { _all: 31 }, _sum: { amount: new Prisma.Decimal("3100.25") } }, { currencyCode: "USD", _count: { _all: 2 }, _sum: { amount: new Prisma.Decimal("50.12") } }])
  const result = await getPaymentReconciliationSummary("org-1")
  expect(result.summary).toMatchObject({ providerAccountCount: 36, activeProviderAccountCount: 31, signedRunCount: 20, openSuspenseCount: 33, openSuspenseByCurrency: [{ currencyCode: "XAF", count: 31, amount: "3100.25" }, { currencyCode: "USD", count: 2, amount: "50.12" }] })
  expect(result.summary).not.toHaveProperty("openSuspenseAmount")
  expect(result.certificationStatus).toBe("NEEDS_REVIEW")
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  for (const table of Object.values(tx)) { const fn = "groupBy" in table ? table.groupBy : table.count; expect(fn).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) })); expect(fn.mock.calls[0][0]).not.toHaveProperty("take") }
})
it.each(["DRAFT", "RUNNING", "FAILED", "BLOCKED", "NEEDS_REVIEW"])("does not let signed runs hide %s work", async status => {
  tx.reconciliationRun.groupBy.mockResolvedValue([count("SIGNED", 20), count(status, 1)])
  expect((await getPaymentReconciliationSummary("org-1")).certificationStatus).toBe("NEEDS_REVIEW")
})
it("counts all open exceptions and unsigned runs as review signals, without claiming distinct cases", async () => {
  tx.reconciliationRun.groupBy.mockResolvedValue([count("SIGNED", 20), count("READY_FOR_SIGNOFF", 4), count("VOIDED", 5)])
  tx.paymentException.groupBy.mockResolvedValue([{ type: "AMOUNT_MISMATCH", severity: "MEDIUM", _count: { _all: 6 } }])
  const result = await getPaymentReconciliationSummary("org-1")
  expect(result.summary).toMatchObject({ closeBlockerCount: 10, pendingRunCount: 4, openExceptionCount: 6, criticalExceptionCount: 0 })
  expect(result.certificationStatus).toBe("NEEDS_REVIEW")
})
it("distinguishes awaiting sign-off, retained signed runs, evidence and empty state", async () => {
  tx.reconciliationRun.groupBy.mockResolvedValue([count("SIGNED", 20), count("READY_FOR_SIGNOFF", 1)])
  expect((await getPaymentReconciliationSummary("org-1")).certificationStatus).toBe("READY_FOR_SIGNOFF")
  tx.reconciliationRun.groupBy.mockResolvedValue([count("SIGNED", 20)])
  expect((await getPaymentReconciliationSummary("org-1")).certificationStatus).toBe("SIGNED")
  tx.reconciliationRun.groupBy.mockResolvedValue([])
  expect((await getPaymentReconciliationSummary("org-1")).certificationStatus).toBe("READY_FOR_RUN")
  tx.providerEvent.count.mockResolvedValue(0); tx.statementLine.count.mockResolvedValue(0)
  expect((await getPaymentReconciliationSummary("org-1")).certificationStatus).toBe("NO_EVIDENCE")
})
it("preserves Decimal precision and rejects query failure instead of returning zero", async () => {
  tx.suspenseItem.groupBy.mockResolvedValue([{ currencyCode: "XAF", _count: { _all: 200000 }, _sum: { amount: new Prisma.Decimal("9007199254740993.25") } }])
  expect((await getPaymentReconciliationSummary("org-1")).summary.openSuspenseByCurrency[0].amount).toBe("9007199254740993.25")
  tx.suspenseItem.groupBy.mockRejectedValue(new Error("database unavailable"))
  await expect(getPaymentReconciliationSummary("org-1")).rejects.toThrow("database unavailable")
})
it("rejects missing organization before any query", async () => {
  await expect(getPaymentReconciliationSummary("")).rejects.toMatchObject({ code: "TENANT_SCOPE_VIOLATION" })
  expect(db.$transaction).not.toHaveBeenCalled()
})
