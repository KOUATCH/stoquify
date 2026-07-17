import { BusinessRuleError } from "@/services/_shared/action-errors"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  approvePurchaseOrder,
  deletePurchaseOrder,
  updatePurchaseOrder,
} from "../purchase-order.service"
import { db } from "@/prisma/db"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    purchaseOrder: {
      findFirst: jest.fn(),
    },
    supplier: {
      findFirst: jest.fn(),
    },
    location: {
      findFirst: jest.fn(),
    },
    item: {
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
  purchaseOrder: {
    findFirst: jest.Mock
  }
  supplier: {
    findFirst: jest.Mock
  }
  location: {
    findFirst: jest.Mock
  }
  item: {
    findMany: jest.Mock
  }
}

const mockRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock
const now = new Date("2026-06-16T10:00:00Z")

function purchaseOrderLine(overrides: Record<string, unknown> = {}) {
  return {
    id: "line-1",
    itemId: "item-1",
    orderedQuantity: 1,
    receivedQuantity: 0,
    unitCost: 100,
    discount: 0,
    taxRate: 0,
    taxAmount: 0,
    lineTotal: 100,
    notes: "",
    goodsReceiptLines: [],
    supplierInvoiceLines: [],
    item: {
      id: "item-1",
      nameEn: "Item",
      nameFr: null,
      sku: "SKU-1",
      descriptionEn: null,
      descriptionFr: null,
      costPrice: 100,
      trackSerialNumbers: false,
      trackBatches: false,
      trackExpiry: false,
    },
    ...overrides,
  }
}

function purchaseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "po-1",
    orderNumber: "PO-000001",
    status: "SUBMITTED",
    orderDate: now,
    expectedDeliveryDate: now,
    actualDeliveryDate: null,
    paymentTerms: "Net 30",
    notes: "",
    supplierId: "supplier-1",
    locationId: "loc-1",
    subtotal: 100,
    taxAmount: 0,
    shippingCost: 0,
    discount: 0,
    total: 100,
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
    approvedById: null,
    approvedBy: null,
    approvedAt: null,
    lines: [purchaseOrderLine()],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRecordBusinessEventInTx.mockResolvedValue({ event: { id: "business-event-1" }, created: true })
  mockMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "business-event-1" })
  mockDb.$transaction.mockImplementation(async (handler) =>
    handler({
      purchaseOrder: {
        update: jest.fn().mockResolvedValue(
          purchaseOrder({
            status: "APPROVED",
            approvedById: "approver-1",
            approvedAt: now,
          }),
        ),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    }),
  )
})

