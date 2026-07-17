import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requestManualItemStockAdjustment } from "@/services/inventory/inventory-adjustment.service"
import { updateItemStockPolicy } from "@/services/item/item.service"
import { updateItemStockById } from "../updateItemStockById"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/lib/error-handling", () => ({
  inventoryAction: jest.fn((handler) => handler),
}))

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/inventory/inventory-adjustment.service", () => ({
  requestManualItemStockAdjustment: jest.fn(),
}))

jest.mock("@/services/item/item.service", () => ({
  updateItemStockPolicy: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequestManualItemStockAdjustment = requestManualItemStockAdjustment as jest.Mock
const mockUpdateItemStockPolicy = updateItemStockPolicy as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

describe("updateItemStockById", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ userId: "user-1", orgId: "org-1" })
  })

  it("delegates stock policy updates to the item service", async () => {
    mockUpdateItemStockPolicy.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      minStockLevel: 5,
      maxStockLevel: 25,
      inventoryLevels: [],
    })

    const result = await updateItemStockById({
      id: "item-1",
      data: {
        id: "item-1",
        organizationId: "client-org",
        minStockLevel: 5,
        maxStockLevel: 25,
      },
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.items.update", {
      resource: "Item",
      resourceId: "item-1",
      auditAllowed: true,
    })
    expect(mockUpdateItemStockPolicy).toHaveBeenCalledWith("org-1", "item-1", {
      minStockLevel: 5,
      maxStockLevel: 25,
    })
    expect(mockRequestManualItemStockAdjustment).not.toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/inventory/items")
  })

  it("keeps quantity changes on the inventory adjustment workflow", async () => {
    mockRequestManualItemStockAdjustment.mockResolvedValue({
      item: { id: "item-1", organizationId: "org-1" },
      adjustment: { id: "adjustment-1" },
      requiresApproval: true,
      quantityDelta: 4,
      targetQuantity: 14,
    })

    const result = await updateItemStockById({
      id: "item-1",
      data: {
        quantityChange: 4,
        reason: "Cycle count correction",
        notes: "Counted by supervisor",
      },
    })

    expect(result.success).toBe(true)
    expect(mockRequestManualItemStockAdjustment).toHaveBeenCalledWith({
      organizationId: "org-1",
      itemId: "item-1",
      actorId: "user-1",
      quantityChange: 4,
      mode: "delta",
      reason: "Cycle count correction",
      notes: "Counted by supervisor",
    })
    expect(mockUpdateItemStockPolicy).not.toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/inventory/items")
  })
})
