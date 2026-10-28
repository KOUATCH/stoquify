import {
  FreshAuthRequiredError,
  requireFreshAuth,
} from "@/lib/security/auth-session";
import { requirePermission, RbacError } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { cameroonCountryPack } from "@/services/regulatory/country-packs/cameroon";
import {
  getCountryPack,
  getCountryPacks,
} from "@/services/regulatory/country-packs/registry";
import { buildPayrollCountryPackReviewIntakeCertificate } from "@/services/payroll/payroll-country-pack-review-intake.service";
import {
  approvePayrollCountryPackReviewIntakeCertificate,
  recordPayrollCountryPackReviewIntakeCertificate,
} from "@/services/payroll/payroll-country-pack-review-intake-persistence.service";

import {
  approvePayrollCountryPackReviewIntakeAction,
  evaluatePayrollCountryPackReviewIntakeAction,
  recordPayrollCountryPackReviewIntakeAction,
} from "../payroll-country-pack-review-intake.actions";

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

jest.mock("@/services/regulatory/country-packs/registry", () => ({
  getCountryPack: jest.fn(),
  getCountryPacks: jest.fn(),
}));

jest.mock("@/services/payroll/payroll-country-pack-review-intake.service", () => ({
  buildPayrollCountryPackReviewIntakeCertificate: jest.fn(),
}));

jest.mock(
  "@/services/payroll/payroll-country-pack-review-intake-persistence.service",
  () => ({
    approvePayrollCountryPackReviewIntakeCertificate: jest.fn(),
    recordPayrollCountryPackReviewIntakeCertificate: jest.fn(),
  }),
);

const mockRequireFreshAuth = requireFreshAuth as jest.Mock;
const mockRequirePermission = requirePermission as jest.Mock;
const mockObserveModuleAccess = observeModuleAccess as jest.Mock;
const mockGetCountryPack = getCountryPack as jest.Mock;
const mockGetCountryPacks = getCountryPacks as jest.Mock;
const mockBuildPayrollCountryPackReviewIntakeCertificate =
  buildPayrollCountryPackReviewIntakeCertificate as jest.Mock;
const mockRecordPayrollCountryPackReviewIntakeCertificate =
  recordPayrollCountryPackReviewIntakeCertificate as jest.Mock;
const mockApprovePayrollCountryPackReviewIntakeCertificate =
  approvePayrollCountryPackReviewIntakeCertificate as jest.Mock;

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
    surface: "payroll.country_pack_review_intake.evaluate",
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

function intakeInput(overrides: Record<string, unknown> = {}) {
  return {
    countryCode: "CM",
    basePackVersion: cameroonCountryPack.header.packVersion,
    proposedPack: cameroonCountryPack,
    targetFamilies: ["IRPP_PERIOD"],
    reviewTopicEvidence: [
      {
        topic: "taxableSalaryBase",
        legalRef: "CM_DGI_CGI_2025",
        sourceEvidenceHash: "sha256:topic-review-evidence",
        reviewedBy: "Qualified Cameroon payroll tax reviewer",
        reviewedOn: "2026-06-28",
      },
    ],
    generatedAt: "2026-07-01T09:00:00.000Z",
    ...overrides,
  };
}

function certificate() {
  return {
    kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE",
    status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
    certificateHash: "sha256:intake-certificate",
  };
}

