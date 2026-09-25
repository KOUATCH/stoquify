import { purchaseOrderEditDefaults, purchaseOrderEditPayload } from "@/components/purchase-orders/purchase-order-edit-model"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  approvePurchaseOrder,
  bulkUpdateStatus,
  closePurchaseOrder,
  createPurchaseOrder,
  clonePurchaseOrder,
  deletePurchaseOrder,
  submitPurchaseOrder,
  transformPO,
  updatePurchaseOrder,
} from "../purchase-order.service"
import { db } from "@/prisma/db"
import { purchaseOrderEditRevision } from "../purchase-order-edit-record"
import { purchaseApprovalSnapshot } from "../purchase-order-approval"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import type { PurchaseLifecycleKind } from "../purchase-order-lifecycle-contracts"
jest.mock("../purchase-order-lifecycle", () => ({ ...jest.requireActual("../purchase-order-lifecycle"), purchaseLifecycleAuthority: jest.fn().mockResolvedValue({ requiresFreshAuth: false }), replayPurchaseLifecycle: jest.fn().mockResolvedValue(null) }))
import { purchaseApprovalRevision } from "../purchase-order-approval"
jest.mock("../purchase-order-approval", () => ({ ...jest.requireActual("../purchase-order-approval"), purchaseApprovalAuthority: jest.fn().mockResolvedValue({ fresh: true }), replayPurchaseApproval: jest.fn().mockResolvedValue(null) }))
jest.mock("../purchase-order-edit-record", () => ({ ...jest.requireActual("../purchase-order-edit-record"), assertPurchaseOrderEditAuthority: jest.fn(), replayPurchaseOrderEdit: jest.fn().mockResolvedValue(null) }))

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    purchaseOrder: {
      findFirst: jest.fn(),
    },
    goodsReceipt: {
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
  hashBusinessPayload: jest.requireActual("@/services/events/business-event.service").hashBusinessPayload,
  markBusinessEventAppliedInTx: jest.fn(),
  recordBusinessEventInTx: jest.fn(),
}))

