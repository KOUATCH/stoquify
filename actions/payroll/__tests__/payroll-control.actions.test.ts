import { revalidatePath } from "next/cache";
import { PaymentMethod } from "@prisma/client";

import {
  requireFreshAuth,
  FreshAuthRequiredError,
} from "@/lib/security/auth-session";
import { requirePermission, RbacError } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { logger } from "@/lib/logger";
import {
  approveAndPostPayrollRun,
  getPayrollRunWorkbenchData,
  getPayrollWorkbenchData,
  preparePayrollDeclarations,
  releasePayrollPaymentBatch,
} from "@/services/payroll/payroll-control.service";
import {
  getPayrollDeclarationWorkbenchData,
  recordPayrollDeclarationEvidence,
} from "@/services/payroll/declaration-lifecycle.service";
import {
  getPayrollEmployeeBalanceWorkbenchData,
  openPayrollEmployeeBalanceCaseFromCorrection,
  openPayrollEmployeeBalanceCasesForCorrectionRun,
  planPayrollEmployeeBalanceCasesForCorrectionRun,
  settlePayrollEmployeeBalanceCase,
} from "@/services/payroll/payroll-employee-balance.service";

import {
  approveAndPostPayrollRunAction,
  getPayrollDeclarationWorkbenchAction,
  getPayrollEmployeeBalanceWorkbenchAction,
  getPayrollRunWorkbenchAction,
  getPayrollWorkbenchAction,
  preparePayrollDeclarationsAction,
  openPayrollEmployeeBalanceCaseAction,
  openPayrollEmployeeBalanceCasesForCorrectionRunAction,
  planPayrollEmployeeBalanceCasesAction,
  recordPayrollDeclarationEvidenceAction,
  releasePayrollPaymentBatchAction,
  settlePayrollEmployeeBalanceCaseAction,
} from "../payroll-control.actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message);
      this.name = "RbacError";
    }
  }

  return {
    RbacError: MockRbacError,
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
  };
});

jest.mock("@/lib/security/auth-session", () => {
  class MockFreshAuthRequiredError extends Error {
    constructor(message = "Fresh authentication required") {
      super(message);
      this.name = "FreshAuthRequiredError";
    }
  }

  return {
    FreshAuthRequiredError: MockFreshAuthRequiredError,
    requireFreshAuth: jest.fn(),
  };
});

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}));

jest.mock("@/services/payroll/payroll-control.service", () => ({
  getPayrollRunWorkbenchData: jest.fn(),
  getPayrollWorkbenchData: jest.fn(),
  payrollRunWorkbenchInputSchema: {
    parse: jest.fn((input) => input),
  },
  releasePayrollPaymentBatch: jest.fn(),
  preparePayrollDeclarations: jest.fn(),
  calculatePayrollRun: jest.fn(),
  approveAndPostPayrollRun: jest.fn(),
}));

jest.mock("@/services/payroll/declaration-lifecycle.service", () => ({
  getPayrollDeclarationWorkbenchData: jest.fn(),
  payrollDeclarationWorkbenchInputSchema: {
    parse: jest.fn((input) => input),
  },
  recordPayrollDeclarationEvidence: jest.fn(),
  recordPayrollDeclarationEvidenceInputSchema: {
    parse: jest.fn((input) => input),
  },
}));

jest.mock("@/services/payroll/payroll-employee-balance.service", () => ({
  getPayrollEmployeeBalanceWorkbenchData: jest.fn(),
  payrollEmployeeBalanceWorkbenchInputSchema: {
    parse: jest.fn((input) => input),
  },
  openPayrollEmployeeBalanceCaseFromCorrection: jest.fn(),
  openPayrollEmployeeBalanceCaseInputSchema: {
    parse: jest.fn((input) => input),
  },
  openPayrollEmployeeBalanceCasesForCorrectionRun: jest.fn(),
  openPayrollEmployeeBalanceCasesForCorrectionRunInputSchema: {
    parse: jest.fn((input) => input),
  },
  planPayrollEmployeeBalanceCasesForCorrectionRun: jest.fn(),
  planPayrollEmployeeBalanceCasesInputSchema: {
    parse: jest.fn((input) => input),
  },
  settlePayrollEmployeeBalanceCase: jest.fn(),
  settlePayrollEmployeeBalanceCaseInputSchema: {
    parse: jest.fn((input) => input),
  },
}));

