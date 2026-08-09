import {
  CustomerReceivableDocumentStatus,
  LedgerEntryType,
  Prisma,
} from "@prisma/client"

import {
  BusinessRuleError,
  ConflictError,
} from "@/services/_shared/action-errors"
import { getCustomerAROpenItems } from "@/services/accounting/ar-open-item.service"

function decimal(value: string) {
  return new Prisma.Decimal(value)
}

function ledgerEntry(overrides: Record<string, unknown>) {
  return {
    id: "entry-1",
    customerId: "customer-1",
    organizationId: "org-1",
    entryDate: new Date("2026-06-01T00:00:00.000Z"),
    createdAt: new Date("2026-06-01T08:00:00.000Z"),
    type: LedgerEntryType.PAYMENT,
    debit: decimal("0.00"),
    credit: decimal("0.00"),
    balanceAfter: decimal("0.00"),
    description: "entry",
    referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
    referenceId: "document-1",
    ...overrides,
  }
}

function receivableDocument(input: {
  id: string
  documentNumber: string
  orderNumber: string
  invoiceDate: string
  dueDate: string
  total: string
  paid: string
  unpaid: string
  status?: CustomerReceivableDocumentStatus
  currency?: string
  lifecycleStates?: unknown[]
}) {
  return {
    id: input.id,
    organizationId: "org-1",
    customerId: "customer-1",
    sourceSalesOrderId: input.id.replace("document", "sale"),
    documentNumber: input.documentNumber,
    version: 1,
    issuedAt: new Date(input.invoiceDate),
    invoiceDate: new Date(input.invoiceDate),
    dueDate: new Date(input.dueDate),
    currency: input.currency ?? "XAF",
    totalAmount: decimal(input.total),
    documentHash: `document-hash-${input.id}`,
    customerSnapshot: { name: "Customer One" },
    sourceSnapshot: { orderNumber: input.orderNumber },
    customer: { name: "Mutable Customer Name" },
    lifecycleStates:
      input.lifecycleStates ??
      [
        {
          id: `state-${input.id}`,
          version: 1,
          status:
            input.status ?? CustomerReceivableDocumentStatus.PARTIALLY_PAID,
          paidAmount: decimal(input.paid),
          unpaidAmount: decimal(input.unpaid),
          stateHash: `state-hash-${input.id}`,
          effectiveAt: new Date(input.invoiceDate),
          createdAt: new Date(input.invoiceDate),
        },
      ],
  }
}

function mockClient(documents: unknown[] = [], entries: unknown[] = []) {
  return {
    customerReceivableDocument: {
      findMany: jest.fn().mockResolvedValue(documents),
    },
    customerLedgerEntry: {
      findMany: jest.fn().mockResolvedValue(entries),
    },
  }
}

