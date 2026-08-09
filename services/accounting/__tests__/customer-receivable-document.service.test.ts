import {
  CustomerReceivableDocumentStatus,
  Prisma,
} from "@prisma/client"

import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  ensurePostedCustomerReceivableDocumentInTx,
} from "../customer-receivable-document.service"

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(),
  recordBusinessEventInTx: jest.fn(),
  markBusinessEventAppliedInTx: jest.fn(),
}))

const mockHashBusinessPayload = jest.mocked(hashBusinessPayload)
const mockRecordBusinessEventInTx = jest.mocked(recordBusinessEventInTx)
const mockMarkBusinessEventAppliedInTx = jest.mocked(
  markBusinessEventAppliedInTx,
)

const ISSUED_AT = new Date("2026-08-08T09:00:00.000Z")

function decimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value)
}

function saleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "sale-1",
    orderNumber: "SO-001",
    orderDate: ISSUED_AT,
    dueDate: new Date("2026-09-07T09:00:00.000Z"),
    status: "COMPLETED",
    paymentStatus: "PARTIAL",
    subtotal: decimal("90.00"),
    taxAmount: decimal("10.00"),
    shippingCost: decimal("5.00"),
    discount: decimal("5.00"),
    total: decimal("100.00"),
    locationId: "location-1",
    terminalId: "terminal-1",
    sessionId: "session-1",
    createdById: "actor-1",
    createdAt: new Date("2026-08-09T09:00:00.000Z"),
    organization: {
      id: "org-1",
      name: "Stoquify Demo",
      tradeName: "Stoquify",
      taxIdentifier: "TAX-1",
      address: "Douala",
      country: "Cameroon",
      countryCode: "CM",
      currency: "xaf",
      timezone: "Africa/Douala",
    },
    customer: {
      id: "customer-1",
      name: "Customer One",
      code: "CUST-001",
      email: "customer@example.com",
      phone: "+237600000000",
      address: "Douala",
      taxId: "CUSTOMER-TAX",
      paymentTerms: 30,
      preferredLocale: "fr",
    },
    ...overrides,
  }
}

function harness(options: {
  existingDocument?: Record<string, unknown> | null
  existingState?: Record<string, unknown> | null
  sale?: Record<string, unknown> | null
  debit?: string
  credit?: string
} = {}) {
  const createdDocument = {
    id: "document-1",
    documentNumber: "AR-SO-001",
    version: 1,
    customerId: "customer-1",
    documentHash: "c".repeat(64),
  }
  const createdState = {
    id: "state-1",
    documentId: "document-1",
    version: 1,
    status: CustomerReceivableDocumentStatus.PARTIALLY_PAID,
    paidAmount: decimal("40.00"),
    unpaidAmount: decimal("60.00"),
    stateHash: "d".repeat(64),
  }
  const tx = {
    customerReceivableDocument: {
      findFirst: jest.fn().mockResolvedValue(options.existingDocument ?? null),
      create: jest.fn().mockImplementation(async ({ data }) => ({
        ...createdDocument,
        ...data,
      })),
    },
    customerReceivableDocumentState: {
      findFirst: jest.fn().mockResolvedValue(options.existingState ?? null),
      create: jest.fn().mockImplementation(async ({ data }) => ({
        ...createdState,
        ...data,
      })),
    },
    salesOrder: {
      findFirst: jest.fn().mockResolvedValue(
        options.sale === null ? null : (options.sale ?? saleFixture()),
      ),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: "actor-1" }),
    },
    customerLedgerEntry: {
      aggregate: jest.fn().mockResolvedValue({
        _sum: {
          debit: decimal(options.debit ?? "100.00"),
          credit: decimal(options.credit ?? "40.00"),
        },
      }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
  return { tx, createdDocument, createdState }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHashBusinessPayload
    .mockReturnValueOnce("a".repeat(64))
    .mockReturnValueOnce("b".repeat(64))
    .mockReturnValueOnce("c".repeat(64))
    .mockReturnValueOnce("d".repeat(64))
  mockRecordBusinessEventInTx.mockResolvedValue({
    event: { id: "event-1" },
    created: true,
  } as never)
  mockMarkBusinessEventAppliedInTx.mockResolvedValue({
    id: "event-1",
  } as never)
})

