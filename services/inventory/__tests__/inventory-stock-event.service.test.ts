import { Prisma, PurchaseCorrectionDirection } from "@prisma/client"

import { db } from "@/prisma/db"
import { readReceiptRecognitionSource } from "@/services/purchase-order/receipt-recognition-source"
import { validateReceiptReturnStockAllocationInTx } from "@/services/purchasing/receipt-return-recognition"
jest.mock("@/services/purchase-order/receipt-recognition-source", () => ({ readReceiptRecognitionSource: jest.fn() }))
jest.mock("@/services/purchasing/receipt-return-recognition", () => ({ validateReceiptReturnStockAllocationInTx: jest.fn() }))

import {
  postGoodsReceiptStock,
  postDeliveryOrderStockIssue,
  postManualStockCorrection,
  postOpeningStock,
  postPOSStockIssue,
  postPurchaseReturnStock,
} from "../inventory-stock-event.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    item: { findFirst: jest.fn() },
    location: { findFirst: jest.fn() },
    accountingPeriod: { findFirst: jest.fn() },
    ledgerPostingBatch: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    ledgerAuditEvent: { create: jest.fn() },
    businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    businessEventAudit: { create: jest.fn() },
    businessEventAnomaly: { upsert: jest.fn() },
    closeRun: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    closePackExport: { findFirst: jest.fn(), update: jest.fn() },
    inventoryLevel: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    inventoryTransaction: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  $queryRaw: jest.Mock
  item: { findFirst: jest.Mock }
  location: { findFirst: jest.Mock }
  accountingPeriod: { findFirst: jest.Mock }
  ledgerPostingBatch: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  ledgerAuditEvent: { create: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  businessEventAudit: { create: jest.Mock }
  businessEventAnomaly: { upsert: jest.Mock }
  closeRun: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
  closePackExport: { findFirst: jest.Mock; update: jest.Mock }
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
  mockedDb.$queryRaw.mockResolvedValue([])
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
  mockedDb.businessEventAudit.create.mockResolvedValue({ id: "conflict-audit-1" })
  mockedDb.businessEventAnomaly.upsert.mockResolvedValue({ id: "conflict-anomaly-1" })
  mockedDb.closeRun.findMany.mockResolvedValue([])
  mockedDb.closeRun.findFirst.mockResolvedValue(null)
  mockedDb.closeRun.update.mockResolvedValue({ id: "close-run-1" })
  mockedDb.closePackExport.findFirst.mockResolvedValue(null)
  mockedDb.closePackExport.update.mockResolvedValue({ id: "close-pack-export-1" })
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
        effectiveAt: eventDate,
        recordedAt: expect.any(Date),
        timeProvenance: "EXPLICIT_SOURCE_TIME",
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

const receiptInput = {
  organizationId: "org-1",
  receiptId: "receipt-1",
  receiptNumber: "GR-001",
  receivedById: "receiver-1",
  occurredAt: eventDate,
  lines: [{ itemId: "item-1", locationId: "loc-1", quantity: 3, unitCost: 120 }],
}

it("records a source-bound zero-value receipt without a false ledger failure", async () => {
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue({ sourceHash: "a".repeat(64), inventoryValue: decimal(0), manifest: { effectiveAt: eventDate.toISOString(), locationId: "loc-1", acceptance: { actorId: "receiver-1" }, lines: [{ receiptLineId: "line-1", itemId: "item-1", stockTracked: true, quantity: "3.000", unitCost: "0.00", batchNumber: null, expiryDate: null, serialNumbers: [] }] } })
  await postGoodsReceiptStock({ ...receiptInput, documentHash: "a".repeat(64), receiptRecognitionNotRequired: true, lines: [{ ...receiptInput.lines[0], goodsReceiptLineId: "line-1", unitCost: 0 }] })
  expect(mockedDb.inventoryTransaction.create).toHaveBeenCalled()
  expect(mockedDb.ledgerPostingBatch.create).not.toHaveBeenCalled()
  expect(mockedDb.ledgerPostingBatch.update).not.toHaveBeenCalled()
})

it("rejects positive or changed costs using a zero-value source exemption", async () => {
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue({ sourceHash: "a".repeat(64), inventoryValue: decimal(0), manifest: { effectiveAt: eventDate.toISOString(), locationId: "loc-1", acceptance: { actorId: "receiver-1" }, lines: [{ receiptLineId: "line-1", itemId: "item-1", stockTracked: true, quantity: "3.000", unitCost: "0.00", batchNumber: null, expiryDate: null, serialNumbers: [] }] } })
  await expect(postGoodsReceiptStock({ ...receiptInput, documentHash: "a".repeat(64), receiptRecognitionNotRequired: true, lines: [{ ...receiptInput.lines[0], goodsReceiptLineId: "line-1" }] })).rejects.toThrow("zero-value stock receipt")
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
  expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
})

async function retainReceiptEvent(batchStatus = "POSTED", eventStatus = "APPLIED") {
  await postGoodsReceiptStock(receiptInput)
  const event = {
    id: "event-1",
    ...mockedDb.businessEvent.create.mock.calls[0][0].data,
    status: eventStatus,
    outboxMessages: [],
  }
  const batch = {
    id: "posting-batch-1",
    organizationId: "org-1",
    sourceType: "GOODS_RECEIPT",
    sourceId: "receipt-1",
    postingPurpose: "GOODS_RECEIPT",
    sourceVersion: 1,
    postingCycle: 1,
    periodId: "period-1",
    status: batchStatus,
    metadata: { documentHash: "retained-accounting-proof", journalEntryId: "journal-1" },
  }
  jest.clearAllMocks()
  mockedDb.businessEvent.findUnique.mockResolvedValue(event)
  mockedDb.ledgerPostingBatch.findFirst.mockResolvedValue(batch)
  mockedDb.ledgerPostingBatch.update.mockImplementation(async (args) => Object.assign(batch, args.data))
  return { event, batch }
}

it.each(["POSTED", "REVERSED", "FAILED"])("preserves the %s receipt batch and all stock on an exact applied replay", async (status) => {
  const { batch } = await retainReceiptEvent(status)
  const before = JSON.stringify(batch)

  const result = await postGoodsReceiptStock(receiptInput)

  expect(result).toMatchObject({ replayed: true, eventId: "event-1", postingBatchId: "posting-batch-1" })
  expect(JSON.stringify(batch)).toBe(before)
  expect(mockedDb.ledgerPostingBatch.create).not.toHaveBeenCalled()
  expect(mockedDb.ledgerPostingBatch.update).not.toHaveBeenCalled()
  expect(mockedDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
  expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  expect(mockedDb.businessEvent.update).not.toHaveBeenCalled()
  expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})

it("retains the posted batch before rejecting a replay payload conflict inside an existing transaction", async () => {
  const { batch } = await retainReceiptEvent()
  const before = JSON.stringify(batch)
  const transaction = { ...mockedDb }
  Reflect.deleteProperty(transaction, "$transaction")
  transaction.$queryRaw.mockResolvedValueOnce([await mockedDb.accountingPeriod.findFirst()])
  mockedDb.$transaction.mockClear()

  await expect(postGoodsReceiptStock({
    ...receiptInput,
    lines: [{ ...receiptInput.lines[0], quantity: 4 }],
  }, transaction as unknown as Prisma.TransactionClient)).rejects.toThrow("idempotency key")
  expect("$transaction" in transaction).toBe(false)
  // The canonical anomaly writer retains conflict evidence in its own transaction.
  expect(mockedDb.$transaction).toHaveBeenCalledTimes(1)

  expect(JSON.stringify(batch)).toBe(before)
  expect(mockedDb.ledgerPostingBatch.update).not.toHaveBeenCalled()
  expect(mockedDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
  expect(mockedDb.businessEventAudit.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ action: "IDEMPOTENCY_CONFLICT", organizationId: "org-1" }),
  }))
  expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})

