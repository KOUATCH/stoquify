import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { runPaymentReconciliation } from "../payment-reconciliation-run.service"

jest.mock("@/services/modules/module-admission.service", () => ({ assertModuleNewWorkInTx: jest.fn() }))
jest.mock("@/services/reconciliation/payment-reconciliation-notifications", () => ({ publishPaymentReconciliationNotification: jest.fn() }))
jest.mock("@/prisma/db", () => ({ db: {
  $transaction: jest.fn(),
  providerAccount: { findFirst: jest.fn() },
  reconciliationRun: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  paymentTransaction: { findMany: jest.fn() }, providerEvent: { findMany: jest.fn() },
  statementLine: { findMany: jest.fn() }, matchRecord: { create: jest.fn(), findMany: jest.fn() },
  paymentException: { create: jest.fn(), update: jest.fn() }, suspenseItem: { create: jest.fn() },
} }))
const mocks = db as unknown as Record<string, Record<string, jest.Mock>> & { $transaction: jest.Mock }
const amount = (value: string | number) => new Prisma.Decimal(value)
const payment = (id = "p1", extra = {}) => ({ id, amount: amount("100.25"), currencyCode: "XAF", providerTransactionId: `txn-${id}`, providerReference: `ref-${id}`, direction: "INBOUND", state: "CONFIRMED", ...extra })
const event = (id = "e1", extra = {}) => ({ id, providerEventId: id, providerTransactionId: "txn-p1", providerReference: "ref-p1", amount: amount("100.25"), currencyCode: "XAF", direction: "INBOUND", status: "VERIFIED", signatureValid: true, ...extra })
const line = (id = "l1", extra = {}) => ({ id, fingerprint: id, providerTransactionId: "txn-p1", providerReference: "ref-p1", amount: amount("100.25"), currencyCode: "XAF", direction: "CREDIT", status: "UNMATCHED", ...extra })
const run = () => runPaymentReconciliation({ organizationId: "org-1", providerAccountId: "pa1", businessDate: new Date("2026-09-05T00:00:00Z"), correlationId: "auto-proof" })
const saved = () => mocks.reconciliationRun.update.mock.calls[0][0].data

