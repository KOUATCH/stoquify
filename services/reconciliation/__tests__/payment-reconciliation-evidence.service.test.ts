import {
  PaymentTransactionState,
  ProviderAccountStatus,
  ProviderEventStatus,
  Prisma,
} from "@prisma/client"

import {
  assertProviderAccountReconciliationReady,
  buildReconciliationEvidenceManifestInTx,
} from "../payment-reconciliation-evidence.service"
import { exceptionClosureManifestEvidenceInTx } from "../payment-exception-closure-evidence.service"

jest.mock("../payment-exception-closure-evidence.service", () => ({
  ...jest.requireActual("../payment-exception-closure-evidence.service"),
  exceptionClosureManifestEvidenceInTx: jest.fn((...args) => jest.requireActual("../payment-exception-closure-evidence.service").exceptionClosureManifestEvidenceInTx(...args)),
}))

function readyProviderAccount() {
  return {
    id: "provider-account-1",
    status: ProviderAccountStatus.ACTIVE,
    settlementLedgerAccountId: "account-512",
    suspenseLedgerAccountId: "account-471",
    paymentRail: { id: "rail-1", isActive: true },
    settlementAccounts: [{ id: "settlement-1" }],
  }
}

function txFixture() {
  return {
    paymentTransaction: { findMany: jest.fn().mockResolvedValue([]) },
    providerEvent: { findMany: jest.fn().mockResolvedValue([]) },
    statementFile: { findMany: jest.fn().mockResolvedValue([]) },
    statementLine: { findMany: jest.fn().mockResolvedValue([]) },
    matchRecord: { findMany: jest.fn().mockResolvedValue([]) },
    paymentException: { findMany: jest.fn().mockResolvedValue([]) },
    suspenseItem: { findMany: jest.fn().mockResolvedValue([]) },
  }
}

