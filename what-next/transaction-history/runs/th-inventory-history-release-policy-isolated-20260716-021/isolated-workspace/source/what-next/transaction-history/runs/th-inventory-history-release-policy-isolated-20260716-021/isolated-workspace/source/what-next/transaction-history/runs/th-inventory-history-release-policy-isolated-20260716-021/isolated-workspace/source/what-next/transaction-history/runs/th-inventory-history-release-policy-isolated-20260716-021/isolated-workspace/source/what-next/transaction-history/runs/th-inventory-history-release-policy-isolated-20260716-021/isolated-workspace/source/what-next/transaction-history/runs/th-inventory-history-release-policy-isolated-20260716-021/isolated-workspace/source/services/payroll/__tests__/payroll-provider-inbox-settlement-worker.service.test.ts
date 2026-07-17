jest.mock("server-only", () => ({}));

import {
  PaymentReconciliationInboxSource,
  PaymentReconciliationInboxStatus,
  PayrollPaymentBatchStatus,
} from "@prisma/client";

import { BusinessRuleError } from "@/services/_shared/action-errors";

import type { PayrollPaymentProviderAdapter } from "../payroll-payment-provider-fixture-runner.service";
import { processPayrollProviderInboxSettlementItem } from "../payroll-provider-inbox-settlement-worker.service";

function inboxRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inbox-1",
    organizationId: "org-1",
    providerAccountId: "provider-account-1",
    source: PaymentReconciliationInboxSource.PROVIDER_EVENT,
    status: PaymentReconciliationInboxStatus.PROCESSING,
    leasedBy: "worker-1",
    leaseToken: "lease-token-1",
    correlationId: "corr-1",
    ...overrides,
  };
}

function workerInput(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    inboxItemId: "inbox-1",
    leasedBy: "worker-1",
    leaseToken: "lease-token-1",
    payrollPaymentBatchId: "batch-1",
    matchRecordId: "match-1",
    actorId: "controller-1",
    actorPermissions: ["payroll.payments.reconcile"],
    approvedById: "approver-1",
    sourceRegisterHash: "sha256:register",
    lastAuthAt: "2026-06-30T10:00:00.000Z",
    now: "2026-06-30T10:10:00.000Z",
    maxAttempts: 5,
    retryBaseSeconds: 60,
    ...overrides,
  };
}

function buildClient(row = inboxRow()) {
  return {
    paymentReconciliationInboxItem: {
      findFirst: jest.fn().mockResolvedValue(row),
    },
  } as any;
}

function adapter(): PayrollPaymentProviderAdapter {
  return {
    submit: jest.fn(),
  };
}

function completedInbox(action = "COMPLETED") {
  return {
    item: {
      id: "inbox-1",
      status: PaymentReconciliationInboxStatus.PROCESSED,
      action,
      redacted: true,
    },
    redaction: {
      rawPayloadsIncluded: false,
      payloadSummariesReturned: false,
      credentialSecretsIncluded: false,
    },
  };
}

function failedInbox(action = "RETRY_SCHEDULED") {
  return {
    item: {
      id: "inbox-1",
      status: PaymentReconciliationInboxStatus.FAILED,
      action,
      redacted: true,
    },
    redaction: {
      rawPayloadsIncluded: false,
      payloadSummariesReturned: false,
      credentialSecretsIncluded: false,
    },
  };
}

function settlementBridgeResult(overrides: Record<string, unknown> = {}) {
  return {
    status: "SETTLED",
    payrollPaymentBatchId: "batch-1",
    matchRecordId: "match-1",
    providerOutcome: {
      status: "settled",
      settlementStatus: "settled",
      amount: "143700.00",
      currency: "XAF",
      providerEventId: "evt-1",
      providerTransactionId: "provider-tx-1",
      providerReference: "PB-2026-06-0001",
      providerResponseHash: "sha256:provider-response",
      providerSettlementReceiptHash: "sha256:provider-receipt",
      settlementEvidenceHash: "sha256:settlement-evidence",
      providerIdempotencyKey: "provider-idem-1",
      responseSummary: { redacted: true },
    },
    settlement: {
      payrollPaymentBatchId: "batch-1",
      payrollRunId: "run-1",
      status: PayrollPaymentBatchStatus.SETTLED,
      reconciliationStatus: "SETTLED",
      paymentTransactionId: "payment-tx-1",
      businessEventId: "event-settlement-1",
      settlementEvidenceHash: "sha256:settlement-evidence",
      idempotent: false,
    },
    ...overrides,
  };
}

