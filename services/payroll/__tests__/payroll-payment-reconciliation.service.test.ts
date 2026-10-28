jest.mock("server-only", () => ({}));
jest.mock("../payment-settlement-authority", () => ({ payrollSettlementAuthority: jest.fn() }));
import { payrollSettlementAuthority } from "../payment-settlement-authority";

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  recordCloseCertificationInvalidationsForSourceInTx: jest.fn(),
}));

jest.mock("@/services/accounting/data-trust.service", () => ({
  getAccountantPortalData: jest.fn(),
}));

jest.mock("@/services/controls/sensitive-action.service", () => ({
  auditSensitiveActionDecision: jest.fn(),
  assertSensitiveActionAllowed: jest.fn(),
  evaluateSensitiveAction: jest.fn(),
}));

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "payroll-payment-settlement-hash"),
  markBusinessEventAppliedInTx: jest.fn(),
  recordBusinessEventInTx: jest.fn(),
}));

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
} from "@prisma/client";

import { db } from "@/prisma/db";
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors";
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service";
import { getAccountantPortalData } from "@/services/accounting/data-trust.service";
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service";
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";

import {
  getPayrollPaymentReconciliation,
  recordPayrollPaymentSettlementEvidence,
} from "../payment-reconciliation.service";
import { storedRegisterProof, storedMatchProof } from "../payment-settlement-proof";

const mockDb = db as unknown as { $transaction: jest.Mock };
const mockRecordCloseInvalidation =
  recordCloseCertificationInvalidationsForSourceInTx as jest.Mock;
const mockGetAccountantPortalData = getAccountantPortalData as jest.Mock;
const mockEvaluateSensitiveAction = evaluateSensitiveAction as jest.Mock;
const mockAuditSensitiveActionDecision =
  auditSensitiveActionDecision as jest.Mock;
const mockAssertSensitiveActionAllowed =
  assertSensitiveActionAllowed as jest.Mock;
const mockRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock;
const mockMarkBusinessEventAppliedInTx =
  markBusinessEventAppliedInTx as jest.Mock;

const PAYROLL_PAYMENT_PROOF_METADATA = {
  componentRegisterProofHash: "sha256:component-proof",
  componentRegisterProofStatus: "MATCHED",
  payrollComponentMappingHash: "sha256:component-mapping",
  payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
  compositeRegisterProofHash: "sha256:composite-register-proof",
  compositeRegisterProofStatus: "MATCHED",
  yearToDatePolicy: {
    kind: "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY",
    ytdPolicyHash: "sha256:ytd-policy",
  },
  yearToDatePolicyHash: "sha256:ytd-policy",
  yearToDateAccumulatorHashes: ["sha256:ytd-accumulator"],
  paymentAdapterProofHash: "sha256:payment-adapter-proof",
  paymentAdapterRegistryVersion: 1,
  paymentProviderAdapterContractHash: "sha256:payment-adapter-contract",
  paymentAdapterStatus: "MANUAL_PROVIDER_SETTLEMENT_REQUIRED",
  paymentProviderAdapterKey: "BANK_TRANSFER:MANUAL_DISBURSEMENT_FILE",
  providerSettlementProofRequired: true,
  productionPaymentAutomationSupported: false,
  paymentDestinationProofHash: "sha256:payment-destination-proof",
  paymentDestinationProofCount: 1,
  paymentDestinationProofPolicy: "APPROVED_DESTINATION_HASHES_ONLY",
};

const PAYROLL_SETTLEMENT_LIFECYCLE_METADATA = {
  providerSettlementLifecycleContractHash:
    "sha256:payroll-payment-settlement-hash",
  providerSettlementLifecycleStatus: "SETTLED_WITH_PROVIDER_EVIDENCE",
  providerSettlementLifecycleCloseImpact: "CLOSE_EVIDENCE_STALE_ON_CHANGE",
};

const PAYROLL_PROVIDER_RECEIPT_PROOF_METADATA = {
  providerSettlementReceiptProofHash: "sha256:payroll-payment-settlement-hash",
  providerSettlementReceiptProofSource: "MATCHED_PROVIDER_EVENT_AND_STATEMENT",
  providerSettlementReceiptProviderPayloadHash: "sha256:provider-event",
  providerSettlementReceiptProviderSignatureHash: "sha256:signature",
  providerSettlementReceiptStatementLineHash: "sha256:statement-line",
  providerSettlementReceiptStatementFileHash: "sha256:statement-file",
  providerSettlementReceiptReconciliationCertificateHash: null,
};

const SETTLEMENT_REPLAY_PROOF = {
  settlementStatus: "settled",
  settlementAmount: "143700.00",
  currency: "XAF",
  paymentTransactionId: "payment-tx-1",
  providerAccountId: "provider-account-1",
  providerTransactionId: "bank-tx-1",
  providerReference: "PB-2026-06-0001",
  providerEventId: "provider-event-1",
  statementLineId: "statement-line-1",
  statementFileHash: "sha256:statement-file",
  matchRecordId: "match-1",
  reconciliationRunId: "recon-run-1",
  providerSettlementReceiptProofHash: "sha256:payroll-payment-settlement-hash",
};

