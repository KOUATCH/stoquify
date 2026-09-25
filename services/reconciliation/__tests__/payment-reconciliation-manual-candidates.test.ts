import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getManualMatchCandidates } from "../payment-reconciliation-manual-candidates.service"

jest.mock("@/prisma/db", () => ({ db: {
  $transaction: jest.fn(), organization: { findFirst: jest.fn() },
  tenantModuleConfiguration: { findUnique: jest.fn() }, tenantModuleGrant: { findMany: jest.fn() }, tenantModuleConfigurationCommand: { count: jest.fn() },
  paymentException: { findMany: jest.fn() }, providerAccount: { findMany: jest.fn() }, paymentTransaction: { findMany: jest.fn() },
  providerEvent: { findMany: jest.fn() }, statementLine: { findMany: jest.fn() }, matchRecord: { findMany: jest.fn() },
} }))
const mock = db as unknown as Record<string, Record<string, jest.Mock>> & { $transaction: jest.Mock }
const decimal = (value: string) => new Prisma.Decimal(value)
const candidate = { id: "ex-1", type: "AMOUNT_MISMATCH", severity: "HIGH", providerAccountId: "provider-1", paymentTransactionId: "payment-1", providerEventId: "event-1", statementLineId: null }
const provider = { id: "provider-1", displayName: "Owned rail", status: "ACTIVE", archivedAt: null, currencyCode: "XAF" }
const payment = { id: "payment-1", providerAccountId: "provider-1", state: "CONFIRMED", direction: "INBOUND", amount: decimal("100.00"), currencyCode: "XAF", providerReference: "internal-private-reference", providerTransactionId: null, occurredAt: new Date("2026-09-05") }
const event = { id: "event-1", providerAccountId: "provider-1", status: "VERIFIED", signatureValid: true, archivedAt: null, direction: "INBOUND", amount: decimal("90.00"), currencyCode: "XAF", providerReference: "external-private-reference", providerTransactionId: null, occurredAt: new Date("2026-09-05") }
const allocation = (changes = {}) => ({ providerAccountId: "provider-1", paymentTransactionId: "payment-1", providerEventId: "event-1", statementLineId: null, amountMatched: decimal("86.75"), currencyCode: "XAF", ...changes })
beforeEach(() => {
  jest.resetAllMocks()
  mock.$transaction.mockImplementation(work => work(mock))
  mock.organization.findFirst.mockResolvedValue({ id: "org-1", requestedModules: [] })
  mock.tenantModuleConfiguration.findUnique.mockResolvedValue(null)
  mock.tenantModuleGrant.findMany.mockResolvedValue([]); mock.tenantModuleConfigurationCommand.count.mockResolvedValue(0)
  mock.paymentException.findMany.mockResolvedValue([{ ...candidate }]); mock.providerAccount.findMany.mockResolvedValue([{ ...provider }]); mock.paymentTransaction.findMany.mockResolvedValue([{ ...payment }]); mock.providerEvent.findMany.mockResolvedValue([{ ...event }]); mock.statementLine.findMany.mockResolvedValue([]); mock.matchRecord.findMany.mockResolvedValue([allocation()])
})

