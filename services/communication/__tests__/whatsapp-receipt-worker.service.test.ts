import { BusinessOutboxStatus } from "@prisma/client"

import { db } from "@/prisma/db"
import {
  WHATSAPP_RECEIPT_EVENT_NAME,
  WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
  WHATSAPP_RECEIPT_OUTCOME_UNCERTAIN,
  WHATSAPP_RECEIPT_RETRYABLE_REJECTION,
  whatsappReceiptSourceFingerprint,
} from "../whatsapp-receipt-outbox.service"
import { hashWhatsAppDestination } from "../whatsapp-receipt.provider"
import { createPublicReceiptAccessToken } from "@/services/pos/public-receipt-token"
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
    publicReceiptAccessToken: { findFirst: jest.fn() },
  },
}))

jest.mock("@/services/pos/receipt.service", () => ({
  getPOSSaleCommitReceipt: jest.fn(),
}))

const mockDb = db as unknown as {
  $transaction: jest.Mock
  businessEventOutbox: {
    findMany: jest.Mock
    findFirst: jest.Mock
    updateMany: jest.Mock
    groupBy: jest.Mock
  }
  publicReceiptAccessToken: { findFirst: jest.Mock }
}

function receiptFixture(): SalesReceiptPayload {
  const issued = new Date("2026-08-01T08:00:00.000Z")
  const token = createPublicReceiptAccessToken({
    organizationId: "org-1", salesOrderId: "sale-1", jti: "test-receipt-token-id",
    now: issued, ttlSeconds: 365 * 24 * 60 * 60,
  })
  if (!token) throw new Error("Synthetic receipt token could not be created")
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
    digitalReceiptUrl: `https://app.example.test/digital-receipt/sale-1?token=${token}`,
  }
}

