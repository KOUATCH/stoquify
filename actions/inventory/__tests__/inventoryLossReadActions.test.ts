import { RbacError, requirePermission } from "@/lib/security/rbac"
import { readInventoryLossSummary } from "@/services/inventory/inventory-loss-read.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"

import { getInventoryLossSummaryAction } from "../inventoryLossReadActions"

jest.mock("@/prisma/db", () => ({ db: {} }))

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code:
        | "UNAUTHENTICATED"
        | "NO_ACTIVE_ORG"
        | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    isRbacError: (error: unknown) =>
      error instanceof MockRbacError,
    requirePermission: jest.fn(),
    assertCanUseOrganization: jest.fn(),
  }
})

jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class MockFreshAuthRequiredError extends Error {},
  requireFreshAuth: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock(
  "@/services/operating-access/operating-access-scope.service",
  () => ({
    resolveOperatingAccessScope: jest.fn(),
  }),
)

jest.mock("@/services/inventory/inventory-loss-read.service", () => {
  const actual = jest.requireActual(
    "@/services/inventory/inventory-loss-read.service",
  )
  return {
    ...actual,
    readInventoryLossSummary: jest.fn(),
  }
})

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockResolveOperatingAccess =
  resolveOperatingAccessScope as jest.Mock
const mockReadInventoryLoss =
  readInventoryLossSummary as jest.Mock

const from = "2026-01-01T00:00:00.000Z"
const to = "2026-02-01T00:00:00.000Z"

function rbacContext(
  permissions = ["inventory.levels.read", "dashboard.read"],
) {
  return {
    userId: "manager-1",
    orgId: "org-1",
    organizationName: "Test organization",
    permissions,
    roles: [
      {
        id: "role-manager",
        name: "Manager",
        code: "manager",
        permissions,
      },
    ],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    user: {
      id: "manager-1",
      firstName: "Awa",
      lastName: "Ndi",
      phone: "",
      roles: [],
      permissions,
      organizationId: "org-1",
      organizationName: "Test organization",
    },
  }
}

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "manager-1",
    moduleSlug: "inventory",
    surfaceType: "action",
    surface: "inventory.loss.summary.read",
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
    evaluatedAt: "2026-08-01T09:00:00.000Z",
    ...overrides,
  }
}

function tenantAccess(overrides: Record<string, unknown> = {}) {
  return {
    allowed: true,
    organizationId: "org-1",
    actorId: "manager-1",
    requiredPermission: "dashboard.read",
    authority: {
      kind: "TENANT_WIDE",
      basis: "RBAC_ROLE",
      matchedRoleCode: "administrator",
    },
    scope: {
      kind: "TENANT",
      locationIds: null,
    },
    ...overrides,
  }
}

function locationAccess(
  locationIds = ["location-b", "location-a"],
  overrides: Record<string, unknown> = {},
) {
  return {
    allowed: true,
    organizationId: "org-1",
    actorId: "manager-1",
    requiredPermission: "dashboard.read",
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
      managedLocations: locationIds.map((id) => ({
        id,
        name: id,
        code: id,
      })),
    },
    scope: {
      kind: "LOCATIONS",
      locationIds,
    },
    ...overrides,
  }
}

const summary = {
  summary: {
    lossLineCount: 0,
    adjustmentCount: 0,
    totalLossValue: "0.00",
    currency: "XAF",
    complete: true,
  },
  records: [],
}

