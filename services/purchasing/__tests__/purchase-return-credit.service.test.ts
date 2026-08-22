import { Prisma, PurchaseCorrectionDirection } from "@prisma/client"

import { db } from "@/prisma/db"
import { postPurchaseReturnStock } from "@/services/inventory/inventory-stock-event.service"
import { allocatePurchaseDocumentNumber } from "@/services/purchase-order/purchase-document-number.service"
import { postPurchaseCorrectionLedgerInTx } from "../ap-control.service"
import {
  postPurchaseReturn,
  postSupplierCreditNote,
} from "../purchase-return-credit.service"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "payload-hash"),
  markBusinessEventAppliedInTx: jest.fn(),
  recordBusinessEventInTx: jest.fn(),
}))
jest.mock("@/services/inventory/inventory-stock-event.service", () => ({ postPurchaseReturnStock: jest.fn() }))
jest.mock("@/services/purchase-order/purchase-document-number.service", () => ({
  PURCHASE_DOCUMENT_TYPE: { PURCHASE_RETURN: "PURCHASE_RETURN" },
  allocatePurchaseDocumentNumber: jest.fn(),
}))
jest.mock("../ap-control.service", () => ({ postPurchaseCorrectionLedgerInTx: jest.fn() }))
jest.mock("../purchase-correction-ledger.service", () => ({ reversePurchaseCorrectionLedgerInTx: jest.fn() }))

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockStock = postPurchaseReturnStock as jest.Mock
const mockAllocateNumber = allocatePurchaseDocumentNumber as jest.Mock
const mockPostLedger = postPurchaseCorrectionLedgerInTx as jest.Mock

function buildTx() {
  return {
    $queryRaw: jest.fn(),
    purchaseReturn: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    purchaseReturnLine: { findMany: jest.fn() },
    supplierCreditNote: { findUnique: jest.fn(), create: jest.fn() },
    supplierCreditNoteLine: { findMany: jest.fn() },
    supplierInvoice: { findFirst: jest.fn() },
    supplierInvoiceLine: { findMany: jest.fn() },
    goodsReceipt: { findFirst: jest.fn() },
    purchaseOrder: { findFirst: jest.fn() },
    supplier: { update: jest.fn() },
    supplierLedgerEntry: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  }
}

function returnInput(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    purchaseOrderId: "po-1",
    goodsReceiptId: "gr-1",
    postedById: "actor-1",
    idempotencyKey: "return-idem-1",
    reason: "Damaged goods",
    occurredAt: new Date("2026-08-19T10:00:00.000Z"),
    lines: [{ sourceGoodsReceiptLineId: "gr-line-1", quantity: "1.000" }],
    ...overrides,
  }
}

