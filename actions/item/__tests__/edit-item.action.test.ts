import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { revalidateItem } from "@/lib/item/revalidation"
import { requirePermission } from "@/lib/security/rbac"
import { updateItemFromForm } from "@/services/item/item.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { updateItemFromFormAction } from "../items"

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeLoggedActionErrorMessage: jest.fn(
    (_message: string, _error: unknown, _options: unknown, fallback: string) => fallback,
  ),
}))
jest.mock("@/lib/item/revalidation", () => ({
  revalidateItem: jest.fn(),
}))
jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))
jest.mock("@/services/item/item.service", () => ({
  updateItemFromForm: jest.fn(),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockUpdateItemFromForm = updateItemFromForm as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockRevalidateItem = revalidateItem as jest.Mock
const mockSafeError = safeLoggedActionErrorMessage as jest.Mock

const input = {
  id: "item-1",
  updatedAt: "2026-08-05T10:00:00.000Z",
  nameEn: "Premium rice",
  nameFr: null,
  descriptionEn: null,
  descriptionFr: null,
  imageUrls: "/uploads/org-1/rice.png",
  retainedImageUrls: [],
  thumbnail: "/uploads/org-1/rice.png",
  sku: "RICE-001",
  barcode: null,
  dimensions: null,
  weight: null,
  costPrice: 20,
  sellingPrice: 30,
  msrp: null,
  categoryId: null,
  brandId: null,
  unitId: null,
  taxRateId: null,
  trackInventory: true,
  minStockLevel: 5,
  maxStockLevel: 50,
  reorderLevel: 10,
  reorderQuantity: 20,
  isActive: true,
  isDiscontinued: false,
  trackSerialNumbers: false,
  trackBatches: false,
  trackExpiry: false,
}

describe("updateItemFromFormAction", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["inventory.items.update"],
    })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockUpdateItemFromForm.mockResolvedValue({
      ...input,
      organizationId: "org-1",
      updatedAt: "2026-08-05T10:05:00.000Z",
    })
  })

  it("derives tenant context, enforces entitlement, and revalidates one update", async () => {
    const result = await updateItemFromFormAction({
      ...input,
      organizationId: "attacker-org",
    })

    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.items.update", {
      resource: "Item",
      resourceId: "item-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["inventory.items.update"],
      moduleSlug: "inventory",
      surfaceType: "action",
      surface: "actions/item/items.ts#updateItemFromFormAction",
      accessIntent: "write",
      mode: "enforce",
    })
    expect(mockUpdateItemFromForm).toHaveBeenCalledWith(
      "org-1",
      "item-1",
      expect.not.objectContaining({ organizationId: expect.anything() }),
    )
    expect(mockRevalidateItem).toHaveBeenCalledWith("item-1", "org-1")
    expect(result).toMatchObject({ success: true, message: "Item updated successfully" })
  })

  it("does not invoke the service when server validation fails", async () => {
    const result = await updateItemFromFormAction({ ...input, nameEn: "" })

    expect(result.success).toBe(false)
    expect(mockUpdateItemFromForm).not.toHaveBeenCalled()
  })

  it("does not invoke the service when authorization fails", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))

    const result = await updateItemFromFormAction(input)

    expect(result.success).toBe(false)
    expect(mockUpdateItemFromForm).not.toHaveBeenCalled()
  })

  it("does not invoke the service when module entitlement is denied", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })

    const result = await updateItemFromFormAction(input)

    expect(result.success).toBe(false)
    expect(mockUpdateItemFromForm).not.toHaveBeenCalled()
  })

  it("returns a safe recoverable error when persistence fails", async () => {
    mockUpdateItemFromForm.mockRejectedValue(new Error("database credentials leaked"))

    const result = await updateItemFromFormAction(input)

    expect(result).toEqual({
      success: false,
      error: "Failed to save the item. Your changes are still available; review them and try again.",
    })
    expect(mockSafeError).toHaveBeenCalledWith(
      "Edit item action failed",
      expect.any(Error),
      { action: "updateItemFromFormAction" },
      expect.stringContaining("Your changes are still available"),
    )
  })
})