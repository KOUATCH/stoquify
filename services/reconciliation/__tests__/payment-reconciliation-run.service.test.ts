import {
  ExceptionSeverity,
  MatchStatus,
  PaymentDirection,
  PaymentExceptionType,
  PaymentTransactionState,
  ProviderAccountStatus,
  ProviderEventStatus,
  ReconciliationRunStatus,
  StatementLineDirection,
  StatementLineStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { lockReconciliationClosePeriodsInTx } from "../reconciliation-close-order.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
jest.mock("server-only", () => ({}))
jest.mock("../reconciliation-close-order.service", () => ({
  ...jest.requireActual("../reconciliation-close-order.service"),
  lockReconciliationCloseCatalogInTx: jest.fn(), lockReconciliationClosePeriodsInTx: jest.fn(),
}))
jest.mock("@/services/accounting/close-assurance-pack.service", () => ({ recordCloseCertificationInvalidationsForSourceInTx: jest.fn() }))
import { assertModuleNewWorkInTx } from "@/services/modules/module-admission.service"

jest.mock("@/services/modules/module-admission.service", () => ({ assertModuleNewWorkInTx: jest.fn() }))

import {
  approveManualMatch,
  proposeManualMatch,
  runPaymentReconciliation,
} from "../payment-reconciliation-run.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    auditLog: { create: jest.fn() },
    tenantModuleConfiguration: { findUnique: jest.fn().mockResolvedValue(null) },
    tenantModuleGrant: { findMany: jest.fn().mockResolvedValue([]) },
    tenantModuleConfigurationCommand: { count: jest.fn().mockResolvedValue(0) },
    providerAccount: { findFirst: jest.fn() },
    reconciliationRun: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    paymentTransaction: { findMany: jest.fn(), findFirst: jest.fn() },
    providerEvent: { findMany: jest.fn(), findFirst: jest.fn() },
    statementLine: { findMany: jest.fn(), findFirst: jest.fn() },
    matchRecord: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    paymentException: { create: jest.fn(), update: jest.fn() },
    suspenseItem: { create: jest.fn() },
    paymentReconciliationInboxItem: { upsert: jest.fn(), createMany: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  $queryRaw: jest.Mock
  $transaction: jest.Mock
  providerAccount: { findFirst: jest.Mock }
  reconciliationRun: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  paymentTransaction: { findMany: jest.Mock; findFirst: jest.Mock }
  providerEvent: { findMany: jest.Mock; findFirst: jest.Mock }
  statementLine: { findMany: jest.Mock; findFirst: jest.Mock }
  matchRecord: { create: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock }
  paymentException: { create: jest.Mock; update: jest.Mock }
  suspenseItem: { create: jest.Mock }
  paymentReconciliationInboxItem: { upsert: jest.Mock; createMany: jest.Mock }
}

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

describe("durable payment reconciliation run service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(lockReconciliationClosePeriodsInTx as jest.Mock).mockResolvedValue(["prior-period", "current-period"])
    mockedDb.$queryRaw.mockImplementation(async query => query.sql.includes('"organizations"') ? [{ id: "org-1", requestedModules: [] }] : [{ id: "provider-account-1" }])
    ;(assertModuleNewWorkInTx as jest.Mock).mockReset().mockResolvedValue(undefined)
    mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
    mockedDb.providerAccount.findFirst.mockResolvedValue({
      id: "provider-account-1",
      paymentRailId: "rail-1",
      currencyCode: "XAF",
      status: ProviderAccountStatus.ACTIVE,
      settlementLedgerAccountId: "account-512",
      suspenseLedgerAccountId: "account-471",
      paymentRail: { id: "rail-1", isActive: true },
      settlementAccounts: [{ id: "settlement-1" }],
    })
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(null)
    mockedDb.reconciliationRun.create.mockResolvedValue({ id: "run-1" })
    mockedDb.reconciliationRun.update.mockResolvedValue({ id: "run-1" })
    mockedDb.paymentTransaction.findFirst.mockResolvedValue({
      id: "payment-transaction-1",
      amount: amount(10000),
      currencyCode: "XAF",
      state: "CONFIRMED", direction: "INBOUND",
    })
    mockedDb.providerEvent.findFirst.mockResolvedValue({
      id: "provider-event-1",
      amount: amount(10000),
      currencyCode: "XAF",
      status: "VERIFIED", direction: "INBOUND", signatureValid: true,
    })
    mockedDb.statementLine.findFirst.mockResolvedValue({
      id: "statement-line-1",
      amount: amount(10000),
      currencyCode: "XAF",
      status: "UNMATCHED", direction: "CREDIT",
    })
    mockedDb.matchRecord.create.mockResolvedValue({ id: "match-1" })
    mockedDb.matchRecord.findMany.mockResolvedValue([])
    mockedDb.paymentException.create.mockResolvedValue({ id: "exception-1" })
    mockedDb.suspenseItem.create.mockResolvedValue({ id: "suspense-1" })
    mockedDb.paymentReconciliationInboxItem.upsert.mockResolvedValue({ id: "inbox-1" })
    mockedDb.paymentReconciliationInboxItem.createMany.mockResolvedValue({ count: 1 })
  })

  it("stops a new run before creating reconciliation effects", async () => {
    ;(assertModuleNewWorkInTx as jest.Mock).mockRejectedValueOnce(new Error("New work stopped"))
    await expect(runPaymentReconciliation({
      organizationId: "org-1", providerAccountId: "provider-account-1", businessDate: new Date("2026-09-05"),
    })).rejects.toThrow("New work stopped")
    expect(assertModuleNewWorkInTx).toHaveBeenCalledWith(mockedDb, {
      organizationId: "org-1", moduleSlug: "payment_reconciliation", operation: "payment.reconciliation.run.create",
    })
    expect(mockedDb.reconciliationRun.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentTransaction.findMany).not.toHaveBeenCalled()
    expect(mockedDb.matchRecord.create).not.toHaveBeenCalled()
  })

  it("runs required reconciliation with real admission when only new manual journals are stopped", async () => {
    const actualAdmission = jest.requireActual<typeof import("@/services/modules/module-admission.service")>("@/services/modules/module-admission.service")
    ;(assertModuleNewWorkInTx as jest.Mock).mockImplementation(actualAdmission.assertModuleNewWorkInTx)
    mockedDb.$queryRaw.mockImplementation(async (query: { sql: string }) => query.sql.includes('"organizations"') ? [{ id: "org-1" }] : [{ newWorkStoppedModules: ["accounting"], newWorkStoppedAt: { accounting: "2026-09-05T12:00:00.000Z" } }])
    mockedDb.paymentTransaction.findMany.mockResolvedValue([{ id: "payment-transaction-1", amount: amount(10000), currencyCode: "XAF", providerTransactionId: "txn-1", providerReference: "ref-1", direction: PaymentDirection.INBOUND, state: PaymentTransactionState.CONFIRMED }])
    mockedDb.providerEvent.findMany.mockResolvedValue([{ id: "provider-event-1", providerEventId: "evt-1", providerTransactionId: "txn-1", providerReference: "ref-1", amount: amount(10000), currencyCode: "XAF", direction: PaymentDirection.INBOUND, status: ProviderEventStatus.VERIFIED, signatureValid: true }])
    mockedDb.statementLine.findMany.mockResolvedValue([])
    await expect(runPaymentReconciliation({ organizationId: "org-1", providerAccountId: "provider-account-1", businessDate: new Date("2026-09-05"), runById: "maker-1" })).resolves.toMatchObject({ runId: "run-1", status: ReconciliationRunStatus.READY_FOR_SIGNOFF, matchCount: 1, exceptionCount: 0 })
    expect(mockedDb.$queryRaw).toHaveBeenCalledTimes(4)
    expect(mockedDb.matchRecord.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentTransactionId: "payment-transaction-1", providerEventId: "provider-event-1", reconciliationRunId: "run-1" }) }))
  })

  it("creates explainable auto matches and itemized suspense for orphan statement lines", async () => {
    mockedDb.paymentTransaction.findMany.mockResolvedValue([
      {
        id: "payment-transaction-1",
        amount: amount(10000),
        currencyCode: "XAF",
        providerTransactionId: "txn-1",
        providerReference: "ref-1",
        direction: PaymentDirection.INBOUND,
        state: PaymentTransactionState.CONFIRMED,
      },
    ])
    mockedDb.providerEvent.findMany.mockResolvedValue([
      {
        id: "provider-event-1",
        providerEventId: "evt-1",
        providerTransactionId: "txn-1",
        providerReference: "ref-1",
        amount: amount(10000),
        currencyCode: "XAF",
        direction: PaymentDirection.INBOUND,
        status: ProviderEventStatus.VERIFIED,
        signatureValid: true,
      },
    ])
    mockedDb.statementLine.findMany.mockResolvedValue([
      {
        id: "statement-line-1",
        fingerprint: "fp-1",
        providerTransactionId: "txn-2",
        providerReference: "ref-2",
        amount: amount(5000),
        currencyCode: "XAF",
        direction: StatementLineDirection.CREDIT,
        status: StatementLineStatus.UNMATCHED,
      },
    ])

    const result = await runPaymentReconciliation({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      businessDate: new Date("2026-06-14T09:00:00Z"),
      correlationId: "corr-1",
    })

    expect(result).toMatchObject({
      runId: "run-1",
      status: ReconciliationRunStatus.NEEDS_REVIEW,
      matchCount: 1,
      exceptionCount: 1,
      suspenseCount: 1,
      suspenseAmount: "5000.00",
      correlationId: "corr-1",
    })
    expect(recordCloseCertificationInvalidationsForSourceInTx).toHaveBeenCalledWith(mockedDb, "org-1", expect.objectContaining({
      sourceCode: "PAYMENT_RECONCILIATION_CREATED", sourceId: "run-1", periodIds: ["prior-period", "current-period"],
    }), expect.any(Object))
    expect((lockReconciliationClosePeriodsInTx as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(mockedDb.reconciliationRun.create.mock.invocationCallOrder[0])
    expect(mockedDb.matchRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MatchStatus.AUTO_MATCHED,
          paymentTransactionId: "payment-transaction-1",
          providerEventId: "provider-event-1",
        }),
      }),
    )
    expect(mockedDb.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.MISSING_INTERNAL_PAYMENT,
          severity: ExceptionSeverity.HIGH,
          statementLineId: "statement-line-1",
        }),
      }),
    )
    expect(mockedDb.suspenseItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reconciliationRunId: "run-1",
          amount: amount(5000),
        }),
      }),
    )
  })

  it("blocks a duplicate same-day reconciliation run before creating new rows", async () => {
    mockedDb.reconciliationRun.findFirst.mockResolvedValue({
      id: "existing-run-1",
      status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
      correlationId: "existing-corr",
    })

    await expect(
      runPaymentReconciliation({
        organizationId: "org-1",
        providerAccountId: "provider-account-1",
        businessDate: new Date("2026-06-14T09:00:00Z"),
        correlationId: "corr-duplicate",
      }),
    ).rejects.toThrow("already exists")

    expect(mockedDb.reconciliationRun.create).not.toHaveBeenCalled()
    expect(mockedDb.matchRecord.create).not.toHaveBeenCalled()
  })

  it("blocks reconciliation before row creation when the provider account is not ready", async () => {
    mockedDb.providerAccount.findFirst.mockResolvedValue({
      id: "provider-account-1",
      paymentRailId: "rail-1",
      currencyCode: "XAF",
      status: ProviderAccountStatus.SUSPENDED,
      settlementLedgerAccountId: "account-512",
      suspenseLedgerAccountId: "account-471",
      paymentRail: { id: "rail-1", isActive: true },
      settlementAccounts: [{ id: "settlement-1" }],
    })

    await expect(runPaymentReconciliation({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      businessDate: new Date("2026-06-14T09:00:00Z"),
    })).rejects.toThrow(/active provider account/i)

    expect(mockedDb.reconciliationRun.findFirst).not.toHaveBeenCalled()
    expect(mockedDb.reconciliationRun.create).not.toHaveBeenCalled()
  })
  it("blocks concurrent same-day reconciliation when a run is already in progress", async () => {
    mockedDb.reconciliationRun.findFirst.mockResolvedValue({
      id: "running-run-1",
      status: ReconciliationRunStatus.RUNNING,
      correlationId: "running-corr",
    })

    await expect(
      runPaymentReconciliation({
        organizationId: "org-1",
        providerAccountId: "provider-account-1",
        businessDate: new Date("2026-06-14T09:00:00Z"),
      }),
    ).rejects.toThrow("already in progress")

    expect(mockedDb.reconciliationRun.create).not.toHaveBeenCalled()
  })

  it("converts unique-key races into a controlled duplicate-run conflict", async () => {
    mockedDb.reconciliationRun.create.mockRejectedValueOnce({ code: "P2002" })
    mockedDb.paymentTransaction.findMany.mockResolvedValue([])
    mockedDb.providerEvent.findMany.mockResolvedValue([])
    mockedDb.statementLine.findMany.mockResolvedValue([])

    await expect(
      runPaymentReconciliation({
        organizationId: "org-1",
        providerAccountId: "provider-account-1",
        businessDate: new Date("2026-06-14T09:00:00Z"),
      }),
    ).rejects.toThrow("already exists")
  })

  it("creates an amount-mismatch exception instead of auto-matching conflicting evidence", async () => {
    mockedDb.paymentTransaction.findMany.mockResolvedValue([
      {
        id: "payment-transaction-1",
        amount: amount(10000),
        currencyCode: "XAF",
        providerTransactionId: "txn-1",
        providerReference: "ref-1",
        direction: PaymentDirection.INBOUND,
        state: PaymentTransactionState.CONFIRMED,
      },
    ])
    mockedDb.providerEvent.findMany.mockResolvedValue([
      {
        id: "provider-event-1",
        providerEventId: "evt-1",
        providerTransactionId: "txn-1",
        providerReference: "ref-1",
        amount: amount(9000),
        currencyCode: "XAF",
        direction: PaymentDirection.INBOUND,
        status: ProviderEventStatus.VERIFIED,
        signatureValid: true,
      },
    ])
    mockedDb.statementLine.findMany.mockResolvedValue([])

    const result = await runPaymentReconciliation({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      businessDate: new Date("2026-06-14T09:00:00Z"),
    })

    expect(result).toMatchObject({
      status: ReconciliationRunStatus.NEEDS_REVIEW,
      matchCount: 0,
      exceptionCount: 1,
      suspenseCount: 1,
    })
    expect(mockedDb.matchRecord.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.AMOUNT_MISMATCH,
        }),
      }),
    )
  })

  it("creates an exception when a statement-only match has a conflicting amount", async () => {
    mockedDb.paymentTransaction.findMany.mockResolvedValue([
      {
        id: "payment-transaction-1",
        amount: amount(10000),
        currencyCode: "XAF",
        providerTransactionId: "txn-1",
        providerReference: "ref-1",
        direction: PaymentDirection.INBOUND,
        state: PaymentTransactionState.CONFIRMED,
      },
    ])
    mockedDb.providerEvent.findMany.mockResolvedValue([])
    mockedDb.statementLine.findMany.mockResolvedValue([
      {
        id: "statement-line-1",
        fingerprint: "fp-1",
        providerTransactionId: "txn-1",
        providerReference: "ref-1",
        amount: amount(9000),
        currencyCode: "XAF",
        direction: StatementLineDirection.CREDIT,
        status: StatementLineStatus.UNMATCHED,
      },
    ])

    const result = await runPaymentReconciliation({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      businessDate: new Date("2026-06-14T09:00:00Z"),
    })

    expect(result).toMatchObject({
      status: ReconciliationRunStatus.NEEDS_REVIEW,
      matchCount: 0,
      exceptionCount: 1,
      suspenseCount: 1,
    })
    expect(mockedDb.matchRecord.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.AMOUNT_MISMATCH,
          evidence: expect.objectContaining({
            mismatchReasons: ["STATEMENT_LINE_AMOUNT"],
          }),
        }),
      }),
    )
  })

  it("creates an exception when external evidence uses a different currency", async () => {
    mockedDb.paymentTransaction.findMany.mockResolvedValue([
      {
        id: "payment-transaction-1",
        amount: amount(10000),
        currencyCode: "XAF",
        providerTransactionId: "txn-1",
        providerReference: "ref-1",
        direction: PaymentDirection.INBOUND,
        state: PaymentTransactionState.CONFIRMED,
      },
    ])
    mockedDb.providerEvent.findMany.mockResolvedValue([
      {
        id: "provider-event-1",
        providerEventId: "evt-1",
        providerTransactionId: "txn-1",
        providerReference: "ref-1",
        amount: amount(10000),
        currencyCode: "EUR",
        direction: PaymentDirection.INBOUND,
        status: ProviderEventStatus.VERIFIED,
        signatureValid: true,
      },
    ])
    mockedDb.statementLine.findMany.mockResolvedValue([])

    const result = await runPaymentReconciliation({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      businessDate: new Date("2026-06-14T09:00:00Z"),
    })

    expect(result).toMatchObject({
      status: ReconciliationRunStatus.NEEDS_REVIEW,
      matchCount: 0,
      exceptionCount: 1,
      suspenseCount: 1,
    })
    expect(mockedDb.matchRecord.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.AMOUNT_MISMATCH,
          evidence: expect.objectContaining({
            mismatchReasons: ["PROVIDER_EVENT_CURRENCY"],
          }),
        }),
      }),
    )
  })

  it("requires maker-checker separation for manual match approval", async () => {
    mockedDb.matchRecord.create.mockImplementationOnce(({ data }: { data: object }) => ({ ...data, id: "proposed-match-1" }))

    const proposed = await proposeManualMatch({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      paymentTransactionId: "payment-transaction-1",
      statementLineId: "statement-line-1",
      proposedById: "maker-1",
      amountMatched: amount(10000),
      idempotencyKey: "existing-maker-checker-test",
      control: { actorPermissions: ["payments.reconciliation.match"] },
      correlationId: "corr-manual",
    })

    expect(proposed).toMatchObject({ matchId: "proposed-match-1", correlationId: "corr-manual" })
    const proposalMetadata = mockedDb.matchRecord.create.mock.calls.at(-1)[0].data.metadata
    const approvalControl = { actorPermissions: ["payments.reconciliation.override"], lastAuthAt: new Date() }

    mockedDb.matchRecord.findFirst.mockResolvedValue({
      id: "proposed-match-1",
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      paymentTransactionId: "payment-transaction-1",
      providerEventId: null,
      statementLineId: "statement-line-1",
      reconciliationRunId: null,
      ledgerPostingBatchId: null,
      confidence: amount(75),
      amountMatched: amount(10000),
      currencyCode: "XAF",
      matchedById: "maker-1",
      metadata: proposalMetadata,
    })

    await expect(
      approveManualMatch({
        organizationId: "org-1",
        proposedMatchId: "proposed-match-1",
        approvedById: "maker-1",
        expectedEvidenceRevision: proposalMetadata.evidenceRevision,
        control: approvalControl,
      }),
    ).rejects.toThrow("independent approval")

    mockedDb.matchRecord.create.mockImplementationOnce(({ data }: { data: object }) => ({ ...data, id: "approved-match-1" }))
    await expect(
      approveManualMatch({
        organizationId: "org-1",
        proposedMatchId: "proposed-match-1",
        approvedById: "checker-1",
        expectedEvidenceRevision: proposalMetadata.evidenceRevision,
        control: approvalControl,
        correlationId: "corr-approve",
      }),
    ).resolves.toMatchObject({ matchId: "approved-match-1", correlationId: "corr-approve" })
  })

  it("rejects manual match evidence outside the tenant-scoped provider account", async () => {
    mockedDb.statementLine.findFirst.mockResolvedValue(null)

    await expect(proposeManualMatch({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      paymentTransactionId: "payment-transaction-1",
      statementLineId: "statement-line-from-another-tenant",
      proposedById: "maker-1",
      amountMatched: amount(10000),
      idempotencyKey: "existing-foreign-line-test",
      control: { actorPermissions: ["payments.reconciliation.match"] },
    })).rejects.toThrow("Statement line not found")

    expect(mockedDb.matchRecord.create).not.toHaveBeenCalled()
  })
})