describe("purchase return and supplier credit service boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAllocateNumber.mockResolvedValue("PR-000001")
    mockPostLedger.mockResolvedValue({ ledgerBatch: { id: "batch-1" }, ledgerStatus: "POSTED", journalEntryId: "journal-1" })
    mockStock.mockResolvedValue({ eventId: "event-1", movementTransactionIds: ["movement-1"], replayed: false, totalCost: new Prisma.Decimal(100) })
  })

  it("replays an identical duplicate command without posting stock or accounting twice", async () => {
    const tx = buildTx()
    tx.purchaseReturn.findUnique.mockResolvedValue({
      id: "return-existing",
      payloadHash: "sha256:payload-hash",
      lines: [],
    })
    mockDb.$transaction.mockImplementation(async (work) => work(tx))

    const result = await postPurchaseReturn(returnInput())

    expect(result).toEqual(expect.objectContaining({ replayed: true }))
    expect(tx.$queryRaw).not.toHaveBeenCalled()
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(mockStock).not.toHaveBeenCalled()
  })

  it("rejects an idempotency key reused with a different payload", async () => {
    const tx = buildTx()
    tx.purchaseReturn.findUnique.mockResolvedValue({
      id: "return-existing",
      payloadHash: "sha256:different-payload",
      lines: [],
    })
    mockDb.$transaction.mockImplementation(async (work) => work(tx))

    await expect(postPurchaseReturn(returnInput())).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(mockStock).not.toHaveBeenCalled()
  })

  it("replays an identical supplier credit command without reducing AP twice", async () => {
    const tx = buildTx()
    tx.supplierCreditNote.findUnique.mockResolvedValue({
      id: "credit-existing",
      payloadHash: "sha256:payload-hash",
      lines: [],
    })
    mockDb.$transaction.mockImplementation(async (work) => work(tx))

    const result = await postSupplierCreditNote({
      organizationId: "org-1",
      purchaseReturnId: "return-1",
      supplierInvoiceId: "invoice-1",
      postedById: "actor-1",
      idempotencyKey: "credit-idem-1",
      creditNoteNumber: "CN-001",
      creditDate: new Date("2026-08-19T10:00:00.000Z"),
      documentHash: "sha256:supplier-credit",
      reason: "Supplier accepted return",
      lines: [{ sourcePurchaseReturnLineId: "return-line-1", sourceSupplierInvoiceLineId: "invoice-line-1" }],
    })

    expect(result).toEqual(expect.objectContaining({ replayed: true }))
    expect(tx.$queryRaw).not.toHaveBeenCalled()
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(tx.supplier.update).not.toHaveBeenCalled()
  })

  it("requires the source purchase order and goods receipt to match the command tenant", async () => {
    const tx = buildTx()
    tx.purchaseReturn.findUnique.mockResolvedValue(null)
    tx.goodsReceipt.findFirst.mockResolvedValue(null)
    mockDb.$transaction.mockImplementation(async (work) => work(tx))

    await expect(postPurchaseReturn(returnInput())).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(tx.goodsReceipt.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "gr-1",
        organizationId: "org-1",
        purchaseOrderId: "po-1",
      }),
    }))
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(mockStock).not.toHaveBeenCalled()
  })

  it("persists return evidence with the exact purchase order, receipt, and receipt-line sources", async () => {
    const tx = buildTx()
    tx.purchaseReturn.findUnique.mockResolvedValue(null)
    tx.goodsReceipt.findFirst.mockResolvedValue({
      id: "gr-1",
      receiptNumber: "GR-000001",
      status: "RECEIVED",
      inventoryPostedAt: new Date("2026-08-18T10:00:00.000Z"),
      locationId: "location-1",
      purchaseOrder: { id: "po-1", supplierId: "supplier-1", locationId: "location-1", deletedAt: null },
      lines: [{
        id: "gr-line-1",
        purchaseOrderLineId: "po-line-1",
        itemId: "item-1",
        receivedQuantity: new Prisma.Decimal(2),
        unitCost: new Prisma.Decimal(100),
        item: { trackInventory: true },
      }],
    })
    tx.purchaseReturnLine.findMany.mockResolvedValue([])
    tx.supplierInvoiceLine.findMany.mockResolvedValue([])
    tx.purchaseReturn.create.mockImplementation(async (args) => ({ id: args.data.id, ...args.data, lines: args.data.lines.create }))
    tx.auditLog.create.mockResolvedValue({})
    mockDb.$transaction.mockImplementation(async (work) => work(tx))

    const result = await postPurchaseReturn(returnInput())

    expect(result.replayed).toBe(false)
    expect(mockPostLedger).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        sourceType: "PURCHASE_RETURN",
        metadata: expect.objectContaining({ purchaseOrderId: "po-1", goodsReceiptId: "gr-1" }),
      }),
    )
    expect(mockStock).toHaveBeenCalledWith(expect.objectContaining({
      purchaseOrderId: "po-1",
      goodsReceiptId: "gr-1",
      lines: [expect.objectContaining({ itemId: "item-1", locationId: "location-1" })],
    }), tx)
    expect(tx.purchaseReturn.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: "org-1",
        purchaseOrderId: "po-1",
        goodsReceiptId: "gr-1",
        supplierId: "supplier-1",
        lines: { create: [expect.objectContaining({
          sourceGoodsReceiptLineId: "gr-line-1",
          sourcePurchaseOrderLineId: "po-line-1",
          inventoryTransactionId: "movement-1",
        })] },
      }),
    }))
  })

  it("requires a supplier credit invoice to share the return tenant, purchase order, and supplier", async () => {
    const tx = buildTx()
    tx.supplierCreditNote.findUnique.mockResolvedValue(null)
    tx.purchaseReturn.findFirst.mockResolvedValue({
      id: "return-1",
      organizationId: "org-1",
      purchaseOrderId: "po-1",
      goodsReceiptId: "gr-1",
      supplierId: "supplier-1",
      direction: PurchaseCorrectionDirection.CORRECTION,
      reversedByPurchaseReturn: null,
      supplierCreditNotes: [],
      lines: [{ id: "return-line-1", invoicedQuantity: new Prisma.Decimal(1) }],
    })
    tx.supplierInvoice.findFirst.mockResolvedValue(null)
    mockDb.$transaction.mockImplementation(async (work) => work(tx))

    await expect(postSupplierCreditNote({
      organizationId: "org-1",
      purchaseReturnId: "return-1",
      supplierInvoiceId: "invoice-1",
      postedById: "actor-1",
      idempotencyKey: "credit-idem-1",
      creditNoteNumber: "CN-001",
      creditDate: new Date("2026-08-19T10:00:00.000Z"),
      documentHash: "sha256:supplier-credit",
      reason: "Supplier accepted return",
      lines: [{ sourcePurchaseReturnLineId: "return-line-1", sourceSupplierInvoiceLineId: "invoice-line-1" }],
    })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(tx.supplierInvoice.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "invoice-1",
        organizationId: "org-1",
        purchaseOrderId: "po-1",
        supplierId: "supplier-1",
      }),
    }))
    expect(mockPostLedger).not.toHaveBeenCalled()
  })
})
