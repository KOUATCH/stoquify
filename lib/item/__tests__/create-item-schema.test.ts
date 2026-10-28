import { createItemSchema } from "@/lib/item/schemas"

const baseInput = {
  organizationId: "org-1",
  nameEn: "Rice",
  sku: "RICE-001",
  imageUrls: "https://example.com/rice.png",
  minStockLevel: 0,
}

describe("createItemSchema", () => {
  it("normalizes required item identifiers", () => {
    const result = createItemSchema.parse({
      ...baseInput,
      nameEn: "  Rice  ",
      sku: "  RICE-001  ",
    })

    expect(result.nameEn).toBe("Rice")
    expect(result.sku).toBe("RICE-001")
  })

  it("requires an uploaded image before item creation", () => {
    expect(() => createItemSchema.parse({
      ...baseInput,
      imageUrls: "   ",
    })).toThrow("Product image is required")
  })


  it("rejects a maximum stock level below the minimum", () => {
    expect(() => createItemSchema.parse({
      ...baseInput,
      minStockLevel: 10,
      maxStockLevel: 5,
    })).toThrow("Maximum stock level must be greater than or equal to minimum stock level")
  })

  it("requires a positive quantity when opening stock is supplied", () => {
    expect(() => createItemSchema.parse({
      ...baseInput,
      initialInventory: {
        locationId: "location-1",
        quantity: 0,
        unitCost: 100,
      },
    })).toThrow("Opening quantity must be at least 1")
  })

  it("does not accept client-controlled opening-stock actor attribution", () => {
    const result = createItemSchema.parse({
      ...baseInput,
      initialInventory: {
        locationId: "location-1",
        quantity: 5,
        unitCost: 100,
        createdById: "spoofed-user",
      },
    })

    expect(result.initialInventory).not.toHaveProperty("createdById")
  })
})