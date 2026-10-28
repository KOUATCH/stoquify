import { Prisma } from "@prisma/client"
import {
  archiveItem,
  listItemsWithRelations,
  updateItemBasicInfoWithRelations,
  updateItemStockPolicy,
} from "../item.service"
import { db } from "@/prisma/db"

jest.mock("@/prisma/db", () => ({
  db: {
    item: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const mockedDb = db as unknown as {
  item: {
    count: jest.Mock
    findMany: jest.Mock
    findFirst: jest.Mock
    update: jest.Mock
  }
}

describe("item service stock policy", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("updates min and max stock policy through the service boundary", async () => {
    mockedDb.item.findFirst.mockResolvedValue({ id: "item-1" })
    mockedDb.item.update.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      minStockLevel: new Prisma.Decimal(5),
      maxStockLevel: new Prisma.Decimal(25),
      inventoryLevels: [],
    })

    const result = await updateItemStockPolicy("org-1", "item-1", {
      minStockLevel: 5,
      maxStockLevel: 25,
    })

    expect(mockedDb.item.findFirst).toHaveBeenCalledWith({
      where: { id: "item-1", organizationId: "org-1", deletedAt: null },
      select: { id: true },
    })
    expect(mockedDb.item.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: {
        minStockLevel: expect.any(Prisma.Decimal),
        maxStockLevel: expect.any(Prisma.Decimal),
      },
      include: { inventoryLevels: true },
    })
    expect(result.id).toBe("item-1")
  })

  it("rejects stock policy updates for items outside the tenant scope", async () => {
    mockedDb.item.findFirst.mockResolvedValue(null)

    await expect(
      updateItemStockPolicy("org-1", "item-2", {
        minStockLevel: 5,
      }),
    ).rejects.toThrow("Item not found")

    expect(mockedDb.item.update).not.toHaveBeenCalled()
  })

  it("lists items with relations through the service boundary", async () => {
    mockedDb.item.count.mockResolvedValue(1)
    mockedDb.item.findMany.mockResolvedValue([{ id: "item-1", nameEn: "Flour" }])

    const result = await listItemsWithRelations({
      organizationId: "org-1",
      q: "flo",
      page: 1,
      pageSize: 20,
      sortBy: "nameEn",
      sortOrder: "asc",
    })

    expect(mockedDb.item.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org-1",
        deletedAt: null,
        OR: expect.any(Array),
      }),
    })
    expect(mockedDb.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", deletedAt: null }),
        orderBy: { nameEn: "asc" },
        skip: 0,
        take: 20,
      }),
    )
    expect(result).toMatchObject({ total: 1, page: 1, pageSize: 20, totalPages: 1 })
  })

  it("updates item basic info only after tenant-scoped lookup", async () => {
    mockedDb.item.findFirst.mockResolvedValue({ id: "item-1" })
    mockedDb.item.update.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      nameEn: "Updated flour",
    })

    const result = await updateItemBasicInfoWithRelations("org-1", "item-1", {
      id: "item-1",
      organizationId: "client-org",
      nameEn: "Updated flour",
      imageUrls: "https://example.com/item.png",
    })

    expect(mockedDb.item.findFirst).toHaveBeenCalledWith({
      where: { id: "item-1", organizationId: "org-1", deletedAt: null },
      select: { id: true },
    })
    expect(mockedDb.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({
          nameEn: "Updated flour",
          imageUrls: ["https://example.com/item.png"],
        }),
      }),
    )
    expect(result.id).toBe("item-1")
  })

  it("archives items with evidence-bearing records instead of hard deleting", async () => {
    mockedDb.item.findFirst.mockResolvedValue({
      id: "item-1",
      _count: {
        inventoryTransactions: 1,
        adjustmentLines: 0,
        transferLines: 0,
        goodsReceiptLines: 0,
        supplierInvoiceLines: 0,
        stockCountLines: 0,
        dailySalesReportItems: 0,
      },
    })
    mockedDb.item.update.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      isActive: false,
      isDiscontinued: true,
    })

    const result = await archiveItem("org-1", "item-1")

    expect(mockedDb.item.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1", organizationId: "org-1", deletedAt: null },
      }),
    )
    expect(mockedDb.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          isActive: false,
          isDiscontinued: true,
        }),
      }),
    )
    expect(result.id).toBe("item-1")
  })
})