function payrollAuditProofPack() {
  return {
    kind: "AQSTOQFLOW_PAYROLL_AUDITOR_PROOF_PACK_READ_MODEL",
    version: 1,
    generatedAt: "2026-06-30T10:00:00.000Z",
    scopeHash: "sha256:audit-scope",
    organizationScoped: true,
    redaction: {
      mode: "HASHES_AND_AGGREGATES_ONLY",
      excluded: [
        "employee identifiers",
        "bank and mobile-money details",
        "raw salary rows",
      ],
    },
    certification: {
      trustLevel: "T2",
      verdict: "PARTIAL",
      exportable: false,
      blockerCount: 1,
      criticalBlockerCount: 1,
      highBlockerCount: 0,
    },
    sourceTables: [
      "payroll_payment_batches",
      "payment_transactions",
      "accounting_source_links",
    ],
    aggregateEvidence: {
      paymentRegisterProofGaps: 1,
      paymentsMissingLedger: 0,
    },
    proofGates: [
      {
        gate: "payroll.payments.proof",
        status: "BLOCKED",
        blockerCount: 1,
        blockerIds: ["payroll-payment-register-proof-missing"],
        evidence: ["payroll payment settlement source register hash"],
      },
      {
        gate: "payroll.accounting.source-link",
        status: "PASS",
        blockerCount: 0,
        blockerIds: [],
        evidence: ["accounting source link hashes"],
      },
    ],
    blockers: [
      {
        id: "payroll-payment-register-proof-missing",
        severity: "critical",
        gate: "payroll.payments.proof",
        title: "Payment register proof missing",
      },
    ],
    latestSourceLinks: [
      {
        sourceLinkHash: "sha256:source-link-proof",
        sourceType: "PAYROLL_PAYMENT_BATCH",
        sourceNumber: "PB-2026-06-0001",
        sourceRefHash: "sha256:payment-ref",
        journalEntryNumber: "JE-2026-06",
        postingBatchId: "ledger-payment-1",
        postingStatus: "POSTED",
        createdAt: "2026-06-30T09:20:00.000Z",
      },
    ],
  };
}

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
    metadata: { ledgerStatus: "POSTED", ...PAYROLL_PAYMENT_PROOF_METADATA },
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
  };
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
  };
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
  };
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
  };
}

function buildTx(overrides: Record<string, unknown> = {}) {
  const batch = batchFixture();
  const transaction = transactionFixture();
  return {
    payrollPaymentBatch: {
      findMany: jest.fn().mockResolvedValue([batch]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue(batch),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...batch, ...data }),
        ),
    },
    paymentTransaction: {
      findMany: jest.fn().mockResolvedValue([transaction]),
      findFirst: jest.fn().mockResolvedValue(transaction),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...transaction, ...data }),
        ),
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
    businessEvent: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

