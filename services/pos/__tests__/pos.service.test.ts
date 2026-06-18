import {
  AccountingSourceType,
  ComplianceAdapterEnvironment,
  FiscalDocumentStatus,
  FiscalDocumentType,
  Prisma,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/services/accounting/postings/post-sale", () => ({
  postSale: jest.fn(),
}))

jest.mock("@/services/accounting/periods.service", () => ({
  getOpenPeriodForDate: jest.fn(),
}))

jest.mock("@/services/accounting/postings/post-payment", () => ({
  postPayment: jest.fn(),
}))

jest.mock("@/services/accounting/postings/post-refund", () => ({
  postRefund: jest.fn(),
}))

jest.mock("@/services/accounting/postings/post-void", () => ({
  postVoid: jest.fn(),
}))

jest.mock("@/services/compliance/fiscal-document.service", () => ({
  createFiscalDocumentFromPostedSource: jest.fn(),
}))

jest.mock("@/services/pos/receipt.service", () => ({
  getSalesReceipt: jest.fn(),
  sendReceipt: jest.fn(),
}))

import { db } from "@/prisma/db"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { postPayment } from "@/services/accounting/postings/post-payment"
import { postRefund } from "@/services/accounting/postings/post-refund"
import { postSale } from "@/services/accounting/postings/post-sale"
import { postVoid } from "@/services/accounting/postings/post-void"
import { createFiscalDocumentFromPostedSource } from "@/services/compliance/fiscal-document.service"
import { getSalesReceipt, sendReceipt } from "@/services/pos/receipt.service"
import { commitPOSSale, refundPOSSale, voidPOSSale } from "../pos.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
}
const mockGetOpenPeriodForDate = getOpenPeriodForDate as jest.Mock
const mockPostSale = postSale as jest.Mock
const mockPostPayment = postPayment as jest.Mock
const mockPostRefund = postRefund as jest.Mock
const mockPostVoid = postVoid as jest.Mock
const mockCreateFiscalDocumentFromPostedSource = createFiscalDocumentFromPostedSource as jest.Mock
const mockGetSalesReceipt = getSalesReceipt as jest.Mock
const mockSendReceipt = sendReceipt as jest.Mock

function expectNoAuditAction(action: string) {
  expect(mockTx.auditLog.create).not.toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ action }),
    }),
  )
}

function expectNoBusinessEvent(eventType: string) {
  expect(mockTx.businessEvent.create).not.toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ eventType }),
    }),
  )
}

const mockTx = {
  salesOrder: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  pOSSession: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  customer: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  customerLedgerEntry: {
    create: jest.fn(),
  },
  inventoryLevel: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  inventoryTransaction: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  cashDrawer: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  cashDrawerTransaction: {
    create: jest.fn(),
  },
  payment: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  paymentRefund: {
    create: jest.fn(),
  },
  item: {
    findFirst: jest.fn(),
  },
  location: {
    findFirst: jest.fn(),
  },
  businessEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
}

function decimal(value: number | string) {
  return new Prisma.Decimal(value)
}

function draftSaleFixture() {
  return {
    id: "sale-1",
    orderNumber: "POS-20260610-0001",
    organizationId: "org-1",
    locationId: "loc-1",
    terminalId: "terminal-1",
    sessionId: "session-1",
    customerId: "customer-1",
    createdById: "cashier-1",
    subtotal: decimal(100),
    total: decimal(118),
    taxAmount: decimal(18),
    discount: decimal(0),
    organization: {
      country: "CM",
      currency: "XAF",
    },
    customer: {
      id: "customer-1",
      code: "CUST-001",
      currentBalance: decimal(0),
      creditLimit: decimal(1000),
    },
    lines: [
      {
        id: "line-1",
        itemId: "item-1",
        quantity: decimal(2),
        unitPrice: decimal(50),
        discount: decimal(0),
        taxRate: decimal(18),
        taxAmount: decimal(18),
        lineTotal: decimal(118),
        item: {
          id: "item-1",
          sku: "SKU-1",
          nameEn: "Fiscal item",
          nameFr: null,
          costPrice: decimal(20),
          trackInventory: true,
          inventoryLevels: [
            {
              id: "level-1",
              locationId: "loc-1",
              quantityOnHand: decimal(10),
              quantityAvailable: decimal(10),
              averageCost: decimal(30),
              totalValue: decimal(300),
              version: 7,
            },
          ],
        },
      },
    ],
  }
}

