import {
  ExceptionSeverity,
  MatchStatus,
  PaymentDirection,
  PaymentExceptionType,
  PaymentTransactionState,
  ProviderEventStatus,
  ReconciliationRunStatus,
  StatementLineDirection,
  StatementLineStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"

import {
  approveManualMatch,
  proposeManualMatch,
  runPaymentReconciliation,
} from "../payment-reconciliation-run.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    providerAccount: { findFirst: jest.fn() },
    reconciliationRun: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    paymentTransaction: { findMany: jest.fn() },
    providerEvent: { findMany: jest.fn() },
    statementLine: { findMany: jest.fn() },
    matchRecord: { create: jest.fn(), findFirst: jest.fn() },
    paymentException: { create: jest.fn() },
    suspenseItem: { create: jest.fn() },
    paymentReconciliationInboxItem: { upsert: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  providerAccount: { findFirst: jest.Mock }
  reconciliationRun: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  paymentTransaction: { findMany: jest.Mock }
  providerEvent: { findMany: jest.Mock }
  statementLine: { findMany: jest.Mock }
  matchRecord: { create: jest.Mock; findFirst: jest.Mock }
  paymentException: { create: jest.Mock }
  suspenseItem: { create: jest.Mock }
  paymentReconciliationInboxItem: { upsert: jest.Mock }
}

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

describe("durable payment reconciliation run service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
    mockedDb.providerAccount.findFirst.mockResolvedValue({
      id: "provider-account-1",
      paymentRailId: "rail-1",
      currencyCode: "XAF",
    })
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(null)
    mockedDb.reconciliationRun.create.mockResolvedValue({ id: "run-1" })
    mockedDb.reconciliationRun.update.mockResolvedValue({ id: "run-1" })
    mockedDb.matchRecord.create.mockResolvedValue({ id: "match-1" })
    mockedDb.paymentException.create.mockResolvedValue({ id: "exception-1" })
    mockedDb.suspenseItem.create.mockResolvedValue({ id: "suspense-1" })
    mockedDb.paymentReconciliationInboxItem.upsert.mockResolvedValue({ id: "inbox-1" })
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

  it("requires maker-checker separation for manual match approval", async () => {
    mockedDb.matchRecord.create.mockResolvedValueOnce({ id: "proposed-match-1" })

    const proposed = await proposeManualMatch({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      paymentTransactionId: "payment-transaction-1",
      statementLineId: "statement-line-1",
      proposedById: "maker-1",
      amountMatched: amount(10000),
      correlationId: "corr-manual",
    })

    expect(proposed).toMatchObject({ matchId: "proposed-match-1", correlationId: "corr-manual" })

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
    })

    await expect(
      approveManualMatch({
        organizationId: "org-1",
        proposedMatchId: "proposed-match-1",
        approvedById: "maker-1",
      }),
    ).rejects.toThrow("independent reviewer")

    mockedDb.matchRecord.create.mockResolvedValueOnce({ id: "approved-match-1" })
    await expect(
      approveManualMatch({
        organizationId: "org-1",
        proposedMatchId: "proposed-match-1",
        approvedById: "checker-1",
        correlationId: "corr-approve",
      }),
    ).resolves.toMatchObject({ matchId: "approved-match-1", correlationId: "corr-approve" })
  })
})
