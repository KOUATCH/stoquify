jest.mock("server-only", () => ({}));

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "authority-fixture-hash"),
}));

import { BusinessRuleError } from "@/services/_shared/action-errors";
import { hashBusinessPayload } from "@/services/events/business-event.service";

import type { PayrollAuthorityAdapterExecutionRecord } from "../authority-adapter-execution.service";
import {
  createPayrollAuthorityFixtureAdapter,
  runPayrollAuthorityAdapterFixture,
} from "../payroll-authority-adapter-fixture-runner.service";
import { certifyPayrollAuthorityAdapterHarness } from "../payroll-adapter-certification-harness.service";

const mockedHashBusinessPayload = hashBusinessPayload as jest.MockedFunction<
  typeof hashBusinessPayload
>;

const completeAuthorityProof = {
  authorityChannel: "CNPS_API",
  authorityEnvironment: "PRODUCTION_API",
  countryCode: "CM",
  countryPackVersion: "CM-2026.1",
  countryPackResolutionHash: "sha256:country-pack-resolution",
  declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
  mappingSchemaVersion: "payroll-authority-mapping.v1",
  authorityAdapterKey: "CM_CNPS_PRODUCTION_API",
  requestedReadiness: "SUPPORTED_CERTIFIED" as const,
  reviewedBy: "compliance-lead-1",
  reviewedAt: "2026-06-30T08:00:00.000Z",
  payloadMappingHash: "sha256:payload-mapping",
  responseMappingHash: "sha256:response-mapping",
  authorityStatusCodeMapHash: "sha256:authority-status-code-map",
  rejectionMappingHash: "sha256:rejection-mapping",
  amendmentMappingHash: "sha256:amendment-mapping",
  paymentDueMappingHash: "sha256:payment-due-mapping",
  credentialProofHash: "sha256:credential-proof",
  credentialRotationProofHash: "sha256:credential-rotation",
  credentialScopeProofHash: "sha256:credential-scope",
  adapterRequestHash: "sha256:adapter-request",
  adapterResponseReceiptHash: "sha256:adapter-response-receipt",
  adapterIdempotencyKey: "cnps-submit-run-1",
  adapterAttempt: 2,
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

function certifiedAuthorityFixture() {
  const result = certifyPayrollAuthorityAdapterHarness(completeAuthorityProof);
  expect(result.certificationReady).toBe(true);
  expect(result.certificationHarnessHash).toBe("sha256:authority-fixture-hash");
  return result;
}

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
    receiptHash: "sha256:adapter-response-receipt",
    sourceRegisterHash: "sha256:register",
    submittedPayloadHash: "sha256:submitted-payload",
    payloadMappingHash: "sha256:payload-mapping",
    responseMappingHash: "sha256:response-mapping",
    credentialProofHash: "sha256:credential-proof",
    adapterRequestHash: "sha256:adapter-request",
    adapterResponseReceiptHash: "sha256:adapter-response-receipt",
    adapterIdempotencyKey: "cnps-submit-run-1",
    adapterAttempt: 1,
    authorityCertificationHarnessHash: "sha256:authority-fixture-hash",
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

describe("payroll authority adapter fixture runner", () => {
  it("emits certified payment-due outcomes with redacted fixture summaries", async () => {
    const certified = certifiedAuthorityFixture();
    const adapter = createPayrollAuthorityFixtureAdapter({
      certificate: certified.certificate,
      certificationHarnessHash: certified.certificationHarnessHash!,
      scenario: "payment_due",
      responseSummary: {
        safeMarker: "reviewed-fixture",
        rawPayload: { salary: "do-not-store" },
      },
    });

    const outcome = await adapter.submit({
      organizationId: "org-1",
      workerId: "worker-1",
      execution: queuedExecution(),
      now: new Date("2026-06-30T10:10:00.000Z"),
    });

    expect(outcome).toMatchObject({
      status: "payment_due",
      authorityReference: "CNPS-API-REF-1",
      responseHash: "sha256:authority-fixture-hash",
      receiptHash: "sha256:authority-fixture-hash",
      responseSummary: expect.objectContaining({
        safeMarker: "reviewed-fixture",
        redacted: true,
        suppressedFields: ["rawPayload"],
        countryCode: "CM",
        countryPackVersion: "CM-2026.1",
        countryPackResolutionHash: "sha256:country-pack-resolution",
        mappingSchemaVersion: "payroll-authority-mapping.v1",
      }),
    });
    expect(JSON.stringify(outcome)).not.toContain("do-not-store");
  });

  it("fails closed when certificate country-pack proof does not match the execution", async () => {
    const certified = certifiedAuthorityFixture();
    const mismatchedCertificate = {
      ...certified.certificate,
      countryCode: "CI",
    };

    await expect(
      runPayrollAuthorityAdapterFixture({
        organizationId: "org-1",
        workerId: "worker-1",
        execution: queuedExecution(),
        now: new Date("2026-06-30T10:10:00.000Z"),
        certificate: mismatchedCertificate,
        certificationHarnessHash: certified.certificationHarnessHash!,
        scenario: "accepted",
      }),
    ).rejects.toThrow("country code");
  });

  it("fails closed when a certificate no longer hashes to its harness proof", async () => {
    const certified = certifiedAuthorityFixture();
    const certificate = certified.certificate as Record<string, any>;
    const tamperedCertificate = {
      ...certificate,
      proof: {
        ...certificate.proof,
        amendmentMappingHash: "sha256:tampered-amendment-mapping",
      },
    };
    mockedHashBusinessPayload.mockReturnValueOnce(
      "tampered-authority-fixture-hash",
    );

    await expect(
      runPayrollAuthorityAdapterFixture({
        organizationId: "org-1",
        workerId: "worker-1",
        execution: queuedExecution(),
        now: new Date("2026-06-30T10:10:00.000Z"),
        certificate: tamperedCertificate,
        certificationHarnessHash: certified.certificationHarnessHash!,
        scenario: "accepted",
      }),
    ).rejects.toThrow("certificate hash does not match");
  });

  it("requires duplicate terminal replay proof before a fixture can represent authority callbacks", async () => {
    const certified = certifiedAuthorityFixture();
    const certificate = certified.certificate as Record<string, any>;
    const incompleteCertificate = {
      ...certificate,
      proof: {
        ...certificate.proof,
        duplicateTerminalResponseReplayFixtureHash: null,
      },
    };

    await expect(
      runPayrollAuthorityAdapterFixture({
        organizationId: "org-1",
        workerId: "worker-1",
        execution: queuedExecution(),
        now: new Date("2026-06-30T10:10:00.000Z"),
        certificate: incompleteCertificate,
        certificationHarnessHash: certified.certificationHarnessHash!,
        scenario: "accepted",
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("returns retryable outage outcomes only from a matching certified fixture", async () => {
    const certified = certifiedAuthorityFixture();

    const outcome = await runPayrollAuthorityAdapterFixture({
      organizationId: "org-1",
      workerId: "worker-1",
      execution: queuedExecution(),
      now: new Date("2026-06-30T10:10:00.000Z"),
      certificate: certified.certificate,
      certificationHarnessHash: certified.certificationHarnessHash!,
      scenario: "retryable_error",
      errorCode: "AUTHORITY_OUTAGE",
      retryAfterSeconds: 600,
    });

    expect(outcome).toMatchObject({
      status: "retryable_error",
      errorCode: "AUTHORITY_OUTAGE",
      retryAfterSeconds: 600,
      responseHash: "sha256:authority-fixture-hash",
      responseSummary: expect.objectContaining({
        authorityStatus: "RETRYABLE_ERROR",
        redacted: true,
      }),
    });
  });
});
