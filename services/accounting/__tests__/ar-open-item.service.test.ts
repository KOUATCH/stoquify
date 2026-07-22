import { LedgerEntryType, Prisma } from "@prisma/client"

import { BusinessRuleError } from "@/services/_shared/action-errors"
import { getCustomerAROpenItems } from "@/services/accounting/ar-open-item.service"

function decimal(value: string) {
  return new Prisma.Decimal(value)
}

function ledgerEntry(overrides: Record<string, unknown>) {
  return {
    id: "entry-1",
    customerId: "customer-1",
    customer: { id: "customer-1", name: "Customer One" },
    organizationId: "org-1",
    entryDate: new Date("2026-06-01T00:00:00.000Z"),
    createdAt: new Date("2026-06-01T08:00:00.000Z"),
    type: LedgerEntryType.SALE,
    debit: decimal("0.00"),
    credit: decimal("0.00"),
    balanceAfter: decimal("0.00"),
    description: "entry",
    referenceType: "SALES_ORDER",
    referenceId: "sale-1",
    ...overrides,
  }
}

function mockClient(entries: unknown[] = []) {
  return {
    customer: {},
    customerLedgerEntry: {
      findMany: jest.fn().mockResolvedValue(entries),
    },
    salesOrder: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "sale-1",
          orderNumber: "SO-001",
          orderDate: new Date("2026-06-01T00:00:00.000Z"),
          dueDate: new Date("2026-06-30T00:00:00.000Z"),
          customerId: "customer-1",
          customer: { paymentTerms: 30 },
        },
        {
          id: "sale-2",
          orderNumber: "SO-002",
          orderDate: new Date("2026-07-01T00:00:00.000Z"),
          dueDate: null,
          customerId: "customer-1",
          customer: { paymentTerms: 15 },
        },
      ]),
    },
  }
}

describe("getCustomerAROpenItems", () => {
  it("derives partial, settled, and overdue customer open items from ledger debits and credits", async () => {
    const client = mockClient([
      ledgerEntry({
        id: "sale-debit",
        debit: decimal("100.00"),
        balanceAfter: decimal("100.00"),
        description: "POS sale SO-001",
      }),
      ledgerEntry({
        id: "receipt-credit",
        type: LedgerEntryType.PAYMENT,
        credit: decimal("40.00"),
        balanceAfter: decimal("60.00"),
        entryDate: new Date("2026-06-10T00:00:00.000Z"),
        createdAt: new Date("2026-06-10T08:00:00.000Z"),
        description: "Customer receipt",
      }),
      ledgerEntry({
        id: "sale-2-debit",
        referenceId: "sale-2",
        debit: decimal("50.00"),
        balanceAfter: decimal("110.00"),
        description: "POS sale SO-002",
      }),
      ledgerEntry({
        id: "sale-2-credit",
        referenceId: "sale-2",
        type: LedgerEntryType.PAYMENT,
        credit: decimal("50.00"),
        balanceAfter: decimal("60.00"),
        entryDate: new Date("2026-07-05T00:00:00.000Z"),
        createdAt: new Date("2026-07-05T08:00:00.000Z"),
        description: "Full settlement",
      }),
    ])

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
      referenceId: "sale-1",
      openingAmount: "100.00",
      allocatedAmount: "40.00",
      openAmount: "60.00",
      status: "partial",
      daysPastDue: 15,
      agingBucket: "1-30",
      evidenceGrade: "operational",
      allocations: [expect.objectContaining({ ledgerEntryId: "receipt-credit", amount: "40.00" })],
    })
    expect(result.items[1]).toMatchObject({
      referenceId: "sale-2",
      openAmount: "0.00",
      status: "settled",
    })
    expect(result.summary).toMatchObject({
      itemCount: 2,
      openItemCount: 1,
      settledItemCount: 1,
      totalOpened: "150.00",
      totalAllocated: "90.00",
      totalOpen: "60.00",
      overdueAmount: "60.00",
    })
  })

  it("treats credit notes and write-offs as allocations against open receivables", async () => {
    const client = mockClient([
      ledgerEntry({ id: "sale-debit", debit: decimal("100.00"), balanceAfter: decimal("100.00") }),
      ledgerEntry({
        id: "void-credit",
        type: LedgerEntryType.CREDIT_NOTE,
        credit: decimal("100.00"),
        balanceAfter: decimal("0.00"),
        entryDate: new Date("2026-06-02T00:00:00.000Z"),
        createdAt: new Date("2026-06-02T08:00:00.000Z"),
      }),
    ])

    const result = await getCustomerAROpenItems({
      organizationId: "org-1",
      asOf: new Date("2026-06-15T00:00:00.000Z"),
      recordedThrough: new Date("2026-06-15T12:00:00.000Z"),
      client: client as never,
    })

    expect(result.items[0]).toMatchObject({
      status: "settled",
      allocatedAmount: "100.00",
      openAmount: "0.00",
    })
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
