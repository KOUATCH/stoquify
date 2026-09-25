import { ExceptionSeverity, PaymentDirection, SuspenseStatus, SuspenseType, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { postPaymentSuspenseToLedger } from "../payment-suspense-ledger.service"
import { suspenseEvidenceRevision } from "../payment-suspense-evidence"

import {
  approveSuspensePosting,
  assignPaymentSuspenseItem,
} from "../payment-suspense-workflow.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    user: { findFirst: jest.fn() },
    suspenseItem: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    paymentException: {
      updateMany: jest.fn(),
    },
    paymentReconciliationInboxItem: {
      createMany: jest.fn(),
      create: jest.fn(),
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
    businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    closeRun: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    closePackExport: { findFirst: jest.fn(), update: jest.fn() },
  },
}))

jest.mock("../payment-suspense-ledger.service", () => ({
  postPaymentSuspenseToLedger: jest.fn(),
}))

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  $queryRaw: jest.Mock
  user: { findFirst: jest.Mock }
  suspenseItem: { findFirst: jest.Mock; update: jest.Mock }
  paymentException: { updateMany: jest.Mock }
  paymentReconciliationInboxItem: { create: jest.Mock; createMany: jest.Mock }
  ledgerAuditEvent: { create: jest.Mock }
  auditLog: { create: jest.Mock }
  accountingPeriod: { findFirst: jest.Mock }
  chartOfAccount: { findFirst: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  closeRun: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
  closePackExport: { findFirst: jest.Mock; update: jest.Mock }
}
const mockedPostPaymentSuspenseToLedger = postPaymentSuspenseToLedger as jest.Mock

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

function arrangeCertifiedCloseTarget() {
  mockedDb.closeRun.findMany.mockResolvedValue([{ id: "close-run-1", packExports: [{ id: "close-pack-export-1" }] }])
  mockedDb.closeRun.findFirst.mockResolvedValue({
    id: "close-run-1",
    organizationId: "org-1",
    status: "CERTIFIED",
    metadata: null,
  })
  mockedDb.closePackExport.findFirst.mockResolvedValue({ id: "close-pack-export-1", metadata: { mode: "CERTIFIED" } })
}

function suspense(overrides: Record<string, unknown> = {}) {
  return {
    id: "suspense-1",
    updatedAt: new Date("2026-06-14T11:00:00Z"),
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
    paymentExceptions: [{ id: "exception-1", status: "OPEN", metadata: null, updatedAt: new Date("2026-06-14T11:00:00Z") }],
    ...overrides,
  }
}

function reviewedProposalRevision(reason = "Bank line needs suspense handling") {
  return suspenseEvidenceRevision(suspense({ status: SuspenseStatus.RESOLUTION_PROPOSED, metadata: { reclassification: { proposedById: "maker-1", targetType: SuspenseType.UNKNOWN_CREDIT, reason } } }), new Date("2026-06-14T12:00:00Z"))
}

