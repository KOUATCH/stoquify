import { revalidatePath } from "next/cache"

import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  getPayrollRegister,
  preparePayrollRegisterExport,
} from "@/services/payroll/payroll-register.service"

import {
  getPayrollRegisterAction,
  preparePayrollRegisterExportAction,
} from "../payroll-register.actions"

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
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
    assertCanUseOrganization: jest.fn(),
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
  logger: {
    error: jest.fn(),
  },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/payroll/payroll-register.service", () => {
  const actual = jest.requireActual("@/services/payroll/payroll-register.service")
  return {
    ...actual,
    getPayrollRegister: jest.fn(),
    preparePayrollRegisterExport: jest.fn(),
  }
})

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetPayrollRegister = getPayrollRegister as jest.Mock
const mockPreparePayrollRegisterExport = preparePayrollRegisterExport as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "controller-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.reports.read",
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

function rbacContext(userId = "controller-1", permissions: string[] = ["payroll.reports.read"]) {
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

describe("payroll register actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: Date.now() } })
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
    mockGetPayrollRegister.mockResolvedValue({
      organizationId: "org-1",
      payrollRun: { id: "run-1" },
      rows: [],
      summary: { registerHash: "sha256:register" },
    })
  })

  it("derives tenant and actor context for register reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("controller-1", ["payroll.reports.read"]))

    const result = await getPayrollRegisterAction({
      organizationId: "client-org",
      actorId: "client-actor",
      payrollRunId: "run-1",
      limit: 25,
    })

    expect(result.success).toBe(true)
    expect(mockGetPayrollRegister).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "controller-1",
      actorPermissions: ["payroll.reports.read"],
      payrollRunId: "run-1",
      limit: 25,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "controller-1",
      moduleSlug: "payroll",
      surface: "payroll.reports.read",
      accessIntent: "read",
      mode: "enforce",
    }))
  })

  it("blocks register reads when the payroll module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("controller-1", ["payroll.reports.read"]))
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({
      result: "deny",
      allowed: false,
      wouldBlock: true,
      reason: "Tenant is not entitled to this module.",
      entitlement: null,
    }))

    const result = await getPayrollRegisterAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockGetPayrollRegister).not.toHaveBeenCalled()
  })

  it("requires fresh authentication before register export", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await preparePayrollRegisterExportAction({ payrollRunId: "run-1" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockPreparePayrollRegisterExport).not.toHaveBeenCalled()
  })

  it("derives tenant, actor, fresh-auth evidence, and revalidates register routes for export", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("controller-1", ["payroll.reports.read", "payroll.exports.create"]))
    mockPreparePayrollRegisterExport.mockResolvedValue({
      payrollRunId: "run-1",
      fileName: "wm_register.json",
      mimeType: "application/json",
      content: "{}",
      contentHash: "sha256:export",
      registerHash: "sha256:register",
      watermarkId: "wm_register",
      rowCount: 4,
      generatedAt: "2026-06-26T00:00:00.000Z",
      businessEventId: "event-1",
      redaction: { allowed: true },
    })

    const result = await preparePayrollRegisterExportAction({
      organizationId: "client-org",
      actorId: "client-actor",
      payrollRunId: "run-1",
      purpose: "Controller register review",
    })

    expect(result.success).toBe(true)
    expect(mockPreparePayrollRegisterExport).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "controller-1",
      actorPermissions: ["payroll.reports.read", "payroll.exports.create"],
      payrollRunId: "run-1",
      purpose: "Controller register review",
      lastAuthAt: expect.any(Date),
      now: expect.any(Date),
    }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      surface: "payroll.exports.create",
      accessIntent: "export",
      mode: "enforce",
    }))
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll/register", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/dashboard/payroll/register", "page")
  })

  it("returns a client-safe RBAC denial for register reads", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getPayrollRegisterAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockGetPayrollRegister).not.toHaveBeenCalled()
  })
})
