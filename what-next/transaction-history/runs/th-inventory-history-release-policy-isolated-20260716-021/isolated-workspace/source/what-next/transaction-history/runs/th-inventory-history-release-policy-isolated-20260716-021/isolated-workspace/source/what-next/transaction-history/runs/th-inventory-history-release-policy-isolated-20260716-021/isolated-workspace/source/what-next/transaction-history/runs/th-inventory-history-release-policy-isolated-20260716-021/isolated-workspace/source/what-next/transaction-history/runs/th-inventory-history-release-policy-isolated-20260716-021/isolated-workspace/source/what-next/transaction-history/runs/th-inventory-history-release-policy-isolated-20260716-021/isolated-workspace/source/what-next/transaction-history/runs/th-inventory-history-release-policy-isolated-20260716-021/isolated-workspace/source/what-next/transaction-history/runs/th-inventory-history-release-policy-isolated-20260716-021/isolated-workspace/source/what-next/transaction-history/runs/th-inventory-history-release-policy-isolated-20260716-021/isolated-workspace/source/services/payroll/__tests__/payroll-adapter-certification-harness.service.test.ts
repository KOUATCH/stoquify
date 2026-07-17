jest.mock("server-only", () => ({}));

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "adapter-cert-hash"),
}));

import { PaymentMethod } from "@prisma/client";

import {
  certifyPayrollAuthorityAdapterHarness,
  certifyPayrollPaymentProviderHarness,
} from "../payroll-adapter-certification-harness.service";
import {
  resolvePayrollAuthorityAdapterContract,
  resolvePayrollPaymentProviderAdapterContract,
} from "../payroll-adapter-registry.service";

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

