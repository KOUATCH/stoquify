import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getTaxRateManagementData } from "@/actions/taxRate/tax-rate-management-actions"

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/actions/taxRate/tax-rate-management-actions", () => ({
  getTaxRateManagementData: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetTaxRateManagementData = getTaxRateManagementData as jest.Mock

function rbacContext(permissions: string[] = ["taxes.read"]) {
  return {
    userId: "user-1",
    orgId: "org-1",
    permissions,
  }
}

describe("getOrgTaxRates", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext())
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockGetTaxRateManagementData.mockResolvedValue({
      success: true,
      data: { taxRates: [{ id: "tax-1" }] },
    })
  })

  it("requires tax read permission, delegates to the management action, and observes settings", async () => {
    const result = await getOrgTaxRates("org-1")

    expect(result).toEqual({
      error: null,
      success: true,
      data: [{ id: "tax-1" }],
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("taxes.read", { resource: "TaxRate" })
    expect(mockGetTaxRateManagementData).toHaveBeenCalledWith("org-1")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["taxes.read"],
      moduleSlug: "settings",
      surfaceType: "action",
      surface: "actions/taxRate/getOrgTaxRates.ts",
      accessIntent: "read",
      mode: "observe",
    })
  })

  it("fails closed before delegated data access when taxes.read is denied", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden: missing permission taxes.read"))

    await expect(getOrgTaxRates("org-1")).rejects.toThrow("Forbidden: missing permission taxes.read")

    expect(mockGetTaxRateManagementData).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })

  it("does not observe module access when delegated tax-rate read fails", async () => {
    mockGetTaxRateManagementData.mockResolvedValue({
      success: false,
      error: "Failed to fetch tax rates",
    })

    const result = await getOrgTaxRates("org-1")

    expect(result).toEqual({
      error: "Failed to fetch tax rates",
      success: false,
      data: [],
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })
})
