import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"

import {
  postGoodsReceiptStock,
  postManualStockCorrection,
  postOpeningStock,
  postPOSStockIssue,
} from "../inventory-stock-event.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    item: { findFirst: jest.fn() },
    location: { findFirst: jest.fn() },
    accountingPeriod: { findFirst: jest.fn() },
    ledgerPostingBatch: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    ledgerAuditEvent: { create: jest.fn() },
    businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    inventoryLevel: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    inventoryTransaction: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  item: { findFirst: jest.Mock }
  location: { findFirst: jest.Mock }
  accountingPeriod: { findFirst: jest.Mock }
  ledgerPostingBatch: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  ledgerAuditEvent: { create: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  inventoryLevel: { findUnique: jest.Mock; updateMany: jest.Mock; create: jest.Mock }
  inventoryTransaction: { create: jest.Mock }
  auditLog: { create: jest.Mock }
}

const eventDate = new Date("2026-06-15T09:00:00Z")

function decimal(value: string | number) {
  return new Prisma.Decimal(value)
}

function inventoryLevel(overrides: Record<string, unknown> = {}) {
  return {
    id: "level-1",
    itemId: "item-1",
    locationId: "loc-1",
    quantityOnHand: decimal("10"),
    quantityReserved: decimal("0"),
    quantityAvailable: decimal("10"),
    quantityInTransit: decimal("0"),
    quantityOnOrder: decimal("0"),
    averageCost: decimal("100"),
    totalValue: decimal("1000"),
    version: 1,
    lastTransactionAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
  mockedDb.item.findFirst.mockResolvedValue({
    id: "item-1",
    organizationId: "org-1",
    sku: "SKU-1",
    nameEn: "Item 1",
    trackInventory: true,
    costPrice: decimal("100"),
  })
  mockedDb.location.findFirst.mockResolvedValue({
    id: "loc-1",
    organizationId: "org-1",
    isActive: true,
    deletedAt: null,
    allowNegativeStock: false,
  })
  mockedDb.accountingPeriod.findFirst.mockResolvedValue({
    id: "period-1",
    organizationId: "org-1",
    name: "June 2026",
    startDate: new Date("2026-06-01T00:00:00Z"),
    endDate: new Date("2026-06-30T23:59:59Z"),
    status: "OPEN",
  })
  mockedDb.ledgerPostingBatch.findFirst.mockResolvedValue(null)
  mockedDb.ledgerPostingBatch.create.mockResolvedValue({ id: "posting-batch-1" })
  mockedDb.ledgerPostingBatch.update.mockImplementation(async (args) => ({
    id: args.where.id,
    ...args.data,
  }))
  mockedDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" })
  mockedDb.businessEvent.findUnique.mockResolvedValue(null)
  mockedDb.businessEvent.create.mockImplementation(async (args) => ({
    id: "event-1",
    ...args.data,
    outboxMessages: args.data.outboxMessages.create,
  }))
  mockedDb.businessEvent.update.mockResolvedValue({ id: "event-1", status: "APPLIED" })
  mockedDb.inventoryLevel.findUnique.mockResolvedValue(inventoryLevel())
  mockedDb.inventoryLevel.updateMany.mockResolvedValue({ count: 1 })
  mockedDb.inventoryLevel.create.mockResolvedValue({ id: "level-created-1" })
  mockedDb.inventoryTransaction.create.mockResolvedValue({ id: "movement-1" })
  mockedDb.auditLog.create.mockResolvedValue({ id: "audit-1" })
})

it("posts opening stock through business-event evidence and an explicit ledger blocker", async () => {
  mockedDb.inventoryLevel.findUnique.mockResolvedValueOnce(null)

  const result = await postOpeningStock({
    organizationId: "org-1",
    itemId: "item-1",
    locationId: "loc-1",
    quantity: 5,
    unitCost: 100,
    createdById: "maker-1",
    referenceNumber: "SKU-1",
    occurredAt: eventDate,
  })

  expect(result).toMatchObject({
    eventId: "event-1",
    postingBatchId: "posting-batch-1",
    movementTransactionIds: ["movement-1"],
    replayed: false,
  })
  expect(mockedDb.ledgerPostingBatch.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        sourceType: "OPENING_BALANCE",
        sourceId: "item-1:loc-1",
        postingPurpose: "OPENING_BALANCE",
      }),
    }),
  )
  expect(mockedDb.ledgerPostingBatch.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        status: "FAILED",
        metadata: expect.objectContaining({ blockerCode: "OPENING_STOCK_LEDGER_REVIEW" }),
      }),
    }),
  )
  expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        eventType: "stock.opening_balance.posted",
        idempotencyKey: "stock-opening:org-1:item-1:loc-1",
        sourceType: "OPENING_BALANCE",
        sourceId: "item-1:loc-1",
        postingBatchId: "posting-batch-1",
        documentHash: expect.stringMatching(/^sha256:/),
      }),
    }),
  )
  expect(mockedDb.inventoryLevel.create).toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        type: "INITIAL_STOCK",
        quantity: decimal("5.000"),
        referenceType: "MANUAL",
      }),
    }),
  )
})

