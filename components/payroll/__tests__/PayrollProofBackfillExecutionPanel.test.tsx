import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { preparePayrollProofBackfillExecutionAction } from "@/actions/payroll/payroll-setup.actions";

import PayrollProofBackfillExecutionPanel from "../PayrollProofBackfillExecutionPanel";

jest.mock("@/actions/payroll/payroll-setup.actions", () => ({
  preparePayrollProofBackfillExecutionAction: jest.fn(),
}));

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

const mockPreparePayrollProofBackfillExecution =
  preparePayrollProofBackfillExecutionAction as jest.Mock;

const setupInput = {
  countryCode: "CM",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
  payDate: "2026-06-30",
  employeeSourceMode: "users",
  maxRows: 25,
};

function certificate(overrides: Record<string, unknown> = {}) {
  return {
    kind: "AQSTOQFLOW_PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE",
    version: 1,
    status: "SIGNOFF_REQUIRED",
    executionMode: "validate",
    executionEnabled: false,
    mutationAttempted: false,
    generatedAt: "2026-06-30T10:00:00.000Z",
    organizationRef: "redacted:org",
    dryRunEvidenceHash: "sha256:dry-run",
    certificateHash: "sha256:certificate",
    proofBackfill: {
      evidenceRef: "payroll-proof-backfill-dry-run:redacted",
      status: "BLOCKED",
      totalBlockingGaps: 2,
      gapCounts: {},
      plannedJobs: [],
      requiredSignoffs: [],
      rollbackStrategy: [],
      postMigrationReconciliation: [],
    },
    approvalBundleHashPresent: false,
    missingSignoffCount: 4,
    ...overrides,
  } as any;
}

describe("PayrollProofBackfillExecutionPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreparePayrollProofBackfillExecution.mockResolvedValue({
      success: true,
      data: certificate(),
      error: null,
      status: 200,
    });
  });

  it("submits validate mode without client mutation approval", async () => {
    render(
      <PayrollProofBackfillExecutionPanel
        setupInput={setupInput}
        defaultDryRunEvidenceHash="sha256:default-dry-run"
      />,
    );

    fireEvent.change(screen.getByLabelText("Dry-run hash"), {
      target: { value: "sha256:dry-run" },
    });
    fireEvent.change(screen.getByLabelText("Adapter chaos hash"), {
      target: { value: "sha256:adapter-chaos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validate proof" }));

    await waitFor(() => {
      expect(mockPreparePayrollProofBackfillExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          countryCode: "CM",
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
          payDate: "2026-06-30",
          executionMode: "validate",
          executionMutationApproved: false,
          expectedDryRunEvidenceHash: "sha256:dry-run",
          adapterChaosReleaseGateHash: "sha256:adapter-chaos",
          persistCertificate: true,
        }),
      );
    });
    expect(await screen.findByText("SIGNOFF_REQUIRED")).toBeInTheDocument();
    expect(screen.getByText(/no mutation/)).toBeInTheDocument();
  });

  it("submits approved execute mode with signoff evidence", async () => {
    mockPreparePayrollProofBackfillExecution.mockResolvedValueOnce({
      success: true,
      data: certificate({
        status: "EXECUTED",
        executionMode: "execute",
        executionEnabled: true,
        mutationAttempted: true,
        proofBackfill: {
          evidenceRef: "payroll-proof-backfill-dry-run:redacted",
          status: "READY",
          totalBlockingGaps: 0,
          gapCounts: {},
          plannedJobs: [],
          requiredSignoffs: [],
          rollbackStrategy: [],
          postMigrationReconciliation: [],
        },
      }),
      error: null,
      status: 200,
    });

    render(
      <PayrollProofBackfillExecutionPanel
        setupInput={setupInput}
        defaultDryRunEvidenceHash="sha256:dry-run"
      />,
    );

    fireEvent.change(screen.getByLabelText("Approval token hash"), {
      target: { value: "sha256:approval-token" },
    });
    fireEvent.change(screen.getByLabelText("Payroll admin"), {
      target: { value: "payroll-admin-1" },
    });
    fireEvent.change(screen.getByLabelText("Accounting controller"), {
      target: { value: "accounting-controller-1" },
    });
    fireEvent.change(screen.getByLabelText("Security/privacy"), {
      target: { value: "security-reviewer-1" },
    });
    fireEvent.change(screen.getByLabelText("Operations owner"), {
      target: { value: "ops-owner-1" },
    });
    fireEvent.change(screen.getByLabelText("Approved at"), {
      target: { value: "2026-06-30T09:59:00.000Z" },
    });
    fireEvent.click(screen.getByLabelText("Approve execution"));
    fireEvent.click(screen.getByRole("button", { name: "Execute backfill" }));

    await waitFor(() => {
      expect(mockPreparePayrollProofBackfillExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          executionMode: "execute",
          executionMutationApproved: true,
          signoffBundle: expect.objectContaining({
            dryRunEvidenceHash: "sha256:dry-run",
            approvalTokenHash: "sha256:approval-token",
            payrollAdminApprovedById: "payroll-admin-1",
            accountingControllerApprovedById: "accounting-controller-1",
            securityPrivacyApprovedById: "security-reviewer-1",
            operationsOwnerApprovedById: "ops-owner-1",
            approvedAt: "2026-06-30T09:59:00.000Z",
          }),
        }),
      );
    });
    expect(await screen.findByText("EXECUTED")).toBeInTheDocument();
    expect(screen.getByText(/mutation attempted/)).toBeInTheDocument();
  });

  it("renders denied fresh-auth state returned by the server action", async () => {
    mockPreparePayrollProofBackfillExecution.mockResolvedValueOnce({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    });

    render(
      <PayrollProofBackfillExecutionPanel
        setupInput={setupInput}
        defaultDryRunEvidenceHash="sha256:dry-run"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Execute backfill" }));

    expect(await screen.findByText("FRESH_AUTH_REQUIRED")).toBeInTheDocument();
    expect(screen.getByText("Fresh authentication required")).toBeInTheDocument();
    expect(mockPreparePayrollProofBackfillExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: "execute",
        executionMutationApproved: false,
      }),
    );
  });
});