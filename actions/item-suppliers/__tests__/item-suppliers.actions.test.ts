import addItemSuppliers from "../addItemSuppliers"
import getItemWithSuppliersById from "../getItemWithSuppliers"
import {
  addItemSuppliersToItemForOrganization,
  getItemWithSuppliersForOrganization,
} from "@/services/supplier/supplier.service"
import { requireAllPermissions } from "@/lib/security/rbac"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeLoggedActionErrorMessage: jest.fn(
    (_message: string, _error: unknown, _options: unknown, userMessage?: string) => userMessage,
  ),
}))

jest.mock("@/lib/security/rbac", () => ({
  isRbacError: jest.fn((error: unknown) => (error as { name?: string } | null)?.name === "RbacError"),
  requireAllPermissions: jest.fn(),
}))

jest.mock("@/services/supplier/supplier.service", () => ({
  addItemSuppliersToItemForOrganization: jest.fn(),
  getItemWithSuppliersForOrganization: jest.fn(),
}))

const mockRequireAllPermissions = requireAllPermissions as jest.Mock
const mockAddItemSuppliersToItemForOrganization = addItemSuppliersToItemForOrganization as jest.Mock
const mockGetItemWithSuppliersForOrganization = getItemWithSuppliersForOrganization as jest.Mock

function rbacError(message: string) {
  const error = new Error(message)
  error.name = "RbacError"
  return error
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("legacy item-supplier actions authorization boundary", () => {
  it("denies legacy bulk supplier writes before service-owned createMany", async () => {
    mockRequireAllPermissions.mockRejectedValue(
      rbacError("Forbidden: missing required permissions inventory.items.update, purchases.suppliers.create"),
    )

    const result = await addItemSuppliers("item-1", ["supplier-1"])

    expect(result).toEqual({
      success: false,
      error: "Forbidden: missing required permissions inventory.items.update, purchases.suppliers.create",
    })
    expect(mockAddItemSuppliersToItemForOrganization).not.toHaveBeenCalled()
  })

  it("uses the trusted RBAC organization for legacy item supplier reads", async () => {
    mockRequireAllPermissions.mockResolvedValue({ orgId: "org-1" })
    mockGetItemWithSuppliersForOrganization.mockResolvedValue([])

    const result = await getItemWithSuppliersById("item-1")

    expect(result).toEqual({ success: true, data: [], error: null })
    expect(mockGetItemWithSuppliersForOrganization).toHaveBeenCalledWith("org-1", "item-1")
  })
})
