import { Prisma, PurchaseCorrectionDirection } from "@prisma/client"

import { db } from "@/prisma/db"
import { postPurchaseReturnStock } from "@/services/inventory/inventory-stock-event.service"
import { allocatePurchaseDocumentNumber } from "@/services/purchase-order/purchase-document-number.service"
import { postPurchaseCorrectionLedgerInTx } from "../ap-control.service"
import { readReceiptRecognitionSource } from "@/services/purchase-order/receipt-recognition-source"
import { assertPurchaseReturnClaimFunding, readPurchaseReturnAccountingEvidence, recordReceiptReturnRecognition, recordReceiptReturnResolution, resolveReceiptReturnRecognition } from "../receipt-return-recognition"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { allocateReceiptCost } from "@/services/inventory/receipt-cost-allocation"
import { reversePurchaseCorrectionLedgerInTx } from "../purchase-correction-ledger.service"
import {
  postPurchaseReturn,
  postSupplierCreditNote,
  recoverPurchaseReturnAccountingInTx,
  reverseSupplierCreditNote,
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
jest.mock("../receipt-return-recognition", () => ({ assertPurchaseReturnClaimFunding: jest.fn(), recordReceiptReturnRecognition: jest.fn(), resolveReceiptReturnRecognition: jest.fn(), retainReturnReversalRecognition: jest.fn(), readPurchaseReturnAccountingEvidence: jest.fn(), recordReceiptReturnResolution: jest.fn(), validateReceiptReturnStockForRecognition: jest.fn() }))
jest.mock("@/services/purchase-order/receipt-recognition-source", () => ({ readReceiptRecognitionSource: jest.fn() }))
jest.mock("@/services/accounting/periods.service", () => ({ getOpenPeriodForDate: jest.fn() }))
jest.mock("../supplier-payment-balance", () => ({ refreshSupplierInvoiceBalanceStatus: jest.fn() }))

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockStock = postPurchaseReturnStock as jest.Mock
const mockAllocateNumber = allocatePurchaseDocumentNumber as jest.Mock
const mockPostLedger = postPurchaseCorrectionLedgerInTx as jest.Mock

function buildTx() {
  return {
    $queryRaw: jest.fn(),
    purchaseReturn: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    purchaseReturnLine: { findMany: jest.fn() },
    supplierCreditNote: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    supplierCreditNoteLine: { findMany: jest.fn() },
    supplierInvoice: { findFirst: jest.fn() },
    supplierInvoiceLine: { findMany: jest.fn() },
    goodsReceipt: { findFirst: jest.fn() },
    purchaseOrder: { findFirst: jest.fn() },
    supplier: { update: jest.fn(), findFirst: jest.fn() },
    supplierLedgerEntry: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    ledgerPostingBatch: { findFirst: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    journalEntry: { count: jest.fn().mockResolvedValue(0) },
    accountingSourceLink: { count: jest.fn().mockResolvedValue(0) },
    businessEvent: { findFirst: jest.fn() },
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
    ;(hashBusinessPayload as jest.Mock).mockImplementation(() => "payload-hash")
    mockAllocateNumber.mockResolvedValue("PR-000001")
    mockPostLedger.mockResolvedValue({ ledgerBatch: { id: "batch-1" }, ledgerStatus: "POSTED", journalEntryId: "journal-1" })
    mockStock.mockResolvedValue({ eventId: "event-1", movementTransactionIds: ["movement-1"], replayed: false, totalCost: new Prisma.Decimal(100) })
    ;(resolveReceiptReturnRecognition as jest.Mock).mockResolvedValue({ recognition: { status: "VERIFIED" }, recognitionHash: "verified-hash" })
    ;(assertPurchaseReturnClaimFunding as jest.Mock).mockResolvedValue({ journalEntryId: "return-journal", recognitionHash: "return-proof" })
    ;(getOpenPeriodForDate as jest.Mock).mockResolvedValue({ id: "period" })
    ;(recordBusinessEventInTx as jest.Mock).mockImplementation(async (_tx, args) => ({ created: true, event: { id: "credit-event", ...args } }))
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
      organization: { currency: "EUR" },
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
        currency: "EUR",
        receiptReturnRecognitionHash: "verified-hash",
        metadata: expect.objectContaining({ purchaseOrderId: "po-1", goodsReceiptId: "gr-1" }),
      }),
    )
    expect(recordReceiptReturnRecognition).toHaveBeenCalledWith(tx, result.purchaseReturn, { status: "VERIFIED" })
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

  it.each(["different-receipt", "different-order", "different-item"])("rejects %s line provenance even when the invoice has no header order", async mismatch => {
    const tx = buildTx()
    tx.supplierCreditNote.findUnique.mockResolvedValue(null)
    tx.purchaseReturn.findFirst.mockResolvedValue({ id: "return-1", organizationId: "org-1", purchaseOrderId: "po-1", goodsReceiptId: "gr-1", supplierId: "supplier-1", direction: PurchaseCorrectionDirection.CORRECTION, reversedByPurchaseReturn: null, supplierCreditNotes: [], lines: [{ id: "return-line-1", invoicedQuantity: new Prisma.Decimal(1), sourceGoodsReceiptLineId: "gr-line-1", sourcePurchaseOrderLineId: "po-line-1", itemId: "item-1" }] })
    tx.supplierInvoice.findFirst.mockResolvedValue({ id: "invoice-1", purchaseOrderId: null, status: "POSTED", postedAt: new Date(), supplier: { isActive: true }, lines: [{ id: "invoice-line-1", goodsReceiptLineId: mismatch === "different-receipt" ? "other" : "gr-line-1", purchaseOrderLineId: mismatch === "different-order" ? "other" : "po-line-1", itemId: mismatch === "different-item" ? "other" : "item-1" }] })
    tx.supplierCreditNoteLine.findMany.mockResolvedValue([])
    mockDb.$transaction.mockImplementation(async work => work(tx))
    await expect(postSupplierCreditNote({ organizationId: "org-1", purchaseReturnId: "return-1", supplierInvoiceId: "invoice-1", postedById: "actor-1", idempotencyKey: "credit-line-check", creditNoteNumber: "CN-1", creditDate: new Date(), documentHash: "sha256:owned-evidence", reason: "Owned credit", lines: [{ sourcePurchaseReturnLineId: "return-line-1", sourceSupplierInvoiceLineId: "invoice-line-1" }] })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(tx.supplier.update).not.toHaveBeenCalled()
  })

  it("requires the return tenant and supplier and a compatible optional invoice header order", async () => {
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
        OR: [{ purchaseOrderId: "po-1" }, { purchaseOrderId: null }],
        supplierId: "supplier-1",
      }),
    }))
    expect(mockPostLedger).not.toHaveBeenCalled()
  })

  function recoveryFixture() {
    const tx = buildTx(), sourceDate = new Date("2026-08-19T10:00:00.000Z")
    const original = { id: "return-1", organizationId: "org-1", goodsReceiptId: "receipt-1", purchaseOrderId: "order-1", supplierId: "supplier-1", direction: "CORRECTION", reversedByPurchaseReturn: null, ledgerPostingBatchId: "batch-1", journalEntryId: null, returnNumber: "PR-1", occurredAt: sourceDate, documentHash: "sha256:original", evidenceHash: "sha256:evidence", lines: [{ inventoryAmount: new Prisma.Decimal(10), supplierClaimAmount: new Prisma.Decimal(0), grniAmount: new Prisma.Decimal(10) }] }
    tx.purchaseReturn.findFirst.mockResolvedValue(original)
    ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue({ manifest: { currency: "EUR" } })
    ;(readPurchaseReturnAccountingEvidence as jest.Mock).mockResolvedValue({ recognition: { status: "REVIEW_REQUIRED" }, journalEntryId: null })
    return { tx, original, sourceDate, input: { organizationId: "org-1", purchaseReturnId: "return-1", actorId: "finance-actor" } }
  }

  it("denies supplier credit before ledger or balance effects when the original return claim is unposted", async () => {
    const tx = buildTx()
    tx.supplierCreditNote.findUnique.mockResolvedValue(null)
    tx.purchaseReturn.findFirst.mockResolvedValue({ id: "return-1", organizationId: "org-1", purchaseOrderId: "po-1", goodsReceiptId: "gr-1", supplierId: "supplier-1", direction: "CORRECTION", reversedByPurchaseReturn: null, supplierCreditNotes: [], lines: [{ id: "return-line-1", invoicedQuantity: new Prisma.Decimal(1), unitCost: new Prisma.Decimal(10), supplierClaimAmount: new Prisma.Decimal(10), sourceGoodsReceiptLineId: "gr-line-1", sourcePurchaseOrderLineId: "po-line-1", itemId: "item-1" }] })
    tx.supplierInvoice.findFirst.mockResolvedValue({ id: "invoice-1", currency: "EUR", status: "POSTED", postedAt: new Date(), supplier: { id: "supplier-1", isActive: true, currentBalance: new Prisma.Decimal(10) }, lines: [{ id: "invoice-line-1", goodsReceiptLineId: "gr-line-1", purchaseOrderLineId: "po-line-1", itemId: "item-1", quantity: new Prisma.Decimal(1), unitCost: new Prisma.Decimal(10), taxRate: new Prisma.Decimal(0), taxAmount: new Prisma.Decimal(0), lineTotal: new Prisma.Decimal(10) }] })
    tx.supplierCreditNoteLine.findMany.mockResolvedValue([])
    ;(assertPurchaseReturnClaimFunding as jest.Mock).mockRejectedValue(new BusinessRuleError("Recover the original return accounting first.", "INVOICE_EVIDENCE_REQUIRED"))
    mockDb.$transaction.mockImplementation(async work => work(tx))
    await expect(postSupplierCreditNote({ organizationId: "org-1", purchaseReturnId: "return-1", supplierInvoiceId: "invoice-1", postedById: "actor-1", idempotencyKey: "credit-blocked-claim", creditNoteNumber: "CN-1", creditDate: new Date(), documentHash: "sha256:supplier-credit", reason: "Returned stock", lines: [{ sourcePurchaseReturnLineId: "return-line-1", sourceSupplierInvoiceLineId: "invoice-line-1" }] })).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
    expect(assertPurchaseReturnClaimFunding).toHaveBeenCalledWith(tx, expect.objectContaining({ id: "return-1" }), expect.objectContaining({ currency: "EUR", claims: [{ returnLineId: "return-line-1", quantity: new Prisma.Decimal(1), amount: new Prisma.Decimal(10) }] }))
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(tx.supplier.update).not.toHaveBeenCalled()
    expect(tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
    expect(tx.supplierCreditNote.create).not.toHaveBeenCalled()
  })

  it("recovers the original return batch/date and appends journal evidence without repeating stock", async () => {
    const f = recoveryFixture()
    const result = await recoverPurchaseReturnAccountingInTx(f.tx as unknown as Prisma.TransactionClient, f.input)
    expect(result).toMatchObject({ ledgerStatus: "POSTED", journalEntryId: "journal-1" })
    expect(mockPostLedger).toHaveBeenCalledWith(f.tx, expect.objectContaining({ sourceId: "return-1", sourceDate: f.sourceDate, currency: "EUR", documentHash: "sha256:original", sourceAmount: new Prisma.Decimal(10), varianceAmount: new Prisma.Decimal(10) }))
    expect(recordReceiptReturnResolution).toHaveBeenCalledWith(f.tx, f.original, { status: "VERIFIED" }, "journal-1", "finance-actor")
    expect(f.original.journalEntryId).toBeNull()
    expect(mockStock).not.toHaveBeenCalled()
    expect(f.tx.purchaseReturn.create).not.toHaveBeenCalled()
  })

  it("rejects a still-blocked return recovery so the owning transaction can roll back receipt and return effects", async () => {
    const f = recoveryFixture()
    mockPostLedger.mockResolvedValue({ ledgerBatch: { id: "batch-1" }, ledgerStatus: "BLOCKED_PENDING_RULES", blockerMessage: "Return rules required" })
    await expect(recoverPurchaseReturnAccountingInTx(f.tx as unknown as Prisma.TransactionClient, f.input)).rejects.toThrow("Return rules required")
    expect(recordReceiptReturnResolution).not.toHaveBeenCalled()
    expect(mockStock).not.toHaveBeenCalled()
  })

  it("replays already-resolved accounting without posting or moving stock again", async () => {
    const f = recoveryFixture()
    ;(readPurchaseReturnAccountingEvidence as jest.Mock).mockResolvedValue({ recognition: { status: "VERIFIED" }, journalEntryId: "journal-1" })
    f.tx.ledgerPostingBatch.findFirst.mockResolvedValue({ id: "batch-1", status: "POSTED", sourceLinks: [{ id: "link-1", journalEntryId: "journal-1" }] })
    expect(await recoverPurchaseReturnAccountingInTx(f.tx as unknown as Prisma.TransactionClient, f.input)).toMatchObject({ ledgerStatus: "POSTED", journalEntryId: "journal-1", accountingSourceLinkId: "link-1" })
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(recordReceiptReturnResolution).not.toHaveBeenCalled()
    expect(mockStock).not.toHaveBeenCalled()
  })

  function fractionalCreditFixture(q = "0.300", claim = "0.00", invoiceQ = "1.000") {
    const tx = buildTx(), d = (value: string) => new Prisma.Decimal(value), date = new Date("2026-09-30T12:00:00Z")
    tx.supplierCreditNote.findUnique.mockResolvedValue(null)
    tx.purchaseReturn.findFirst.mockResolvedValue({ id: "return-1", organizationId: "org-1", purchaseOrderId: "po-1", goodsReceiptId: "gr-1", supplierId: "supplier-1", direction: "CORRECTION", reversedByPurchaseReturn: null, supplierCreditNotes: [], lines: [{ id: "return-line-1", invoicedQuantity: d(q), unitCost: d("0.01"), supplierClaimAmount: d(claim), sourceGoodsReceiptLineId: "gr-line-1", sourcePurchaseOrderLineId: "po-line-1", itemId: "item-1" }] })
    tx.supplierInvoice.findFirst.mockResolvedValue({ id: "invoice-1", organizationId: "org-1", supplierId: "supplier-1", currency: "EUR", status: "POSTED", postedAt: date, total: d("0.01"), amountPaid: d("0"), supplier: { id: "supplier-1", isActive: true, currentBalance: d("0.01") }, lines: [{ id: "invoice-line-1", goodsReceiptLineId: "gr-line-1", purchaseOrderLineId: "po-line-1", itemId: "item-1", quantity: d(invoiceQ), unitCost: d("0.01"), taxRate: d("0"), taxAmount: d("0"), lineTotal: d("0.01") }] })
    tx.supplierCreditNoteLine.findMany.mockResolvedValue([])
    tx.supplierCreditNote.create.mockImplementation(async args => ({ ...args.data, direction: args.data.direction ?? "CORRECTION", reversalOfSupplierCreditNoteId: args.data.reversalOfSupplierCreditNoteId ?? null, lines: args.data.lines.create.map((line: object, i: number) => ({ ...line, id: `credit-line-${i}` })) }))
    tx.supplier.findFirst.mockResolvedValue({ currentBalance: d("0.01") })
    mockDb.$transaction.mockImplementation(async work => work(tx))
    const input = { organizationId: "org-1", purchaseReturnId: "return-1", supplierInvoiceId: "invoice-1", postedById: "actor-1", idempotencyKey: "fractional-credit-1", creditNoteNumber: "CN-1", creditDate: date, documentHash: "sha256:supplier-credit", reason: "Supplier accepted returned stock", lines: [{ sourcePurchaseReturnLineId: "return-line-1", sourceSupplierInvoiceLineId: "invoice-line-1" }] }
    return { tx, input, date }
  }
  async function priceDifferenceFixture(receiptPrice = "0", invoicePrice = "2") {
    ;(hashBusinessPayload as jest.Mock).mockImplementation(jest.requireActual("@/services/events/business-event.service").hashBusinessPayload)
    const f = fractionalCreditFixture("1.000", receiptPrice, "1.000"), d = (value: string) => new Prisma.Decimal(value)
    const invoice = await f.tx.supplierInvoice.findFirst(), returned = await f.tx.purchaseReturn.findFirst()
    returned.lines[0].unitCost = d(receiptPrice)
    Object.assign(invoice, { invoiceNumber: "INV-1", createdById: "maker", approvedById: "checker", postedBusinessEventId: "invoice-event", ledgerPostingBatchId: "invoice-batch", documentHash: "sha256:invoice-document", subtotal: d(invoicePrice), taxAmount: d("0"), discount: d("0"), total: d(invoicePrice) })
    Object.assign(invoice.lines[0], { organizationId: "org-1", supplierInvoiceId: "invoice-1", unitCost: d(invoicePrice), lineTotal: d(invoicePrice) })
    const noReceiptJournal = d(receiptPrice).eq(0)
    const proof = { version: noReceiptJournal ? 3 : 2, organizationId: "org-1", supplierId: "supplier-1", invoiceId: "invoice-1", currency: "EUR", invoiceSourceHash: hashBusinessPayload({ organizationId: "org-1", supplierId: "supplier-1", invoiceId: "invoice-1", currency: "EUR", subtotal: d(invoicePrice).toFixed(2), total: d(invoicePrice).toFixed(2), taxAmount: "0.00", lines: [{ receiptLineId: "gr-line-1", quantity: "1.000", unitCost: d(invoicePrice).toFixed(2) }] }), allocations: [{ receiptLineId: "gr-line-1", receiptId: "gr-1", quantity: "1.000", invoiceNet: d(invoicePrice).toFixed(2), receiptCost: d(receiptPrice).toFixed(2), priorQuantity: "0.000", priorCost: "0.00", receiptBatchId: noReceiptJournal ? null : "receipt-batch", receiptJournalId: noReceiptJournal ? null : "receipt-journal", receiptEvidenceHash: "a".repeat(64), ...(noReceiptJournal ? { accountingStatus: "NOT_REQUIRED" } : {}), costAllocation: allocateReceiptCost({ sourceQuantity: "1", sourceValue: receiptPrice, consumedQuantity: "0", consumedValue: "0", quantity: "1" }) }], ...(noReceiptJournal ? { residualSources: [] } : {}) }
    invoice.metadata = { receiptRecognition: proof }
    const effective = { accountingComplete: true, recognition: { status: "VERIFIED", invoiceProofs: [{ invoiceId: invoice.id, sourceHash: proof.invoiceSourceHash, recognitionHash: hashBusinessPayload(proof) }] } }
    ;(readPurchaseReturnAccountingEvidence as jest.Mock).mockResolvedValue(effective)
    const payload = { invoiceId: invoice.id, supplierId: invoice.supplierId, invoiceNumber: invoice.invoiceNumber, total: invoice.total.toFixed(2), currency: invoice.currency, makerId: invoice.createdById, approverId: invoice.approvedById, ledgerPostingBatchId: invoice.ledgerPostingBatchId, receiptRecognitionHash: hashBusinessPayload(proof), matchStatus: "APPROVED_EXCEPTION" }
    const event = { id: "invoice-event", organizationId: "org-1", eventType: "purchase.supplier_invoice.posted", eventSource: "INTERNAL", schemaVersion: 1, status: "APPLIED", processedAt: f.date, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, actorId: invoice.approvedById, postingBatchId: invoice.ledgerPostingBatchId, occurredAt: invoice.postedAt, documentHash: invoice.documentHash, payload, payloadHash: hashBusinessPayload(payload), metadata: { makerCheckerVerified: true } }
    f.tx.businessEvent.findFirst.mockResolvedValue(event)
    return { ...f, invoice, returned, proof, effective, event }
  }
  it.each([["0", "2", "CREDIT", "2.00"], ["1", "2", "CREDIT", "1.00"], ["2", "1", "DEBIT", "1.00"]])("credits the authenticated invoice price %s → %s while preserving its actual claim", async (receiptPrice, invoicePrice, direction, variance) => {
    const f = await priceDifferenceFixture(receiptPrice, invoicePrice), result = await postSupplierCreditNote(f.input)
    expect(result.supplierCreditNote.lines[0].unitCost.toFixed(2)).toBe(new Prisma.Decimal(invoicePrice).toFixed(2))
    expect(result.supplierCreditNote.subtotal.toFixed(2)).toBe(new Prisma.Decimal(invoicePrice).toFixed(2))
    expect(mockPostLedger).toHaveBeenCalledWith(f.tx, expect.objectContaining({ costAmount: new Prisma.Decimal(receiptPrice), netAmount: new Prisma.Decimal(invoicePrice), varianceAmount: new Prisma.Decimal(variance), receiptCreditVarianceDirection: direction }))
    expect(assertPurchaseReturnClaimFunding).toHaveBeenCalledWith(f.tx, f.returned, expect.objectContaining({ claims: [{ returnLineId: "return-line-1", quantity: new Prisma.Decimal(1), amount: new Prisma.Decimal(receiptPrice) }] }))
    expect(f.returned.lines[0].unitCost.toFixed(2)).toBe(new Prisma.Decimal(receiptPrice).toFixed(2))
  })
  it.each(["legacy invoice", "missing return proof", "different return invoice", "changed recognition hash", "changed source hash", "missing approval", "wrong approver", "same maker", "wrong event source", "unapplied approval", "changed approval payload", "changed invoice source", "changed line total", "unverified maker checker"])("rejects price-difference credit for %s before effects", async corruption => {
    const f = await priceDifferenceFixture()
    if (corruption === "legacy invoice") f.invoice.metadata = {}
    if (corruption === "missing return proof") f.effective.recognition.invoiceProofs = []
    if (corruption === "different return invoice") f.effective.recognition.invoiceProofs[0].invoiceId = "other"
    if (corruption === "changed recognition hash") f.effective.recognition.invoiceProofs[0].recognitionHash = "f".repeat(64)
    if (corruption === "changed source hash") f.effective.recognition.invoiceProofs[0].sourceHash = "f".repeat(64)
    if (corruption === "missing approval") f.tx.businessEvent.findFirst.mockResolvedValue(null)
    if (corruption === "wrong approver") f.event.actorId = "unrelated"
    if (corruption === "same maker") f.invoice.approvedById = f.invoice.createdById
    if (corruption === "wrong event source") f.event.sourceId = "another-invoice"
    if (corruption === "unapplied approval") f.event.status = "RECEIVED"
    if (corruption === "changed approval payload") f.event.payload.total = "1.00"
    if (corruption === "changed invoice source") f.invoice.lines[0].unitCost = new Prisma.Decimal(3)
    if (corruption === "changed line total") f.invoice.lines[0].lineTotal = new Prisma.Decimal(3)
    if (corruption === "unverified maker checker") f.event.metadata.makerCheckerVerified = false
    await expect(postSupplierCreditNote(f.input)).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(f.tx.supplier.update).not.toHaveBeenCalled()
    expect(f.tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
    expect(f.tx.supplierCreditNote.create).not.toHaveBeenCalled()
  })
  it("still requires actual return funding after verifying the approved price difference", async () => {
    const f = await priceDifferenceFixture()
    ;(assertPurchaseReturnClaimFunding as jest.Mock).mockRejectedValue(new BusinessRuleError("Original return funding changed.", "INVOICE_EVIDENCE_REQUIRED"))
    await expect(postSupplierCreditNote(f.input)).rejects.toThrow("Original return funding changed")
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(f.tx.supplierCreditNote.create).not.toHaveBeenCalled()
  })
  it("retains a real zero credit and reverses its exact allocation without fake journals or balance effects", async () => {
    const f = fractionalCreditFixture(), created = await postSupplierCreditNote(f.input)
    expect(created.ledgerStatus).toBe("NOT_REQUIRED")
    expect(created.supplierCreditNote.total.toFixed(2)).toBe("0.00")
    expect(created.supplierCreditNote.lines[0].quantity.toFixed(3)).toBe("0.300")
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(f.tx.supplier.update).not.toHaveBeenCalled()
    expect(f.tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
    const eventArgs = (recordBusinessEventInTx as jest.Mock).mock.calls.at(-1)[1]
    f.tx.businessEvent.findFirst.mockResolvedValue({ ...eventArgs, schemaVersion: 1, postingBatchId: null, status: "APPLIED", processedAt: f.date, payloadHash: "payload-hash" })
    f.tx.supplierCreditNote.findFirst.mockResolvedValue({ ...created.supplierCreditNote, reversedBySupplierCreditNote: null })
    const reversed = await reverseSupplierCreditNote({ organizationId: "org-1", supplierCreditNoteId: created.supplierCreditNote.id, postedById: "actor-1", idempotencyKey: "fractional-reverse-1", creditNoteNumber: "RV-1", creditDate: f.date, documentHash: "sha256:reversal", reason: "Reverse accepted credit" })
    expect(reversed.ledgerStatus).toBe("NOT_REQUIRED")
    expect(reversed.supplierCreditNote.lines[0].quantity.toFixed(3)).toBe("0.300")
    expect(reversePurchaseCorrectionLedgerInTx).not.toHaveBeenCalled()
    expect(getOpenPeriodForDate).toHaveBeenCalledTimes(2)
  })
  it.each(["closed", "missing"])("rejects a new zero credit in a %s period before persisting allocation", async state => {
    const f = fractionalCreditFixture()
    ;(getOpenPeriodForDate as jest.Mock).mockRejectedValue(new BusinessRuleError(`${state} period`))
    await expect(postSupplierCreditNote(f.input)).rejects.toThrow(`${state} period`)
    expect(f.tx.supplierCreditNote.create).not.toHaveBeenCalled()
    expect(recordBusinessEventInTx).not.toHaveBeenCalled()
    expect(mockPostLedger).not.toHaveBeenCalled()
  })
  it("rejects a new zero-credit reversal when its date is closed", async () => {
    const f = fractionalCreditFixture(), created = await postSupplierCreditNote(f.input)
    const eventArgs = (recordBusinessEventInTx as jest.Mock).mock.calls.at(-1)[1]
    f.tx.businessEvent.findFirst.mockResolvedValue({ ...eventArgs, schemaVersion: 1, postingBatchId: null, status: "APPLIED", processedAt: f.date, payloadHash: "payload-hash" })
    f.tx.supplierCreditNote.findFirst.mockResolvedValue({ ...created.supplierCreditNote, reversedBySupplierCreditNote: null })
    ;(getOpenPeriodForDate as jest.Mock).mockRejectedValue(new BusinessRuleError("closed period"))
    await expect(reverseSupplierCreditNote({ organizationId: "org-1", supplierCreditNoteId: created.supplierCreditNote.id, postedById: "actor-1", idempotencyKey: "fractional-reverse-1", creditNoteNumber: "RV-1", creditDate: f.date, documentHash: "sha256:reversal", reason: "Reverse accepted credit" })).rejects.toThrow("closed period")
    expect(f.tx.supplierCreditNote.create).toHaveBeenCalledTimes(1)
    expect(reversePurchaseCorrectionLedgerInTx).not.toHaveBeenCalled()
  })
  it.each([
    ["0.500", "0.00", "0.500", "0.01", "CREDIT"],
    ["0.400", "0.01", "1.000", "0.00", "DEBIT"],
  ])("posts the exact commercial/claim variance for quantity %s and claim %s", async (q, claim, invoiceQ, net, direction) => {
    const f = fractionalCreditFixture(q, claim, invoiceQ), result = await postSupplierCreditNote(f.input)
    expect(result.ledgerStatus).toBe("POSTED")
    const args = mockPostLedger.mock.calls[0][1]
    expect(args.netAmount.toFixed(2)).toBe(net)
    expect(args.costAmount.toFixed(2)).toBe(claim)
    expect(args.varianceAmount.toFixed(2)).toBe("0.01")
    expect(args.receiptCreditVarianceDirection).toBe(direction)
    expect(args.metadata.receiptCreditRecognition.lines[0].netAllocation).toMatchObject({ sourceQuantity: invoiceQ, sourceValue: "0.01", allocatedValue: net })
    if (net === "0.00") expect(f.tx.supplier.update).not.toHaveBeenCalled()
  })
  it("resolves a source-pending zero return without journal, current period, or stock replay", async () => {
    const f = recoveryFixture()
    f.original.ledgerPostingBatchId = null as never
    f.original.lines[0].inventoryAmount = f.original.lines[0].grniAmount = new Prisma.Decimal(0)
    ;(resolveReceiptReturnRecognition as jest.Mock).mockResolvedValue({ recognition: { version: 2, status: "VERIFIED" }, recognitionHash: "verified-hash" })
    ;(getOpenPeriodForDate as jest.Mock).mockRejectedValue(new BusinessRuleError("closed period"))
    expect(await recoverPurchaseReturnAccountingInTx(f.tx as never, f.input)).toMatchObject({ ledgerStatus: "NOT_REQUIRED", ledgerBatch: null, journalEntryId: null })
    expect(recordReceiptReturnResolution).toHaveBeenCalledWith(f.tx, f.original, { version: 2, status: "VERIFIED" }, null, "finance-actor")
    expect(getOpenPeriodForDate).not.toHaveBeenCalled()
    expect(mockPostLedger).not.toHaveBeenCalled()
    expect(mockStock).not.toHaveBeenCalled()
  })
  it("conserves commercial net and tax pools independently and reverses their frozen final residual", async () => {
    const f = fractionalCreditFixture()
    const invoice = await f.tx.supplierInvoice.findFirst()
    invoice.lines[0].taxRate = new Prisma.Decimal(100)
    invoice.lines[0].taxAmount = new Prisma.Decimal(".01")
    invoice.lines[0].lineTotal = invoice.total = new Prisma.Decimal(".02")
    const first = await postSupplierCreditNote(f.input)
    const firstEvent = (recordBusinessEventInTx as jest.Mock).mock.calls.at(-1)[1]
    f.tx.businessEvent.findFirst.mockResolvedValue({ ...firstEvent, schemaVersion: 1, postingBatchId: null, status: "APPLIED", processedAt: f.date, payloadHash: "payload-hash" })
    f.tx.supplierCreditNoteLine.findMany.mockResolvedValue(first.supplierCreditNote.lines.map((line: object) => ({ ...line, supplierCreditNote: first.supplierCreditNote })))
    const returned = await f.tx.purchaseReturn.findFirst()
    returned.id = "return-2"; returned.lines[0].id = "return-line-2"; returned.lines[0].invoicedQuantity = new Prisma.Decimal(".7"); returned.lines[0].supplierClaimAmount = new Prisma.Decimal(".01")
    const second = await postSupplierCreditNote({ ...f.input, purchaseReturnId: "return-2", idempotencyKey: "fractional-credit-2", creditNoteNumber: "CN-2", lines: [{ sourcePurchaseReturnLineId: "return-line-2", sourceSupplierInvoiceLineId: "invoice-line-1" }] })
    expect(first.supplierCreditNote.total.toFixed(2)).toBe("0.00")
    expect(second.supplierCreditNote.subtotal.toFixed(2)).toBe("0.01")
    expect(second.supplierCreditNote.taxAmount.toFixed(2)).toBe("0.01")
    const secondEvent = (recordBusinessEventInTx as jest.Mock).mock.calls.at(-1)[1], frozen = secondEvent.payload.receiptCreditRecognition
    expect(frozen.lines[0].netAllocation).toMatchObject({ consumedQuantity: "0.300", consumedValue: "0.00", allocatedValue: "0.01" })
    expect(frozen.lines[0].taxAllocation).toMatchObject({ consumedQuantity: "0.300", consumedValue: "0.00", allocatedValue: "0.01" })
    f.tx.businessEvent.findFirst.mockResolvedValue({ ...secondEvent, schemaVersion: 1, status: "APPLIED", processedAt: f.date, payloadHash: "payload-hash" })
    f.tx.supplierCreditNote.findFirst.mockResolvedValue({ ...second.supplierCreditNote, reversedBySupplierCreditNote: null })
    ;(reversePurchaseCorrectionLedgerInTx as jest.Mock).mockResolvedValue({ ledgerStatus: "POSTED", ledgerBatch: { id: "reverse-batch" }, journalEntryId: "reverse-journal" })
    const reversed = await reverseSupplierCreditNote({ organizationId: "org-1", supplierCreditNoteId: second.supplierCreditNote.id, postedById: "actor-1", idempotencyKey: "tax-reverse-1", creditNoteNumber: "RV-2", creditDate: f.date, documentHash: "sha256:tax-reversal", reason: "Reverse accepted credit" })
    expect(reversed.supplierCreditNote.total.toFixed(2)).toBe("0.02")
    expect(reversed.supplierCreditNote.taxAmount.toFixed(2)).toBe("0.01")
    expect((recordBusinessEventInTx as jest.Mock).mock.calls.at(-1)[1].payload.receiptCreditRecognition.lines).toEqual(frozen.lines)
    expect(reversePurchaseCorrectionLedgerInTx).toHaveBeenCalledWith(f.tx, expect.objectContaining({ originalJournalEntryId: "journal-1", originalSourceId: second.supplierCreditNote.id }))
  })
})