const mockRequirePermission = requirePermission as jest.Mock;
const mockRequireFreshAuth = requireFreshAuth as jest.Mock;
const mockObserveModuleAccess = observeModuleAccess as jest.Mock;
const mockLoggerError = logger.error as jest.Mock;
const mockApproveAndPostPayrollRun = approveAndPostPayrollRun as jest.Mock;
const mockGetPayrollRunWorkbenchData = getPayrollRunWorkbenchData as jest.Mock;
const mockGetPayrollWorkbenchData = getPayrollWorkbenchData as jest.Mock;
const mockReleasePayrollPaymentBatch = releasePayrollPaymentBatch as jest.Mock;
const mockPreparePayrollDeclarations = preparePayrollDeclarations as jest.Mock;
const mockGetPayrollDeclarationWorkbenchData =
  getPayrollDeclarationWorkbenchData as jest.Mock;
const mockRecordPayrollDeclarationEvidence =
  recordPayrollDeclarationEvidence as jest.Mock;
const mockGetPayrollEmployeeBalanceWorkbenchData =
  getPayrollEmployeeBalanceWorkbenchData as jest.Mock;
const mockOpenPayrollEmployeeBalanceCaseFromCorrection =
  openPayrollEmployeeBalanceCaseFromCorrection as jest.Mock;
const mockOpenPayrollEmployeeBalanceCasesForCorrectionRun =
  openPayrollEmployeeBalanceCasesForCorrectionRun as jest.Mock;
const mockPlanPayrollEmployeeBalanceCasesForCorrectionRun =
  planPayrollEmployeeBalanceCasesForCorrectionRun as jest.Mock;
const mockSettlePayrollEmployeeBalanceCase =
  settlePayrollEmployeeBalanceCase as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "actor-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.read",
    accessIntent: "read",
    mode: "enforce",
    result: "allow",
    allowed: true,
    wouldBlock: false,
    reason: "Tenant module entitlement is available.",
    entitlement: {
      moduleSlug: "payroll",
      status: "active",
      source: "requested_modules",
      startsAt: null,
      endsAt: null,
      readOnly: false,
      trial: false,
    },
    missingDependencies: [],
    rbacWildcardPresent: false,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: true,
    evaluatedAt: "2026-06-25T00:00:00.000Z",
    ...overrides,
  };
}

function rbacContext(userId = "actor-1", permissions: string[] = []) {
  return {
    userId,
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    user: {
      id: userId,
      roles: [],
      permissions,
      organizationId: "org-1",
    },
  };
}

