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
        ])
        .mockResolvedValueOnce([
          { type: CashDrawerTransactionType.OPENING_BALANCE, amount: decimal(1000) },
          { type: CashDrawerTransactionType.SALE, amount: decimal(5000) },
          { type: CashDrawerTransactionType.CLOSING_BALANCE, amount: decimal(6000) },
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
        ])
        .mockResolvedValueOnce([
          { method: PaymentMethod.MOBILE_MONEY, status: PaymentStatus.PAID, amount: decimal(7500) },
        ]),
    },
    ...overrides,
  }

  return client as any
}

describe("cash payment history service", () => {
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
        findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
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
          ])
          .mockResolvedValueOnce([
            { method: PaymentMethod.CARD, status: PaymentStatus.PAID, amount: decimal(1000) },
            { method: PaymentMethod.MOBILE_MONEY, status: PaymentStatus.PAID, amount: decimal(7500) },
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
  })
})