describe("manual reconciliation preparation truth", () => {
  it("reports exact remaining amounts and masks references from one consistent scoped snapshot", async () => {
    const result = await getManualMatchCandidates("org-1")
    expect(result).toMatchObject({ writeAllowed: true, hasMore: false, limit: 12, candidates: [expect.objectContaining({ internalAmount: "100.00", externalAmount: "90.00", internalRemaining: "13.25", externalRemaining: "3.25", availableAmount: "3.25", eligibility: "READY", internalReference: "in****ce", externalReference: "ex****ce" })] })
    expect(mock.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    for (const table of ["paymentException", "providerAccount", "paymentTransaction", "providerEvent", "statementLine", "matchRecord"]) {
      expect(mock[table].findMany).toHaveBeenCalledTimes(1)
      expect(mock[table].findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }))
    }
    expect(mock.matchRecord.findMany.mock.calls[0][0].where.status.in).toEqual(["AUTO_MATCHED", "APPROVED", "CORRECTED"])
  })
  it("counts allocations independently for the internal payment and external evidence", async () => {
    mock.matchRecord.findMany.mockResolvedValue([
      allocation({ providerEventId: "different-event", amountMatched: decimal("80.00") }),
      allocation({ paymentTransactionId: "different-payment", amountMatched: decimal("85.00") }),
      allocation({ providerAccountId: "foreign-provider", amountMatched: decimal("99.00") }),
      allocation({ paymentTransactionId: "unrelated", providerEventId: "unrelated", currencyCode: "EUR" }),
    ])
    expect((await getManualMatchCandidates("org-1")).candidates[0]).toMatchObject({ internalRemaining: "20.00", externalRemaining: "5.00", availableAmount: "5.00" })
  })
  it("marks fully allocated evidence unavailable for a new proposal without hiding the unresolved exception", async () => {
    mock.matchRecord.findMany.mockResolvedValue([allocation({ amountMatched: decimal("90.00") })])
    expect((await getManualMatchCandidates("org-1")).candidates[0]).toMatchObject({ exceptionId: "ex-1", internalRemaining: "10.00", externalRemaining: "0.00", availableAmount: "0.00", eligibility: "FULLY_ALLOCATED" })
  })
  it.each([
    [{ signatureValid: false }, "PROVIDER_EVIDENCE_INVALID"], [{ status: "REJECTED" }, "PROVIDER_EVIDENCE_INVALID"],
    [{ direction: "OUTBOUND" }, "PROVIDER_EVIDENCE_INVALID"], [{ currencyCode: "EUR" }, "CURRENCY_MISMATCH"],
    [{ amount: null }, "AMOUNT_UNAVAILABLE"],
  ])("explains invalid external evidence %j instead of declaring readiness", async (change, reason) => {
    mock.providerEvent.findMany.mockResolvedValue([{ ...event, ...change }])
    const row = (await getManualMatchCandidates("org-1")).candidates[0]
    expect(row).toMatchObject({ eligibility: reason, availableAmount: null })
    if ("currencyCode" in change) expect(row.externalCurrencyCode).toBe("EUR")
    if ("amount" in change) expect(row.externalAmount).toBeNull()
  })
  it("does not expose an evidence record belonging to another provider", async () => {
    mock.providerEvent.findMany.mockResolvedValue([{ ...event, providerAccountId: "foreign-provider", providerReference: "foreign-private-reference" }])
    expect((await getManualMatchCandidates("org-1")).candidates[0]).toMatchObject({ externalReference: null, externalAmount: null, eligibility: "EVIDENCE_UNAVAILABLE" })
  })
  it("does not silently choose between two different external records", async () => {
    mock.paymentException.findMany.mockResolvedValue([{ ...candidate, statementLineId: "line-1" }])
    expect((await getManualMatchCandidates("org-1")).candidates[0]).toMatchObject({ externalReference: null, availableAmount: null, eligibility: "EVIDENCE_SELECTION_REQUIRED" })
  })
  it("preserves decimal precision beyond JavaScript's safe integer range", async () => {
    mock.paymentTransaction.findMany.mockResolvedValue([{ ...payment, amount: decimal("9999999999999999.99") }])
    mock.providerEvent.findMany.mockResolvedValue([{ ...event, amount: decimal("9999999999999999.99") }])
    mock.matchRecord.findMany.mockResolvedValue([allocation({ amountMatched: decimal("9999999999999999.98") })])
    expect((await getManualMatchCandidates("org-1")).candidates[0]).toMatchObject({ internalAmount: "9999999999999999.99", externalAmount: "9999999999999999.99", availableAmount: "0.01" })
  })
  it("propagates a failed allocation query instead of offering the original amount", async () => {
    const failure = new Error("Allocation database unavailable"); mock.matchRecord.findMany.mockRejectedValue(failure)
    await expect(getManualMatchCandidates("org-1")).rejects.toBe(failure)
  })
  it("exposes inconsistent retained allocations for review rather than turning them into zero", async () => {
    mock.matchRecord.findMany.mockResolvedValue([allocation({ amountMatched: decimal("110.00") })])
    expect((await getManualMatchCandidates("org-1")).candidates[0]).toMatchObject({ eligibility: "ALLOCATION_INVALID", availableAmount: null, internalRemaining: null })
  })
  it("separates read access from write access and does not restore managed empty grants", async () => {
    mock.tenantModuleConfiguration.findUnique.mockResolvedValue({ organizationId: "org-1" })
    await expect(getManualMatchCandidates("org-1")).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(mock.paymentException.findMany).not.toHaveBeenCalled()
    mock.tenantModuleGrant.findMany.mockResolvedValue(["payment_reconciliation", "finance", "accounting"].map(moduleSlug => ({ moduleSlug, status: moduleSlug === "payment_reconciliation" ? "read_only" : "active", source: "manual_override", startsAt: null, endsAt: null, readOnly: false, trial: false })))
    expect(await getManualMatchCandidates("org-1")).toMatchObject({ writeAllowed: false, candidates: [expect.objectContaining({ eligibility: "READY" })] })
  })
  it("states that more work exists after the bounded page and uses batch queries", async () => {
    mock.paymentException.findMany.mockResolvedValue(Array.from({ length: 13 }, (_, i) => ({ ...candidate, id: `ex-${i}` })))
    const result = await getManualMatchCandidates("org-1"); expect(result.candidates).toHaveLength(12); expect(result.hasMore).toBe(true)
    expect(mock.matchRecord.findMany).toHaveBeenCalledTimes(1)
  })
})
