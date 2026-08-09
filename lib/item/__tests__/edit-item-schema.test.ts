import { updateItemFromFormSchema } from "../schemas"

const validInput = {
  id: "item-1",
  updatedAt: "2026-08-05T10:00:00.000Z",
  nameEn: "Premium rice",
  nameFr: "Riz premium",
  descriptionEn: "Long grain rice",
  descriptionFr: "",
  imageUrls: "/uploads/org-1/rice.png",
  retainedImageUrls: ["/uploads/org-1/rice-detail.png"],
  thumbnail: "/uploads/org-1/rice.png",
  sku: "RICE-001",
  barcode: "123456789",
  dimensions: "30 x 20 x 10 cm",
  weight: 5,
  costPrice: 20,
  sellingPrice: 30,
  msrp: 35,
  categoryId: "category-1",
  brandId: "brand-1",
  unitId: "unit-1",
  taxRateId: "tax-1",
  trackInventory: true,
  minStockLevel: 5,
  maxStockLevel: 50,
  reorderLevel: 10,
  reorderQuantity: 20,
  isActive: true,
  isDiscontinued: false,
  trackSerialNumbers: false,
  trackBatches: true,
  trackExpiry: true,
}

describe("updateItemFromFormSchema", () => {
  it("accepts the complete typed item-master contract", () => {
    expect(updateItemFromFormSchema.parse(validInput)).toMatchObject({
      id: "item-1",
      sku: "RICE-001",
      msrp: 35,
      trackBatches: true,
    })
  })

  it("strips client-supplied organization identity", () => {
    const parsed = updateItemFromFormSchema.parse({
      ...validInput,
      organizationId: "attacker-org",
    })

    expect(parsed).not.toHaveProperty("organizationId")
  })

  it("strips fields unsupported by the item-creation workflow", () => {
    const parsed = updateItemFromFormSchema.parse({
      ...validInput,
      upc: "legacy-upc",
      ean: "legacy-ean",
      mpn: "legacy-mpn",
      isbn: "legacy-isbn",
      color: "legacy-color",
      size: "legacy-size",
    })

    for (const field of ["upc", "ean", "mpn", "isbn", "color", "size"]) {
      expect(parsed).not.toHaveProperty(field)
    }
  })

  it("rejects invalid stock thresholds", () => {
    const result = updateItemFromFormSchema.safeParse({
      ...validInput,
      minStockLevel: 20,
      maxStockLevel: 10,
    })

    expect(result.success).toBe(false)
  })

  it("rejects tracking details when inventory tracking is disabled", () => {
    const result = updateItemFromFormSchema.safeParse({
      ...validInput,
      trackInventory: false,
      trackBatches: true,
    })

    expect(result.success).toBe(false)
  })

  it("rejects an item that is active and discontinued", () => {
    const result = updateItemFromFormSchema.safeParse({
      ...validInput,
      isActive: true,
      isDiscontinued: true,
    })

    expect(result.success).toBe(false)
  })

  it("requires a valid image reference and required identity fields", () => {
    const result = updateItemFromFormSchema.safeParse({
      ...validInput,
      nameEn: "",
      sku: "",
      imageUrls: "",
    })

    expect(result.success).toBe(false)
  })
})
