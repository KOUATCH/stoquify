jest.mock("server-only", () => ({}));

jest.mock("@/lib/security/rbac-permissions", () => ({
  hasAnyRbacPermission: jest.fn(),
}));

import {
  PaymentExceptionStatus,
  PaymentReconciliationInboxStatus,
  PaymentMethod,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  ProviderAccountStatus,
  ProviderEventStatus,
  ReconciliationRunStatus,
  StatementFileStatus,
} from "@prisma/client";

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions";
import { ForbiddenError } from "@/services/_shared/action-errors";

import { getPayrollAdapterOperationsReadModel } from "../adapter-operations-read-model.service";

const mockHasAnyRbacPermission = hasAnyRbacPermission as jest.Mock;

function buildClient(overrides: Record<string, unknown> = {}) {
  return {
    providerAccount: { findMany: jest.fn().mockResolvedValue([]) },
    providerEvent: { findMany: jest.fn().mockResolvedValue([]) },
    statementFile: { findMany: jest.fn().mockResolvedValue([]) },
    paymentException: { findMany: jest.fn().mockResolvedValue([]) },
    paymentReconciliationInboxItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    reconciliationRun: { findMany: jest.fn().mockResolvedValue([]) },
    payrollDeclaration: { findMany: jest.fn().mockResolvedValue([]) },
    payrollPaymentBatch: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
}

describe("getPayrollAdapterOperationsReadModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasAnyRbacPermission.mockReturnValue(true);
  });

  it("builds redacted provider, authority, and payment adapter operations readiness", async () => {
    const client = buildClient({
      providerAccount: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "provider-1",
            providerCode: "MOMO",
            displayName: "Main Mobile Money",
            status: ProviderAccountStatus.ACTIVE,
            countryCode: "CM",
            currencyCode: "XAF",
            statementSource: "statement-import",
            settlementLedgerAccountId: "ledger-settlement-1",
            suspenseLedgerAccountId: null,
            updatedAt: new Date("2026-06-30T07:00:00.000Z"),
          },
        ]),
      },
      providerEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "provider-event-1",
            providerAccountId: "provider-1",
            status: ProviderEventStatus.RECEIVED,
            eventType: "PAYROLL_SETTLEMENT_CALLBACK",
            rawPayloadHash: "sha256:provider-event-payload",
            signatureValid: true,
            receivedAt: new Date("2026-06-29T07:00:00.000Z"),
            processedAt: null,
          },
          {
            id: "provider-event-2",
            providerAccountId: "provider-1",
            status: ProviderEventStatus.TAMPERED,
            eventType: "PAYROLL_SETTLEMENT_CALLBACK",
            rawPayloadHash: "sha256:tamper-payload",
            signatureValid: false,
            receivedAt: new Date("2026-06-30T06:30:00.000Z"),
            processedAt: null,
          },
        ]),
      },
      statementFile: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "statement-file-1",
            providerAccountId: "provider-1",
            fileHash: "sha256:statement-file",
            status: StatementFileStatus.PROCESSED,
            importedAt: new Date("2026-06-20T08:00:00.000Z"),
            periodEnd: new Date("2026-06-20T23:59:59.999Z"),
          },
        ]),
      },
      paymentException: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "exception-1",
            providerAccountId: "provider-1",
            type: "DUPLICATE_PROVIDER_REFERENCE",
            severity: "HIGH",
            status: PaymentExceptionStatus.OPEN,
            evidence: { evidenceHash: "sha256:exception-evidence" },
            slaDeadline: new Date("2026-07-01T00:00:00.000Z"),
          },
        ]),
      },
      paymentReconciliationInboxItem: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: "inbox-1",
              providerAccountId: "provider-1",
              source: "PROVIDER_EVENT",
              status: PaymentReconciliationInboxStatus.DEAD_LETTER,
              payloadHash: "sha256:dead-letter-payload",
              payloadSummary: {
                secretToken: "do-not-leak",
                worker: {
                  action: "DEAD_LETTERED",
                  actorId: "worker-1",
                  asOf: "2026-06-30T07:20:00.000Z",
                  errorCode: "MAX_ATTEMPTS_EXCEEDED",
                  redactionPolicy: "payment-reconciliation-inbox-worker-redacted",
                },
              },
              attempts: 5,
              nextAttemptAt: null,
              leasedBy: null,
              lastError: "raw provider secret stack should not leak",
              externalId: "provider-event-dead-letter",
              correlationId: "corr-dead-letter",
              processedAt: null,
              updatedAt: new Date("2026-06-30T07:20:00.000Z"),
            },
            {
              id: "inbox-2",
              providerAccountId: "provider-1",
              source: "PROVIDER_EVENT",
              status: PaymentReconciliationInboxStatus.FAILED,
              payloadHash: "sha256:failed-payload",
              payloadSummary: {
                worker: {
                  action: "RETRY_SCHEDULED",
                  actorId: "worker-1",
                  asOf: "2026-06-30T07:40:00.000Z",
                  nextAttemptAt: "2026-06-30T07:55:00.000Z",
                  errorCode: "PROVIDER_TIMEOUT",
                  redactionPolicy: "payment-reconciliation-inbox-worker-redacted",
                },
              },
              attempts: 2,
              nextAttemptAt: new Date("2026-06-30T07:55:00.000Z"),
              leasedBy: null,
              lastError: "PROVIDER_TIMEOUT",
              externalId: "provider-event-failed",
              correlationId: "corr-failed",
              processedAt: null,
              updatedAt: new Date("2026-06-30T07:40:00.000Z"),
            },
            {
              id: "inbox-3",
              providerAccountId: "provider-1",
              source: "STATEMENT_FILE",
              status: PaymentReconciliationInboxStatus.PROCESSING,
              payloadHash: "sha256:processing-payload",
              payloadSummary: {
                worker: {
                  action: "LEASED",
                  actorId: "worker-1",
                  asOf: "2026-06-30T07:35:00.000Z",
                  nextAttemptAt: "2026-06-30T07:50:00.000Z",
                  redactionPolicy: "payment-reconciliation-inbox-worker-redacted",
                },
              },
              attempts: 1,
              nextAttemptAt: new Date("2026-06-30T07:50:00.000Z"),
              leasedBy: "worker-1",
              lastError: null,
              externalId: "statement-file-processing",
              correlationId: "corr-processing",
              processedAt: null,
              updatedAt: new Date("2026-06-30T07:35:00.000Z"),
            },
          ])
          .mockResolvedValueOnce([
            {
              id: "inbox-4",
              providerAccountId: "provider-1",
              source: "PROVIDER_EVENT",
              status: PaymentReconciliationInboxStatus.PROCESSED,
              payloadHash: "sha256:completed-payload",
              payloadSummary: {
                worker: {
                  action: "COMPLETED",
                  actorId: "worker-1",
                  asOf: "2026-06-30T07:15:00.000Z",
                  redactionPolicy: "payment-reconciliation-inbox-worker-redacted",
                },
              },
              attempts: 1,
              nextAttemptAt: null,
              leasedBy: null,
              lastError: null,
              externalId: "provider-event-completed",
              correlationId: "corr-completed",
              processedAt: new Date("2026-06-30T07:15:00.000Z"),
              updatedAt: new Date("2026-06-30T07:15:00.000Z"),
            },
          ]),
      },
      reconciliationRun: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "recon-run-1",
            providerAccountId: "provider-1",
            status: ReconciliationRunStatus.BLOCKED,
            certificateHash: "sha256:recon-certificate",
            metadata: {
              concurrencyGuard: "same_provider_business_date",
              runDedupeKey: "org-1:provider-1:2026-06-30",
            },
            updatedAt: new Date("2026-06-30T07:30:00.000Z"),
          },
        ]),
      },
      payrollDeclaration: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "declaration-1",
            authority: "CM_CNPS",
            declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
            status: PayrollDeclarationStatus.SUBMITTED,
            updatedAt: new Date("2026-06-30T07:45:00.000Z"),
            metadata: {
              authorityAdapterExecution: {
                status: "DEAD_LETTER",
                declarationEvidenceId: "evidence-1",
                authorityAdapterKey: "CM_CNPS_PRODUCTION_API",
                authorityAdapterProofHash: "sha256:authority-proof",
                attempts: 5,
                errorCode: "PROVIDER_TIMEOUT",
              },
            },
            evidenceItems: [
              {
                id: "evidence-1",
                productionSubmissionSupported: true,
                metadata: {
                  authorityAdapterProofHash: "sha256:authority-proof",
                },
                createdAt: new Date("2026-06-30T07:40:00.000Z"),
              },
            ],
          },
        ]),
      },
      payrollPaymentBatch: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "payment-batch-1",
            batchNumber: "PAY-2026-06",
            status: PayrollPaymentBatchStatus.RELEASED,
            method: PaymentMethod.MOBILE_MONEY,
            reconciliationStatus: "EXCEPTION_OPEN",
            paymentExceptionId: "exception-1",
            metadata: {
              paymentAdapterStatus: "SUPPORTED_CERTIFIED",
              productionPaymentAutomationSupported: true,
              paymentAdapterProofHash: "sha256:payment-adapter-proof",
              paymentProviderAdapterContractHash: "sha256:provider-contract",
              paymentAdapterCertificationBlockers: [
                "PROVIDER_CERTIFICATION_HARNESS_COMPLETE",
              ],
            },
          },
        ]),
      },
    });

    const result = await getPayrollAdapterOperationsReadModel(
      {
        organizationId: "org-1",
        actorPermissions: ["payroll.command.read"],
        asOf: "2026-06-30T08:00:00.000Z",
        callbackLagMinutes: 30,
        staleStatementHours: 72,
      },
      client,
    );

    expect(result.summary).toMatchObject({
      providerAccounts: 1,
      providerBlocked: 1,
      staleStatementProviders: 1,
      laggingCallbackProviders: 1,
      deadLetterInboxItems: 1,
      failedInboxItems: 1,
      processingInboxItems: 1,
      retryDueInboxItems: 1,
      staleProcessingInboxItems: 1,
      settlementWorkerLeasedItems: 1,
      settlementWorkerRetryScheduledItems: 1,
      settlementWorkerDeadLetteredItems: 1,
      settlementWorkerCompletedItems: 1,
      settlementWorkerUnknownItems: 0,
      openPaymentExceptions: 1,
      replayOrTamperEvents: 1,
      authorityDeadLetter: 1,
      authorityHarnessGaps: 1,
      paymentAdapterGaps: 1,
      adapterChaosGateBlockers: 2,
      authorityChaosGateMissing: 1,
      providerChaosGateMissing: 1,
    });
    expect(result.providerHealth[0]).toMatchObject({
      state: "BLOCKED",
      latestStatementFileHash: "sha256:statement-file",
      latestReconciliationGuard: "same_provider_business_date",
      latestReconciliationRunDedupeKey: "org-1:provider-1:2026-06-30",
      openExceptionCount: 1,
      deadLetterInboxCount: 1,
      failedInboxCount: 1,
      processingInboxCount: 1,
      retryDueInboxCount: 1,
      staleProcessingInboxCount: 1,
      duplicateRiskCount: 1,
      settlementWorker: expect.objectContaining({
        leasedCount: 1,
        retryScheduledCount: 1,
        deadLetteredCount: 1,
        completedCount: 1,
        unknownCount: 0,
        latestAction: "RETRY_SCHEDULED",
        latestActionSource: "WORKER_METADATA",
        latestActionAt: "2026-06-30T07:40:00.000Z",
        nextRetryAt: "2026-06-30T07:55:00.000Z",
        lastErrorCode: "PROVIDER_TIMEOUT",
        evidenceRefs: expect.arrayContaining([
          expect.objectContaining({
            inboxItemId: "inbox-2",
            payloadHash: "sha256:failed-payload",
            externalId: "provider-event-failed",
            correlationId: "corr-failed",
            workerAction: "RETRY_SCHEDULED",
            workerActionSource: "WORKER_METADATA",
            redactionPolicy: "payment-reconciliation-inbox-worker-redacted",
          }),
          expect.objectContaining({
            inboxItemId: "inbox-4",
            payloadHash: "sha256:completed-payload",
            workerAction: "COMPLETED",
          }),
        ]),
      }),
      missingSuspenseLedger: true,
      blockers: expect.arrayContaining([
        "PROVIDER_STATEMENT_STALE",
        "PROVIDER_CALLBACK_LAGGING",
        "PROVIDER_REPLAY_OR_TAMPER_EVENT",
        "PROVIDER_DEAD_LETTER_INBOX",
        "PROVIDER_INBOX_PROCESSING_STALE",
        "PROVIDER_RECONCILIATION_RUN_OPEN",
        "PROVIDER_LEDGER_MAPPING_MISSING",
      ]),
    });
    expect(result.authorityExecutions[0]).toMatchObject({
      executionStatus: "DEAD_LETTER",
      authorityCertificationHarnessHash: null,
      blockers: expect.arrayContaining([
        "AUTHORITY_CERTIFICATION_HARNESS_MISSING",
        "AUTHORITY_EXECUTION_DEAD_LETTER",
        "AUTHORITY_CHAOS_GATE_PROOF_MISSING",
      ]),
    });
    expect(result.paymentAdapterGaps[0]).toMatchObject({
      providerCertificationHarnessHash: null,
      blockers: expect.arrayContaining([
        "PROVIDER_CERTIFICATION_HARNESS_MISSING",
        "PAYMENT_ADAPTER_PROOF_INCOMPLETE",
        "PROVIDER_CHAOS_GATE_PROOF_MISSING",
        "PAYMENT_EXCEPTION_OPEN",
      ]),
    });
    expect(result.adapterChaosGate).toMatchObject({
      state: "ACTION_REQUIRED",
      authorityAutomationClaims: 1,
      providerAutomationClaims: 1,
      authorityProofCount: 0,
      providerProofCount: 0,
      missingAuthorityProofCount: 1,
      missingProviderProofCount: 1,
      blockerCodes: expect.arrayContaining([
        "AUTHORITY_CHAOS_GATE_PROOF_MISSING",
        "PROVIDER_CHAOS_GATE_PROOF_MISSING",
      ]),
    });
    expect(result.incidentDigest.inboxItems[0]).toMatchObject({
      payloadHash: "sha256:dead-letter-payload",
      leasedBy: null,
      externalId: "provider-event-dead-letter",
      correlationId: "corr-dead-letter",
      workerAction: "DEAD_LETTERED",
      workerActionSource: "WORKER_METADATA",
      workerActionAt: "2026-06-30T07:20:00.000Z",
      workerRedactionPolicy: "payment-reconciliation-inbox-worker-redacted",
      lastErrorCode: "MAX_ATTEMPTS_EXCEEDED",
    });
    expect(result.incidentDigest.inboxItems[2]).toMatchObject({
      payloadHash: "sha256:processing-payload",
      leasedBy: "worker-1",
      workerAction: "LEASED",
      workerActionSource: "WORKER_METADATA",
    });
    expect(result.incidentDigest.inboxItems[3]).toMatchObject({
      payloadHash: "sha256:completed-payload",
      processedAt: "2026-06-30T07:15:00.000Z",
      workerAction: "COMPLETED",
      workerActionSource: "WORKER_METADATA",
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("raw provider secret stack");
    expect(serialized).not.toContain("do-not-leak");
    expect(serialized).not.toContain("actorId");
    expect(serialized).not.toContain("externalAccountMasked");
    expect(result.redaction).toMatchObject({
      rawPayloadsIncluded: false,
      credentialSecretsIncluded: false,
      salaryOrEmployeeIdentityIncluded: false,
    });
  });

  it("surfaces amendment-required authority execution as a maker-checker action", async () => {
    const client = buildClient({
      payrollDeclaration: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "declaration-2",
            authority: "CM_CNPS",
            declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
            status: PayrollDeclarationStatus.SUBMITTED,
            updatedAt: new Date("2026-06-30T08:30:00.000Z"),
            metadata: {
              authorityAdapterExecution: {
                status: "AMENDMENT_REQUIRED",
                declarationEvidenceId: "evidence-2",
                authorityAdapterKey: "CM_CNPS_PRODUCTION_API",
                authorityAdapterProofHash: "sha256:authority-proof",
                authorityCertificationHarnessHash: "sha256:authority-harness",
                adapterChaosReleaseGateHash: "sha256:authority-chaos-gate",
                attempts: 1,
                errorCode: "AMENDMENT_REQUIRED",
              },
            },
            evidenceItems: [
              {
                id: "evidence-2",
                productionSubmissionSupported: true,
                metadata: {
                  authorityAdapterProofHash: "sha256:authority-proof",
                  authorityCertificationHarnessHash: "sha256:authority-harness",
                  adapterChaosReleaseGateHash: "sha256:authority-chaos-gate",
                },
                createdAt: new Date("2026-06-30T08:20:00.000Z"),
              },
            ],
          },
        ]),
      },
    });

    const result = await getPayrollAdapterOperationsReadModel(
      {
        organizationId: "org-1",
        actorPermissions: ["payroll.command.read"],
        asOf: "2026-06-30T09:00:00.000Z",
      },
      client,
    );

    expect(result.authorityExecutions[0]).toMatchObject({
      executionStatus: "AMENDMENT_REQUIRED",
      blockers: expect.arrayContaining(["AUTHORITY_AMENDMENT_REQUIRED"]),
      nextAction:
        "Capture maker-checker amendment evidence before close certification proceeds.",
    });
  });

  it("requires payroll adapter operations read permission", async () => {
    mockHasAnyRbacPermission.mockReturnValue(false);

    await expect(
      getPayrollAdapterOperationsReadModel(
        {
          organizationId: "org-1",
          actorPermissions: ["inventory.read"],
        },
        buildClient(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("blocks access when the payroll module is not entitled", async () => {
    await expect(
      getPayrollAdapterOperationsReadModel(
        {
          organizationId: "org-1",
          actorPermissions: ["payroll.command.read"],
          moduleDecision: {
            allowed: false,
            reason: "PLAN_LIMIT" as never,
            moduleKey: "payroll" as never,
          },
        },
        buildClient(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