describe("payment suspense workflow service", () => {
  it.each([
    { code: "P2034", meta: undefined },
    { code: "P2010", meta: { code: "40001" } },
    { code: "P2010", meta: { code: "40P01" } },
  ])("returns a reviewable conflict after a posting transaction conflict: $code $meta", async ({ code, meta }) => {
    mockedDb.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Synthetic transaction conflict", { code, clientVersion: "6.19.3", meta }))
    await expect(approveSuspensePosting({ organizationId: "org-1", suspenseItemId: "suspense-1", approvedById: "checker-1",
      expectedEvidenceRevision: `sha256:${"a".repeat(64)}`, control: { actorPermissions: ["payments.reconciliation.suspense.post"] } }))
      .rejects.toMatchObject({ code: "CONFLICT" })
  })
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDb.$transaction.mockImplementation(async (callback) => {
      const tx: Partial<typeof mockedDb> = { ...mockedDb }
      delete tx.$transaction
      return callback(tx)
    })
    mockedDb.$queryRaw.mockResolvedValue([{
      id: "period-1", organizationId: "org-1", status: "OPEN",
      startDate: new Date("2026-06-01"), endDate: new Date("2026-06-30T23:59:59Z"),
    }])
    mockedDb.suspenseItem.findFirst.mockResolvedValue(suspense())
    mockedDb.user.findFirst.mockResolvedValue({ id: "owner-2" })
    mockedDb.suspenseItem.update.mockResolvedValue({ id: "suspense-1", status: SuspenseStatus.ASSIGNED })
    mockedDb.paymentException.updateMany.mockResolvedValue({ count: 1 })
    mockedDb.paymentReconciliationInboxItem.create.mockResolvedValue({ id: "inbox-1" })
    mockedDb.paymentReconciliationInboxItem.createMany.mockResolvedValue({ count: 1 })
    mockedDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" })
    mockedDb.auditLog.create.mockResolvedValue({ id: "audit-1" })
    mockedDb.accountingPeriod.findFirst.mockResolvedValue({ id: "period-1" })
    mockedDb.chartOfAccount.findFirst.mockResolvedValue({ id: "account-47", _count: { children: 0 } })
    mockedDb.businessEvent.findUnique.mockResolvedValue(null)
    mockedDb.businessEvent.create.mockImplementation(async (args) => ({
      id: "business-event-1",
      ...args.data,
      outboxMessages: args.data.outboxMessages.create,
    }))
    mockedDb.businessEvent.update.mockResolvedValue({ id: "business-event-1", status: "APPLIED" })
    mockedDb.closeRun.findMany.mockResolvedValue([])
    mockedDb.closeRun.findFirst.mockResolvedValue(null)
    mockedDb.closeRun.update.mockResolvedValue({ id: "close-run-1" })
    mockedDb.closePackExport.findFirst.mockResolvedValue(null)
    mockedDb.closePackExport.update.mockResolvedValue({ id: "close-pack-export-1" })
    mockedPostPaymentSuspenseToLedger.mockResolvedValue({
      ledgerBatch: { id: "batch-1", status: "POSTED" },
      journalEntry: { id: "journal-1", status: "POSTED" },
      replayed: false,
    })
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
    expect(mockedDb.paymentReconciliationInboxItem.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ idempotencyKey: "payment-reconciliation.exception.assigned:suspense-1:assigned:ledger-audit-1" }) }))
  })

  it("preserves each open exception's evidence metadata and leaves closed exceptions unchanged", async () => {
    const updatedAt = new Date("2026-06-14T11:00:00Z")
    mockedDb.suspenseItem.findFirst.mockResolvedValue(suspense({ paymentExceptions: [
      { id: "exception-1", status: "OPEN", updatedAt, metadata: { sourceReview: { hash: "original" }, assignedById: "prior-assigner" } },
      { id: "exception-2", status: "REOPENED", updatedAt, metadata: { recoveryReceiptId: "retained-receipt" } },
      { id: "exception-3", status: "DISMISSED", updatedAt, metadata: { retainedDecision: true } },
    ] }))
    const result = await assignPaymentSuspenseItem({ organizationId: "org-1", suspenseItemId: "suspense-1", assignedById: "assigner-1", assignedToId: "owner-2", control: { actorPermissions: ["payments.reconciliation.exception.assign"] } })
    expect(result.exceptionCount).toBe(2)
    expect(mockedDb.paymentException.updateMany).toHaveBeenCalledTimes(2)
    expect(mockedDb.paymentException.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ id: "exception-1", organizationId: "org-1", suspenseItemId: "suspense-1", updatedAt }),
      data: expect.objectContaining({ metadata: expect.objectContaining({ sourceReview: { hash: "original" }, assignedById: "assigner-1" }) }),
    }))
    expect(mockedDb.paymentException.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ recoveryReceiptId: "retained-receipt" }) }) }))
  })

  it("rejects a concurrent exception change before recording assignment success", async () => {
    mockedDb.paymentException.updateMany.mockResolvedValueOnce({ count: 0 })
    await expect(assignPaymentSuspenseItem({ organizationId: "org-1", suspenseItemId: "suspense-1", assignedById: "assigner-1", control: { actorPermissions: ["payments.reconciliation.exception.assign"] } })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockedDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentReconciliationInboxItem.createMany).not.toHaveBeenCalled()
  })

  it("rejects unavailable or foreign assignees before changing ownership", async () => {
    mockedDb.user.findFirst.mockResolvedValue(null)
    await expect(assignPaymentSuspenseItem({
      organizationId: "org-1", suspenseItemId: "suspense-1", assignedById: "assigner-1", assignedToId: "foreign-user",
      control: { actorPermissions: ["payments.reconciliation.exception.assign"] },
    })).rejects.toThrow(/assignee.*unavailable/i)
    expect(mockedDb.suspenseItem.update).not.toHaveBeenCalled()
    expect(mockedDb.paymentException.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentReconciliationInboxItem.createMany).not.toHaveBeenCalled()
  })

  it("requires an active same-tenant assignee without disclosing foreign account details", async () => {
    await assignPaymentSuspenseItem({
      organizationId: "org-1", suspenseItemId: "suspense-1", assignedById: "assigner-1", assignedToId: "owner-2",
      control: { actorPermissions: ["payments.reconciliation.exception.assign"] },
    })
    expect(mockedDb.user.findFirst).toHaveBeenCalledWith({
      where: { id: "owner-2", organizationId: "org-1", isActive: true }, select: { id: true },
    })
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
        expectedEvidenceRevision: reviewedProposalRevision(),
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

    expect(mockedPostPaymentSuspenseToLedger).not.toHaveBeenCalled()
  })

  it("rejects a closed period before approving or posting suspense", async () => {
    mockedDb.suspenseItem.findFirst.mockResolvedValue(suspense({
      status: SuspenseStatus.RESOLUTION_PROPOSED,
      metadata: { reclassification: { proposedById: "maker-1", targetType: SuspenseType.UNKNOWN_CREDIT, reason: "Review" } },
    }))
    mockedDb.$queryRaw.mockResolvedValue([{
      id: "period-1", organizationId: "org-1", status: "CLOSED",
      startDate: new Date("2026-06-01"), endDate: new Date("2026-06-30T23:59:59Z"),
    }])
    await expect(approveSuspensePosting({
      expectedEvidenceRevision: reviewedProposalRevision("Review"),
      organizationId: "org-1", suspenseItemId: "suspense-1", approvedById: "checker-1",
      control: { actorPermissions: ["payments.reconciliation.suspense.post"], lastAuthAt: new Date("2026-06-14T12:00:00Z"), now: new Date("2026-06-14T12:00:00Z") },
    })).rejects.toThrow(/not open/i)
    expect(mockedPostPaymentSuspenseToLedger).not.toHaveBeenCalled()
    expect(mockedDb.suspenseItem.update).not.toHaveBeenCalled()
  })

  it("approves proposed suspense posting with independent checker evidence", async () => {
    arrangeCertifiedCloseTarget()
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
      expectedEvidenceRevision: reviewedProposalRevision(),
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
    expect(mockedPostPaymentSuspenseToLedger).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        suspenseItemId: "suspense-1",
        suspenseLedgerAccountId: "account-47",
        actorId: "checker-1",
      }),
      expect.objectContaining({ suspenseItem: mockedDb.suspenseItem }),
    )
    expect(mockedDb.paymentReconciliationInboxItem.create).toHaveBeenCalled()
    expect(mockedDb.paymentReconciliationInboxItem.createMany).toHaveBeenCalled()
    expect(mockedDb.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    })
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "close.certification.invalidated",
          metadata: expect.objectContaining({
            sourceCode: "PAYMENT_SUSPENSE_POSTING",
            sourceTable: "suspense_items",
          }),
        }),
      }),
    )
    expect(mockedDb.closeRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "close-run-1" },
        data: expect.objectContaining({
          status: "BLOCKED",
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              sourceCode: "PAYMENT_SUSPENSE_POSTING",
              sourceId: "suspense-1",
              correlationId: "corr-approve",
            }),
          }),
        }),
      }),
    )
  })
  it("does not mark suspense posted when ledger posting fails", async () => {
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
    mockedPostPaymentSuspenseToLedger.mockRejectedValue(
      new Error("No active posting rule found for PAYMENT_SUSPENSE/SUSPENSE_RECLASSIFICATION"),
    )

    await expect(
      approveSuspensePosting({
        expectedEvidenceRevision: reviewedProposalRevision(),
        organizationId: "org-1",
        suspenseItemId: "suspense-1",
        approvedById: "checker-1",
        control: {
          actorPermissions: ["payments.reconciliation.suspense.post"],
          lastAuthAt: new Date("2026-06-14T12:00:00Z"),
          now: new Date("2026-06-14T12:00:00Z"),
        },
      }),
    ).rejects.toThrow(/No active posting rule/i)

    expect(mockedDb.suspenseItem.update).not.toHaveBeenCalled()
    expect(mockedDb.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentReconciliationInboxItem.createMany).not.toHaveBeenCalled()
  })
})
