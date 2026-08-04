import {
  AccountingSourceType,
  ComplianceSubmissionStatus,
  FiscalDocumentStatus,
  FiscalDocumentType,
} from "@prisma/client"
import { db } from "@/prisma/db"
import { NotFoundError } from "@/services/_shared/action-errors"
import { createPublicReceiptAccessToken } from "@/services/pos/public-receipt-token"
import { getPublicSalesReceipt, getSalesReceipt, sendReceipt } from "@/services/pos/receipt.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  salesOrder: {
    findFirst: jest.Mock
  }
  fiscalDocument: {
    findFirst: jest.Mock
  }
  businessEvent: {
    findUnique: jest.Mock
    create: jest.Mock
    update: jest.Mock
  }
  publicReceiptAccessToken: {
    create: jest.Mock
    findFirst: jest.Mock
    update: jest.Mock
  }
  auditLog: {
    create: jest.Mock
  }
}

const ORIGINAL_RECEIPT_TOKEN_SECRET = process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET
const EXPIRED_TOKEN_NOW = new Date("2026-01-15T10:00:00.000Z")

beforeEach(() => {
  jest.clearAllMocks()
  if (ORIGINAL_RECEIPT_TOKEN_SECRET) {
    process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET = ORIGINAL_RECEIPT_TOKEN_SECRET
  } else {
    delete process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET
  }
  ;(db as any).salesOrder = {
    findFirst: jest.fn(),
  }
  ;(db as any).$transaction = jest.fn(async (handler: (tx: typeof db) => Promise<unknown>) => handler(db))
  ;(db as any).fiscalDocument = {
    findFirst: jest.fn().mockResolvedValue(null),
  }
  ;(db as any).businessEvent = {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn(async (args: any) => ({
      id: "event-1",
      ...args.data,
      outboxMessages: args.data.outboxMessages.create.map((message: unknown, index: number) => ({
        id: `outbox-${index + 1}`,
        ...(message as Record<string, unknown>),
      })),
    })),
    update: jest.fn(),
  }
  ;(db as any).publicReceiptAccessToken = {
    create: jest.fn(async (args: any) => ({
      id: "token-row-issued",
      organizationId: args.data.organizationId,
      salesOrderId: args.data.salesOrderId,
      status: args.data.status,
      expiresAt: args.data.expiresAt,
      revokedAt: null,
    })),
    findFirst: jest.fn(),
    update: jest.fn(async (args: any) => ({
      id: args.where.id,
      organizationId: "org-1",
      salesOrderId: "sale-1",
      status: "ACTIVE",
      expiresAt: new Date("2026-01-15T10:01:00.000Z"),
      revokedAt: null,
    })),
  }
  ;(db as any).auditLog = {
    create: jest.fn().mockResolvedValue({}),
  }
})

afterEach(() => {
  if (ORIGINAL_RECEIPT_TOKEN_SECRET) {
    process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET = ORIGINAL_RECEIPT_TOKEN_SECRET
  } else {
    delete process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET
  }
})

function saleFixture() {
  const createdAt = new Date("2026-01-15T10:00:00.000Z")

  return {
    id: "sale-1",
    orderNumber: "SO-0001",
    status: "COMPLETED",
    paymentStatus: "PAID",
    total: 1000,
    subtotal: 900,
    taxAmount: 100,
    discount: 0,
    orderDate: createdAt,
    organization: {
      id: "org-1",
      name: "Org One",
      address: "1 Main St",
      country: "CM",
      state: "Littoral",
      currency: "XAF",
      slug: "org-one",
      defaultLocale: "EN",
    },
    location: {
      id: "loc-1",
      name: "Main Shop",
      address: "1 Main St",
      phone: "+237600000000",
      email: "shop@example.com",
    },
    terminal: {
      id: "terminal-1",
      name: "Front Counter",
      terminalNumber: "T-1",
    },
    session: {
      id: "session-1",
      sessionNumber: "S-1",
      user: {
        firstName: "Ada",
        lastName: "Cashier",
        email: "ada@example.com",
      },
    },
    createdBy: null,
    customer: {
      id: "customer-1",
      name: "Customer One",
      email: "customer@example.com",
      phone: "+237699999999",
      preferredLocale: "EN",
      currentBalance: 0,
    },
    lines: [
      {
        id: "line-1",
        quantity: 2,
        unitPrice: 450,
        lineTotal: 900,
        taxRate: 100,
        item: {
          id: "item-1",
          nameEn: "Item One",
          nameFr: null,
          sku: "SKU-1",
        },
      },
    ],
    payments: [
      {
        id: "payment-1",
        paymentNumber: "PAY-1",
        method: "CASH",
        amount: 1000,
        status: "PAID",
        cashTendered: 1000,
        changeGiven: 0,
        createdAt,
      },
    ],
  }
}