describe("payroll country-pack review intake actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireFreshAuth.mockResolvedValue({
      claims: {
        lastAuthAt: new Date("2026-07-01T09:59:30.000Z").getTime(),
      },
    });
    mockRequirePermission.mockResolvedValue(rbacContext());
    mockObserveModuleAccess.mockResolvedValue(moduleDecision());
    mockGetCountryPack.mockReturnValue(cameroonCountryPack);
    mockGetCountryPacks.mockReturnValue([cameroonCountryPack]);
    mockBuildPayrollCountryPackReviewIntakeCertificate.mockReturnValue(
      certificate(),
    );
    mockRecordPayrollCountryPackReviewIntakeCertificate.mockResolvedValue({
      ...certificate(),
      persistence: {
        auditLogId: "audit-intake-1",
      },
    });
    mockApprovePayrollCountryPackReviewIntakeCertificate.mockResolvedValue({
      kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_LEGAL_OWNER_APPROVAL",
      status: "APPROVED",
      approvalHash: "sha256:approval-hash",
    });
  });

  it("evaluates proposed country-pack review intake with tenant-owned context", async () => {
    const result = await evaluatePayrollCountryPackReviewIntakeAction(
      intakeInput(),
    );

    expect(result.success).toBe(true);
    expect(mockRequireFreshAuth).not.toHaveBeenCalled();
    expect(mockRequirePermission).toHaveBeenCalledWith(
      "payroll.runs.calculate",
      {
        resource: "PayrollCountryPackReviewIntakeCertificate",
        auditAllowed: false,
      },
    );
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "setup-admin-1",
        surface: "payroll.country_pack_review_intake.evaluate",
        accessIntent: "read",
        mode: "enforce",
      }),
    );
    expect(mockBuildPayrollCountryPackReviewIntakeCertificate).toHaveBeenCalledWith(
      expect.objectContaining({
        basePack: cameroonCountryPack,
        proposedPack: cameroonCountryPack,
        targetFamilies: ["IRPP_PERIOD"],
        reviewTopicEvidence: [
          expect.objectContaining({
            topic: "taxableSalaryBase",
            sourceEvidenceHash: "sha256:topic-review-evidence",
          }),
        ],
        generatedAt: "2026-07-01T09:00:00.000Z",
      }),
    );
  });

  it("records a recomputed certificate only after fresh auth", async () => {
    const result = await recordPayrollCountryPackReviewIntakeAction(
      intakeInput(),
    );

    expect(result.success).toBe(true);
    expect(mockRequireFreshAuth).toHaveBeenCalled();
    expect(mockBuildPayrollCountryPackReviewIntakeCertificate).toHaveBeenCalled();
    expect(mockRecordPayrollCountryPackReviewIntakeCertificate).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "setup-admin-1",
      certificate: certificate(),
    });
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.country_pack_review_intake.record",
        accessIntent: "write",
      }),
    );
  });

  it("approves a persisted intake certificate with approve permission and fresh-auth evidence", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("legal-owner-1", ["payroll.runs.approve"]),
    );

    const result = await approvePayrollCountryPackReviewIntakeAction({
      expectedCertificateHash: "sha256:intake-certificate",
      approvalEvidenceHash: "sha256:legal-owner-approval",
      approvedAt: "2026-07-01T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
    expect(mockRequirePermission).toHaveBeenCalledWith("payroll.runs.approve", {
      resource: "PayrollCountryPackReviewIntakeApproval",
    });
    expect(mockApprovePayrollCountryPackReviewIntakeCertificate).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "legal-owner-1",
      expectedCertificateHash: "sha256:intake-certificate",
      approvalEvidenceHash: "sha256:legal-owner-approval",
      lastAuthAt: new Date("2026-07-01T09:59:30.000Z"),
      approvedAt: "2026-07-01T10:00:00.000Z",
      freshAuthMaxAgeSeconds: undefined,
    });
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "payroll.country_pack_review_intake.approve",
        accessIntent: "write",
      }),
    );
  });

  it("blocks fresh-auth protected recording before permission or service calls", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError());

    const result = await recordPayrollCountryPackReviewIntakeAction(
      intakeInput(),
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        status: 403,
        code: "FRESH_AUTH_REQUIRED",
      }),
    );
    expect(mockRequirePermission).not.toHaveBeenCalled();
    expect(mockBuildPayrollCountryPackReviewIntakeCertificate).not.toHaveBeenCalled();
    expect(mockRecordPayrollCountryPackReviewIntakeCertificate).not.toHaveBeenCalled();
  });

  it("returns a safe validation error when proposed pack payload is malformed", async () => {
    const result = await evaluatePayrollCountryPackReviewIntakeAction(
      intakeInput({ proposedPack: { header: { countryCode: "CM" } } }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        status: 422,
        code: "BUSINESS_RULE_VIOLATION",
      }),
    );
    expect(mockBuildPayrollCountryPackReviewIntakeCertificate).not.toHaveBeenCalled();
  });

  it("returns a client-safe RBAC denial without evaluating country-pack evidence", async () => {
    mockRequirePermission.mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    const result = await evaluatePayrollCountryPackReviewIntakeAction(
      intakeInput(),
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        error: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      }),
    );
    expect(mockBuildPayrollCountryPackReviewIntakeCertificate).not.toHaveBeenCalled();
  });
});
