import {
  ExceptionSeverity,
  PaymentExceptionType,
  PaymentRailType,
  PaymentReconciliationInboxSource,
  PaymentReconciliationInboxStatus,
  Prisma,
  ProviderAccountStatus,
  ReconciliationRunStatus,
  SuspenseStatus,
  SuspenseType,
} from "@prisma/client"

import { db } from "@/prisma/db"

import { getPaymentReconciliationDashboardData } from "../payment-reconciliation-dashboard.service"
import { publishPaymentReconciliationNotification } from "../payment-reconciliation-notifications"

jest.mock("@/prisma/db", () => ({
  db: {
    providerAccount: { findMany: jest.fn() },
    reconciliationRun: { findMany: jest.fn(), count: jest.fn() },
    suspenseItem: { findMany: jest.fn(), count: jest.fn() },
    paymentException: { findMany: jest.fn(), count: jest.fn() },
    providerEvent: { count: jest.fn() },
    statementLine: { count: jest.fn() },
    paymentReconciliationInboxItem: { findMany: jest.fn() },
  },
}))

jest.mock("../payment-reconciliation-notifications", () => ({
  publishPaymentReconciliationNotification: jest.fn().mockResolvedValue(undefined),
}))

const mockedDb = db as unknown as {
  providerAccount: { findMany: jest.Mock }
  reconciliationRun: { findMany: jest.Mock; count: jest.Mock }
  suspenseItem: { findMany: jest.Mock; count: jest.Mock }
  paymentException: { findMany: jest.Mock; count: jest.Mock }
  providerEvent: { count: jest.Mock }
  statementLine: { count: jest.Mock }
  paymentReconciliationInboxItem: { findMany: jest.Mock }
}

const mockPublishNotification = publishPaymentReconciliationNotification as jest.Mock

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

describe("payment reconciliation dashboard read model", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date("2026-06-14T12:00:00.000Z"))

    mockedDb.providerAccount.findMany.mockResolvedValue([
      {
        id: "provider-account-1",
        displayName: "MTN collections",
        providerCode: "mtn-momo",
        status: ProviderAccountStatus.ACTIVE,
        currencyCode: "XAF",
        paymentRail: { name: "Mobile money", type: PaymentRailType.MOBILE_MONEY },
      },
    ])
    mockedDb.reconciliationRun.count.mockResolvedValue(1)
    mockedDb.suspenseItem.count.mockResolvedValue(1)
    mockedDb.paymentException.count.mockResolvedValue(2)
    mockedDb.providerEvent.count.mockResolvedValue(1)
    mockedDb.statementLine.count.mockResolvedValue(1)
    mockedDb.paymentReconciliationInboxItem.findMany.mockResolvedValue([
      {
        id: "inbox-1",
        source: PaymentReconciliationInboxSource.RECONCILIATION_RUN,
        status: PaymentReconciliationInboxStatus.PROCESSED,
        createdAt: new Date("2026-06-14T10:20:00.000Z"),
        payloadSummary: {
          notification: {
            type: "payment-reconciliation.run.ready-for-signoff",
            severity: "HIGH",
            status: "UNREAD",
          },
          amount: "10000.00",
          currency: "XAF",
          evidenceRef: { reconciliationRunId: "run-1" },
        },
      },
    ])
    mockedDb.reconciliationRun.findMany.mockImplementation(async ({ select }: { select: Record<string, unknown> }) => {
      if ("matchCount" in select) {
        return [
          {
            id: "run-1",
            providerAccountId: "provider-account-1",
            businessDate: new Date("2026-06-14T00:00:00.000Z"),
            status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
            matchCount: 3,
            exceptionCount: 1,
            suspenseAmount: amount(2500),
            signedAt: null,
            certificateHash: null,
          },
        ]
      }

      return [
        {
          id: "run-1",
          providerAccountId: "provider-account-1",
          paymentRailId: "rail-1",
          correlationId: "corr-run-1",
        },
      ]
    })
    mockedDb.suspenseItem.findMany.mockImplementation(async ({ select }: { select: Record<string, unknown> }) => {
      if ("type" in select) {
        return [
          {
            id: "suspense-1",
            providerAccountId: "provider-account-1",
            status: SuspenseStatus.OPEN,
            severity: ExceptionSeverity.HIGH,
            type: SuspenseType.AMOUNT_MISMATCH,
            amount: amount(2500),
            currencyCode: "XAF",
            slaDeadline: new Date("2026-06-15T12:00:00.000Z"),
            correlationId: "corr-suspense-1",
            ownerId: "finance-owner-1",
            suspenseLedgerAccountId: "account-47",
            ledgerPostingBatchId: null,
            resolutionNotes: null,
            postedAt: null,
            metadata: { reclassification: { proposedById: "maker-1" } },
            paymentExceptions: [{ id: "exception-1" }],
          },
        ]
      }

      return [
        {
          id: "suspense-1",
          providerAccountId: "provider-account-1",
          reconciliationRunId: "run-1",
          severity: ExceptionSeverity.HIGH,
          amount: amount(2500),
          currencyCode: "XAF",
          slaDeadline: new Date("2026-06-15T12:00:00.000Z"),
          ownerId: "finance-owner-1",
          correlationId: "corr-suspense-1",
        },
      ]
    })
    mockedDb.paymentException.findMany.mockResolvedValue([
      { type: PaymentExceptionType.AMOUNT_MISMATCH, severity: ExceptionSeverity.CRITICAL },
      { type: PaymentExceptionType.DUPLICATE_PROVIDER_REFERENCE, severity: ExceptionSeverity.HIGH },
    ])
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("returns route-ready evidence, run, exception, and suspense facts without certifying unresolved blockers", async () => {
    const result = await getPaymentReconciliationDashboardData("org-1")

    expect(result.source).toMatchObject({
      mode: "DURABLE_EVIDENCE_KERNEL",
      certificationStatus: "NEEDS_REVIEW",
      organizationScoped: true,
      providerEvidenceAvailable: true,
      statementEvidenceAvailable: true,
    })
    expect(result.summary).toMatchObject({
      providerAccountCount: 1,
      activeProviderAccountCount: 1,
      recentRunCount: 1,
      readyForSignoffCount: 1,
      openExceptionCount: 2,
      criticalExceptionCount: 1,
      openSuspenseCount: 1,
      openSuspenseAmount: 2500,
      closeBlockerCount: 2,
    })
    expect(result.recentRuns).toEqual([
      expect.objectContaining({
        id: "run-1",
        status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
        matchCount: 3,
        exceptionCount: 1,
        suspenseAmount: 2500,
      }),
    ])
    expect(result.suspenseQueue).toEqual([
      expect.objectContaining({
        id: "suspense-1",
        exceptionId: "exception-1",
        amount: 2500,
        proposedById: "maker-1",
      }),
    ])
    expect(result.exceptionGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: `${PaymentExceptionType.AMOUNT_MISMATCH}:${ExceptionSeverity.CRITICAL}`,
          count: 1,
        }),
      ]),
    )
    expect(result.notificationQueue).toEqual([
      expect.objectContaining({
        id: "inbox-1",
        type: "payment-reconciliation.run.ready-for-signoff",
        evidenceRef: expect.objectContaining({ reconciliationRunId: "run-1" }),
      }),
    ])
    expect(mockPublishNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "payment-reconciliation.period-close.blocked",
        organizationId: "org-1",
      }),
    )
  })
})