const mockDb = db as unknown as {
  $transaction: jest.Mock
  purchaseOrder: {
    findFirst: jest.Mock
  }
  goodsReceipt: {
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
const defaultOrderWrite = jest.fn()
function withOrderContext<T extends { purchaseOrder?: object; $queryRaw?: unknown }>(tx: T) {
  return Object.assign(tx, { $queryRaw: jest.fn().mockResolvedValue([{ id: "po-1" }]), supplier: mockDb.supplier, location: mockDb.location, item: mockDb.item, goodsReceipt: mockDb.goodsReceipt, ...tx,
    purchaseOrder: { findFirst: mockDb.purchaseOrder.findFirst, findUniqueOrThrow: jest.fn().mockResolvedValue({ organization: { currency: "XAF" }, _count: lifecycleEvidence.counts, goodsReceipts: [] }), ...tx.purchaseOrder } })
}
const lifecycleEvidence = { counts: { goodsReceipts: 0, payments: 0, supplierInvoices: 0, threeWayMatches: 0, acknowledgementEnvelopes: 0, purchaseReturns: 0, supplierCreditNotes: 0 }, receipts: [] };
const lifecycleContext = (kind: PurchaseLifecycleKind, order: ReturnType<typeof purchaseOrder>, actorId = "manager-1") => ({ organizationId: "org-1", actorId, sessionId: "session-1", sessionToken: "owned-test-token", kind, expectedRevision: hashBusinessPayload({ version: 1, order: purchaseApprovalSnapshot(order as never), evidence: { ...lifecycleEvidence, currency: "XAF", labels: { supplier: order.supplier.name, location: order.location.name, lines: order.lines.map(line => ({ id: line.id, nameEn: line.item.nameEn, nameFr: line.item.nameFr ?? line.item.nameEn })).sort((a, b) => a.id.localeCompare(b.id)) } } }), idempotencyKey: "lifecycle-" + order.id, ...(kind === "cancel" ? { reason: "No longer required" } : {}) });
const editContext = (source: ReturnType<typeof purchaseOrder>) => ({ expectedRevision: purchaseOrderEditRevision(source as never), idempotencyKey: "request-001", sessionId: "session-1", sessionToken: "owned-test-token" })
const approvalContext = (actorId: string, source = purchaseOrder()) => ({ ...editContext(source), organizationId: "org-1", actorId, expectedRevision: purchaseApprovalRevision(source as never) })

function stoppedPurchasingTx() {
  return { $queryRaw: jest.fn().mockImplementation(async (query) => query.sql.includes('FROM "organizations"') ? [{ id: "org-1" }] : [{ newWorkStoppedModules: ["purchasing"], newWorkStoppedAt: { purchasing: "2026-09-05T10:00:00Z" } }]),
    documentSequence: { upsert: jest.fn() }, purchaseOrder: { create: jest.fn() }, purchaseOrderLine: { createMany: jest.fn() } }
}

it("blocks new purchase orders before document allocation and writes under the tenant admission policy", async () => {
  jest.clearAllMocks()
  const tx = stoppedPurchasingTx()
  mockDb.$transaction.mockImplementation(async handler => handler(withOrderContext(tx)))
  mockDb.supplier.findFirst.mockResolvedValue({ id: "supplier-1" })
  mockDb.location.findFirst.mockResolvedValue({ id: "loc-1" })
  mockDb.item.findMany.mockResolvedValue([{ id: "item-1" }])
  await expect(createPurchaseOrder({ organizationId: "org-1", supplierId: "supplier-1", locationId: "loc-1", createdById: "buyer-1", date: "2026-09-05", expectedDeliveryDate: "2026-09-06", orderLines: [{ itemId: "item-1", quantity: 1, unitPrice: 100 }] })).rejects.toMatchObject({ name: "ModuleNewWorkStoppedError" })
  expect(tx.documentSequence.upsert).not.toHaveBeenCalled()
  expect(tx.purchaseOrder.create).not.toHaveBeenCalled()
  expect(tx.$queryRaw.mock.calls.every(([query]) => query.values.includes("org-1"))).toBe(true)
})

it("blocks purchase-order cloning from creating a new aggregate while its source remains readable", async () => {
  jest.clearAllMocks()
  const tx = stoppedPurchasingTx()
  mockDb.$transaction.mockImplementation(async handler => handler(withOrderContext(tx)))
  mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder())
  await expect(clonePurchaseOrder({ id: "po-1", organizationId: "org-1" }, "buyer-1")).rejects.toMatchObject({ name: "ModuleNewWorkStoppedError" })
  expect(mockDb.purchaseOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "po-1", organizationId: "org-1", deletedAt: null } }))
  expect(tx.documentSequence.upsert).not.toHaveBeenCalled()
  expect(tx.purchaseOrder.create).not.toHaveBeenCalled()
  expect(tx.purchaseOrderLine.createMany).not.toHaveBeenCalled()
})

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
    organizationId: "org-1",
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
  defaultOrderWrite.mockResolvedValue(purchaseOrder({ status: "APPROVED", approvedById: "approver-1", approvedAt: now }))
  mockDb.$transaction.mockImplementation(async (handler) =>
    handler(withOrderContext({
      purchaseOrder: {
        update: defaultOrderWrite,
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    })),
  )
})

