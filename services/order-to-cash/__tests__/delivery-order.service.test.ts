jest.mock("@/prisma/db", () => ({
  db: { $transaction: jest.fn() },
}))

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn((value: unknown) => `hash:${JSON.stringify(value)}`),
  recordBusinessEventInTx: jest.fn(),
  markBusinessEventAppliedInTx: jest.fn(),
}))

jest.mock("@/services/inventory/inventory-stock-event.service", () => ({
  postDeliveryOrderReservation: jest.fn(),
  postDeliveryOrderStockIssue: jest.fn(),
}))

jest.mock("@/services/accounting/postings/post-delivery-order", () => ({
  postDeliveryGoodsIssueAccounting: jest.fn(),
  postDeliveryInvoiceAccounting: jest.fn(),
}))

jest.mock("@/services/accounting/customer-receivable-document.service", () => ({
  CUSTOMER_RECEIVABLE_REFERENCE_TYPE: "CUSTOMER_RECEIVABLE_DOCUMENT",
  ensurePostedCustomerReceivableDocumentInTx: jest.fn(),
}))

jest.mock("@/services/accounting/customer-ledger.service", () => ({
  createCustomerLedgerEntry: jest.fn(),
}))

jest.mock("@/services/compliance/fiscal-document.service", () => ({
  createFiscalDocumentFromPostedSource: jest.fn(),
}))

jest.mock("@/services/compliance/country-pack-hooks", () => ({
  resolveEInvoicingMetadata: jest.fn(),
}))

import { Prisma, SalesOrderStatus } from "@prisma/client"
import { db } from "@/prisma/db"
import { createCustomerLedgerEntry } from "@/services/accounting/customer-ledger.service"
import { ensurePostedCustomerReceivableDocumentInTx } from "@/services/accounting/customer-receivable-document.service"
import {
  postDeliveryGoodsIssueAccounting,
  postDeliveryInvoiceAccounting,
} from "@/services/accounting/postings/post-delivery-order"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  postDeliveryOrderReservation,
  postDeliveryOrderStockIssue,
} from "@/services/inventory/inventory-stock-event.service"
import {
  confirmDeliveryOrder,
  createDeliveryBillingOutcome,
  postDeliveryGoodsIssue,
} from "../delivery-order.service"

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockRecordEvent = recordBusinessEventInTx as jest.Mock
const mockMarkEvent = markBusinessEventAppliedInTx as jest.Mock
const mockHash = hashBusinessPayload as jest.Mock
const mockReserveStock = postDeliveryOrderReservation as jest.Mock
const mockIssueStock = postDeliveryOrderStockIssue as jest.Mock
const mockPostGoodsIssue = postDeliveryGoodsIssueAccounting as jest.Mock
const mockPostInvoice = postDeliveryInvoiceAccounting as jest.Mock
const mockEnsureReceivable = ensurePostedCustomerReceivableDocumentInTx as jest.Mock
const mockCreateLedgerEntry = createCustomerLedgerEntry as jest.Mock

const mockTx = {
  businessEvent: { findUnique: jest.fn() },
  salesOrder: { findFirst: jest.fn(), updateMany: jest.fn() },
  salesOrderLine: { update: jest.fn() },
  deliveryReservation: { create: jest.fn(), update: jest.fn() },
  deliveryReservationLine: { update: jest.fn() },
  deliveryGoodsIssue: { create: jest.fn(), update: jest.fn() },
  deliveryGoodsIssueLine: { updateMany: jest.fn() },
  deliveryBillingOutcome: { create: jest.fn(), update: jest.fn() },
  auditLog: { create: jest.fn() },
}

function line() {
  return {
    id: "line-1",
    itemId: "item-1",
    quantity: new Prisma.Decimal("2.000"),
    unitPrice: new Prisma.Decimal("5.00"),
    discount: new Prisma.Decimal("0.00"),
    taxRate: new Prisma.Decimal("20.000"),
    taxAmount: new Prisma.Decimal("2.00"),
    lineTotal: new Prisma.Decimal("12.00"),
    reservedQuantity: new Prisma.Decimal("0.000"),
    deliveredQuantity: new Prisma.Decimal("0.000"),
    billedQuantity: new Prisma.Decimal("0.000"),
    item: {
      id: "item-1",
      sku: "SKU-1",
      nameEn: "Item",
      nameFr: null,
      costPrice: new Prisma.Decimal("5.00"),
      sellingPrice: new Prisma.Decimal("5.00"),
      trackInventory: true,
      trackSerialNumbers: false,
      trackBatches: false,
      trackExpiry: false,
      taxRate: { rate: new Prisma.Decimal("20.000") },
      inventoryLevels: [{ locationId: "loc-1", averageCost: new Prisma.Decimal("5.00") }],
    },
  }
}