it.each(["POSTED", "REVERSED"])("rejects a novel receipt event against a %s batch before event or stock mutation", async (status) => {
  const { batch } = await retainReceiptEvent(status)
  const before = JSON.stringify(batch)
  mockedDb.businessEvent.findUnique.mockResolvedValue(null)

  await expect(postGoodsReceiptStock({ ...receiptInput, idempotencyKey: "receipt-novel-line" }))
    .rejects.toThrow("finalized receipt or stock posting")

  expect(JSON.stringify(batch)).toBe(before)
  expect(mockedDb.ledgerPostingBatch.update).not.toHaveBeenCalled()
  expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})

it.each(["RECEIVED", "FAILED"])("does not label a retained %s stock event an applied replay", async (status) => {
  await retainReceiptEvent("FAILED", status)

  await expect(postGoodsReceiptStock(receiptInput)).rejects.toThrow("not applied")

  expect(mockedDb.ledgerPostingBatch.update).not.toHaveBeenCalled()
  expect(mockedDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})

it.each([
  { organizationId: "other-org" },
  { sourceId: "other-receipt" },
  { postingPurpose: "SUPPLIER_INVOICE" },
])("rejects a retained batch identity conflict %j without changing it", async (identity) => {
  const { batch } = await retainReceiptEvent()
  Object.assign(batch, identity)

  await expect(postGoodsReceiptStock(receiptInput)).rejects.toThrow("different source")

  expect(mockedDb.ledgerPostingBatch.update).not.toHaveBeenCalled()
  expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})

it("posts a source-linked purchase return as a negative inventory movement tied to the AP batch", async () => {
  await postPurchaseReturnStock({
    organizationId: "org-1",
    purchaseReturnId: "return-1",
    returnNumber: "PR-000001",
    purchaseOrderId: "po-1",
    goodsReceiptId: "receipt-1",
    direction: PurchaseCorrectionDirection.CORRECTION,
    postedById: "actor-1",
    occurredAt: eventDate,
    idempotencyKey: "purchase-return-stock:idem-1",
    documentHash: "sha256:return-document",
    accountingPostingBatchId: "ap-return-batch-1",
    lines: [{ itemId: "item-1", locationId: "loc-1", quantity: 2, unitCost: 100 }],
  })

  expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      eventType: "purchase.return.stock_posted",
      sourceType: "PURCHASE_RETURN",
      sourceId: "return-1",
      postingBatchId: "ap-return-batch-1",
    }),
  }))
  expect(mockedDb.inventoryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      type: "PURCHASE_RETURN",
      quantity: decimal("-2.000"),
      unitCost: decimal("100.00"),
      totalCost: decimal("200.00"),
      balanceAfter: decimal("8.000"),
      referenceType: "RETURN",
      referenceId: "return-1",
      reversalOfTransactionId: null,
    }),
  }))
})

