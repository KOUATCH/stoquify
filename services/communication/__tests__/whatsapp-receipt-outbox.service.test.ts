import {
  WHATSAPP_RECEIPT_EVENT_NAME,
  WHATSAPP_RECEIPT_EVENT_TYPE,
  WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
  queueWhatsAppReceiptDeliveryInTx,
} from "../whatsapp-receipt-outbox.service"
import type { SalesReceiptPayload } from "@/services/pos/receipt.service"

function receiptFixture(): SalesReceiptPayload {
  return {
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
  }
}

function createTx() {
  return {
    businessEvent: {
      findUnique: jest.fn(),
      create: jest.fn(async (args) => ({
        id: "event-1",
        ...args.data,
        outboxMessages: args.data.outboxMessages.create.map((message: unknown, index: number) => ({
          id: `outbox-${index + 1}`,
          ...(message as Record<string, unknown>),
        })),
      })),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }
}

describe("WhatsApp receipt outbox", () => {
  it("records a durable business event and outbox request without exposing the raw phone in event or audit metadata", async () => {
    const tx = createTx()
    tx.businessEvent.findUnique.mockResolvedValue(null)

    const result = await queueWhatsAppReceiptDeliveryInTx(tx, {
      receipt: receiptFixture(),
      destination: "+237699000000",
      locale: "EN",
      organizationId: "org-1",
      userId: "cashier-1",
    })

    expect(result).toMatchObject({
      channel: "WHATSAPP",
      status: "PENDING",
      destination: "+237***0000",
      providerReference: "outbox-1",
      retryable: false,
    })
    expect(result.destinationHash).toMatch(/^sha256:/)

    const createCall = tx.businessEvent.create.mock.calls[0][0]
    expect(createCall.data).toMatchObject({
      organizationId: "org-1",
      eventType: WHATSAPP_RECEIPT_EVENT_TYPE,
      eventSource: "POS",
      sourceType: "POS_SALE",
      sourceId: "sale-1",
      outboxMessages: {
        create: [
          expect.objectContaining({
            channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
            eventName: WHATSAPP_RECEIPT_EVENT_NAME,
            destination: "+237699000000",
            maxAttempts: 5,
          }),
        ],
      },
    })
    expect(JSON.stringify(createCall.data.payload)).not.toContain("+237699000000")
    expect(JSON.stringify(createCall.data.metadata)).not.toContain("+237699000000")
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain("+237699000000")
  })

})