function completedSaleFixture() {
  return {
    ...draftSaleFixture(),
    status: "COMPLETED",
    paymentStatus: "PAID",
    notes: null,
    discount: decimal(0),
    customer: {
      id: "customer-1",
      code: "CUST-001",
      currentBalance: decimal(0),
    },
    payments: [
      {
        id: "payment-1",
        paymentNumber: "PAY-20260610-0001",
        amount: decimal(118),
        method: "CARD",
        status: "PAID",
        refundedAmount: decimal(0),
        deletedAt: null,
        refunds: [],
      },
    ],
  }
}

function commitInput() {
  return {
    organizationId: "org-1",
    userId: "cashier-1",
    salesOrderId: "sale-1",
    locationId: "loc-1",
    terminalId: "terminal-1",
    sessionId: "session-1",
    customerId: "customer-1",
    tenders: [
      {
        method: "CARD" as const,
        amount: 118,
        reference: "CARD-AUTH-1",
        cardLast4: "4242",
      },
    ],
  }
}

function correctionInput(reason = "Customer requested return") {
  return {
    organizationId: "org-1",
    userId: "cashier-1",
    salesOrderId: "sale-1",
    locationId: "loc-1",
    terminalId: "terminal-1",
    sessionId: "session-1",
    reason,
  }
}

