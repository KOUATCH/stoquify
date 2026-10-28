import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  AccountingPostingPurpose,
  LedgerPostingBatchStatus,
  PaymentMethod,
  PayrollDeclarationStatus,
  PayrollEmployeeBalanceCaseStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  PayrollRunType,
} from "@prisma/client";

import {
  approveAndPostPayrollRunAction,
  calculatePayrollRunAction,
  preparePayrollDeclarationsAction,
  releasePayrollPaymentBatchAction,
  type PayrollRunWorkbenchResult,
} from "@/actions/payroll/payroll-control.actions";
import PayrollRunWorkbench from "../PayrollRunWorkbench";

const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

jest.mock("@/actions/payroll/payroll-control.actions", () => ({
  approveAndPostPayrollRunAction: jest.fn(),
  calculatePayrollRunAction: jest.fn(),
  preparePayrollDeclarationsAction: jest.fn(),
  releasePayrollPaymentBatchAction: jest.fn(),
}));

jest.mock("next/link", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      href,
      children,
      ...props
    }: {
      href: string;
      children: React.ReactNode;
    }) => React.createElement("a", { href, ...props }, children),
  };
});

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}));

jest.mock("lucide-react", () => {
  const React = require("react");
  const makeIcon = (name: string) => {
    const MockIcon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props });
    MockIcon.displayName = `Mock${name}Icon`;
    return MockIcon;
  };

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return target[prop as keyof typeof target];
        return makeIcon(String(prop));
      },
    },
  );
});

const mockApproveAndPostPayrollRunAction =
  approveAndPostPayrollRunAction as jest.Mock;
const mockCalculatePayrollRunAction = calculatePayrollRunAction as jest.Mock;
const mockPreparePayrollDeclarationsAction =
  preparePayrollDeclarationsAction as jest.Mock;
const mockReleasePayrollPaymentBatchAction =
  releasePayrollPaymentBatchAction as jest.Mock;