describe("ensurePostedCustomerReceivableDocumentInTx", () => {
  it("freezes tenant, customer, source, monetary, hash, and partial-balance evidence", async () => {
    const { tx } = harness()

    const result = await ensurePostedCustomerReceivableDocumentInTx(
      tx as never,
      {
        organizationId: "org-1",
        customerId: "customer-1",
        salesOrderId: "sale-1",
      issuedAt: ISSUED_AT,
      invoiceDate: ISSUED_AT,
        actorId: "actor-1",
        metadata: { source: "BACKFILL" },
      },
    )

    expect(result.replayed).toBe(false)
    expect(tx.customerLedgerEntry.aggregate).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        customerId: "customer-1",
        referenceType: "SALES_ORDER",
        referenceId: "sale-1",
      },
      _sum: { debit: true, credit: true },
    })
    const documentData =
      tx.customerReceivableDocument.create.mock.calls[0][0].data
    expect(documentData).toMatchObject({
      organizationId: "org-1",
      customerId: "customer-1",
      sourceSalesOrderId: "sale-1",
      documentNumber: "AR-SO-001",
      currency: "XAF",
      initialPaidAmount: expect.any(Prisma.Decimal),
      initialUnpaidAmount: expect.any(Prisma.Decimal),
      sourceEvidenceHash: "a".repeat(64),
      metadataHash: "b".repeat(64),
      documentHash: "c".repeat(64),
    })
    expect(documentData.initialPaidAmount.eq("40.00")).toBe(true)
    expect(documentData.initialUnpaidAmount.eq("60.00")).toBe(true)
    expect(documentData.customerSnapshot).toMatchObject({
      customerId: "customer-1",
      name: "Customer One",
    })
    const stateData =
      tx.customerReceivableDocumentState.create.mock.calls[0][0].data
    expect(stateData).toMatchObject({
      documentId: "document-1",
      status: CustomerReceivableDocumentStatus.PARTIALLY_PAID,
      stateHash: "d".repeat(64),
      previousStateHash: null,
      businessEventId: "event-1",
      evidenceHash: "a".repeat(64),
    })
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "customer.receivable.posted",
        sourceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
        sourceId: "document-1",
        documentHash: "c".repeat(64),
      }),
    )
    expect(mockMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(
      tx,
      "org-1",
      "event-1",
    )
  })

  it("allows a fully resolved legacy receivable and records PAID as its initial state", async () => {
    const { tx } = harness({ debit: "100.00", credit: "100.00" })

    await ensurePostedCustomerReceivableDocumentInTx(tx as never, {
      organizationId: "org-1",
      customerId: "customer-1",
      salesOrderId: "sale-1",
      actorId: "actor-1",
    })

    const stateData =
      tx.customerReceivableDocumentState.create.mock.calls[0][0].data
    expect(stateData.status).toBe(CustomerReceivableDocumentStatus.PAID)
    expect(stateData.paidAmount.eq("100.00")).toBe(true)
    expect(stateData.unpaidAmount.eq("0.00")).toBe(true)
  })

  it("returns the existing immutable document and latest state without repeating writes", async () => {
    const existingDocument = {
      id: "document-existing",
      customerId: "customer-1",
      documentHash: "e".repeat(64),
    }
    const existingState = {
      id: "state-existing",
      documentId: "document-existing",
      status: CustomerReceivableDocumentStatus.ISSUED,
    }
    const { tx } = harness({ existingDocument, existingState })

    const result = await ensurePostedCustomerReceivableDocumentInTx(
      tx as never,
      {
        organizationId: "org-1",
        customerId: "customer-1",
        salesOrderId: "sale-1",
        actorId: "actor-1",
      },
    )

    expect(result).toEqual({
      document: existingDocument,
      state: existingState,
      replayed: true,
    })
    expect(tx.salesOrder.findFirst).not.toHaveBeenCalled()
    expect(tx.customerReceivableDocument.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("rejects non-conserving source totals before creating immutable evidence", async () => {
    const { tx } = harness({
      sale: saleFixture({ total: decimal("99.00") }),
    })

    await expect(
      ensurePostedCustomerReceivableDocumentInTx(tx as never, {
        organizationId: "org-1",
        customerId: "customer-1",
        salesOrderId: "sale-1",
        actorId: "actor-1",
      }),
    ).rejects.toThrow(
      "Sales-order totals are not safe for immutable receivable posting",
    )
    expect(tx.customerReceivableDocument.create).not.toHaveBeenCalled()
  })
})
