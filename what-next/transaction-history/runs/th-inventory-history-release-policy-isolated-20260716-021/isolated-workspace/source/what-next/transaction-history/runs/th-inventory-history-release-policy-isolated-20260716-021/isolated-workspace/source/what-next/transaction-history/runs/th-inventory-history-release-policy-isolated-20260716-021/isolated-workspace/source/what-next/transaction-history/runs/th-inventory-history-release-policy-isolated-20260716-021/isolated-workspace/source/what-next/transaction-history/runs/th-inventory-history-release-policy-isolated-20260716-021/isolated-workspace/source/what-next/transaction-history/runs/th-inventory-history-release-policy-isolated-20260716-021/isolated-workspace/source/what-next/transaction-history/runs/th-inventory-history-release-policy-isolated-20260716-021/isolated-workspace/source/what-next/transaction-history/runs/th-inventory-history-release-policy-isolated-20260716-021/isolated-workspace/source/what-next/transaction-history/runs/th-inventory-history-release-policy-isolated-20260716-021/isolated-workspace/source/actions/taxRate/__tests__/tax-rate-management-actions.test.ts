import { revalidatePath } from "next/cache"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  createTaxRateForManagement,
  getTaxRateManagementDataForOrg,
  removeTaxRateForManagement,
  updateTaxRateForManagement,
} from "@/services/tax-rate/tax-rate.service"
import {
  createManagedTaxRate,
  deleteManagedTaxRate,
  getTaxRateManagementData,
  updateManagedTaxRate,
} from "@/actions/taxRate/tax-rate-management-actions"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
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

jest.mock("@/services/tax-rate/tax-rate.service", () => ({
  createTaxRateForManagement: jest.fn(),
  getTaxRateManagementDataForOrg: jest.fn(),
  removeTaxRateForManagement: jest.fn(),
  updateTaxRateForManagement: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetTaxRateManagementDataForOrg = getTaxRateManagementDataForOrg as jest.Mock
const mockCreateTaxRateForManagement = createTaxRateForManagement as jest.Mock
const mockUpdateTaxRateForManagement = updateTaxRateForManagement as jest.Mock
const mockRemoveTaxRateForManagement = removeTaxRateForManagement as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

const validInput = {
  nameEn: "VAT",
  nameFr: "TVA",
  rate: 19.25,
  isActive: true,
}

function rbacContext(permissions: string[] = ["taxes.read", "taxes.create", "taxes.update", "taxes.delete"]) {
  return {
    orgId: "org-1",
    userId: "user-1",
    permissions,
  }
}

function expectSettingsObserve(accessIntent: "read" | "write") {
  expect(mockObserveModuleAccess).toHaveBeenCalledWith({
    organizationId: "org-1",
    userId: "user-1",
    actorPermissions: ["taxes.read", "taxes.create", "taxes.update", "taxes.delete"],
    moduleSlug: "settings",
    surfaceType: "action",
    surface: "actions/taxRate/tax-rate-management-actions.ts",
    accessIntent,
    mode: "observe",
  })
}

describe("tax-rate management actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext())
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockGetTaxRateManagementDataForOrg.mockResolvedValue({ taxRates: [{ id: "tax-1" }] })
    mockCreateTaxRateForManagement.mockResolvedValue({ id: "tax-1" })
    mockUpdateTaxRateForManagement.mockResolvedValue({ id: "tax-1" })
    mockRemoveTaxRateForManagement.mockResolvedValue({ id: "tax-1", deactivated: false })
  })

  it("observes settings module after an authorized management read succeeds", async () => {
    const result = await getTaxRateManagementData("org-1")

    expect(result).toEqual({ success: true, data: { taxRates: [{ id: "tax-1" }] } })
    expect(mockRequirePermission).toHaveBeenCalledWith("taxes.read", { resource: "TaxRate" })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(rbacContext(), "org-1")
    expect(mockGetTaxRateManagementDataForOrg).toHaveBeenCalledWith("org-1")
    expectSettingsObserve("read")
  })

  it("observes settings module after create, update, and delete mutations succeed", async () => {
    await expect(createManagedTaxRate("org-1", validInput)).resolves.toMatchObject({ success: true })
    await expect(updateManagedTaxRate("org-1", "tax-1", validInput)).resolves.toMatchObject({ success: true })
    await expect(deleteManagedTaxRate("org-1", "tax-1")).resolves.toMatchObject({ success: true })

    expect(mockRequirePermission).toHaveBeenCalledWith("taxes.create", {
      resource: "TaxRate",
      auditAllowed: true,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("taxes.update", {
      resource: "TaxRate",
      resourceId: "tax-1",
      auditAllowed: true,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("taxes.delete", {
      resource: "TaxRate",
      resourceId: "tax-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledTimes(3)
    expectSettingsObserve("write")
    expect(mockRevalidatePath).toHaveBeenCalled()
  })

  it("fails closed before service access and module observe when RBAC denies access", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden: missing permission taxes.read"))

    const result = await getTaxRateManagementData("org-1")

    expect(result).toMatchObject({
      success: false,
      error: "Failed to fetch tax rate management data",
    })
    expect(mockGetTaxRateManagementDataForOrg).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })

  it("does not observe module access when create validation fails after authorization", async () => {
    const result = await createManagedTaxRate("org-1", {
      nameEn: "",
      nameFr: "",
      rate: -1,
      isActive: true,
    })

    expect(result.success).toBe(false)
    expect(mockCreateTaxRateForManagement).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })

  it("does not observe module access or revalidate when a mutation service fails", async () => {
    mockUpdateTaxRateForManagement.mockRejectedValueOnce(new Error("Database unavailable"))

    const result = await updateManagedTaxRate("org-1", "tax-1", validInput)

    expect(result).toMatchObject({
      success: false,
      error: "Failed to update tax rate",
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})