it("posts purchase receipt stock through the inventory kernel with receipt evidence and a blocker", async () => {
  await postGoodsReceiptStock({
    organizationId: "org-1",
    receiptId: "receipt-1",
    receiptNumber: "GR-001",
    receivedById: "receiver-1",
    occurredAt: eventDate,
    lines: [
      {
        itemId: "item-1",
        locationId: "loc-1",
        quantity: 3,
        unitCost: 120,
        goodsReceiptLineId: "receipt-line-1",
      },
    ],
  })

  expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        eventType: "purchase.goods_receipt.stock_posted",
        idempotencyKey: "goods-receipt-stock:org-1:receipt-1",
        sourceType: "GOODS_RECEIPT",
        sourceId: "receipt-1",
        postingBatchId: "posting-batch-1",
      }),
    }),
  )
  expect(mockedDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        action: "INVENTORY_STOCK_EVENT_LEDGER_BLOCKED",
        metadata: expect.objectContaining({ blockerCode: "GOODS_RECEIPT_LEDGER_REVIEW" }),
      }),
    }),
  )
  expect(mockedDb.inventoryTransaction.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        type: "PURCHASE_RECEIPT",
        referenceType: "GOODS_RECEIPT",
        referenceId: "receipt-1",
      }),
    }),
  )
})

it("posts POS sale stock issue with stable POS event identity and no silent ledger blocker", async () => {
  await postPOSStockIssue({
    organizationId: "org-1",
    saleId: "sale-1",
    orderNumber: "POS-001",
    locationId: "loc-1",
    actorId: "cashier-1",
    occurredAt: eventDate,
    lines: [{ itemId: "item-1", quantity: 2, unitCost: 100 }],
  })

  expect(mockedDb.ledgerPostingBatch.create).not.toHaveBeenCalled()
  expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        eventType: "pos.sale.stock_issued",
        eventSource: "POS",
        idempotencyKey: "pos-sale-stock:org-1:sale-1",
        sourceType: "POS_SALE",
        sourceId: "sale-1",
        metadata: expect.objectContaining({ ledgerStatus: "NOT_REQUIRED" }),
      }),
    }),
  )
  expect(mockedDb.inventoryLevel.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        quantityOnHand: decimal("8.000"),
        quantityAvailable: decimal("8.000"),
        totalValue: decimal("800.00"),
      }),
    }),
  )
  expect(mockedDb.inventoryTransaction.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        type: "SALE",
        quantity: decimal("-2.000"),
        referenceType: "SALES_ORDER",
        referenceId: "sale-1",
      }),
    }),
  )
})

it("rejects closed-period stock events before event or stock mutation", async () => {
  mockedDb.accountingPeriod.findFirst.mockResolvedValueOnce(null)

  await expect(
    postPOSStockIssue({
      organizationId: "org-1",
      saleId: "sale-1",
      orderNumber: "POS-001",
      locationId: "loc-1",
      actorId: "cashier-1",
      occurredAt: eventDate,
      lines: [{ itemId: "item-1", quantity: 2, unitCost: 100 }],
    }),
  ).rejects.toThrow("open accounting period")

  expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})

it("rejects an idempotency conflict before stock mutation", async () => {
  mockedDb.businessEvent.findUnique.mockResolvedValueOnce({
    id: "event-existing-1",
    organizationId: "org-1",
    eventSource: "POS",
    idempotencyKey: "pos-sale-stock:org-1:sale-1",
    payloadHash: "sha256:previous-payload",
    outboxMessages: [],
  })

  await expect(
    postPOSStockIssue({
      organizationId: "org-1",
      saleId: "sale-1",
      orderNumber: "POS-001",
      locationId: "loc-1",
      actorId: "cashier-1",
      occurredAt: eventDate,
      lines: [{ itemId: "item-1", quantity: 2, unitCost: 100 }],
    }),
  ).rejects.toThrow("idempotency key")

  expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        action: "BUSINESS_EVENT_IDEMPOTENCY_CONFLICT",
        entityId: "event-existing-1",
      }),
    }),
  )
  expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})

it("blocks generic manual correction helpers without an explicit idempotency key", () => {
  expect(() =>
    postManualStockCorrection({
      organizationId: "org-1",
      itemId: "item-1",
      locationId: "loc-1",
      quantityDelta: 1,
      actorId: "maker-1",
      reason: "Legacy correction",
    }),
  ).toThrow("explicit idempotency key")

  expect(mockedDb.$transaction).not.toHaveBeenCalled()
})