describe("purchase-order.service controls", () => {
  it("preserves the requester and approver identifiers in the read model used by capability projection", () => {
    const value = transformPO(purchaseOrder({ createdById: "requester", approvedById: "checker" }) as never)
    expect(value.createdById).toBe("requester")
    expect(value.approvedById).toBe("checker")
  })
  it.each(["RECEIVED", "PARTIALLY_RECEIVED"] as const)("rejects bulk %s without a receiving record", async toStatus => {
    await expect(bulkUpdateStatus({ organizationId: "org-1", purchaseOrderIds: ["po-1"], toStatus })).rejects.toBeInstanceOf(BusinessRuleError)
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("rejects an empty bulk selection before opening a transaction", async () => {
    await expect(bulkUpdateStatus({ organizationId: "org-1", purchaseOrderIds: [], toStatus: "SUBMITTED" })).rejects.toBeInstanceOf(BusinessRuleError)
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("rejects empty submission and approval using the current order", async () => {
    mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ status: "DRAFT", lines: [] }))
    await expect(submitPurchaseOrder("po-1", "org-1", lifecycleContext("submit", purchaseOrder({ status: "DRAFT", lines: [] })))).rejects.toThrow("without line items")
    mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ status: "SUBMITTED", lines: [] }))
    await expect(approvePurchaseOrder("po-1", "org-1", "checker-1", approvalContext("checker-1", purchaseOrder({ status: "SUBMITTED", lines: [] })))).rejects.toThrow("without line items")
    expect(defaultOrderWrite).not.toHaveBeenCalled()
  })

  it("rejects completion when status says received but quantities remain outstanding", async () => {
    mockDb.goodsReceipt.findFirst.mockResolvedValue(null)
    mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ status: "RECEIVED", lines: [purchaseOrderLine({ orderedQuantity: "10.125", receivedQuantity: "10.124" })] }))
    await expect(closePurchaseOrder("po-1", "org-1", lifecycleContext("complete", purchaseOrder({ status: "RECEIVED", lines: [purchaseOrderLine({ orderedQuantity: "10.125", receivedQuantity: "10.124" })] })))).rejects.toThrow("all ordered quantities")
    expect(defaultOrderWrite).not.toHaveBeenCalled()
  })

  it("bulk submission uses each reviewed version, deduplicates selection and reports unavailable orders", async () => {
    const valid = purchaseOrder({ id: "valid", status: "DRAFT" }), empty = purchaseOrder({ id: "empty", status: "DRAFT", lines: [] })
    mockDb.purchaseOrder.findFirst.mockImplementation(({ where }) => where.id === "valid" ? valid : where.id === "empty" ? empty : null)
    mockDb.supplier.findFirst.mockResolvedValue({ id: "supplier-1" }); mockDb.location.findFirst.mockResolvedValue({ id: "loc-1" }); mockDb.item.findMany.mockResolvedValue([{ id: "item-1" }])
    const { organizationId, actorId, sessionId, sessionToken, ...validRequest } = lifecycleContext("submit", valid)
    const { organizationId: _org, actorId: _actor, sessionId: _session, sessionToken: _token, ...emptyRequest } = lifecycleContext("submit", empty)
    const result = await bulkUpdateStatus({ organizationId, purchaseOrderIds: ["valid", "empty", "valid", "missing"], toStatus: "SUBMITTED", reviewedRequests: [{ id: "valid", request: validRequest }, { id: "empty", request: emptyRequest }, { id: "missing", request: { ...validRequest, idempotencyKey: "lifecycle-missing" } }] }, { organizationId, actorId, sessionId, sessionToken })
    expect(result.updated).toEqual(["valid"]); expect(result.failed.map(row => row.id)).toEqual(["empty", "missing"]); expect(defaultOrderWrite).toHaveBeenCalledTimes(1)
  })

  it("blocks order completion while a tenant-scoped receipt is held for inspection", async () => {
    mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ status: "RECEIVED" }))
    mockDb.goodsReceipt.findFirst.mockResolvedValue({ receiptNumber: "GR-000009" })

    await expect(closePurchaseOrder("po-1", "org-1", lifecycleContext("complete", purchaseOrder({ status: "RECEIVED" })))).rejects.toThrow(
      "Purchase order cannot be completed while goods receipt GR-000009 is held for inspection.",
    )

    expect(mockDb.goodsReceipt.findFirst).toHaveBeenCalledWith({
      where: {
        purchaseOrderId: "po-1",
        organizationId: "org-1",
        status: "HELD",
        deletedAt: null,
      },
      select: { receiptNumber: true },
    })
    expect(defaultOrderWrite).not.toHaveBeenCalled()
  })

  it("rejects bulk approval before opening a transaction", async () => {
    await expect(
      bulkUpdateStatus({
        organizationId: "org-1",
        purchaseOrderIds: ["po-1"],
        toStatus: "APPROVED",
      }),
    ).rejects.toThrow(
      "Purchase orders cannot be approved in bulk. Use the canonical approval workflow for each order.",
    )

    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("keeps reviewed cancellation available in a batch without modifying order notes", async () => {
    const order = purchaseOrder(), { organizationId, actorId, sessionId, sessionToken, ...request } = lifecycleContext("cancel", order)
    mockDb.purchaseOrder.findFirst.mockResolvedValue(order)
    const result = await bulkUpdateStatus({ organizationId, purchaseOrderIds: ["po-1"], toStatus: "CANCELLED", reason: request.reason, reviewedRequests: [{ id: "po-1", request }] }, { organizationId, actorId, sessionId, sessionToken })
    expect(result).toEqual({ updated: ["po-1"], failed: [] })
    expect(defaultOrderWrite).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CANCELLED", updatedAt: expect.any(Date), deletedAt: undefined } }))
  })

  it("rejects self approval before updating the purchase order", async () => {
    mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ createdById: "buyer-1" }))

    await expect(approvePurchaseOrder("po-1", "org-1", "buyer-1", approvalContext("buyer-1"))).rejects.toMatchObject({ code: "SOD_VIOLATION" })

    expect(defaultOrderWrite).not.toHaveBeenCalled()
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
    mockDb.$transaction.mockImplementation(async (handler) => handler(withOrderContext(tx)))
    mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ createdById: "buyer-1" }))

    const result = await approvePurchaseOrder("po-1", "org-1", "approver-1", approvalContext("approver-1"))

    expect(result.approvalReceipt).toMatchObject({ orderId: "po-1", approvedById: "approver-1", replayed: false, reviewedRevision: approvalContext("approver-1").expectedRevision })
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "po-1", organizationId: "org-1", deletedAt: null, status: "SUBMITTED" },
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
    mockDb.$transaction.mockImplementation(async (handler) => handler(withOrderContext(tx)))
    mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ status: "DRAFT" }))

    const orderNumber = await deletePurchaseOrder("po-1", "org-1", "manager-1", lifecycleContext("archive", purchaseOrder({ status: "DRAFT" })))

    expect(orderNumber.lifecycleReceipt).toMatchObject({ kind: "archive", archived: true, replayed: false })
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "po-1", organizationId: "org-1", deletedAt: null, status: "DRAFT" },
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
        idempotencyKey: "purchase-order-lifecycle:lifecycle-po-1",
        actorId: "manager-1",
        sourceId: "po-1",
        payload: expect.objectContaining({ entityType: "PurchaseOrder", result: expect.objectContaining({ orderId: "po-1", fromStatus: "DRAFT", toStatus: "CANCELLED", actorId: "manager-1", archived: true }) }),
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
        findUniqueOrThrow: jest.fn().mockResolvedValue(
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
    mockDb.$transaction.mockImplementation(async (handler) => handler(withOrderContext(tx)))
    mockDb.purchaseOrder.findFirst.mockResolvedValue(
      purchaseOrder({ status: "DRAFT", lines: existingLines }),
    )
    mockDb.item.findMany.mockResolvedValue([{ id: "item-1" }, { id: "item-3" }])

    const result = await updatePurchaseOrder({
      ...editContext(purchaseOrder({ status: "DRAFT", lines: existingLines })),
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
    mockDb.$transaction.mockImplementation(async (handler) => handler(withOrderContext(tx)))
    mockDb.purchaseOrder.findFirst.mockResolvedValue(
      purchaseOrder({ status: "DRAFT", lines: protectedLines }),
    )
    mockDb.item.findMany.mockResolvedValue([{ id: "item-1" }])

    await expect(
      updatePurchaseOrder({
        ...editContext(purchaseOrder({ status: "DRAFT", lines: protectedLines })),
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
        ...editContext(purchaseOrder({ status: "PARTIALLY_RECEIVED" })),
        id: "po-1",
        organizationId: "org-1",
        updatedById: "editor-1",
        orderLines: [{ itemId: "item-1", quantity: 2, unitPrice: 50 }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(defaultOrderWrite).not.toHaveBeenCalled()
  })
})

describe("purchase order editor financial round trip", () => {
  it("persists unchanged percentage tax, one line discount and original notes through the real update calculation", async () => {
    const sourceLine = purchaseOrderLine({ orderedQuantity: 2, unitCost: 100, taxRate: 19.25, taxAmount: 38.5, discount: 10, lineTotal: 228.5, notes: "Original supplier note" })
    const source = purchaseOrder({ status: "DRAFT", subtotal: 200, taxAmount: 38.5, discount: 10, shippingCost: 15, total: 243.5, lines: [sourceLine] })
    const tx = {
      purchaseOrder: { update: jest.fn().mockResolvedValue(source), findUniqueOrThrow: jest.fn().mockResolvedValue(source) },
      purchaseOrderLine: { findMany: jest.fn().mockResolvedValue([sourceLine]), update: jest.fn().mockResolvedValue(sourceLine), create: jest.fn(), delete: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-roundtrip" }) },
    }
    mockDb.purchaseOrder.findFirst.mockResolvedValue(source)
    mockDb.supplier.findFirst.mockResolvedValue({ id: source.supplier.id })
    mockDb.location.findFirst.mockResolvedValue({ id: source.locationId })
    mockDb.item.findMany.mockResolvedValue([{ id: sourceLine.itemId }])
    mockDb.$transaction.mockImplementation(async (handler) => handler(withOrderContext(tx)))
    const input = purchaseOrderEditPayload(source as never, "org-1", purchaseOrderEditDefaults(source as never), editContext(source))
    await updatePurchaseOrder({ ...input, ...editContext(source), updatedById: "editor-1" })
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ subtotal: 200, taxAmount: 38.5, discount: 10, shippingCost: 15, total: 243.5 }) }))
    expect(tx.purchaseOrderLine.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ orderedQuantity: 2, unitCost: 100, taxRate: 19.25, taxAmount: 38.5, discount: 10, lineTotal: 228.5, notes: "Original supplier note" }) }))
  })
})
