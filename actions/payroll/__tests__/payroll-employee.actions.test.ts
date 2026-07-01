import { revalidatePath } from "next/cache"

import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  attachPayrollEmployeeEvidenceReferences,
  getPayrollEmployeeSourceData,
  upsertPayrollEmployeeSourceProfile,
} from "@/services/payroll/employee.service"

import {
  attachPayrollEmployeeEvidenceReferencesAction,
  getPayrollEmployeeSourceDataAction,
  upsertPayrollEmployeeSourceProfileAction,
} from "../payroll-employee.actions"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    assertCanUseOrganization: jest.fn(),
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
  }
})

jest.mock("@/lib/security/auth-session", () => {
  class MockFreshAuthRequiredError extends Error {
    constructor(message = "Fresh authentication required") {
      super(message)
      this.name = "FreshAuthRequiredError"
    }
  }

  return {
    FreshAuthRequiredError: MockFreshAuthRequiredError,
    requireFreshAuth: jest.fn(),
  }
})

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/payroll/employee.service", () => ({
  attachPayrollEmployeeEvidenceReferences: jest.fn(),
  getPayrollEmployeeSourceData: jest.fn(),
  upsertPayrollEmployeeSourceProfile: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetPayrollEmployeeSourceData = getPayrollEmployeeSourceData as jest.Mock
const mockUpsertPayrollEmployeeSourceProfile = upsertPayrollEmployeeSourceProfile as jest.Mock
const mockAttachPayrollEmployeeEvidenceReferences = attachPayrollEmployeeEvidenceReferences as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "actor-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.employees.read",
    accessIntent: "read",
    mode: "enforce",
    result: "allow",
    allowed: true,
    wouldBlock: false,
    reason: "Tenant module entitlement is available.",
    entitlement: { moduleSlug: "payroll", status: "active", source: "requested_modules", startsAt: null, endsAt: null, readOnly: false, trial: false },
    missingDependencies: [],
    rbacWildcardPresent: false,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: true,
    evaluatedAt: "2026-06-27T00:00:00.000Z",
    ...overrides,
  }
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
    user: { id: userId, roles: [], permissions, organizationId: "org-1" },
  }
}

describe("payroll employee actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: "2026-06-27T00:00:00.000Z" } })
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
    mockGetPayrollEmployeeSourceData.mockResolvedValue({
      organizationId: "org-1",
      asOf: "2026-06-27T00:00:00.000Z",
      employees: [],
      summary: {},
      redaction: { salaryDecision: { allowed: false, mode: "redact", reasonCode: "MISSING_PERMISSION", policy: "payroll" } },
    })
  })

  it("derives tenant and actor context for employee source-data reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("reader-1", ["payroll.employees.read"]))

    const result = await getPayrollEmployeeSourceDataAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "employee-1",
      limit: 25,
      asOf: "2026-06-27T00:00:00.000Z",
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("payroll.employees.read", {
      resource: "PayrollEmployee",
      auditAllowed: false,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "reader-1",
      moduleSlug: "payroll",
      surface: "payroll.employees.read",
      accessIntent: "read",
      mode: "enforce",
    }))
    expect(mockGetPayrollEmployeeSourceData).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "reader-1",
      actorPermissions: ["payroll.employees.read"],
      employeeId: "employee-1",
      limit: 25,
    }))
    expect(mockGetPayrollEmployeeSourceData.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
      actorId: "client-actor",
    })
  })

  it("blocks employee source-data reads when the payroll module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("reader-1", ["payroll.employees.read"]))
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({
      result: "deny",
      allowed: false,
      wouldBlock: true,
      entitlement: null,
    }))

    const result = await getPayrollEmployeeSourceDataAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockGetPayrollEmployeeSourceData).not.toHaveBeenCalled()
  })

  it("requires fresh auth before employee source-data writes", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await upsertPayrollEmployeeSourceProfileAction({
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      hireDate: "2026-01-01",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockUpsertPayrollEmployeeSourceProfile).not.toHaveBeenCalled()
  })

  it("derives tenant and actor context for profile upsert and evidence attachment", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("hr-1", ["payroll.employees.manage"]))
    mockUpsertPayrollEmployeeSourceProfile.mockResolvedValue({
      payrollEmployee: { id: "employee-1" },
      created: true,
      businessEventId: "event-1",
      evidenceReferenceCount: 1,
    })
    mockAttachPayrollEmployeeEvidenceReferences.mockResolvedValue({
      payrollEmployee: { id: "employee-1" },
      businessEventId: "event-2",
      evidenceReferenceCount: 2,
    })

    const upsertResult = await upsertPayrollEmployeeSourceProfileAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      hireDate: "2026-01-01",
      evidenceReferences: [{ type: "IDENTITY", documentHash: "sha256:identity-evidence" }],
    })
    const evidenceResult = await attachPayrollEmployeeEvidenceReferencesAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "employee-1",
      evidenceReferences: [{ type: "CONTRACT", documentHash: "sha256:contract-evidence" }],
    })

    expect(upsertResult.success).toBe(true)
    expect(evidenceResult.success).toBe(true)
    expect(mockUpsertPayrollEmployeeSourceProfile).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.employees.manage"],
    }))
    expect(mockAttachPayrollEmployeeEvidenceReferences).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.employees.manage"],
      employeeId: "employee-1",
    }))
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll/employees", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll/setup", "page")
  })

  it("returns a client-safe RBAC denial before employee write services run", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await attachPayrollEmployeeEvidenceReferencesAction({
      employeeId: "employee-1",
      evidenceReferences: [{ type: "IDENTITY", documentHash: "sha256:identity-evidence" }],
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockAttachPayrollEmployeeEvidenceReferences).not.toHaveBeenCalled()
  })
})
