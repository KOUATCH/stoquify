import { getPayrollSetupEvidenceReadModel } from "../payroll-setup-evidence.service";

jest.mock("../../../prisma/db", () => ({
  db: {},
}));

function executionAudit(overrides: Record<string, unknown> = {}) {
  return {
    id: "audit-execution-1",
    entityId: "sha256:execution-ledger",
    entityType: "PayrollProofBackfillExecutionCertificate",
    action: "PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE_RECORDED",
    createdAt: new Date("2026-06-30T10:00:00.000Z"),
    changes: {
      before: null,
      after: {
        status: "EXECUTION_DISABLED",
        certificateHash: "sha256:execution-certificate",
        dryRunEvidenceHash: "sha256:execution-dry-run",
        approvalBundleHash: "sha256:approval-bundle",
        missingSignoffs: [],
        executionEnabled: false,
        mutationAttempted: false,
        idempotencyLedger: {
          ledgerKey: "sha256:execution-ledger",
        },
        proofBackfill: {
          totalBlockingGaps: 3,
          gapCounts: {
            declarationEvidenceMissingAuthorityLifecycleProof: 1,
            paymentBatchMissingSettlementLifecycleProof: 2,
          },
        },
        ...overrides,
      },
    },
  };
}

function reconciliationAudit(overrides: Record<string, unknown> = {}) {
  return {
    id: "audit-reconciliation-1",
    entityId: "sha256:execution-ledger",
    entityType: "PayrollProofBackfillReconciliationCertificate",
    action: "PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_RECORDED",
    createdAt: new Date("2026-06-30T12:00:00.000Z"),
    changes: {
      before: null,
      after: {
        status: "READY_FOR_CLOSE_RECHECK",
        certificateHash: "sha256:reconciliation-certificate",
        sourceCertificate: {
          ledgerKey: "sha256:execution-ledger",
          dryRunEvidenceHash: "sha256:execution-dry-run",
          approvalBundleHashPresent: true,
          missingSignoffs: [],
          executionEnabled: false,
          mutationAttempted: false,
          validated: true,
        },
        currentProofBackfill: {
          totalBlockingGaps: 0,
          postMigrationProofGapsCleared: true,
          gapCounts: {
            declarationEvidenceMissingAuthorityLifecycleProof: 0,
            paymentBatchMissingSettlementLifecycleProof: 0,
          },
        },
        dataTrustProofGate: {
          status: "READY",
          blockerIds: [],
        },
        ...overrides,
      },
    },
  };
}

function buildClient(
  executionRows: unknown[] = [],
  reconciliationRows: unknown[] = [],
) {
  return {
    auditLog: {
      findMany: jest
        .fn()
        .mockResolvedValueOnce(executionRows)
        .mockResolvedValueOnce(reconciliationRows),
    },
  };
}

const input = {
  organizationId: "org-1",
  actorId: "setup-admin-1",
  actorPermissions: ["payroll.runs.calculate"],
  countryCode: "CM",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
  payDate: "2026-06-30",
  employeeSourceMode: "users" as const,
  maxRows: 5,
};