it("reverses a purchase return by restoring stock and referencing the exact original movement", async () => {
  mockedDb.inventoryLevel.findUnique.mockResolvedValue(inventoryLevel({
    quantityOnHand: decimal("8"),
    quantityAvailable: decimal("8"),
    totalValue: decimal("800"),
  }))

  await postPurchaseReturnStock({
    organizationId: "org-1",
    purchaseReturnId: "return-reversal-1",
    returnNumber: "PR-000002",
    purchaseOrderId: "po-1",
    goodsReceiptId: "receipt-1",
    direction: PurchaseCorrectionDirection.REVERSAL,
    postedById: "actor-1",
    occurredAt: eventDate,
    idempotencyKey: "purchase-return-stock:idem-reversal-1",
    documentHash: "sha256:return-reversal-document",
    accountingPostingBatchId: "ap-return-reversal-batch-1",
    lines: [{
      itemId: "item-1",
      locationId: "loc-1",
      quantity: 2,
      unitCost: 100,
      sourceInventoryTransactionId: "movement-original-1",
    }],
  })

  expect(mockedDb.inventoryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      type: "PURCHASE_RETURN_REVERSAL",
      quantity: decimal("2.000"),
      totalCost: decimal("200.00"),
      balanceAfter: decimal("10.000"),
      referenceType: "RETURN",
      referenceId: "return-reversal-1",
      reversalOfTransactionId: "movement-original-1",
    }),
  }))
})

function allocatedReturnInput(quantity: string, allocatedValue: string, direction: PurchaseCorrectionDirection = PurchaseCorrectionDirection.CORRECTION) {
  return {
    organizationId: "org-1", purchaseReturnId: "return-v2", returnNumber: "PR-V2", purchaseOrderId: "po-1", goodsReceiptId: "receipt-1",
    direction, postedById: "actor-1", occurredAt: eventDate, idempotencyKey: "return-v2-request", documentHash: "sha256:allocated-return",
    valuation: { version: 2 as const, recognition: { version: 2, returnId: "return-v2" } as never },
    lines: [{ itemId: "item-1", locationId: "loc-1", quantity, unitCost: "0.01", sourceGoodsReceiptLineId: "receipt-line-1", allocatedValue, ...(direction === PurchaseCorrectionDirection.REVERSAL ? { sourceInventoryTransactionId: "original-movement" } : {}) }],
  }
}

