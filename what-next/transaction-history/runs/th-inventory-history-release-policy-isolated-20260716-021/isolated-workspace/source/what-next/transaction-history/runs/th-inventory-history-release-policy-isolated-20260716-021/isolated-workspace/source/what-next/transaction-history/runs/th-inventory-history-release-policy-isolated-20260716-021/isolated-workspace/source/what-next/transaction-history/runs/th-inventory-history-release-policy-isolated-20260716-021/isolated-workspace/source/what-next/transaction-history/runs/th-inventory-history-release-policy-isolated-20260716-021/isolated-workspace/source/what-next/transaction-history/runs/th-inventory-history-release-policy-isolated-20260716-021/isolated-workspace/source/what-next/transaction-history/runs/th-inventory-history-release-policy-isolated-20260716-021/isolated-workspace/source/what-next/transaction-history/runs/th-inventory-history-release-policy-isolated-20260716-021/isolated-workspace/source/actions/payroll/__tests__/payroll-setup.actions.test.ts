import {
  FreshAuthRequiredError,
  requireFreshAuth,
} from "@/lib/security/auth-session";
import { requirePermission, RbacError } from "@/lib/security/rbac";
import { BusinessRuleError } from "@/services/_shared/action-errors";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { preparePayrollProofBackfillExecution } from "@/services/payroll/payroll-proof-backfill-executor.service";
import { reconcilePayrollProofBackfillCertificate } from "@/services/payroll/payroll-proof-backfill-reconciliation.service";
import { generatePayrollSeedBackfillDryRunPlan } from "@/services/payroll/payroll-seed-backfill-plan.service";
import { getPayrollSetupEvidenceReadModel } from "@/services/payroll/payroll-setup-evidence.service";
import { getPayrollSetupReadiness } from "@/services/payroll/payroll-setup-readiness.service";

import {
  generatePayrollSeedBackfillDryRunPlanAction,
  getPayrollSetupEvidenceReadModelAction,
  getPayrollSetupReadinessAction,
  preparePayrollProofBackfillExecutionAction,
  reconcilePayrollProofBackfillCertificateAction,
} from "../payroll-setup.actions";

jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {},
  requireFreshAuth: jest.fn(),
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
    assertCanUseOrganization: jest.fn(),
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
  };
});

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}));

jest.mock("@/services/payroll/payroll-setup-readiness.service", () => ({
  getPayrollSetupReadiness: jest.fn(),
}));

jest.mock("@/services/payroll/payroll-seed-backfill-plan.service", () => ({
  generatePayrollSeedBackfillDryRunPlan: jest.fn(),
}));

jest.mock("@/services/payroll/payroll-setup-evidence.service", () => ({
  getPayrollSetupEvidenceReadModel: jest.fn(),
}));

jest.mock("@/services/payroll/payroll-proof-backfill-executor.service", () => ({
  preparePayrollProofBackfillExecution: jest.fn(),
}));

jest.mock(
  "@/services/payroll/payroll-proof-backfill-reconciliation.service",
  () => ({
    reconcilePayrollProofBackfillCertificate: jest.fn(),
  }),
);

const mockRequireFreshAuth = requireFreshAuth as jest.Mock;
const mockRequirePermission = requirePermission as jest.Mock;
const mockObserveModuleAccess = observeModuleAccess as jest.Mock;
const mockGetPayrollSetupReadiness = getPayrollSetupReadiness as jest.Mock;
const mockGeneratePayrollSeedBackfillDryRunPlan =
  generatePayrollSeedBackfillDryRunPlan as jest.Mock;
const mockGetPayrollSetupEvidenceReadModel =
  getPayrollSetupEvidenceReadModel as jest.Mock;
const mockPreparePayrollProofBackfillExecution =
  preparePayrollProofBackfillExecution as jest.Mock;
const mockReconcilePayrollProofBackfillCertificate =
  reconcilePayrollProofBackfillCertificate as jest.Mock;

function rbacContext(
  userId = "setup-admin-1",
  permissions: string[] = ["payroll.runs.calculate"],
) {
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

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "setup-admin-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.setup.readiness",
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
    evaluatedAt: "2026-06-27T00:00:00.000Z",
    ...overrides,
  };
}

