import { render, screen } from "@testing-library/react";

import PayrollSetupControlPlane from "../PayrollSetupControlPlane";

jest.mock("../PayrollProofBackfillExecutionPanel", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: () =>
      React.createElement(
        "section",
        null,
        React.createElement("h2", null, "Proof execution"),
      ),
  };
});
jest.mock("lucide-react", () => {
  const React = require("react");

  return new Proxy(
    {},
    {
      get: (_target, iconName) => {
        const Icon = (props: Record<string, unknown>) =>
          React.createElement("svg", {
            "aria-hidden": "true",
            "data-icon": String(iconName),
            ...props,
          });
        Icon.displayName = String(iconName);
        return Icon;
      },
    },
  );
});

function readiness() {
  return {
    status: "READY",
    dryRunOnly: true,
    organizationRef: "redacted:org",
    input: {
      countryCode: "CM",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      payDate: "2026-06-30",
      employeeSourceMode: "users",
      maxRows: 5,
    },
    checks: {
      tenant: {
        payrollModuleEntitled: true,
        accountingDependencyPresent: true,
        actorCanRunSetupReadiness: true,
        missingModuleDependencies: [],
      },
      accounting: {
        settingsStatus: "READY",
        payrollMappingCount: 9,
        requiredPayrollMappingKeys: ["PAYROLL_GROSS_EXPENSE"],
        payrollJournalReady: true,
        payrollPostingRuleCodes: ["PAYROLL_GROSS_ACCRUAL"],
        openAccountingPeriodId: "period-1",
      },
      countryPack: {
        capabilityStatuses: ["SUPPORTED"],
        countryCode: "CM",
        packVersions: ["CM-2026.1"],
        calculationFixtures: {
          status: "READY",
          packVersion: "CM-2026.1",
          executableScenarioCount: 1,
          passedScenarioCount: 1,
          failedScenarioCount: 0,
          issueCount: 0,
          issueCodes: [],
          fixtureIds: ["cm-irpp-period-reviewed"],
          scenarioCoverage: {
            status: "READY",
            countryCode: "CM",
            packVersion: "CM-2026.1",
            executableScenarioCount: 9,
            passedScenarioCount: 9,
            failedScenarioCount: 0,
            readyFamilyCount: 9,
            requiredFamilyCount: 9,
            issueCount: 0,
            issueCodes: [],
            fixtureIds: ["cm-irpp-period-reviewed"],
            families: [],
            blockers: [],
          },
        },
      },
      employeeUserMapping: {
        mappedPayrollEmployeeCount: 1,
        missingUserReferenceCount: 0,
        activeUserCount: 1,
        plannedEmployeeCreateCount: 0,
      },
    },
    blockers: [],
    warnings: [],
  } as any;
}

function plan() {
  return {
    status: "READY",
    generatedAt: "2026-06-30T12:00:00.000Z",
    dryRunOnly: true,
    mutationModeAvailable: false,
    plannedWrites: [
      {
        target: "PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill",
        operation: "reuse",
        count: 0,
        idempotencyKey: "payroll-declaration-lifecycle-proof-backfill:abc",
        reason: "Declaration authority lifecycle proof is already present.",
      },
    ],
    proofBackfill: {
      evidenceRef: "payroll-proof-backfill-dry-run:redacted",
      status: "READY",
      totalBlockingGaps: 0,
      gapCounts: {
        payrollRunMissingStatutoryScenarioCoverage: 0,
        declarationEvidenceMissingSourceRegisterHash: 0,
        declarationEvidenceMissingAuthorityAdapterProof: 0,
        declarationEvidenceMissingAuthorityLifecycleProof: 0,
        paymentBatchMissingProviderAdapterProof: 0,
        paymentBatchMissingSettlementRegisterProof: 0,
        paymentBatchMissingSettlementLifecycleProof: 0,
      },
      requiredSignoffs: [
        "payroll-admin",
        "accounting-controller",
        "security-privacy",
        "operations-owner",
      ],
      rollbackStrategy: ["Append correction evidence only."],
      postMigrationReconciliation: ["Rerun data-trust proof gates."],
    },
    redaction: {
      rawPersonDataIncluded: false,
      rawSalaryIncluded: false,
      rawPaymentDestinationIncluded: false,
    },
  } as any;
}