it("uses verified fractional allocated cost for both movements and projection, consuming the final cent", async () => {
  let level = inventoryLevel({ quantityOnHand: decimal(1), quantityAvailable: decimal(1), averageCost: decimal("0.01"), totalValue: decimal("0.01") })
  mockedDb.inventoryLevel.findUnique.mockImplementation(async () => level)
  mockedDb.inventoryLevel.updateMany.mockImplementation(async ({ data }) => { level = { ...level, ...data, version: level.version + 1 }; return { count: 1 } })
  const draws = [["0.300", "0.00"], ["0.300", "0.00"], ["0.400", "0.01"]]
  for (const [index, [quantity, value]] of draws.entries()) {
    ;(validateReceiptReturnStockAllocationInTx as jest.Mock).mockResolvedValueOnce(new Map([["receipt-line-1", value]]))
    const result = await postPurchaseReturnStock({ ...allocatedReturnInput(quantity, value), idempotencyKey: `fractional-${index}` })
    expect(result.totalCost).toEqual(decimal(value))
  }
  expect(level.quantityOnHand).toEqual(decimal(0))
  expect(level.totalValue).toEqual(decimal(0))
  expect(mockedDb.inventoryTransaction.create.mock.calls.map(([args]) => args.data.totalCost.toFixed(2))).toEqual(["0.00", "0.00", "0.01"])
  expect(mockedDb.businessEvent.create.mock.calls[2][0].data.payload).toMatchObject({ valuationMethod: "RECEIPT_REMAINING_POOL_V2", lines: [expect.objectContaining({ receiptValuation: { version: 2, sourceGoodsReceiptLineId: "receipt-line-1", allocatedValue: "0.01", recognitionHash: expect.stringMatching(/^[a-f0-9]{64}$/) } })] })
})

it("preserves an explicitly allocated zero even when nominal quantity times unit cost rounds positive", async () => {
  mockedDb.inventoryLevel.findUnique.mockResolvedValue(inventoryLevel({ quantityOnHand: decimal("0.600"), quantityAvailable: decimal("0.600"), totalValue: decimal(0) }))
  ;(validateReceiptReturnStockAllocationInTx as jest.Mock).mockResolvedValue(new Map([["receipt-line-1", "0.00"]]))
  await postPurchaseReturnStock(allocatedReturnInput("0.600", "0.00"))
  expect(mockedDb.inventoryTransaction.create.mock.calls[0][0].data.totalCost).toEqual(decimal(0))
  expect(mockedDb.inventoryLevel.updateMany.mock.calls[0][0].data.totalValue).toEqual(decimal(0))
})

it("restores the exact allocated cent when reversing a fractional return", async () => {
  mockedDb.inventoryLevel.findUnique.mockResolvedValue(inventoryLevel({ quantityOnHand: decimal(0), quantityAvailable: decimal(0), totalValue: decimal(0) }))
  ;(validateReceiptReturnStockAllocationInTx as jest.Mock).mockResolvedValue(new Map([["receipt-line-1", "0.01"]]))
  await postPurchaseReturnStock(allocatedReturnInput("0.200", "0.01", PurchaseCorrectionDirection.REVERSAL))
  expect(mockedDb.inventoryTransaction.create.mock.calls[0][0].data).toMatchObject({ quantity: decimal("0.200"), totalCost: decimal("0.01"), reversalOfTransactionId: "original-movement" })
  expect(mockedDb.inventoryLevel.updateMany.mock.calls[0][0].data.totalValue).toEqual(decimal("0.01"))
})

it.each([["0.01", "0.00"], ["0.00", "0.01"]])("rejects projection value %s versus final source allocation %s instead of silently clamping", async (currentValue, allocatedValue) => {
  mockedDb.inventoryLevel.findUnique.mockResolvedValue(inventoryLevel({ quantityOnHand: decimal("0.400"), quantityAvailable: decimal("0.400"), totalValue: decimal(currentValue) }))
  ;(validateReceiptReturnStockAllocationInTx as jest.Mock).mockResolvedValue(new Map([["receipt-line-1", allocatedValue]]))
  await expect(postPurchaseReturnStock(allocatedReturnInput("0.400", allocatedValue))).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
  expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})

it("rejects unsupported explicit valuation before any stock transaction", () => {
  const input = allocatedReturnInput("0.300", "0.00")
  expect(() => postPurchaseReturnStock({ ...input, valuation: undefined })).toThrow("requires its retained source allocation")
  expect(mockedDb.$transaction).not.toHaveBeenCalled()
})