describe("payroll control actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: new Date("2026-06-30T11:59:00.000Z").getTime() },
    });
    mockObserveModuleAccess.mockResolvedValue(moduleDecision());
  });

  it("returns a client-safe RBAC denial for the payroll workbench", async () => {
    mockRequirePermission.mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    const result = await getPayrollWorkbenchAction({});

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        error: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
        retryable: false,
      }),
    );
    expect(result).toHaveProperty("correlationId");
    expect(mockGetPayrollWorkbenchData).not.toHaveBeenCalled();
  });

  it("passes actor context into salary-bearing payroll workbench reads", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("payroll-reader-1", ["PAYROLL_READ"]),
    );
    mockGetPayrollWorkbenchData.mockResolvedValue({
      organizationId: "org-1",
      asOf: "2026-06-25T00:00:00.000Z",
      counts: {},
      queues: {},
    });

    const result = await getPayrollWorkbenchAction({ limit: 10 });

    expect(result.success).toBe(true);
    expect(mockGetPayrollWorkbenchData).toHaveBeenCalledWith({
      organizationId: "org-1",
      limit: 10,
      actorId: "payroll-reader-1",
      actorPermissions: ["PAYROLL_READ"],
    });
  });

  it("blocks payroll workbench reads when the payroll module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("payroll-reader-1", ["PAYROLL_READ"]),
    );
    mockObserveModuleAccess.mockResolvedValue(
      moduleDecision({
        result: "deny",
        allowed: false,
        wouldBlock: true,
        reason: "Tenant is not entitled to this module.",
        entitlement: null,
      }),
    );

    const result = await getPayrollWorkbenchAction({ limit: 10 });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        status: 403,
        code: "FORBIDDEN",
        retryable: false,
      }),
    );
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "payroll-reader-1",
        moduleSlug: "payroll",
        surfaceType: "page",
        surface: "/dashboard/payroll",
        accessIntent: "read",
        mode: "enforce",
      }),
    );
    expect(mockGetPayrollWorkbenchData).not.toHaveBeenCalled();
  });

  it("requires fresh auth before releasing payroll payments", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError());

    const result = await releasePayrollPaymentBatchAction({
      payrollRunId: "run-1",
      requestedById: "requester-1",
      method: PaymentMethod.BANK_TRANSFER,
      paymentDate: "2026-06-30",
      idempotencyKey: "payroll-payment-key-1",
      allocations: [
        {
          payslipId: "payslip-1",
          employeeId: "employee-1",
          amount: "95800.00",
        },
      ],
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        error: "Fresh authentication required",
        status: 403,
        code: "FRESH_AUTH_REQUIRED",
        retryable: false,
      }),
    );
    expect(result).toHaveProperty("correlationId");
    expect(mockRequirePermission).not.toHaveBeenCalled();
    expect(mockReleasePayrollPaymentBatch).not.toHaveBeenCalled();
  });

  it("passes verified fresh-auth evidence when approving and posting payroll runs", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("approver-1", ["payroll.runs.approve"]),
    );
    mockApproveAndPostPayrollRun.mockResolvedValue({
      payrollRun: { id: "run-1" },
      ledgerStatus: "POSTED",
    });

    const result = await approveAndPostPayrollRunAction({
      organizationId: "client-org",
      payrollRunId: "run-1",
      approvedById: "client-approver",
      idempotencyKey: "approve-key-1",
    });

    expect(result.success).toBe(true);
    expect(mockApproveAndPostPayrollRun).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        payrollRunId: "run-1",
        approvedById: "approver-1",
        actorPermissions: ["payroll.runs.approve"],
        lastAuthAt: new Date("2026-06-30T11:59:00.000Z"),
      }),
    );
    expect(mockApproveAndPostPayrollRun.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
      approvedById: "client-approver",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll",
      "page",
    );
  });

  it("derives payroll payment tenant and release actor fields from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("treasury-1", ["payroll.payments.release"]),
    );
    mockReleasePayrollPaymentBatch.mockResolvedValue({
      payrollPaymentBatch: { id: "batch-1" },
      ledgerStatus: "POSTED",
    });

    const result = await releasePayrollPaymentBatchAction({
      organizationId: "client-org",
      payrollRunId: "run-1",
      requestedById: "requester-1",
      approvedById: "client-approver",
      releasedById: "client-releaser",
      method: PaymentMethod.BANK_TRANSFER,
      paymentDate: "2026-06-30",
      idempotencyKey: "payroll-payment-key-1",
      allocations: [
        {
          payslipId: "payslip-1",
          employeeId: "employee-1",
          amount: "95800.00",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(mockReleasePayrollPaymentBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        approvedById: "treasury-1",
        releasedById: "treasury-1",
        actorPermissions: ["payroll.payments.release"],
        lastAuthAt: new Date("2026-06-30T11:59:00.000Z"),
      }),
    );
    expect(mockReleasePayrollPaymentBatch.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
      approvedById: "client-approver",
      releasedById: "client-releaser",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll",
      "page",
    );
  });

  it("derives payroll run workbench tenant and actor context from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("run-controller-1", ["payroll.command.read"]),
    );
    mockGetPayrollRunWorkbenchData.mockResolvedValue({
      organizationId: "org-1",
      summary: { totalRuns: 1 },
      runs: [],
    });

    const result = await getPayrollRunWorkbenchAction({
      organizationId: "client-org",
      actorId: "client-actor",
      limit: 25,
    });

    expect(result.success).toBe(true);
    expect(mockRequirePermission).toHaveBeenCalledWith("payroll.command.read", {
      resource: "PayrollRunWorkbench",
      auditAllowed: false,
    });
    expect(mockGetPayrollRunWorkbenchData).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "run-controller-1",
        actorPermissions: ["payroll.command.read"],
        limit: 25,
      }),
    );
    expect(mockGetPayrollRunWorkbenchData.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
      actorId: "client-actor",
    });
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.runs.workbench",
        accessIntent: "read",
      }),
    );
  });
  it("derives employee balance workbench tenant and actor context from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("payroll-reader-1", ["payroll.command.read"]),
    );
    mockGetPayrollEmployeeBalanceWorkbenchData.mockResolvedValue({
      organizationId: "org-1",
      summary: { activeCases: 1 },
      cases: [],
    });

    const result = await getPayrollEmployeeBalanceWorkbenchAction({
      organizationId: "client-org",
      limit: 10,
    });

    expect(result.success).toBe(true);
    expect(mockRequirePermission).toHaveBeenCalledWith("payroll.command.read", {
      resource: "PayrollEmployeeBalanceWorkbench",
      auditAllowed: false,
    });
    expect(mockGetPayrollEmployeeBalanceWorkbenchData).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "payroll-reader-1",
        actorPermissions: ["payroll.command.read"],
        limit: 10,
      }),
    );
    expect(
      mockGetPayrollEmployeeBalanceWorkbenchData.mock.calls[0][0],
    ).not.toMatchObject({
      organizationId: "client-org",
    });
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.employee_balance.workbench",
        accessIntent: "read",
      }),
    );
  });
  it("derives employee balance plan tenant from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("payroll-planner-1", ["payroll.payments.release"]),
    );
    mockPlanPayrollEmployeeBalanceCasesForCorrectionRun.mockResolvedValue({
      payrollRunId: "correction-run-1",
      summary: { readyToOpenCount: 1 },
      candidates: [],
    });

    const result = await planPayrollEmployeeBalanceCasesAction({
      organizationId: "client-org",
      payrollRunId: "correction-run-1",
    });

    expect(result.success).toBe(true);
    expect(
      mockPlanPayrollEmployeeBalanceCasesForCorrectionRun,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        payrollRunId: "correction-run-1",
      }),
    );
    expect(
      mockPlanPayrollEmployeeBalanceCasesForCorrectionRun.mock.calls[0][0],
    ).not.toMatchObject({ organizationId: "client-org" });
  });
  it("derives employee balance opening tenant and approver from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("payroll-approver-1", ["payroll.payments.release"]),
    );
    mockOpenPayrollEmployeeBalanceCaseFromCorrection.mockResolvedValue({
      balanceCase: { id: "balance-case-1" },
      openedEvent: { id: "balance-event-1" },
    });

    const result = await openPayrollEmployeeBalanceCaseAction({
      organizationId: "client-org",
      payrollRunId: "correction-run-1",
      employeeId: "employee-1",
      payslipId: "payslip-1",
      openedById: "payroll-controller-1",
      approvedById: "client-approver",
      reason: "Correction overpayment recovery",
      idempotencyKey: "balance-open-key-1",
    });
    expect(result.success).toBe(true);
    expect(
      mockOpenPayrollEmployeeBalanceCaseFromCorrection,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        payrollRunId: "correction-run-1",
        employeeId: "employee-1",
        openedById: "payroll-controller-1",
        approvedById: "payroll-approver-1",
        actorPermissions: ["payroll.payments.release"],
        lastAuthAt: new Date("2026-06-30T11:59:00.000Z"),
      }),
    );
    expect(
      mockOpenPayrollEmployeeBalanceCaseFromCorrection.mock.calls[0][0],
    ).not.toMatchObject({
      organizationId: "client-org",
      approvedById: "client-approver",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll",
      "page",
    );
  });

  it("derives employee balance bulk opening tenant and approver from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("payroll-approver-1", ["payroll.payments.release"]),
    );
    mockOpenPayrollEmployeeBalanceCasesForCorrectionRun.mockResolvedValue({
      opened: [{ balanceCase: { id: "balance-case-1" } }],
      skipped: [],
    });

    const result = await openPayrollEmployeeBalanceCasesForCorrectionRunAction({
      organizationId: "client-org",
      payrollRunId: "correction-run-1",
      openedById: "payroll-controller-1",
      approvedById: "client-approver",
      reason: "Correction overpayment recovery",
      idempotencyKey: "balance-bulk-open-key-1",
    });

    expect(result.success).toBe(true);
    expect(
      mockOpenPayrollEmployeeBalanceCasesForCorrectionRun,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        payrollRunId: "correction-run-1",
        openedById: "payroll-controller-1",
        approvedById: "payroll-approver-1",
        actorPermissions: ["payroll.payments.release"],
        lastAuthAt: new Date("2026-06-30T11:59:00.000Z"),
      }),
    );
    expect(
      mockOpenPayrollEmployeeBalanceCasesForCorrectionRun.mock.calls[0][0],
    ).not.toMatchObject({
      organizationId: "client-org",
      approvedById: "client-approver",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll",
      "page",
    );
  });
  it("derives employee balance settlement tenant and approver from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("payroll-reconciler-1", ["payroll.payments.reconcile"]),
    );
    mockSettlePayrollEmployeeBalanceCase.mockResolvedValue({
      balanceCase: { id: "balance-case-1" },
      settlementEvent: { id: "balance-event-2" },
    });

    const result = await settlePayrollEmployeeBalanceCaseAction({
      organizationId: "client-org",
      balanceCaseId: "balance-case-1",
      settledById: "cashier-1",
      approvedById: "client-approver",
      settlementDate: "2026-08-05",
      settlementMethod: "BANK_TRANSFER",
      amount: "9580.00",
      settlementEvidenceHash: "sha256:settlement-evidence",
      idempotencyKey: "balance-settle-key-1",
    });
    expect(result.success).toBe(true);
    expect(mockSettlePayrollEmployeeBalanceCase).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        balanceCaseId: "balance-case-1",
        settledById: "cashier-1",
        approvedById: "payroll-reconciler-1",
        actorPermissions: ["payroll.payments.reconcile"],
        lastAuthAt: new Date("2026-06-30T11:59:00.000Z"),
      }),
    );
    expect(
      mockSettlePayrollEmployeeBalanceCase.mock.calls[0][0],
    ).not.toMatchObject({
      organizationId: "client-org",
      approvedById: "client-approver",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll",
      "page",
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll/payments",
      "page",
    );
  });
  it("derives declaration workbench tenant context from the authenticated user", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("controller-1", ["payroll.command.read"]),
    );
    mockGetPayrollDeclarationWorkbenchData.mockResolvedValue({
      organizationId: "org-1",
      summary: { totalDeclarations: 0 },
      declarations: [],
    });

    const result = await getPayrollDeclarationWorkbenchAction({
      organizationId: "client-org",
      limit: 25,
    });

    expect(result.success).toBe(true);
    expect(mockRequirePermission).toHaveBeenCalledWith("payroll.command.read", {
      resource: "PayrollDeclarationWorkbench",
      auditAllowed: false,
    });
    expect(mockGetPayrollDeclarationWorkbenchData).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        limit: 25,
      }),
    );
    expect(mockGetPayrollDeclarationWorkbenchData.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
    });
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.declarations.workbench",
        accessIntent: "read",
      }),
    );
  });
  it("derives declaration preparer from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("payroll-1", ["payroll.declarations.prepare"]),
    );
    mockPreparePayrollDeclarations.mockResolvedValue({
      payrollRunId: "run-1",
      declarations: [{ id: "declaration-1" }],
    });

    const result = await preparePayrollDeclarationsAction({
      organizationId: "client-org",
      payrollRunId: "run-1",
      preparedById: "client-user",
    });

    expect(result.success).toBe(true);
    expect(mockPreparePayrollDeclarations).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        payrollRunId: "run-1",
        preparedById: "payroll-1",
      }),
    );
  });
  it("derives declaration lifecycle tenant and actor fields from authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("controller-1", ["payroll.declarations.manage"]),
    );
    mockRecordPayrollDeclarationEvidence.mockResolvedValue({
      declaration: { id: "declaration-1" },
      evidence: { id: "evidence-1" },
      automationCapabilityStatus: "AUTOMATION_BLOCKED",
      productionSubmissionSupported: false,
    });

    const result = await recordPayrollDeclarationEvidenceAction({
      organizationId: "client-org",
      actorId: "client-actor",
      declarationId: "declaration-1",
      transition: "submit",
      authorityChannel: "CNPS_MANUAL_PORTAL",
      authorityEnvironment: "MANUAL_PORTAL",
      authorityStatus: "SUBMITTED",
      submittedPayloadHash: "sha256:submitted-payload",
      portalReceiptHash: "sha256:portal-receipt",
      approvedById: "approver-1",
      idempotencyKey: "submit-key-1",
    });

    expect(result.success).toBe(true);
    expect(mockRecordPayrollDeclarationEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["payroll.declarations.manage"],
        lastAuthAt: new Date("2026-06-30T11:59:00.000Z"),
      }),
    );
    expect(
      mockRecordPayrollDeclarationEvidence.mock.calls[0][0],
    ).not.toMatchObject({
      organizationId: "client-org",
      actorId: "client-actor",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll",
      "page",
    );
  });
});
