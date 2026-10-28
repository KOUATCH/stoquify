jest.mock("server-only", () => ({}));

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "provider-fixture-hash"),
}));

import { PaymentMethod } from "@prisma/client";

import { BusinessRuleError } from "@/services/_shared/action-errors";

import {
  createPayrollPaymentProviderFixtureAdapter,
  payrollSettlementEvidenceInputFromProviderOutcome,
  runPayrollPaymentProviderFixture,
  type PayrollPaymentProviderAdapterSubmitInput,
} from "../payroll-payment-provider-fixture-runner.service";
import { certifyPayrollPaymentProviderHarness } from "../payroll-adapter-certification-harness.service";

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

function certifiedProviderFixture() {
  const result = certifyPayrollPaymentProviderHarness(completeProviderProof);
  expect(result.certificationReady).toBe(true);
  expect(result.providerCertificationHarnessHash).toBe(
    "sha256:provider-fixture-hash",
  );
  return result;
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
    providerCertificationHarnessHash: "sha256:provider-fixture-hash",
    adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
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

describe("payroll payment provider fixture runner", () => {
  it("emits certified settlement outcomes with redacted provider summaries", async () => {
    const certified = certifiedProviderFixture();
    const adapter = createPayrollPaymentProviderFixtureAdapter({
      certificate: certified.certificate,
      providerCertificationHarnessHash:
        certified.providerCertificationHarnessHash!,
      scenario: "settled",
      responseSummary: {
        safeMarker: "reviewed-provider-fixture",
        rawPayload: { salary: "do-not-store", destination: "699999999" },
      },
    });

    const outcome = await adapter.submit(submitInput());

    expect(outcome).toMatchObject({
      status: "settled",
      settlementStatus: "settled",
      amount: "143700.00",
      currency: "XAF",
      providerEventId: "PAYROLL-PROVIDER-EVENT-provider-fixture-hash",
      providerTransactionId: "PAYROLL-PROVIDER-TX-provider-fixture-hash",
      providerReference: "PAYROLL-PROVIDER-REF-provider-fixture-hash",
      providerResponseHash: "sha256:provider-fixture-hash",
      providerSettlementReceiptHash: "sha256:provider-settlement-receipt",
      settlementEvidenceHash: "sha256:provider-fixture-hash",
      providerIdempotencyKey: "momo-payroll-batch-1",
      responseSummary: expect.objectContaining({
        safeMarker: "reviewed-provider-fixture",
        providerStatus: "SETTLED",
        redacted: true,
        suppressedFields: ["rawPayload"],
        paymentProviderAdapterKey: "MOMO_PAYROLL_PROVIDER_API",
        paymentAdapterProofHash: "sha256:payment-adapter-proof",
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
      }),
    });
    expect(JSON.stringify(outcome)).not.toContain("do-not-store");
    expect(JSON.stringify(outcome)).not.toContain("699999999");
  });

  it("keeps duplicate provider settlement fixture callbacks stable across replay", async () => {
    const certified = certifiedProviderFixture();
    const first = await runPayrollPaymentProviderFixture({
      ...submitInput({ now: "2026-06-30T10:10:00.000Z" }),
      certificate: certified.certificate,
      providerCertificationHarnessHash:
        certified.providerCertificationHarnessHash!,
      scenario: "settled",
    });
    const replay = await runPayrollPaymentProviderFixture({
      ...submitInput({ now: "2026-06-30T10:12:00.000Z" }),
      certificate: certified.certificate,
      providerCertificationHarnessHash:
        certified.providerCertificationHarnessHash!,
      scenario: "settled",
    });

    expect(first).toMatchObject({
      providerEventId: "PAYROLL-PROVIDER-EVENT-provider-fixture-hash",
      amount: "143700.00",
      currency: "XAF",
      providerResponseHash: "sha256:provider-fixture-hash",
      settlementEvidenceHash: "sha256:provider-fixture-hash",
      providerIdempotencyKey: "momo-payroll-batch-1",
    });
    expect(replay).toMatchObject({
      providerEventId: first.providerEventId,
      providerResponseHash: first.providerResponseHash,
      settlementEvidenceHash: first.settlementEvidenceHash,
      providerIdempotencyKey: first.providerIdempotencyKey,
    });
  });

  it("maps settled provider outcomes into payroll settlement evidence input", async () => {
    const certified = certifiedProviderFixture();
    const outcome = await runPayrollPaymentProviderFixture({
      ...submitInput(),
      certificate: certified.certificate,
      providerCertificationHarnessHash:
        certified.providerCertificationHarnessHash!,
      scenario: "partially_settled",
    });

    const settlementInput = payrollSettlementEvidenceInputFromProviderOutcome({
      outcome,
      organizationId: "org-1",
      payrollPaymentBatchId: "batch-1",
      actorId: "controller-1",
      actorPermissions: ["payroll.payments.reconcile"],
      approvedById: "approver-1",
      matchRecordId: "match-1",
      reconciliationRunId: "recon-run-1",
      sourceRegisterHash: "sha256:register",
      lastAuthAt: "2026-06-30T10:00:00.000Z",
      now: "2026-06-30T10:10:00.000Z",
    });

    expect(settlementInput).toMatchObject({
      organizationId: "org-1",
      payrollPaymentBatchId: "batch-1",
      settlementStatus: "partially_settled",
      providerEventId: "PAYROLL-PROVIDER-EVENT-provider-fixture-hash",
      providerTransactionId: "PAYROLL-PROVIDER-TX-provider-fixture-hash",
      providerReference: "PAYROLL-PROVIDER-REF-provider-fixture-hash",
      evidenceHash: "sha256:provider-fixture-hash",
      sourceRegisterHash: "sha256:register",
      idempotencyKey: "momo-payroll-batch-1",
      metadata: expect.objectContaining({
        workflowSource: "payroll.payment_provider_fixture",
        providerResponseHash: "sha256:provider-fixture-hash",
        providerSettlementReceiptHash: "sha256:provider-settlement-receipt",
        providerSettlementAmount: "143700.00",
        providerSettlementCurrency: "XAF",
      }),
    });
  });

  it("fails closed when settled provider outcomes are missing payment amount proof", async () => {
    const certified = certifiedProviderFixture();

    await expect(
      runPayrollPaymentProviderFixture({
        ...submitInput({ amount: undefined }),
        certificate: certified.certificate,
        providerCertificationHarnessHash:
          certified.providerCertificationHarnessHash!,
        scenario: "settled",
      }),
    ).rejects.toThrow("settlement amount proof");
  });
  it("fails closed when provider certificate proof does not match released batch proof", async () => {
    const certified = certifiedProviderFixture();

    await expect(
      runPayrollPaymentProviderFixture({
        ...submitInput({ method: PaymentMethod.BANK_TRANSFER }),
        certificate: certified.certificate,
        providerCertificationHarnessHash:
          certified.providerCertificationHarnessHash!,
        scenario: "settled",
      }),
    ).rejects.toThrow("method");
  });

  it("requires duplicate provider response proof before fixture callbacks are accepted", async () => {
    const certified = certifiedProviderFixture();
    const certificate = certified.certificate as Record<string, unknown> & {
      proof: Record<string, unknown>;
    };
    const incompleteCertificate = {
      ...certificate,
      proof: {
        ...certificate.proof,
        providerDuplicateResponseFixtureHash: null,
      },
    };

    await expect(
      runPayrollPaymentProviderFixture({
        ...submitInput(),
        certificate: incompleteCertificate,
        providerCertificationHarnessHash:
          certified.providerCertificationHarnessHash!,
        scenario: "settled",
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("models provider retry and reversal outcomes without converting them into settlement evidence", async () => {
    const certified = certifiedProviderFixture();
    const retry = await runPayrollPaymentProviderFixture({
      ...submitInput(),
      certificate: certified.certificate,
      providerCertificationHarnessHash:
        certified.providerCertificationHarnessHash!,
      scenario: "retryable_error",
      errorCode: "PROVIDER_OUTAGE",
      retryAfterSeconds: 600,
    });
    const reversal = await runPayrollPaymentProviderFixture({
      ...submitInput(),
      certificate: certified.certificate,
      providerCertificationHarnessHash:
        certified.providerCertificationHarnessHash!,
      scenario: "reversed",
      reversalReason: "PROVIDER_CONFIRMED_REVERSAL",
    });

    expect(retry).toMatchObject({
      status: "retryable_error",
      errorCode: "PROVIDER_OUTAGE",
      retryAfterSeconds: 600,
      providerResponseHash: "sha256:provider-fixture-hash",
    });
    expect(reversal).toMatchObject({
      status: "reversed",
      reversalReason: "PROVIDER_CONFIRMED_REVERSAL",
      reversalReceiptHash: "sha256:provider-fixture-hash",
    });
    expect(() =>
      payrollSettlementEvidenceInputFromProviderOutcome({
        outcome: reversal,
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        actorPermissions: ["payroll.payments.reconcile"],
        sourceRegisterHash: "sha256:register",
      }),
    ).toThrow("Only settled payroll payment provider outcomes");
  });
});
