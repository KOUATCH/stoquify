jest.mock("server-only", () => ({}));

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "adapter-chaos-hash"),
}));

import { PaymentMethod } from "@prisma/client";

import type { PayrollAuthorityAdapterExecutionRecord } from "../authority-adapter-execution.service";
import { evaluatePayrollAdapterChaosReleaseGate } from "../payroll-adapter-chaos-release-gate.service";
import {
  certifyPayrollAuthorityAdapterHarness,
  certifyPayrollPaymentProviderHarness,
} from "../payroll-adapter-certification-harness.service";
import type { PayrollPaymentProviderAdapterSubmitInput } from "../payroll-payment-provider-fixture-runner.service";

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

const completeProviderProof = {
  method: PaymentMethod.MOBILE_MONEY,
  paymentProviderAdapterKey: "MOMO_PAYROLL_PROVIDER_API",
  requestedStatus: "SUPPORTED_CERTIFIED" as const,
  reviewedBy: "treasury-lead-1",
  reviewedAt: "2026-06-30T08:30:00.000Z",
  bankFileHash: "sha256:disbursement-file",
  providerCredentialProofHash: "sha256:provider-credential-proof",
  providerCredentialRotationProofHash: "sha256:provider-credential-rotation",
  providerCredentialScopeProofHash: "sha256:provider-credential-scope",
  providerPayloadMappingHash: "sha256:provider-payload-mapping",
  providerResponseMappingHash: "sha256:provider-response-mapping",
  providerReversalMappingHash: "sha256:provider-reversal-mapping",
  providerAdapterRequestHash: "sha256:provider-request",
  providerAdapterResponseHash: "sha256:provider-response",
  providerSettlementReceiptHash: "sha256:provider-settlement-receipt",
  providerIdempotencyKey: "momo-payroll-batch-1",
  providerAttempt: 2,
  providerReplayFixtureHash: "sha256:provider-replay",
  providerDuplicateResponseFixtureHash: "sha256:provider-duplicate-response",
  providerOutageRunbookHash: "sha256:provider-outage-runbook",
  providerRetryPolicyFixtureHash: "sha256:provider-retry-policy",
  providerDeadLetterTriageRunbookHash: "sha256:provider-dead-letter-runbook",
  providerAuditTrailFixtureHash: "sha256:provider-audit-trail",
  providerRedactionFixtureHash: "sha256:provider-redaction-fixture",
  providerCloseImpactRuleHash: "sha256:provider-close-impact",
};

function authorityFixture() {
  const result = certifyPayrollAuthorityAdapterHarness(completeAuthorityProof);
  expect(result.certificationReady).toBe(true);
  expect(result.certificationHarnessHash).toBe("sha256:adapter-chaos-hash");
  return result;
}

