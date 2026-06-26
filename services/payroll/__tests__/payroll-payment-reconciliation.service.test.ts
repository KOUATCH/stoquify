jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  recordCloseCertificationInvalidationsForSourceInTx: jest.fn(),
}))

jest.mock("@/services/controls/sensitive-action.service", () => ({
  auditSensitiveActionDecision: jest.fn(),
  assertSensitiveActionAllowed: jest.fn(),
  evaluateSensitiveAction: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "payroll-payment-settlement-hash"),
  markBusinessEventAppliedInTx: jest.fn(),
  recordBusinessEventInTx: jest.fn(),
}))

import {
  ExceptionSeverity,
  MatchRule,
  MatchStatus,
  PaymentDirection,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentMethod,
  PaymentTransactionState,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  getPayrollPaymentReconciliation,
  recordPayrollPaymentSettlementEvidence,
} from "../payment-reconciliation.service"

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockRecordCloseInvalidation = recordCloseCertificationInvalidationsForSourceInTx as jest.Mock
const mockEvaluateSensitiveAction = evaluateSensitiveAction as jest.Mock
const mockAuditSensitiveActionDecision = auditSensitiveActionDecision as jest.Mock
const mockAssertSensitiveActionAllowed = assertSensitiveActionAllowed as jest.Mock
const mockRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock

function batchFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "batch-1",
    organizationId: "org-1",
    payrollRunId: "run-1",
    batchNumber: "PB-2026-06-0001",
    status: PayrollPaymentBatchStatus.RELEASED,
    method: PaymentMethod.BANK_TRANSFER,
    amount: new Prisma.Decimal("143700.00"),
    currency: "XAF",
    paymentDate: new Date("2026-06-30T00:00:00.000Z"),
    idempotencyKey: "release-key-1",
    bankFileHash: "sha256:bank-file",
    documentHash: "sha256:payment-doc",
    evidenceHash: "sha256:payment-evidence",
    requestedById: "requester-1",
    approvedById: "approver-1",
    releasedById: "releaser-1",
    approvedAt: new Date("2026-06-30T00:00:00.000Z"),
    releasedAt: new Date("2026-06-30T00:00:00.000Z"),
    ledgerPostingBatchId: "ledger-payment-1",
    postedBusinessEventId: "event-release-1",
    paymentTransactionId: "payment-tx-1",
    paymentExceptionId: "exception-1",
    reconciliationStatus: "AWAITING_STATEMENT_MATCH",
    notes: null,
    metadata: { ledgerStatus: "POSTED" },
    createdAt: new Date("2026-06-30T00:00:00.000Z"),
    updatedAt: new Date("2026-06-30T00:00:00.000Z"),
    payrollRun: {
      id: "run-1",
      runNumber: "PAY-2026-06",
      status: PayrollRunStatus.PAID,
      payrollPeriod: {
        id: "period-1",
        name: "June 2026",
        accountingPeriodId: "acct-period-1",
        periodStart: new Date("2026-06-01T00:00:00.000Z"),
        periodEnd: new Date("2026-06-30T23:59:59.999Z"),
      },
    },
    allocations: [
      {
        id: "allocation-1",
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        employeeId: "employee-1",
        payslipId: "payslip-1",
        amount: new Prisma.Decimal("143700.00"),
        currency: "XAF",
        metadata: null,
        createdAt: new Date("2026-06-30T00:00:00.000Z"),
        employee: {
          id: "employee-1",
          employeeNumber: "EMP-001",
          displayName: "Alice Ngono",
        },
        payslip: {
          id: "payslip-1",
          payslipNumber: "PS-2026-06-0001",
          status: PayrollPayslipStatus.EMITTED,
          netPayableAmount: new Prisma.Decimal("143700.00"),
          documentHash: "sha256:payslip-doc",
          archiveUri: null,
        },
      },
    ],
    ...overrides,
  }
}

function transactionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-tx-1",
    organizationId: "org-1",
    legacyPaymentId: null,
    providerAccountId: "provider-account-1",
    ledgerPostingBatchId: "ledger-payment-1",
    direction: PaymentDirection.OUTBOUND,
    state: PaymentTransactionState.PENDING,
    amount: new Prisma.Decimal("143700.00"),
    feeAmount: null,
    currencyCode: "XAF",
    providerTransactionId: null,
    providerReference: "PB-2026-06-0001",
    idempotencyKey: "payroll-payment:batch-1:outbound",
    sourceType: "PAYROLL_PAYMENT",
    sourceId: "batch-1",
    payloadHash: "sha256:payment-payload",
    occurredAt: new Date("2026-06-30T00:00:00.000Z"),
    confirmedAt: null,
    settledAt: null,
    correlationId: null,
    metadata: null,
    createdAt: new Date("2026-06-30T00:00:00.000Z"),
    updatedAt: new Date("2026-06-30T00:00:00.000Z"),
    providerAccount: {
      id: "provider-account-1",
      providerCode: "BANK",
      displayName: "Main Bank",
      externalAccountMasked: "****1234",
    },
    ...overrides,
  }
}

function matchFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "match-1",
    organizationId: "org-1",
    providerAccountId: "provider-account-1",
    paymentTransactionId: "payment-tx-1",
    providerEventId: "provider-event-1",
    statementLineId: "statement-line-1",
    reconciliationRunId: "recon-run-1",
    ledgerPostingBatchId: "ledger-payment-1",
    rule: MatchRule.EXACT_PROVIDER_REFERENCE,
    status: MatchStatus.APPROVED,
    confidence: new Prisma.Decimal("100.00"),
    amountMatched: new Prisma.Decimal("143700.00"),
    currencyCode: "XAF",
    matchedById: "controller-1",
    matchedAt: new Date("2026-06-30T09:00:00.000Z"),
    correctionOfId: null,
    correctionReason: null,
    correlationId: null,
    metadata: null,
    createdAt: new Date("2026-06-30T09:00:00.000Z"),
    updatedAt: new Date("2026-06-30T09:00:00.000Z"),
    providerEvent: {
      id: "provider-event-1",
      providerEventId: "evt-1",
      providerTransactionId: "bank-tx-1",
      providerReference: "PB-2026-06-0001",
      rawPayloadHash: "sha256:provider-event",
      signatureHash: "sha256:signature",
      signatureValid: true,
    },
    statementLine: {
      id: "statement-line-1",
      providerTransactionId: "bank-tx-1",
      providerReference: "PB-2026-06-0001",
      rawLineHash: "sha256:statement-line",
      statementFile: {
        id: "statement-file-1",
        fileHash: "sha256:statement-file",
        fileName: "bank-statement.csv",
      },
    },
    reconciliationRun: {
      id: "recon-run-1",
      status: "READY_FOR_SIGNOFF",
      certificateHash: null,
    },
    ...overrides,
  }
}

function exceptionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "exception-1",
    organizationId: "org-1",
    providerAccountId: "provider-account-1",
    paymentTransactionId: "payment-tx-1",
    providerEventId: null,
    statementLineId: null,
    reconciliationRunId: null,
    suspenseItemId: null,
    type: PaymentExceptionType.MISSING_STATEMENT_LINE,
    severity: ExceptionSeverity.MEDIUM,
    status: PaymentExceptionStatus.OPEN,
    ownerId: null,
    sourceType: "PAYROLL_PAYMENT",
    sourceId: "batch-1",
    evidence: null,
    resolutionNotes: null,
    slaDeadline: null,
    escalatedAt: null,
    resolvedAt: null,
    correlationId: "batch-1",
    metadata: null,
    createdAt: new Date("2026-06-30T00:00:00.000Z"),
    updatedAt: new Date("2026-06-30T00:00:00.000Z"),
    ...overrides,
  }
}

function buildTx(overrides: Record<string, unknown> = {}) {
  const batch = batchFixture()
  const transaction = transactionFixture()
  return {
    payrollPaymentBatch: {
      findMany: jest.fn().mockResolvedValue([batch]),
      findFirst: jest.fn().mockResolvedValue(batch),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...batch, ...data })),
    },
    paymentTransaction: {
      findMany: jest.fn().mockResolvedValue([transaction]),
      findFirst: jest.fn().mockResolvedValue(transaction),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...transaction, ...data })),
    },
    paymentException: {
      findMany: jest.fn().mockResolvedValue([exceptionFixture()]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    matchRecord: {
      findMany: jest.fn().mockResolvedValue([matchFixture()]),
      findFirst: jest.fn().mockResolvedValue(matchFixture()),
    },
    suspenseItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    paymentReconciliationInboxItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
    ...overrides,
  }
}