function order(status: SalesOrderStatus, version: number) {
  return {
    id: "order-1",
    organizationId: "org-1",
    customerId: "customer-1",
    locationId: "loc-1",
    orderNumber: "DO-1",
    status,
    version,
    subtotal: new Prisma.Decimal("10.00"),
    taxAmount: new Prisma.Decimal("2.00"),
    shippingCost: new Prisma.Decimal("0.00"),
    discount: new Prisma.Decimal("0.00"),
    total: new Prisma.Decimal("12.00"),
    deliveredAt: status === SalesOrderStatus.DELIVERED ? new Date("2026-08-18T10:00:00Z") : null,
    customer: { id: "customer-1", name: "Customer", code: "C-1" },
    location: { id: "loc-1", name: "Main", allowNegativeStock: false },
    organization: { id: "org-1", countryCode: null, currency: "XAF" },
    lines: [line()],
    deliveryReservations: [],
    deliveryGoodsIssues: [],
    deliveryBillingOutcome: null,
  }
}

describe("governed delivery order service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx))
    mockTx.businessEvent.findUnique.mockResolvedValue(null)
    mockTx.auditLog.create.mockResolvedValue({ id: "audit-1" })
    mockTx.salesOrder.updateMany.mockResolvedValue({ count: 1 })
    mockTx.salesOrderLine.update.mockResolvedValue({})
    mockTx.deliveryReservationLine.update.mockResolvedValue({})
    mockTx.deliveryGoodsIssueLine.updateMany.mockResolvedValue({ count: 1 })
    mockRecordEvent.mockResolvedValue({ event: { id: "event-1" }, created: true })
    mockMarkEvent.mockResolvedValue({})
  })

  it("returns the original tenant-scoped result for an identical duplicate command", async () => {
    const payload = {
      commandType: "CONFIRM_DELIVERY_ORDER",
      schemaVersion: 1,
      commandId: "confirm-1",
      salesOrderId: "order-1",
      expectedVersion: 0,
    }
    mockTx.businessEvent.findUnique.mockResolvedValue({
      id: "event-existing",
      eventType: "delivery.order.confirmed",
      status: "APPLIED",
      sourceId: "order-1",
      payloadHash: mockHash(payload),
    })
    mockTx.salesOrder.findFirst.mockResolvedValue(order(SalesOrderStatus.CONFIRMED, 1))

    const result = await confirmDeliveryOrder({
      organizationId: "org-1",
      actorId: "actor-1",
      commandId: "confirm-1",
      salesOrderId: "order-1",
      expectedVersion: 0,
    })

    expect(result.replayed).toBe(true)
    expect(mockTx.salesOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "order-1", organizationId: "org-1", channel: "DELIVERY" }),
    }))
    expect(mockTx.deliveryReservation.create).not.toHaveBeenCalled()
    expect(mockReserveStock).not.toHaveBeenCalled()
  })

  it("rejects a command key reused with a different payload before any stock change", async () => {
    mockTx.businessEvent.findUnique.mockResolvedValue({
      id: "event-existing",
      eventType: "delivery.order.confirmed",
      status: "APPLIED",
      sourceId: "order-1",
      payloadHash: "different-payload-hash",
    })
    mockRecordEvent.mockRejectedValueOnce(
      new Error("Business event idempotency key was reused with a different payload."),
    )

    await expect(
      confirmDeliveryOrder({
        organizationId: "org-1",
        actorId: "actor-1",
        commandId: "confirm-conflict",
        salesOrderId: "order-1",
        expectedVersion: 0,
      }),
    ).rejects.toThrow("different payload")

    expect(mockTx.deliveryReservation.create).not.toHaveBeenCalled()
    expect(mockReserveStock).not.toHaveBeenCalled()
  })

  it("confirms and reserves without posting stock, COGS, revenue, or AR", async () => {
    const draft = order(SalesOrderStatus.DRAFT, 0)
    const confirmed = order(SalesOrderStatus.CONFIRMED, 1)
    mockTx.salesOrder.findFirst.mockResolvedValueOnce(draft).mockResolvedValueOnce(confirmed)
    mockTx.deliveryReservation.create.mockResolvedValue({ id: "reservation-1" })
    mockReserveStock.mockResolvedValue({ movementTransactionIds: ["reservation-movement-1"] })

    await confirmDeliveryOrder({
      organizationId: "org-1",
      actorId: "actor-1",
      commandId: "confirm-2",
      salesOrderId: "order-1",
      expectedVersion: 0,
    })

    expect(mockReserveStock).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      salesOrderId: "order-1",
      lines: [expect.objectContaining({ quantity: new Prisma.Decimal("2.000") })],
    }), mockTx)
    expect(mockPostGoodsIssue).not.toHaveBeenCalled()
    expect(mockPostInvoice).not.toHaveBeenCalled()
    expect(mockEnsureReceivable).not.toHaveBeenCalled()
  })

  it("ties the controlled goods issue valuation to its COGS and inventory posting", async () => {
    const confirmed = order(SalesOrderStatus.CONFIRMED, 1)
    confirmed.deliveryReservations = [{
      id: "reservation-1",
      status: "ACTIVE",
      lines: [{ id: "reservation-line-1", salesOrderLineId: "line-1", quantity: new Prisma.Decimal("2.000") }],
    }] as never
    const delivered = order(SalesOrderStatus.DELIVERED, 2)
    mockTx.salesOrder.findFirst.mockResolvedValueOnce(confirmed).mockResolvedValueOnce(delivered)
    mockTx.deliveryGoodsIssue.create.mockResolvedValue({ id: "goods-issue-1" })
    mockIssueStock.mockResolvedValue({
      totalCost: new Prisma.Decimal("10.00"),
      movementTransactionIds: ["movement-1"],
    })
    mockPostGoodsIssue.mockResolvedValue({
      postingBatch: { id: "batch-gi-1" },
      journalEntry: { id: "journal-gi-1" },
    })

    await postDeliveryGoodsIssue({
      organizationId: "org-1",
      actorId: "actor-1",
      commandId: "issue-1",
      salesOrderId: "order-1",
      expectedVersion: 1,
      occurredAt: new Date("2026-08-18T10:00:00Z"),
    })

    expect(mockIssueStock).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      salesOrderId: "order-1",
      goodsIssueId: "goods-issue-1",
      lines: [expect.objectContaining({ quantity: new Prisma.Decimal("2.000") })],
    }), mockTx)
    expect(mockPostGoodsIssue).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: "goods-issue-1",
      costAmount: new Prisma.Decimal("10.00"),
    }), mockTx)
    expect(mockTx.deliveryGoodsIssue.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { ledgerPostingBatchId: "batch-gi-1", journalEntryId: "journal-gi-1" },
    }))
  })

  it("creates invoice and AR only from fully delivered quantities", async () => {
    const delivered = order(SalesOrderStatus.DELIVERED, 2)
    delivered.lines[0].deliveredQuantity = new Prisma.Decimal("2.000")
    const completed = { ...delivered, status: SalesOrderStatus.COMPLETED, version: 3 }
    mockTx.salesOrder.findFirst.mockResolvedValueOnce(delivered).mockResolvedValueOnce(completed)
    mockTx.deliveryBillingOutcome.create.mockResolvedValue({ id: "billing-1" })
    mockPostInvoice.mockResolvedValue({
      postingBatch: { id: "batch-inv-1" },
      journalEntry: { id: "journal-inv-1" },
    })
    mockEnsureReceivable.mockResolvedValue({ document: { id: "ar-1" }, state: { id: "state-1" } })
    mockCreateLedgerEntry.mockResolvedValue({ id: "customer-ledger-1" })

    await createDeliveryBillingOutcome({
      organizationId: "org-1",
      actorId: "actor-1",
      commandId: "bill-1",
      salesOrderId: "order-1",
      expectedVersion: 2,
      issuedAt: new Date("2026-08-18T11:00:00Z"),
    })

    expect(mockPostInvoice).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: "billing-1",
      grossAmount: new Prisma.Decimal("12.00"),
      netAmount: new Prisma.Decimal("10.00"),
      taxAmount: new Prisma.Decimal("2.00"),
    }), mockTx)
    expect(mockEnsureReceivable).toHaveBeenCalledWith(mockTx, expect.objectContaining({
      organizationId: "org-1",
      salesOrderId: "order-1",
      initialUnpaidAmount: new Prisma.Decimal("12.00"),
    }))
    expect(mockCreateLedgerEntry).toHaveBeenCalledWith(mockTx, expect.objectContaining({
      debit: new Prisma.Decimal("12.00"),
      referenceId: "ar-1",
    }))
  })
})
