jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "authority-execution-hash"),
  recordBusinessEventInTx: jest.fn(),
}));

import {
  PayrollDeclarationEvidenceTransition,
  PayrollDeclarationStatus,
  Prisma,
} from "@prisma/client";

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ConflictError,
} from "@/services/_shared/action-errors";
import { recordBusinessEventInTx } from "@/services/events/business-event.service";

import {
  enqueuePayrollAuthorityAdapterExecution,
  leasePayrollAuthorityAdapterExecutions,
  processPayrollAuthorityAdapterExecution,
  type PayrollAuthorityAdapterExecutionRecord,
} from "../authority-adapter-execution.service";

const mockDb = db as unknown as { $transaction: jest.Mock };
const mockRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock;

const authorityCertificationProofEnvelope = {
  authorityStatusCodeMapHash: "sha256:authority-status-code-map",
  rejectionMappingHash: "sha256:rejection-mapping",
  amendmentMappingHash: "sha256:amendment-mapping",
  paymentDueMappingHash: "sha256:payment-due-mapping",
  credentialRotationProofHash: "sha256:credential-rotation",
  credentialScopeProofHash: "sha256:credential-scope",
  idempotencyReplayFixtureHash: "sha256:idempotency-replay",
  duplicateResponseFixtureHash: "sha256:duplicate-response",
  duplicateTerminalResponseReplayFixtureHash:
    "sha256:duplicate-terminal-response-replay",
  outageRunbookHash: "sha256:outage-runbook",
  retryPolicyFixtureHash: "sha256:retry-policy",
  deadLetterTriageRunbookHash: "sha256:dead-letter-runbook",
  auditTrailFixtureHash: "sha256:audit-trail",
  redactionFixtureHash: "sha256:redaction-fixture",
  closeImpactRuleHash: "sha256:close-impact",
  legalReviewHash: "sha256:legal-review",
};

const certifiedMetadata = {
  authorityAdapterProofHash: "sha256:authority-proof",
  authorityAdapterContractHash: "sha256:authority-contract",
  authorityAdapterRegistryDecision: "READY_REQUIRES_LIVE_ADAPTER_EXECUTION",
  authorityAdapterCertificationProofComplete: true,
  authorityAdapterCertificationBlockers: [],
  authorityAdapterKey: "CM_CNPS_PRODUCTION_API",
  authorityAdapterProof: {
    authorityAdapterProofHash: "sha256:authority-proof",
    authorityAdapterContractHash: "sha256:authority-contract",
    authorityAdapterRegistryDecision: "READY_REQUIRES_LIVE_ADAPTER_EXECUTION",
    authorityAdapterCertificationProofComplete: true,
    authorityAdapterCertificationBlockers: [],
    authorityAdapterKey: "CM_CNPS_PRODUCTION_API",
    adapterRequestHash: "sha256:adapter-request",
    adapterResponseReceiptHash: "sha256:adapter-receipt",
    payloadMappingHash: "sha256:payload-mapping",
    responseMappingHash: "sha256:response-mapping",
    ...authorityCertificationProofEnvelope,
    credentialProofHash: "sha256:credential-proof",
    authorityCertificationHarnessHash: "sha256:authority-harness",
    authorityCertificationProofEnvelope,
    adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
    adapterIdempotencyKey: "cnps-submit-run-1",
  },
};

function declarationFixture(metadata: Record<string, unknown> = {}) {
  return {
    id: "declaration-1",
    organizationId: "org-1",
    payrollRunId: "run-1",
    authority: "CM_CNPS",
    declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
    status: PayrollDeclarationStatus.SUBMITTED,
    periodStart: new Date("2026-06-01T00:00:00.000Z"),
    periodEnd: new Date("2026-06-30T23:59:59.999Z"),
    dueDate: new Date("2026-07-15T00:00:00.000Z"),
    countryCode: "CM",
    countryPackVersion: "CM-2026.1",
    countryPackSchemaVersion: "country-pack.v1",
    countryPackResolutionHash: "sha256:country-pack",
    amount: new Prisma.Decimal("17150.00"),
    currency: "XAF",
    payloadHash: "sha256:declaration-payload",
    metadata,
    createdAt: new Date("2026-06-30T10:00:00.000Z"),
    updatedAt: new Date("2026-06-30T10:00:00.000Z"),
  };
}