function createActiveRegistryToken(input: {
  salesOrderId?: string
  organizationId?: string
  jti?: string
  registryStatus?: string
  registryExpiresAt?: Date
  revokedAt?: Date | null
} = {}) {
  process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET = "receipt-token-secret"
  const salesOrderId = input.salesOrderId ?? "sale-1"
  const organizationId = input.organizationId ?? "org-1"
  const jti = input.jti ?? "jti-1"
  const receiptAccessToken = createPublicReceiptAccessToken({
    organizationId,
    salesOrderId,
    jti,
    ttlSeconds: 60,
  })
  expect(receiptAccessToken).toEqual(expect.any(String))
  mockDb.publicReceiptAccessToken.findFirst.mockResolvedValue({
    id: "token-row-1",
    organizationId,
    salesOrderId,
    status: input.registryStatus ?? "ACTIVE",
    expiresAt: input.registryExpiresAt ?? new Date(Date.now() + 60_000),
    revokedAt: input.revokedAt ?? null,
  })
  return receiptAccessToken as string
}

describe("public receipt payload", () => {
  it("rejects raw receipt-id public lookup before database access", async () => {
    await expect(getPublicSalesReceipt({ salesOrderId: "sale-1" })).rejects.toBeInstanceOf(NotFoundError)
    expect(mockDb.publicReceiptAccessToken.findFirst).not.toHaveBeenCalled()
    expect(mockDb.salesOrder.findFirst).not.toHaveBeenCalled()
  })

  it("accepts an active registered token and omits public receipt contact fields", async () => {
    const receiptAccessToken = createActiveRegistryToken()
    mockDb.salesOrder.findFirst.mockResolvedValue(saleFixture())

    const receipt = await getPublicSalesReceipt({ salesOrderId: "sale-1", receiptAccessToken })

    expect(receipt.receipt.customerName).toBe("Customer One")
    expect(receipt.receipt).not.toHaveProperty("customerEmail")
    expect(receipt.receipt).not.toHaveProperty("customerPhone")
    expect(JSON.stringify(receipt)).not.toContain("customerEmail")
    expect(JSON.stringify(receipt)).not.toContain("customerPhone")
    expect(receipt.digitalReceiptUrl).toContain(`/digital-receipt/sale-1?token=${encodeURIComponent(receiptAccessToken)}`)

    expect(mockDb.publicReceiptAccessToken.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org-1",
        salesOrderId: "sale-1",
      }),
    })
    expect(mockDb.publicReceiptAccessToken.update).toHaveBeenCalledWith({
      where: { id: "token-row-1" },
      data: expect.objectContaining({ accessCount: { increment: 1 } }),
    })

    const publicQuery = mockDb.salesOrder.findFirst.mock.calls[0][0]
    expect(publicQuery.where).toMatchObject({ id: "sale-1", organizationId: "org-1" })
    expect(publicQuery.include.customer.select).not.toHaveProperty("email")
    expect(publicQuery.include.customer.select).not.toHaveProperty("phone")
    expect(publicQuery.include.customer.select).not.toHaveProperty("currentBalance")
    expect(publicQuery.include.session.select.user.select).not.toHaveProperty("email")
    expect(publicQuery.include.createdBy.select).not.toHaveProperty("email")
  })

  it("rejects public receipt tokens that are bound to another sale before registry lookup", async () => {
    process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET = "receipt-token-secret"
    const receiptAccessToken = createPublicReceiptAccessToken({
      organizationId: "org-1",
      salesOrderId: "sale-2",
      jti: "jti-2",
      ttlSeconds: 60,
    })

    await expect(getPublicSalesReceipt({ salesOrderId: "sale-1", receiptAccessToken })).rejects.toBeInstanceOf(NotFoundError)
    expect(mockDb.publicReceiptAccessToken.findFirst).not.toHaveBeenCalled()
    expect(mockDb.salesOrder.findFirst).not.toHaveBeenCalled()
  })

  it("rejects expired public receipt tokens before registry lookup", async () => {
    process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET = "receipt-token-secret"
    const receiptAccessToken = createPublicReceiptAccessToken({
      organizationId: "org-1",
      salesOrderId: "sale-1",
      jti: "jti-1",
      now: EXPIRED_TOKEN_NOW,
      ttlSeconds: -1,
    })

    await expect(getPublicSalesReceipt({ salesOrderId: "sale-1", receiptAccessToken })).rejects.toBeInstanceOf(NotFoundError)
    expect(mockDb.publicReceiptAccessToken.findFirst).not.toHaveBeenCalled()
    expect(mockDb.salesOrder.findFirst).not.toHaveBeenCalled()
  })

  it("rejects tampered public receipt tokens before registry lookup", async () => {
    const receiptAccessToken = `${createActiveRegistryToken()}tampered`

    await expect(getPublicSalesReceipt({ salesOrderId: "sale-1", receiptAccessToken })).rejects.toBeInstanceOf(NotFoundError)
    expect(mockDb.publicReceiptAccessToken.findFirst).not.toHaveBeenCalled()
    expect(mockDb.salesOrder.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    ["unknown", null],
    ["revoked", { id: "token-row-1", organizationId: "org-1", salesOrderId: "sale-1", status: "REVOKED", expiresAt: new Date("2026-01-15T10:01:00.000Z"), revokedAt: new Date("2026-01-15T10:00:10.000Z") }],
    ["expired-registry", { id: "token-row-1", organizationId: "org-1", salesOrderId: "sale-1", status: "ACTIVE", expiresAt: new Date("2026-01-15T09:59:59.000Z"), revokedAt: null }],
  ])("rejects %s registry rows before receipt lookup", async (_case, row) => {
    const receiptAccessToken = createActiveRegistryToken()
    mockDb.publicReceiptAccessToken.findFirst.mockResolvedValue(row)

    await expect(getPublicSalesReceipt({ salesOrderId: "sale-1", receiptAccessToken })).rejects.toBeInstanceOf(NotFoundError)
    expect(mockDb.publicReceiptAccessToken.update).not.toHaveBeenCalled()
    expect(mockDb.salesOrder.findFirst).not.toHaveBeenCalled()
  })

  it("keeps customer contact fields for authenticated organization-scoped receipt lookup", async () => {
    mockDb.salesOrder.findFirst.mockResolvedValue(saleFixture())

    const receipt = await getSalesReceipt({ salesOrderId: "sale-1", organizationId: "org-1" })

    expect(receipt.receipt.customerEmail).toBe("customer@example.com")
    expect(receipt.receipt.customerPhone).toBe("+237699999999")

    const authenticatedQuery = mockDb.salesOrder.findFirst.mock.calls[0][0]
    expect(authenticatedQuery.include.customer.select).toMatchObject({ email: true, phone: true, currentBalance: true })
    expect(authenticatedQuery.include.session.select.user.select).toMatchObject({ email: true })
    expect(authenticatedQuery.include.createdBy.select).toMatchObject({ email: true })

    expect(mockDb.salesOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "sale-1",
          organizationId: "org-1",
        }),
      }),
    )
  })

  it("raises a typed not-found error for unavailable public receipts", async () => {
    const receiptAccessToken = createActiveRegistryToken({ salesOrderId: "missing-sale" })
    mockDb.salesOrder.findFirst.mockResolvedValue(null)

    await expect(getPublicSalesReceipt({ salesOrderId: "missing-sale", receiptAccessToken })).rejects.toBeInstanceOf(NotFoundError)
    expect(mockDb.salesOrder.findFirst).toHaveBeenCalled()
  })

  it("surfaces fiscal document and certification queue status truthfully", async () => {
    mockDb.salesOrder.findFirst.mockResolvedValue(saleFixture())
    mockDb.fiscalDocument.findFirst.mockResolvedValue({
      id: "fiscal-doc-1",
      documentType: FiscalDocumentType.POS_RECEIPT,
      status: FiscalDocumentStatus.QUEUED,
      authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
      authorityReference: null,
      legalNumber: null,
      provisionalNumber: null,
      certifiedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      certificationArtifactHash: null,
      countryCode: "CM",
      countryPackVersion: "CM-2026.1",
      countryPackVerificationStatus: "REQUIRES_EXPERT_REVIEW",
      certificationPolicySnapshot: {
        legalDeliveryWhenUncertified: "BLOCK",
      },
      submissions: [
        {
          id: "submission-1",
          status: ComplianceSubmissionStatus.PENDING,
          createdAt: new Date("2026-01-15T10:01:00.000Z"),
        },
      ],
    })

    const receipt = await getSalesReceipt({ salesOrderId: "sale-1", organizationId: "org-1" })

    expect(mockDb.fiscalDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          sourceType: AccountingSourceType.POS_SALE,
          sourceId: "sale-1",
          documentType: FiscalDocumentType.POS_RECEIPT,
        },
      }),
    )
    expect(receipt.certification).toMatchObject({
      fiscalDocumentId: "fiscal-doc-1",
      documentType: FiscalDocumentType.POS_RECEIPT,
      fiscalDocumentStatus: FiscalDocumentStatus.QUEUED,
      submissionId: "submission-1",
      submissionStatus: ComplianceSubmissionStatus.PENDING,
      authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
      countryCode: "CM",
      countryPackVersion: "CM-2026.1",
      countryPackVerificationStatus: "REQUIRES_EXPERT_REVIEW",
      legalDeliveryStatus: "BLOCKED_UNTIL_CERTIFIED",
      legalDeliveryBlocked: true,
    })
  })
  it("queues WhatsApp receipt delivery through the business event outbox", async () => {
    mockDb.salesOrder.findFirst.mockResolvedValue(saleFixture())

    const result = await sendReceipt({
      salesOrderId: "sale-1",
      organizationId: "org-1",
      userId: "cashier-1",
      channel: "WHATSAPP",
      destination: "+237699999999",
      whatsAppCustomerOptInConfirmed: true,
    })

    expect(result).toMatchObject({
      channel: "WHATSAPP",
      status: "PENDING",
      destination: "+237***9999",
      providerReference: "outbox-1",
      retryable: false,
    })
    expect(mockDb.$transaction).toHaveBeenCalled()
    expect(mockDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "POS_RECEIPT_WHATSAPP_DELIVERY_REQUESTED",
          eventSource: "POS",
          sourceType: "POS_SALE",
          sourceId: "sale-1",
          outboxMessages: {
            create: [
              expect.objectContaining({
                channel: "WEBHOOK",
                eventName: "pos.receipt.whatsapp.requested",
                destination: "+237699999999",
              }),
            ],
          },
        }),
      }),
    )
    const eventData = mockDb.businessEvent.create.mock.calls[0][0].data
    expect(JSON.stringify(eventData.payload)).not.toContain("+237699999999")
    expect(JSON.stringify(eventData.metadata)).not.toContain("+237699999999")
    expect(JSON.stringify(mockDb.auditLog.create.mock.calls)).not.toContain("+237699999999")
  })
  it("blocks WhatsApp receipt delivery when legal delivery is blocked", async () => {
    mockDb.salesOrder.findFirst.mockResolvedValue(saleFixture())
    mockDb.fiscalDocument.findFirst.mockResolvedValue({
      id: "fiscal-doc-1",
      documentType: FiscalDocumentType.POS_RECEIPT,
      status: FiscalDocumentStatus.QUEUED,
      authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
      authorityReference: null,
      legalNumber: null,
      provisionalNumber: null,
      certifiedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      certificationArtifactHash: null,
      countryCode: "CM",
      countryPackVersion: "CM-2026.1",
      countryPackVerificationStatus: "REQUIRES_EXPERT_REVIEW",
      certificationPolicySnapshot: {
        legalDeliveryWhenUncertified: "BLOCK",
      },
      submissions: [],
    })

    await expect(sendReceipt({
      salesOrderId: "sale-1",
      organizationId: "org-1",
      userId: "cashier-1",
      channel: "WHATSAPP",
      destination: "+237699999999",
      whatsAppCustomerOptInConfirmed: true,
    })).rejects.toThrow("Country-pack policy blocks legal receipt delivery")

    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "SalesOrder",
          entityId: "sale-1",
          action: "RECEIPT_WHATSAPP",
          changes: expect.objectContaining({
            channel: "WHATSAPP",
            status: "FAILED",
          }),
        }),
      }),
    )
    expect(JSON.stringify(mockDb.auditLog.create.mock.calls)).not.toContain("+237699999999")
  })
})