describe("purchase-order.service controls", () => {
  it("rejects self approval before updating the purchase order", async () => {
    mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ createdById: "buyer-1" }))

    await expect(approvePurchaseOrder("po-1", "org-1", "buyer-1")).rejects.toBeInstanceOf(BusinessRuleError)

    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("approves with audit evidence when the checker is different from the requester", async () => {
    const tx = {
      purchaseOrder: {
        update: jest.fn().mockResolvedValue(
          purchaseOrder({
            status: "APPROVED",
            approvedById: "approver-1",
            approvedAt: now,
          }),
        ),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ createdById: "buyer-1" }))

    const result = await approvePurchaseOrder("po-1", "org-1", "approver-1")

    expect(result.status).toBe("APPROVED")
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "po-1" },
        data: expect.objectContaining({
          status: "APPROVED",
          approvedById: "approver-1",
        }),
      }),
    )
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          userId: "approver-1",
          entityType: "PurchaseOrder",
          entityId: "po-1",
          action: "APPROVE_PURCHASE_ORDER",
        }),
      }),
    )
  })

  it("archives purchase orders with audit evidence instead of hard deleting lines or the order", async () => {
    const tx = {
      purchaseOrder: {
        update: jest.fn().mockResolvedValue({ id: "po-1" }),
        delete: jest.fn(),
      },
      purchaseOrderLine: {
        deleteMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    mockDb.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      status: "DRAFT",
      orderNumber: "PO-000001",
      createdById: "buyer-1",
      approvedById: null,
    })

    const orderNumber = await deletePurchaseOrder("po-1", "org-1", "manager-1")

    expect(orderNumber).toBe("PO-000001")
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "po-1" },
        data: expect.objectContaining({
          status: "CANCELLED",
          deletedAt: expect.any(Date),
        }),
      }),
    )
    expect(tx.purchaseOrderLine.deleteMany).not.toHaveBeenCalled()
    expect(tx.purchaseOrder.delete).not.toHaveBeenCalled()
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          userId: "manager-1",
          action: "ARCHIVE_PURCHASE_ORDER",
        }),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        organizationId: "org-1",
        eventType: "purchase_order.archived",
        eventSource: "INTERNAL",
        idempotencyKey: "purchase-order:archive:org-1:po-1",
        actorId: "manager-1",
        sourceType: "PURCHASE_ORDER",
        sourceId: "po-1",
        payload: expect.objectContaining({
          purchaseOrderId: "po-1",
          orderNumber: "PO-000001",
          fromStatus: "DRAFT",
          toStatus: "CANCELLED",
          archivedById: "manager-1",
        }),
        metadata: expect.objectContaining({
          gate: "priority-006-hard-delete-immutability",
          classification: "SOFT_DELETE_ARCHIVE",
        }),
      }),
    )
    expect(mockMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(tx, "org-1", "business-event-1")
  })

  it("reconciles editable draft lines with audit evidence instead of bulk deleting them", async () => {
    const existingLines = [
      purchaseOrderLine({ id: "line-1", itemId: "item-1" }),
      purchaseOrderLine({ id: "line-2", itemId: "item-2" }),
    ]
    const tx = {
      purchaseOrder: {
        update: jest.fn().mockResolvedValue({ id: "po-1" }),
        findUnique: jest.fn().mockResolvedValue(
          purchaseOrder({
            status: "DRAFT",
            subtotal: 150,
            total: 150,
            lines: [
              purchaseOrderLine({ id: "line-1", itemId: "item-1", orderedQuantity: 2, lineTotal: 100 }),
              purchaseOrderLine({ id: "line-3", itemId: "item-3", orderedQuantity: 1, unitCost: 50, lineTotal: 50 }),
            ],
          }),
        ),
      },
      purchaseOrderLine: {
        findMany: jest.fn().mockResolvedValue(existingLines),
        update: jest.fn().mockResolvedValue({ id: "line-1" }),
        create: jest.fn().mockResolvedValue({ id: "line-3", itemId: "item-3" }),
        delete: jest.fn().mockResolvedValue({ id: "line-2" }),
        deleteMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    mockDb.purchaseOrder.findFirst.mockResolvedValue(
      purchaseOrder({ status: "DRAFT", lines: existingLines }),
    )
    mockDb.item.findMany.mockResolvedValue([{ id: "item-1" }, { id: "item-3" }])

    const result = await updatePurchaseOrder({
      id: "po-1",
      organizationId: "org-1",
      updatedById: "editor-1",
      orderLines: [
        { itemId: "item-1", quantity: 2, unitPrice: 50 },
        { itemId: "item-3", quantity: 1, unitPrice: 50 },
      ],
    })

    expect(result.lines).toHaveLength(2)
    expect(tx.purchaseOrderLine.deleteMany).not.toHaveBeenCalled()
    expect(tx.purchaseOrderLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "line-1" },
        data: expect.objectContaining({
          itemId: "item-1",
          orderedQuantity: 2,
          unitCost: 50,
        }),
      }),
    )
    expect(tx.purchaseOrderLine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          purchaseOrderId: "po-1",
          itemId: "item-3",
          receivedQuantity: 0,
        }),
      }),
    )
    expect(tx.purchaseOrderLine.delete).toHaveBeenCalledWith({ where: { id: "line-2" } })
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          userId: "editor-1",
          entityType: "PurchaseOrder",
          entityId: "po-1",
          action: "RECONCILE_PURCHASE_ORDER_LINES",
          changes: expect.objectContaining({
            reconciled: expect.objectContaining({
              updated: [{ id: "line-1", itemId: "item-1" }],
              created: [{ id: "line-3", itemId: "item-3" }],
              removed: [{ id: "line-2", itemId: "item-2" }],
            }),
          }),
        }),
      }),
    )
  })

  it("rejects draft line reconciliation when receipt or invoice evidence exists", async () => {
    const protectedLines = [
      purchaseOrderLine({
        id: "line-1",
        itemId: "item-1",
        receivedQuantity: 1,
        goodsReceiptLines: [{ id: "gr-line-1" }],
      }),
    ]
    const tx = {
      purchaseOrder: {
        update: jest.fn().mockResolvedValue({ id: "po-1" }),
        findUnique: jest.fn(),
      },
      purchaseOrderLine: {
        findMany: jest.fn().mockResolvedValue(protectedLines),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    mockDb.purchaseOrder.findFirst.mockResolvedValue(
      purchaseOrder({ status: "DRAFT", lines: protectedLines }),
    )
    mockDb.item.findMany.mockResolvedValue([{ id: "item-1" }])

    await expect(
      updatePurchaseOrder({
        id: "po-1",
        organizationId: "org-1",
        updatedById: "editor-1",
        orderLines: [{ itemId: "item-1", quantity: 2, unitPrice: 50 }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.purchaseOrderLine.deleteMany).not.toHaveBeenCalled()
    expect(tx.purchaseOrderLine.delete).not.toHaveBeenCalled()
    expect(tx.purchaseOrderLine.update).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })

  it("rejects partially received purchase order edits before line reconciliation", async () => {
    mockDb.purchaseOrder.findFirst.mockResolvedValue(
      purchaseOrder({ status: "PARTIALLY_RECEIVED" }),
    )

    await expect(
      updatePurchaseOrder({
        id: "po-1",
        organizationId: "org-1",
        updatedById: "editor-1",
        orderLines: [{ itemId: "item-1", quantity: 2, unitPrice: 50 }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })
})