function evidenceFixture(
  overrides: Record<string, unknown> = {},
  declarationMetadata: Record<string, unknown> = {},
) {
  return {
    id: "evidence-1",
    organizationId: "org-1",
    declarationId: "declaration-1",
    transition: PayrollDeclarationEvidenceTransition.SUBMIT,
    previousStatus: PayrollDeclarationStatus.PREPARED,
    nextStatus: PayrollDeclarationStatus.SUBMITTED,
    authority: "CM_CNPS",
    declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
    countryCode: "CM",
    countryPackVersion: "CM-2026.1",
    countryPackResolutionHash: "sha256:country-pack-resolution",
    authorityChannel: "CNPS_API",
    authorityEnvironment: "PRODUCTION_API",
    authorityReference: "CNPS-API-REF-1",
    authorityStatus: "SUBMITTED",
    submittedAt: new Date("2026-06-30T10:00:00.000Z"),
    submittedById: null,
    approvedById: "approver-1",
    evidenceCapturedById: "controller-1",
    evidenceHash: "sha256:evidence",
    submittedPayloadHash: "sha256:submitted-payload",
    authorityResponseHash: "sha256:authority-response",
    portalReceiptHash: null,
    supportingFileHash: null,
    sourceRegisterHash: "sha256:register",
    countryPackResolutionHash: "sha256:country-pack",
    automationCapabilityStatus: "PRODUCTION_ADAPTER_READY",
    productionSubmissionSupported: true,
    notes: null,
    idempotencyKey: "submit-certified-key-1",
    metadata: certifiedMetadata,
    createdAt: new Date("2026-06-30T10:01:00.000Z"),
    declaration: declarationFixture(declarationMetadata),
    ...overrides,
  };
}

function queuedExecution(
  overrides: Partial<PayrollAuthorityAdapterExecutionRecord> = {},
): PayrollAuthorityAdapterExecutionRecord {
  return {
    kind: "AQSTOQFLOW_PAYROLL_AUTHORITY_ADAPTER_EXECUTION",
    version: 1,
    status: "PENDING",
    idempotencyKey: "queue-key-1",
    declarationId: "declaration-1",
    declarationEvidenceId: "evidence-1",
    evidenceHash: "sha256:evidence",
    authority: "CM_CNPS",
    declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
    authorityChannel: "CNPS_API",
    authorityEnvironment: "PRODUCTION_API",
    authorityReference: "CNPS-API-REF-1",
    authorityAdapterKey: "CM_CNPS_PRODUCTION_API",
    authorityAdapterProofHash: "sha256:authority-proof",
    authorityAdapterContractHash: "sha256:authority-contract",
    authorityAdapterRegistryDecision: "READY_REQUIRES_LIVE_ADAPTER_EXECUTION",
    requestHash: "sha256:adapter-request",
    responseHash: "sha256:authority-response",
    receiptHash: "sha256:adapter-receipt",
    sourceRegisterHash: "sha256:register",
    submittedPayloadHash: "sha256:submitted-payload",
    payloadMappingHash: "sha256:payload-mapping",
    responseMappingHash: "sha256:response-mapping",
    credentialProofHash: "sha256:credential-proof",
    adapterRequestHash: "sha256:adapter-request",
    adapterResponseReceiptHash: "sha256:adapter-receipt",
    adapterIdempotencyKey: "cnps-submit-run-1",
    adapterAttempt: 1,
    authorityCertificationHarnessHash: "sha256:authority-harness",
    authorityCertificationProofEnvelope,
    adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
    correlationId: "sha256:authority-execution-hash",
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: "2026-06-30T10:05:00.000Z",
    leasedAt: null,
    leasedUntil: null,
    leasedBy: null,
    submittedAt: null,
    completedAt: null,
    errorCode: null,
    errorMessage: null,
    rejectionReason: null,
    responseSummary: null,
    nextEvidenceAction:
      "Persist authority execution outcome and record accept, rejection, payment-due, or amendment evidence as the next controlled declaration transition.",
    redactionPolicy:
      "Authority execution metadata stores hashes, ids, and redacted summaries only; no raw salary, employee identity, credential secret, or authority payload is stored.",
    ...overrides,
  };
}

function buildTx(evidence = evidenceFixture()) {
  return {
    payrollDeclarationEvidence: {
      findFirst: jest.fn().mockResolvedValue(evidence),
    },
    payrollDeclaration: {
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...evidence.declaration, ...data }),
        ),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  };
}

