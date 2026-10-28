import { db } from "@/prisma/db"
import { postGoodsReceiptStock } from "@/services/inventory/inventory-stock-event.service"
import { receiveItems } from "../purchase-order.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    goodsReceipt: {
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
  markBusinessEventAppliedInTx: jest.fn(),
  recordBusinessEventInTx: jest.fn(),
}))

const mockDb = db as unknown as {
  $transaction: jest.Mock
  goodsReceipt: { findFirst: jest.Mock }
  purchaseOrder: { findFirst: jest.Mock }
  serialNumber: { findMany: jest.Mock }
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
    mockDb.serialNumber.findMany.mockResolvedValue([])
    mockPostGoodsReceiptStock.mockResolvedValue(undefined)
  })

  it("auto-generates a receipt batch number for batch-tracked items when none is entered", async () => {
    const line = trackedLine()
    mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ lines: [line] }))

    const tx = {
      goodsReceipt: {
        create: jest.fn().mockResolvedValue({ id: "receipt-1" }),
      },
      goodsReceiptLine: {
        create: jest.fn().mockResolvedValue({ id: "receipt-line-1" }),
      },
      purchaseOrderLine: {
        update: jest.fn().mockResolvedValue({ id: "line-1" }),
        findMany: jest.fn().mockResolvedValue([
          { orderedQuantity: 3, receivedQuantity: 3 },
        ]),
      },
      purchaseOrder: {
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
  })
})