import { CashDrawerTransactionType, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"

import { createHistoryCursorCodec } from "@/services/history/transaction-history-cursor"
import { readCashPaymentHistory } from "../cash-payment-history.service"

const cursorCodec = createHistoryCursorCodec("cash-payment-history-test-secret-2026-07")
const now = new Date("2026-07-17T10:00:00.000Z")

function decimal(value: number | string) {
  return new Prisma.Decimal(value)
}

function createClient(overrides: Record<string, unknown> = {}) {
  const client = {
    organization: {
      findFirst: jest.fn().mockResolvedValue({
        id: "org-1",
        timezone: "Africa/Douala",
        currency: "XAF",
      }),
    },
    cashDrawerTransaction: {
      findMany: jest.fn()
        .mockResolvedValueOnce([
          {
            id: "cash-1",
            type: CashDrawerTransactionType.SALE,
            amount: decimal(5000),
            reason: "cash sale",
            createdAt: new Date("2026-07-17T08:00:00.000Z"),
            cashDrawer: {
              id: "drawer-1",
              name: "Main drawer",
              location: { id: "loc-1", name: "Shop", organizationId: "org-1" },
              terminal: { id: "terminal-1", name: "POS 1" },
            },
            session: { id: "session-1", sessionNumber: "S-001", organizationId: "org-1" },
            user: { id: "cashier-1", firstName: "Ada", lastName: "Cash", email: "ada@example.test" },
          },
        ]),
      groupBy: jest.fn().mockResolvedValue([
          { type: CashDrawerTransactionType.OPENING_BALANCE, _sum: { amount: decimal(1000) }, _count: { _all: 1 } },
          { type: CashDrawerTransactionType.SALE, _sum: { amount: decimal(5000) }, _count: { _all: 1 } },
          { type: CashDrawerTransactionType.CLOSING_BALANCE, _sum: { amount: decimal(6000) }, _count: { _all: 1 } },
        ]),
    },
    payment: {
      findMany: jest.fn()
        .mockResolvedValueOnce([
          {
            id: "payment-1",
            paymentNumber: "PAY-001",
            amount: decimal(7500),
            method: PaymentMethod.MOBILE_MONEY,
            status: PaymentStatus.PAID,
            authorizationCode: null,
            mobileMoneyReference: "MM-SECRET-001",
            bankReference: null,
            transactionId: null,
            processedAt: new Date("2026-07-17T08:05:00.000Z"),
            createdAt: new Date("2026-07-17T08:04:00.000Z"),
            salesOrderId: "sale-1",
            purchaseOrderId: null,
            notes: null,
            processedBy: { id: "cashier-1", firstName: "Ada", lastName: "Cash", email: "ada@example.test" },
            salesOrder: { id: "sale-1", locationId: "loc-1" },
            purchaseOrder: null,
            reconciliationTransaction: {
              id: "ptx-1",
              state: "CONFIRMED",
              providerReference: "PROVIDER-SECRET-001",
              ledgerPostingBatchId: "batch-1",
              settledAt: null,
              confirmedAt: new Date("2026-07-17T08:06:00.000Z"),
            },
          },
        ]),
      groupBy: jest.fn().mockResolvedValue([
          { method: PaymentMethod.MOBILE_MONEY, status: PaymentStatus.PAID, _sum: { amount: decimal(7500) }, _count: { _all: 1 } },
        ]),
    },
    ...overrides,
  }

  return client as any
}

describe("cash payment history service", () => {
  it.each([
    ["loc-1", ["sale-one", "purchase-one", "dual-linked"], "100.00"],
    ["loc-2", ["sale-two", "purchase-two"], "60.00"],
    ["missing-location", [], "0.00"],
    [undefined, ["sale-one", "sale-two", "purchase-one", "purchase-two", "unlinked", "dual-linked"], "210.00"],
  ] as const)("scopes payment rows and summary totals consistently to %s", async (locationId, expectedIds, expectedTotal) => {
    const makePayment = (id: string, amount: number, saleLocation: string | null, purchaseLocation: string | null) => ({
      id, paymentNumber: id, amount: decimal(amount), method: PaymentMethod.CARD, status: PaymentStatus.PAID,
      organizationId: "org-1", deletedAt: null, processedById: "cashier-1",
      authorizationCode: null, mobileMoneyReference: null, bankReference: null, transactionId: null,
      processedAt: new Date("2026-07-17T08:05:00.000Z"), createdAt: new Date("2026-07-17T08:04:00.000Z"),
      salesOrderId: saleLocation ? `sale-${id}` : null, purchaseOrderId: purchaseLocation ? `purchase-${id}` : null,
      salesOrder: saleLocation ? { id: `sale-${id}`, locationId: saleLocation } : null,
      purchaseOrder: purchaseLocation ? { id: `purchase-${id}`, locationId: purchaseLocation } : null,
      notes: null, processedBy: null, reconciliationTransaction: null,
    })
    const payments = [
      makePayment("sale-one", 10, "loc-1", null), makePayment("sale-two", 20, "loc-2", null),
      makePayment("purchase-one", 30, null, "loc-1"), makePayment("purchase-two", 40, null, "loc-2"),
      makePayment("unlinked", 50, null, null), makePayment("dual-linked", 60, "loc-1", "loc-2"),
    ]
    // This is a query-contract fixture, not a PostgreSQL simulation. Assert the
    // nullable relation predicate before serving rows by their displayed scope.
    const rowsForQuery = (where: Prisma.PaymentWhereInput) => {
      expect(where).toMatchObject({ organizationId: "org-1", deletedAt: null, processedById: "cashier-1" })
      if (!where.OR) return payments
      expect(where.OR).toEqual([
        { salesOrder: { is: { locationId } } },
        { salesOrderId: null, purchaseOrder: { is: { locationId } } },
      ])
      return payments.filter(payment => (payment.salesOrder?.locationId ?? payment.purchaseOrder?.locationId) === locationId)
    }
    const client = createClient({ payment: {
      findMany: jest.fn(async ({ where }: { where: Prisma.PaymentWhereInput }) => rowsForQuery(where)),
      groupBy: jest.fn(async ({ where }: { where: Prisma.PaymentWhereInput }) => {
        const rows = rowsForQuery(where)
        return rows.length ? [{ method: PaymentMethod.CARD, status: PaymentStatus.PAID,
          _sum: { amount: rows.reduce((sum, row) => sum.plus(row.amount), decimal(0)) }, _count: { _all: rows.length } }] : []
      }),
    } })
    const result = await readCashPaymentHistory({
      organizationId: "org-1", actorUserId: "cashier-1", accessMode: "own", actorPermissions: ["pos.read"],
      filters: { lane: "payment", pageSize: 25, ...(locationId ? { locationId } : {}) },
    }, { client, cursorCodec, now: () => now })
    expect(result.rows.map(row => row.sourceId).sort()).toEqual([...expectedIds].sort())
    expect(result.summary.paymentCapturedTotal).toBe(expectedTotal)
    expect(result.summary.electronicTenderTotal).toBe(expectedTotal)
    expect(result.summary.paymentEventCount).toBe(expectedIds.length)
    expect(client.payment.groupBy.mock.calls[0][0].where).toEqual(client.payment.findMany.mock.calls[0][0].where)
    if (locationId) expect(result.rows.every(row => row.location.id === locationId)).toBe(true)
    else expect(result.rows.find(row => row.sourceId === "unlinked")?.location.id).toBeNull()
  })

  it("limits own-mode history to the authenticated cashier and excludes electronic tenders from physical cash", async () => {
    const client = createClient()

    const result = await readCashPaymentHistory(
      {
        organizationId: "org-1",
        actorUserId: "cashier-1",
        accessMode: "own",
        actorPermissions: ["pos.read"],
        filters: { lane: "all", pageSize: 50 },
      },
      { client, cursorCodec, now: () => now },
    )

    expect(client.cashDrawerTransaction.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ userId: "cashier-1" }),
      }),
    )
    expect(client.payment.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ processedById: "cashier-1" }),
      }),
    )
    expect(result.summary.expectedPhysicalCash).toBe("6000.00")
    expect(result.summary.countedCash).toBe("6000.00")
    expect(result.summary.cashVariance).toBe("0.00")
    expect(result.summary.electronicTenderTotal).toBe("7500.00")
    expect(result.rows.find((row) => row.lane === "payment")?.accounting.electronicTenderExcluded).toBe(true)
    expect(result.scope).toEqual({ organizationId: "org-1", actorUserId: "cashier-1" })
    expect(client.cashDrawerTransaction.findMany).toHaveBeenCalledTimes(1)
    expect(client.payment.findMany).toHaveBeenCalledTimes(1)
    expect(client.cashDrawerTransaction.groupBy).toHaveBeenCalledWith({
      by: ["type"], where: client.cashDrawerTransaction.findMany.mock.calls[0][0].where,
      _sum: { amount: true }, _count: { _all: true },
    })
    expect(client.payment.groupBy).toHaveBeenCalledWith({
      by: ["method", "status"], where: client.payment.findMany.mock.calls[0][0].where,
      _sum: { amount: true }, _count: { _all: true },
    })
  })

  it("redacts provider references without payment reconciliation authority", async () => {
    const result = await readCashPaymentHistory(
      {
        organizationId: "org-1",
        actorUserId: "cashier-1",
        accessMode: "own",
        actorPermissions: ["pos.read"],
        filters: { lane: "payment", pageSize: 50 },
      },
      { client: createClient(), cursorCodec, now: () => now },
    )

    const payment = result.rows.find((row) => row.lane === "payment")
    expect(payment?.payment.providerReference).toBe("[MASKED:PAYMENT]")
    expect(payment?.payment.redactions).toEqual([
      expect.objectContaining({
        field: "payment:payment-1:providerReference",
        policy: "kontava-payment-provider-reference-mask-policy",
      }),
    ])
  })

  it("keeps provider references visible for reconciliation readers", async () => {
    const client = createClient({
      cashDrawerTransaction: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      payment: {
        findMany: jest.fn()
          .mockResolvedValueOnce([
            {
              id: "payment-2",
              paymentNumber: "PAY-002",
              amount: decimal(1000),
              method: PaymentMethod.CARD,
              status: PaymentStatus.PAID,
              authorizationCode: "AUTH-2",
              mobileMoneyReference: null,
              bankReference: null,
              transactionId: null,
              processedAt: new Date("2026-07-17T08:06:00.000Z"),
              createdAt: new Date("2026-07-17T08:06:00.000Z"),
              salesOrderId: "sale-2",
              purchaseOrderId: null,
              notes: null,
              processedBy: { id: "cashier-2", firstName: "Bea", lastName: "Cash", email: "bea@example.test" },
              salesOrder: { id: "sale-2", locationId: "loc-1" },
              purchaseOrder: null,
              reconciliationTransaction: null,
            },
            {
              id: "payment-1",
              paymentNumber: "PAY-001",
              amount: decimal(7500),
              method: PaymentMethod.MOBILE_MONEY,
              status: PaymentStatus.PAID,
              authorizationCode: null,
              mobileMoneyReference: "MM-SECRET-001",
              bankReference: null,
              transactionId: null,
              processedAt: new Date("2026-07-17T08:05:00.000Z"),
              createdAt: new Date("2026-07-17T08:04:00.000Z"),
              salesOrderId: "sale-1",
              purchaseOrderId: null,
              notes: null,
              processedBy: { id: "cashier-1", firstName: "Ada", lastName: "Cash", email: "ada@example.test" },
              salesOrder: { id: "sale-1", locationId: "loc-1" },
              purchaseOrder: null,
              reconciliationTransaction: null,
            },
          ]),
        groupBy: jest.fn().mockResolvedValue([
            { method: PaymentMethod.CARD, status: PaymentStatus.PAID, _sum: { amount: decimal(1000) }, _count: { _all: 1 } },
            { method: PaymentMethod.MOBILE_MONEY, status: PaymentStatus.PAID, _sum: { amount: decimal(7500) }, _count: { _all: 1 } },
          ]),
      },
    })

    const result = await readCashPaymentHistory(
      {
        organizationId: "org-1",
        actorUserId: "manager-1",
        accessMode: "manager",
        actorPermissions: ["payments.reconciliation.read"],
        filters: { lane: "payment", pageSize: 25 },
      },
      { client, cursorCodec, now: () => now },
    )

    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].payment.providerReference).toBe("AUTH-2")
    expect(result.pageInfo.hasMore).toBe(false)
    expect(client.cashDrawerTransaction.groupBy).not.toHaveBeenCalled()
  })

  it("counts transactions rather than groups and preserves decimal totals and outflows", async () => {
    const client = createClient()
    client.cashDrawerTransaction.groupBy.mockResolvedValue([
      { type: CashDrawerTransactionType.OPENING_BALANCE, _sum: { amount: decimal("10.10") }, _count: { _all: 2 } },
      { type: CashDrawerTransactionType.SALE, _sum: { amount: decimal("999.99") }, _count: { _all: 100_000 } },
      { type: CashDrawerTransactionType.RETURN, _sum: { amount: decimal("0.01") }, _count: { _all: 1 } },
      { type: CashDrawerTransactionType.CLOSING_BALANCE, _sum: { amount: decimal("1010.00") }, _count: { _all: 1 } },
    ])
    client.payment.groupBy.mockResolvedValue([
      { method: PaymentMethod.CARD, status: PaymentStatus.PENDING, _sum: { amount: decimal("200.01") }, _count: { _all: 9 } },
      { method: PaymentMethod.CASH, status: PaymentStatus.PAID, _sum: { amount: decimal("1.99") }, _count: { _all: 3 } },
    ])
    const result = await readCashPaymentHistory({
      organizationId: "org-1", actorUserId: "manager-1", accessMode: "manager",
      filters: { pageSize: 25 }, actorPermissions: ["finance.read"],
    }, { client, cursorCodec, now: () => now })
    expect(result.summary).toEqual({
      transactionCount: 100_016, cashEventCount: 100_004, paymentEventCount: 12,
      openingFloat: "10.10", cashInflows: "1010.09", cashOutflows: "0.01", countedCash: "1010.00",
      expectedPhysicalCash: "1010.08", cashVariance: "-0.08", electronicTenderTotal: "200.01",
      paymentCapturedTotal: "202.00", unresolvedPaymentCount: 9, currency: "XAF",
    })
  })

  it("rejects a foreign tenant cursor before reading either lane", async () => {
    const client = createClient()
    const cursor = cursorCodec.encode({ v: 1, scope: "transaction-history", tenantId: "other-org",
      adapterId: "cash-payment-history.v1", filterHash: "0".repeat(64), recordedThrough: now.toISOString(),
      effectiveAt: now.toISOString(), recordedAt: now.toISOString(), id: "row-1" })
    await expect(readCashPaymentHistory({
      organizationId: "org-1", actorUserId: "cashier-1", accessMode: "own", actorPermissions: ["pos.read"],
      filters: { pageSize: 25, cursor },
    }, { client, cursorCodec, now: () => now })).rejects.toThrow("trusted tenant")
    expect(client.cashDrawerTransaction.findMany).not.toHaveBeenCalled()
    expect(client.cashDrawerTransaction.groupBy).not.toHaveBeenCalled()
    expect(client.payment.findMany).not.toHaveBeenCalled()
    expect(client.payment.groupBy).not.toHaveBeenCalled()
  })

  it("returns zero totals when the trusted filters match no transactions", async () => {
    const client = createClient()
    for (const lane of [client.cashDrawerTransaction, client.payment]) {
      lane.findMany.mockReset().mockResolvedValue([])
      lane.groupBy.mockResolvedValue([])
    }
    const result = await readCashPaymentHistory({
      organizationId: "org-1", actorUserId: "cashier-1", accessMode: "own", actorPermissions: ["pos.read"],
      filters: { pageSize: 25 },
    }, { client, cursorCodec, now: () => now })
    expect(result.summary.transactionCount).toBe(0)
    expect(result.summary.expectedPhysicalCash).toBe("0.00")
    expect(result.summary.cashVariance).toBe("0.00")
    expect(result.summary.unresolvedPaymentCount).toBe(0)
    expect(result.rows).toEqual([])
  })
})


