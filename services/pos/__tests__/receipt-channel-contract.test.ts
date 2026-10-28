import {
  RECEIPT_CHANNEL_UI_ORDER,
  normalizeReceiptDestination,
  receiptChannelRequiresDestination,
} from "../receipt-channels"
import {
  commitSaleReceiptSchema,
  receiptChannelSchema,
  sendReceiptServiceSchema,
} from "../pos.schemas"

describe("receipt channel contract", () => {
  it("keeps the supported POS receipt channel set explicit", () => {
    expect(RECEIPT_CHANNEL_UI_ORDER).toEqual(["NONE", "PRINT", "EMAIL", "SMS", "WHATSAPP"])
    expect(receiptChannelSchema.safeParse("WHATSAPP").success).toBe(true)
    expect(receiptChannelSchema.safeParse("TELEGRAM").success).toBe(false)
  })

  it("requires destinations only for external addressable receipt channels", () => {
    expect(receiptChannelRequiresDestination("NONE")).toBe(false)
    expect(receiptChannelRequiresDestination("PRINT")).toBe(false)
    expect(receiptChannelRequiresDestination("EMAIL")).toBe(true)
    expect(receiptChannelRequiresDestination("SMS")).toBe(true)
    expect(receiptChannelRequiresDestination("WHATSAPP")).toBe(true)

    expect(commitSaleReceiptSchema.safeParse({ channel: "NONE" }).success).toBe(true)
    expect(commitSaleReceiptSchema.safeParse({ channel: "PRINT" }).success).toBe(true)
    expect(commitSaleReceiptSchema.safeParse({ channel: "EMAIL" }).success).toBe(false)
    expect(commitSaleReceiptSchema.safeParse({ channel: "SMS", destination: "   " }).success).toBe(false)
    expect(commitSaleReceiptSchema.safeParse({ channel: "EMAIL", destination: "customer@example.test" }).success).toBe(true)
    expect(commitSaleReceiptSchema.safeParse({ channel: "SMS", destination: "+237699000000" }).success).toBe(true)
  })

  it("requires explicit customer consent for WhatsApp delivery", () => {
    expect(commitSaleReceiptSchema.safeParse({ channel: "WHATSAPP", destination: "+237699000000" }).success).toBe(false)
    expect(commitSaleReceiptSchema.safeParse({
      channel: "WHATSAPP",
      destination: "+237699000000",
      whatsAppCustomerOptInConfirmed: true,
    }).success).toBe(true)
  })

  it("normalizes destinations away from print and no-receipt flows", () => {
    expect(normalizeReceiptDestination("NONE", "customer@example.test")).toBeUndefined()
    expect(normalizeReceiptDestination("PRINT", "front counter")).toBeUndefined()
    expect(normalizeReceiptDestination("EMAIL", "  customer@example.test  ")).toBe("customer@example.test")
    expect(normalizeReceiptDestination("SMS", "  +237699000000  ")).toBe("+237699000000")
    expect(normalizeReceiptDestination("WHATSAPP", "  +237699000000  ")).toBe("+237699000000")
  })

  it("applies the same destination and consent contract to service delivery requests", () => {
    const base = {
      salesOrderId: "sale-1",
      organizationId: "org-1",
      userId: "cashier-1",
    }

    expect(sendReceiptServiceSchema.safeParse({ ...base, channel: "PRINT" }).success).toBe(true)
    expect(sendReceiptServiceSchema.safeParse({ ...base, channel: "EMAIL" }).success).toBe(false)
    expect(sendReceiptServiceSchema.safeParse({ ...base, channel: "SMS", destination: "+237699000000" }).success).toBe(true)
    expect(sendReceiptServiceSchema.safeParse({ ...base, channel: "WHATSAPP", destination: "+237699000000" }).success).toBe(false)
    expect(sendReceiptServiceSchema.safeParse({
      ...base,
      channel: "WHATSAPP",
      destination: "+237699000000",
      whatsAppCustomerOptInConfirmed: true,
    }).success).toBe(true)
  })
})
