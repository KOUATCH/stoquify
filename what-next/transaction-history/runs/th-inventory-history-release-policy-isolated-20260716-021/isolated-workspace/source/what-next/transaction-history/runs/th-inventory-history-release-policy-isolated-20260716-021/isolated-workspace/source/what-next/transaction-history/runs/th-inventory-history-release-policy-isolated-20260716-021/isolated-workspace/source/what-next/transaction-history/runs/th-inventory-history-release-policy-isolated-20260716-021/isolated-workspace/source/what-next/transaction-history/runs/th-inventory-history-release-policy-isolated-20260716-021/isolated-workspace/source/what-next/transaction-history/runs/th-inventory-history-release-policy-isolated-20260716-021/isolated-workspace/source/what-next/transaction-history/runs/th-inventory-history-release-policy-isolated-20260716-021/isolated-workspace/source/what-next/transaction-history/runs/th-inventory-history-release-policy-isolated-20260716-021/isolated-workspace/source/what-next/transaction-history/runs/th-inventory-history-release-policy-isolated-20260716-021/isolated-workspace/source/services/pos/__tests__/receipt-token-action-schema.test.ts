import {
  listPublicReceiptAccessTokensActionSchema,
  revokePublicReceiptAccessTokenActionSchema,
  searchPublicReceiptSalesActionSchema,
} from "@/services/pos/pos.schemas"

describe("receipt token action schemas", () => {
  it("accepts the minimum list contract without requiring client tenant input", () => {
    expect(
      listPublicReceiptAccessTokensActionSchema.parse({
        salesOrderId: " sale-1 ",
      }),
    ).toEqual({ salesOrderId: "sale-1" })
  })

  it("trims optional tenant input on the list contract", () => {
    expect(
      listPublicReceiptAccessTokensActionSchema.parse({
        organizationId: " org-1 ",
        salesOrderId: " sale-1 ",
      }),
    ).toEqual({ organizationId: "org-1", salesOrderId: "sale-1" })
  })

  it("requires a concrete sales order id for the list contract", () => {
    expect(() => listPublicReceiptAccessTokensActionSchema.parse({ salesOrderId: "" })).toThrow()
  })

  it("accepts receipt sale search defaults without requiring client tenant input", () => {
    expect(searchPublicReceiptSalesActionSchema.parse({ query: " POS-20260703 " })).toEqual({
      query: "POS-20260703",
      limit: 10,
      recentDays: 30,
    })
  })

  it("bounds receipt sale search windows and limits", () => {
    expect(searchPublicReceiptSalesActionSchema.parse({ limit: "25", recentDays: "120" })).toEqual({
      limit: 25,
      recentDays: 120,
    })
    expect(() => searchPublicReceiptSalesActionSchema.parse({ query: "x".repeat(81) })).toThrow()
    expect(() => searchPublicReceiptSalesActionSchema.parse({ limit: 26 })).toThrow()
    expect(() => searchPublicReceiptSalesActionSchema.parse({ recentDays: 121 })).toThrow()
  })
  it("accepts the minimum revoke command contract", () => {
    expect(
      revokePublicReceiptAccessTokenActionSchema.parse({
        tokenId: "token-row-1",
      }),
    ).toEqual({ tokenId: "token-row-1" })
  })

  it("trims optional tenant and reason fields without requiring client tenant input", () => {
    expect(
      revokePublicReceiptAccessTokenActionSchema.parse({
        organizationId: " org-1 ",
        tokenId: " token-row-1 ",
        salesOrderId: " sale-1 ",
        reason: " customer requested revocation ",
      }),
    ).toEqual({
      organizationId: "org-1",
      tokenId: "token-row-1",
      salesOrderId: "sale-1",
      reason: "customer requested revocation",
    })
  })

  it("requires a concrete token id and meaningful reason when reason is supplied", () => {
    expect(() => revokePublicReceiptAccessTokenActionSchema.parse({ tokenId: "" })).toThrow()
    expect(() =>
      revokePublicReceiptAccessTokenActionSchema.parse({
        tokenId: "token-row-1",
        reason: "no",
      }),
    ).toThrow()
  })
})
