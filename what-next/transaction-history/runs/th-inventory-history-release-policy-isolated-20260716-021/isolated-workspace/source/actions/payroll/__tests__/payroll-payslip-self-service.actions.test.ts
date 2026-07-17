import { revalidatePath } from "next/cache"

import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  getPayrollPayslipSelfService,
  preparePayrollPayslipExport,
} from "@/services/payroll/payslip-self-service.service"

import {
  getMyPayrollPayslipsAction,
  prepareMyPayrollPayslipExportAction,
} from "../payroll-payslip-self-service.actions"

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

jest.mock("@/services/payroll/payslip-self-service.service", () => {
  const actual = jest.requireActual("@/services/payroll/payslip-self-service.service")
  return {
    ...actual,
    getPayrollPayslipSelfService: jest.fn(),
    preparePayrollPayslipExport: jest.fn(),
  }
})

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetPayrollPayslipSelfService = getPayrollPayslipSelfService as jest.Mock
const mockPreparePayrollPayslipExport = preparePayrollPayslipExport as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "employee-user-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.payslips.self.read",
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

function rbacContext(userId = "employee-user-1", permissions: string[] = []) {
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

describe("payroll payslip self-service actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: new Date("2026-06-30T11:59:00.000Z").getTime() } })
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
  })

  it("derives tenant and employee actor context for own payslip reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("employee-user-1", ["payroll.payslips.self.read"]))
    mockGetPayrollPayslipSelfService.mockResolvedValue({
      organizationId: "org-1",
      employee: { id: "emp-1" },
      summary: { payslipCount: 0 },
      redaction: { payrollAmounts: { mode: "allow" } },
      payslips: [],
    })

    const result = await getMyPayrollPayslipsAction({
      organizationId: "client-org",
      actorId: "client-actor",
      limit: 6,
    })

    expect(result.success).toBe(true)
    expect(mockGetPayrollPayslipSelfService).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "employee-user-1",
      actorPermissions: ["payroll.payslips.self.read"],
      limit: 6,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "employee-user-1",
      moduleSlug: "payroll",
      surface: "payroll.payslips.self.read",
      accessIntent: "read",
      mode: "enforce",
    }))
  })

  it("blocks self-service reads when the payroll module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("employee-user-1", ["payroll.payslips.self.read"]))
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({
      result: "deny",
      allowed: false,
      wouldBlock: true,
      reason: "Tenant is not entitled to this module.",
      entitlement: null,
    }))

    const result = await getMyPayrollPayslipsAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockGetPayrollPayslipSelfService).not.toHaveBeenCalled()
  })

  it("requires fresh auth before own payslip export", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await prepareMyPayrollPayslipExportAction({ payslipId: "payslip-1" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockPreparePayrollPayslipExport).not.toHaveBeenCalled()
  })

  it("derives tenant, actor, verified fresh-auth evidence, and revalidates payslip routes for export", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("employee-user-1", [
      "payroll.payslips.self.read",
      "payroll.payslips.self.export",
    ]))
    mockPreparePayrollPayslipExport.mockResolvedValue({
      payslipId: "payslip-1",
      fileName: "wm_export.json",
      mimeType: "application/json",
      content: "{}",
      contentHash: "sha256:export",
      archiveManifestHash: "sha256:archive",
      watermarkId: "wm_export",
      rowCount: 4,
      generatedAt: "2026-06-26T00:00:00.000Z",
      businessEventId: "event-1",
      redaction: { allowed: true },
    })

    const result = await prepareMyPayrollPayslipExportAction({
      organizationId: "client-org",
      actorId: "client-actor",
      payslipId: "payslip-1",
      purpose: "Download own payslip",
    })

    expect(result.success).toBe(true)
    expect(mockPreparePayrollPayslipExport).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "employee-user-1",
      actorPermissions: ["payroll.payslips.self.read", "payroll.payslips.self.export"],
      payslipId: "payslip-1",
      purpose: "Download own payslip",
      lastAuthAt: new Date("2026-06-30T11:59:00.000Z"),
      now: expect.any(Date),
    }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      surface: "payroll.payslips.self.export",
      accessIntent: "export",
      mode: "enforce",
    }))
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll/payslips", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/dashboard/payroll/payslips", "page")
  })

  it("returns a client-safe RBAC denial for own payslip reads", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getMyPayrollPayslipsAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockGetPayrollPayslipSelfService).not.toHaveBeenCalled()
  })
})
