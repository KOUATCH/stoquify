import { ExceptionSeverity, PaymentDirection, SuspenseStatus, SuspenseType, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { createLedgerPostingBatch } from "@/services/accounting/posting.service"

import {
  approveSuspensePosting,
  assignPaymentSuspenseItem,
} from "../payment-suspense-workflow.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    suspenseItem: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    paymentException: {
      updateMany: jest.fn(),
    },
    paymentReconciliationInboxItem: {
      upsert: jest.fn(),
    },
    ledgerAuditEvent: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    accountingPeriod: {
      findFirst: jest.fn(),
    },
    chartOfAccount: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("@/services/accounting/posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
}))

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  suspenseItem: { findFirst: jest.Mock; update: jest.Mock }
  paymentException: { updateMany: jest.Mock }
  paymentReconciliationInboxItem: { upsert: jest.Mock }
  ledgerAuditEvent: { create: jest.Mock }
  auditLog: { create: jest.Mock }
  accountingPeriod: { findFirst: jest.Mock }
  chartOfAccount: { findFirst: jest.Mock }
}
const mockedCreateLedgerPostingBatch = createLedgerPostingBatch as jest.Mock

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

function suspense(overrides: Record<string, unknown> = {}) {
  return {
    id: "suspense-1",
    organizationId: "org-1",
    providerAccountId: "provider-account-1",
    paymentTransactionId: null,
    reconciliationRunId: "run-1",
    suspenseLedgerAccountId: "account-47",
    ledgerPostingBatchId: null,
    type: SuspenseType.UNKNOWN_CREDIT,
    status: SuspenseStatus.OPEN,
    severity: ExceptionSeverity.HIGH,
    direction: PaymentDirection.INBOUND,
    amount: amount(5000),
    currencyCode: "XAF",
    ownerId: "owner-1",
    slaDeadline: new Date("2026-06-15T00:00:00Z"),
    evidence: null,
    resolutionNotes: null,
    postedAt: null,
    resolvedAt: null,
    correlationId: "corr-existing",
    metadata: null,
    providerAccount: {
      id: "provider-account-1",
      paymentRailId: "rail-1",
      suspenseLedgerAccountId: "account-47",
    },
    reconciliationRun: {
      id: "run-1",
      businessDate: new Date("2026-06-14T00:00:00Z"),
    },
    paymentExceptions: [{ id: "exception-1", status: "OPEN" }],
    ...overrides,
  }
}

describe("payment suspense workflow service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
    mockedDb.suspenseItem.findFirst.mockResolvedValue(suspense())
    mockedDb.suspenseItem.update.mockResolvedValue({ id: "suspense-1", status: SuspenseStatus.ASSIGNED })
    mockedDb.paymentException.updateMany.mockResolvedValue({ count: 1 })
    mockedDb.paymentReconciliationInboxItem.upsert.mockResolvedValue({ id: "inbox-1" })
    mockedDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" })
    mockedDb.auditLog.create.mockResolvedValue({ id: "audit-1" })
    mockedDb.accountingPeriod.findFirst.mockResolvedValue({ id: "period-1" })
    mockedDb.chartOfAccount.findFirst.mockResolvedValue({ id: "account-47", _count: { children: 0 } })
    mockedCreateLedgerPostingBatch.mockResolvedValue({ id: "batch-1" })
  })

  it("assigns a suspense item and delivers an in-app notification", async () => {
    const result = await assignPaymentSuspenseItem({
      organizationId: "org-1",
      suspenseItemId: "suspense-1",
      assignedById: "assigner-1",
      assignedToId: "owner-2",
      control: { actorPermissions: ["payments.reconciliation.exception.assign"] },
      correlationId: "corr-assign",
    })

    expect(result).toMatchObject({
      suspenseItemId: "suspense-1",
      assignedToId: "owner-2",
      exceptionCount: 1,
      correlationId: "corr-assign",
    })
    expect(mockedDb.suspenseItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: "owner-2",
          status: SuspenseStatus.ASSIGNED,
        }),
      }),
    )
    expect(mockedDb.paymentReconciliationInboxItem.upsert).toHaveBeenCalled()
  })

  it("blocks suspense posting approval by the same maker", async () => {
    mockedDb.suspenseItem.findFirst.mockResolvedValue(
      suspense({
        status: SuspenseStatus.RESOLUTION_PROPOSED,
        metadata: {
          reclassification: {
            proposedById: "maker-1",
            targetType: SuspenseType.UNKNOWN_CREDIT,
            reason: "Bank line needs suspense handling",
          },
        },
      }),
    )

    await expect(
      approveSuspensePosting({
        organizationId: "org-1",
        suspenseItemId: "suspense-1",
        approvedById: "maker-1",
        control: {
          actorPermissions: ["payments.reconciliation.suspense.post"],
          lastAuthAt: new Date("2026-06-14T12:00:00Z"),
          now: new Date("2026-06-14T12:00:00Z"),
        },
      }),
    ).rejects.toThrow(/independent approval/i)

    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled()
  })

  it("approves proposed suspense posting with independent checker evidence", async () => {
    mockedDb.suspenseItem.findFirst.mockResolvedValue(
      suspense({
        status: SuspenseStatus.RESOLUTION_PROPOSED,
        metadata: {
          reclassification: {
            proposedById: "maker-1",
            targetType: SuspenseType.UNKNOWN_CREDIT,
            reason: "Bank line needs suspense handling",
          },
        },
      }),
    )

    const result = await approveSuspensePosting({
      organizationId: "org-1",
      suspenseItemId: "suspense-1",
      approvedById: "checker-1",
      control: {
        actorPermissions: ["payments.reconciliation.suspense.post"],
        lastAuthAt: new Date("2026-06-14T12:00:00Z"),
        now: new Date("2026-06-14T12:00:00Z"),
      },
      correlationId: "corr-approve",
    })

    expect(result).toMatchObject({
      suspenseItemId: "suspense-1",
      status: SuspenseStatus.POSTED_TO_SUSPENSE,
      ledgerPostingBatchId: "batch-1",
      inboxItemId: "inbox-1",
      correlationId: "corr-approve",
    })
    expect(mockedCreateLedgerPostingBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        sourceId: "suspense-1",
      }),
      mockedDb,
    )
    expect(mockedDb.paymentReconciliationInboxItem.upsert).toHaveBeenCalled()
  })
})
