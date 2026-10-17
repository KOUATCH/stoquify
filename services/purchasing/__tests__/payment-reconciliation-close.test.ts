jest.mock("server-only", () => ({}))
jest.mock("@/services/accounting/accounting-period-catalog.service", () => ({ lockAccountingPeriodCatalogInTx: jest.fn() }))
jest.mock("@/services/accounting/close-assessment-order.service", () => ({ lockCloseAssessmentPeriodsInTx: jest.fn() }))
jest.mock("@/services/accounting/close-assurance-pack.service", () => ({ recordCloseCertificationInvalidationsForSourceInTx: jest.fn() }))
import { Prisma } from "@prisma/client"
import { lockAccountingPeriodCatalogInTx } from "@/services/accounting/accounting-period-catalog.service"
import { lockCloseAssessmentPeriodsInTx } from "@/services/accounting/close-assessment-order.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { lockPaymentReconciliationCloseScopeInTx, invalidatePaymentReconciliationCloseScopeInTx } from "../payment-reconciliation-close"

const tx = { $queryRaw: jest.fn(), accountingPeriod: { findMany: jest.fn() } }
const client = tx as unknown as Prisma.TransactionClient
beforeEach(() => { jest.resetAllMocks(); tx.$queryRaw.mockResolvedValue([{ level: "read committed" }]); tx.accountingPeriod.findMany.mockResolvedValue([{ id: "early" }, { id: "later" }]) })
it("holds catalogue membership before discovering all periods consumed by global payment evidence", async () => {
  await expect(lockPaymentReconciliationCloseScopeInTx(client, "org")).resolves.toEqual(["early", "later"])
  expect(lockAccountingPeriodCatalogInTx).toHaveBeenCalledWith(tx, "org", "shared")
  expect(tx.accountingPeriod.findMany).toHaveBeenCalledWith({ where: { organizationId: "org" }, select: { id: true }, orderBy: { id: "asc" } })
  expect(jest.mocked(lockAccountingPeriodCatalogInTx).mock.invocationCallOrder[0]).toBeLessThan(tx.accountingPeriod.findMany.mock.invocationCallOrder[0])
  expect(tx.accountingPeriod.findMany.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(lockCloseAssessmentPeriodsInTx).mock.invocationCallOrder[0])
  expect(lockCloseAssessmentPeriodsInTx).toHaveBeenCalledWith(tx, "org", ["early", "later"])
})
it("refuses a snapshot that cannot observe assessments committed during its wait", async () => {
  tx.$queryRaw.mockResolvedValue([{ level: "serializable" }])
  await expect(lockPaymentReconciliationCloseScopeInTx(client, "org")).rejects.toThrow(/current committed/)
  expect(lockAccountingPeriodCatalogInTx).not.toHaveBeenCalled()
})
it("records supplier provenance and the exact prelocked scope bound to the retained decision hash", async () => {
  const receiptHash = "a".repeat(64)
  await invalidatePaymentReconciliationCloseScopeInTx(client, "org", { paymentRequestId: "payment", actorId: "reviewer", affectedPeriodIds: ["early", "later"], receiptId: "decision", receiptHash })
  expect(recordCloseCertificationInvalidationsForSourceInTx).toHaveBeenCalledWith(tx, "org", expect.objectContaining({ sourceCode: "SUPPLIER_PAYMENT_RECONCILIATION_REVIEWED", sourceId: "payment", periodIds: ["early", "later"], correlationId: "decision" }), { actorId: "reviewer" })
  expect(jest.mocked(recordCloseCertificationInvalidationsForSourceInTx).mock.calls[0][2]).toHaveProperty("newEvidenceHash", receiptHash)
  await invalidatePaymentReconciliationCloseScopeInTx(client, "org", { paymentRequestId: "payment", actorId: "reviewer", affectedPeriodIds: ["early", "later"], receiptId: "withdrawal", receiptHash: "b".repeat(64) })
  expect(jest.mocked(recordCloseCertificationInvalidationsForSourceInTx).mock.calls[1][2]).toHaveProperty("newEvidenceHash", "b".repeat(64))
})
