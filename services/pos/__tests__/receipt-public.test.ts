import {
  AccountingSourceType,
  ComplianceSubmissionStatus,
  FiscalDocumentStatus,
  FiscalDocumentType,
} from "@prisma/client"
import { db } from "@/prisma/db"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPublicSalesReceipt, getSalesReceipt } from "@/services/pos/receipt.service"

const mockDb = db as unknown as {
  salesOrder: {
    findFirst: jest.Mock
  }
  fiscalDocument: {
    findFirst: jest.Mock
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(db as any).salesOrder = {
    findFirst: jest.fn(),
  }
  ;(db as any).fiscalDocument = {
    findFirst: jest.fn().mockResolvedValue(null),
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

describe("public receipt payload", () => {
  it("redacts customer contact fields for unauthenticated public receipt lookup", async () => {
    mockDb.salesOrder.findFirst.mockResolvedValue(saleFixture())

    const receipt = await getPublicSalesReceipt({ salesOrderId: "sale-1" })

    expect(receipt.receipt.customerName).toBe("Customer One")
    expect(receipt.receipt.customerEmail).toBe("")
    expect(receipt.receipt.customerPhone).toBe("")
  })

  it("keeps customer contact fields for authenticated organization-scoped receipt lookup", async () => {
    mockDb.salesOrder.findFirst.mockResolvedValue(saleFixture())

    const receipt = await getSalesReceipt({ salesOrderId: "sale-1", organizationId: "org-1" })

    expect(receipt.receipt.customerEmail).toBe("customer@example.com")
    expect(receipt.receipt.customerPhone).toBe("+237699999999")
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
    mockDb.salesOrder.findFirst.mockResolvedValue(null)

    await expect(getPublicSalesReceipt({ salesOrderId: "missing-sale" })).rejects.toBeInstanceOf(NotFoundError)
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
})