describe("automatic reconciliation evidence and amount truth", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mocks.$transaction.mockImplementation(async (work) => work(mocks))
    mocks.providerAccount.findFirst.mockResolvedValue({ id: "pa1", currencyCode: "XAF", status: "ACTIVE", paymentRailId: "rail1", paymentRail: { id: "rail1", isActive: true }, settlementLedgerAccountId: "a1", suspenseLedgerAccountId: "a2", settlementAccounts: [{ id: "s1" }] })
    mocks.reconciliationRun.findFirst.mockResolvedValue(null)
    mocks.reconciliationRun.create.mockResolvedValue({ id: "r1" })
    mocks.reconciliationRun.update.mockResolvedValue({ id: "r1" })
    mocks.paymentTransaction.findMany.mockResolvedValue([payment()])
    mocks.providerEvent.findMany.mockResolvedValue([event()])
    mocks.statementLine.findMany.mockResolvedValue([])
    mocks.matchRecord.findMany.mockResolvedValue([])
    mocks.matchRecord.create.mockResolvedValue({ id: "m1" })
    mocks.paymentException.create.mockResolvedValue({ id: "x1" })
    mocks.suspenseItem.create.mockResolvedValue({ id: "s1" })
  })

  it("counts only successful matches when missing and mismatched evidence coexist", async () => {
    mocks.paymentTransaction.findMany.mockResolvedValue([payment(), payment("p2", { amount: amount("20.10") }), payment("p3", { amount: amount("80.15") })])
    mocks.providerEvent.findMany.mockResolvedValue([event(), event("e2", { providerTransactionId: "txn-p2", providerReference: "ref-p2", amount: amount("19.10") })])
    expect(await run()).toMatchObject({ matchCount: 1, exceptionCount: 2, suspenseAmount: "100.25", status: "NEEDS_REVIEW" })
    expect(saved().matchedAmount.toFixed(2)).toBe("100.25")
    expect(saved().totalInternalAmount.toFixed(2)).toBe("200.50")
    expect(saved().suspenseAmount.toFixed(2)).toBe("100.25")
  })

  it("reports zero matched money when every internal payment lacks evidence", async () => {
    mocks.providerEvent.findMany.mockResolvedValue([])
    expect(await run()).toMatchObject({ matchCount: 0, exceptionCount: 1, suspenseAmount: "100.25" })
    expect(saved().matchedAmount.toFixed(2)).toBe("0.00")
    expect(mocks.paymentException.update).toHaveBeenCalledWith({ where: { id: "x1", organizationId: "org-1" }, data: { suspenseItemId: "s1" } })
    expect(mocks.suspenseItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ evidence: expect.objectContaining({ exceptionId: "x1" }) }) }))
  })

  it("does not publish a completed run if the exception link cannot be stored", async () => {
    mocks.providerEvent.findMany.mockResolvedValue([])
    mocks.paymentException.update.mockRejectedValue(new Error("Link write failed"))
    await expect(run()).rejects.toThrow("Link write failed")
    expect(mocks.reconciliationRun.update).not.toHaveBeenCalled()
  })

  it.each(["OUTBOUND", "INTERNAL", null])("does not match an inbound payment to provider direction %s", async direction => {
    mocks.providerEvent.findMany.mockResolvedValue([event("e1", { direction })])
    expect(await run()).toMatchObject({ matchCount: 0, status: "NEEDS_REVIEW" })
    expect(mocks.matchRecord.create).not.toHaveBeenCalled()
    expect(mocks.paymentException.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "MANUAL_REVIEW_REQUIRED", evidence: expect.objectContaining({ mismatchReasons: expect.arrayContaining(["PROVIDER_EVENT_DIRECTION"]) }) }) }))
  })

  it.each(["DEBIT", "FEE", "REVERSAL", "UNKNOWN"])("does not treat statement direction %s as an inbound credit", async direction => {
    mocks.providerEvent.findMany.mockResolvedValue([])
    mocks.statementLine.findMany.mockResolvedValue([line("l1", { direction })])
    expect(await run()).toMatchObject({ matchCount: 0, status: "NEEDS_REVIEW" })
    expect(mocks.matchRecord.create).not.toHaveBeenCalled()
  })

  it("matches outbound evidence only when both event and statement agree", async () => {
    mocks.paymentTransaction.findMany.mockResolvedValue([payment("p1", { direction: "OUTBOUND" })])
    mocks.providerEvent.findMany.mockResolvedValue([event("e1", { direction: "OUTBOUND" })])
    mocks.statementLine.findMany.mockResolvedValue([line("l1", { direction: "DEBIT" })])
    expect(await run()).toMatchObject({ matchCount: 1, exceptionCount: 0 })
    expect(saved().matchedAmount.toFixed(2)).toBe("100.25")
  })

  it("does not trust a VERIFIED label with failed signature verification", async () => {
    mocks.providerEvent.findMany.mockResolvedValue([event("e1", { signatureValid: false })])
    expect(await run()).toMatchObject({ matchCount: 0, status: "NEEDS_REVIEW" })
    expect(mocks.paymentException.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "SIGNATURE_FAILURE" }) }))
  })

  it("does not let a statement supply the amount missing from a linked event", async () => {
    mocks.providerEvent.findMany.mockResolvedValue([event("e1", { amount: null })])
    mocks.statementLine.findMany.mockResolvedValue([line()])
    expect(await run()).toMatchObject({ matchCount: 0, status: "NEEDS_REVIEW" })
  })

  it.each([false, true])("leaves duplicate external candidates for review regardless of order (%s)", async reverse => {
    const candidates = [event(), event("e2")]
    mocks.providerEvent.findMany.mockResolvedValue(reverse ? candidates.reverse() : candidates)
    expect(await run()).toMatchObject({ matchCount: 0, exceptionCount: 1, suspenseAmount: "100.25" })
    expect(mocks.matchRecord.create).not.toHaveBeenCalled()
    expect(mocks.paymentException.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "DUPLICATE_PROVIDER_REFERENCE", evidence: expect.objectContaining({ providerEventIds: ["e1", "e2"] }) }) }))
  })

  it("does not pick an arbitrary statement when an exact ID and reference point to different rows", async () => {
    mocks.providerEvent.findMany.mockResolvedValue([])
    mocks.statementLine.findMany.mockResolvedValue([line("l1", { providerReference: "different" }), line("l2", { providerTransactionId: "different" })])
    expect(await run()).toMatchObject({ matchCount: 0, exceptionCount: 1 })
  })

  it.each([false, true])("does not give shared reference evidence to the first of two internal payments (%s)", async reverse => {
    const payments = [payment("p1", { providerTransactionId: null, providerReference: "shared" }), payment("p2", { providerTransactionId: null, providerReference: "shared" })]
    mocks.paymentTransaction.findMany.mockResolvedValue(reverse ? payments.reverse() : payments)
    mocks.providerEvent.findMany.mockResolvedValue([event("e1", { providerTransactionId: null, providerReference: "shared" })])
    expect(await run()).toMatchObject({ matchCount: 0, exceptionCount: 2, suspenseAmount: "200.50" })
    expect(mocks.matchRecord.create).not.toHaveBeenCalled()
  })

  it("keeps exact-ID matching available when no conflicting reference candidate exists", async () => {
    mocks.providerEvent.findMany.mockResolvedValue([event("e1", { providerReference: null })])
    expect(await run()).toMatchObject({ matchCount: 1, exceptionCount: 0 })
    expect(mocks.matchRecord.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rule: "EXACT_PROVIDER_TRANSACTION_ID" }) }))
  })

  it("records the reference rule when evidence has a different transaction ID", async () => {
    mocks.paymentTransaction.findMany.mockResolvedValue([payment("p1", { providerTransactionId: null })])
    expect(await run()).toMatchObject({ matchCount: 1, exceptionCount: 0 })
    expect(mocks.matchRecord.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rule: "EXACT_PROVIDER_REFERENCE" }) }))
  })

  it.each(["paymentTransactionId", "providerEventId", "statementLineId"])("does not allocate previously matched %s again", async field => {
    mocks.statementLine.findMany.mockResolvedValue([line()])
    mocks.matchRecord.findMany.mockResolvedValue([{ id: "old-match", paymentTransactionId: null, providerEventId: null, statementLineId: null, [field]: { paymentTransactionId: "p1", providerEventId: "e1", statementLineId: "l1" }[field] }])
    await expect(run()).rejects.toThrow(/already allocated/i)
    expect(mocks.matchRecord.create).not.toHaveBeenCalled()
    expect(mocks.suspenseItem.create).not.toHaveBeenCalled()
    expect(mocks.paymentException.create).not.toHaveBeenCalled()
    expect(mocks.matchRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", providerAccountId: "pa1", status: { in: ["AUTO_MATCHED", "APPROVED", "CORRECTED"] } }) }))
  })
})