describe("payroll setup evidence read model", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an empty redacted evidence state when no certificates exist", async () => {
    const client = buildClient();

    const model = await getPayrollSetupEvidenceReadModel(input, client as any);

    expect(model.status).toBe("NO_EVIDENCE");
    expect(model.latestExecutionCertificate).toBeNull();
    expect(model.latestReconciliationCertificate).toBeNull();
    expect(model.totals).toEqual({
      executionCertificateCount: 0,
      reconciliationCertificateCount: 0,
    });
    expect(model.redaction).toEqual(
      expect.objectContaining({
        rawAuditLogIdsIncluded: false,
        rawPersonDataIncluded: false,
        rawPaymentDestinationIncluded: false,
        rawSalaryIncluded: false,
        rawProviderPayloadIncluded: false,
      }),
    );
    expect(client.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          entityType: "PayrollProofBackfillExecutionCertificate",
        }),
        take: 5,
      }),
    );
  });

  it("summarizes execution and reconciliation certificates without raw audit ids or tenant ids", async () => {
    const client = buildClient([executionAudit()], [reconciliationAudit()]);

    const model = await getPayrollSetupEvidenceReadModel(input, client as any);

    expect(model.status).toBe("READY_FOR_CLOSE_RECHECK");
    expect(model.latestExecutionCertificate).toEqual(
      expect.objectContaining({
        kind: "execution",
        ledgerKey: "sha256:execution-ledger",
        status: "EXECUTION_DISABLED",
        certificateHash: "sha256:execution-certificate",
        approvalBundleHashPresent: true,
        missingSignoffCount: 0,
        executionEnabled: false,
        mutationAttempted: false,
        totalBlockingGaps: 3,
      }),
    );
    expect(model.latestReconciliationCertificate).toEqual(
      expect.objectContaining({
        kind: "reconciliation",
        status: "READY_FOR_CLOSE_RECHECK",
        certificateHash: "sha256:reconciliation-certificate",
        dataTrustProofGateStatus: "READY",
        sourceCertificateValid: true,
        postMigrationProofGapsCleared: true,
        totalBlockingGaps: 0,
      }),
    );

    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain("audit-execution-1");
    expect(serialized).not.toContain("audit-reconciliation-1");
    expect(serialized).not.toContain("org-1");
    expect(serialized).not.toContain("setup-admin-1");
  });

  it("surfaces signoff-required execution evidence before reconciliation exists", async () => {
    const client = buildClient([
      executionAudit({
        status: "SIGNOFF_REQUIRED",
        missingSignoffs: ["payroll-admin-signoff"],
      }),
    ]);

    const model = await getPayrollSetupEvidenceReadModel(input, client as any);

    expect(model.status).toBe("EXECUTION_SIGNOFF_REQUIRED");
    expect(model.latestExecutionCertificate?.missingSignoffCount).toBe(1);
    expect(model.latestReconciliationCertificate).toBeNull();
  });

  it("surfaces completed execution evidence while reconciliation is still pending", async () => {
    const client = buildClient([
      executionAudit({
        status: "EXECUTION_COMPLETED",
        executionEnabled: true,
        mutationAttempted: true,
        proofBackfill: {
          totalBlockingGaps: 2,
          gapCounts: {
            payrollRunMissingStatutoryScenarioCoverage: 2,
          },
        },
      }),
    ]);

    const model = await getPayrollSetupEvidenceReadModel(input, client as any);

    expect(model.status).toBe("AWAITING_RECONCILIATION_CERTIFICATE");
    expect(model.latestExecutionCertificate).toEqual(
      expect.objectContaining({
        status: "EXECUTION_COMPLETED",
        executionEnabled: true,
        mutationAttempted: true,
        totalBlockingGaps: 2,
        gapCounts: expect.objectContaining({
          payrollRunMissingStatutoryScenarioCoverage: 2,
        }),
      }),
    );
    expect(model.latestReconciliationCertificate).toBeNull();
  });

  it("keeps data-trust blocker ids when reconciliation evidence still has proof gaps", async () => {
    const client = buildClient(
      [executionAudit()],
      [
        reconciliationAudit({
          status: "PROOF_GAPS_REMAIN",
          currentProofBackfill: {
            totalBlockingGaps: 2,
            postMigrationProofGapsCleared: false,
            gapCounts: {
              paymentBatchMissingSettlementLifecycleProof: 2,
            },
          },
          dataTrustProofGate: {
            status: "BLOCKED",
            blockerIds: ["payroll-payment-settlement-lifecycle-proof-missing"],
          },
        }),
      ],
    );

    const model = await getPayrollSetupEvidenceReadModel(input, client as any);

    expect(model.status).toBe("PROOF_GAPS_REMAIN");
    expect(model.latestReconciliationCertificate).toEqual(
      expect.objectContaining({
        dataTrustProofGateStatus: "BLOCKED",
        dataTrustBlockerIds: [
          "payroll-payment-settlement-lifecycle-proof-missing",
        ],
        postMigrationProofGapsCleared: false,
        totalBlockingGaps: 2,
      }),
    );
  });
});