function providerFixture() {
  const result = certifyPayrollPaymentProviderHarness(completeProviderProof);
  expect(result.certificationReady).toBe(true);
  expect(result.providerCertificationHarnessHash).toBe(
    "sha256:adapter-chaos-hash",
  );
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
    authorityCertificationHarnessHash: "sha256:adapter-chaos-hash",
    authorityCertificationProofEnvelope,
    adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
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

function submitInput(
  overrides: Partial<PayrollPaymentProviderAdapterSubmitInput> = {},
): PayrollPaymentProviderAdapterSubmitInput {
  return {
    organizationId: "org-1",
    payrollPaymentBatchId: "batch-1",
    payrollRunId: "run-1",
    method: PaymentMethod.MOBILE_MONEY,
    amount: "143700.00",
    currency: "XAF",
    paymentProviderAdapterKey: "MOMO_PAYROLL_PROVIDER_API",
    paymentAdapterProofHash: "sha256:payment-adapter-proof",
    paymentProviderAdapterContractHash: "sha256:payment-adapter-contract",
    providerCertificationHarnessHash: "sha256:adapter-chaos-hash",
    paymentDisbursementFileHash: "sha256:disbursement-file",
    providerCredentialProofHash: "sha256:provider-credential-proof",
    providerPayloadMappingHash: "sha256:provider-payload-mapping",
    providerResponseMappingHash: "sha256:provider-response-mapping",
    providerAdapterRequestHash: "sha256:provider-request",
    providerAdapterResponseHash: "sha256:provider-response",
    providerSettlementReceiptHash: "sha256:provider-settlement-receipt",
    providerIdempotencyKey: "momo-payroll-batch-1",
    providerAttempt: 2,
    productionPaymentAutomationSupported: true,
    sourceRegisterHash: "sha256:register",
    now: "2026-06-30T10:10:00.000Z",
    ...overrides,
  };
}

function gateInput(overrides: Record<string, unknown> = {}) {
  const authority = authorityFixture();
  const provider = providerFixture();
  return {
    organizationId: "org-1",
    asOf: "2026-06-30T10:10:00.000Z",
    authority: {
      certificate: authority.certificate,
      certificationHarnessHash: authority.certificationHarnessHash!,
      execution: queuedExecution(),
    },
    provider: {
      certificate: provider.certificate,
      providerCertificationHarnessHash:
        provider.providerCertificationHarnessHash!,
      submit: submitInput(),
    },
    ...overrides,
  };
}

describe("payroll adapter chaos release gate", () => {
  it("passes only when authority and provider chaos scenarios are certified, replay-stable, redacted, and settlement-safe", async () => {
    const result = await evaluatePayrollAdapterChaosReleaseGate(gateInput());

    expect(result).toMatchObject({
      state: "ADAPTER_CHAOS_READY",
      adapterChaosReleaseGateHash: "sha256:adapter-chaos-hash",
      blockerCodes: [],
      summary: {
        authorityScenariosRequired: 6,
        authorityScenariosPassed: 6,
        providerScenariosRequired: 5,
        providerScenariosPassed: 5,
        replayStable: true,
        redactionClean: true,
        settlementConvertibilityClean: true,
      },
      certificate: expect.objectContaining({
        kind: "AQSTOQFLOW_PAYROLL_ADAPTER_CHAOS_RELEASE_GATE_CERTIFICATE",
        state: "ADAPTER_CHAOS_READY",
        redactionPolicy: "payroll-adapter-chaos-release-gate-redacted",
      }),
      redaction: {
        rawPayloadsIncluded: false,
        credentialSecretsIncluded: false,
        salaryOrEmployeeIdentityIncluded: false,
      },
    });
    expect(result.provider).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scenario: "settled",
          settlementEvidenceConvertible: true,
        }),
        expect.objectContaining({
          scenario: "reversed",
          settlementEvidenceConvertible: false,
        }),
        expect.objectContaining({
          scenario: "retryable_error",
          settlementEvidenceConvertible: false,
        }),
      ]),
    );
    expect(result.authority.every((entry) => entry.replayStable)).toBe(true);
    expect(result.provider.every((entry) => entry.responseSummaryRedacted)).toBe(
      true,
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("do-not-leak");
    expect(serialized).not.toContain("699999999");
    expect(serialized).not.toContain("raw-secret-fixture");
  });

  it("blocks provider automation readiness when a certified chaos proof is missing", async () => {
    const input = gateInput();
    const certificate = input.provider.certificate as Record<string, unknown> & {
      proof: Record<string, unknown>;
    };

    const result = await evaluatePayrollAdapterChaosReleaseGate({
      ...input,
      provider: {
        ...input.provider,
        certificate: {
          ...certificate,
          proof: {
            ...certificate.proof,
            providerDuplicateResponseFixtureHash: null,
          },
        },
      },
    });

    expect(result.state).toBe("BLOCKED");
    expect(result.summary.providerScenariosPassed).toBe(0);
    expect(result.blockerCodes).toEqual(
      expect.arrayContaining([
        "PROVIDER_SETTLED_FAILED",
        "PROVIDER_REVERSED_FAILED",
      ]),
    );
    expect(result.provider[0]).toMatchObject({
      state: "BLOCKED",
      errorCode: "BUSINESS_RULE_BLOCKED",
    });
  });

  it("blocks mismatched provider tenant scope even when fixture proofs pass", async () => {
    const result = await evaluatePayrollAdapterChaosReleaseGate(
      gateInput({
        provider: {
          ...gateInput().provider,
          submit: submitInput({ organizationId: "other-org" }),
        },
      }),
    );

    expect(result.state).toBe("BLOCKED");
    expect(result.blockerCodes).toContain(
      "PROVIDER_SUBMIT_TENANT_SCOPE_MISMATCH",
    );
    expect(result.summary.providerScenariosPassed).toBe(5);
  });
});