it("propagates allocation verification database failures without writing stock", async () => {
  const failure = new Error("source query unavailable")
  ;(validateReceiptReturnStockAllocationInTx as jest.Mock).mockRejectedValueOnce(failure)
  await expect(postPurchaseReturnStock(allocatedReturnInput("0.300", "0.00"))).rejects.toBe(failure)
  expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
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

it("consumes reserved delivery stock without reducing available quantity twice", async () => {
  mockedDb.inventoryLevel.findUnique.mockResolvedValueOnce(
    inventoryLevel({
      quantityOnHand: decimal("10.000"),
      quantityReserved: decimal("2.000"),
      quantityAvailable: decimal("8.000"),
    }),
  )

  await postDeliveryOrderStockIssue({
    organizationId: "org-1",
    salesOrderId: "order-1",
    goodsIssueId: "goods-issue-1",
    issueNumber: "GI-001",
    locationId: "loc-1",
    actorId: "warehouse-1",
    occurredAt: eventDate,
    idempotencyKey: "delivery-goods-issue:command-1",
    lines: [
      {
        salesOrderLineId: "line-1",
        itemId: "item-1",
        quantity: 2,
        unitCost: 100,
      },
    ],
  })

  expect(mockedDb.inventoryLevel.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        quantityOnHand: { gte: decimal("2.000") },
        quantityAvailable: { gte: decimal("0.000") },
        quantityReserved: { gte: decimal("2.000") },
      }),
      data: expect.objectContaining({
        quantityOnHand: decimal("8.000"),
        quantityReserved: decimal("0.000"),
        quantityAvailable: decimal("8.000"),
      }),
    }),
  )
  expect(mockedDb.inventoryTransaction.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        type: "SALE",
        quantity: decimal("-2.000"),
        referenceType: "SALES_ORDER",
        referenceId: "line-1",
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

  expect(mockedDb.businessEventAudit.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        action: "IDEMPOTENCY_CONFLICT",
        organizationId: "org-1",
        businessEventId: "event-existing-1",
        payloadHash: "sha256:previous-payload",
        attemptedPayloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    }),
  )
  expect(mockedDb.businessEventAnomaly.upsert).toHaveBeenCalledWith(expect.objectContaining({
    create: expect.objectContaining({ organizationId: "org-1", businessEventId: "event-existing-1", anomalyType: "IDEMPOTENCY_PAYLOAD_CONFLICT", status: "OPEN", severity: "HIGH" }),
  }))
  expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})

it("does not mutate stock when required conflict evidence cannot be recorded", async () => {
  mockedDb.businessEvent.findUnique.mockResolvedValueOnce({
    id: "event-existing-1", organizationId: "org-1", eventSource: "POS",
    idempotencyKey: "pos-sale-stock:org-1:sale-1", payloadHash: "sha256:previous-payload", outboxMessages: [],
  })
  mockedDb.businessEventAudit.create.mockRejectedValueOnce(new Error("Evidence store unavailable"))
  await expect(postPOSStockIssue({
    organizationId: "org-1", saleId: "sale-1", orderNumber: "POS-001", locationId: "loc-1", actorId: "cashier-1", occurredAt: eventDate,
    lines: [{ itemId: "item-1", quantity: 2, unitCost: 100 }],
  })).rejects.toThrow("Business-event conflict evidence could not be recorded")
  expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
  expect(mockedDb.businessEventAnomaly.upsert).not.toHaveBeenCalled()
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

it("defers Close invalidation for a prepared same-transaction reversal without exposing control in the event payload", async () => {
  const tx = { ...mockedDb } as Partial<typeof mockedDb>; delete tx.$transaction
  mockedDb.$queryRaw.mockResolvedValue([{ id: "period-1", organizationId: "org-1", status: "OPEN", startDate: new Date("2026-06-01"), endDate: new Date("2026-07-01") }])
  ;(validateReceiptReturnStockAllocationInTx as jest.Mock).mockResolvedValue(new Map([["receipt-line-1", "0.01"]]))
  await postPurchaseReturnStock(allocatedReturnInput("0.200", "0.01", PurchaseCorrectionDirection.REVERSAL), tx as unknown as Prisma.TransactionClient,
    { transaction: tx as unknown as Prisma.TransactionClient, organizationId: "org-1", affectedPeriodIds: ["period-1", "later-period"], deferCloseInvalidation: true })
  expect(mockedDb.inventoryTransaction.create).toHaveBeenCalled()
  expect(mockedDb.closeRun.findMany).not.toHaveBeenCalled()
  const payload = mockedDb.businessEvent.create.mock.calls[0][0].data.payload
  expect(payload).not.toHaveProperty("closeInvalidationControl"); expect(payload).not.toHaveProperty("affectedPeriodIds")
})
it("refuses a prepared stock context from a different transaction before writes", () => {
  const tx = {} as Prisma.TransactionClient
  expect(() => postPurchaseReturnStock(allocatedReturnInput("0.200", "0.01", PurchaseCorrectionDirection.REVERSAL), tx,
    { transaction: {} as Prisma.TransactionClient, organizationId: "org-1", affectedPeriodIds: ["period-1"], deferCloseInvalidation: true })).toThrow("same transaction")
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})
