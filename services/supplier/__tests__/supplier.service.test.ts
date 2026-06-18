import { db } from "@/prisma/db"
import { removeItemSupplierForOrganization } from "../supplier.service"

jest.mock("@/prisma/db", () => ({
  db: {
    itemSupplier: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockDb = db as unknown as {
  itemSupplier: {
    findFirst: jest.Mock
    delete: jest.Mock
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("supplier.service item-supplier immutability", () => {
  it("removes item-supplier configuration links only through tenant-scoped service lookup", async () => {
    const deleted = { id: "item-supplier-1", itemId: "item-1", supplierId: "supplier-1" }
    mockDb.itemSupplier.findFirst.mockResolvedValue({ id: "item-supplier-1" })
    mockDb.itemSupplier.delete.mockResolvedValue(deleted)

    const result = await removeItemSupplierForOrganization("org-1", "item-supplier-1")

    expect(result).toEqual(deleted)
    expect(mockDb.itemSupplier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "item-supplier-1",
          item: expect.objectContaining({
            organizationId: "org-1",
            deletedAt: null,
          }),
          supplier: expect.objectContaining({
            organizationId: "org-1",
            deletedAt: null,
          }),
        }),
      }),
    )
    expect(mockDb.itemSupplier.delete).toHaveBeenCalledWith({
      where: { id: "item-supplier-1" },
    })
  })

  it("rejects missing or wrong-tenant item-supplier links before delete", async () => {
    mockDb.itemSupplier.findFirst.mockResolvedValue(null)

    await expect(
      removeItemSupplierForOrganization("org-1", "item-supplier-1"),
    ).rejects.toThrow("Item supplier not found")

    expect(mockDb.itemSupplier.delete).not.toHaveBeenCalled()
  })
})
