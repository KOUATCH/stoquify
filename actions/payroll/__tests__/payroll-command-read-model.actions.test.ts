import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getPayrollCommandReadModel } from "@/services/payroll/command-read-model.service"

import { getPayrollCommandReadModelAction } from "../payroll-command-read-model.actions"

jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {},
  requireFreshAuth: jest.fn(),
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
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
  }
})

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/payroll/command-read-model.service", () => ({
  getPayrollCommandReadModel: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetPayrollCommandReadModel = getPayrollCommandReadModel as jest.Mock

function rbacContext(userId = "command-reader-1", permissions: string[] = ["payroll.command.read"]) {
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
  }
}

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "command-reader-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.command.read",
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
    evaluatedAt: "2026-06-26T00:00:00.000Z",
    ...overrides,
  }
}

describe("payroll command read-model action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext())
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
    mockGetPayrollCommandReadModel.mockResolvedValue({ organizationId: "org-1", asOf: "2026-06-26T00:00:00.000Z" })
  })

  it("returns a safe RBAC denial without calling the command service", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getPayrollCommandReadModelAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockGetPayrollCommandReadModel).not.toHaveBeenCalled()
  })

  it("blocks command reads when the payroll module is not entitled", async () => {
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({ result: "deny", allowed: false, wouldBlock: true, entitlement: null }))

    const result = await getPayrollCommandReadModelAction({ limit: 10 })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "command-reader-1",
      moduleSlug: "payroll",
      surfaceType: "action",
      surface: "payroll.command.read",
      accessIntent: "read",
      mode: "enforce",
    }))
    expect(mockGetPayrollCommandReadModel).not.toHaveBeenCalled()
  })

  it("derives tenant and actor context for the service-owned command read model", async () => {
    const result = await getPayrollCommandReadModelAction({ limit: 12, asOf: "2026-06-26T08:00:00.000Z" })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("payroll.command.read", {
      resource: "PayrollCommandReadModel",
      auditAllowed: false,
    })
    expect(mockGetPayrollCommandReadModel).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "command-reader-1",
      actorPermissions: ["payroll.command.read"],
      limit: 12,
      asOf: new Date("2026-06-26T08:00:00.000Z"),
    })
  })
})