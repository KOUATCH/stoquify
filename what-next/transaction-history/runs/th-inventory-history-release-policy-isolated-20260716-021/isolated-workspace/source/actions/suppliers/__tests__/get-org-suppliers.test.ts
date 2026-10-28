import getOrgSuppliers from "@/actions/suppliers/getOrgSuppliers"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { listSuppliersForPicker } from "@/services/supplier/supplier.service"

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/supplier/supplier.service", () => ({
  listSuppliersForPicker: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockListSuppliersForPicker = listSuppliersForPicker as jest.Mock

function rbacContext(permissions: string[] = ["purchases.suppliers.read"]) {
  return {
    userId: "user-1",
    orgId: "org-1",
    permissions,
  }
}

describe("getOrgSuppliers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext())
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockListSuppliersForPicker.mockResolvedValue({ data: [{ id: "supplier-1" }], total: 1 })
  })

  it("requires supplier read permission, observes purchasing, and reads the scoped organization", async () => {
    const input = { page: 2, pageSize: 10, search: "steel" }

    const result = await getOrgSuppliers(input)

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.suppliers.read", { resource: "Supplier" })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["purchases.suppliers.read"],
      moduleSlug: "purchasing",
      surfaceType: "action",
      surface: "actions/suppliers/getOrgSuppliers.ts",
      accessIntent: "read",
      mode: "observe",
    })
    expect(mockListSuppliersForPicker).toHaveBeenCalledWith("org-1", input)
  })

  it("fails closed before module observation or supplier lookup when RBAC denies access", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden: missing permission purchases.suppliers.read"))

    const result = await getOrgSuppliers()

    expect(result.success).toBe(false)
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListSuppliersForPicker).not.toHaveBeenCalled()
  })
})
