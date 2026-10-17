jest.mock("server-only", () => ({}))
jest.mock("../payment-reconciliation-evidence", () => ({ readCurrentPaymentReconciliationEvidenceInTx: jest.fn() }))
import { Prisma } from "@prisma/client"
import { readCurrentPaymentReconciliationEvidenceInTx } from "../payment-reconciliation-evidence"
import { readSupplierPaymentReconciliationProofsInTx } from "../payment-reconciliation-proof-summary"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"

const tx = { paymentException: { findMany: jest.fn() }, paymentTransaction: { findMany: jest.fn() } }
const terminal = { id: "original", sourceId: "payment", paymentTransactionId: "transaction" }
const proof = { paymentRequestId: "payment", exceptionId: "original", status: "CASH_REVIEWED", kind: "CASH_VOUCHER", decisionId: "decision", decisionHash: "hash", proposalId: "proposal", proposalHash: "proposal-hash", recordedAt: "2026-10-01T10:00:00Z" }
const read = () => readSupplierPaymentReconciliationProofsInTx(tx as unknown as Prisma.TransactionClient, "org")
beforeEach(() => {
  jest.resetAllMocks()
  tx.paymentException.findMany.mockResolvedValue([])
  tx.paymentTransaction.findMany.mockResolvedValue([])
  jest.mocked(readCurrentPaymentReconciliationEvidenceInTx).mockResolvedValue(proof as never)
})
it("returns an actual empty observation and scopes both queries to the tenant", async () => {
  await expect(read()).resolves.toEqual([])
  expect(tx.paymentException.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", sourceType: "SUPPLIER_PAYMENT" }) }))
  expect(tx.paymentTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org" }) }))
})
it("retains exact independently validated decision hashes for Close export", async () => {
  tx.paymentException.findMany.mockResolvedValue([terminal])
  await expect(read()).resolves.toEqual([proof])
  expect(readCurrentPaymentReconciliationEvidenceInTx).toHaveBeenCalledWith(tx, "org", "payment")
})
it("fails closed when a current receipt was recorded after the close cutoff", async () => {
  tx.paymentException.findMany.mockResolvedValue([terminal])
  const scope = createCloseControlScope("org", { id: "sep", startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30T23:59:59.999Z") }, new Date("2026-10-01T09:00:00Z"))
  await expect(readSupplierPaymentReconciliationProofsInTx(tx as unknown as Prisma.TransactionClient, "org", scope)).rejects.toThrow("cutoff")
  expect(tx.paymentTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ createdAt: { lte: new Date(scope.recordedThrough) } }) }))
})
it.each([null, { ...proof, exceptionId: "other" }])("refuses terminal status without the exact original proof (%s)", async value => {
  tx.paymentException.findMany.mockResolvedValue([terminal])
  jest.mocked(readCurrentPaymentReconciliationEvidenceInTx).mockResolvedValue(value as never)
  await expect(read()).rejects.toThrow(/original exception/)
})
it("does not reinterpret a failed source lookup as zero rows", async () => {
  tx.paymentException.findMany.mockRejectedValue(new Error("database unavailable"))
  await expect(read()).rejects.toThrow("database unavailable")
})
it("rejects a confirmed payment whose original obligation was deleted", async () => {
  tx.paymentTransaction.findMany.mockResolvedValue([{ id: "transaction", sourceId: "payment", paymentExceptions: [] }])
  await expect(read()).rejects.toThrow(/original reconciliation obligation/)
})
it("keeps an admitted bank payment open until actual matching completes", async () => {
  tx.paymentTransaction.findMany.mockResolvedValue([{ id: "transaction", sourceId: "payment", paymentExceptions: [{ ...terminal, organizationId: "org", sourceType: "SUPPLIER_PAYMENT", type: "MISSING_STATEMENT_LINE", status: "OPEN" }] }])
  await expect(read()).resolves.toEqual([])
  expect(readCurrentPaymentReconciliationEvidenceInTx).not.toHaveBeenCalled()
})
it("rejects foreign-tenant related obligations", async () => {
  tx.paymentTransaction.findMany.mockResolvedValue([{ id: "transaction", sourceId: "payment", paymentExceptions: [{ ...terminal, organizationId: "foreign", sourceType: "SUPPLIER_PAYMENT", type: "MISSING_STATEMENT_LINE", status: "RESOLVED" }] }])
  await expect(read()).rejects.toThrow(/original reconciliation obligation/)
})
