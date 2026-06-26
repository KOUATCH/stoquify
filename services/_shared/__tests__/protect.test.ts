import { protect } from "@/services/_shared/protect"
import { assertCanUseOrganization, RbacError, requirePermission } from "@/lib/security/rbac"
import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
    }
  }

  return {
    RbacError: MockRbacError,
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    assertCanUseOrganization: jest.fn(),
    requirePermission: jest.fn(),
  }
})

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

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

const mockRequirePermission = requirePermission as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "user-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.runs.calculate",
    accessIntent: "write",
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
    evaluatedAt: "2026-06-25T00:00:00.000Z",
    ...overrides,
  }
}

describe("protect", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: Date.now() } })
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
  })

  it("passes input and RBAC context to the handler when authorized", async () => {
    const ctx = { userId: "user-1", orgId: "org-1", permissions: ["users.read"] }
    mockRequirePermission.mockResolvedValue(ctx)
    const handler = jest.fn().mockResolvedValue({ ok: true })

    const action = protect<{ id: string }, { ok: boolean }>(
      { permission: "users.read", auditResource: "User" },
      handler,
    )
    const result = await action({ id: "user-2" })

    expect(result).toEqual({ success: true, data: { ok: true }, error: null, status: 200 })
    expect(mockRequirePermission).toHaveBeenCalledWith("users.read", { resource: "User" })
    expect(mockAssertCanUseOrganization).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledWith({ id: "user-2" }, ctx)
  })

  it("rejects caller-supplied organization scope that does not pass RBAC context checks", async () => {
    const ctx = { userId: "user-1", orgId: "org-session", permissions: ["users.read"] }
    mockRequirePermission.mockResolvedValue(ctx)
    mockAssertCanUseOrganization.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
    const handler = jest.fn().mockResolvedValue({ ok: true })

    const action = protect<{ organizationId: string }, { ok: boolean }>(
      { permission: "users.read", auditResource: "User" },
      handler,
    )
    const result = await action({ organizationId: "attacker-org" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(ctx, "attacker-org")
    expect(handler).not.toHaveBeenCalled()
  })

  it("checks nested data organization scope before calling the handler", async () => {
    const ctx = { userId: "user-1", orgId: "org-session", permissions: ["inventory.items.update"] }
    mockRequirePermission.mockResolvedValue(ctx)
    const handler = jest.fn().mockResolvedValue({ ok: true })

    const action = protect<{ data: { organizationId: string } }, { ok: boolean }>(
      { permission: "inventory.items.update", auditResource: "Item" },
      handler,
    )
    const result = await action({ data: { organizationId: "org-session" } })

    expect(result).toEqual({ success: true, data: { ok: true }, error: null, status: 200 })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(ctx, "org-session")
    expect(handler).toHaveBeenCalledWith({ data: { organizationId: "org-session" } }, ctx)
  })

  it("allows reviewed handler-derived tenant scope without trusting caller organization fields", async () => {
    const ctx = { userId: "user-1", orgId: "org-session", permissions: ["payroll.runs.calculate"] }
    mockRequirePermission.mockResolvedValue(ctx)
    const handler = jest.fn().mockResolvedValue({ ok: true })

    const action = protect<{ organizationId: string }, { ok: boolean }>(
      {
        permission: "payroll.runs.calculate",
        auditResource: "PayrollRun",
        tenantGuard: "handler-derived",
      },
      handler,
    )
    const result = await action({ organizationId: "caller-org" })

    expect(result).toEqual({ success: true, data: { ok: true }, error: null, status: 200 })
    expect(mockAssertCanUseOrganization).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledWith({ organizationId: "caller-org" }, ctx)
  })

  it("blocks a protected action when module entitlement enforcement denies access", async () => {
    const ctx = { userId: "user-1", orgId: "org-session", permissions: ["*", "payroll.runs.calculate"] }
    mockRequirePermission.mockResolvedValue(ctx)
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({
      organizationId: "org-session",
      result: "deny",
      allowed: false,
      wouldBlock: true,
      reason: "Tenant is not entitled to this module.",
      entitlement: null,
      rbacWildcardPresent: true,
    }))
    const handler = jest.fn().mockResolvedValue({ ok: true })

    const action = protect<{ payrollPeriodId: string }, { ok: boolean }>(
      {
        permission: "payroll.runs.calculate",
        auditResource: "PayrollRun",
        module: {
          moduleSlug: "payroll",
          surface: "payroll.runs.calculate",
          accessIntent: "write",
          mode: "enforce",
        },
      },
      handler,
    )
    const result = await action({ payrollPeriodId: "period-1" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
    }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-session",
      userId: "user-1",
      actorPermissions: ["*", "payroll.runs.calculate"],
      moduleSlug: "payroll",
      surfaceType: "action",
      surface: "payroll.runs.calculate",
      accessIntent: "write",
      mode: "enforce",
    }))
    expect(handler).not.toHaveBeenCalled()
  })

  it("requires fresh authentication when configured", async () => {
    const ctx = { userId: "user-1", orgId: "org-1", permissions: ["accounting.journal.post"] }
    mockRequirePermission.mockResolvedValue(ctx)
    const handler = jest.fn().mockResolvedValue({ posted: true })

    const action = protect<{ id: string }, { posted: boolean }>(
      { permission: "accounting.journal.post", auditResource: "JournalEntry", freshAuth: true },
      handler,
    )
    const result = await action({ id: "je-1" })

    expect(result).toEqual({ success: true, data: { posted: true }, error: null, status: 200 })
    expect(mockRequireFreshAuth).toHaveBeenCalledWith(undefined)
    expect(mockRequirePermission).toHaveBeenCalledWith("accounting.journal.post", { resource: "JournalEntry" })
  })

  it("returns a step-up response when fresh authentication is stale", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())
    const handler = jest.fn()

    const action = protect(
      { permission: "accounting.period.close", auditResource: "AccountingPeriod", freshAuth: true },
      handler,
    )
    const result = await action({ periodId: "period-1" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it("does not leak unexpected error messages", async () => {
    mockRequirePermission.mockResolvedValue({ userId: "user-1", orgId: "org-1", permissions: ["users.read"] })
    const handler = jest.fn().mockRejectedValue(new Error("database://secret host failed"))

    const action = protect({ permission: "users.read" }, handler)
    const result = await action({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "The operation could not be completed. Please try again or contact support.",
      status: 500,
      code: "INTERNAL_ERROR",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
  })

  it("returns forbidden when the RBAC check fails", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
    const handler = jest.fn()

    const action = protect({ permission: "users.delete" }, handler)
    const result = await action({ id: "user-2" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
    expect(handler).not.toHaveBeenCalled()
  })
})