function workbenchData(): PayrollRunWorkbenchResult {
  return {
    organizationId: "org-1",
    asOf: "2026-06-30T10:00:00.000Z",
    statusFilter: null,
    redaction: {
      payrollAmounts: {
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-payroll-person-redaction-policy",
        replacement: "[REDACTED:PAYROLL]",
        requiredPermissions: ["EMPLOYEE_SALARY_READ"],
      },
      correctionProofIdentifiers: {
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-proof-hidden-identifier-policy",
        replacement: "[REDACTED:IDENTIFIER]",
        requiredPermissions: [
          "accounting.journal.read",
          "payments.reconciliation.read",
          "accounting.close.read",
          "payroll.payslips.read",
          "EMPLOYEE_SALARY_READ",
        ],
      },
    },
    paymentRequesterCandidates: [
      {
        userId: "requester-1",
        displayName: "Ada Requester",
        email: "requester@aqstoqflow.test",
        roleLabels: ["Payroll reviewer"],
        matchedPermissions: ["payroll.payments.request"],
      },
    ],
    summary: {
      totalRuns: 1,
      activeRuns: 0,
      postedRuns: 1,
      correctionRuns: 1,
      returnedRuns: 1,
      blockedRuns: 1,
      accountingBlockedRuns: 0,
      paymentBlockedRuns: 1,
      declarationBlockedRuns: 1,
      registerProofMissingRuns: 0,
      netPayableInScope: "95800.00",
      coverageComplete: true,
    },
    runs: [
      {
        id: "run-1",
        runNumber: "RUN-2026-06-CORR",
        runType: PayrollRunType.CORRECTION,
        status: PayrollRunStatus.POSTED,
        version: 2,
        period: {
          id: "period-1",
          name: "June 2026",
          status: PayrollPeriodStatus.POSTED,
          periodStart: "2026-06-01T00:00:00.000Z",
          periodEnd: "2026-06-30T23:59:59.999Z",
          payDate: "2026-07-05T00:00:00.000Z",
        },
        amounts: {
          grossAmount: "120000.00",
          employeeDeductionAmount: "24200.00",
          employerChargeAmount: "17150.00",
          netPayableAmount: "95800.00",
          currency: "XAF",
        },
        country: {
          countryCode: "CM",
          countryPackVersion: "CM-2026.1",
          countryPackSchemaVersion: "country-pack.v1",
          countryPackResolutionHash: "sha256:country-pack",
          countryPackCapabilityStatus: "SUPPORTED",
          ruleSetHash: "sha256:rules",
        },
        proof: {
          calculationHash: "sha256:calc",
          attendanceSnapshotHash: "sha256:attendance",
          documentHash: "sha256:run-doc",
          evidenceHash: "sha256:run-evidence",
          componentRegisterProofHash: "sha256:component-register",
          payrollComponentMappingHash: "sha256:component-mapping",
          registerProofPresent: true,
          preparedById: "preparer-1",
          reviewedById: "reviewer-1",
          approvedById: "approver-1",
          emittedById: "emitter-1",
          postedById: "poster-1",
          approvedAt: "2026-06-30T09:00:00.000Z",
          emittedAt: "2026-06-30T09:10:00.000Z",
          postedAt: "2026-06-30T09:20:00.000Z",
        },
        correction: {
          correctionRun: true,
          originalRunId: "original-run-1",
          originalRunNumber: "RUN-2026-05",
          originalRunDocumentHash: "sha256:original-run-doc",
          originalRunEvidenceHash: "sha256:original-run-evidence",
          originalCalculationHash: "sha256:original-calc",
          correctionEvidenceHash: "sha256:correction-evidence",
          correctiveRunCount: 0,
        },
        accounting: {
          ledgerPostingBatchId: "ledger-batch-1",
          postedBusinessEventId: "event-posted-1",
          journalEntryId: "journal-1",
          accountingSourceLinkId: "source-link-1",
          ledgerBatches: [
            {
              id: "ledger-batch-1",
              postingPurpose: AccountingPostingPurpose.PAYROLL_RUN,
              status: LedgerPostingBatchStatus.POSTED,
              errorMessage: null,
              postedAt: "2026-06-30T09:20:00.000Z",
              createdAt: "2026-06-30T09:18:00.000Z",
            },
          ],
        },
        counts: {
          lines: 2,
          payslips: 2,
          declarations: 1,
          paymentBatches: 1,
          employeeBalanceCases: 1,
          correctiveRuns: 0,
        },
        declarations: [
          {
            id: "declaration-1",
            authority: "CM_CNPS",
            declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
            status: PayrollDeclarationStatus.REJECTED,
            amount: "17150.00",
            currency: "XAF",
            dueDate: "2026-07-15T00:00:00.000Z",
            payloadHash: "sha256:payload",
            latestEvidenceHash: "sha256:declaration-evidence",
            sourceRegisterHash: null,
            automationCapabilityStatus: "AUTOMATION_BLOCKED",
            productionSubmissionSupported: false,
          },
        ],
        paymentBatches: [
          {
            id: "payment-batch-1",
            batchNumber: "PAY-2026-06",
            status: PayrollPaymentBatchStatus.RELEASED,
            method: PaymentMethod.BANK_TRANSFER,
            amount: "95800.00",
            currency: "XAF",
            paymentDate: "2026-07-05T00:00:00.000Z",
            ledgerPostingBatchId: "payment-ledger-1",
            postedBusinessEventId: "payment-event-1",
            evidenceHash: "sha256:payment-evidence",
            paymentTransactionId: "payment-transaction-1",
            paymentExceptionId: null,
            reconciliationStatus: "PENDING",
            latestSettlementSourceRegisterHash: null,
          },
        ],
        paymentAllocationCandidates: [
          {
            payslipId: "payslip-1",
            payslipNumber: "PS-2026-0001",
            employeeId: "employee-1",
            employeeNumber: "EMP-001",
            employeeDisplayName: "Ada Payroll",
            amount: "95800.00",
            currency: "XAF",
            status: PayrollPayslipStatus.EMITTED,
            paymentDestinationProofPresent: true,
          },
        ],
        employeeBalanceCases: [
          {
            id: "balance-case-1",
            caseNumber: "EBC-2026-0001",
            caseType: "RECEIVABLE",
            status: PayrollEmployeeBalanceCaseStatus.OPEN,
            outstandingAmount: "5000.00",
            currency: "XAF",
            evidenceHash: "sha256:balance-evidence",
            ledgerPostingBatchId: "balance-ledger-1",
          },
        ],
        nextActions: [
          {
            id: "review-close",
            label: "Review accounting close readiness",
            requiredPermission: "accounting.close.read",
            requiresFreshAuth: false,
            requiresSeparateApprover: false,
            href: "/dashboard/accounting/close",
          },
        ],
        blockers: [
          {
            id: "PAYROLL_RUN_DECLARATION_REJECTED",
            severity: "critical",
            title: "Authority rejected a declaration",
            detail:
              "Rejected statutory declaration evidence blocks close readiness until correction or amendment proof exists.",
            nextAction:
              "Open the declaration evidence workbench and record correction or amendment evidence.",
          },
          {
            id: "PAYROLL_RUN_PAYMENT_REGISTER_PROOF_MISSING",
            severity: "high",
            title: "Payment settlement is missing register proof",
            detail:
              "Payment settlement evidence must propagate the source payroll register hash.",
            nextAction:
              "Record settlement evidence with the source payroll register hash before close certification.",
          },
        ],
      },
    ],
    sourceScope: {
      limit: 80,
      returned: 1,
      coverageComplete: true,
      sourceService: "services/payroll/payroll-control.service.ts",
    },
  };
}