describe("processPayrollProviderInboxSettlementItem", () => {
  it("completes the inbox item only after settlement evidence is recorded", async () => {
    const client = buildClient();
    const recordBridge = jest.fn().mockResolvedValue(settlementBridgeResult());
    const completeInbox = jest.fn().mockResolvedValue(completedInbox());
    const failInbox = jest.fn();

    const result = await processPayrollProviderInboxSettlementItem(
      workerInput(),
      {
        adapter: adapter(),
        client,
        recordBridge: recordBridge as any,
        completeInbox: completeInbox as any,
        failInbox: failInbox as any,
      },
    );

    expect(recordBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        payrollPaymentBatchId: "batch-1",
        matchRecordId: "match-1",
        sourceRegisterHash: "sha256:register",
      }),
      expect.objectContaining({ client }),
    );
    expect(completeInbox).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        inboxItemId: "inbox-1",
        leasedBy: "worker-1",
        leaseToken: "lease-token-1",
        processedBy: "controller-1",
        correlationId: "corr-1",
      }),
      client,
    );
    expect(failInbox).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "SETTLEMENT_EVIDENCE_RECORDED",
      inboxItem: expect.objectContaining({ action: "COMPLETED" }),
      bridgeResult: expect.objectContaining({ status: "SETTLED" }),
    });
  });

  it("completes the inbox item after reversal exception evidence is recorded", async () => {
    const client = buildClient();
    const recordBridge = jest.fn().mockResolvedValue({
      status: "REVERSAL_REQUIRES_CORRECTION",
      payrollPaymentBatchId: "batch-1",
      matchRecordId: "match-1",
      providerOutcome: null,
      exceptionId: "exception-1",
      idempotent: false,
    });
    const completeInbox = jest.fn().mockResolvedValue(completedInbox());
    const failInbox = jest.fn();

    const result = await processPayrollProviderInboxSettlementItem(
      workerInput(),
      {
        adapter: adapter(),
        client,
        recordBridge: recordBridge as any,
        completeInbox: completeInbox as any,
        failInbox: failInbox as any,
      },
    );

    expect(completeInbox).toHaveBeenCalled();
    expect(failInbox).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "EXCEPTION_EVIDENCE_RECORDED",
      bridgeResult: expect.objectContaining({
        status: "REVERSAL_REQUIRES_CORRECTION",
        exceptionId: "exception-1",
      }),
    });
  });

  it("fails the inbox item for retryable provider outcomes without completion", async () => {
    const client = buildClient();
    const recordBridge = jest.fn().mockResolvedValue({
      status: "RETRY_SCHEDULED",
      payrollPaymentBatchId: "batch-1",
      matchRecordId: "match-1",
      providerOutcome: {
        status: "retryable_error",
        errorCode: "PROVIDER_OUTAGE",
        errorMessage: "Provider requested retry.",
        providerResponseHash: "sha256:provider-response",
        retryAfterSeconds: 600,
        providerIdempotencyKey: "provider-idem-1",
        responseSummary: { redacted: true },
      },
    });
    const completeInbox = jest.fn();
    const failInbox = jest.fn().mockResolvedValue(failedInbox());

    const result = await processPayrollProviderInboxSettlementItem(
      workerInput(),
      {
        adapter: adapter(),
        client,
        recordBridge: recordBridge as any,
        completeInbox: completeInbox as any,
        failInbox: failInbox as any,
      },
    );

    expect(completeInbox).not.toHaveBeenCalled();
    expect(failInbox).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "PROVIDER_OUTAGE",
        retryAfterSeconds: 600,
        retryBaseSeconds: 60,
        maxAttempts: 5,
      }),
      client,
    );
    expect(result).toMatchObject({
      status: "RETRY_SCHEDULED",
      inboxItem: expect.objectContaining({ action: "RETRY_SCHEDULED" }),
    });
  });

  it("fails the inbox item when the bridge rejects before proof is recorded", async () => {
    const client = buildClient();
    const recordBridge = jest
      .fn()
      .mockRejectedValue(new BusinessRuleError("Provider proof missing."));
    const completeInbox = jest.fn();
    const failInbox = jest.fn().mockResolvedValue(failedInbox());

    const result = await processPayrollProviderInboxSettlementItem(
      workerInput(),
      {
        adapter: adapter(),
        client,
        recordBridge: recordBridge as any,
        completeInbox: completeInbox as any,
        failInbox: failInbox as any,
      },
    );

    expect(completeInbox).not.toHaveBeenCalled();
    expect(failInbox).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "PAYROLL_PROVIDER_BRIDGE_BLOCKED",
        retryBaseSeconds: 60,
        maxAttempts: 5,
      }),
      client,
    );
    expect(result).toMatchObject({
      status: "BRIDGE_FAILED_RETRY_SCHEDULED",
      errorCode: "PAYROLL_PROVIDER_BRIDGE_BLOCKED",
      bridgeResult: null,
    });
  });

  it("rejects stale leases before invoking bridge or inbox mutation", async () => {
    const client = buildClient(inboxRow({ leaseToken: "other-token" }));
    const recordBridge = jest.fn();
    const completeInbox = jest.fn();
    const failInbox = jest.fn();

    await expect(
      processPayrollProviderInboxSettlementItem(workerInput(), {
        adapter: adapter(),
        client,
        recordBridge: recordBridge as any,
        completeInbox: completeInbox as any,
        failInbox: failInbox as any,
      }),
    ).rejects.toThrow("lease does not match");

    expect(recordBridge).not.toHaveBeenCalled();
    expect(completeInbox).not.toHaveBeenCalled();
    expect(failInbox).not.toHaveBeenCalled();
  });

  it("rejects non-provider inbox sources before invoking bridge", async () => {
    const client = buildClient(
      inboxRow({ source: PaymentReconciliationInboxSource.CERTIFICATE_EXPORT }),
    );
    const recordBridge = jest.fn();
    const completeInbox = jest.fn();
    const failInbox = jest.fn();

    await expect(
      processPayrollProviderInboxSettlementItem(workerInput(), {
        adapter: adapter(),
        client,
        recordBridge: recordBridge as any,
        completeInbox: completeInbox as any,
        failInbox: failInbox as any,
      }),
    ).rejects.toThrow("provider event or statement file inbox items");

    expect(recordBridge).not.toHaveBeenCalled();
    expect(completeInbox).not.toHaveBeenCalled();
    expect(failInbox).not.toHaveBeenCalled();
  });
});
