import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { updateItemFromForm } from "../item.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

const tx = {
  item: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  category: { findFirstOrThrow: jest.fn() },
  brand: { findFirstOrThrow: jest.fn() },
  unit: { findFirstOrThrow: jest.fn() },
  taxRate: { findFirstOrThrow: jest.fn() },
  inventoryTransaction: { count: jest.fn() },
  serialNumber: { count: jest.fn() },
}

const mockedDb = db as unknown as {
  $transaction: jest.Mock
}

const openedAt = new Date("2026-08-05T10:00:00.000Z")

const existingItem = {
  id: "item-1",
  organizationId: "org-1",
  nameEn: "Rice",
  nameFr: null,
  descriptionEn: null,
  descriptionFr: null,
  imageUrls: ["/uploads/org-1/rice.png", "/uploads/org-1/rice-detail.png"],
  thumbnail: "/uploads/org-1/rice.png",
  slug: "rice",
  sku: "RICE-001",
  barcode: null,
  dimensions: null,
  color: null,
  size: null,
  weight: null,
  upc: null,
  ean: null,
  mpn: null,
  isbn: null,
  costPrice: new Prisma.Decimal(20),
  sellingPrice: new Prisma.Decimal(30),
  msrp: null,
  categoryId: null,
  brandId: null,
  unitId: null,
  taxRateId: null,
  trackInventory: true,
  minStockLevel: new Prisma.Decimal(5),
  maxStockLevel: new Prisma.Decimal(50),
  reorderLevel: new Prisma.Decimal(10),
  reorderQuantity: new Prisma.Decimal(20),
  isActive: true,
  isDiscontinued: false,
  trackSerialNumbers: false,
  trackBatches: false,
  trackExpiry: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: openedAt,
  deletedAt: null,
}

const validInput = {
  id: "item-1",
  updatedAt: openedAt.toISOString(),
  nameEn: "Premium rice",
  nameFr: null,
  descriptionEn: "Long grain",
  descriptionFr: null,
  imageUrls: "/uploads/org-1/rice-new.png",
  retainedImageUrls: ["/uploads/org-1/rice-detail.png"],
  thumbnail: "/uploads/org-1/rice-new.png",
  sku: "RICE-001",
  barcode: null,
  dimensions: "30 x 20 x 10 cm",
  weight: 5,
  costPrice: 21,
  sellingPrice: 32,
  msrp: 35,
  categoryId: null,
  brandId: null,
  unitId: null,
  taxRateId: null,
  trackInventory: true,
  minStockLevel: 5,
  maxStockLevel: 60,
  reorderLevel: 12,
  reorderQuantity: 24,
  isActive: true,
  isDiscontinued: false,
  trackSerialNumbers: false,
  trackBatches: false,
  trackExpiry: false,
}

describe("updateItemFromForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDb.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    )
    tx.item.findFirst
      .mockResolvedValueOnce(existingItem)
      .mockResolvedValueOnce(null)
    tx.item.update.mockResolvedValue({
      ...existingItem,
      ...validInput,
      imageUrls: [validInput.imageUrls],
      thumbnail: validInput.imageUrls,
      weight: new Prisma.Decimal(validInput.weight),
      costPrice: new Prisma.Decimal(validInput.costPrice),
      sellingPrice: new Prisma.Decimal(validInput.sellingPrice),
      msrp: new Prisma.Decimal(validInput.msrp),
      minStockLevel: new Prisma.Decimal(validInput.minStockLevel),
      maxStockLevel: new Prisma.Decimal(validInput.maxStockLevel),
      reorderLevel: new Prisma.Decimal(validInput.reorderLevel),
      reorderQuantity: new Prisma.Decimal(validInput.reorderQuantity),
      updatedAt: new Date("2026-08-05T10:05:00.000Z"),
    })
  })

  it("performs one tenant-scoped atomic item-master update without moving stock", async () => {
    const result = await updateItemFromForm("org-1", "item-1", validInput)

    expect(mockedDb.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.item.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: "item-1", organizationId: "org-1", deletedAt: null },
    })
    expect(tx.item.update).toHaveBeenCalledTimes(1)
    expect(tx.item.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: expect.objectContaining({
        nameEn: "Premium rice",
        imageUrls: ["/uploads/org-1/rice-new.png", "/uploads/org-1/rice-detail.png"],
        msrp: expect.any(Prisma.Decimal),
        reorderQuantity: expect.any(Prisma.Decimal),
      }),
    })
    const updateData = tx.item.update.mock.calls[0][0].data
    for (const field of ["upc", "ean", "mpn", "isbn", "color", "size"]) {
      expect(updateData).not.toHaveProperty(field)
    }
    expect(tx.inventoryTransaction.count).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      id: "item-1",
      organizationId: "org-1",
      nameEn: "Premium rice",
      updatedAt: "2026-08-05T10:05:00.000Z",
    })
  })

  it("rejects a stale edit before updating", async () => {
    await expect(
      updateItemFromForm("org-1", "item-1", {
        ...validInput,
        updatedAt: "2026-08-05T09:00:00.000Z",
      }),
    ).rejects.toThrow("changed after you opened")

    expect(tx.item.update).not.toHaveBeenCalled()
  })

  it("rejects a duplicate tenant-scoped SKU", async () => {
    tx.item.findFirst
      .mockReset()
      .mockResolvedValueOnce(existingItem)
      .mockResolvedValueOnce({ id: "item-2" })

    await expect(updateItemFromForm("org-1", "item-1", validInput)).rejects.toThrow(
      "already uses this SKU",
    )
    expect(tx.item.update).not.toHaveBeenCalled()
  })

  it("validates selected relations inside the organization", async () => {
    tx.category.findFirstOrThrow.mockResolvedValue({ id: "category-1" })

    await updateItemFromForm("org-1", "item-1", {
      ...validInput,
      categoryId: "category-1",
    })

    expect(tx.category.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: "category-1", organizationId: "org-1", deletedAt: null },
      select: { id: true },
    })
  })

  it("rejects tracking-policy changes when inventory evidence exists", async () => {
    tx.inventoryTransaction.count.mockResolvedValue(1)
    tx.serialNumber.count.mockResolvedValue(0)

    await expect(
      updateItemFromForm("org-1", "item-1", {
        ...validInput,
        trackBatches: true,
      }),
    ).rejects.toThrow("Tracking policy cannot change")

    expect(tx.item.update).not.toHaveBeenCalled()
  })
})
