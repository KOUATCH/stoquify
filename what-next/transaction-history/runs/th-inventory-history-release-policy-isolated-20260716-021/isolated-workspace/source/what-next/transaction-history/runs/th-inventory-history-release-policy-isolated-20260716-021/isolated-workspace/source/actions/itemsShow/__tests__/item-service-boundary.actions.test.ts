import { revalidatePath } from "next/cache"

import { requirePermission } from "@/lib/security/rbac"
import {
  archiveItem,
  listItemsWithInventoryLevels,
  updateItemBasicInfoWithRelations,
} from "@/services/item/item.service"

import { deleteItem } from "../deleteItem"
import { getOrgItemsWithInventoryLevels } from "../getOrgItemsWithInventoryLevels"
import { updateItemBasicInfoById } from "../updateItemBasicInfoById"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/lib/error-handling", () => ({
  inventoryAction: jest.fn((handler) => handler),
}))

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/item/item.service", () => ({
  archiveItem: jest.fn(),
  listItemsWithInventoryLevels: jest.fn(),
  updateItemBasicInfoWithRelations: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockArchiveItem = archiveItem as jest.Mock
const mockListItemsWithInventoryLevels = listItemsWithInventoryLevels as jest.Mock
const mockUpdateItemBasicInfoWithRelations = updateItemBasicInfoWithRelations as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

describe("itemsShow service-boundary actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ userId: "user-1", orgId: "org-1" })
  })

  it("derives tenant scope for item inventory reads", async () => {
    mockListItemsWithInventoryLevels.mockResolvedValue([{ id: "item-1", organizationId: "org-1" }])

    const result = await getOrgItemsWithInventoryLevels("client-org")

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.items.read", {
      resource: "Item",
      auditAllowed: false,
    })
    expect(mockListItemsWithInventoryLevels).toHaveBeenCalledWith("org-1")
  })

  it("delegates basic item updates to the item service with trusted org scope", async () => {
    mockUpdateItemBasicInfoWithRelations.mockResolvedValue({ id: "item-1", organizationId: "org-1" })

    const result = await updateItemBasicInfoById({
      id: "item-1",
      data: {
        id: "item-1",
        organizationId: "client-org",
        nameEn: "Updated flour",
      },
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.items.update", {
      resource: "Item",
      resourceId: "item-1",
      auditAllowed: true,
    })
    expect(mockUpdateItemBasicInfoWithRelations).toHaveBeenCalledWith(
      "org-1",
      "item-1",
      expect.objectContaining({
        organizationId: "client-org",
        nameEn: "Updated flour",
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/inventory/items")
  })

  it("archives item deletes through the item service instead of hard deleting in the action", async () => {
    mockArchiveItem.mockResolvedValue({ id: "item-1", organizationId: "org-1", deletedAt: new Date() })

    const result = await deleteItem("item-1")

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.items.delete", {
      resource: "Item",
      resourceId: "item-1",
      auditAllowed: true,
    })
    expect(mockArchiveItem).toHaveBeenCalledWith("org-1", "item-1")
  })
})
