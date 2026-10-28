import { createItemSupplier, getAllOrgItemSuppliers, getItemSuppliers } from "../itemSupplierActions"
import {
  createItemSupplierForOrganization,
  getAllItemSuppliersForOrganization,
  listItemSuppliersForOrganization,
} from "@/services/supplier/supplier.service"
import { assertCanUseOrganization, requireAllPermissions } from "@/lib/security/rbac"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeLoggedActionErrorMessage: jest.fn(
    (_message: string, _error: unknown, _options: unknown, userMessage?: string) => userMessage,
  ),
}))

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  isRbacError: jest.fn((error: unknown) => (error as { name?: string } | null)?.name === "RbacError"),
  requireAllPermissions: jest.fn(),
}))

jest.mock("@/services/supplier/supplier.service", () => ({
  createItemSupplierForOrganization: jest.fn(),
  getAllItemSuppliersForOrganization: jest.fn(),
  listItemSuppliersForOrganization: jest.fn(),
}))

const mockRequireAllPermissions = requireAllPermissions as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockCreateItemSupplierForOrganization = createItemSupplierForOrganization as jest.Mock
const mockGetAllItemSuppliersForOrganization = getAllItemSuppliersForOrganization as jest.Mock
const mockListItemSuppliersForOrganization = listItemSuppliersForOrganization as jest.Mock

function rbacError(message: string) {
  const error = new Error(message)
  error.name = "RbacError"
  return error
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAssertCanUseOrganization.mockResolvedValue(true)
})

describe("itemSupplierActions authorization boundary", () => {
  it("denies item-supplier creation before service writes when canonical RBAC is missing", async () => {
    mockRequireAllPermissions.mockRejectedValue(
      rbacError("Forbidden: missing required permissions inventory.items.update, purchases.suppliers.create"),
    )

    const result = await createItemSupplier({
      itemId: "item-1",
      supplierId: "supplier-1",
    })

    expect(result).toEqual({
      success: false,
      error: "Forbidden: missing required permissions inventory.items.update, purchases.suppliers.create",
    })
    expect(mockRequireAllPermissions).toHaveBeenCalledWith(
      ["inventory.items.update", "purchases.suppliers.create"],
      expect.objectContaining({
        resource: "item-suppliers",
        resourceId: "item-1",
      }),
    )
    expect(mockCreateItemSupplierForOrganization).not.toHaveBeenCalled()
  })

  it("denies explicit cross-tenant organization reads before service lookup", async () => {
    mockRequireAllPermissions.mockResolvedValue({ orgId: "org-1" })
    mockAssertCanUseOrganization.mockRejectedValue(
      rbacError("Forbidden: cannot access another organization"),
    )

    const result = await getAllOrgItemSuppliers("org-2")

    expect(result).toEqual({
      success: false,
      error: "Forbidden: cannot access another organization",
      data: [],
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1" }),
      "org-2",
    )
    expect(mockGetAllItemSuppliersForOrganization).not.toHaveBeenCalled()
  })

  it("uses the trusted RBAC organization for item-supplier reads", async () => {
    mockRequireAllPermissions.mockResolvedValue({ orgId: "org-1" })
    mockListItemSuppliersForOrganization.mockResolvedValue([])

    const result = await getItemSuppliers("org-1")

    expect(result).toEqual({ success: true, data: [], error: null })
    expect(mockListItemSuppliersForOrganization).toHaveBeenCalledWith("org-1")
  })
})
