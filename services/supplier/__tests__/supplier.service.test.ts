import { db } from "@/prisma/db"
import {
  addItemSuppliersToItemForOrganization,
  createItemSupplierForOrganization,
  getItemSuppliersForItemInOrganization,
  removeItemSupplierForOrganization,
} from "../supplier.service"

jest.mock("@/prisma/db", () => ({
  db: {
    item: {
      findFirst: jest.fn(),
    },
    supplier: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    itemSupplier: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockDb = db as unknown as {
  item: {
    findFirst: jest.Mock
  }
  supplier: {
    findFirst: jest.Mock
    findMany: jest.Mock
  }
  itemSupplier: {
    findFirst: jest.Mock
    findMany: jest.Mock
    create: jest.Mock
    createMany: jest.Mock
    delete: jest.Mock
  }
}

const now = new Date("2026-06-22T10:00:00.000Z")

function itemSupplierRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item-supplier-1",
    itemId: "item-1",
    supplierId: "supplier-1",
    supplierSku: "SUP-SKU",
    supplierName: "Supplier Item",
    isPreferred: false,
    leadTimeDays: 3,
    minOrderQuantity: 12,
    unitCost: 42,
    lastPurchaseDate: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    item: {
      id: "item-1",
      nameEn: "Item",
      nameFr: null,
      sku: "ITEM-1",
    },
    supplier: {
      id: "supplier-1",
      name: "Supplier",
      code: "SUP-1",
      email: "supplier@example.com",
      phone: null,
    },
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("supplier.service item-supplier service boundary", () => {
  it("removes item-supplier configuration links only through tenant-scoped service lookup", async () => {
    const deleted = itemSupplierRow()
    mockDb.itemSupplier.findFirst.mockResolvedValue({ id: "item-supplier-1" })
    mockDb.itemSupplier.delete.mockResolvedValue(deleted)

    const result = await removeItemSupplierForOrganization("org-1", "item-supplier-1")

    expect(result).toEqual(
      expect.objectContaining({
        id: "item-supplier-1",
        itemId: "item-1",
        supplierId: "supplier-1",
        unitCost: 42,
      }),
    )
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
    expect(mockDb.itemSupplier.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-supplier-1" },
      }),
    )
  })

  it("rejects missing or wrong-tenant item-supplier links before delete", async () => {
    mockDb.itemSupplier.findFirst.mockResolvedValue(null)

    await expect(
      removeItemSupplierForOrganization("org-1", "item-supplier-1"),
    ).rejects.toThrow("Item supplier not found")

    expect(mockDb.itemSupplier.delete).not.toHaveBeenCalled()
  })

  it("rejects cross-tenant item-supplier creation before write", async () => {
    mockDb.item.findFirst.mockResolvedValue({ id: "item-1" })
    mockDb.supplier.findFirst.mockResolvedValue(null)

    await expect(
      createItemSupplierForOrganization("org-1", {
        itemId: "item-1",
        supplierId: "supplier-from-org-2",
      }),
    ).rejects.toThrow("Item or supplier not found for this organization")

    expect(mockDb.itemSupplier.create).not.toHaveBeenCalled()
  })

  it("rejects bulk legacy supplier links when any supplier is outside the trusted tenant", async () => {
    mockDb.item.findFirst.mockResolvedValue({ id: "item-1" })
    mockDb.supplier.findMany.mockResolvedValue([{ id: "supplier-1" }])

    await expect(
      addItemSuppliersToItemForOrganization("org-1", "item-1", [
        "supplier-1",
        "supplier-from-org-2",
      ]),
    ).rejects.toThrow("One or more suppliers were not found for this organization")

    expect(mockDb.itemSupplier.createMany).not.toHaveBeenCalled()
  })

  it("rejects cross-tenant item-supplier reads before relation lookup", async () => {
    mockDb.item.findFirst.mockResolvedValue(null)

    await expect(
      getItemSuppliersForItemInOrganization("org-1", "item-from-org-2"),
    ).rejects.toThrow("Item not found")

    expect(mockDb.itemSupplier.findMany).not.toHaveBeenCalled()
  })
})
