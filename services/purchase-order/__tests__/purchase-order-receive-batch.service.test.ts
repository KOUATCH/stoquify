import { db } from "@/prisma/db"
import { postGoodsReceiptStock } from "@/services/inventory/inventory-stock-event.service"
import { receiveItems, resolveGoodsReceiptInspection } from "../purchase-order.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    goodsReceipt: {
      findFirst: jest.fn(),
    },
    goodsReceiptInspectionResolution: {
      findFirst: jest.fn(),
    },
    purchaseOrder: {
      findFirst: jest.fn(),
    },
    serialNumber: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock("@/services/inventory/inventory-stock-event.service", () => ({
  postGoodsReceiptStock: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn((value: unknown) =>
    require("node:crypto").createHash("sha256").update(JSON.stringify(value)).digest("hex"),
  ),
  markBusinessEventAppliedInTx: jest.fn(),
  recordBusinessEventInTx: jest.fn(),
}))

const mockDb = db as unknown as {
  $transaction: jest.Mock
  goodsReceipt: { findFirst: jest.Mock }
  goodsReceiptInspectionResolution: { findFirst: jest.Mock }
  purchaseOrder: { findFirst: jest.Mock }
}
const mockPostGoodsReceiptStock = postGoodsReceiptStock as jest.Mock
const now = new Date("2026-06-29T08:00:00Z")

function trackedLine(overrides: Record<string, unknown> = {}) {
  return {
    id: "line-1",
    itemId: "item-1",
    orderedQuantity: 3,
    receivedQuantity: 0,
    unitCost: 100,
    discount: 0,
    taxRate: 0,
    taxAmount: 0,
    lineTotal: 300,
    notes: "",
    item: {
      id: "item-1",
      nameEn: "Tracked Item",
      nameFr: null,
      sku: "SKU-1",
      descriptionEn: null,
      descriptionFr: null,
      costPrice: 100,
      trackSerialNumbers: false,
      trackBatches: true,
      trackExpiry: false,
    },
    ...overrides,
  }
}

function purchaseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "po-1",
    orderNumber: "PO-000001",
    status: "APPROVED",
    orderDate: now,
    expectedDeliveryDate: now,
    actualDeliveryDate: null,
    paymentTerms: "Net 30",
    notes: "",
    supplierId: "supplier-1",
    locationId: "loc-1",
    subtotal: 300,
    taxAmount: 0,
    shippingCost: 0,
    discount: 0,
    total: 300,
    supplier: {
      id: "supplier-1",
      name: "Supplier",
      code: "SUP-1",
      email: null,
      phone: null,
      contactPerson: null,
      organizationId: "org-1",
      createdAt: now,
      updatedAt: now,
      address: null,
      isActive: true,
      taxId: null,
      paymentTerms: null,
      notes: null,
    },
    location: { id: "loc-1", name: "Warehouse", address: null },
    organization: { id: "org-1", name: "Org" },
    createdById: "buyer-1",
    createdBy: { id: "buyer-1", firstName: "Buyer", lastName: "One", email: "buyer@example.com" },
    approvedById: "approver-1",
    approvedBy: { id: "approver-1", firstName: "Approver", lastName: "One", email: "approver@example.com" },
    approvedAt: now,
    lines: [trackedLine()],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe("purchase-order receiving batch defaults", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.goodsReceipt.findFirst.mockResolvedValue(null)
    mockDb.goodsReceiptInspectionResolution.findFirst.mockResolvedValue(null)
    mockPostGoodsReceiptStock.mockResolvedValue(undefined)
  })

  it("auto-generates a receipt batch number for batch-tracked items when none is entered", async () => {
    const line = trackedLine()

    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "po-1" }]),
      documentSequence: {
        upsert: jest.fn().mockResolvedValue({ nextValue: 2 }),
      },
      goodsReceipt: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "receipt-1" }),
      },
      goodsReceiptInspection: {
        create: jest.fn().mockResolvedValue({ id: "inspection-1" }),
      },
      serialNumber: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      goodsReceiptLine: {
        groupBy: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "receipt-line-1" }),
      },
      purchaseOrderLine: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([
          { orderedQuantity: 3, receivedQuantity: 3 },
        ]),
      },
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue(purchaseOrder({ lines: [line] })),
        update: jest.fn().mockResolvedValue({ id: "po-1", status: "RECEIVED" }),
        findUnique: jest.fn().mockResolvedValue(
          purchaseOrder({
            status: "RECEIVED",
            lines: [trackedLine({ receivedQuantity: 3 })],
          }),
        ),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))

    await receiveItems({
      purchaseOrderId: "po-1",
      organizationId: "org-1",
      receivedById: "receiver-1",
      idempotencyKey: "receipt:batch-default-1",
      inspectionOutcome: "PASSED",
      items: [{ lineId: "line-1", receivedQuantity: 3 }],
    })

    expect(tx.goodsReceiptLine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          batchNumber: "BATCH-GR-000001-SKU-1-LINE-1",
        }),
      }),
    )
    expect(mockPostGoodsReceiptStock).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            batchNumber: "BATCH-GR-000001-SKU-1-LINE-1",
          }),
        ],
      }),
      tx,
    )
    expect(tx.goodsReceipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idempotencyKey: "receipt:batch-default-1",
        payloadHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        finalizedAt: expect.any(Date),
      }),
    })
  })

  it("returns the finalized receipt on an exact idempotent replay without reposting stock", async () => {
    const po = purchaseOrder({ status: "RECEIVED", lines: [trackedLine({ receivedQuantity: 3 })] })
    const idempotencyKey = "receipt:exact-replay-1"
    const input = {
      purchaseOrderId: "po-1",
      organizationId: "org-1",
      receivedById: "receiver-1",
      idempotencyKey,
      inspectionOutcome: "PASSED" as const,
      items: [{ lineId: "line-1", receivedQuantity: 3 }],
    }

    const firstTx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "po-1" }]),
      documentSequence: { upsert: jest.fn().mockResolvedValue({ nextValue: 2 }) },
      goodsReceipt: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "receipt-1" }),
      },
      goodsReceiptInspection: {
        create: jest.fn().mockResolvedValue({ id: "inspection-1" }),
      },
      serialNumber: { findMany: jest.fn().mockResolvedValue([]) },
      goodsReceiptLine: {
        groupBy: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "receipt-line-1" }),
      },
      purchaseOrderLine: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ orderedQuantity: 3, receivedQuantity: 3 }]),
      },
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue(purchaseOrder()),
        update: jest.fn().mockResolvedValue({ id: "po-1" }),
        findUnique: jest.fn().mockResolvedValue(po),
      },
    }
    mockDb.$transaction.mockImplementationOnce(async (handler) => handler(firstTx))
    const first = await receiveItems(input)
    const payloadHash = firstTx.goodsReceipt.create.mock.calls[0][0].data.payloadHash

    const replayTx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "po-1" }]),
      goodsReceipt: {
        findFirst: jest.fn().mockResolvedValue({
          receiptNumber: "GR-000001",
          purchaseOrderId: "po-1",
          payloadHash,
          status: "RECEIVED",
        }),
      },
      purchaseOrder: { findFirst: jest.fn().mockResolvedValue(po) },
    }
    mockDb.$transaction.mockImplementationOnce(async (handler) => handler(replayTx))
    const replay = await receiveItems(input)

    expect(first.replayed).toBe(false)
    expect(replay).toMatchObject({ receiptNumber: "GR-000001", replayed: true })
    expect(mockPostGoodsReceiptStock).toHaveBeenCalledTimes(1)

    mockDb.$transaction.mockRejectedValueOnce({ code: "P2002", clientVersion: "test" })
    mockDb.goodsReceipt.findFirst.mockResolvedValue({
      receiptNumber: "GR-000001",
      purchaseOrderId: "po-1",
      payloadHash,
      status: "RECEIVED",
    })
    mockDb.purchaseOrder.findFirst.mockResolvedValue(po)

    const raceReplay = await receiveItems(input)

    expect(raceReplay).toMatchObject({ receiptNumber: "GR-000001", replayed: true })
    expect(mockDb.goodsReceipt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", idempotencyKey },
      }),
    )
  })

  it("rejects reuse of a receipt idempotency key with a different inspection payload", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "po-1" }]),
      goodsReceipt: {
        findFirst: jest.fn().mockResolvedValue({
          receiptNumber: "GR-000001",
          purchaseOrderId: "po-1",
          payloadHash: "0".repeat(64),
          status: "HELD",
        }),
      },
      purchaseOrder: { findFirst: jest.fn() },
    }
    mockDb.$transaction.mockImplementationOnce(async (handler) => handler(tx))

    await expect(receiveItems({
      purchaseOrderId: "po-1",
      organizationId: "org-1",
      receivedById: "receiver-1",
      idempotencyKey: "receipt:payload-conflict-1",
      inspectionOutcome: "PASSED",
      items: [{ lineId: "line-1", receivedQuantity: 3 }],
    })).rejects.toThrow("This receipt idempotency key was already used with a different payload.")

    expect(mockPostGoodsReceiptStock).not.toHaveBeenCalled()
    expect(tx.purchaseOrder.findFirst).not.toHaveBeenCalled()
  })

  it("persists a failed receiving inspection as held without posting available stock", async () => {
    const line = trackedLine()
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "po-1" }]),
      documentSequence: { upsert: jest.fn().mockResolvedValue({ nextValue: 2 }) },
      goodsReceipt: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "receipt-held" }),
      },
      goodsReceiptInspection: {
        create: jest.fn().mockResolvedValue({ id: "inspection-held" }),
      },
      serialNumber: { findMany: jest.fn().mockResolvedValue([]) },
      goodsReceiptLine: {
        groupBy: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "receipt-line-held" }),
      },
      purchaseOrderLine: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ orderedQuantity: 3, receivedQuantity: 3 }]),
      },
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue(purchaseOrder({ lines: [line] })),
        update: jest.fn().mockResolvedValue({ id: "po-1", status: "RECEIVED" }),
        findUnique: jest.fn().mockResolvedValue(
          purchaseOrder({ status: "RECEIVED", lines: [trackedLine({ receivedQuantity: 3 })] }),
        ),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))

    const result = await receiveItems({
      purchaseOrderId: "po-1",
      organizationId: "org-1",
      receivedById: "receiver-1",
      idempotencyKey: "receipt:failed-inspection-1",
      inspectionOutcome: "FAILED",
      inspectionReason: "Packaging damage requires review",
      inspectionEvidenceNotes: "Outer carton crushed",
      items: [{ lineId: "line-1", receivedQuantity: 3 }],
    })

    expect(result).toMatchObject({ receiptStatus: "HELD", inspectionOutcome: "FAILED", replayed: false })
    expect(tx.goodsReceipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "HELD", inventoryPostedAt: null }),
    })
    expect(tx.goodsReceiptInspection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        goodsReceiptId: "receipt-held",
        outcome: "FAILED",
        inspectedById: "receiver-1",
        reason: "Packaging damage requires review",
      }),
    })
    expect(mockPostGoodsReceiptStock).not.toHaveBeenCalled()
    expect(tx.purchaseOrderLine.updateMany).not.toHaveBeenCalled()
    expect(tx.purchaseOrder.update).not.toHaveBeenCalled()
  })

  it("reserves held arrival quantity in the locked overreceipt check", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "po-1" }]),
      documentSequence: { upsert: jest.fn().mockResolvedValue({ nextValue: 3 }) },
      goodsReceipt: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      goodsReceiptLine: {
        groupBy: jest.fn().mockResolvedValue([
          { purchaseOrderLineId: "line-1", _sum: { receivedQuantity: 3 } },
        ]),
      },
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue(purchaseOrder()),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))

    await expect(receiveItems({
      purchaseOrderId: "po-1",
      organizationId: "org-1",
      receivedById: "receiver-2",
      idempotencyKey: "receipt:held-reservation-1",
      inspectionOutcome: "PASSED",
      items: [{ lineId: "line-1", receivedQuantity: 1 }],
    })).rejects.toThrow('Cannot receive 1 of "Tracked Item". Only 0 remaining.')

    expect(tx.goodsReceiptLine.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          goodsReceipt: expect.objectContaining({ status: "HELD" }),
        }),
      }),
    )
    expect(tx.goodsReceipt.create).not.toHaveBeenCalled()
    expect(mockPostGoodsReceiptStock).not.toHaveBeenCalled()
  })

  it("releases a held inspection once and returns an exact idempotent replay without reposting stock", async () => {
    const input = {
      goodsReceiptId: "receipt-held",
      organizationId: "org-1",
      resolvedById: "receiver-lead",
      decision: "ACCEPT" as const,
      reason: "Contents verified undamaged",
      idempotencyKey: "inspection-resolution:accept-1",
    }
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "locked" }]),
      goodsReceiptInspectionResolution: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "resolution-1" }),
      },
      goodsReceipt: {
        findFirst: jest.fn().mockResolvedValue({
          id: "receipt-held",
          receiptNumber: "GR-000001",
          purchaseOrderId: "po-1",
          locationId: "loc-1",
          status: "HELD",
          inspection: { id: "inspection-1", outcome: "FAILED" },
          inspectionResolution: null,
          lines: [{
            id: "receipt-line-1",
            purchaseOrderLineId: "line-1",
            itemId: "item-1",
            receivedQuantity: 3,
            unitCost: 100,
            batchNumber: "BATCH-1",
            expiryDate: null,
            serialNumbers: [],
          }],
        }),
        update: jest.fn().mockResolvedValue({ id: "receipt-held" }),
      },
      purchaseOrderLine: {
        findFirst: jest.fn().mockResolvedValue({
          id: "line-1",
          orderedQuantity: 3,
          receivedQuantity: 0,
          item: { nameEn: "Tracked Item", sku: "SKU-1" },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ orderedQuantity: 3, receivedQuantity: 3 }]),
      },
      purchaseOrder: {
        update: jest.fn().mockResolvedValue({ id: "po-1", status: "RECEIVED" }),
      },
      serialNumber: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    }
    mockDb.$transaction.mockImplementationOnce(async (handler) => handler(tx))

    const first = await resolveGoodsReceiptInspection(input)
    const payloadHash = tx.goodsReceiptInspectionResolution.create.mock.calls[0][0].data.payloadHash

    const replayTx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "receipt-held" }]),
      goodsReceiptInspectionResolution: {
        findFirst: jest.fn().mockResolvedValue({
          goodsReceiptId: "receipt-held",
          payloadHash,
          decision: "ACCEPT",
          goodsReceipt: {
            receiptNumber: "GR-000001",
            purchaseOrderId: "po-1",
            status: "RECEIVED",
          },
        }),
      },
    }
    mockDb.$transaction.mockImplementationOnce(async (handler) => handler(replayTx))
    const replay = await resolveGoodsReceiptInspection(input)

    expect(first).toMatchObject({ receiptStatus: "RECEIVED", decision: "ACCEPT", replayed: false })
    expect(replay).toMatchObject({ receiptStatus: "RECEIVED", decision: "ACCEPT", replayed: true })
    expect(mockPostGoodsReceiptStock).toHaveBeenCalledTimes(1)

    mockDb.$transaction.mockRejectedValueOnce({ code: "P2002", clientVersion: "test" })
    mockDb.goodsReceiptInspectionResolution.findFirst.mockResolvedValue({
      goodsReceiptId: "receipt-held",
      payloadHash,
      decision: "ACCEPT",
      goodsReceipt: {
        receiptNumber: "GR-000001",
        purchaseOrderId: "po-1",
        status: "RECEIVED",
      },
    })

    const raceReplay = await resolveGoodsReceiptInspection(input)

    expect(raceReplay).toMatchObject({ receiptStatus: "RECEIVED", decision: "ACCEPT", replayed: true })
    expect(mockDb.goodsReceiptInspectionResolution.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", idempotencyKey: "inspection-resolution:accept-1" },
      }),
    )
    expect(tx.purchaseOrderLine.updateMany).toHaveBeenCalledWith({
      where: { id: "line-1", purchaseOrderId: "po-1", receivedQuantity: 0 },
      data: { receivedQuantity: { increment: 3 } },
    })
    expect(tx.goodsReceipt.update).toHaveBeenCalledWith({
      where: { id: "receipt-held" },
      data: { status: "RECEIVED", inventoryPostedAt: expect.any(Date) },
    })
  })

  it("rejects reuse of a resolution idempotency key with a different payload", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "receipt-held" }]),
      goodsReceiptInspectionResolution: {
        findFirst: jest.fn().mockResolvedValue({
          goodsReceiptId: "receipt-held",
          payloadHash: "different-payload-hash",
          decision: "ACCEPT",
          goodsReceipt: {
            receiptNumber: "GR-000001",
            purchaseOrderId: "po-1",
            status: "RECEIVED",
          },
        }),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))

    await expect(resolveGoodsReceiptInspection({
      goodsReceiptId: "receipt-held",
      organizationId: "org-1",
      resolvedById: "receiver-lead",
      decision: "REJECT",
      reason: "Changed decision",
      idempotencyKey: "inspection-resolution:accept-1",
    })).rejects.toThrow(
      "This inspection resolution idempotency key was already used with a different payload.",
    )

    expect(mockPostGoodsReceiptStock).not.toHaveBeenCalled()
  })

  it("rejects a held inspection without stock, accounting availability, or accepted PO quantity", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "locked" }]),
      goodsReceiptInspectionResolution: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "resolution-reject" }),
      },
      goodsReceipt: {
        findFirst: jest.fn().mockResolvedValue({
          id: "receipt-held",
          receiptNumber: "GR-000002",
          purchaseOrderId: "po-1",
          locationId: "loc-1",
          status: "HELD",
          inspection: { id: "inspection-2", outcome: "INCOMPLETE" },
          inspectionResolution: null,
          lines: [{
            id: "receipt-line-2",
            purchaseOrderLineId: "line-1",
            itemId: "item-1",
            receivedQuantity: 3,
            unitCost: 100,
            batchNumber: null,
            expiryDate: null,
            serialNumbers: [],
          }],
        }),
        update: jest.fn().mockResolvedValue({ id: "receipt-held" }),
      },
      purchaseOrderLine: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ orderedQuantity: 3, receivedQuantity: 0 }]),
      },
      purchaseOrder: { update: jest.fn().mockResolvedValue({ id: "po-1", status: "APPROVED" }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-reject" }) },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))

    const result = await resolveGoodsReceiptInspection({
      goodsReceiptId: "receipt-held",
      organizationId: "org-1",
      resolvedById: "receiver-lead",
      decision: "REJECT",
      reason: "Required quality evidence was not supplied",
      idempotencyKey: "inspection-resolution:reject-1",
    })

    expect(result).toMatchObject({ receiptStatus: "REJECTED", decision: "REJECT", replayed: false })
    expect(mockPostGoodsReceiptStock).not.toHaveBeenCalled()
    expect(tx.purchaseOrderLine.updateMany).not.toHaveBeenCalled()
    expect(tx.purchaseOrder.update).not.toHaveBeenCalled()
    expect(tx.goodsReceipt.update).toHaveBeenCalledWith({
      where: { id: "receipt-held" },
      data: { status: "REJECTED", inventoryPostedAt: null },
    })
  })

  it("enforces tenant scope before resolving inspection evidence", async () => {
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]) }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))

    await expect(resolveGoodsReceiptInspection({
      goodsReceiptId: "receipt-other-tenant",
      organizationId: "org-1",
      resolvedById: "receiver-lead",
      decision: "ACCEPT",
      reason: "Verified",
      idempotencyKey: "inspection-resolution:tenant-1",
    })).rejects.toThrow("Goods receipt not found")

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1)
    expect(mockPostGoodsReceiptStock).not.toHaveBeenCalled()
  })

  it("normalizes unexpected receipt transaction failures without leaking details", async () => {
    mockDb.$transaction.mockRejectedValueOnce(new Error("goods_receipts SQL failed"))

    await expect(receiveItems({
      purchaseOrderId: "po-1",
      organizationId: "org-1",
      receivedById: "receiver-1",
      idempotencyKey: "receipt:unexpected-failure-1",
      inspectionOutcome: "PASSED",
      items: [{ lineId: "line-1", receivedQuantity: 1 }],
    })).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500,
      expose: false,
      message: "Goods receipt could not be completed safely.",
    })

    expect(mockDb.goodsReceipt.findFirst).not.toHaveBeenCalled()
  })

  it("returns a typed conflict when a receipt P2002 has no replay record", async () => {
    mockDb.$transaction.mockRejectedValueOnce({ code: "P2002" })
    mockDb.goodsReceipt.findFirst.mockResolvedValueOnce(null)

    await expect(receiveItems({
      purchaseOrderId: "po-1",
      organizationId: "org-1",
      receivedById: "receiver-1",
      idempotencyKey: "receipt:orphan-conflict-1",
      inspectionOutcome: "PASSED",
      items: [{ lineId: "line-1", receivedQuantity: 1 }],
    })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "A concurrent goods receipt conflict was detected. Refresh and retry.",
    })

    expect(mockDb.goodsReceipt.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        idempotencyKey: "receipt:orphan-conflict-1",
      },
      select: {
        receiptNumber: true,
        purchaseOrderId: true,
        payloadHash: true,
        status: true,
      },
    })
  })

  it("normalizes unexpected inspection-resolution transaction failures without leaking details", async () => {
    mockDb.$transaction.mockRejectedValueOnce(new Error("inspection SQL failed"))

    await expect(resolveGoodsReceiptInspection({
      goodsReceiptId: "receipt-held",
      organizationId: "org-1",
      resolvedById: "receiver-lead",
      decision: "ACCEPT",
      reason: "Verified",
      idempotencyKey: "inspection-resolution:unexpected-failure-1",
    })).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500,
      expose: false,
      message: "Goods receipt inspection resolution could not be completed safely.",
    })

    expect(mockDb.goodsReceiptInspectionResolution.findFirst).not.toHaveBeenCalled()
  })

  it("returns a typed conflict when an inspection P2002 has no replay record", async () => {
    mockDb.$transaction.mockRejectedValueOnce({ code: "P2002" })
    mockDb.goodsReceiptInspectionResolution.findFirst.mockResolvedValueOnce(null)

    await expect(resolveGoodsReceiptInspection({
      goodsReceiptId: "receipt-held",
      organizationId: "org-1",
      resolvedById: "receiver-lead",
      decision: "ACCEPT",
      reason: "Verified",
      idempotencyKey: "inspection-resolution:orphan-conflict-1",
    })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "A concurrent inspection resolution conflict was detected. Refresh and retry.",
    })

    expect(mockDb.goodsReceiptInspectionResolution.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        idempotencyKey: "inspection-resolution:orphan-conflict-1",
      },
      select: {
        goodsReceiptId: true,
        payloadHash: true,
        decision: true,
        goodsReceipt: {
          select: { receiptNumber: true, purchaseOrderId: true, status: true },
        },
      },
    })
  })
})
