import createActionTaxRate from "@/actions/taxRate/createActionTaxRate"
import { createManagedTaxRate } from "@/actions/taxRate/tax-rate-management-actions"
import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { assertActiveOrganization } from "@/services/_shared/assert-active-organization"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

jest.mock("@/actions/taxRate/tax-rate-management-actions", () => ({
  createManagedTaxRate: jest.fn(),
}))

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeLoggedActionErrorMessage: jest.fn((_message, _error, _options, fallback) => fallback),
}))

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock("@/services/_shared/assert-active-organization", () => ({
  assertActiveOrganization: jest.fn(async (organizationId: string) => organizationId),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

const mockCreateManagedTaxRate = createManagedTaxRate as jest.Mock
const mockSafeLoggedActionErrorMessage = safeLoggedActionErrorMessage as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockAssertActiveOrganization = assertActiveOrganization as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

const rbacContext = {
  orgId: "org-1",
  userId: "user-1",
  permissions: ["taxes.create"],
}

const input = {
  organizationId: "org-1",
  taxRateName: "VAT",
  rate: "19.25",
  type: "SALES",
  isActive: true,
}

describe("createActionTaxRate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext)
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockAssertActiveOrganization.mockResolvedValue("org-1")
    mockCreateManagedTaxRate.mockResolvedValue({
      success: true,
      data: { id: "tax-1" },
      error: null,
    })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
  })

  it("requires tax create permission, validates tenant access, delegates creation, and observes settings", async () => {
    const result = await createActionTaxRate(input)

    expect(result).toEqual({
      success: true,
      error: null,
      data: { id: "tax-1" },
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("taxes.create", {
      resource: "TaxRate",
      auditAllowed: true,
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(rbacContext, "org-1")
    expect(mockAssertActiveOrganization).toHaveBeenCalledWith("org-1")
    expect(mockCreateManagedTaxRate).toHaveBeenCalledWith("org-1", {
      nameEn: "VAT",
      nameFr: null,
      rate: 19.25,
      type: "SALES",
      isActive: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["taxes.create"],
      moduleSlug: "settings",
      surfaceType: "action",
      surface: "actions/taxRate/createActionTaxRate.ts",
      accessIntent: "write",
      mode: "observe",
    })
  })

  it("fails closed before delegated creation when RBAC denies access", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden: missing permission taxes.create"))

    const result = await createActionTaxRate(input)

    expect(result).toEqual({
      success: false,
      error: "Failed to create tax rate",
      data: null,
    })
    expect(mockCreateManagedTaxRate).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockSafeLoggedActionErrorMessage).toHaveBeenCalled()
  })

  it("does not delegate or observe module access when organization is missing", async () => {
    const result = await createActionTaxRate({ ...input, organizationId: "" })

    expect(result).toEqual({
      success: false,
      error: "Organization is required",
      data: null,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("taxes.create", {
      resource: "TaxRate",
      auditAllowed: true,
    })
    expect(mockCreateManagedTaxRate).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })

  it("does not emit wrapper module observe when delegated validation fails", async () => {
    mockCreateManagedTaxRate.mockResolvedValueOnce({
      success: false,
      error: "English name is required",
    })

    const result = await createActionTaxRate({ ...input, taxRateName: "" })

    expect(result).toEqual({
      success: false,
      error: "English name is required",
      data: null,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })
})