describe("inventory loss read action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext())
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
    mockResolveOperatingAccess.mockResolvedValue(tenantAccess())
    mockReadInventoryLoss.mockResolvedValue(summary)
  })

  it("derives tenant authority and strips caller identity and plural location claims", async () => {
    const result = await getInventoryLossSummaryAction({
      organizationId: "client-org",
      actorId: "client-actor",
      actorPermissions: ["*"],
      roles: [{ code: "administrator" }],
      locationIds: ["client-location"],
      from,
      to,
      locationId: "location-1",
      itemId: "item-1",
      approverId: "approver-1",
      detailLimit: 25,
      groupLimit: 5,
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        status: 200,
        data: {
          scope: {
            kind: "TENANT",
            authorizedLocationIds: null,
          },
          data: summary,
        },
      }),
    )
    expect(mockRequirePermission).toHaveBeenCalledWith(
      "inventory.levels.read",
      {
        resource: "InventoryLossSummary",
        auditAllowed: true,
      },
    )
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "manager-1",
        actorPermissions: [
          "inventory.levels.read",
          "dashboard.read",
        ],
        moduleSlug: "inventory",
        surface: "inventory.loss.summary.read",
        accessIntent: "read",
        mode: "enforce",
        audit: true,
      }),
    )
    expect(mockResolveOperatingAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        userId: "manager-1",
      }),
    )
    expect(mockReadInventoryLoss).toHaveBeenCalledWith({
      organizationId: "org-1",
      from: new Date(from),
      to: new Date(to),
      locationId: "location-1",
      itemId: "item-1",
      approverId: "approver-1",
      detailLimit: 25,
      groupLimit: 5,
    })
  })

  it("injects all audited managed locations when no location is requested", async () => {
    mockResolveOperatingAccess.mockResolvedValue(locationAccess())

    const result = await getInventoryLossSummaryAction({
      from,
      to,
      locationIds: ["untrusted-location"],
    })

    expect(result.success).toBe(true)
    expect(result).toEqual(
      expect.objectContaining({
        data: {
          scope: {
            kind: "LOCATIONS",
            authorizedLocationIds: [
              "location-a",
              "location-b",
            ],
          },
          data: summary,
        },
      }),
    )
    expect(mockReadInventoryLoss).toHaveBeenCalledWith({
      organizationId: "org-1",
      from: new Date(from),
      to: new Date(to),
      locationIds: ["location-a", "location-b"],
      detailLimit: 100,
      groupLimit: 10,
    })
  })

  it("allows a manager to narrow the query to one authorized location", async () => {
    mockResolveOperatingAccess.mockResolvedValue(locationAccess())

    const result = await getInventoryLossSummaryAction({
      from,
      to,
      locationId: "location-b",
    })

    expect(result.success).toBe(true)
    expect(mockReadInventoryLoss).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        locationId: "location-b",
      }),
    )
    expect(
      mockReadInventoryLoss.mock.calls[0][0],
    ).not.toHaveProperty("locationIds")
  })

  it("rejects an unassigned location before reading loss data", async () => {
    mockResolveOperatingAccess.mockResolvedValue(locationAccess())

    const result = await getInventoryLossSummaryAction({
      from,
      to,
      locationId: "location-outside-scope",
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        status: 403,
        code: "FORBIDDEN",
      }),
    )
    expect(mockReadInventoryLoss).not.toHaveBeenCalled()
  })

  it("fails closed when audited operating access is denied", async () => {
    mockResolveOperatingAccess.mockResolvedValue({
      allowed: false,
      organizationId: "org-1",
      actorId: "manager-1",
      requiredPermission: "dashboard.read",
      authority: {
        kind: "DENIED",
        basis: "LOCATION_ASSIGNMENT",
      },
      reason: "NO_MANAGED_LOCATIONS",
      scope: null,
    })

    const result = await getInventoryLossSummaryAction({ from, to })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        status: 403,
        code: "FORBIDDEN",
      }),
    )
    expect(mockReadInventoryLoss).not.toHaveBeenCalled()
  })

  it.each([
    {
      name: "tenant mismatch",
      access: tenantAccess({ organizationId: "other-org" }),
    },
    {
      name: "actor mismatch",
      access: tenantAccess({ actorId: "other-user" }),
    },
  ])("rejects inconsistent $name evidence", async ({ access }) => {
    mockResolveOperatingAccess.mockResolvedValue(access)

    const result = await getInventoryLossSummaryAction({ from, to })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        status: 403,
        code: "FORBIDDEN",
      }),
    )
    expect(mockReadInventoryLoss).not.toHaveBeenCalled()
  })

  it("rejects inconsistent managed-location authority evidence", async () => {
    mockResolveOperatingAccess.mockResolvedValue(
      locationAccess(["location-a"], {
        authority: {
          kind: "LOCATION_RESPONSIBILITY",
          basis: "Location.managerId",
          managedLocations: [
            {
              id: "location-b",
              name: "Branch B",
              code: "B",
            },
          ],
        },
      }),
    )

    const result = await getInventoryLossSummaryAction({ from, to })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        status: 403,
        code: "FORBIDDEN",
      }),
    )
    expect(mockReadInventoryLoss).not.toHaveBeenCalled()
  })

  it("blocks before scope resolution when the inventory module is unavailable", async () => {
    mockObserveModuleAccess.mockResolvedValue(
      moduleDecision({
        result: "deny",
        allowed: false,
        wouldBlock: true,
        entitlement: null,
      }),
    )

    const result = await getInventoryLossSummaryAction({ from, to })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        status: 403,
        code: "FORBIDDEN",
      }),
    )
    expect(mockResolveOperatingAccess).not.toHaveBeenCalled()
    expect(mockReadInventoryLoss).not.toHaveBeenCalled()
  })

  it("returns a client-safe RBAC denial without resolving scope", async () => {
    mockRequirePermission.mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    )

    const result = await getInventoryLossSummaryAction({ from, to })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
        error: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      }),
    )
    expect(result).toHaveProperty("correlationId")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockResolveOperatingAccess).not.toHaveBeenCalled()
    expect(mockReadInventoryLoss).not.toHaveBeenCalled()
  })

  it("rejects an invalid period before scope resolution or loss reads", async () => {
    const result = await getInventoryLossSummaryAction({
      from,
      to: from,
      locationIds: ["untrusted-location"],
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: null,
      }),
    )
    expect(mockResolveOperatingAccess).not.toHaveBeenCalled()
    expect(mockReadInventoryLoss).not.toHaveBeenCalled()
  })
})