describe("getCustomerAROpenItems", () => {
  it("derives statement-ready partial, settled, and overdue items from posted lifecycle state", async () => {
    const client = mockClient(
      [
        receivableDocument({
          id: "document-1",
          documentNumber: "AR-SO-001",
          orderNumber: "SO-001",
          invoiceDate: "2026-06-01T00:00:00.000Z",
          dueDate: "2026-06-30T00:00:00.000Z",
          total: "100.00",
          paid: "40.00",
          unpaid: "60.00",
        }),
        receivableDocument({
          id: "document-2",
          documentNumber: "AR-SO-002",
          orderNumber: "SO-002",
          invoiceDate: "2026-07-01T00:00:00.000Z",
          dueDate: "2026-07-16T00:00:00.000Z",
          total: "50.00",
          paid: "50.00",
          unpaid: "0.00",
          status: CustomerReceivableDocumentStatus.PAID,
        }),
      ],
      [
        ledgerEntry({
          id: "receipt-credit",
          credit: decimal("40.00"),
          entryDate: new Date("2026-06-10T00:00:00.000Z"),
          createdAt: new Date("2026-06-10T08:00:00.000Z"),
          description: "Customer receipt",
        }),
        ledgerEntry({
          id: "sale-2-credit",
          referenceId: "document-2",
          credit: decimal("50.00"),
          entryDate: new Date("2026-07-05T00:00:00.000Z"),
          createdAt: new Date("2026-07-05T08:00:00.000Z"),
          description: "Full settlement",
        }),
      ],
    )

    const result = await getCustomerAROpenItems({
      organizationId: "org-1",
      customerId: "customer-1",
      asOf: new Date("2026-07-15T00:00:00.000Z"),
      recordedThrough: new Date("2026-07-15T12:00:00.000Z"),
      client: client as never,
    })

    expect(client.customerLedgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          customerId: "customer-1",
        }),
      }),
    )
    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      customerName: "Customer One",
      referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
      referenceId: "document-1",
      documentNumber: "AR-SO-001",
      documentVersion: 1,
      documentHash: "document-hash-document-1",
      stateHash: "state-hash-document-1",
      currency: "XAF",
      openingAmount: "100.00",
      paidAmount: "40.00",
      allocatedAmount: "40.00",
      openAmount: "60.00",
      status: "partial",
      daysPastDue: 15,
      agingBucket: "1-30",
      evidenceGrade: "posted",
      allocations: [expect.objectContaining({ ledgerEntryId: "receipt-credit", amount: "40.00" })],
    })
    expect(result.items[1]).toMatchObject({
      referenceId: "document-2",
      openAmount: "0.00",
      status: "settled",
    })
    expect(result.summary).toMatchObject({
      itemCount: 2,
      openItemCount: 1,
      settledItemCount: 1,
      currency: "XAF",
      mixedCurrency: false,
      totalOpened: "150.00",
      totalAllocated: "90.00",
      totalOpen: "60.00",
      overdueAmount: "60.00",
    })
    expect(result.summariesByCurrency).toEqual([
      expect.objectContaining({ currency: "XAF", totalOpen: "60.00" }),
    ])
  })

  it("keeps monetary totals separated when the tenant has more than one receivable currency", async () => {
    const client = mockClient([
      receivableDocument({
        id: "document-1",
        documentNumber: "AR-XAF-001",
        orderNumber: "SO-XAF-001",
        invoiceDate: "2026-06-01T00:00:00.000Z",
        dueDate: "2026-06-30T00:00:00.000Z",
        total: "10000.00",
        paid: "2500.00",
        unpaid: "7500.00",
        currency: "XAF",
      }),
      receivableDocument({
        id: "document-2",
        documentNumber: "AR-EUR-001",
        orderNumber: "SO-EUR-001",
        invoiceDate: "2026-06-02T00:00:00.000Z",
        dueDate: "2026-06-30T00:00:00.000Z",
        total: "100.00",
        paid: "40.00",
        unpaid: "60.00",
        currency: "EUR",
      }),
    ])

    const result = await getCustomerAROpenItems({
      organizationId: "org-1",
      asOf: new Date("2026-07-15T00:00:00.000Z"),
      recordedThrough: new Date("2026-07-15T12:00:00.000Z"),
      client: client as never,
    })

    expect(result.summary).toMatchObject({
      itemCount: 2,
      currency: null,
      mixedCurrency: true,
      totalOpened: null,
      totalAllocated: null,
      totalOpen: null,
      overdueAmount: null,
    })
    expect(result.summariesByCurrency).toEqual([
      expect.objectContaining({ currency: "EUR", totalOpened: "100.00", totalOpen: "60.00" }),
      expect.objectContaining({ currency: "XAF", totalOpened: "10000.00", totalOpen: "7500.00" }),
    ])
  })

  it("preserves a voided document as terminal statement evidence", async () => {
    const client = mockClient(
      [
        receivableDocument({
          id: "document-1",
          documentNumber: "AR-SO-001",
          orderNumber: "SO-001",
          invoiceDate: "2026-06-01T00:00:00.000Z",
          dueDate: "2026-06-30T00:00:00.000Z",
          total: "100.00",
          paid: "0.00",
          unpaid: "0.00",
          status: CustomerReceivableDocumentStatus.VOIDED,
        }),
      ],
      [
        ledgerEntry({
          id: "void-credit",
          type: LedgerEntryType.CREDIT_NOTE,
          credit: decimal("100.00"),
          entryDate: new Date("2026-06-02T00:00:00.000Z"),
          createdAt: new Date("2026-06-02T08:00:00.000Z"),
        }),
      ],
    )

    const result = await getCustomerAROpenItems({
      organizationId: "org-1",
      asOf: new Date("2026-06-15T00:00:00.000Z"),
      recordedThrough: new Date("2026-06-15T12:00:00.000Z"),
      client: client as never,
    })

    expect(result.items[0]).toMatchObject({
      status: "voided",
      allocatedAmount: "100.00",
      openAmount: "0.00",
    })
  })

  it("nets payment reversals against allocations and reopens the receivable", async () => {
    const client = mockClient(
      [
        receivableDocument({
          id: "document-1",
          documentNumber: "AR-SO-001",
          orderNumber: "SO-001",
          invoiceDate: "2026-06-01T00:00:00.000Z",
          dueDate: "2026-06-30T00:00:00.000Z",
          total: "100.00",
          paid: "0.00",
          unpaid: "100.00",
          status: CustomerReceivableDocumentStatus.ISSUED,
        }),
      ],
      [
        ledgerEntry({
          id: "receipt-credit",
          credit: decimal("40.00"),
          entryDate: new Date("2026-06-10T00:00:00.000Z"),
          createdAt: new Date("2026-06-10T08:00:00.000Z"),
        }),
        ledgerEntry({
          id: "receipt-reversal-debit",
          type: LedgerEntryType.PAYMENT_REVERSAL,
          debit: decimal("40.00"),
          entryDate: new Date("2026-06-11T00:00:00.000Z"),
          createdAt: new Date("2026-06-11T08:00:00.000Z"),
        }),
      ],
    )

    const result = await getCustomerAROpenItems({
      organizationId: "org-1",
      customerId: "customer-1",
      asOf: new Date("2026-07-15T00:00:00.000Z"),
      recordedThrough: new Date("2026-07-15T12:00:00.000Z"),
      client: client as never,
    })

    expect(result.items[0]).toMatchObject({
      openingAmount: "100.00",
      allocatedAmount: "0.00",
      openAmount: "100.00",
      status: "open",
      allocations: [
        expect.objectContaining({
          ledgerEntryId: "receipt-credit",
          amount: "40.00",
        }),
        expect.objectContaining({
          ledgerEntryId: "receipt-reversal-debit",
          amount: "-40.00",
        }),
      ],
    })
    expect(result.summary).toMatchObject({
      totalAllocated: "0.00",
      totalOpen: "100.00",
    })
  })

  it("fails closed when no lifecycle state exists at the requested bitemporal boundary", async () => {
    const client = mockClient([
      receivableDocument({
        id: "document-1",
        documentNumber: "AR-SO-001",
        orderNumber: "SO-001",
        invoiceDate: "2026-06-01T00:00:00.000Z",
        dueDate: "2026-06-30T00:00:00.000Z",
        total: "100.00",
        paid: "0.00",
        unpaid: "100.00",
        lifecycleStates: [],
      }),
    ])
    const asOf = new Date("2026-07-15T00:00:00.000Z")
    const recordedThrough = new Date("2026-07-15T12:00:00.000Z")

    await expect(
      getCustomerAROpenItems({
        organizationId: "org-1",
        customerId: "customer-1",
        asOf,
        recordedThrough,
        client: client as never,
      }),
    ).rejects.toBeInstanceOf(ConflictError)
    expect(client.customerReceivableDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          lifecycleStates: expect.objectContaining({
            where: expect.objectContaining({
              effectiveAt: { lte: asOf },
              createdAt: { lte: recordedThrough },
            }),
          }),
        }),
      }),
    )
  })

  it("rejects future recorded-through cutoffs", async () => {
    await expect(
      getCustomerAROpenItems({
        organizationId: "org-1",
        recordedThrough: new Date("2999-01-01T00:00:00.000Z"),
        client: mockClient() as never,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })
})