describe("payroll payment reconciliation service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation((callback) => callback(buildTx()))
    mockEvaluateSensitiveAction.mockReturnValue({
      allowed: true,
      reasonCode: "ALLOWED",
      policy: { auditAction: "PAYROLL_PAYMENT_RECONCILIATION_CONTROL" },
      detectorInputs: {},
      input: {},
    })
    mockAuditSensitiveActionDecision.mockResolvedValue({ id: "control-audit-1" })
    mockAssertSensitiveActionAllowed.mockImplementation((decision) => decision)
    mockRecordBusinessEventInTx.mockResolvedValue({ event: { id: "event-1" }, created: true })
    mockMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1" })
    mockRecordCloseInvalidation.mockResolvedValue([])
  })

  it("builds a server-owned reconciliation read model with payment evidence links", async () => {
    const tx = buildTx()
    tx.paymentException.findMany.mockResolvedValue([])

    const result = await getPayrollPaymentReconciliation({
      organizationId: "org-1",
      actorId: "controller-1",
      actorPermissions: [
        "payments.reconciliation.read",
        "payments.reconciliation.exception.resolve",
        "payroll.payslips.read",
      ],
      limit: 10,
    }, tx as never)

    expect(result.summary.readyToSettle).toBe(1)
    expect(result.batches[0]).toMatchObject({
      id: "batch-1",
      amount: "143700.00",
      derivedState: "READY_TO_SETTLE",
      paymentTransaction: expect.objectContaining({
        id: "payment-tx-1",
        providerReference: "PB-2026-06-0001",
      }),
    })
    expect(result.batches[0].matches[0]).toMatchObject({
      id: "match-1",
      statementFileHash: "sha256:statement-file",
    })
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_PAYMENT_RECONCILIATION_READ",
        }),
      }),
    )
  })

  it("records settlement evidence, resolves exceptions, and stales close evidence", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation((callback) => callback(tx))

    const result = await recordPayrollPaymentSettlementEvidence({
      organizationId: "org-1",
      payrollPaymentBatchId: "batch-1",
      settlementStatus: "settled",
      actorId: "controller-1",
      actorPermissions: ["payroll.payments.reconcile"],
      lastAuthAt: "2026-06-30T09:00:00.000Z",
      now: "2026-06-30T09:01:00.000Z",
      matchRecordId: "match-1",
      evidenceHash: "sha256:settlement-input",
      idempotencyKey: "settlement-key-1",
    })

    expect(result).toMatchObject({
      payrollPaymentBatchId: "batch-1",
      status: PayrollPaymentBatchStatus.SETTLED,
      reconciliationStatus: "SETTLED",
      businessEventId: "event-1",
      settlementEvidenceHash: "sha256:payroll-payment-settlement-hash",
    })
    expect(mockEvaluateSensitiveAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "payroll.payment.reconcile",
        actorId: "controller-1",
        subjectActorId: "releaser-1",
      }),
    )
    expect(tx.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          state: PaymentTransactionState.SETTLED,
          settledAt: expect.any(Date),
        }),
      }),
    )
    expect(tx.paymentException.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentExceptionStatus.RESOLVED,
          resolutionNotes: "Resolved by payroll payment settlement evidence.",
        }),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.payment_batch.reconciled",
        sourceType: "PAYROLL_PAYMENT",
        documentHash: "sha256:payroll-payment-settlement-hash",
      }),
    )
    expect(mockRecordCloseInvalidation).toHaveBeenCalledWith(
      tx,
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYROLL_PAYMENT_RECONCILED",
        sourceId: "batch-1",
        newEvidenceHash: "sha256:payroll-payment-settlement-hash",
      }),
      expect.objectContaining({ actorId: "controller-1" }),
    )
  })

  it("blocks cash settlement claims without provider or statement evidence", async () => {
    await expect(
      recordPayrollPaymentSettlementEvidence({
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        settlementStatus: "settled",
        actorId: "controller-1",
        actorPermissions: ["payroll.payments.reconcile"],
        lastAuthAt: "2026-06-30T09:00:00.000Z",
        now: "2026-06-30T09:01:00.000Z",
        evidenceHash: "sha256:settlement-input",
        idempotencyKey: "settlement-key-1",
      }),
    ).rejects.toThrow(BusinessRuleError)
  })
})
