jest.mock("server-only", () => ({}));

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "provider-bridge-hash"),
}));

import {
  MatchRule,
  MatchStatus,
  PaymentDirection,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentMethod,
  PaymentTransactionState,
  PayrollPaymentBatchStatus,
  Prisma,
  ProviderEventStatus,
  StatementLineDirection,
  StatementLineStatus,
} from "@prisma/client";

import {
  createPayrollPaymentProviderFixtureAdapter,
  type PayrollPaymentProviderAdapter,
} from "../payroll-payment-provider-fixture-runner.service";
import { certifyPayrollPaymentProviderHarness } from "../payroll-adapter-certification-harness.service";
import { recordPayrollProviderMatchedSettlement } from "../payroll-provider-settlement-bridge.service";

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

const PAYMENT_PROVIDER_PROOF_METADATA = {
  componentRegisterProofHash: "sha256:component-proof",
  componentRegisterProofStatus: "MATCHED",
  payrollComponentMappingHash: "sha256:component-mapping",
  payrollComponentMappingStatus: "SUPPORTED_CERTIFIED",
  paymentAdapterProofHash: "sha256:payment-adapter-proof",
  paymentAdapterRegistryVersion: 1,
  paymentProviderAdapterContractHash: "sha256:payment-adapter-contract",
  paymentAdapterStatus: "SUPPORTED_CERTIFIED",
  paymentProviderAdapterKey: "MOMO_PAYROLL_PROVIDER_API",
  providerCertificationHarnessHash: "sha256:provider-bridge-hash",
  adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
  providerCredentialProofHash: "sha256:provider-credential-proof",
  providerPayloadMappingHash: "sha256:provider-payload-mapping",
  providerResponseMappingHash: "sha256:provider-response-mapping",
  providerAdapterRequestHash: "sha256:provider-request",
  providerAdapterResponseHash: "sha256:provider-response",
  providerSettlementReceiptHash: "sha256:provider-settlement-receipt",
  providerIdempotencyKey: "momo-payroll-batch-1",
  providerAttempt: 2,
  providerSettlementProofRequired: true,
  productionPaymentAutomationSupported: true,
};

function certifiedProviderFixture() {
  const result = certifyPayrollPaymentProviderHarness(completeProviderProof);
  expect(result.certificationReady).toBe(true);
  expect(result.providerCertificationHarnessHash).toBe(
    "sha256:provider-bridge-hash",
  );
  return result;
}

function fixtureAdapter(
  scenario: "settled" | "partially_settled" | "reversed" | "retryable_error",
): PayrollPaymentProviderAdapter {
  const certified = certifiedProviderFixture();
  const fixture = createPayrollPaymentProviderFixtureAdapter({
    certificate: certified.certificate,
    providerCertificationHarnessHash:
      certified.providerCertificationHarnessHash!,
    scenario,
  });
  return {
    submit: jest.fn((input) => fixture.submit(input)),
  };
}

function batchFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "batch-1",
    organizationId: "org-1",
    payrollRunId: "run-1",
    batchNumber: "PB-2026-06-0001",
    status: PayrollPaymentBatchStatus.RELEASED,
    method: PaymentMethod.MOBILE_MONEY,
    amount: new Prisma.Decimal("143700.00"),
    currency: "XAF",
    bankFileHash: "sha256:disbursement-file",
    paymentTransactionId: "payment-tx-1",
    ledgerPostingBatchId: "ledger-payment-1",
    postedBusinessEventId: "event-payment-posted-1",
    reconciliationStatus: "AWAITING_STATEMENT_MATCH",
    metadata: PAYMENT_PROVIDER_PROOF_METADATA,
    ...overrides,
  };
}

function transactionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-tx-1",
    organizationId: "org-1",
    providerAccountId: "provider-account-1",
    ledgerPostingBatchId: "ledger-payment-1",
    direction: PaymentDirection.OUTBOUND,
    state: PaymentTransactionState.CONFIRMED,
    amount: new Prisma.Decimal("143700.00"),
    currencyCode: "XAF",
    providerTransactionId: "momo-tx-1",
    providerReference: "PB-2026-06-0001",
    sourceType: "PAYROLL_PAYMENT",
    sourceId: "batch-1",
    payloadHash: "sha256:payment-payload",
    ...overrides,
  };
}

function matchFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "match-1",
    organizationId: "org-1",
    providerAccountId: "provider-account-1",
    paymentTransactionId: "payment-tx-1",
    providerEventId: "provider-event-record-1",
    statementLineId: "statement-line-1",
    reconciliationRunId: "recon-run-1",
    rule: MatchRule.EXACT_PROVIDER_TRANSACTION_ID,
    status: MatchStatus.APPROVED,
    confidence: new Prisma.Decimal("100.00"),
    amountMatched: new Prisma.Decimal("143700.00"),
    currencyCode: "XAF",
    matchedById: "controller-1",
    matchedAt: new Date("2026-06-30T09:00:00.000Z"),
    metadata: null,
    providerEvent: {
      id: "provider-event-record-1",
      providerEventId: "evt-1",
      providerTransactionId: "momo-tx-1",
      providerReference: "PB-2026-06-0001",
      eventType: "PAYMENT_SETTLED",
      status: ProviderEventStatus.VERIFIED,
      direction: PaymentDirection.OUTBOUND,
      amount: new Prisma.Decimal("143700.00"),
      currencyCode: "XAF",
      rawPayloadHash: "sha256:provider-event",
      signatureHash: "sha256:signature",
      signatureValid: true,
    },
    statementLine: {
      id: "statement-line-1",
      providerTransactionId: "momo-tx-1",
      providerReference: "PB-2026-06-0001",
      direction: StatementLineDirection.DEBIT,
      status: StatementLineStatus.MATCHED,
      amount: new Prisma.Decimal("143700.00"),
      currencyCode: "XAF",
      rawLineHash: "sha256:statement-line",
      statementFile: {
        id: "statement-file-1",
        fileHash: "sha256:statement-file",
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

function buildClient(overrides: {
  batch?: Record<string, unknown>;
  transaction?: Record<string, unknown>;
  match?: Record<string, unknown>;
  existingException?: { id: string } | null;
} = {}) {
  return {
    payrollPaymentBatch: {
      findFirst: jest.fn().mockResolvedValue(batchFixture(overrides.batch)),
    },
    paymentTransaction: {
      findFirst: jest.fn().mockResolvedValue(
        transactionFixture(overrides.transaction),
      ),
    },
    matchRecord: {
      findFirst: jest.fn().mockResolvedValue(matchFixture(overrides.match)),
    },
    paymentException: {
      findFirst: jest
        .fn()
        .mockResolvedValue(overrides.existingException ?? null),
      create: jest.fn().mockResolvedValue({ id: "exception-provider-1" }),
    },
  } as any;
}

function bridgeInput() {
  return {
    organizationId: "org-1",
    payrollPaymentBatchId: "batch-1",
    matchRecordId: "match-1",
    actorId: "controller-1",
    actorPermissions: ["payroll.payments.reconcile"],
    approvedById: "approver-1",
    sourceRegisterHash: "sha256:register",
    lastAuthAt: "2026-06-30T10:00:00.000Z",
    now: "2026-06-30T10:10:00.000Z",
  };
}

describe("payroll provider settlement bridge", () => {
  it("turns approved provider matches into payroll settlement evidence", async () => {
    const client = buildClient();
    const adapter = fixtureAdapter("settled");
    const recordSettlement = jest.fn().mockResolvedValue({
      payrollPaymentBatchId: "batch-1",
      payrollRunId: "run-1",
      status: PayrollPaymentBatchStatus.SETTLED,
      reconciliationStatus: "SETTLED",
      paymentTransactionId: "payment-tx-1",
      businessEventId: "event-settlement-1",
      settlementEvidenceHash: "sha256:provider-bridge-hash",
      idempotent: false,
    });

    const result = await recordPayrollProviderMatchedSettlement(
      bridgeInput(),
      { adapter, client, recordSettlement },
    );

    expect(adapter.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        payrollPaymentBatchId: "batch-1",
        method: PaymentMethod.MOBILE_MONEY,
        paymentProviderAdapterKey: "MOMO_PAYROLL_PROVIDER_API",
        providerCertificationHarnessHash: "sha256:provider-bridge-hash",
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        providerEvidence: expect.objectContaining({
          providerEventRecordId: "provider-event-record-1",
          providerEventId: "evt-1",
          providerTransactionId: "momo-tx-1",
          providerReference: "PB-2026-06-0001",
          statementLineId: "statement-line-1",
          statementFileHash: "sha256:statement-file",
          rawPayloadHash: "sha256:provider-event",
          rawLineHash: "sha256:statement-line",
        }),
      }),
    );
    expect(recordSettlement).toHaveBeenCalledWith(
      expect.objectContaining({
        settlementStatus: "settled",
        providerEventId: "evt-1",
        providerTransactionId: "momo-tx-1",
        providerReference: "PB-2026-06-0001",
        evidenceHash: "sha256:provider-bridge-hash",
        sourceRegisterHash: "sha256:register",
        idempotencyKey: "momo-payroll-batch-1",
        metadata: expect.objectContaining({
          providerSettlementAmount: "143700.00",
          providerSettlementCurrency: "XAF",
        }),
      }),
      client,
    );
    expect(result).toMatchObject({
      status: "SETTLED",
      settlement: expect.objectContaining({
        idempotent: false,
        businessEventId: "event-settlement-1",
      }),
    });
  });

  it("requires adapter chaos release gate proof before production provider automation", async () => {
    const client = buildClient({
      batch: {
        metadata: {
          ...PAYMENT_PROVIDER_PROOF_METADATA,
          adapterChaosReleaseGateHash: undefined,
        },
      },
    });
    const adapter = fixtureAdapter("settled");
    const recordSettlement = jest.fn();

    await expect(
      recordPayrollProviderMatchedSettlement(bridgeInput(), {
        adapter,
        client,
        recordSettlement,
      }),
    ).rejects.toThrow("adapterChaosReleaseGateHash");

    expect(adapter.submit).not.toHaveBeenCalled();
    expect(recordSettlement).not.toHaveBeenCalled();
    expect(client.paymentException.create).not.toHaveBeenCalled();
  });

  it("opens a review exception when approved provider matches exceed the linked payroll payment transaction", async () => {
    const overmatchedAmount = new Prisma.Decimal("150000.00");
    const client = buildClient({
      match: {
        amountMatched: overmatchedAmount,
        providerEvent: {
          ...matchFixture().providerEvent,
          amount: overmatchedAmount,
        },
        statementLine: {
          ...matchFixture().statementLine,
          amount: overmatchedAmount,
        },
      },
    });
    const adapter = fixtureAdapter("settled");
    const recordSettlement = jest.fn();

    const result = await recordPayrollProviderMatchedSettlement(bridgeInput(), {
      adapter,
      client,
      recordSettlement,
    });

    expect(result).toMatchObject({
      status: "FAILED_REQUIRES_REVIEW",
      exceptionId: "exception-provider-1",
      providerOutcome: null,
    });
    expect(adapter.submit).not.toHaveBeenCalled();
    expect(recordSettlement).not.toHaveBeenCalled();
    expect(client.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.MANUAL_REVIEW_REQUIRED,
          evidence: expect.objectContaining({
            reason: expect.stringContaining("approved match amount cannot exceed"),
            approvedMatchAmount: "150000.00",
            payrollPaymentBatchAmount: "143700.00",
            paymentTransactionAmount: "143700.00",
            redacted: true,
          }),
        }),
      }),
    );
  });

  it("opens a review exception when provider evidence amount disagrees with the approved match", async () => {
    const client = buildClient({
      match: {
        providerEvent: {
          ...matchFixture().providerEvent,
          amount: new Prisma.Decimal("140000.00"),
        },
      },
    });
    const adapter = fixtureAdapter("settled");
    const recordSettlement = jest.fn();

    const result = await recordPayrollProviderMatchedSettlement(bridgeInput(), {
      adapter,
      client,
      recordSettlement,
    });

    expect(result).toMatchObject({
      status: "FAILED_REQUIRES_REVIEW",
      exceptionId: "exception-provider-1",
      providerOutcome: null,
    });
    expect(adapter.submit).not.toHaveBeenCalled();
    expect(recordSettlement).not.toHaveBeenCalled();
    expect(client.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidence: expect.objectContaining({
            reason: expect.stringContaining(
              "provider event amount to tie out to approved provider match",
            ),
            providerEventAmount: "140000.00",
            approvedMatchAmount: "143700.00",
            redacted: true,
          }),
        }),
      }),
    );
  });

  it("opens a review exception when provider settlement outcomes do not echo the submitted payroll amount", async () => {
    const baseAdapter = fixtureAdapter("settled");
    const adapter: PayrollPaymentProviderAdapter = {
      submit: jest.fn(async (input) => {
        const outcome = await baseAdapter.submit(input);
        if (outcome.status !== "settled") return outcome;
        return {
          ...outcome,
          amount: "140000.00",
        };
      }),
    };
    const client = buildClient();
    const recordSettlement = jest.fn();

    const result = await recordPayrollProviderMatchedSettlement(bridgeInput(), {
      adapter,
      client,
      recordSettlement,
    });

    expect(result).toMatchObject({
      status: "FAILED_REQUIRES_REVIEW",
      exceptionId: "exception-provider-1",
      providerOutcome: expect.objectContaining({
        status: "settled",
        amount: "140000.00",
      }),
    });
    expect(recordSettlement).not.toHaveBeenCalled();
    expect(client.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidence: expect.objectContaining({
            reason: expect.stringContaining(
              "provider settlement outcome amount to tie out to submitted payroll payment",
            ),
            providerOutcomeAmount: "140000.00",
            providerOutcomeCurrency: "XAF",
            payrollPaymentBatchAmount: "143700.00",
            redacted: true,
          }),
        }),
      }),
    );
  });
  it("lets duplicate provider callback replay settle through the existing settlement idempotency path", async () => {
    const client = buildClient();
    const adapter = fixtureAdapter("settled");
    const recordSettlement = jest.fn().mockResolvedValue({
      payrollPaymentBatchId: "batch-1",
      payrollRunId: "run-1",
      status: PayrollPaymentBatchStatus.SETTLED,
      reconciliationStatus: "SETTLED",
      paymentTransactionId: "payment-tx-1",
      businessEventId: "event-settlement-1",
      settlementEvidenceHash: "sha256:provider-bridge-hash",
      idempotent: true,
    });

    const result = await recordPayrollProviderMatchedSettlement(
      bridgeInput(),
      { adapter, client, recordSettlement },
    );

    expect(result).toMatchObject({
      status: "SETTLED",
      settlement: expect.objectContaining({ idempotent: true }),
    });
    expect(client.paymentException.create).not.toHaveBeenCalled();
  });

  it("routes provider reversal outcomes to payment exceptions instead of settlement proof", async () => {
    const client = buildClient();
    const adapter = fixtureAdapter("reversed");
    const recordSettlement = jest.fn();

    const result = await recordPayrollProviderMatchedSettlement(
      bridgeInput(),
      { adapter, client, recordSettlement },
    );

    expect(recordSettlement).not.toHaveBeenCalled();
    expect(client.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.MANUAL_REVIEW_REQUIRED,
          status: PaymentExceptionStatus.OPEN,
          sourceType: "PAYROLL_PAYMENT_PROVIDER_OUTCOME",
          sourceId: "batch-1",
          providerEventId: "provider-event-record-1",
          statementLineId: "statement-line-1",
          evidence: expect.objectContaining({
            providerOutcomeStatus: "reversed",
            reversalReceiptHash: "sha256:provider-bridge-hash",
            redacted: true,
          }),
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "REVERSAL_REQUIRES_CORRECTION",
      exceptionId: "exception-provider-1",
      idempotent: false,
    });
  });

  it("blocks statement reversal evidence before provider settlement is attempted", async () => {
    const client = buildClient({
      match: {
        statementLine: {
          ...matchFixture().statementLine,
          direction: StatementLineDirection.REVERSAL,
        },
      },
    });
    const adapter = fixtureAdapter("settled");
    const recordSettlement = jest.fn();

    const result = await recordPayrollProviderMatchedSettlement(
      bridgeInput(),
      { adapter, client, recordSettlement },
    );

    expect(adapter.submit).not.toHaveBeenCalled();
    expect(recordSettlement).not.toHaveBeenCalled();
    expect(client.paymentException.create).toHaveBeenCalled();
    expect(result.status).toBe("REVERSAL_REQUIRES_CORRECTION");
  });

  it("returns retryable provider outcomes without settlement or exception mutation", async () => {
    const client = buildClient();
    const adapter = fixtureAdapter("retryable_error");
    const recordSettlement = jest.fn();

    const result = await recordPayrollProviderMatchedSettlement(
      bridgeInput(),
      { adapter, client, recordSettlement },
    );

    expect(recordSettlement).not.toHaveBeenCalled();
    expect(client.paymentException.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "RETRY_SCHEDULED",
      providerOutcome: expect.objectContaining({
        status: "retryable_error",
        providerIdempotencyKey: "momo-payroll-batch-1",
      }),
    });
  });

  it("rejects inbound provider evidence for payroll outbound settlement", async () => {
    const client = buildClient({
      match: {
        providerEvent: {
          ...matchFixture().providerEvent,
          direction: PaymentDirection.INBOUND,
        },
      },
    });
    const adapter = fixtureAdapter("settled");
    const recordSettlement = jest.fn();

    await expect(
      recordPayrollProviderMatchedSettlement(bridgeInput(), {
        adapter,
        client,
        recordSettlement,
      }),
    ).rejects.toThrow("outbound provider payment evidence");

    expect(adapter.submit).not.toHaveBeenCalled();
    expect(recordSettlement).not.toHaveBeenCalled();
    expect(client.paymentException.create).not.toHaveBeenCalled();
  });
});
