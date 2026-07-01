import {
  FreshAuthRequiredError,
  requireFreshAuth,
} from "@/lib/security/auth-session";
import { requirePermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { certifyPayrollPilotCycle } from "@/services/payroll/payroll-pilot-cycle-certification.service";

import { certifyPayrollPilotCycleAction } from "../payroll-pilot-certification.actions";

jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {},
  requireFreshAuth: jest.fn(),
}));

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  isRbacError: () => false,
  requirePermission: jest.fn(),
  RbacError: class RbacError extends Error {},
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}));

jest.mock("@/services/payroll/payroll-pilot-cycle-certification.service", () => ({
  certifyPayrollPilotCycle: jest.fn(),
}));

const mockRequireFreshAuth = requireFreshAuth as jest.Mock;
const mockRequirePermission = requirePermission as jest.Mock;
const mockObserveModuleAccess = observeModuleAccess as jest.Mock;
const mockCertifyPayrollPilotCycle = certifyPayrollPilotCycle as jest.Mock;

function rbacContext() {
  return {
    userId: "pilot-controller-1",
    orgId: "org-1",
    permissions: ["payroll.command.read"],
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    user: {
      id: "pilot-controller-1",
      roles: [],
      permissions: ["payroll.command.read"],
      organizationId: "org-1",
    },
  };
}

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "pilot-controller-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.pilot_cycle.certify",
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
    evaluatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function certificate(overrides: Record<string, unknown> = {}) {
  return {
    kind: "AQSTOQFLOW_PAYROLL_CONTROLLED_PILOT_CYCLE_CERTIFICATE",
    version: 1,
    status: "READY_FOR_SIGNOFF",
    generatedAt: "2026-07-01T10:00:00.000Z",
    certificateHash: "sha256:pilot-certificate",
    blockers: [],
    signoff: { missingRoles: ["payroll-admin"] },
    persistence: {
      requested: false,
      persisted: false,
      auditLogId: null,
      entityType: "PayrollPilotCycleCertification",
      auditAction: null,
    },
    ...overrides,
  } as any;
}

describe("payroll pilot certification actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: new Date("2026-07-01T09:58:00.000Z").getTime() },
    });
    mockRequirePermission.mockResolvedValue(rbacContext());
    mockObserveModuleAccess.mockResolvedValue(moduleDecision());
    mockCertifyPayrollPilotCycle.mockResolvedValue(certificate());
  });

  it("evaluates pilot certification on the read gate without fresh auth", async () => {
    const result = await certifyPayrollPilotCycleAction({
      organizationId: "client-org",
      actorId: "client-actor",
      payrollRunId: "run-1",
      expectedSourceRegisterHash: "sha256:register-proof",
      adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
      proofBackfillCertificateHash: "sha256:backfill-certificate",
      persistCertificate: "false",
      payrollAdminApprovedById: "payroll-admin-1",
      payrollAdminApprovedAt: "2026-07-01T09:00:00.000Z",
      payrollAdminEvidenceHash: "sha256:payroll-admin-signoff",
    });

    expect(result.success).toBe(true);
    expect(mockRequireFreshAuth).not.toHaveBeenCalled();
    expect(mockCertifyPayrollPilotCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        payrollRunId: "run-1",
        actorId: "pilot-controller-1",
        actorPermissions: ["payroll.command.read"],
        expectedSourceRegisterHash: "sha256:register-proof",
        expectedAdapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        expectedProofBackfillCertificateHash: "sha256:backfill-certificate",
        persistCertificate: false,
        signoffBundle: expect.objectContaining({
          payrollAdmin: expect.objectContaining({
            approvedById: "payroll-admin-1",
            approvedAt: "2026-07-01T09:00:00.000Z",
            evidenceHash: "sha256:payroll-admin-signoff",
          }),
        }),
      }),
    );
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.pilot_cycle.certify",
        accessIntent: "read",
        mode: "enforce",
      }),
    );
  });

  it("requires fresh auth before persisting pilot certification", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError());

    const result = await certifyPayrollPilotCycleAction({
      payrollRunId: "run-1",
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
    expect(mockCertifyPayrollPilotCycle).not.toHaveBeenCalled();
  });

  it("persists pilot certification through the write gate after fresh auth", async () => {
    mockCertifyPayrollPilotCycle.mockResolvedValueOnce(
      certificate({
        status: "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW",
        signoff: { missingRoles: [] },
        persistence: {
          requested: true,
          persisted: true,
          auditLogId: "pilot-audit-1",
          entityType: "PayrollPilotCycleCertification",
          auditAction: "PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED",
        },
      }),
    );

    const result = await certifyPayrollPilotCycleAction({
      payrollRunId: "run-1",
      expectedAdapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
      expectedProofBackfillCertificateHash: "sha256:backfill-certificate",
      persistCertificate: "true",
      signoffBundle: {
        payrollAdmin: {
          approvedById: "payroll-admin-1",
          approvedAt: "2026-07-01T09:00:00.000Z",
          evidenceHash: "sha256:payroll-admin-signoff",
        },
        accountingController: {
          approvedById: "accounting-controller-1",
          approvedAt: "2026-07-01T09:05:00.000Z",
          evidenceHash: "sha256:accounting-signoff",
        },
      },
    });

    expect(result.success).toBe(true);
    expect(mockRequireFreshAuth).toHaveBeenCalled();
    expect(mockCertifyPayrollPilotCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        payrollRunId: "run-1",
        actorId: "pilot-controller-1",
        persistCertificate: true,
        signoffBundle: expect.objectContaining({
          accountingController: expect.objectContaining({
            approvedById: "accounting-controller-1",
            approvedAt: "2026-07-01T09:05:00.000Z",
            evidenceHash: "sha256:accounting-signoff",
          }),
        }),
      }),
    );
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.pilot_cycle.certify",
        accessIntent: "write",
        mode: "enforce",
      }),
    );
  });
});