function outboxRequest(overrides: Record<string, unknown> = {}) {
  const receipt = receiptFixture()
  const destinationHash = hashWhatsAppDestination("+237699000000")
  return {
    id: "outbox-1",
    organizationId: "org-1",
    channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
    eventName: WHATSAPP_RECEIPT_EVENT_NAME,
    status: BusinessOutboxStatus.LOCKED,
    attempts: 1,
    maxAttempts: 5,
    lastErrorCode: null,
    lockedAt: new Date("2026-08-01T08:00:00.000Z"),
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

const enabledProvider = {
  liveSendsEnabled: true,
  configured: true,
  missing: [],
  apiVersion: "v20.0",
  templateName: "stoquify_receipt",
  templateLanguage: "en",
  phoneNumberIdConfigured: true,
  accessTokenConfigured: true,
}

function fixtureDependencies(sendWhatsAppReceipt: jest.Mock) {
  return {
    describeWhatsAppReceiptConfig: jest.fn(() => enabledProvider),
    getSalesReceipt: jest.fn().mockResolvedValue(receiptFixture()),
    sendWhatsAppReceipt,
  }
}

describe("WhatsApp receipt worker service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.replaceProperty(process, "env", {
      ...process.env,
      AQSTOQFLOW_RECEIPT_TOKEN_SECRET: "a-synthetic-receipt-signing-key-for-unit-tests",
      NEXT_PUBLIC_APP_URL: "https://app.example.test",
      STOQUIFY_WHATSAPP_RECEIPT_ORGANIZATION_ID: "org-1",
    })
    mockDb.businessEventOutbox.updateMany.mockReset().mockResolvedValue({ count: 1 })
    mockDb.publicReceiptAccessToken.findFirst.mockReset().mockResolvedValue({ id: "retained-token" })
  })

  afterEach(() => jest.restoreAllMocks())

  it("claims only actionable WhatsApp receipt outbox rows", async () => {
    const now = new Date("2026-08-01T08:00:00.000Z")
    mockDb.businessEventOutbox.findMany.mockResolvedValue([{ id: "outbox-1" }, { id: "outbox-2" }])
    mockDb.businessEventOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 }) // quarantine sweep
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
          OR: [
            { status: BusinessOutboxStatus.PENDING },
            { status: BusinessOutboxStatus.FAILED, lastErrorCode: WHATSAPP_RECEIPT_RETRYABLE_REJECTION },
          ],
        }),
      }),
    )
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ status: BusinessOutboxStatus.DEAD_LETTER, lastErrorCode: WHATSAPP_RECEIPT_OUTCOME_UNCERTAIN }),
    }))
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

  it("preserves retry only after a definite rejection and respects backoff", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outboxRequest())
    const now = new Date("2026-08-01T08:00:00.000Z")
    const send = jest.fn().mockResolvedValue({ status: "FAILED", retryable: true })
    await expect(processWhatsAppReceiptDelivery({
      requestId: "outbox-1", workerId: "worker-1", now, dependencies: fixtureDependencies(send),
    })).resolves.toMatchObject({ status: "FAILED" })

    expect(send).toHaveBeenCalledTimes(1)
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: BusinessOutboxStatus.FAILED,
        availableAt: new Date(now.getTime() + 15_000),
        lastErrorCode: WHATSAPP_RECEIPT_RETRYABLE_REJECTION,
      }),
    }))
  })

  it("cannot send a second time when the dispatch fence is already held", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outboxRequest())
    mockDb.businessEventOutbox.updateMany.mockResolvedValueOnce({ count: 0 })
    const send = jest.fn()
    await expect(processWhatsAppReceiptDelivery({
      requestId: "outbox-1", workerId: "worker-1", dependencies: fixtureDependencies(send),
    })).resolves.toMatchObject({ status: "IN_PROGRESS" })
    expect(send).not.toHaveBeenCalled()
  })

  it("does not retry a send after acceptance if completion persistence fails", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outboxRequest())
    mockDb.$transaction.mockRejectedValueOnce(new Error("database error: private provider context"))
    const send = jest.fn().mockResolvedValue({ status: "SENT", providerReference: "fixture-accepted" })
    await expect(processWhatsAppReceiptDelivery({
      requestId: "outbox-1", workerId: "worker-1", dependencies: fixtureDependencies(send),
    })).rejects.toThrow("WhatsApp receipt request processing failed.")
    expect(send).toHaveBeenCalledTimes(1)
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: BusinessOutboxStatus.DEAD_LETTER, lastErrorCode: WHATSAPP_RECEIPT_OUTCOME_UNCERTAIN }),
    }))
    expect(JSON.stringify(mockDb.businessEventOutbox.updateMany.mock.calls)).not.toContain("private provider context")
  })

  it("does not send when the destination differs from the persisted consent scope", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outboxRequest({ destination: "+237699000001" }))
    const send = jest.fn()
    await expect(processWhatsAppReceiptDelivery({
      requestId: "outbox-1", workerId: "worker-1", dependencies: fixtureDependencies(send),
    })).rejects.toThrow("WhatsApp receipt request processing failed.")
    expect(send).not.toHaveBeenCalled()
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: BusinessOutboxStatus.DEAD_LETTER, lastErrorCode: "INVALID_PAYLOAD" }),
    }))
  })

  it("does not send when the original link or completed POS sale is unavailable", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outboxRequest())
    mockDb.publicReceiptAccessToken.findFirst.mockResolvedValueOnce(null)
    const send = jest.fn()
    await expect(processWhatsAppReceiptDelivery({
      requestId: "outbox-1", workerId: "worker-1", dependencies: fixtureDependencies(send),
    })).rejects.toThrow("WhatsApp receipt request processing failed.")
    expect(send).not.toHaveBeenCalled()
    expect(mockDb.publicReceiptAccessToken.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-1", salesOrderId: "sale-1", status: "ACTIVE", revokedAt: null,
        salesOrder: { is: { organizationId: "org-1", channel: "POS", status: "COMPLETED", deletedAt: null } },
      }),
    }))
  })
})
