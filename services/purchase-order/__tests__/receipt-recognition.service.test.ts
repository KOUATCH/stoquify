import { Prisma } from "@prisma/client"
import { createAPLedgerPosting } from "@/services/purchasing/ap-control.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { readReceiptRecognitionEvidence, readReceiptRecognitionSource } from "../receipt-recognition-source"
import { postReceiptRecognitionInTx } from "../receipt-recognition.service"
import { validateReceiptReturnStockForRecognition } from "@/services/purchasing/receipt-return-recognition"
jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/purchasing/ap-control.service", () => ({ createAPLedgerPosting: jest.fn() }))
jest.mock("@/services/accounting/periods.service", () => ({ getOpenPeriodForDate: jest.fn() }))
jest.mock("../receipt-recognition-source", () => ({ ...jest.requireActual("../receipt-recognition-source"), readReceiptRecognitionSource: jest.fn(), readReceiptRecognitionEvidence: jest.fn() }))
jest.mock("@/services/purchasing/receipt-return-recognition", () => ({ validateReceiptReturnStockForRecognition: jest.fn() }))
const source = { manifest: { receiptId: "receipt", receiptNumber: "GR-1", effectiveAt: "2026-09-30T12:00:00.000Z", supplierId: "supplier", currency: "EUR", version: 1, lines: [{ receiptLineId: "stock-line", stockTracked: true }, { receiptLineId: "service-line", stockTracked: false }] }, eventId: "source-event", sourceHash: "a".repeat(64), inventoryValue: new Prisma.Decimal(25) }
const mock = { supplierInvoice: { findFirst: jest.fn() }, purchaseReturnLine: { findFirst: jest.fn() } }
const tx = mock as unknown as Prisma.TransactionClient, input = { organizationId: "org", receiptId: "receipt", actorId: "receiver" }
beforeEach(() => {
  jest.clearAllMocks(); mock.supplierInvoice.findFirst.mockResolvedValue(null); mock.purchaseReturnLine.findFirst.mockResolvedValue(null)
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue(source)
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "BLOCKED" })
  ;(getOpenPeriodForDate as jest.Mock).mockResolvedValue({ id: "period" })
  ;(createAPLedgerPosting as jest.Mock).mockResolvedValue({ ledgerStatus: "POSTED", ledgerBatch: { id: "batch" } })
  ;(validateReceiptReturnStockForRecognition as jest.Mock).mockResolvedValue(undefined)
})
it("posts one whole receipt at its frozen effective date/currency and tracked cost", async () => {
  await expect(postReceiptRecognitionInTx(tx, input)).resolves.toMatchObject({ ledgerStatus: "POSTED" })
  expect(createAPLedgerPosting).toHaveBeenCalledTimes(1)
  expect(createAPLedgerPosting).toHaveBeenCalledWith(tx, expect.objectContaining({ sourceType: "GOODS_RECEIPT", postingPurpose: "GOODS_RECEIPT", journalPrefix: "APGR", currency: "EUR", sourceDate: new Date(source.manifest.effectiveAt), documentHash: source.sourceHash, amounts: expect.objectContaining({ sourceAmount: new Prisma.Decimal(25), costAmount: new Prisma.Decimal(25) }) }))
})
it.each(["legacy", "unverified", "invoice", "return"])("refuses unsafe %s recognition without effects", async kind => {
  if (kind === "legacy") (readReceiptRecognitionSource as jest.Mock).mockResolvedValue(null)
  if (kind === "unverified") (readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: false, accountingStatus: "UNVERIFIED" })
  if (kind === "invoice") mock.supplierInvoice.findFirst.mockResolvedValue({ id: "approved-invoice" })
  if (kind === "return") (validateReceiptReturnStockForRecognition as jest.Mock).mockRejectedValue(Object.assign(new Error("return evidence changed"), { code: "RECEIPT_EVIDENCE_REQUIRED" }))
  await expect(postReceiptRecognitionInTx(tx, input)).rejects.toMatchObject({ code: "RECEIPT_EVIDENCE_REQUIRED" })
  expect(createAPLedgerPosting).not.toHaveBeenCalled()
})
it("permits original receipt recovery after fully verified physical return evidence", async () => {
  await postReceiptRecognitionInTx(tx, input)
  expect(validateReceiptReturnStockForRecognition).toHaveBeenCalledWith(tx, source)
  expect(createAPLedgerPosting).toHaveBeenCalledTimes(1)
})
it("retains a genuine missing-rule outcome for authorized retry", async () => {
  ;(createAPLedgerPosting as jest.Mock).mockResolvedValue({ ledgerStatus: "BLOCKED_PENDING_RULES", ledgerBatch: { id: "batch" }, blockerCode: "GOODS_RECEIPT_POSTING_RULE_REVIEW" })
  await expect(postReceiptRecognitionInTx(tx, input)).resolves.toMatchObject({ ledgerStatus: "BLOCKED_PENDING_RULES" })
})
it("returns explicit not-required without a zero financial journal", async () => {
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "NOT_REQUIRED" })
  await expect(postReceiptRecognitionInTx(tx, input)).resolves.toEqual({ ledgerStatus: "NOT_REQUIRED", ledgerBatch: null })
  expect(createAPLedgerPosting).not.toHaveBeenCalled()
})
it("does not silently shift recognition from its closed acceptance period", async () => {
  ;(getOpenPeriodForDate as jest.Mock).mockRejectedValue(new Error("period closed"))
  await expect(postReceiptRecognitionInTx(tx, input)).rejects.toThrow("period closed")
  expect(createAPLedgerPosting).not.toHaveBeenCalled()
})
