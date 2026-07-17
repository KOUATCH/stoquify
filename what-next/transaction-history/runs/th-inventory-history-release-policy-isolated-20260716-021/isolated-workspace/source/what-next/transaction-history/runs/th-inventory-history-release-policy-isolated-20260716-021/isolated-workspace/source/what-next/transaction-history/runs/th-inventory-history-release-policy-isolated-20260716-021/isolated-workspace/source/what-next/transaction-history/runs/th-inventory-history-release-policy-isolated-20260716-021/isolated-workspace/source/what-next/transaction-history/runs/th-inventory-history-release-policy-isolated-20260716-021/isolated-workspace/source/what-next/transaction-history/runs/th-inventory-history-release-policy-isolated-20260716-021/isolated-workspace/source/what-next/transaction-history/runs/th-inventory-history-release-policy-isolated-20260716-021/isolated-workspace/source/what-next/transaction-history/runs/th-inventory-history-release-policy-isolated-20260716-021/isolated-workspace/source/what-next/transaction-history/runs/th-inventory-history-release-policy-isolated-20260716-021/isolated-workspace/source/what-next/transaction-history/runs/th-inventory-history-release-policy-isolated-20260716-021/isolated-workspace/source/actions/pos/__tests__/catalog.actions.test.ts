import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { listPOSCatalogItems, listPOSLocations, listPOSTerminals } from "@/services/pos/pos.service"

import { getPOSCatalogAction, getPOSLocationsAction, getPOSTerminalsAction } from "../catalog.actions"

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
    requirePermission: jest.fn(),
  }
})

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/pos/pos.service", () => ({
  listPOSCatalogItems: jest.fn(),
  listPOSLocations: jest.fn(),
  listPOSTerminals: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockListPOSCatalogItems = listPOSCatalogItems as jest.Mock
const mockListPOSLocations = listPOSLocations as jest.Mock
const mockListPOSTerminals = listPOSTerminals as jest.Mock

function rbacContext(permissions: string[] = ["pos.use"]) {
  return {
    userId: "cashier-1",
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
  }
}

describe("POS catalog actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext())
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockListPOSLocations.mockResolvedValue([{ id: "loc-1", name: "Main shop" }])
    mockListPOSTerminals.mockResolvedValue([{ id: "terminal-1", locationId: "loc-1" }])
    mockListPOSCatalogItems.mockResolvedValue([{ id: "item-1", name: "Coffee" }])
  })

  it("lists POS locations only after POS RBAC and module observe evidence", async () => {
    const result = await getPOSLocationsAction()

    expect(result).toEqual({
      success: true,
      data: [{ id: "loc-1", name: "Main shop" }],
      error: null,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.use", {
      resource: "POSCatalog",
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "cashier-1",
      actorPermissions: ["pos.use"],
      moduleSlug: "pos",
      surfaceType: "action",
      surface: "actions/pos/catalog.actions.ts:getPOSLocationsAction",
      accessIntent: "read",
      mode: "observe",
      audit: true,
    })
    expect(mockListPOSLocations).toHaveBeenCalledWith({ organizationId: "org-1" })
  })

  it("passes the requested location as RBAC resource evidence before terminal listing", async () => {
    const result = await getPOSTerminalsAction({ locationId: "loc-1" })

    expect(result).toEqual({
      success: true,
      data: [{ id: "terminal-1", locationId: "loc-1" }],
      error: null,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.use", {
      resource: "POSTerminal",
      resourceId: "loc-1",
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "cashier-1",
      actorPermissions: ["pos.use"],
      moduleSlug: "pos",
      surface: "actions/pos/catalog.actions.ts:getPOSTerminalsAction",
      accessIntent: "read",
      mode: "observe",
    }))
    expect(mockListPOSTerminals).toHaveBeenCalledWith({
      locationId: "loc-1",
      organizationId: "org-1",
    })
  })

  it("keeps module would-block decisions report-only while preserving wildcard evidence", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["*"]))
    mockObserveModuleAccess.mockResolvedValue({
      allowed: true,
      wouldBlock: true,
      result: "would_block",
      rbacWildcardPresent: true,
      rbacWildcardBypassedEntitlement: false,
    })

    const result = await getPOSCatalogAction({ locationId: "loc-1", search: "espresso" })

    expect(result.success).toBe(true)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "cashier-1",
      actorPermissions: ["*"],
      moduleSlug: "pos",
      surface: "actions/pos/catalog.actions.ts:getPOSCatalogAction",
      accessIntent: "read",
      mode: "observe",
      audit: true,
    }))
    expect(mockListPOSCatalogItems).toHaveBeenCalledWith({
      locationId: "loc-1",
      search: "espresso",
      take: 48,
      organizationId: "org-1",
    })
  })

  it("denies catalog access before validation or module observation can leak request-shape details", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getPOSCatalogAction({ search: "espresso" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
    }))
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.use", {
      resource: "POSCatalog",
      resourceId: undefined,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListPOSCatalogItems).not.toHaveBeenCalled()
  })

  it("denies terminal listing before invalid location input reaches module observation or service work", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getPOSTerminalsAction({ locationId: "" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
    }))
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.use", {
      resource: "POSTerminal",
      resourceId: undefined,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListPOSTerminals).not.toHaveBeenCalled()
  })
})
