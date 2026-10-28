import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { exportInventoryMovementHistory } from "@/services/inventory/inventory-history-export.service"
import { readInventoryMovementHistory } from "@/services/inventory/inventory-read.service"

import {
  exportInventoryMovementHistoryAction,
  getInventoryMovementHistoryAction,
} from "../inventoryMovementHistoryActions"

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
  logger: { error: jest.fn() },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/inventory/inventory-read.service", () => {
  const actual = jest.requireActual("@/services/inventory/inventory-read.service")
  return { ...actual, readInventoryMovementHistory: jest.fn() }
})

jest.mock("@/services/inventory/inventory-history-export.service", () => {
  const actual = jest.requireActual("@/services/inventory/inventory-history-export.service")
  return { ...actual, exportInventoryMovementHistory: jest.fn() }
})

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockReadHistory = readInventoryMovementHistory as jest.Mock
const mockExportHistory = exportInventoryMovementHistory as jest.Mock

function rbacContext(permissions: string[], userId = "inventory-controller-1") {
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
    userId: "inventory-controller-1",
    moduleSlug: "inventory",
    surfaceType: "action",
    surface: "inventory.levels.read",
    accessIntent: "read",
    mode: "enforce",
    result: "allow",
    allowed: true,
    wouldBlock: false,
    reason: "Tenant module entitlement is available.",
    entitlement: {
      moduleSlug: "inventory",
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
    evaluatedAt: "2026-07-15T09:00:00.000Z",
    ...overrides,
  }
}

describe("inventory movement history actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: new Date("2026-07-15T08:59:00.000Z").getTime() },
    })
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
    mockReadHistory.mockResolvedValue({ rows: [] })
    mockExportHistory.mockResolvedValue({
      fileName: "inventory-history.json",
      fileType: "application/json",
      content: "{}",
      manifest: { exportId: "export-1" },
      manifestAuditId: "audit-1",
    })
  })

  it("derives the tenant for history reads and ignores client identity fields", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["inventory.levels.read"]))

    const result = await getInventoryMovementHistoryAction({
      organizationId: "client-org",
      actorId: "client-actor",
      filters: { dateFrom: "2026-07-01", pageSize: 25 },
    })

    expect(result.success).toBe(true)
    expect(mockReadHistory).toHaveBeenCalledWith({
      organizationId: "org-1",
      filters: { dateFrom: "2026-07-01", pageSize: 25 },
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "inventory-controller-1",
      moduleSlug: "inventory",
      surface: "inventory.levels.read",
      accessIntent: "read",
      mode: "enforce",
    }))
  })

  it("requires fresh authentication before checking export authority", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await exportInventoryMovementHistoryAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockExportHistory).not.toHaveBeenCalled()
  })

  it("passes only trusted actor, tenant, permissions, and fresh-auth evidence to export", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext(["reports.export", "inventory.levels.read"]),
    )

    const result = await exportInventoryMovementHistoryAction({
      organizationId: "client-org",
      actorId: "client-actor",
      actorPermissions: ["*"],
      filters: { locationId: "location-1" },
      maximumRows: 500,
    })

    expect(result.success).toBe(true)
    expect(mockExportHistory).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "inventory-controller-1",
      actorPermissions: ["reports.export", "inventory.levels.read"],
      lastAuthAt: new Date("2026-07-15T08:59:00.000Z"),
      now: expect.any(Date),
      filters: { locationId: "location-1" },
      maximumRows: 500,
    }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      surface: "inventory.history.export",
      accessIntent: "export",
      mode: "enforce",
    }))
  })

  it("blocks reads when the inventory module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["inventory.levels.read"]))
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({
      result: "deny",
      allowed: false,
      wouldBlock: true,
      reason: "Tenant is not entitled to this module.",
      entitlement: null,
    }))

    const result = await getInventoryMovementHistoryAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockReadHistory).not.toHaveBeenCalled()
  })

  it("returns a client-safe RBAC denial without reading history", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getInventoryMovementHistoryAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockReadHistory).not.toHaveBeenCalled()
  })
})
