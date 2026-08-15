import { revalidatePath } from "next/cache"

import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { prepareCustomerExport } from "@/services/customer/customer-export.service"
import {
  createCustomerForManagement,
  getCustomerManagementDataForOrg,
  getCustomerManagementRowForOrg,
} from "@/services/customer/customer.service"
import {
  createManagedCustomer,
  getManagedCustomer,
  getCustomerManagementData,
  prepareCustomerExportAction,
} from "../customer-management-actions"

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

jest.mock("@/services/customer/customer-export.service", () => ({
  prepareCustomerExport: jest.fn(),
}))

jest.mock("@/services/customer/customer.service", () => ({
  createCustomerForManagement: jest.fn(),
  getCustomerDetailAnalyticsForOrg: jest.fn(),
  getCustomerManagementDataForOrg: jest.fn(),
  getCustomerManagementRowForOrg: jest.fn(),
  removeCustomerForManagement: jest.fn(),
  updateCustomerForManagement: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockPrepareCustomerExport = prepareCustomerExport as jest.Mock
const mockGetCustomerManagementData = getCustomerManagementDataForOrg as jest.Mock
const mockGetCustomerManagementRow = getCustomerManagementRowForOrg as jest.Mock
const mockCreateCustomer = createCustomerForManagement as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function rbacContext(permissions: string[]) {
  return {
    userId: "user-1",
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    user: {
      id: "user-1",
      roles: [],
      permissions,
      organizationId: "org-1",
    },
  }
}

describe("customer management protected actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: new Date("2026-08-09T11:59:00.000Z").getTime() },
    })
    mockAssertCanUseOrganization.mockResolvedValue(undefined)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockGetCustomerManagementData.mockResolvedValue({
      customers: [],
      summary: {},
      topBySales: [],
      topByBalance: [],
    })
  })

  it("loads one customer through the tenant-scoped protected read boundary", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["customers.read"]))
    mockGetCustomerManagementRow.mockResolvedValue({ id: "customer-1", name: "Test customer" })

    const result = await getManagedCustomer("org-1", "customer-1")

    expect(result).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ id: "customer-1" }),
    }))
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1" }),
      "org-1",
    )
    expect(mockGetCustomerManagementRow).toHaveBeenCalledWith("org-1", "customer-1")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      moduleSlug: "sales",
      surface: "customers.read",
    }))
  })

  it("derives the tenant for reads and enforces the sales module", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["customers.read"]))

    const result = await getCustomerManagementData("org-1")

    expect(result.success).toBe(true)
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1" }),
      "org-1",
    )
    expect(mockGetCustomerManagementData).toHaveBeenCalledWith("org-1")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      moduleSlug: "sales",
      surface: "customers.read",
      accessIntent: "read",
      mode: "enforce",
    }))
  })

  it("uses the session tenant for customer writes and revalidates dependent workflows", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["customers.create"]))
    mockCreateCustomer.mockResolvedValue({
      id: "customer-1",
      organizationId: "org-1",
      name: "Acme",
    })

    const result = await createManagedCustomer("org-1", { name: "Acme" })

    expect(result.success).toBe(true)
    expect(mockCreateCustomer).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ name: "Acme", isActive: true, preferredLocale: "EN" }),
    )
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      surface: "customers.create",
      accessIntent: "write",
      mode: "enforce",
    }))
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/[locale]/dashboard/finance/receivables",
      "page",
    )
  })

  it("fails closed before permission or export work when fresh authentication is missing", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await prepareCustomerExportAction({ scope: "customers" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockPrepareCustomerExport).not.toHaveBeenCalled()
  })

  it("derives tenant, actor, permission, and fresh-auth evidence for controlled exports", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext(["customers.read", "customers.orders.read", "customers.export"]),
    )
    mockPrepareCustomerExport.mockResolvedValue({
      scope: "customer-orders",
      customerId: "customer-1",
      fileName: "customer-orders-wm_test.csv",
      mimeType: "text/csv;charset=utf-8",
      content: "csv",
      contentHash: "sha256:content",
      filtersHash: "sha256:filters",
      watermarkId: "wm_test",
      rowCount: 2,
      generatedAt: "2026-08-09T12:00:00.000Z",
    })

    const result = await prepareCustomerExportAction({
      scope: "customer-orders",
      customerId: "customer-1",
      filters: { orderStatus: "DELIVERED" },
    })

    expect(result.success).toBe(true)
    expect(mockPrepareCustomerExport).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "user-1",
      actorPermissions: ["customers.read", "customers.orders.read", "customers.export"],
      scope: "customer-orders",
      customerId: "customer-1",
      lastAuthAt: new Date("2026-08-09T11:59:00.000Z"),
      now: expect.any(Date),
    }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      moduleSlug: "sales",
      surface: "customers.export",
      accessIntent: "export",
      mode: "enforce",
    }))
  })

  it("requires scope-specific read access in addition to export authority", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["customers.export"]))

    const result = await prepareCustomerExportAction({
      scope: "customer-orders",
      customerId: "customer-1",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockPrepareCustomerExport).not.toHaveBeenCalled()
  })

  it("blocks reads before service execution when the sales module is unavailable", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["customers.read"]))
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })

    const result = await getCustomerManagementData("org-1")

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockGetCustomerManagementData).not.toHaveBeenCalled()
  })
})