describe("payroll adapter certification harness service", () => {
  it("issues an authority harness certificate that unlocks registry production readiness", () => {
    const result = certifyPayrollAuthorityAdapterHarness(
      completeAuthorityProof,
    );

    expect(result.certificationReady).toBe(true);
    expect(result.certificationHarnessHash).toBe("sha256:adapter-cert-hash");
    expect(result.blockers).toEqual([]);
    expect(result.certificate).toMatchObject({
      certificationReady: true,
      authorityAdapterKey: "CM_CNPS_PRODUCTION_API",
      countryCode: "CM",
      countryPackVersion: "CM-2026.1",
      countryPackResolutionHash: "sha256:country-pack-resolution",
      declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
      mappingSchemaVersion: "payroll-authority-mapping.v1",
      proof: expect.objectContaining({
        authorityStatusCodeMapHash: "sha256:authority-status-code-map",
        rejectionMappingHash: "sha256:rejection-mapping",
        amendmentMappingHash: "sha256:amendment-mapping",
        paymentDueMappingHash: "sha256:payment-due-mapping",
        duplicateTerminalResponseReplayFixtureHash:
          "sha256:duplicate-terminal-response-replay",
        deadLetterTriageRunbookHash: "sha256:dead-letter-runbook",
        legalReviewHash: "sha256:legal-review",
      }),
    });
    expect(JSON.stringify(result.certificate)).not.toContain(
      "raw provider secret",
    );

    const registry = resolvePayrollAuthorityAdapterContract(
      result.registryInput!,
    );
    expect(registry.productionSubmissionSupported).toBe(true);
    expect(registry.certificationHarnessHash).toBe(
      result.certificationHarnessHash,
    );
    expect(registry.certificationBlockers).toEqual([]);
  });

  it("blocks authority harness certification when replay, rejection, outage, and legal proof are missing", () => {
    const result = certifyPayrollAuthorityAdapterHarness({
      authorityChannel: "CNPS_API",
      authorityEnvironment: "PRODUCTION_API",
      requestedReadiness: "SUPPORTED_CERTIFIED",
      payloadMappingHash: "sha256:payload-mapping",
      responseMappingHash: "sha256:response-mapping",
      credentialProofHash: "sha256:credential-proof",
      adapterRequestHash: "sha256:adapter-request",
      adapterResponseReceiptHash: "sha256:adapter-response-receipt",
      adapterIdempotencyKey: "cnps-submit-run-1",
    });

    expect(result.certificationReady).toBe(false);
    expect(result.certificationHarnessHash).toBeNull();
    expect(result.registryInput).toBeNull();
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "AUTHORITY_COUNTRY_CODE_PRESENT",
        "AUTHORITY_COUNTRY_PACK_VERSION_PRESENT",
        "AUTHORITY_COUNTRY_PACK_PROOF_PRESENT",
        "AUTHORITY_DECLARATION_TYPE_PRESENT",
        "AUTHORITY_STATUS_CODE_MAP_REVIEWED",
        "AUTHORITY_REJECTION_MAPPING_REVIEWED",
        "AUTHORITY_AMENDMENT_MAPPING_REVIEWED",
        "AUTHORITY_PAYMENT_DUE_MAPPING_REVIEWED",
        "AUTHORITY_IDEMPOTENCY_REPLAY_REVIEWED",
        "AUTHORITY_DUPLICATE_TERMINAL_RESPONSE_REPLAY_REVIEWED",
        "AUTHORITY_OUTAGE_RUNBOOK_PRESENT",
        "AUTHORITY_DEAD_LETTER_TRIAGE_PRESENT",
        "AUTHORITY_LEGAL_REVIEW_PRESENT",
      ]),
    );
  });

  it("issues a payment provider harness certificate that unlocks provider production readiness", () => {
    const result = certifyPayrollPaymentProviderHarness(completeProviderProof);

    expect(result.certificationReady).toBe(true);
    expect(result.providerCertificationHarnessHash).toBe(
      "sha256:adapter-cert-hash",
    );
    expect(result.blockers).toEqual([]);
    expect(result.certificate).toMatchObject({
      certificationReady: true,
      paymentProviderAdapterKey: "MOMO_PAYROLL_PROVIDER_API",
      proof: expect.objectContaining({
        providerReversalMappingHash: "sha256:provider-reversal-mapping",
        providerDeadLetterTriageRunbookHash:
          "sha256:provider-dead-letter-runbook",
        providerCloseImpactRuleHash: "sha256:provider-close-impact",
      }),
    });

    const registry = resolvePayrollPaymentProviderAdapterContract(
      result.registryInput!,
    );
    expect(registry.productionPaymentAutomationSupported).toBe(true);
    expect(registry.providerCertificationHarnessHash).toBe(
      result.providerCertificationHarnessHash,
    );
    expect(registry.certificationBlockers).toEqual([]);
  });

  it("blocks provider harness certification when settlement and outage proof are missing", () => {
    const result = certifyPayrollPaymentProviderHarness({
      method: PaymentMethod.MOBILE_MONEY,
      requestedStatus: "SUPPORTED_CERTIFIED",
      providerCredentialProofHash: "sha256:provider-credential-proof",
      providerPayloadMappingHash: "sha256:provider-payload-mapping",
      providerResponseMappingHash: "sha256:provider-response-mapping",
      providerAdapterRequestHash: "sha256:provider-request",
      providerAdapterResponseHash: "sha256:provider-response",
      providerIdempotencyKey: "momo-payroll-batch-1",
    });

    expect(result.certificationReady).toBe(false);
    expect(result.providerCertificationHarnessHash).toBeNull();
    expect(result.registryInput).toBeNull();
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PAYMENT_DISBURSEMENT_FILE_PRESENT",
        "PROVIDER_SETTLEMENT_RECEIPT_PRESENT",
        "PROVIDER_REVERSAL_MAPPING_REVIEWED",
        "PROVIDER_OUTAGE_RUNBOOK_PRESENT",
        "PROVIDER_DEAD_LETTER_TRIAGE_PRESENT",
        "PROVIDER_CLOSE_IMPACT_REVIEWED",
      ]),
    );
  });
});