describe("payroll payment reconciliation service", () => {
  function guidedFixture() {
    const tx = buildTx();
    const original = batchFixture();
    const batch = batchFixture({ payrollRun: { ...original.payrollRun, organizationId: "org-1", version: 3, currency: "XAF", documentHash: "stored-register", postedBusinessEventId: "run-posted", ledgerPostingBatchId: "run-ledger", deletedAt: null, cancelledAt: null } });
    const transaction = transactionFixture({ providerAccount: { ...transactionFixture().providerAccount, organizationId: "org-1" } });
    const originalMatch = matchFixture();
    const source = { organizationId: "org-1", providerAccountId: "provider-account-1", currencyCode: "XAF", amount: new Prisma.Decimal("143700.00"), archivedAt: null, occurredAt: new Date("2026-06-30") };
    const match = matchFixture({ providerEvent: { ...originalMatch.providerEvent, ...source, status: "PROCESSED", direction: "OUTBOUND" }, statementLine: { ...originalMatch.statementLine, ...source, status: "MATCHED", direction: "DEBIT", statementFile: { ...originalMatch.statementLine.statementFile, organizationId: "org-1", providerAccountId: "provider-account-1", status: "PROCESSED", archivedAt: null } } });
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(batch);
    tx.payrollPaymentBatch.findMany.mockResolvedValue([batch]);
    tx.paymentTransaction.findMany.mockResolvedValue([transaction]);
    tx.matchRecord.findMany.mockResolvedValue([match]);
    tx.matchRecord.findFirst.mockImplementation(({ where }) => Promise.resolve(where.correctionOfId ? null : match));
    const run = storedRegisterProof(batch, batch.payrollRun as never)!;
    const proof = storedMatchProof(batch, transaction as never, match as never)!;
    const input = { organizationId: "org-1", actorId: "controller-1", actorPermissions: ["payroll.payments.reconcile"], payrollPaymentBatchId: "batch-1", evidenceHash: "untrusted", sourceRegisterHash: "untrusted", providerAccountId: "untrusted", idempotencyKey: "guided-1", expectedBalanceEventId: null, settlementAmount: "143700.00", lastAuthAt: "2026-06-30T09:00:00Z", now: "2026-06-30T09:01:00Z",
      proofSelection: { payrollRunId: run.id, runVersion: run.version, runRevision: run.revision, matchRecordId: proof.option.id, matchRevision: proof.option.revision } };
    mockDb.$transaction.mockImplementation(callback => callback(tx));
    return { tx, batch, transaction, match, input };
  }

  it("resolves selected proof in the settlement transaction and ignores client hashes", async () => {
    const { tx, input } = guidedFixture();
    const result = await recordPayrollPaymentSettlementEvidence(input);
    expect(result.idempotent).toBe(false);
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    const event = mockRecordBusinessEventInTx.mock.calls[0][1];
    expect(event.payload.sourceRegisterHash).toBe("stored-register");
    expect(event.payload.inputEvidenceHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(tx.paymentTransaction.update.mock.calls[0][0].data.providerAccountId).toBe("provider-account-1");
  });
  it("requires an explicitly reviewed balance for guided commands", async () => {
    const { tx, input } = guidedFixture();
    await expect(recordPayrollPaymentSettlementEvidence({ ...input, expectedBalanceEventId: undefined })).rejects.toThrow("explicitly reviewed");
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
  });

  it.each(["P2034", "40001", "40P01"])("rechecks persisted authority after %s retry and denies before economic writes", async code => {
    const { tx, input } = guidedFixture();
    const conflict = code === "P2034" ? { code } : { code: "P2010", meta: { code } };
    jest.mocked(payrollSettlementAuthority).mockRejectedValueOnce(conflict).mockRejectedValueOnce(new ForbiddenError("Revoked before retry"));
    await expect(recordPayrollPaymentSettlementEvidence(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockDb.$transaction).toHaveBeenCalledTimes(2);
    expect(payrollSettlementAuthority).toHaveBeenCalledTimes(2);
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("uses persisted permissions and time instead of caller snapshots for sensitive controls", async () => {
    const { input } = guidedFixture();
    await recordPayrollPaymentSettlementEvidence({ ...input, actorPermissions: ["*"], now: "2000-01-01", lastAuthAt: "2099-01-01" });
    expect(mockEvaluateSensitiveAction).toHaveBeenCalledWith(expect.objectContaining({ actorPermissions: ["payroll.payments.reconcile"], now: new Date("2026-06-30T09:01:00Z"), lastAuthAt: new Date("2026-06-30T09:00:00Z") }));
    expect(jest.mocked(payrollSettlementAuthority).mock.calls.map(call => call[2])).toEqual([false, true, true]);
  });

  it("checks authority before disclosing an otherwise valid guided replay", async () => {
    const { tx, batch, input } = guidedFixture();
    await recordPayrollPaymentSettlementEvidence(input);
    tx.payrollPaymentBatch.findFirst.mockResolvedValue({ ...batch, metadata: tx.payrollPaymentBatch.update.mock.calls[0][0].data.metadata });
    tx.paymentTransaction.update.mockClear();
    jest.mocked(payrollSettlementAuthority).mockRejectedValueOnce(new ForbiddenError("Revoked"));
    await expect(recordPayrollPaymentSettlementEvidence(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
  });

  it("replays recorded guided commands before reevaluating changed source eligibility", async () => {
    const { tx, batch, input } = guidedFixture();
    await recordPayrollPaymentSettlementEvidence(input);
    const saved = tx.payrollPaymentBatch.update.mock.calls[0][0].data.metadata;
    tx.payrollPaymentBatch.findFirst.mockResolvedValue({ ...batch, status: "SETTLED", metadata: saved, payrollRun: { ...batch.payrollRun, documentHash: null } });
    tx.matchRecord.findFirst.mockClear(); tx.paymentTransaction.update.mockClear();
    expect((await recordPayrollPaymentSettlementEvidence(input)).idempotent).toBe(true);
    expect(tx.matchRecord.findFirst).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
  });

  it.each(["revision", "correction", "foreign-source"])("rejects guided %s changes before writes", async kind => {
    const { tx, input, match } = guidedFixture();
    if (kind === "revision") input.proofSelection.matchRevision = "stale";
    if (kind === "correction") tx.matchRecord.findFirst.mockImplementation(({ where }) => Promise.resolve(where.correctionOfId ? { id: "correction" } : match));
    if (kind === "foreign-source") tx.matchRecord.findFirst.mockImplementation(({ where }) => Promise.resolve(where.correctionOfId ? null : { ...match, providerEvent: { ...match.providerEvent, organizationId: "foreign" } }));
    await expect(recordPayrollPaymentSettlementEvidence(input)).rejects.toThrow();
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("does not expose selector records to readers lacking proof redaction authority", async () => {
    const { tx } = guidedFixture();
    const result = await getPayrollPaymentReconciliation({ organizationId: "org-1", actorId: "reader", actorPermissions: ["payroll.command.read"] }, tx as never);
    expect(result.batches[0].proofOptions).toEqual({ register: null, matches: [] });
  });

  it("loads all evidence through a unique legacy source-linked transaction", async () => {
    const tx = buildTx();
    tx.payrollPaymentBatch.findMany.mockResolvedValue([batchFixture({ paymentTransactionId: null })]);
    await getPayrollPaymentReconciliation({ organizationId: "org-1", actorPermissions: ["payments.reconciliation.read"] }, tx as never);
    for (const query of [tx.matchRecord.findMany, tx.suspenseItem.findMany]) {
      expect(query).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", paymentTransactionId: { in: ["payment-tx-1"] } }) }));
    }
    expect(tx.paymentReconciliationInboxItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{correlationId:{in:["payment-tx-1"]}},{externalId:{in:["payment-tx-1"]}}] }) }));
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled();
  });
  it.each(["duplicate", "wrong-source"])("rejects %s transaction linkage in the read model", async kind => {
    const tx=buildTx();
    tx.paymentTransaction.findMany.mockResolvedValue(kind === "duplicate" ? [transactionFixture(), transactionFixture({id:"another"})] : [transactionFixture({sourceId:"another-batch"})]);
    await expect(getPayrollPaymentReconciliation({organizationId:"org-1",actorPermissions:["payments.reconciliation.read"]},tx as never)).rejects.toThrow(/transaction/i);
  });
  it("rejects ambiguous source-linked transactions before settlement mutation", async () => {
    const tx=buildTx();
    tx.paymentTransaction.findMany.mockResolvedValue([transactionFixture(),transactionFixture({id:"another"})]);
    mockDb.$transaction.mockImplementation(callback=>callback(tx));
    await expect(recordPayrollPaymentSettlementEvidence({organizationId:"org-1",payrollPaymentBatchId:"batch-1",actorId:"controller-1",actorPermissions:["payroll.payments.reconcile"],lastAuthAt:"2026-06-30T09:00:00.000Z",now:"2026-06-30T09:01:00.000Z",matchRecordId:"match-1",evidenceHash:"proof",sourceRegisterHash:"register",idempotencyKey:"ambiguous"})).rejects.toThrow(/transaction/i);
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
  });
  it("keeps newly blocked partial payments out of the settlement form", async () => {
    const tx = buildTx();
    tx.payrollPaymentBatch.findMany.mockResolvedValue([batchFixture({ status: PayrollPaymentBatchStatus.PARTIALLY_SETTLED })]);
    tx.paymentException.findMany.mockResolvedValue([exceptionFixture({ type: PaymentExceptionType.SIGNATURE_FAILURE })]);
    const result = await getPayrollPaymentReconciliation({ organizationId: "org-1", actorPermissions: ["payments.reconciliation.read", "payroll.payslips.read", "payroll.payments.reconcile"] }, tx as never);
    expect(result.batches[0].derivedState).toBe("EXCEPTION_OPEN");
    expect(result.batches[0].settlement.canRecord).toBe(false);
  });
  it("allows the released-batch evidence gap to progress only with its approved matching evidence", async () => {
    const tx = buildTx();
    const result = await getPayrollPaymentReconciliation({ organizationId: "org-1", actorId: "controller-1", actorPermissions: ["payments.reconciliation.read", "payroll.payslips.read", "payroll.payments.reconcile"] }, tx as never);
    expect(result.batches[0].derivedState).toBe("READY_TO_SETTLE");
    expect(result.batches[0].settlement.canRecord).toBe(true);
    tx.matchRecord.findMany.mockResolvedValue([]);
    const unmatched = await getPayrollPaymentReconciliation({ organizationId: "org-1", actorPermissions: ["payments.reconciliation.read", "payroll.payslips.read", "payroll.payments.reconcile"] }, tx as never);
    expect(unmatched.batches[0].settlement.canRecord).toBe(false);
  });
  it.each(["SIGNATURE_FAILURE", "TAMPER_SIGNAL", "AMOUNT_MISMATCH"])("does not clear %s with ordinary settlement evidence", async type => {
    const tx = buildTx();
    tx.paymentException.findMany.mockResolvedValue([exceptionFixture({ type })]);
    mockDb.$transaction.mockImplementation(callback => callback(tx));
    await expect(recordPayrollPaymentSettlementEvidence({ organizationId: "org-1", payrollPaymentBatchId: "batch-1", actorId: "controller-1", actorPermissions: ["payroll.payments.reconcile"], lastAuthAt: "2026-06-30T09:00:00.000Z", now: "2026-06-30T09:01:00.000Z", settlementStatus: "settled", matchRecordId: "match-1", evidenceHash: "proof", sourceRegisterHash: "register", idempotencyKey: "blocked" })).rejects.toThrow(/exception/i);
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.paymentException.updateMany).not.toHaveBeenCalled();
  });
  it("does not settle while a linked suspense obligation is open", async () => {
    const tx = buildTx();
    tx.suspenseItem.findMany.mockResolvedValue([{ id: "suspense", status: "OPEN" }]);
    mockDb.$transaction.mockImplementation(callback => callback(tx));
    await expect(recordPayrollPaymentSettlementEvidence({ organizationId: "org-1", payrollPaymentBatchId: "batch-1", actorId: "controller-1", actorPermissions: ["payroll.payments.reconcile"], lastAuthAt: "2026-06-30T09:00:00.000Z", now: "2026-06-30T09:01:00.000Z", settlementStatus: "settled", matchRecordId: "match-1", evidenceHash: "proof", sourceRegisterHash: "register", idempotencyKey: "suspense" })).rejects.toThrow(/suspense/i);
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
  });
  it("rejects current persisted authority denial before loading records", async () => {
    const tx=buildTx();
    jest.mocked(payrollSettlementAuthority).mockRejectedValueOnce(new ForbiddenError("Current authority denied"));
    await expect(recordPayrollPaymentSettlementEvidence({organizationId:'org-1',payrollPaymentBatchId:'batch-1',actorId:'controller-1',actorPermissions:['payroll.payments.reconcile'],moduleDecision:{allowed:true,entitlement:{readOnly:true}} as never,evidenceHash:'proof',idempotencyKey:'read-only'},tx as never)).rejects.toMatchObject({code:'FORBIDDEN'});
    expect(tx.payrollPaymentBatch.findFirst).not.toHaveBeenCalled();
  });
  it.each(['-1', '0', '143701', 'NaN', 'Infinity', '1.001'])('rejects invalid settlement amount %s before mutation', async settlementAmount => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation(callback => callback(tx));
    await expect(recordPayrollPaymentSettlementEvidence({
      organizationId: 'org-1', payrollPaymentBatchId: 'batch-1',
      actorId: 'controller-1', actorPermissions: ['payroll.payments.reconcile'],
      lastAuthAt: '2026-06-30T09:00:00.000Z', now: '2026-06-30T09:01:00.000Z',
      settlementStatus: 'settled', settlementAmount, matchRecordId: 'match-1',
      evidenceHash: 'sha256:input', sourceRegisterHash: 'sha256:register', idempotencyKey: 'invalid-amount',
    })).rejects.toThrow();
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(payrollSettlementAuthority).mockReset().mockResolvedValue({ permissions: ["payroll.payments.reconcile"], now: new Date("2026-06-30T09:01:00Z"), lastAuthAt: new Date("2026-06-30T09:00:00Z") });
    mockDb.$transaction.mockImplementation((callback) => callback(buildTx()));
    mockEvaluateSensitiveAction.mockReturnValue({
      allowed: true,
      reasonCode: "ALLOWED",
      policy: { auditAction: "PAYROLL_PAYMENT_RECONCILIATION_CONTROL" },
      detectorInputs: {},
      input: {},
    });
    mockAuditSensitiveActionDecision.mockResolvedValue({
      id: "control-audit-1",
    });
    mockAssertSensitiveActionAllowed.mockImplementation((decision) => decision);
    mockRecordBusinessEventInTx.mockResolvedValue({
      event: { id: "event-1" },
      created: true,
    });
    mockMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1" });
    mockRecordCloseInvalidation.mockResolvedValue([]);
    mockGetAccountantPortalData.mockResolvedValue({
      payrollAuditProofPack: payrollAuditProofPack(),
    });
  });

  it("builds a server-owned reconciliation read model with payment evidence links", async () => {
    const tx = buildTx();
    tx.paymentException.findMany.mockResolvedValue([]);

    const result = await getPayrollPaymentReconciliation(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: [
          "payments.reconciliation.read",
          "payments.reconciliation.exception.resolve",
          "payroll.payslips.read",
        ],
        limit: 10,
      },
      tx as never,
    );

    expect(result.summary.readyToSettle).toBe(1);
    expect(result.batches[0].settlement).toEqual({remainingAmount:"143700.00",revision:null,availability:"verified",canRecord:false});
    expect(result.redaction.proofIdentifiers).toEqual(
      expect.objectContaining({
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-proof-hidden-identifier-policy",
      }),
    );
    expect(result.batches[0]).toMatchObject({
      id: "batch-1",
      amount: "143700.00",
      derivedState: "READY_TO_SETTLE",
      paymentTransaction: expect.objectContaining({
        id: "payment-tx-1",
        providerReference: "PB-2026-06-0001",
      }),
    });
    expect(result.batches[0].matches[0]).toMatchObject({
      id: "match-1",
      statementFileHash: "sha256:statement-file",
    });
    expect(result.batches[0].proof).toEqual(
      expect.objectContaining({
        componentRegisterProofHash: "sha256:component-proof",
        componentRegisterProofStatus: "MATCHED",
        payrollComponentMappingHash: "sha256:component-mapping",
        payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
        compositeRegisterProofHash: "sha256:composite-register-proof",
        compositeRegisterProofStatus: "MATCHED",
        compositeRegisterProofPresent: true,
        yearToDatePolicyHash: "sha256:ytd-policy",
        yearToDateAccumulatorHashes: ["sha256:ytd-accumulator"],
        paymentAdapterProofHash: "sha256:payment-adapter-proof",
        paymentProviderAdapterContractHash: "sha256:payment-adapter-contract",
        paymentAdapterStatus: "MANUAL_PROVIDER_SETTLEMENT_REQUIRED",
        paymentProviderAdapterKey: "BANK_TRANSFER:MANUAL_DISBURSEMENT_FILE",
        adapterChaosReleaseGateHash: null,
        productionPaymentAutomationSupported: false,
      }),
    );
    expect(mockGetAccountantPortalData).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        periodId: "acct-period-1",
        limit: 10,
      },
      tx,
      expect.any(Date),
    );
    expect(result.accountingAuditProof).toEqual(
      expect.objectContaining({
        available: true,
        status: "BLOCKED",
        periodId: "acct-period-1",
        trustLevel: "T2",
        verdict: "PARTIAL",
        proofGateCount: 2,
        sourceLinkCount: 1,
        redactionMode: "HASHES_AND_AGGREGATES_ONLY",
      }),
    );
    expect(result.sourceScope).toEqual(
      expect.objectContaining({
        limit: 10,
        returned: 1,
        coverageComplete: true,
        accountingAuditProofAvailable: true,
        accountingAuditProofGateCount: 2,
        accountingAuditProofSourceLinkCount: 1,
        accountingAuditProofPeriodId: "acct-period-1",
        returnedAccountingPeriodIds: ["acct-period-1"],
        accountingAuditProofCoverageComplete: true,
      }),
    );
    expect(JSON.stringify(result.accountingAuditProof)).not.toContain(
      "EMP-001",
    );
    expect(JSON.stringify(result.accountingAuditProof)).not.toContain(
      "Alice Ngono",
    );
    expect(JSON.stringify(result.accountingAuditProof)).not.toContain(
      "providerReference",
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_PAYMENT_RECONCILIATION_READ",
        }),
      }),
    );
  });

  it("redacts payment proof identifiers for command readers without proof permissions", async () => {
    const tx = buildTx();
    tx.paymentException.findMany.mockResolvedValue([]);

    const result = await getPayrollPaymentReconciliation(
      {
        organizationId: "org-1",
        actorId: "command-reader-1",
        actorPermissions: ["payroll.command.read"],
        limit: 10,
      },
      tx as never,
    );

    expect(result.summary.readyToSettle).toBe(1);
    expect(result.redaction.proofIdentifiers).toEqual(
      expect.objectContaining({
        allowed: false,
        mode: "redact",
        reasonCode: "MISSING_PERMISSION",
        policy: "kontava-proof-hidden-identifier-policy",
      }),
    );
    expect(result.batches[0]).toMatchObject({
      derivedState: "READY_TO_SETTLE",
      paymentTransactionId: "[REDACTED:IDENTIFIER]",
      evidenceHash: "[REDACTED:IDENTIFIER]",
      documentHash: "[REDACTED:IDENTIFIER]",
      bankFileHash: "[REDACTED:IDENTIFIER]",
      paymentTransaction: expect.objectContaining({
        providerReference: "[MASKED:PAYMENT]",
        payloadHash: "[REDACTED:IDENTIFIER]",
      }),
    });
    expect(result.batches[0].matches[0]).toMatchObject({
      providerEventId: "[REDACTED:IDENTIFIER]",
      statementLineId: "[REDACTED:IDENTIFIER]",
      statementFileHash: "[REDACTED:IDENTIFIER]",
    });
    expect(result.batches[0].proof).toEqual(
      expect.objectContaining({
        componentRegisterProofHash: "[REDACTED:IDENTIFIER]",
        payrollComponentMappingHash: "[REDACTED:IDENTIFIER]",
        compositeRegisterProofHash: "[REDACTED:IDENTIFIER]",
        compositeRegisterProofStatus: "MATCHED",
        compositeRegisterProofPresent: true,
        yearToDatePolicyHash: "[REDACTED:IDENTIFIER]",
        yearToDateAccumulatorHashes: ["[REDACTED:IDENTIFIER]"],
        paymentAdapterProofHash: "[REDACTED:IDENTIFIER]",
        paymentProviderAdapterContractHash: "[REDACTED:IDENTIFIER]",
        adapterChaosReleaseGateHash: null,
      }),
    );
    expect(result.batches[0].proof.sourceLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidenceHash: "[REDACTED:IDENTIFIER]" }),
        expect.objectContaining({ payloadHash: "[REDACTED:IDENTIFIER]" }),
      ]),
    );
    expect(JSON.stringify(result.batches[0])).not.toContain(
      "sha256:payment-evidence",
    );
    expect(JSON.stringify(result.batches[0])).not.toContain(
      "sha256:payment-payload",
    );
  });

  it("records settlement evidence, resolves exceptions, and stales close evidence", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

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
      sourceRegisterHash: "sha256:register",
      idempotencyKey: "settlement-key-1",
    });

    expect(result).toMatchObject({
      payrollPaymentBatchId: "batch-1",
      status: PayrollPaymentBatchStatus.SETTLED,
      reconciliationStatus: "SETTLED",
      businessEventId: "event-1",
      settlementEvidenceHash: "sha256:payroll-payment-settlement-hash",
    });
    expect(mockEvaluateSensitiveAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "payroll.payment.reconcile",
        actorId: "controller-1",
        subjectActorId: "releaser-1",
        metadata: expect.objectContaining({
          sourceRegisterHash: "sha256:register",
          ...PAYROLL_PAYMENT_PROOF_METADATA,
          ...PAYROLL_PROVIDER_RECEIPT_PROOF_METADATA,
          ...PAYROLL_SETTLEMENT_LIFECYCLE_METADATA,
        }),
      }),
    );
    expect(tx.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          state: PaymentTransactionState.SETTLED,
          providerTransactionId: "bank-tx-1",
          providerReference: "PB-2026-06-0001",
          settledAt: expect.any(Date),
          metadata: expect.objectContaining({
            ...PAYROLL_PAYMENT_PROOF_METADATA,
            ...PAYROLL_PROVIDER_RECEIPT_PROOF_METADATA,
            ...PAYROLL_SETTLEMENT_LIFECYCLE_METADATA,
            latestPayrollSettlementComponentRegisterProofHash:
              "sha256:component-proof",
            latestPayrollSettlementPayrollComponentMappingHash:
              "sha256:component-mapping",
            latestPayrollSettlementProviderAdapterProofHash:
              "sha256:payment-adapter-proof",
            latestPayrollSettlementProviderAdapterContractHash:
              "sha256:payment-adapter-contract",
            latestPayrollSettlementPaymentDestinationProofHash:
              "sha256:payment-destination-proof",
            latestPayrollSettlementPaymentDestinationProofCount: 1,
            latestPayrollSettlementProviderReceiptProofHash:
              "sha256:payroll-payment-settlement-hash",
            latestPayrollSettlementProviderReceiptProofSource:
              "MATCHED_PROVIDER_EVENT_AND_STATEMENT",
            latestPayrollSettlementProviderReceiptProviderPayloadHash:
              "sha256:provider-event",
            latestPayrollSettlementProviderReceiptStatementLineHash:
              "sha256:statement-line",
            latestPayrollSettlementProviderReceiptStatementFileHash:
              "sha256:statement-file",
            latestPayrollSettlementLifecycleContractHash:
              "sha256:payroll-payment-settlement-hash",
            latestPayrollSettlementLifecycleStatus:
              "SETTLED_WITH_PROVIDER_EVIDENCE",
            latestPayrollSettlementReplayProofHash:
              "sha256:payroll-payment-settlement-hash",
          }),
        }),
      }),
    );
    expect(tx.paymentException.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentExceptionStatus.RESOLVED,
          resolutionNotes: "Resolved by payroll payment settlement evidence.",
          metadata: expect.objectContaining({
            ...PAYROLL_PAYMENT_PROOF_METADATA,
            ...PAYROLL_PROVIDER_RECEIPT_PROOF_METADATA,
            ...PAYROLL_SETTLEMENT_LIFECYCLE_METADATA,
          }),
        }),
      }),
    );
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.payment_batch.reconciled",
        sourceType: "PAYROLL_PAYMENT",
        documentHash: "sha256:payroll-payment-settlement-hash",
        payload: expect.objectContaining({
          sourceRegisterHash: "sha256:register",
          ...PAYROLL_PAYMENT_PROOF_METADATA,
          ...PAYROLL_PROVIDER_RECEIPT_PROOF_METADATA,
          ...PAYROLL_SETTLEMENT_LIFECYCLE_METADATA,
        }),
        metadata: expect.objectContaining({
          ...PAYROLL_PAYMENT_PROOF_METADATA,
          ...PAYROLL_PROVIDER_RECEIPT_PROOF_METADATA,
          ...PAYROLL_SETTLEMENT_LIFECYCLE_METADATA,
        }),
      }),
    );
    const batchUpdateMetadata = tx.payrollPaymentBatch.update.mock.calls[0][0]
      .data.metadata as Record<string, any>;
    expect(batchUpdateMetadata).toEqual(
      expect.objectContaining({
        ...PAYROLL_PAYMENT_PROOF_METADATA,
        ...PAYROLL_SETTLEMENT_LIFECYCLE_METADATA,
        latestSettlementComponentRegisterProofHash: "sha256:component-proof",
        latestSettlementCompositeRegisterProofHash:
          "sha256:composite-register-proof",
        latestSettlementPayrollComponentMappingHash: "sha256:component-mapping",
        latestSettlementProviderAdapterProofHash:
          "sha256:payment-adapter-proof",
        latestSettlementProviderAdapterContractHash:
          "sha256:payment-adapter-contract",
        latestSettlementPaymentDestinationProofHash:
          "sha256:payment-destination-proof",
        latestSettlementPaymentDestinationProofCount: 1,
        latestSettlementProviderReceiptProofHash:
          "sha256:payroll-payment-settlement-hash",
        latestSettlementProviderReceiptProofSource:
          "MATCHED_PROVIDER_EVENT_AND_STATEMENT",
        latestSettlementProviderReceiptProviderPayloadHash:
          "sha256:provider-event",
        latestSettlementProviderReceiptStatementLineHash:
          "sha256:statement-line",
        latestSettlementProviderReceiptStatementFileHash:
          "sha256:statement-file",
        latestSettlementLifecycleContractHash:
          "sha256:payroll-payment-settlement-hash",
        latestSettlementLifecycleStatus: "SETTLED_WITH_PROVIDER_EVIDENCE",
        latestSettlementReplayProofHash:
          "sha256:payroll-payment-settlement-hash",
      }),
    );
    expect(batchUpdateMetadata["settlement:settlement-key-1"]).toEqual(
      expect.objectContaining({
        componentRegisterProofHash: "sha256:component-proof",
        compositeRegisterProofHash: "sha256:composite-register-proof",
        payrollComponentMappingHash: "sha256:component-mapping",
        paymentAdapterProofHash: "sha256:payment-adapter-proof",
        yearToDatePolicyHash: "sha256:ytd-policy",
        yearToDateAccumulatorHashes: ["sha256:ytd-accumulator"],
        paymentProviderAdapterContractHash: "sha256:payment-adapter-contract",
        paymentDestinationProofHash: "sha256:payment-destination-proof",
        paymentDestinationProofCount: 1,
        paymentDestinationProofPolicy: "APPROVED_DESTINATION_HASHES_ONLY",
        providerSettlementReceiptProofHash:
          "sha256:payroll-payment-settlement-hash",
        providerSettlementReceiptProofSource:
          "MATCHED_PROVIDER_EVENT_AND_STATEMENT",
        providerSettlementLifecycleContractHash:
          "sha256:payroll-payment-settlement-hash",
        providerSettlementLifecycleStatus: "SETTLED_WITH_PROVIDER_EVIDENCE",
        settlementReplayProof: SETTLEMENT_REPLAY_PROOF,
        settlementReplayProofHash: "sha256:payroll-payment-settlement-hash",
      }),
    );
    const auditChanges = tx.auditLog.create.mock.calls[0][0].data.changes;
    expect(auditChanges.after).toEqual(
      expect.objectContaining({
        ...PAYROLL_PAYMENT_PROOF_METADATA,
        ...PAYROLL_SETTLEMENT_LIFECYCLE_METADATA,
      }),
    );
    expect(mockRecordCloseInvalidation).toHaveBeenCalledWith(
      tx,
      "org-1",
      expect.objectContaining({
        sourceCode: "PAYROLL_PAYMENT_RECONCILED",
        sourceId: "batch-1",
        newEvidenceHash: "sha256:payroll-payment-settlement-hash",
      }),
      expect.objectContaining({ actorId: "controller-1" }),
    );
  });

  it("replays duplicate provider settlement callbacks without mutating settled evidence", async () => {
    const tx = buildTx();
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(
      batchFixture({
        status: PayrollPaymentBatchStatus.SETTLED,
        reconciliationStatus: "SETTLED",
        metadata: {
          ledgerStatus: "POSTED",
          ...PAYROLL_PAYMENT_PROOF_METADATA,
          "settlement:settlement-key-1": {
            businessEventId: "event-settlement-1",
            inputEvidenceHash: "sha256:settlement-input",
            sourceRegisterHash: "sha256:register",
            settlementEvidenceHash: "sha256:settlement-existing",
            settlementReplayProof: SETTLEMENT_REPLAY_PROOF,
          },
        },
      }),
    );
    tx.paymentTransaction.findMany.mockResolvedValue([transactionFixture({
        state: PaymentTransactionState.SETTLED,
        settledAt: new Date("2026-06-30T09:01:00.000Z"),
      })]);
    tx.paymentException.findMany.mockResolvedValue([]);
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await recordPayrollPaymentSettlementEvidence({
      organizationId: "org-1",
      payrollPaymentBatchId: "batch-1",
      settlementStatus: "settled",
      actorId: "controller-1",
      actorPermissions: ["payroll.payments.reconcile"],
      lastAuthAt: "2026-06-30T09:00:00.000Z",
      now: "2026-06-30T09:02:00.000Z",
      matchRecordId: "match-1",
      evidenceHash: "sha256:settlement-input",
      sourceRegisterHash: "sha256:register",
      idempotencyKey: "settlement-key-1",
    });

    expect(result).toEqual({
      payrollPaymentBatchId: "batch-1",
      payrollRunId: "run-1",
      status: PayrollPaymentBatchStatus.SETTLED,
      reconciliationStatus: "SETTLED",
      paymentTransactionId: "payment-tx-1",
      businessEventId: "event-settlement-1",
      settlementEvidenceHash: "sha256:settlement-existing",
      idempotent: true,
    });
    expect(mockEvaluateSensitiveAction).not.toHaveBeenCalled();
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
    expect(mockRecordCloseInvalidation).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.paymentException.updateMany).not.toHaveBeenCalled();
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate provider settlement callbacks with conflicting proof", async () => {
    const tx = buildTx();
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(
      batchFixture({
        status: PayrollPaymentBatchStatus.SETTLED,
        reconciliationStatus: "SETTLED",
        metadata: {
          ledgerStatus: "POSTED",
          ...PAYROLL_PAYMENT_PROOF_METADATA,
          "settlement:settlement-key-1": {
            businessEventId: "event-settlement-1",
            inputEvidenceHash: "sha256:settlement-input",
            sourceRegisterHash: "sha256:register",
            settlementEvidenceHash: "sha256:settlement-existing",
            settlementReplayProof: SETTLEMENT_REPLAY_PROOF,
          },
        },
      }),
    );
    tx.paymentTransaction.findMany.mockResolvedValue([transactionFixture({
        state: PaymentTransactionState.SETTLED,
        settledAt: new Date("2026-06-30T09:01:00.000Z"),
      })]);
    tx.paymentException.findMany.mockResolvedValue([]);
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      recordPayrollPaymentSettlementEvidence({
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        settlementStatus: "settled",
        actorId: "controller-1",
        actorPermissions: ["payroll.payments.reconcile"],
        lastAuthAt: "2026-06-30T09:00:00.000Z",
        now: "2026-06-30T09:02:00.000Z",
        matchRecordId: "match-1",
        evidenceHash: "sha256:settlement-input",
        sourceRegisterHash: "sha256:other-register",
        idempotencyKey: "settlement-key-1",
      }),
    ).rejects.toThrow("different register proof");

    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.paymentException.updateMany).not.toHaveBeenCalled();
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled();
  });

  it("rejects duplicate provider settlement callbacks with conflicting provider proof", async () => {
    const tx = buildTx();
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(
      batchFixture({
        status: PayrollPaymentBatchStatus.SETTLED,
        reconciliationStatus: "SETTLED",
        metadata: {
          ledgerStatus: "POSTED",
          ...PAYROLL_PAYMENT_PROOF_METADATA,
          "settlement:settlement-key-1": {
            businessEventId: "event-settlement-1",
            inputEvidenceHash: "sha256:settlement-input",
            sourceRegisterHash: "sha256:register",
            settlementEvidenceHash: "sha256:settlement-existing",
            settlementReplayProof: SETTLEMENT_REPLAY_PROOF,
          },
        },
      }),
    );
    tx.paymentTransaction.findFirst.mockResolvedValue(
      transactionFixture({
        state: PaymentTransactionState.SETTLED,
        settledAt: new Date("2026-06-30T09:01:00.000Z"),
      }),
    );
    tx.paymentException.findMany.mockResolvedValue([]);
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      recordPayrollPaymentSettlementEvidence({
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        settlementStatus: "settled",
        actorId: "controller-1",
        actorPermissions: ["payroll.payments.reconcile"],
        lastAuthAt: "2026-06-30T09:00:00.000Z",
        now: "2026-06-30T09:02:00.000Z",
        matchRecordId: "match-1",
        providerTransactionId: "bank-tx-2",
        evidenceHash: "sha256:settlement-input",
        sourceRegisterHash: "sha256:register",
        idempotencyKey: "settlement-key-1",
      }),
    ).rejects.toThrow("different providerTransactionId");

    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.paymentException.updateMany).not.toHaveBeenCalled();
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled();
  });
  it("requires released batch component proof for settlement evidence", async () => {
    const tx = buildTx();
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(
      batchFixture({ metadata: { ledgerStatus: "POSTED" } }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      recordPayrollPaymentSettlementEvidence({
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        settlementStatus: "settled",
        actorId: "controller-1",
        actorPermissions: ["payroll.payments.reconcile"],
        lastAuthAt: "2026-06-30T09:00:00.000Z",
        now: "2026-06-30T09:01:00.000Z",
        matchRecordId: "match-1",
        evidenceHash: "sha256:settlement-input",
        sourceRegisterHash: "sha256:register",
        idempotencyKey: "settlement-key-1",
      }),
    ).rejects.toThrow("component register proof");

    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled();
  });

  it("requires released batch composite register proof for settlement evidence", async () => {
    const tx = buildTx();
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(
      batchFixture({
        metadata: {
          ledgerStatus: "POSTED",
          componentRegisterProofHash: "sha256:component-proof",
          componentRegisterProofStatus: "MATCHED",
          payrollComponentMappingHash: "sha256:component-mapping",
          payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          paymentAdapterProofHash: "sha256:payment-adapter-proof",
          paymentAdapterRegistryVersion: 1,
          paymentProviderAdapterContractHash: "sha256:payment-adapter-contract",
          paymentAdapterStatus: "MANUAL_PROVIDER_SETTLEMENT_REQUIRED",
          paymentProviderAdapterKey: "BANK_TRANSFER:MANUAL_DISBURSEMENT_FILE",
        },
      }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      recordPayrollPaymentSettlementEvidence({
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        settlementStatus: "settled",
        actorId: "controller-1",
        actorPermissions: ["payroll.payments.reconcile"],
        lastAuthAt: "2026-06-30T09:00:00.000Z",
        now: "2026-06-30T09:01:00.000Z",
        matchRecordId: "match-1",
        evidenceHash: "sha256:settlement-input",
        sourceRegisterHash: "sha256:register",
        idempotencyKey: "settlement-key-1",
      }),
    ).rejects.toThrow("composite register proof");

    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled();
  });

  it("requires released batch provider adapter proof for settlement evidence", async () => {
    const tx = buildTx();
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(
      batchFixture({
        metadata: {
          ledgerStatus: "POSTED",
          componentRegisterProofHash: "sha256:component-proof",
          componentRegisterProofStatus: "MATCHED",
          payrollComponentMappingHash: "sha256:component-mapping",
          payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          compositeRegisterProofHash: "sha256:composite-register-proof",
          compositeRegisterProofStatus: "MATCHED",
        },
      }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      recordPayrollPaymentSettlementEvidence({
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        settlementStatus: "settled",
        actorId: "controller-1",
        actorPermissions: ["payroll.payments.reconcile"],
        lastAuthAt: "2026-06-30T09:00:00.000Z",
        now: "2026-06-30T09:01:00.000Z",
        matchRecordId: "match-1",
        evidenceHash: "sha256:settlement-input",
        sourceRegisterHash: "sha256:register",
        idempotencyKey: "settlement-key-1",
      }),
    ).rejects.toThrow("provider adapter proof");

    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled();
  });

  it("requires released batch payment destination proof for settlement evidence", async () => {
    const tx = buildTx();
    tx.payrollPaymentBatch.findFirst.mockResolvedValue(
      batchFixture({
        metadata: {
          ledgerStatus: "POSTED",
          componentRegisterProofHash: "sha256:component-proof",
          componentRegisterProofStatus: "MATCHED",
          payrollComponentMappingHash: "sha256:component-mapping",
          payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
          compositeRegisterProofHash: "sha256:composite-register-proof",
          compositeRegisterProofStatus: "MATCHED",
          yearToDatePolicyHash: "sha256:ytd-policy",
          yearToDateAccumulatorHashes: ["sha256:ytd-accumulator"],
          paymentAdapterProofHash: "sha256:payment-adapter-proof",
          paymentAdapterRegistryVersion: 1,
          paymentProviderAdapterContractHash: "sha256:payment-adapter-contract",
          paymentAdapterStatus: "MANUAL_PROVIDER_SETTLEMENT_REQUIRED",
          paymentProviderAdapterKey: "BANK_TRANSFER:MANUAL_DISBURSEMENT_FILE",
          providerSettlementProofRequired: true,
          productionPaymentAutomationSupported: false,
        },
      }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      recordPayrollPaymentSettlementEvidence({
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        settlementStatus: "settled",
        actorId: "controller-1",
        actorPermissions: ["payroll.payments.reconcile"],
        lastAuthAt: "2026-06-30T09:00:00.000Z",
        now: "2026-06-30T09:01:00.000Z",
        matchRecordId: "match-1",
        evidenceHash: "sha256:settlement-input",
        sourceRegisterHash: "sha256:register",
        idempotencyKey: "settlement-key-1",
      }),
    ).rejects.toThrow("payment destination proof");

    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled();
  });

  it("requires valid provider receipt signature proof for settlement evidence", async () => {
    const tx = buildTx();
    tx.matchRecord.findFirst.mockResolvedValue(
      matchFixture({
        providerEvent: {
          ...matchFixture().providerEvent,
          signatureValid: false,
        },
      }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      recordPayrollPaymentSettlementEvidence({
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        settlementStatus: "settled",
        actorId: "controller-1",
        actorPermissions: ["payroll.payments.reconcile"],
        lastAuthAt: "2026-06-30T09:00:00.000Z",
        now: "2026-06-30T09:01:00.000Z",
        matchRecordId: "match-1",
        evidenceHash: "sha256:settlement-input",
        sourceRegisterHash: "sha256:register",
        idempotencyKey: "settlement-key-1",
      }),
    ).rejects.toThrow("provider receipt signature proof");

    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.payrollPaymentBatch.update).not.toHaveBeenCalled();
  });

  it("requires source register proof for settlement evidence", async () => {
    await expect(
      recordPayrollPaymentSettlementEvidence({
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
      }),
    ).rejects.toThrow("source payroll register hash");
  });

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
        sourceRegisterHash: "sha256:register",
        idempotencyKey: "settlement-key-1",
      }),
    ).rejects.toThrow(BusinessRuleError);
  });
});
