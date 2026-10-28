jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "worker-hash"),
}));

import { db } from "@/prisma/db";

import {
  processPayrollAuthorityAdapterWorkerBatch,
  type PayrollAuthorityAdapter,
} from "../authority-adapter-worker.service";
import type { PayrollAuthorityAdapterExecutionRecord } from "../authority-adapter-execution.service";

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

function queuedExecution(
  overrides: Partial<PayrollAuthorityAdapterExecutionRecord> = {},
): PayrollAuthorityAdapterExecutionRecord {
  return {
    kind: "AQSTOQFLOW_PAYROLL_AUTHORITY_ADAPTER_EXECUTION",
    version: 1,
    status: "LEASED",
    idempotencyKey: "queue-key-1",
    declarationId: "declaration-1",
    declarationEvidenceId: "evidence-1",
    evidenceHash: "sha256:evidence",
    authority: "CM_CNPS",
    declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
    countryCode: "CM",
    countryPackVersion: "CM-2026.1",
    countryPackResolutionHash: "sha256:country-pack-resolution",
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
    correlationId: "sha256:authority-execution-correlation",
    attempts: 1,
    maxAttempts: 5,
    nextAttemptAt: "2026-06-30T10:05:00.000Z",
    leasedAt: "2026-06-30T10:05:00.000Z",
    leasedUntil: "2026-06-30T10:06:00.000Z",
    leasedBy: "worker-1",
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

function lifecycleResult(id = "lifecycle-evidence-1") {
  return {
    evidence: { id },
    businessEventId: `business-event-${id}`,
    idempotent: false,
  };
}

describe("processPayrollAuthorityAdapterWorkerBatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits leased authority execution and records acceptance lifecycle evidence", async () => {
    const execution = queuedExecution();
    const processedExecution = queuedExecution({
      status: "ACCEPTED",
      responseHash: "sha256:accepted-response",
      receiptHash: "sha256:accepted-receipt",
      submittedAt: "2026-06-30T10:10:00.000Z",
      completedAt: "2026-06-30T10:10:00.000Z",
      responseSummary: { redacted: true, authorityStatus: "ACCEPTED" },
    });
    const adapter: PayrollAuthorityAdapter = {
      submit: jest.fn().mockResolvedValue({
        status: "accepted",
        authorityReference: "CNPS-ACCEPT-1",
        responseHash: "sha256:accepted-response",
        receiptHash: "sha256:accepted-receipt",
        responseSummary: { authorityStatus: "ACCEPTED", redacted: true },
      }),
    };
    const leaseExecutions = jest.fn().mockResolvedValue({
      executions: [execution],
    });
    const processExecution = jest.fn().mockResolvedValue({
      execution: processedExecution,
    });
    const recordDeclarationEvidence = jest
      .fn()
      .mockResolvedValue(lifecycleResult("accepted-evidence-1"));

    const result = await processPayrollAuthorityAdapterWorkerBatch(
      {
        organizationId: "org-1",
        workerId: "worker-1",
        actorId: "operator-1",
        actorPermissions: ["payroll.declarations.manage"],
        now: "2026-06-30T10:10:00.000Z",
        lastAuthAt: "2026-06-30T10:09:00.000Z",
      },
      { adapter, leaseExecutions, processExecution, recordDeclarationEvidence },
    );

    expect(leaseExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        leasedBy: "worker-1",
      }),
      db,
    );
    expect(adapter.submit).toHaveBeenCalledWith({
      organizationId: "org-1",
      workerId: "worker-1",
      execution,
      now: new Date("2026-06-30T10:10:00.000Z"),
    });
    expect(processExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        declarationEvidenceId: "evidence-1",
        processedBy: "operator-1",
        outcome: expect.objectContaining({ status: "accepted" }),
      }),
      db,
    );
    expect(recordDeclarationEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        declarationId: "declaration-1",
        transition: "accept",
        authorityStatus: "ACCEPTED_BY_AUTHORITY",
        authorityReference: "CNPS-ACCEPT-1",
        sourceRegisterHash: "sha256:register",
        authorityAdapterReadiness: "SUPPORTED_CERTIFIED",
        payloadMappingHash: "sha256:payload-mapping",
        responseMappingHash: "sha256:response-mapping",
        ...authorityCertificationProofEnvelope,
        credentialProofHash: "sha256:credential-proof",
        adapterRequestHash: "sha256:adapter-request",
        adapterResponseReceiptHash: "sha256:adapter-receipt",
        adapterIdempotencyKey: "cnps-submit-run-1",
        adapterAttempt: 1,
        authorityCertificationHarnessHash: "sha256:authority-harness",
      }),
      db,
    );
    expect(result).toMatchObject({
      leasedCount: 1,
      processedCount: 1,
      results: [
        {
          declarationId: "declaration-1",
          declarationEvidenceId: "evidence-1",
          executionStatus: "ACCEPTED",
          lifecycleTransition: "accept",
          lifecycleEvidenceId: "accepted-evidence-1",
          lifecycleBusinessEventId: "business-event-accepted-evidence-1",
        },
      ],
    });
  });

  it("records rejection lifecycle evidence for rejected authority outcomes", async () => {
    const execution = queuedExecution({ authorityReference: "CNPS-REJECT-1" });
    const processedExecution = queuedExecution({
      authorityReference: "CNPS-REJECT-1",
      status: "REJECTED",
      responseHash: "sha256:rejected-response",
      rejectionReason: "BAD_DECLARATION_PAYLOAD",
      completedAt: "2026-06-30T10:11:00.000Z",
    });
    const adapter: PayrollAuthorityAdapter = {
      submit: jest.fn().mockResolvedValue({
        status: "rejected",
        authorityReference: "CNPS-REJECT-1",
        responseHash: "sha256:rejected-response",
        rejectionReason: "BAD_DECLARATION_PAYLOAD",
        responseSummary: { authorityStatus: "REJECTED", redacted: true },
      }),
    };
    const leaseExecutions = jest
      .fn()
      .mockResolvedValue({ executions: [execution] });
    const processExecution = jest
      .fn()
      .mockResolvedValue({ execution: processedExecution });
    const recordDeclarationEvidence = jest
      .fn()
      .mockResolvedValue(lifecycleResult("rejected-evidence-1"));

    const result = await processPayrollAuthorityAdapterWorkerBatch(
      {
        organizationId: "org-1",
        workerId: "worker-1",
        actorId: "operator-1",
        now: "2026-06-30T10:11:00.000Z",
        lastAuthAt: "2026-06-30T10:10:00.000Z",
      },
      { adapter, leaseExecutions, processExecution, recordDeclarationEvidence },
    );

    expect(recordDeclarationEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        transition: "reject",
        authorityStatus: "REJECTED_BY_AUTHORITY",
        authorityReference: "CNPS-REJECT-1",
        authorityResponseHash: "sha256:rejected-response",
        portalReceiptHash: undefined,
      }),
      db,
    );
    expect(result.results[0]).toMatchObject({
      executionStatus: "REJECTED",
      lifecycleTransition: "reject",
      lifecycleEvidenceId: "rejected-evidence-1",
    });
  });

  it("does not record lifecycle evidence for retryable authority outcomes", async () => {
    const execution = queuedExecution();
    const processedExecution = queuedExecution({
      status: "RETRY_SCHEDULED",
      errorCode: "RATE_LIMITED",
      nextAttemptAt: "2026-06-30T10:20:00.000Z",
    });
    const adapter: PayrollAuthorityAdapter = {
      submit: jest.fn().mockResolvedValue({
        status: "retryable_error",
        errorCode: "RATE_LIMITED",
        errorMessage: "Authority requested retry.",
        responseHash: "sha256:retry-response",
        retryAfterSeconds: 300,
        responseSummary: { authorityStatus: "RETRY_SCHEDULED", redacted: true },
      }),
    };
    const leaseExecutions = jest
      .fn()
      .mockResolvedValue({ executions: [execution] });
    const processExecution = jest
      .fn()
      .mockResolvedValue({ execution: processedExecution });
    const recordDeclarationEvidence = jest.fn();

    const result = await processPayrollAuthorityAdapterWorkerBatch(
      {
        organizationId: "org-1",
        workerId: "worker-1",
        now: "2026-06-30T10:15:00.000Z",
      },
      { adapter, leaseExecutions, processExecution, recordDeclarationEvidence },
    );

    expect(recordDeclarationEvidence).not.toHaveBeenCalled();
    expect(result.results[0]).toMatchObject({
      executionStatus: "RETRY_SCHEDULED",
      lifecycleTransition: null,
      retryAt: "2026-06-30T10:20:00.000Z",
      errorCode: "RATE_LIMITED",
    });
  });

  it("turns unsafe adapter throws into failed redacted execution outcomes", async () => {
    const execution = queuedExecution();
    const processedExecution = queuedExecution({
      status: "FAILED",
      errorCode: "ADAPTER_UNSAFE_ERROR",
      completedAt: "2026-06-30T10:16:00.000Z",
    });
    const adapter: PayrollAuthorityAdapter = {
      submit: jest
        .fn()
        .mockRejectedValue(new Error("raw provider secret stack")),
    };
    const leaseExecutions = jest
      .fn()
      .mockResolvedValue({ executions: [execution] });
    const processExecution = jest
      .fn()
      .mockResolvedValue({ execution: processedExecution });
    const recordDeclarationEvidence = jest.fn();

    const result = await processPayrollAuthorityAdapterWorkerBatch(
      {
        organizationId: "org-1",
        workerId: "worker-1",
        now: "2026-06-30T10:16:00.000Z",
      },
      { adapter, leaseExecutions, processExecution, recordDeclarationEvidence },
    );

    expect(processExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: expect.objectContaining({
          status: "failed",
          errorCode: "ADAPTER_UNSAFE_ERROR",
          errorMessage:
            "Payroll authority adapter threw an unsafe error. Raw error details were suppressed.",
          responseHash: "sha256:worker-hash",
        }),
      }),
      db,
    );
    expect(recordDeclarationEvidence).not.toHaveBeenCalled();
    expect(result.results[0]).toMatchObject({
      executionStatus: "FAILED",
      lifecycleTransition: null,
      errorCode: "ADAPTER_UNSAFE_ERROR",
    });
  });
  it("records ordered acceptance and payment-due lifecycle evidence for payment-due authority outcomes", async () => {
    const execution = queuedExecution();
    const processedExecution = queuedExecution({
      status: "PAYMENT_DUE",
      authorityReference: "CNPS-DUE-1",
      responseHash: "sha256:payment-due-response",
      receiptHash: "sha256:payment-due-receipt",
      completedAt: "2026-06-30T10:17:00.000Z",
      nextEvidenceAction:
        "Record authority acceptance and payment-due lifecycle evidence with source register proof.",
    });
    const adapter: PayrollAuthorityAdapter = {
      submit: jest.fn().mockResolvedValue({
        status: "payment_due",
        authorityReference: "CNPS-DUE-1",
        responseHash: "sha256:payment-due-response",
        receiptHash: "sha256:payment-due-receipt",
        responseSummary: { authorityStatus: "PAYMENT_DUE", redacted: true },
      }),
    };
    const leaseExecutions = jest
      .fn()
      .mockResolvedValue({ executions: [execution] });
    const processExecution = jest
      .fn()
      .mockResolvedValue({ execution: processedExecution });
    const recordDeclarationEvidence = jest
      .fn()
      .mockResolvedValueOnce(lifecycleResult("accepted-evidence-1"))
      .mockResolvedValueOnce(lifecycleResult("payment-due-evidence-1"));

    const result = await processPayrollAuthorityAdapterWorkerBatch(
      {
        organizationId: "org-1",
        workerId: "worker-1",
        actorId: "operator-1",
        now: "2026-06-30T10:17:00.000Z",
        lastAuthAt: "2026-06-30T10:16:00.000Z",
      },
      { adapter, leaseExecutions, processExecution, recordDeclarationEvidence },
    );

    expect(processExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: expect.objectContaining({ status: "payment_due" }),
      }),
      db,
    );
    expect(recordDeclarationEvidence).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        transition: "accept",
        authorityStatus: "ACCEPTED_BY_AUTHORITY",
        authorityReference: "CNPS-DUE-1",
        authorityResponseHash: "sha256:payment-due-response",
        portalReceiptHash: "sha256:payment-due-receipt",
      }),
      db,
    );
    expect(recordDeclarationEvidence).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        transition: "mark_payment_due",
        authorityStatus: "PAYMENT_DUE_CONFIRMED",
        authorityReference: "CNPS-DUE-1",
        authorityResponseHash: "sha256:payment-due-response",
        portalReceiptHash: "sha256:payment-due-receipt",
      }),
      db,
    );
    expect(result.results[0]).toMatchObject({
      executionStatus: "PAYMENT_DUE",
      lifecycleTransition: "accept",
      lifecycleTransitions: ["accept", "mark_payment_due"],
      lifecycleEvidenceIds: ["accepted-evidence-1", "payment-due-evidence-1"],
      nextEvidenceAction: expect.stringContaining(
        "payment-due lifecycle evidence",
      ),
    });
  });

  it("records amendment lifecycle evidence only when independent approval is supplied", async () => {
    const execution = queuedExecution();
    const processedExecution = queuedExecution({
      status: "AMENDMENT_REQUIRED",
      authorityReference: "CNPS-AMEND-1",
      responseHash: "sha256:amendment-response",
      receiptHash: "sha256:amendment-receipt",
      errorCode: "AMENDMENT_REQUIRED",
      rejectionReason: "AUTHORITY_REQUESTED_AMENDED_PAYLOAD",
      completedAt: "2026-06-30T10:18:00.000Z",
      nextEvidenceAction:
        "Record maker-checker amendment evidence before close certification can proceed.",
    });
    const adapter: PayrollAuthorityAdapter = {
      submit: jest.fn().mockResolvedValue({
        status: "amendment_required",
        authorityReference: "CNPS-AMEND-1",
        responseHash: "sha256:amendment-response",
        receiptHash: "sha256:amendment-receipt",
        amendmentReason: "AUTHORITY_REQUESTED_AMENDED_PAYLOAD",
        responseSummary: {
          authorityStatus: "AMENDMENT_REQUIRED",
          redacted: true,
        },
      }),
    };
    const leaseExecutions = jest
      .fn()
      .mockResolvedValue({ executions: [execution] });
    const processExecution = jest
      .fn()
      .mockResolvedValue({ execution: processedExecution });
    const recordDeclarationEvidence = jest
      .fn()
      .mockResolvedValue(lifecycleResult("amendment-evidence-1"));

    const result = await processPayrollAuthorityAdapterWorkerBatch(
      {
        organizationId: "org-1",
        workerId: "worker-1",
        actorId: "operator-1",
        amendmentApprovedById: "compliance-approver-1",
        now: "2026-06-30T10:18:00.000Z",
        lastAuthAt: "2026-06-30T10:17:00.000Z",
      },
      { adapter, leaseExecutions, processExecution, recordDeclarationEvidence },
    );

    expect(recordDeclarationEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        transition: "amend",
        authorityStatus: "AMENDMENT_REQUIRED_BY_AUTHORITY",
        authorityReference: "CNPS-AMEND-1",
        authorityResponseHash: "sha256:amendment-response",
        portalReceiptHash: "sha256:amendment-receipt",
        approvedById: "compliance-approver-1",
        notes: "AUTHORITY_REQUESTED_AMENDED_PAYLOAD",
      }),
      db,
    );
    expect(result.results[0]).toMatchObject({
      executionStatus: "AMENDMENT_REQUIRED",
      lifecycleTransition: "amend",
      lifecycleTransitions: ["amend"],
      lifecycleEvidenceIds: ["amendment-evidence-1"],
      errorCode: "AMENDMENT_REQUIRED",
    });
  });

  it("keeps amendment-required outcomes evidence-only without independent approval", async () => {
    const execution = queuedExecution();
    const processedExecution = queuedExecution({
      status: "AMENDMENT_REQUIRED",
      errorCode: "AMENDMENT_REQUIRED",
      rejectionReason: "AUTHORITY_REQUESTED_AMENDED_PAYLOAD",
      nextEvidenceAction:
        "Record maker-checker amendment evidence before close certification can proceed.",
    });
    const adapter: PayrollAuthorityAdapter = {
      submit: jest.fn().mockResolvedValue({
        status: "amendment_required",
        responseHash: "sha256:amendment-response",
        receiptHash: "sha256:amendment-receipt",
        amendmentReason: "AUTHORITY_REQUESTED_AMENDED_PAYLOAD",
        responseSummary: {
          authorityStatus: "AMENDMENT_REQUIRED",
          redacted: true,
        },
      }),
    };
    const leaseExecutions = jest
      .fn()
      .mockResolvedValue({ executions: [execution] });
    const processExecution = jest
      .fn()
      .mockResolvedValue({ execution: processedExecution });
    const recordDeclarationEvidence = jest.fn();

    const result = await processPayrollAuthorityAdapterWorkerBatch(
      {
        organizationId: "org-1",
        workerId: "worker-1",
        actorId: "operator-1",
        now: "2026-06-30T10:19:00.000Z",
        lastAuthAt: "2026-06-30T10:18:00.000Z",
      },
      { adapter, leaseExecutions, processExecution, recordDeclarationEvidence },
    );

    expect(recordDeclarationEvidence).not.toHaveBeenCalled();
    expect(result.results[0]).toMatchObject({
      executionStatus: "AMENDMENT_REQUIRED",
      lifecycleTransition: null,
      lifecycleTransitions: [],
      lifecycleEvidenceIds: [],
      nextEvidenceAction: expect.stringContaining(
        "maker-checker amendment evidence",
      ),
      errorCode: "AMENDMENT_REQUIRED",
    });
  });
});
