import { requireAnyPermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getCashDrawerDashboard } from "@/services/pos/drawer-dashboard.service"

import { getCashDrawerDashboardAction } from "../drawer-dashboard.actions"

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
    requireAnyPermission: jest.fn(),
  }
})

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/pos/drawer-dashboard.service", () => ({
  getCashDrawerDashboard: jest.fn(),
}))

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetCashDrawerDashboard = getCashDrawerDashboard as jest.Mock

function rbacContext(permissions: string[] = ["finance.cash-drawer.read"]) {
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

describe("cash drawer dashboard action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue(rbacContext())
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockGetCashDrawerDashboard.mockResolvedValue({
      summary: {
        openingBalance: 10000,
        expectedCash: 12500,
        countedCash: null,
        variance: null,
      },
    })
  })

  it("requires finance cash-drawer read access and POS module observe evidence before loading dashboard data", async () => {
    const result = await getCashDrawerDashboardAction({ locationId: "loc-1", period: "today" })

    expect(result).toEqual({
      success: true,
      data: {
        summary: {
          openingBalance: 10000,
          expectedCash: 12500,
          countedCash: null,
          variance: null,
        },
      },
      error: null,
    })
    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["finance.cash-drawer.read", "finance.read"], {
      resource: "CashDrawerDashboard",
      resourceId: "loc-1",
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "cashier-1",
      actorPermissions: ["finance.cash-drawer.read"],
      moduleSlug: "pos",
      surfaceType: "action",
      surface: "actions/pos/drawer-dashboard.actions.ts:getCashDrawerDashboardAction",
      accessIntent: "read",
      mode: "observe",
      audit: true,
    })
    expect(mockGetCashDrawerDashboard).toHaveBeenCalledWith({
      locationId: "loc-1",
      period: "today",
      organizationId: "org-1",
    })
  })

  it("keeps POS module would-block decisions report-only for finance wildcard actors", async () => {
    mockRequireAnyPermission.mockResolvedValue(rbacContext(["*"]))
    mockObserveModuleAccess.mockResolvedValue({
      allowed: true,
      wouldBlock: true,
      result: "would_block",
      rbacWildcardPresent: true,
      rbacWildcardBypassedEntitlement: false,
    })

    const result = await getCashDrawerDashboardAction({ locationId: "loc-1" })

    expect(result.success).toBe(true)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorPermissions: ["*"],
      moduleSlug: "pos",
      mode: "observe",
      audit: true,
    }))
    expect(mockGetCashDrawerDashboard).toHaveBeenCalled()
  })

  it("denies before invalid period input can reach module observation or service work", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getCashDrawerDashboardAction({ locationId: "loc-1", period: "tomorrow" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
    }))
    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["finance.cash-drawer.read", "finance.read"], {
      resource: "CashDrawerDashboard",
      resourceId: "loc-1",
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetCashDrawerDashboard).not.toHaveBeenCalled()
  })
})