describe("payroll authority adapter execution service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordBusinessEventInTx.mockResolvedValue({ event: { id: "event-1" } });
  });

  it("queues certified authority evidence with idempotency, lease, and redacted proof metadata", async () => {
    const tx = buildTx();
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await enqueuePayrollAuthorityAdapterExecution({
      organizationId: "org-1",
      declarationEvidenceId: "evidence-1",
      actorId: "controller-1",
      idempotencyKey: "queue-key-1",
      now: "2026-06-30T10:05:00.000Z",
    });

    expect(result.idempotent).toBe(false);
    expect(result.execution).toMatchObject({
      status: "PENDING",
      idempotencyKey: "queue-key-1",
      declarationEvidenceId: "evidence-1",
      authorityAdapterProofHash: "sha256:authority-proof",
      authorityAdapterContractHash: "sha256:authority-contract",
      requestHash: "sha256:adapter-request",
      receiptHash: "sha256:adapter-receipt",
      adapterIdempotencyKey: "cnps-submit-run-1",
      adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
    });
    const metadata = tx.payrollDeclaration.update.mock.calls[0][0].data
      .metadata as Record<string, any>;
    expect(metadata.authorityAdapterExecution).toEqual(
      expect.objectContaining({
        status: "PENDING",
        responseSummary: null,
        redactionPolicy: expect.stringContaining("no raw salary"),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_AUTHORITY_ADAPTER_EXECUTION_QUEUED",
        }),
      }),
    );
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.declaration.adapter_execution.queued",
        payload: expect.objectContaining({
          redacted: true,
          requestHash: "sha256:adapter-request",
          adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        }),
        outboxMessages: [
          expect.objectContaining({ channel: "AUTHORITY_SUBMISSION" }),
        ],
      }),
    );
  });

  it("returns idempotent replay for the same queued evidence", async () => {
    const existing = queuedExecution();
    const tx = buildTx(
      evidenceFixture({}, { authorityAdapterExecution: existing }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await enqueuePayrollAuthorityAdapterExecution({
      organizationId: "org-1",
      declarationEvidenceId: "evidence-1",
      idempotencyKey: "queue-key-1",
      now: "2026-06-30T10:05:00.000Z",
    });

    expect(result.idempotent).toBe(true);
    expect(result.execution).toEqual(existing);
    expect(tx.payrollDeclaration.update).not.toHaveBeenCalled();
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("blocks uncertified authority evidence before queueing", async () => {
    const tx = buildTx(
      evidenceFixture({ productionSubmissionSupported: false }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      enqueuePayrollAuthorityAdapterExecution({
        organizationId: "org-1",
        declarationEvidenceId: "evidence-1",
        idempotencyKey: "queue-key-1",
      }),
    ).rejects.toThrow(BusinessRuleError);
    expect(tx.payrollDeclaration.update).not.toHaveBeenCalled();
  });

  it("rejects conflicting queue idempotency on the same declaration", async () => {
    const existing = queuedExecution({ idempotencyKey: "other-key" });
    const tx = buildTx(
      evidenceFixture({}, { authorityAdapterExecution: existing }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      enqueuePayrollAuthorityAdapterExecution({
        organizationId: "org-1",
        declarationEvidenceId: "evidence-1",
        idempotencyKey: "queue-key-1",
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("leases due queued executions without touching immutable evidence rows", async () => {
    const execution = queuedExecution({
      nextAttemptAt: "2026-06-30T10:00:00.000Z",
    });
    const declaration = declarationFixture({
      authorityAdapterExecution: execution,
    });
    const client = {
      payrollDeclaration: {
        findMany: jest.fn().mockResolvedValue([declaration]),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...declaration, ...data }),
          ),
      },
    };

    const result = await leasePayrollAuthorityAdapterExecutions(
      {
        organizationId: "org-1",
        leasedBy: "worker-1",
        now: "2026-06-30T10:05:00.000Z",
        leaseSeconds: 120,
      },
      client as never,
    );

    expect(result.executions).toHaveLength(1);
    expect(result.executions[0]).toMatchObject({
      status: "LEASED",
      attempts: 1,
      leasedBy: "worker-1",
      leasedUntil: "2026-06-30T10:07:00.000Z",
    });
    expect(client.payrollDeclaration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "declaration-1" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            authorityAdapterExecution: expect.objectContaining({
              status: "LEASED",
            }),
          }),
        }),
      }),
    );
  });

  it("processes accepted authority outcomes and records redacted execution events", async () => {
    const existing = queuedExecution({
      status: "LEASED",
      attempts: 1,
      leasedBy: "worker-1",
    });
    const tx = buildTx(
      evidenceFixture({}, { authorityAdapterExecution: existing }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await processPayrollAuthorityAdapterExecution({
      organizationId: "org-1",
      declarationEvidenceId: "evidence-1",
      processedBy: "worker-1",
      now: "2026-06-30T10:10:00.000Z",
      outcome: {
        status: "accepted",
        authorityReference: "CNPS-ACCEPTED-1",
        responseHash: "sha256:accepted-response",
        receiptHash: "sha256:accepted-receipt",
        responseSummary: {
          authorityStatus: "ACCEPTED",
          rawPayload: "not stored raw",
        },
      },
    });

    expect(result.execution).toMatchObject({
      status: "ACCEPTED",
      authorityReference: "CNPS-ACCEPTED-1",
      responseHash: "sha256:accepted-response",
      receiptHash: "sha256:accepted-receipt",
      completedAt: "2026-06-30T10:10:00.000Z",
      errorCode: null,
    });
    const metadata = tx.payrollDeclaration.update.mock.calls[0][0].data
      .metadata as Record<string, any>;
    expect(metadata.authorityAdapterExecution.responseSummary).toMatchObject({
      authorityStatus: "ACCEPTED",
      redacted: true,
    });
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.declaration.adapter_execution.processed",
        documentHash: "sha256:accepted-response",
        payload: expect.objectContaining({
          executionStatus: "ACCEPTED",
          redacted: true,
        }),
      }),
    );
  });

  it("schedules retryable authority failures with backoff metadata", async () => {
    const existing = queuedExecution({
      status: "LEASED",
      attempts: 1,
      leasedBy: "worker-1",
    });
    const tx = buildTx(
      evidenceFixture({}, { authorityAdapterExecution: existing }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await processPayrollAuthorityAdapterExecution({
      organizationId: "org-1",
      declarationEvidenceId: "evidence-1",
      processedBy: "worker-1",
      now: "2026-06-30T10:10:00.000Z",
      outcome: {
        status: "retryable_error",
        errorCode: "RATE_LIMITED",
        errorMessage: "Authority rate limit",
        responseHash: "sha256:rate-limit-response",
        retryAfterSeconds: 600,
      },
    });

    expect(result.execution).toMatchObject({
      status: "RETRY_SCHEDULED",
      errorCode: "RATE_LIMITED",
      errorMessage: "Authority rate limit",
      responseHash: "sha256:rate-limit-response",
      nextAttemptAt: "2026-06-30T10:20:00.000Z",
      leasedBy: null,
    });
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.declaration.adapter_execution.retry_scheduled",
        payload: expect.objectContaining({ retryable: true }),
      }),
    );
  });
  it("processes payment-due authority outcomes with receipt proof", async () => {
    const existing = queuedExecution({
      status: "LEASED",
      attempts: 1,
      leasedBy: "worker-1",
    });
    const tx = buildTx(
      evidenceFixture({}, { authorityAdapterExecution: existing }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await processPayrollAuthorityAdapterExecution({
      organizationId: "org-1",
      declarationEvidenceId: "evidence-1",
      processedBy: "worker-1",
      now: "2026-06-30T10:12:00.000Z",
      outcome: {
        status: "payment_due",
        authorityReference: "CNPS-DUE-1",
        responseHash: "sha256:payment-due-response",
        receiptHash: "sha256:payment-due-receipt",
        responseSummary: {
          authorityStatus: "PAYMENT_DUE",
          rawPayload: "not stored raw",
        },
      },
    });

    expect(result.execution).toMatchObject({
      status: "PAYMENT_DUE",
      authorityReference: "CNPS-DUE-1",
      responseHash: "sha256:payment-due-response",
      receiptHash: "sha256:payment-due-receipt",
      completedAt: "2026-06-30T10:12:00.000Z",
      errorCode: null,
      nextEvidenceAction: expect.stringContaining(
        "payment-due lifecycle evidence",
      ),
    });
    const metadata = tx.payrollDeclaration.update.mock.calls[0][0].data
      .metadata as Record<string, any>;
    expect(metadata.authorityAdapterExecution.responseSummary).toMatchObject({
      authorityStatus: "PAYMENT_DUE",
      redacted: true,
    });
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.declaration.adapter_execution.processed",
        documentHash: "sha256:payment-due-response",
        payload: expect.objectContaining({
          executionStatus: "PAYMENT_DUE",
          receiptHash: "sha256:payment-due-receipt",
          redacted: true,
        }),
      }),
    );
  });

  it("processes amendment-required authority outcomes without raw payload leakage", async () => {
    const existing = queuedExecution({
      status: "LEASED",
      attempts: 1,
      leasedBy: "worker-1",
    });
    const tx = buildTx(
      evidenceFixture({}, { authorityAdapterExecution: existing }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await processPayrollAuthorityAdapterExecution({
      organizationId: "org-1",
      declarationEvidenceId: "evidence-1",
      processedBy: "worker-1",
      now: "2026-06-30T10:13:00.000Z",
      outcome: {
        status: "amendment_required",
        authorityReference: "CNPS-AMEND-1",
        responseHash: "sha256:amendment-response",
        receiptHash: "sha256:amendment-receipt",
        amendmentReason: "AUTHORITY_REQUESTED_AMENDED_PAYLOAD",
        responseSummary: {
          authorityStatus: "AMENDMENT_REQUIRED",
          rawPayload: "not stored raw",
        },
      },
    });

    expect(result.execution).toMatchObject({
      status: "AMENDMENT_REQUIRED",
      authorityReference: "CNPS-AMEND-1",
      responseHash: "sha256:amendment-response",
      receiptHash: "sha256:amendment-receipt",
      errorCode: "AMENDMENT_REQUIRED",
      rejectionReason: "AUTHORITY_REQUESTED_AMENDED_PAYLOAD",
      nextEvidenceAction: expect.stringContaining(
        "maker-checker amendment evidence",
      ),
    });
    const serialized = JSON.stringify(result.execution);
    expect(serialized).not.toContain("not stored raw");
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "payroll.declaration.adapter_execution.processed",
        documentHash: "sha256:amendment-response",
        payload: expect.objectContaining({
          executionStatus: "AMENDMENT_REQUIRED",
          receiptHash: "sha256:amendment-receipt",
          redacted: true,
        }),
      }),
    );
  });
  it("returns idempotent replay for duplicate terminal authority responses", async () => {
    const existing = queuedExecution({
      status: "ACCEPTED",
      responseHash: "sha256:accepted-response",
      receiptHash: "sha256:accepted-receipt",
      completedAt: "2026-06-30T10:10:00.000Z",
    });
    const tx = buildTx(
      evidenceFixture({}, { authorityAdapterExecution: existing }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await processPayrollAuthorityAdapterExecution({
      organizationId: "org-1",
      declarationEvidenceId: "evidence-1",
      processedBy: "worker-1",
      now: "2026-06-30T10:20:00.000Z",
      outcome: {
        status: "accepted",
        authorityReference: "CNPS-ACCEPTED-1",
        responseHash: "sha256:accepted-response",
        receiptHash: "sha256:accepted-receipt",
        responseSummary: {
          authorityStatus: "ACCEPTED",
          rawPayload: "duplicate raw",
        },
      },
    });

    expect(result).toMatchObject({
      declarationId: "declaration-1",
      declarationEvidenceId: "evidence-1",
      execution: existing,
      idempotent: true,
    });
    expect(tx.payrollDeclaration.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
  });

  it("rejects duplicate terminal authority responses with conflicting proof", async () => {
    const existing = queuedExecution({
      status: "ACCEPTED",
      responseHash: "sha256:accepted-response",
      receiptHash: "sha256:accepted-receipt",
      completedAt: "2026-06-30T10:10:00.000Z",
    });
    const tx = buildTx(
      evidenceFixture({}, { authorityAdapterExecution: existing }),
    );
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      processPayrollAuthorityAdapterExecution({
        organizationId: "org-1",
        declarationEvidenceId: "evidence-1",
        processedBy: "worker-1",
        now: "2026-06-30T10:21:00.000Z",
        outcome: {
          status: "accepted",
          authorityReference: "CNPS-ACCEPTED-1",
          responseHash: "sha256:different-response",
          receiptHash: "sha256:accepted-receipt",
        },
      }),
    ).rejects.toThrow(BusinessRuleError);
    expect(tx.payrollDeclaration.update).not.toHaveBeenCalled();
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
  });
});
