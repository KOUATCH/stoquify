import { revalidateItem } from "@/lib/item/revalidation"
import { requirePermission } from "@/lib/security/rbac"
import { createItemFromForm } from "@/services/item/item.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { createItemAction } from "../items"

jest.mock("@/lib/item/revalidation", () => ({
  revalidateItem: jest.fn(),
}))
jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))
jest.mock("@/services/item/item.service", () => ({
  createItemFromForm: jest.fn(),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockCreateItemFromForm = createItemFromForm as jest.Mock
const mockRevalidateItem = revalidateItem as jest.Mock

describe("createItemAction inventory module observation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["inventory.items.create"],
    })
    mockObserveModuleAccess.mockResolvedValue({
      allowed: true,
      decision: "allow",
    })
    mockCreateItemFromForm.mockResolvedValue({ id: "item-1", organizationId: "org-1" })
  })

  it("observes inventory access before creating without enabling a hard deny", async () => {
    const result = await createItemAction({
      organizationId: "org-1",
      nameEn: "Rice",
      sku: "RICE-001",
      imageUrls: "/placeholder.png",
      costPrice: 10,
      sellingPrice: 15,
      minStockLevel: 0,
    })

    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["inventory.items.create"],
      moduleSlug: "inventory",
      surfaceType: "action",
      surface: "actions/item/items.ts#createItemAction",
      accessIntent: "write",
      mode: "observe",
    })
    expect(mockObserveModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockCreateItemFromForm.mock.invocationCallOrder[0],
    )
    expect(mockCreateItemFromForm).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      expect.objectContaining({ organizationId: "org-1", sku: "RICE-001" }),
    )
    expect(mockRevalidateItem).toHaveBeenCalledWith("item-1", "org-1")
    expect(result.success).toBe(true)
  })
})