describe("payroll setup actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireFreshAuth.mockResolvedValue({
      claims: {
        lastAuthAt: new Date("2026-06-30T09:59:30.000Z").getTime(),
      },
    });
    mockRequirePermission.mockResolvedValue(rbacContext());
    mockObserveModuleAccess.mockResolvedValue(moduleDecision());
    mockGetPayrollSetupReadiness.mockResolvedValue({
      status: "READY",
      organizationRef: "redacted:org",
    });
    mockGeneratePayrollSeedBackfillDryRunPlan.mockResolvedValue({
      status: "READY",
      dryRunOnly: true,
      mutationModeAvailable: false,
      organizationRef: "redacted:org",
      plannedWrites: [],
    });
    mockGetPayrollSetupEvidenceReadModel.mockResolvedValue({
      status: "NO_EVIDENCE",
      organizationRef: "redacted:org",
      evidenceSource: "audit_logs",
      executionCertificates: [],
      reconciliationCertificates: [],
    });
    mockPreparePayrollProofBackfillExecution.mockResolvedValue({
      status: "SIGNOFF_REQUIRED",
      executionEnabled: false,
      mutationAttempted: false,
      organizationRef: "redacted:org",
      dryRunEvidenceHash: "sha256:dry-run",
    });
    mockReconcilePayrollProofBackfillCertificate.mockResolvedValue({
      status: "READY_FOR_CLOSE_RECHECK",
      organizationRef: "redacted:org",
      currentProofBackfill: { totalBlockingGaps: 0 },
    });
  });

  it("derives tenant and actor context for setup readiness", async () => {
    const result = await getPayrollSetupReadinessAction({
      organizationId: "client-org",
      actorId: "client-actor",
      countryCode: "CM",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      payDate: "2026-06-30",
      maxRows: "50",
    });

    expect(result.success).toBe(true);
    expect(mockRequirePermission).toHaveBeenCalledWith(
      "payroll.runs.calculate",
      {
        resource: "PayrollSetupReadiness",
        auditAllowed: false,
      },
    );
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "setup-admin-1",
        moduleSlug: "payroll",
        surface: "payroll.setup.readiness",
        accessIntent: "read",
        mode: "enforce",
      }),
    );
    expect(mockGetPayrollSetupReadiness).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "setup-admin-1",
      actorPermissions: ["payroll.runs.calculate"],
      countryCode: "CM",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      payDate: "2026-06-30",
      employeeSourceMode: "users",
      maxRows: 50,
    });
  });

  it("blocks setup actions when the payroll module is not entitled", async () => {
    mockObserveModuleAccess.mockResolvedValue(
      moduleDecision({
        result: "deny",
        allowed: false,
        wouldBlock: true,
        entitlement: null,
      }),
    );

    const result = await getPayrollSetupReadinessAction({});

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        status: 403,
        code: "FORBIDDEN",
      }),
    );
    expect(mockGetPayrollSetupReadiness).not.toHaveBeenCalled();
  });

  it("keeps dry-run plan generation protected and mutation mode blocked", async () => {
    mockGeneratePayrollSeedBackfillDryRunPlan.mockRejectedValue(
      new BusinessRuleError(
        "Payroll seed/backfill mutation mode is intentionally unavailable in this rollout slice.",
      ),
    );

    const result = await generatePayrollSeedBackfillDryRunPlanAction({
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      payDate: "2026-06-30",
      dryRun: false,
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        status: 422,
        code: "BUSINESS_RULE_VIOLATION",
        error:
          "Payroll seed/backfill mutation mode is intentionally unavailable in this rollout slice.",
      }),
    );
    expect(mockGeneratePayrollSeedBackfillDryRunPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "setup-admin-1",
        actorPermissions: ["payroll.runs.calculate"],
        dryRun: false,
      }),
    );
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.setup.dry_run",
        accessIntent: "read",
        mode: "enforce",
      }),
    );
  });

  it("derives tenant context for setup evidence read model", async () => {
    const result = await getPayrollSetupEvidenceReadModelAction({
      organizationId: "client-org",
      actorId: "client-actor",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      payDate: "2026-06-30",
      maxRows: "3",
    });

    expect(result.success).toBe(true);
    expect(mockGetPayrollSetupEvidenceReadModel).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "setup-admin-1",
      actorPermissions: ["payroll.runs.calculate"],
      countryCode: undefined,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      payDate: "2026-06-30",
      employeeSourceMode: "users",
      maxRows: 3,
    });
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.setup.evidence",
        accessIntent: "read",
        mode: "enforce",
      }),
    );
  });

  it("keeps proof-backfill validation on the read gate without fresh auth", async () => {
    const result = await preparePayrollProofBackfillExecutionAction({
      organizationId: "client-org",
      actorId: "client-actor",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      payDate: "2026-06-30",
      executionMode: "validate",
      executionMutationApproved: "true",
      expectedDryRunEvidenceHash: "sha256:dry-run",
      adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
      idempotencyKey: "tenant-proof-backfill-validate",
      now: "2026-06-30T10:00:00.000Z",
      persistCertificate: "true",
    });

    expect(result.success).toBe(true);
    expect(mockRequireFreshAuth).not.toHaveBeenCalled();
    expect(mockPreparePayrollProofBackfillExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "setup-admin-1",
        actorPermissions: ["payroll.runs.calculate"],
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        executionMode: "validate",
        executionMutationApproved: false,
        lastAuthAt: undefined,
        expectedDryRunEvidenceHash: "sha256:dry-run",
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        idempotencyKey: "tenant-proof-backfill-validate",
        now: "2026-06-30T10:00:00.000Z",
        persistCertificate: true,
      }),
    );
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.setup.proof_backfill_execution",
        accessIntent: "read",
        mode: "enforce",
      }),
    );
  });

  it("requires fresh auth before proof-backfill execution can mutate", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError());

    const result = await preparePayrollProofBackfillExecutionAction({
      executionMode: "execute",
      executionMutationApproved: "true",
      expectedDryRunEvidenceHash: "sha256:dry-run",
      persistCertificate: "true",
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        status: 403,
        code: "FRESH_AUTH_REQUIRED",
      }),
    );
    expect(mockRequirePermission).not.toHaveBeenCalled();
    expect(mockPreparePayrollProofBackfillExecution).not.toHaveBeenCalled();
  });

  it("forwards verified fresh-auth evidence for approved proof-backfill execution", async () => {
    const result = await preparePayrollProofBackfillExecutionAction({
      organizationId: "client-org",
      actorId: "client-actor",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      payDate: "2026-06-30",
      executionMode: "execute",
      executionMutationApproved: "true",
      expectedDryRunEvidenceHash: "sha256:dry-run",
      adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
      idempotencyKey: "tenant-proof-backfill-execute",
      now: "2026-06-30T10:00:00.000Z",
      persistCertificate: "true",
      signoffBundle: {
        dryRunEvidenceHash: "sha256:dry-run",
        approvalTokenHash: "sha256:approval-token",
        payrollAdminApprovedById: "payroll-admin-1",
        accountingControllerApprovedById: "accounting-controller-1",
        securityPrivacyApprovedById: "security-reviewer-1",
        operationsOwnerApprovedById: "ops-owner-1",
        approvedAt: "2026-06-30T09:59:00.000Z",
      },
    });

    expect(result.success).toBe(true);
    expect(mockRequireFreshAuth).toHaveBeenCalled();
    expect(mockPreparePayrollProofBackfillExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "setup-admin-1",
        actorPermissions: ["payroll.runs.calculate"],
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        executionMode: "execute",
        executionMutationApproved: true,
        lastAuthAt: new Date("2026-06-30T09:59:30.000Z"),
        expectedDryRunEvidenceHash: "sha256:dry-run",
        adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        idempotencyKey: "tenant-proof-backfill-execute",
        now: "2026-06-30T10:00:00.000Z",
        persistCertificate: true,
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
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.setup.proof_backfill_execution",
        accessIntent: "write",
        mode: "enforce",
      }),
    );
  });

  it("derives tenant context for proof-backfill reconciliation certificates", async () => {
    const result = await reconcilePayrollProofBackfillCertificateAction({
      organizationId: "client-org",
      actorId: "client-actor",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      payDate: "2026-06-30",
      sourceCertificateAuditLogId: "audit-source-1",
      sourceCertificateLedgerKey: "sha256:source-ledger",
      expectedSourceCertificateHash: "sha256:source-certificate",
      expectedSourceDryRunEvidenceHash: "sha256:source-dry-run",
      now: "2026-06-30T12:00:00.000Z",
      persistCertificate: "true",
    });

    expect(result.success).toBe(true);
    expect(mockReconcilePayrollProofBackfillCertificate).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "setup-admin-1",
        actorPermissions: ["payroll.runs.calculate"],
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        payDate: "2026-06-30",
        sourceCertificateAuditLogId: "audit-source-1",
        sourceCertificateLedgerKey: "sha256:source-ledger",
        expectedSourceCertificateHash: "sha256:source-certificate",
        expectedSourceDryRunEvidenceHash: "sha256:source-dry-run",
        now: "2026-06-30T12:00:00.000Z",
        persistCertificate: true,
      }),
    );
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.setup.proof_backfill_reconciliation",
        accessIntent: "read",
        mode: "enforce",
      }),
    );
  });

  it("returns a client-safe RBAC denial without calling setup services", async () => {
    mockRequirePermission.mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    const result = await generatePayrollSeedBackfillDryRunPlanAction({});

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        error: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      }),
    );
    expect(mockGetPayrollSetupReadiness).not.toHaveBeenCalled();
    expect(mockGeneratePayrollSeedBackfillDryRunPlan).not.toHaveBeenCalled();
    expect(mockGetPayrollSetupEvidenceReadModel).not.toHaveBeenCalled();
    expect(mockPreparePayrollProofBackfillExecution).not.toHaveBeenCalled();
    expect(mockReconcilePayrollProofBackfillCertificate).not.toHaveBeenCalled();
  });
});