describe("PayrollRunWorkbench", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApproveAndPostPayrollRunAction.mockResolvedValue({
      success: true,
      data: { id: "run-1" },
    });
    mockCalculatePayrollRunAction.mockResolvedValue({
      success: true,
      data: { id: "run-1" },
    });
    mockPreparePayrollDeclarationsAction.mockResolvedValue({
      success: true,
      data: { id: "declaration-1" },
    });
    mockReleasePayrollPaymentBatchAction.mockResolvedValue({
      success: true,
      data: { id: "payment-batch-1" },
    });
  });

  it("renders run proof, linked evidence, blockers, and localized links", () => {
    render(<PayrollRunWorkbench data={workbenchData()} locale="en" />);

    expect(
      screen.getByRole("heading", { name: "Run lifecycle workbench" }),
    ).toBeInTheDocument();
    expect(screen.getByText("RUN-2026-06-CORR")).toBeInTheDocument();
    expect(screen.getByText("Correction of RUN-2026-05")).toBeInTheDocument();
    expect(screen.getByText("sha256:correction-evidence")).toBeInTheDocument();
    expect(screen.getByText("sha256:component-register")).toBeInTheDocument();
    expect(screen.getByText("ledger-batch-1")).toBeInTheDocument();
    expect(
      screen.getByText("Authority rejected a declaration"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Payment settlement is missing register proof"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Review accounting close readiness"),
    ).toBeInTheDocument();
    const proofDrawer = screen.getByRole("button", { name: "Proof drawer" });
    fireEvent.click(proofDrawer);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Correction evidence hash")).toBeInTheDocument();
    expect(
      screen.getAllByText("sha256:correction-evidence").length,
    ).toBeGreaterThan(1);
    expect(screen.getByText("Component register hash")).toBeInTheDocument();
    expect(
      screen.getAllByText("sha256:component-register").length,
    ).toBeGreaterThan(1);
    expect(screen.getAllByText("Blockers").length).toBeGreaterThan(1);

    const hrefs = Array.from(document.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/en/dashboard/payroll/register",
        "/en/dashboard/payroll/declarations",
        "/en/dashboard/payroll/payments",
        "/en/dashboard/accounting/close",
      ]),
    );
  });

  it("renders correction proof identifier redaction when service denies proof access", () => {
    const data = workbenchData();
    data.redaction.correctionProofIdentifiers = {
      allowed: false,
      mode: "redact",
      reasonCode: "MISSING_PERMISSION",
      policy: "kontava-proof-hidden-identifier-policy",
      replacement: "[REDACTED:IDENTIFIER]",
      requiredPermissions: [
        "accounting.journal.read",
        "payments.reconciliation.read",
        "accounting.close.read",
      ],
    };
    data.runs[0].correction.originalRunDocumentHash =
      "[REDACTED:IDENTIFIER]";
    data.runs[0].correction.originalRunEvidenceHash =
      "[REDACTED:IDENTIFIER]";
    data.runs[0].correction.originalCalculationHash =
      "[REDACTED:IDENTIFIER]";
    data.runs[0].correction.correctionEvidenceHash =
      "[REDACTED:IDENTIFIER]";

    render(<PayrollRunWorkbench data={data} locale="en" />);

    expect(screen.queryByText("sha256:correction-evidence")).not.toBeInTheDocument();
    expect(
      screen.getAllByText("[REDACTED:IDENTIFIER]").length,
    ).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "Proof drawer" }));

    expect(screen.getByText("payroll.correctionProofIdentifiers")).toBeInTheDocument();
    expect(
      screen.getByText("kontava-proof-hidden-identifier-policy"),
    ).toBeInTheDocument();
  });
  it("keeps controlled drawers closed until opened and submits calculate and declaration actions", async () => {
    const data = workbenchData();
    data.runs[0].status = PayrollRunStatus.DRAFT;
    data.runs[0].nextActions = [
      {
        id: "calculate",
        label: "Calculate payroll run",
        requiredPermission: "payroll.runs.calculate",
        requiresFreshAuth: false,
        requiresSeparateApprover: false,
        href: null,
      },
      {
        id: "prepare-declarations",
        label: "Prepare statutory declarations",
        requiredPermission: "payroll.declarations.prepare",
        requiresFreshAuth: false,
        requiresSeparateApprover: false,
        href: "/dashboard/payroll/declarations",
      },
    ];

    render(<PayrollRunWorkbench data={data} locale="en" />);

    expect(screen.queryByLabelText("Run date")).not.toBeInTheDocument();
    const calculationTrigger = screen.getByRole("button", {
      name: "Open calculation drawer",
    });
    expect(calculationTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(calculationTrigger);

    expect(calculationTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Source register proof")).toBeInTheDocument();
    expect(screen.getByText("Idempotency key")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Calculate run" }));

    await waitFor(() =>
      expect(mockCalculatePayrollRunAction).toHaveBeenCalledTimes(1),
    );
    const calculationPayload = mockCalculatePayrollRunAction.mock.calls[0][0];
    expect(calculationPayload).toEqual(
      expect.objectContaining({
        payrollPeriodId: "period-1",
        runType: "CORRECTION",
        originalRunId: "original-run-1",
        metadata: expect.objectContaining({
          sourceSurface: "/dashboard/payroll/runs",
        }),
      }),
    );
    expect(calculationPayload).not.toHaveProperty("organizationId");
    expect(calculationPayload).not.toHaveProperty("preparedById");
    await waitFor(() =>
      expect(
        screen.getByText("Payroll calculation requested."),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Open declaration drawer" }),
    );
    fireEvent.change(screen.getByLabelText("Declaration types"), {
      target: { value: "CNPS, IRPP" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Prepare declarations" }),
    );

    await waitFor(() =>
      expect(mockPreparePayrollDeclarationsAction).toHaveBeenCalledTimes(1),
    );
    const declarationPayload =
      mockPreparePayrollDeclarationsAction.mock.calls[0][0];
    expect(declarationPayload).toEqual(
      expect.objectContaining({
        payrollRunId: "run-1",
        declarationTypes: ["CNPS", "IRPP"],
        metadata: expect.objectContaining({
          sourceSurface: "/dashboard/payroll/runs",
        }),
      }),
    );
    expect(declarationPayload).not.toHaveProperty("organizationId");
    expect(declarationPayload).not.toHaveProperty("preparedById");
    await waitFor(() =>
      expect(
        screen.getByText("Declaration preparation requested."),
      ).toBeInTheDocument(),
    );
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });
  it("submits release payments from service-owned payslip allocations only", async () => {
    const data = workbenchData();
    data.runs[0].paymentBatches = [];
    data.runs[0].counts.paymentBatches = 0;
    data.runs[0].nextActions = [
      {
        id: "release-payments",
        label: "Release payment batch",
        requiredPermission: "payroll.payments.release",
        requiresFreshAuth: true,
        requiresSeparateApprover: true,
        href: null,
      },
    ];

    render(<PayrollRunWorkbench data={data} locale="en" />);

    expect(screen.queryByLabelText("Requested by")).not.toBeInTheDocument();
    const paymentTrigger = screen.getByRole("button", {
      name: "Open payment drawer",
    });
    expect(paymentTrigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(paymentTrigger);
    expect(paymentTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Requested by")).toHaveValue("requester-1");
    expect(screen.getByText("Requester evidence")).toBeInTheDocument();
    expect(screen.getByText("payroll.payments.request")).toBeInTheDocument();
    expect(screen.getByText("Source register proof")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Release payments" }));

    await waitFor(() =>
      expect(mockReleasePayrollPaymentBatchAction).toHaveBeenCalledTimes(1),
    );
    const payload = mockReleasePayrollPaymentBatchAction.mock.calls[0][0];

    expect(payload).toEqual(
      expect.objectContaining({
        payrollRunId: "run-1",
        requestedById: "requester-1",
        method: PaymentMethod.BANK_TRANSFER,
        paymentDate: expect.any(String),
        allocations: [
          {
            payslipId: "payslip-1",
            employeeId: "employee-1",
            amount: "95800.00",
          },
        ],
        metadata: expect.objectContaining({
          sourceSurface: "/dashboard/payroll/runs",
        }),
      }),
    );
    expect(payload).not.toHaveProperty("organizationId");
    expect(payload).not.toHaveProperty("approvedById");
    expect(payload).not.toHaveProperty("releasedById");
    expect(payload).not.toHaveProperty("actorPermissions");
    expect(payload).not.toHaveProperty("lastAuthAt");
    await waitFor(() =>
      expect(
        screen.getByText("Payroll payment release requested."),
      ).toBeInTheDocument(),
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("blocks payment release when no separate requester candidate is service-backed", () => {
    const data = workbenchData();
    data.paymentRequesterCandidates = [];
    data.runs[0].paymentBatches = [];
    data.runs[0].counts.paymentBatches = 0;
    data.runs[0].nextActions = [
      {
        id: "release-payments",
        label: "Release payment batch",
        requiredPermission: "payroll.payments.release",
        requiresFreshAuth: true,
        requiresSeparateApprover: true,
        href: null,
      },
    ];

    render(<PayrollRunWorkbench data={data} locale="en" />);

    expect(screen.queryByLabelText("Requested by")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Open payment drawer" }),
    );

    expect(screen.getByLabelText("Requested by")).toBeDisabled();
    expect(
      screen.getByText("No separate requester available"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Payment release requires a separate service-backed requester, visible payroll amounts, emitted payslips, and payment destination proof.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Release payments" }),
    ).toBeDisabled();
    expect(mockReleasePayrollPaymentBatchAction).not.toHaveBeenCalled();
  });

  it("shows fresh-auth denials without leaking auth fields into approve payloads", async () => {
    mockApproveAndPostPayrollRunAction.mockResolvedValueOnce({
      success: false,
      error: "Fresh authentication is required.",
      code: "FRESH_AUTH_REQUIRED",
      correlationId: "corr-fresh-auth-1",
    });
    const data = workbenchData();
    data.runs[0].nextActions = [
      {
        id: "approve-post",
        label: "Approve and post run",
        requiredPermission: "payroll.runs.approve",
        requiresFreshAuth: true,
        requiresSeparateApprover: true,
        href: null,
      },
    ];

    render(<PayrollRunWorkbench data={data} locale="en" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open approval drawer" }),
    );
    expect(screen.getAllByText("Maker-checker").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Approve and post" }));

    await waitFor(() =>
      expect(mockApproveAndPostPayrollRunAction).toHaveBeenCalledTimes(1),
    );
    const payload = mockApproveAndPostPayrollRunAction.mock.calls[0][0];

    expect(payload).toEqual(expect.objectContaining({ payrollRunId: "run-1" }));
    expect(payload).not.toHaveProperty("organizationId");
    expect(payload).not.toHaveProperty("approvedById");
    expect(payload).not.toHaveProperty("actorPermissions");
    expect(payload).not.toHaveProperty("lastAuthAt");
    expect(
      await screen.findByText("Fresh authentication is required."),
    ).toBeInTheDocument();
    expect(screen.getByText("corr-fresh-auth-1")).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("renders a client-safe error state", () => {
    render(<PayrollRunWorkbench data={null} error="Forbidden" locale="en" />);

    expect(
      screen.getByRole("heading", { name: "Payroll runs unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Forbidden")).toBeInTheDocument();
  });
});
