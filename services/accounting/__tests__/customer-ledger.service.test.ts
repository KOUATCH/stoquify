import { LedgerEntryType, Prisma } from "@prisma/client"

import {
  createCustomerLedgerEntry,
  type CreateCustomerLedgerEntryInput,
} from "@/services/accounting/customer-ledger.service"

function decimal(value: string) {
  return new Prisma.Decimal(value)
}

const INPUT = {
  organizationId: "org-1",
  customerId: "customer-1",
  type: LedgerEntryType.SALE,
  debit: "25.00",
  description: "POS sale SO-001",
  referenceType: "SALES_ORDER",
  referenceId: "sale-1",
} satisfies CreateCustomerLedgerEntryInput

function mockTransaction() {
  return {
    customer: {
      findFirst: jest.fn().mockResolvedValue({
        id: "customer-1",
        currentBalance: decimal("100.00"),
        creditLimit: decimal("150.00"),
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    customerLedgerEntry: {
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: "ledger-entry-1",
        ...data,
      })),
    },
  }
}

describe("customer ledger service-owned balance integrity kernel", () => {
  it("derives the debit balance from a tenant-scoped customer and persists it after a compare-and-set claim", async () => {
    const tx = mockTransaction()

    const result = await createCustomerLedgerEntry(tx as never, {
      ...INPUT,
      organizationId: " org-1 ",
      customerId: " customer-1 ",
      description: " POS sale SO-001 ",
      referenceType: " SALES_ORDER ",
      referenceId: " sale-1 ",
      enforceCreditLimit: true,
      entryDate: "2026-08-08T08:00:00.000Z",
    })

    expect(tx.customer.findFirst).toHaveBeenCalledWith({
      where: {
        id: "customer-1",
        organizationId: "org-1",
        deletedAt: null,
      },
      select: {
        id: true,
        currentBalance: true,
        creditLimit: true,
      },
    })
    expect(tx.customer.updateMany).toHaveBeenCalledWith({
      where: {
        id: "customer-1",
        organizationId: "org-1",
        deletedAt: null,
        currentBalance: expect.any(Prisma.Decimal),
      },
      data: { currentBalance: expect.any(Prisma.Decimal) },
    })
    const claim = tx.customer.updateMany.mock.calls[0][0]
    expect(claim.where.currentBalance.eq("100.00")).toBe(true)
    expect(claim.data.currentBalance.eq("125.00")).toBe(true)
    expect(tx.customerLedgerEntry.create).toHaveBeenCalledWith({
      data: {
        customerId: "customer-1",
        organizationId: "org-1",
        entryDate: new Date("2026-08-08T08:00:00.000Z"),
        type: LedgerEntryType.SALE,
        debit: expect.any(Prisma.Decimal),
        credit: expect.any(Prisma.Decimal),
        balanceAfter: expect.any(Prisma.Decimal),
        description: "POS sale SO-001",
        referenceType: "SALES_ORDER",
        referenceId: "sale-1",
      },
    })
    expect(result.balanceAfter.eq("125.00")).toBe(true)
  })

  it("derives a credit balance and allows an inactive historical customer row", async () => {
    const tx = mockTransaction()

    const result = await createCustomerLedgerEntry(tx as never, {
      ...INPUT,
      type: LedgerEntryType.CREDIT_NOTE,
      debit: undefined,
      credit: "40.00",
      description: "POS void SO-001",
    })

    expect(result.balanceAfter.eq("60.00")).toBe(true)
    expect(tx.customer.findFirst.mock.calls[0][0].where).not.toHaveProperty(
      "isActive",
    )
  })

  it.each([
    ["negative debit", { debit: "-1.00" }],
    ["two-sided movement", { debit: "10.00", credit: "1.00" }],
    ["zero movement", { debit: "0.00", credit: "0.00" }],
    ["blank organization", { organizationId: "   " }],
    ["blank customer", { customerId: "   " }],
    ["blank description", { description: "   " }],
    ["invalid entry date", { entryDate: "not-a-date" }],
  ])("rejects %s before reading or mutating customer truth", async (_name, overrides) => {
    const tx = mockTransaction()

    await expect(
      createCustomerLedgerEntry(tx as never, { ...INPUT, ...overrides }),
    ).rejects.toMatchObject({ name: "BusinessRuleError" })

    expect(tx.customer.findFirst).not.toHaveBeenCalled()
    expect(tx.customer.updateMany).not.toHaveBeenCalled()
    expect(tx.customerLedgerEntry.create).not.toHaveBeenCalled()
  })

  it.each([
    [
      "sale credit",
      { type: LedgerEntryType.SALE, debit: undefined, credit: "10.00" },
    ],
    [
      "payment debit",
      { type: LedgerEntryType.PAYMENT, debit: "10.00", credit: undefined },
    ],
    [
      "customer purchase",
      { type: LedgerEntryType.PURCHASE, debit: "10.00", credit: undefined },
    ],
  ])("rejects wrong customer-ledger type polarity for %s", async (_name, overrides) => {
    const tx = mockTransaction()

    await expect(
      createCustomerLedgerEntry(tx as never, { ...INPUT, ...overrides }),
    ).rejects.toMatchObject({ name: "BusinessRuleError" })

    expect(tx.customer.findFirst).not.toHaveBeenCalled()
  })

  it("allows a one-sided adjustment while retaining all balance guards", async () => {
    const tx = mockTransaction()

    const result = await createCustomerLedgerEntry(tx as never, {
      ...INPUT,
      type: LedgerEntryType.ADJUSTMENT,
      debit: undefined,
      credit: "5.00",
    })

    expect(result.balanceAfter.eq("95.00")).toBe(true)
  })

  it("posts payment reversals as debits and rejects the opposite polarity", async () => {
    const tx = mockTransaction()

    const result = await createCustomerLedgerEntry(tx as never, {
      ...INPUT,
      type: LedgerEntryType.PAYMENT_REVERSAL,
      debit: "40.00",
      credit: undefined,
      description: "Reverse customer receipt",
    })

    expect(result.balanceAfter.eq("140.00")).toBe(true)

    const invalidTx = mockTransaction()
    await expect(
      createCustomerLedgerEntry(invalidTx as never, {
        ...INPUT,
        type: LedgerEntryType.PAYMENT_REVERSAL,
        debit: undefined,
        credit: "40.00",
        description: "Invalid reversal polarity",
      }),
    ).rejects.toMatchObject({
      name: "BusinessRuleError",
    })
    expect(invalidTx.customer.findFirst).not.toHaveBeenCalled()
  })

  it("fails without mutation when the tenant-scoped customer does not exist", async () => {
    const tx = mockTransaction()
    tx.customer.findFirst.mockResolvedValue(null)

    await expect(
      createCustomerLedgerEntry(tx as never, INPUT),
    ).rejects.toMatchObject({ name: "NotFoundError", code: "NOT_FOUND" })

    expect(tx.customer.updateMany).not.toHaveBeenCalled()
    expect(tx.customerLedgerEntry.create).not.toHaveBeenCalled()
  })

  it("prevents a credit from producing a negative customer balance", async () => {
    const tx = mockTransaction()

    await expect(
      createCustomerLedgerEntry(tx as never, {
        ...INPUT,
        type: LedgerEntryType.PAYMENT,
        debit: undefined,
        credit: "101.00",
      }),
    ).rejects.toThrow(
      "Customer balance cannot become negative from this ledger entry",
    )

    expect(tx.customer.updateMany).not.toHaveBeenCalled()
    expect(tx.customerLedgerEntry.create).not.toHaveBeenCalled()
  })

  it("enforces the service-owned credit limit when requested", async () => {
    const tx = mockTransaction()

    await expect(
      createCustomerLedgerEntry(tx as never, {
        ...INPUT,
        debit: "51.00",
        enforceCreditLimit: true,
      }),
    ).rejects.toThrow("Customer credit limit would be exceeded")

    expect(tx.customer.updateMany).not.toHaveBeenCalled()
    expect(tx.customerLedgerEntry.create).not.toHaveBeenCalled()
  })

  it("fails closed when the compare-and-set balance claim loses a race", async () => {
    const tx = mockTransaction()
    tx.customer.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      createCustomerLedgerEntry(tx as never, INPUT),
    ).rejects.toMatchObject({ name: "ConflictError", code: "CONFLICT" })

    expect(tx.customerLedgerEntry.create).not.toHaveBeenCalled()
  })
})
