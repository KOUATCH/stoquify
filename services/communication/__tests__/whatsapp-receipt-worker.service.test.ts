import { BusinessOutboxStatus } from "@prisma/client"

import { db } from "@/prisma/db"
import {
  WHATSAPP_RECEIPT_EVENT_NAME,
  WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
  whatsappReceiptSourceFingerprint,
} from "../whatsapp-receipt-outbox.service"
import {
  claimWhatsAppReceiptDeliveries,
  processWhatsAppReceiptDelivery,
} from "../whatsapp-receipt-worker.service"
import type { SalesReceiptPayload } from "@/services/pos/receipt.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    businessEventOutbox: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}))

jest.mock("@/services/pos/receipt.service", () => ({
  getSalesReceipt: jest.fn(),
}))

const mockDb = db as unknown as {
  $transaction: jest.Mock
  businessEventOutbox: {
    findMany: jest.Mock
    findFirst: jest.Mock
    updateMany: jest.Mock
    groupBy: jest.Mock
  }
}

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

function outboxRequest(overrides: Record<string, unknown> = {}) {
  const receipt = receiptFixture()
  const destinationHash = "sha256:test-destination"
  return {
    id: "outbox-1",
    organizationId: "org-1",
    channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
    eventName: WHATSAPP_RECEIPT_EVENT_NAME,
    status: BusinessOutboxStatus.LOCKED,
    attempts: 1,
    maxAttempts: 5,
    lockedBy: "worker-1",
    destination: "+237699000000",
    payload: {
      organizationId: "org-1",
      salesOrderId: "sale-1",
      orderNumber: "SO-001",
      requestedById: "cashier-1",
      locale: "EN",
      destinationHash,
      redactedDestination: "+237***0000",
      digitalReceiptUrl: receipt.digitalReceiptUrl,
      sourcePayloadHash: whatsappReceiptSourceFingerprint({
        salesOrderId: receipt.receipt.id,
        orderNumber: receipt.receipt.orderNumber,
        total: receipt.receipt.total,
        digitalReceiptUrl: receipt.digitalReceiptUrl,
        destinationHash,
      }),
    },
    ...overrides,
  }
}

function createTx() {
  return {
    businessEventOutbox: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    businessEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(async (args) => ({ id: "event-sent", ...args.data })),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }
}

describe("WhatsApp receipt worker service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("claims only actionable WhatsApp receipt outbox rows", async () => {
    const now = new Date("2026-08-01T08:00:00.000Z")
    mockDb.businessEventOutbox.findMany.mockResolvedValue([{ id: "outbox-1" }, { id: "outbox-2" }])
    mockDb.businessEventOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })

    await expect(
      claimWhatsAppReceiptDeliveries({
        organizationId: "org-1",
        workerId: "worker-1",
        now,
        limit: 2,
      }),
    ).resolves.toEqual(["outbox-1"])

    expect(mockDb.businessEventOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
          eventName: WHATSAPP_RECEIPT_EVENT_NAME,
        }),
      }),
    )
  })

  it("defers processing when WhatsApp live sends are not configured", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outboxRequest())
    const sendWhatsAppReceipt = jest.fn()

    await expect(
      processWhatsAppReceiptDelivery({
        requestId: "outbox-1",
        workerId: "worker-1",
        dependencies: {
          describeWhatsAppReceiptConfig: jest.fn(() => ({
            liveSendsEnabled: false,
            configured: false,
            missing: ["WHATSAPP_ACCESS_TOKEN"],
            apiVersion: "v20.0",
            templateName: "stoquify_receipt",
            templateLanguage: "en",
            phoneNumberIdConfigured: false,
            accessTokenConfigured: false,
          })),
          sendWhatsAppReceipt,
        },
      }),
    ).resolves.toEqual({ requestId: "outbox-1", status: "DEFERRED" })

    expect(sendWhatsAppReceipt).not.toHaveBeenCalled()
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BusinessOutboxStatus.DEFERRED,
          lastErrorCode: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
        }),
      }),
    )
  })

  it("marks sent requests complete and records a worker completion event", async () => {
    const receipt = receiptFixture()
    const tx = createTx()
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outboxRequest())
    mockDb.$transaction.mockImplementation(async (handler: (txArg: typeof tx) => Promise<unknown>) => handler(tx))

    const sendWhatsAppReceipt = jest.fn().mockResolvedValue({
      channel: "WHATSAPP",
      status: "SENT",
      destination: "+237***0000",
      destinationHash: "sha256:test-destination",
      providerReference: "wamid.123",
      retryable: false,
      message: "accepted",
      digitalReceiptUrl: receipt.digitalReceiptUrl,
    })

    await expect(
      processWhatsAppReceiptDelivery({
        requestId: "outbox-1",
        workerId: "worker-1",
        dependencies: {
          describeWhatsAppReceiptConfig: jest.fn(() => ({
            liveSendsEnabled: true,
            configured: true,
            missing: [],
            apiVersion: "v20.0",
            templateName: "stoquify_receipt",
            templateLanguage: "en",
            phoneNumberIdConfigured: true,
            accessTokenConfigured: true,
          })),
          getSalesReceipt: jest.fn().mockResolvedValue(receipt),
          sendWhatsAppReceipt,
        },
      }),
    ).resolves.toEqual({
      requestId: "outbox-1",
      status: "SENT",
      providerReference: "wamid.123",
    })

    expect(sendWhatsAppReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "+237699000000",
        organizationId: "org-1",
        userId: "cashier-1",
      }),
    )
    expect(tx.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BusinessOutboxStatus.SENT,
          lastErrorCode: null,
          lastErrorMessage: null,
        }),
      }),
    )
    expect(tx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "POS_RECEIPT_WHATSAPP_DELIVERY_SENT",
          eventSource: "WORKER",
          sourceId: "sale-1",
        }),
      }),
    )
  })
})
