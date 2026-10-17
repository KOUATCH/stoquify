import { Prisma, MatchStatus } from "@prisma/client"

jest.mock("@/prisma/db", () => ({ db: {
  paymentTransaction: { findFirst: jest.fn() }, matchRecord: { groupBy: jest.fn() },
  paymentException: { groupBy: jest.fn() }, suspenseItem: { groupBy: jest.fn() },
  auditLog: { create: jest.fn() },
} }))
import { db } from "@/prisma/db"
import { getProofTrail } from "../proof-trail.service"

const mock = (value: unknown) => value as jest.Mock
const decimal = (value: string | number) => new Prisma.Decimal(value)
const input = { organizationId: "org-a", subjectType: "payment.transaction" as const, subjectId: "payment-a" }
const coverage = (sum: string, overrides = {}) => ({ currencyCode: "XAF", _sum: { amountMatched: decimal(sum) }, _min: { amountMatched: decimal(sum) }, _count: { _all: 1, amountMatched: 1 }, ...overrides })
const match = (status: MatchStatus) => ({ id: "match-a", status, confidence: decimal(100), amountMatched: decimal(100), currencyCode: "XAF", providerEventId: "event-a", statementLineId: null, reconciliationRunId: null, ledgerPostingBatchId: null })
function transaction(overrides = {}) { return { id: "payment-a", organizationId: "org-a", state: "CONFIRMED", direction: "INBOUND", amount: decimal(100), feeAmount: decimal(0), currencyCode: "XAF", providerAccount: null, ledgerPostingBatch: null, sourceType: null, sourceId: null, occurredAt: new Date("2026-09-30T12:00:00Z"), confirmedAt: null, settledAt: null, providerReference: null, providerTransactionId: null, matchRecords: [], suspenseItems: [], paymentExceptions: [], ...overrides } }
beforeEach(() => {
  jest.resetAllMocks()
  mock(db.paymentTransaction.findFirst).mockResolvedValue(transaction())
  mock(db.matchRecord.groupBy).mockResolvedValue([])
  mock(db.paymentException.groupBy).mockResolvedValue([])
  mock(db.suspenseItem.groupBy).mockResolvedValue([])
  mock(db.auditLog.create).mockResolvedValue({ id: "audit" })
})

it.each([MatchStatus.CANDIDATE, MatchStatus.PROPOSED, MatchStatus.NEEDS_REVIEW, MatchStatus.REJECTED, MatchStatus.VOIDED])("does not promote displayed %s history into reconciled proof", async status => {
  mock(db.paymentTransaction.findFirst).mockResolvedValue(transaction({ matchRecords: [match(status)] }))
  expect((await getProofTrail(input)).evidenceGrade).toBe("operational")
})

it.each([
  ["partial", [coverage("60")]], ["overallocated", [coverage("101")]],
  ["foreign currency", [coverage("100", { currencyCode: "EUR" })]],
  ["mixed currencies", [coverage("100"), coverage("20", { currencyCode: "EUR" })]],
  ["missing amount", [coverage("100", { _count: { _all: 2, amountMatched: 1 } })]],
  ["non-positive row", [coverage("100", { _min: { amountMatched: decimal(0) } })]],
  ["negative row", [coverage("100", { _min: { amountMatched: decimal(-10) } })]],
] as const)("does not claim full reconciliation for %s accepted allocation coverage", async (_name, rows) => {
  mock(db.paymentTransaction.findFirst).mockResolvedValue(transaction({ matchRecords: [match(MatchStatus.APPROVED)] }))
  mock(db.matchRecord.groupBy).mockResolvedValue(rows)
  expect((await getProofTrail(input)).evidenceGrade).toBe("operational")
})

it("uses complete accepted coverage even when the display contains only newer rejected history", async () => {
  mock(db.paymentTransaction.findFirst).mockResolvedValue(transaction({ matchRecords: [match(MatchStatus.REJECTED)] }))
  mock(db.matchRecord.groupBy).mockResolvedValue([coverage("100", { _min: { amountMatched: decimal(40) }, _count: { _all: 2, amountMatched: 2 } })])
  expect((await getProofTrail(input)).evidenceGrade).toBe("reconciled")
  expect(db.matchRecord.groupBy).toHaveBeenCalledWith({ by: ["currencyCode"], where: { organizationId: "org-a", paymentTransactionId: "payment-a", status: { in: ["AUTO_MATCHED", "APPROVED", "CORRECTED"] } }, _sum: { amountMatched: true }, _min: { amountMatched: true }, _count: { _all: true, amountMatched: true } })
  expect(db.paymentTransaction.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "payment-a", organizationId: "org-a" }, include: expect.objectContaining({ matchRecords: expect.objectContaining({ where: { organizationId: "org-a" }, take: 10 }) }) }))
})

it("retains exact decimal coverage and a corrected accepted node", async () => {
  mock(db.paymentTransaction.findFirst).mockResolvedValue(transaction({ amount: decimal("0.30"), matchRecords: [match(MatchStatus.CORRECTED)] }))
  mock(db.matchRecord.groupBy).mockResolvedValue([coverage("0.30", { _min: { amountMatched: decimal("0.10") }, _count: { _all: 2, amountMatched: 2 } })])
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe("reconciled")
  expect(proof.nodes.find(node => node.nodeType === "reconciliation.match")?.evidenceGrade).toBe("reconciled")
})

it("propagates aggregate failure and rereads fresh coverage on retry", async () => {
  mock(db.matchRecord.groupBy).mockRejectedValueOnce(new Error("allocation query failed"))
  await expect(getProofTrail(input)).rejects.toThrow("allocation query failed")
  expect((await getProofTrail(input)).evidenceGrade).toBe("operational")
  expect(db.matchRecord.groupBy).toHaveBeenCalledTimes(2)
})

it("does not query allocations when the tenant-scoped payment is absent", async () => {
  mock(db.paymentTransaction.findFirst).mockResolvedValue(null)
  await expect(getProofTrail(input)).rejects.toThrow("Payment transaction proof subject not found")
  expect(db.matchRecord.groupBy).not.toHaveBeenCalled()
})