describe("commitPOSSale accounting wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    mockTx.salesOrder.findFirst.mockResolvedValue(draftSaleFixture())
    mockTx.pOSSession.findFirst.mockResolvedValue({
      id: "session-1",
      expectedBalance: decimal(50_000),
    })
    mockTx.customer.findFirst.mockResolvedValue({
      id: "customer-1",
      code: "CUST-001",
      currentBalance: decimal(0),
      creditLimit: decimal(1000),
    })
    mockGetOpenPeriodForDate.mockResolvedValue({ id: "period-1" })
    mockTx.item.findFirst.mockResolvedValue({
      id: "item-1",
      sku: "SKU-1",
      nameEn: "Fiscal item",
      organizationId: "org-1",
      trackInventory: true,
      costPrice: decimal(20),
    })
    mockTx.location.findFirst.mockResolvedValue({
      id: "loc-1",
      organizationId: "org-1",
      allowNegativeStock: false,
    })
    mockTx.inventoryLevel.findUnique.mockResolvedValue({
      id: "level-1",
      itemId: "item-1",
      locationId: "loc-1",
      quantityOnHand: decimal(10),
      quantityAvailable: decimal(10),
      quantityReserved: decimal(0),
      averageCost: decimal(30),
      totalValue: decimal(300),
      version: 7,
    })
    mockTx.inventoryLevel.create.mockResolvedValue({ id: "level-1" })
    mockTx.inventoryLevel.updateMany.mockResolvedValue({ count: 1 })
    mockTx.inventoryTransaction.findMany.mockResolvedValue([
      {
        id: "sale-movement-1",
        itemId: "item-1",
        quantity: decimal(-2),
        totalCost: decimal(60),
      },
    ])
    mockTx.inventoryTransaction.create.mockResolvedValue({ id: "inventory-transaction-1" })
    mockTx.payment.findFirst.mockResolvedValue(null)
    mockTx.payment.create.mockResolvedValue({ id: "payment-1" })
    mockTx.payment.update.mockResolvedValue({ id: "payment-1" })
    mockTx.paymentRefund.create.mockResolvedValue({ id: "refund-1" })
    mockTx.businessEvent.findUnique.mockResolvedValue(null)
    mockTx.businessEvent.create.mockImplementation(async (args) => ({
      id: "business-event-1",
      ...args.data,
      outboxMessages: args.data.outboxMessages.create,
    }))
    mockTx.pOSSession.update.mockResolvedValue({ id: "session-1" })
    mockTx.salesOrder.update.mockResolvedValue({
      id: "sale-1",
      status: "COMPLETED",
      paymentStatus: "PAID",
    })
    mockTx.auditLog.create.mockResolvedValue({ id: "audit-1" })
    mockPostSale.mockResolvedValue({ id: "sale-je-1", entryNumber: "VT-20260610-0001", postingBatchId: "batch-1" })
    mockPostPayment.mockResolvedValue({ id: "payment-je-1", entryNumber: "BQ-20260610-0002" })
    mockPostRefund.mockResolvedValue({ id: "refund-je-1", entryNumber: "RF-20260610-0001" })
    mockPostVoid.mockResolvedValue({ id: "void-je-1", entryNumber: "VD-20260610-0001" })
    mockCreateFiscalDocumentFromPostedSource.mockResolvedValue({
      id: "fiscal-doc-1",
      status: FiscalDocumentStatus.QUEUED,
      authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
      submissions: [{ id: "submission-1", status: "PENDING" }],
    })
    mockGetSalesReceipt.mockResolvedValue({ receipt: { id: "receipt-1" } })
    mockSendReceipt.mockResolvedValue(null)
  })

  it("posts the completed sale and captured POS payment inside the same transaction", async () => {
    const result = await commitPOSSale(commitInput())

    expect(result).toMatchObject({
      saleId: "sale-1",
      orderNumber: "POS-20260610-0001",
      status: "COMPLETED",
      paymentStatus: "PAID",
      accountingMovements: {
        saleJournalEntry: {
          id: "sale-je-1",
          entryNumber: "VT-20260610-0001",
        },
        paymentJournalEntries: [
          {
            id: "payment-je-1",
            entryNumber: "BQ-20260610-0002",
          },
        ],
        totalDebits: 178,
        totalCredits: 178,
      },
    })
    expect(mockPostSale).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        salesOrderId: "sale-1",
        actorId: "cashier-1",
        costAmount: expect.any(Prisma.Decimal),
      }),
      mockTx,
    )
    expect(mockPostSale.mock.calls[0][1].costAmount.eq(60)).toBe(true)
    expect(mockPostPayment).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        paymentId: "payment-1",
        actorId: "cashier-1",
      }),
      mockTx,
    )
    expect(mockCreateFiscalDocumentFromPostedSource).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        createdById: "cashier-1",
        documentType: FiscalDocumentType.POS_RECEIPT,
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: "sale-1",
        sourceNumber: "POS-20260610-0001",
        countryCode: "CM",
        currency: "XAF",
        idempotencyKey: "pos-sale:sale-1:fiscal-document",
        enqueueCertification: true,
        authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
        adapterKey: "CM_DGI_SANDBOX",
        adapterEnvironment: ComplianceAdapterEnvironment.SANDBOX,
        lines: [
          expect.objectContaining({
            sourceLineId: "line-1",
            itemId: "item-1",
            description: "Fiscal item",
            quantity: "2.000",
            unitPrice: "50.00",
            taxRateBps: 1800,
            taxAmount: "18.00",
            lineSubtotal: "100.00",
            lineTotal: "118.00",
          }),
        ],
      }),
      mockTx,
    )
    expect(mockPostPayment.mock.invocationCallOrder[0]).toBeLessThan(
      mockCreateFiscalDocumentFromPostedSource.mock.invocationCallOrder[0],
    )
    expect(mockTx.salesOrder.update.mock.invocationCallOrder[0]).toBeLessThan(
      mockPostSale.mock.invocationCallOrder[0],
    )
    expect(mockTx.payment.create.mock.invocationCallOrder[0]).toBeLessThan(
      mockPostPayment.mock.invocationCallOrder[0],
    )
    expect(mockTx.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          method: "CARD",
          OR: expect.arrayContaining([
            { transactionId: "CARD-AUTH-1" },
            { authorizationCode: "CARD-AUTH-1" },
          ]),
        }),
      }),
    )
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "FinanceLedger",
          changes: expect.objectContaining({
            saleJournalEntryId: "sale-je-1",
            paymentJournalEntryIds: ["payment-je-1"],
          }),
        }),
      }),
    )
    expect(mockTx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "pos.sale.finalized",
          eventSource: "POS",
          idempotencyKey: "pos-sale:sale-1:finalized",
          sourceType: "POS_SALE",
          sourceId: "sale-1",
          postingBatchId: "batch-1",
          payload: expect.objectContaining({
            fiscalDocument: expect.objectContaining({
              id: "fiscal-doc-1",
              status: FiscalDocumentStatus.QUEUED,
              authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
              submissionStatuses: ["PENDING"],
            }),
          }),
          outboxMessages: {
            create: [
              expect.objectContaining({
                organizationId: "org-1",
                channel: "NOTIFICATION",
                eventName: "pos.sale.finalized",
                idempotencyKey: "POS:pos-sale:sale-1:finalized:NOTIFICATION:pos.sale.finalized",
              }),
            ],
          },
        }),
        include: { outboxMessages: true },
      }),
    )
    expect(mockGetSalesReceipt).toHaveBeenCalledWith({
      salesOrderId: "sale-1",
      organizationId: "org-1",
    })
  })

  it("does not return a committed sale or receipt when payment posting fails", async () => {
    mockPostPayment.mockRejectedValueOnce(new Error("payment posting failed"))

    await expect(commitPOSSale(commitInput())).rejects.toThrow("payment posting failed")

    expect(mockPostSale).toHaveBeenCalledTimes(1)
    expect(mockPostPayment).toHaveBeenCalledTimes(1)
    expect(mockCreateFiscalDocumentFromPostedSource).not.toHaveBeenCalled()
    expect(mockGetSalesReceipt).not.toHaveBeenCalled()
    expect(mockSendReceipt).not.toHaveBeenCalled()
    expectNoAuditAction("POS_SALE_POSTED")
    expectNoAuditAction("POS_SALE_COMMIT")
    expectNoBusinessEvent("pos.sale.finalized")
  })

  it("does not post payment, audit, or receipt when sale posting fails", async () => {
    mockPostSale.mockRejectedValueOnce(new Error("sale posting failed"))

    await expect(commitPOSSale(commitInput())).rejects.toThrow("sale posting failed")

    expect(mockPostSale).toHaveBeenCalledTimes(1)
    expect(mockPostPayment).not.toHaveBeenCalled()
    expect(mockCreateFiscalDocumentFromPostedSource).not.toHaveBeenCalled()
    expect(mockGetSalesReceipt).not.toHaveBeenCalled()
    expect(mockSendReceipt).not.toHaveBeenCalled()
    expectNoAuditAction("POS_SALE_POSTED")
    expectNoAuditAction("POS_SALE_COMMIT")
    expectNoBusinessEvent("pos.sale.finalized")
  })

  it("uses a stable tenant-scoped fiscal document idempotency key when the kernel returns an existing document", async () => {
    mockCreateFiscalDocumentFromPostedSource.mockResolvedValueOnce({
      id: "existing-fiscal-doc-1",
      status: FiscalDocumentStatus.QUEUED,
      authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
      submissions: [{ id: "existing-submission-1", status: "PENDING" }],
    })

    await commitPOSSale(commitInput())

    expect(mockCreateFiscalDocumentFromPostedSource).toHaveBeenCalledTimes(1)
    expect(mockCreateFiscalDocumentFromPostedSource.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        organizationId: "org-1",
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: "sale-1",
        idempotencyKey: "pos-sale:sale-1:fiscal-document",
      }),
    )
    expect(mockTx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({
            fiscalDocument: expect.objectContaining({
              id: "existing-fiscal-doc-1",
              status: FiscalDocumentStatus.QUEUED,
            }),
          }),
        }),
      }),
    )
  })

  it("rolls back the sale response and receipt when fiscal document creation fails", async () => {
    mockCreateFiscalDocumentFromPostedSource.mockRejectedValueOnce(new Error("posted ledger source missing"))

    await expect(commitPOSSale(commitInput())).rejects.toThrow("posted ledger source missing")

    expect(mockPostSale).toHaveBeenCalledTimes(1)
    expect(mockPostPayment).toHaveBeenCalledTimes(1)
    expect(mockCreateFiscalDocumentFromPostedSource).toHaveBeenCalledTimes(1)
    expect(mockGetSalesReceipt).not.toHaveBeenCalled()
    expect(mockSendReceipt).not.toHaveBeenCalled()
    expectNoAuditAction("POS_SALE_POSTED")
    expectNoAuditAction("POS_SALE_COMMIT")
    expectNoBusinessEvent("pos.sale.finalized")
  })

  it("blocks duplicate electronic provider references before capture", async () => {
    mockTx.payment.findFirst.mockResolvedValueOnce({
      id: "payment-existing",
      paymentNumber: "PAY-EXISTING",
    })

    await expect(commitPOSSale(commitInput())).rejects.toThrow(/already been captured/i)

    expect(mockTx.payment.findFirst).toHaveBeenCalledTimes(1)
    expect(mockTx.payment.create).not.toHaveBeenCalled()
    expect(mockPostSale).not.toHaveBeenCalled()
    expect(mockPostPayment).not.toHaveBeenCalled()
    expect(mockGetSalesReceipt).not.toHaveBeenCalled()
  })

  it("refunds a fully paid POS sale and posts each refund inside the transaction", async () => {
    mockTx.salesOrder.findFirst.mockResolvedValue(completedSaleFixture())
    mockTx.salesOrder.update.mockResolvedValue({
      id: "sale-1",
      status: "RETURNED",
      paymentStatus: "REFUNDED",
    })

    const result = await refundPOSSale(correctionInput())

    expect(result).toMatchObject({
      saleId: "sale-1",
      status: "RETURNED",
      paymentStatus: "REFUNDED",
      refundIds: ["refund-1"],
      refundJournalEntryIds: ["refund-je-1"],
      totalRefunded: 118,
    })
    expect(mockTx.paymentRefund.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: expect.any(Prisma.Decimal),
          status: "PROCESSED",
          paymentId: "payment-1",
          processedById: "cashier-1",
        }),
      }),
    )
    expect(mockPostRefund).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        refundId: "refund-1",
        actorId: "cashier-1",
      }),
      mockTx,
    )
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "POS_SALE_REFUND",
          changes: expect.objectContaining({
            refundJournalEntryIds: ["refund-je-1"],
          }),
        }),
      }),
    )
    expect(mockTx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "pos.refund.issued",
          eventSource: "POS",
          idempotencyKey: "pos-refund:sale-1:refund-1",
          sourceType: "POS_REFUND",
          sourceId: "sale-1",
        }),
        include: { outboxMessages: true },
      }),
    )
  })

  it("does not finalize refund audit when refund posting fails", async () => {
    mockTx.salesOrder.findFirst.mockResolvedValue(completedSaleFixture())
    mockPostRefund.mockRejectedValueOnce(new Error("refund posting failed"))

    await expect(refundPOSSale(correctionInput())).rejects.toThrow("refund posting failed")

    expect(mockTx.paymentRefund.create).toHaveBeenCalledTimes(1)
    expect(mockPostRefund).toHaveBeenCalledTimes(1)
    expectNoAuditAction("POS_SALE_REFUND")
    expectNoBusinessEvent("pos.refund.issued")
  })

  it("voids a completed POS sale and posts the void inside the transaction", async () => {
    mockTx.salesOrder.findFirst.mockResolvedValue(completedSaleFixture())
    mockTx.salesOrder.update.mockResolvedValue({
      id: "sale-1",
      status: "CANCELLED",
      paymentStatus: "CANCELLED",
    })

    const result = await voidPOSSale(correctionInput("Wrong sale tendered"))

    expect(result).toMatchObject({
      saleId: "sale-1",
      status: "CANCELLED",
      paymentStatus: "CANCELLED",
      voidJournalEntryId: "void-je-1",
    })
    expect(mockTx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "payment-1" },
        data: { status: "CANCELLED" },
      }),
    )
    expect(mockPostVoid).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        salesOrderId: "sale-1",
        actorId: "cashier-1",
      }),
      mockTx,
    )
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "POS_SALE_VOID",
          changes: expect.objectContaining({
            voidJournalEntryId: "void-je-1",
          }),
        }),
      }),
    )
    expect(mockTx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "pos.sale.voided",
          eventSource: "POS",
          idempotencyKey: "pos-void:sale-1:void-je-1",
          sourceType: "POS_VOID",
          sourceId: "sale-1",
        }),
        include: { outboxMessages: true },
      }),
    )
  })

  it("does not finalize void audit when void posting fails", async () => {
    mockTx.salesOrder.findFirst.mockResolvedValue(completedSaleFixture())
    mockPostVoid.mockRejectedValueOnce(new Error("void posting failed"))

    await expect(voidPOSSale(correctionInput("Wrong sale tendered"))).rejects.toThrow("void posting failed")

    expect(mockPostVoid).toHaveBeenCalledTimes(1)
    expectNoAuditAction("POS_SALE_VOID")
    expectNoBusinessEvent("pos.sale.voided")
  })
})