describe("payment reconciliation evidence service", () => {
  const coverageInput = { organizationId: "org-1", providerAccountId: "provider-account-1", reconciliationRunId: "run-1",
    periodStart: new Date("2026-06-14T00:00:00Z"), periodEnd: new Date("2026-06-15T00:00:00Z"), requireCompleteCoverage: true }

  it.each(["paymentTransaction", "providerEvent", "statementLine"] as const)("refuses an unaccounted %s source at sign-off", async model => {
    const tx = txFixture()
    tx[model].findMany.mockResolvedValue([{ id: "new-source" }])
    await expect(buildReconciliationEvidenceManifestInTx(tx as never, coverageInput)).rejects.toThrow(/not covered by this reconciliation run/i)
  })

  it.each(["CANDIDATE", "PROPOSED", "NEEDS_REVIEW", "REJECTED", "VOIDED"])("does not count a %s match as source disposition", async status => {
    const tx = txFixture()
    tx.providerEvent.findMany.mockResolvedValue([{ id: "event-1" }])
    tx.matchRecord.findMany.mockResolvedValue([{ id: "match-1", status, providerEventId: "event-1" }])
    await expect(buildReconciliationEvidenceManifestInTx(tx as never, coverageInput)).rejects.toThrow(/not covered/i)
  })

  it.each(["AUTO_MATCHED", "APPROVED", "CORRECTED"])("accepts a retained %s disposition without changing the evidence hash", async status => {
    const tx = txFixture()
    tx.providerEvent.findMany.mockResolvedValue([{ id: "event-1", amount: new Prisma.Decimal(10), receivedAt: new Date("2026-06-14T12:00:00Z") }])
    tx.matchRecord.findMany.mockResolvedValue([{ id: "match-1", status, providerEventId: "event-1", amountMatched: new Prisma.Decimal(10) }])
    const withCheck = await buildReconciliationEvidenceManifestInTx(tx as never, coverageInput)
    const historical = await buildReconciliationEvidenceManifestInTx(tx as never, { ...coverageInput, requireCompleteCoverage: false })
    expect(withCheck).toEqual(historical)
  })

  it("accepts source disposition through verified independent exception closure", async () => {
    jest.mocked(exceptionClosureManifestEvidenceInTx).mockResolvedValueOnce({ receiptId: "verified-decision", receiptHash: "hash", proposalId: "proposal", proposalHash: "hash", financialDecisionId: "decision" })
    const tx = txFixture()
    tx.providerEvent.findMany.mockResolvedValue([{ id: "event-1", amount: new Prisma.Decimal(10), receivedAt: new Date("2026-06-14T12:00:00Z") }])
    tx.paymentException.findMany.mockResolvedValue([{ id: "exception-1", status: "RESOLVED", providerEventId: "event-1" }])
    await expect(buildReconciliationEvidenceManifestInTx(tx as never, coverageInput)).resolves.toMatchObject({ counts: { providerEventCount: 1, exceptionCount: 1 } })
  })

  it("does not count an unresolved exception as source disposition", async () => {
    const tx = txFixture()
    tx.providerEvent.findMany.mockResolvedValue([{ id: "event-1" }])
    tx.paymentException.findMany.mockResolvedValue([{ id: "exception-1", status: "OPEN", providerEventId: "event-1" }])
    await expect(buildReconciliationEvidenceManifestInTx(tx as never, coverageInput)).rejects.toThrow(/not covered/i)
  })

  it("requires an active, mapped provider account with an approved settlement account", () => {
    expect(() => assertProviderAccountReconciliationReady(readyProviderAccount())).not.toThrow()
    expect(() => assertProviderAccountReconciliationReady({
      ...readyProviderAccount(),
      status: ProviderAccountStatus.SUSPENDED,
    })).toThrow(/active provider account/i)
    expect(() => assertProviderAccountReconciliationReady({
      ...readyProviderAccount(),
      suspenseLedgerAccountId: null,
    })).toThrow(/ledger mappings/i)
    expect(() => assertProviderAccountReconciliationReady({
      ...readyProviderAccount(),
      settlementAccounts: [],
    })).toThrow(/approved effective settlement account/i)
  })

  it("builds a deterministic hash from material redacted source evidence", async () => {
    const tx = txFixture()
    const periodStart = new Date("2026-06-14T00:00:00.000Z")
    const periodEnd = new Date("2026-06-15T00:00:00.000Z")
    tx.paymentTransaction.findMany.mockResolvedValue([
      {
        id: "transaction-2",
        state: PaymentTransactionState.SETTLED,
        amount: new Prisma.Decimal(20),
        feeAmount: null,
        currencyCode: "XAF",
        payloadHash: "payment-hash-2",
        ledgerPostingBatchId: "batch-2",
        occurredAt: new Date("2026-06-14T11:00:00.000Z"),
      },
      {
        id: "transaction-1",
        state: PaymentTransactionState.CONFIRMED,
        amount: new Prisma.Decimal(10),
        feeAmount: new Prisma.Decimal(1),
        currencyCode: "XAF",
        payloadHash: "payment-hash-1",
        ledgerPostingBatchId: "batch-1",
        occurredAt: new Date("2026-06-14T10:00:00.000Z"),
      },
    ])
    tx.providerEvent.findMany.mockResolvedValue([
      {
        id: "event-1",
        status: ProviderEventStatus.VERIFIED,
        rawPayloadHash: "provider-payload-hash",
        signatureValid: true,
        amount: new Prisma.Decimal(10),
        currencyCode: "XAF",
        occurredAt: new Date("2026-06-14T10:00:00.000Z"),
        receivedAt: new Date("2026-06-14T10:01:00.000Z"),
      },
    ])

    const input = {
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      reconciliationRunId: "run-1",
      periodStart,
      periodEnd,
    }
    const first = await buildReconciliationEvidenceManifestInTx(tx as never, input)
    tx.paymentTransaction.findMany.mockResolvedValue(
      [...await tx.paymentTransaction.findMany.mock.results[0].value].reverse(),
    )
    const second = await buildReconciliationEvidenceManifestInTx(tx as never, input)

    expect(first.sourceHash).toMatch(/^[a-f0-9]{64}$/)
    expect(second.sourceHash).toBe(first.sourceHash)
    expect(first.counts).toMatchObject({ paymentTransactionCount: 2, providerEventCount: 1 })
    expect(JSON.stringify(first)).not.toContain("provider-payload-hash")
  })

  it("changes the source hash when material evidence changes", async () => {
    const tx = txFixture()
    const input = {
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      reconciliationRunId: "run-1",
      periodStart: new Date("2026-06-14T00:00:00.000Z"),
      periodEnd: new Date("2026-06-15T00:00:00.000Z"),
    }
    tx.providerEvent.findMany.mockResolvedValue([{
      id: "event-1",
      status: ProviderEventStatus.VERIFIED,
      rawPayloadHash: "hash-before",
      signatureValid: true,
      amount: new Prisma.Decimal(10),
      currencyCode: "XAF",
      occurredAt: null,
      receivedAt: new Date("2026-06-14T10:00:00.000Z"),
    }])
    const before = await buildReconciliationEvidenceManifestInTx(tx as never, input)
    tx.providerEvent.findMany.mockResolvedValue([{
      ...(await tx.providerEvent.findMany.mock.results[0].value)[0],
      rawPayloadHash: "hash-after",
    }])
    const after = await buildReconciliationEvidenceManifestInTx(tx as never, input)

    expect(after.sourceHash).not.toBe(before.sourceHash)
  })
})
