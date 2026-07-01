jest.mock("server-only", () => ({}));

import { PaymentMethod } from "@prisma/client";

import {
  normalizePayrollAdapterKey,
  resolvePayrollAuthorityAdapterContract,
  resolvePayrollAuthorityLifecycleContract,
  resolvePayrollPaymentProviderAdapterContract,
  resolvePayrollPaymentSettlementLifecycleContract,
} from "../payroll-adapter-registry.service";

describe("payroll adapter registry service", () => {
  it("normalizes adapter keys for stable proof hashes", () => {
    expect(normalizePayrollAdapterKey(" cnps manual portal / capture ")).toBe(
      "CNPS_MANUAL_PORTAL_CAPTURE",
    );
  });

  it("keeps manual authority evidence automation-blocked with certification requirements", () => {
    const result = resolvePayrollAuthorityAdapterContract({
      authorityChannel: "CNPS_MANUAL_PORTAL",
      authorityEnvironment: "MANUAL_PORTAL",
    });

    expect(result.authorityAdapterKey).toBe(
      "CNPS_MANUAL_PORTAL:MANUAL_CAPTURE",
    );
    expect(result.authorityAdapterReadiness).toBe("MANUAL_EVIDENCE");
    expect(result.automationCapabilityStatus).toBe("AUTOMATION_BLOCKED");
    expect(result.productionSubmissionSupported).toBe(false);
    expect(result.authorityAdapterContractHash).toMatch(/^sha256:/);
    expect(result.registryDecision).toBe("MANUAL_CAPTURE_ONLY");
    expect(result.requiredForCertification).toEqual(
      expect.arrayContaining(["reviewed authority payload mapping"]),
    );
  });

  it("marks non-manual authority adapters as review-blocked until certified", () => {
    const result = resolvePayrollAuthorityAdapterContract({
      authorityChannel: "CNPS_API",
      authorityEnvironment: "PRODUCTION_API",
    });

    expect(result.authorityAdapterReadiness).toBe("REQUIRES_EXPERT_REVIEW");
    expect(result.manualAuthorityWorkflowOnly).toBe(false);
    expect(result.productionSubmissionSupported).toBe(false);
    expect(result.registryDecision).toBe(
      "BLOCKED_REQUIRES_REVIEWED_AUTHORITY_ADAPTER",
    );
  });

  it("requires manual settlement proof for bank-transfer provider contracts", () => {
    const result = resolvePayrollPaymentProviderAdapterContract({
      method: PaymentMethod.BANK_TRANSFER,
      bankFileHash: "sha256:bank-file",
    });

    expect(result.paymentProviderAdapterKey).toBe(
      "BANK_TRANSFER:MANUAL_DISBURSEMENT_FILE",
    );
    expect(result.paymentAdapterStatus).toBe(
      "MANUAL_PROVIDER_SETTLEMENT_REQUIRED",
    );
    expect(result.productionPaymentAutomationSupported).toBe(false);
    expect(result.providerSettlementProofRequired).toBe(true);
    expect(result.paymentProviderAdapterContractHash).toMatch(/^sha256:/);
    expect(result.acceptedSettlementEvidence).toEqual(
      expect.arrayContaining(["statement file hash", "approved match record"]),
    );
  });

  it("classifies rejected authority lifecycle proof as close-blocking", () => {
    const result = resolvePayrollAuthorityLifecycleContract({
      transition: "reject",
      previousStatus: "SUBMITTED",
      nextStatus: "REJECTED",
      authorityStatus: "rejected by authority",
      sourceRegisterHash: "sha256:register",
      authorityAdapterProofHash: "sha256:authority-proof",
      authorityAdapterContractHash: "sha256:authority-contract",
      authorityAdapterRegistryDecision: "MANUAL_CAPTURE_ONLY",
    });

    expect(result.authorityLifecycleContractHash).toMatch(/^sha256:/);
    expect(result.authorityLifecycleStatus).toBe(
      "REJECTED_REQUIRES_CORRECTION",
    );
    expect(result.authorityLifecycleCloseImpact).toBe(
      "BLOCK_CLOSE_UNTIL_CORRECTED",
    );
    expect(result.authorityLifecycleContract).toMatchObject({
      sourceRegisterHash: "sha256:register",
      authorityAdapterProofHash: "sha256:authority-proof",
      authorityAdapterContractHash: "sha256:authority-contract",
    });
  });

  it("creates payment settlement lifecycle proof from provider evidence", () => {
    const result = resolvePayrollPaymentSettlementLifecycleContract({
      settlementStatus: "settled",
      sourceRegisterHash: "sha256:register",
      inputEvidenceHash: "sha256:settlement-input",
      paymentAdapterProofHash: "sha256:payment-adapter-proof",
      paymentProviderAdapterContractHash: "sha256:payment-adapter-contract",
      paymentProviderAdapterKey: "BANK_TRANSFER:MANUAL_DISBURSEMENT_FILE",
      providerEvidence: {
        providerAccountId: "provider-account-1",
        providerTransactionId: "bank-tx-1",
        providerReference: "PB-2026-06-0001",
        providerEventId: "provider-event-1",
        statementLineId: "statement-line-1",
        statementFileHash: "sha256:statement-file",
        matchRecordId: "match-1",
        reconciliationRunId: "recon-run-1",
      },
    });

    expect(result.providerSettlementLifecycleContractHash).toMatch(/^sha256:/);
    expect(result.providerSettlementLifecycleStatus).toBe(
      "SETTLED_WITH_PROVIDER_EVIDENCE",
    );
    expect(result.providerSettlementLifecycleCloseImpact).toBe(
      "CLOSE_EVIDENCE_STALE_ON_CHANGE",
    );
    expect(result.providerSettlementLifecycleContract).toMatchObject({
      providerEvidencePresent: true,
      paymentAdapterProofHash: "sha256:payment-adapter-proof",
      paymentProviderAdapterContractHash: "sha256:payment-adapter-contract",
    });
  });

  it("allows certified authority adapters only with complete reviewed proof", () => {
    const result = resolvePayrollAuthorityAdapterContract({
      authorityChannel: "CNPS_API",
      authorityEnvironment: "PRODUCTION_API",
      requestedReadiness: "SUPPORTED_CERTIFIED",
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
      certificationHarnessHash: "sha256:authority-harness",
    });

    expect(result.productionSubmissionSupported).toBe(true);
    expect(result.automationCapabilityStatus).toBe("PRODUCTION_ADAPTER_READY");
    expect(result.registryDecision).toBe("READY_REQUIRES_LIVE_ADAPTER_EXECUTION");
    expect(result.certificationProofComplete).toBe(true);
    expect(result.certificationBlockers).toEqual([]);
    expect(result.requiredForCertification).toEqual([]);
    expect(result.contract.retryPolicy).toMatchObject({
      automatedRetriesEnabled: true,
      idempotencyRequired: true,
      maxAttempts: 5,
    });
  });

  it("keeps certified authority adapter claims blocked when proof is incomplete", () => {
    const result = resolvePayrollAuthorityAdapterContract({
      authorityChannel: "CNPS_API",
      authorityEnvironment: "PRODUCTION_API",
      requestedReadiness: "SUPPORTED_CERTIFIED",
      payloadMappingHash: "sha256:payload-mapping",
    });

    expect(result.productionSubmissionSupported).toBe(false);
    expect(result.automationCapabilityStatus).toBe("AUTOMATION_BLOCKED");
    expect(result.registryDecision).toBe("BLOCKED_CERTIFICATION_PROOF_INCOMPLETE");
    expect(result.certificationProofComplete).toBe(false);
    expect(result.certificationBlockers).toEqual(
      expect.arrayContaining([
        "AUTHORITY_RESPONSE_MAPPING_REVIEWED",
        "AUTHORITY_CREDENTIAL_PROOF_PRESENT",
        "AUTHORITY_IDEMPOTENCY_KEY_PRESENT",
        "AUTHORITY_CERTIFICATION_HARNESS_COMPLETE",
      ]),
    );
  });

  it("allows certified provider payment adapters only with complete settlement proof", () => {
    const result = resolvePayrollPaymentProviderAdapterContract({
      method: PaymentMethod.MOBILE_MONEY,
      bankFileHash: "sha256:disbursement-file",
      requestedStatus: "SUPPORTED_CERTIFIED",
      providerCredentialProofHash: "sha256:provider-credential-proof",
      providerPayloadMappingHash: "sha256:provider-payload-mapping",
      providerResponseMappingHash: "sha256:provider-response-mapping",
      providerAdapterRequestHash: "sha256:provider-request",
      providerAdapterResponseHash: "sha256:provider-response",
      providerSettlementReceiptHash: "sha256:provider-settlement-receipt",
      providerIdempotencyKey: "momo-payroll-batch-1",
      providerAttempt: 2,
      providerCertificationHarnessHash: "sha256:provider-harness",
    });

    expect(result.paymentAdapterStatus).toBe("SUPPORTED_CERTIFIED");
    expect(result.productionPaymentAutomationSupported).toBe(true);
    expect(result.registryDecision).toBe("PRODUCTION_PROVIDER_ADAPTER_READY");
    expect(result.certificationProofComplete).toBe(true);
    expect(result.certificationBlockers).toEqual([]);
    expect(result.contract.retryPolicy).toMatchObject({
      automatedRetriesEnabled: true,
      idempotencyRequired: true,
      maxAttempts: 5,
    });
  });
});
