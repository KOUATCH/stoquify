import {
  describeWhatsAppReceiptConfig,
  hashWhatsAppDestination,
  normalizeWhatsAppPhoneNumber,
  redactWhatsAppPhoneNumber,
  sendWhatsAppReceipt,
} from "../whatsapp-receipt.provider"
import type { ReceiptDeliveryProviderInput } from "@/services/pos/receipt.service"

function providerInput(destination = "+237699000000"): ReceiptDeliveryProviderInput {
  return {
    destination,
    locale: "EN",
    organizationId: "org-1",
    userId: "cashier-1",
    receipt: {
      receipt: {
        id: "sale-1",
        orderNumber: "SO-001",
        customerName: "Customer One",
        total: 1000,
        subtotal: 950,
        tax: 50,
        taxRate: 5,
        discount: 0,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        cashier: "Cashier One",
        terminal: "T01",
        sessionNumber: "S01",
        locale: "EN",
        createdAt: "2026-08-01T08:00:00.000Z",
        items: [],
        payments: [],
      },
      certification: {
        fiscalDocumentId: null,
        documentType: null,
        fiscalDocumentStatus: "NOT_CREATED",
        submissionId: null,
        submissionStatus: null,
        authorityChannel: null,
        authorityReference: null,
        legalNumber: null,
        provisionalNumber: null,
        certifiedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        certificationArtifactHash: null,
        countryCode: null,
        countryPackVersion: null,
        countryPackVerificationStatus: null,
        legalDeliveryStatus: "NOT_CREATED",
        legalDeliveryBlocked: false,
        legalDeliveryBlockReason: null,
      },
      business: {
        name: "Stoquify Shop",
        address: "",
        city: "",
        phone: "",
        email: "",
        website: "",
        taxId: "",
        currency: "XAF",
      },
      location: {
        name: "Main Shop",
        address: "",
        city: "",
        phone: "",
      },
      generatedAt: "2026-08-01T08:00:00.000Z",
      digitalReceiptUrl: "https://app.example.test/digital-receipt/sale-1?token=receipt-token",
    },
  }
}

describe("WhatsApp receipt provider", () => {
  it("keeps live sends disabled until the explicit flag and required config are present", async () => {
    const fetcher = jest.fn()
    const result = await sendWhatsAppReceipt(providerInput(), {
      environment: {},
      fetcher,
    })

    expect(fetcher).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      channel: "WHATSAPP",
      status: "PENDING",
      destination: "+237***0000",
      retryable: false,
      providerReference: "whatsapp-live-send-disabled",
    })
    expect(result.destinationHash).toMatch(/^sha256:/)
    expect(JSON.stringify(result)).not.toContain("+237699000000")
  })

  it("normalizes, redacts, and hashes phone destinations without exposing raw numbers", () => {
    expect(normalizeWhatsAppPhoneNumber("  00237 699-000-000  ")).toBe("+237699000000")
    expect(redactWhatsAppPhoneNumber("+237699000000")).toBe("+237***0000")
    expect(hashWhatsAppDestination("+237699000000")).toMatch(/^sha256:[a-f0-9]{64}$/)
  })

  it("exposes a safe config snapshot without secret values", () => {
    const snapshot = describeWhatsAppReceiptConfig({
      STOQUIFY_WHATSAPP_RECEIPT_LIVE_SENDS: "1",
      WHATSAPP_PHONE_NUMBER_ID: "phone-number-id",
      WHATSAPP_ACCESS_TOKEN: "super-secret-token",
      WHATSAPP_RECEIPT_TEMPLATE_NAME: "stoquify_receipt",
    })

    expect(snapshot).toMatchObject({
      liveSendsEnabled: true,
      configured: true,
      phoneNumberIdConfigured: true,
      accessTokenConfigured: true,
    })
    expect(JSON.stringify(snapshot)).not.toContain("super-secret-token")
    expect(JSON.stringify(snapshot)).not.toContain("phone-number-id")
  })

  it("sends only through the live boundary when explicitly enabled and configured", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: "wamid.123" }] }),
    })

    const result = await sendWhatsAppReceipt(providerInput(), {
      environment: {
        STOQUIFY_WHATSAPP_RECEIPT_LIVE_SENDS: "1",
        WHATSAPP_PHONE_NUMBER_ID: "phone-number-id",
        WHATSAPP_ACCESS_TOKEN: "super-secret-token",
        WHATSAPP_RECEIPT_TEMPLATE_NAME: "stoquify_receipt",
        WHATSAPP_RECEIPT_TEMPLATE_LANGUAGE: "en",
      },
      fetcher,
    })

    expect(fetcher).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/phone-number-id/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer super-secret-token",
          "Content-Type": "application/json",
        }),
      }),
    )
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      messaging_product: "whatsapp",
      to: "237699000000",
      type: "template",
    })
    expect(result).toMatchObject({
      channel: "WHATSAPP",
      status: "SENT",
      destination: "+237***0000",
      destinationHash: expect.stringMatching(/^sha256:/),
      providerReference: "wamid.123",
      retryable: false,
    })
    expect(JSON.stringify(result)).not.toContain("super-secret-token")
    expect(JSON.stringify(result)).not.toContain("+237699000000")
  })
})