function evidence(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: "2026-06-30T12:05:00.000Z",
    organizationRef: "redacted:org",
    actorRef: "redacted:actor",
    evidenceSource: "audit_logs",
    status: "READY_FOR_CLOSE_RECHECK",
    latestExecutionCertificate: {
      kind: "execution",
      auditLogRef: "redacted:execution-audit",
      ledgerKey: "sha256:execution-ledger",
      recordedAt: "2026-06-30T10:00:00.000Z",
      status: "EXECUTION_DISABLED",
      certificateHash: "sha256:execution-certificate",
      dryRunEvidenceHash: "sha256:execution-dry-run",
      approvalBundleHashPresent: true,
      missingSignoffCount: 0,
      executionEnabled: false,
      mutationAttempted: false,
      totalBlockingGaps: 3,
      gapCounts: {},
      dataTrustProofGateStatus: null,
      dataTrustBlockerIds: [],
      sourceCertificateValid: null,
      postMigrationProofGapsCleared: null,
    },
    latestReconciliationCertificate: {
      kind: "reconciliation",
      auditLogRef: "redacted:reconciliation-audit",
      ledgerKey: "sha256:execution-ledger",
      recordedAt: "2026-06-30T12:00:00.000Z",
      status: "READY_FOR_CLOSE_RECHECK",
      certificateHash: "sha256:reconciliation-certificate",
      dryRunEvidenceHash: "sha256:execution-dry-run",
      approvalBundleHashPresent: true,
      missingSignoffCount: 0,
      executionEnabled: false,
      mutationAttempted: false,
      totalBlockingGaps: 0,
      gapCounts: {},
      dataTrustProofGateStatus: "READY",
      dataTrustBlockerIds: [],
      sourceCertificateValid: true,
      postMigrationProofGapsCleared: true,
    },
    executionCertificates: [],
    reconciliationCertificates: [],
    totals: {
      executionCertificateCount: 1,
      reconciliationCertificateCount: 1,
    },
    redaction: {
      rawAuditLogIdsIncluded: false,
      rawPersonDataIncluded: false,
      rawPaymentDestinationIncluded: false,
      rawSalaryIncluded: false,
      rawProviderPayloadIncluded: false,
    },
    ...overrides,
  } as any;
}

describe("PayrollSetupControlPlane", () => {
  it("renders proof gap dry-run state and redacted certificate evidence", () => {
    const evidenceModel = evidence({
      executionCertificates: [evidence().latestExecutionCertificate],
      reconciliationCertificates: [evidence().latestReconciliationCertificate],
    });

    const { container } = render(
      <PayrollSetupControlPlane
        readiness={readiness()}
        plan={plan()}
        evidence={evidenceModel}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Setup readiness and dry-run control plane",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Historical proof backfill" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Proof certificate trail" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Proof execution" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Calculation fixtures")).toBeInTheDocument();
    expect(screen.getByText("1/1 passed")).toBeInTheDocument();
    expect(screen.getByText(/pack: CM-2026\.1/)).toBeInTheDocument();
    expect(screen.getByText("Full-production coverage")).toBeInTheDocument();
    expect(screen.getByText("9/9 families")).toBeInTheDocument();
    expect(
      screen.getByText("Register statutory review evidence"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("payrollRunMissingStatutoryScenarioCoverage"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("declarationEvidenceMissingAuthorityLifecycleProof"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("READY_FOR_CLOSE_RECHECK").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("sha256:reconciliation-certificate").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Raw salary included: false")).toBeInTheDocument();

    expect(container.textContent).not.toContain("audit-execution-1");
    expect(container.textContent).not.toContain("audit-reconciliation-1");
    expect(container.textContent).not.toContain("org-1");
    expect(container.textContent).not.toContain("setup-admin-1");
  });

  it("renders empty and error evidence states without hiding setup readiness", () => {
    const emptyEvidence = evidence({
      status: "NO_EVIDENCE",
      latestExecutionCertificate: null,
      latestReconciliationCertificate: null,
      executionCertificates: [],
      reconciliationCertificates: [],
      totals: {
        executionCertificateCount: 0,
        reconciliationCertificateCount: 0,
      },
    });

    const { rerender } = render(
      <PayrollSetupControlPlane
        readiness={readiness()}
        plan={plan()}
        evidence={emptyEvidence}
      />,
    );

    expect(
      screen.getByText(
        "No persisted proof-backfill certificates were returned.",
      ),
    ).toBeInTheDocument();

    rerender(
      <PayrollSetupControlPlane
        readiness={readiness()}
        plan={plan()}
        evidence={null}
        evidenceError="RBAC denied certificate evidence."
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Proof certificate trail unavailable",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("RBAC denied certificate evidence."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Historical proof backfill" }),
    ).toBeInTheDocument();
  });
});
