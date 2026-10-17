/** @jest-environment node */
import { Prisma } from "@prisma/client"
import { buildPOSCommitResult } from "@/services/pos/commit-result"

it("projects a mixed cash/credit sale without overstating receipt or fiscal authority", () => {
  const input = {
    clientCommitId: "pos:original-1", sale: { id: "sale", orderNumber: "POS-1", privateNote: "omit" },
    updatedSale: { status: "COMPLETED", paymentStatus: "PARTIAL" },
    total: new Prisma.Decimal("100.25"), amountPaid: "60.10", onAccountAmount: "40.15", changeDue: "0.90",
    saleJournalEntry: { id: "j1", entryNumber: "SALE-1", privateNote: "omit" },
    paymentJournalEntries: [{ id: "j2", entryNumber: "PAY-1", privateNote: "omit" }],
    journalEntries: [{ account: "cash", debit: "60.10", credit: 0 }, { account: "credit", debit: "40.15", credit: 0 }, { account: "revenue", debit: 0, credit: "100.25" }],
    totalDebits: "100.25", totalCredits: "100.25", fiscalizationRequestId: "fiscal-request",
  }
  const before = JSON.stringify(input)
  const result = buildPOSCommitResult(input)
  expect(result).toEqual({
    clientCommitId: "pos:original-1", resultSchemaVersion: 1, replayed: false,
    saleId: "sale", orderNumber: "POS-1", status: "COMPLETED", paymentStatus: "PARTIAL",
    total: 100.25, amountPaid: 60.10, onAccountAmount: 40.15, changeDue: 0.90,
    accountingMovements: { saleJournalEntry: { id: "j1", entryNumber: "SALE-1", postingBatchId: null }, paymentJournalEntries: [{ id: "j2", entryNumber: "PAY-1" }], entries: [{ account: "cash", debit: 60.10, credit: 0 }, { account: "credit", debit: 40.15, credit: 0 }, { account: "revenue", debit: 0, credit: 100.25 }], totalDebits: 100.25, totalCredits: 100.25 },
    fiscalDocument: null, fiscalization: { requestId: "fiscal-request", status: "PENDING", authoritative: false, watermark: "NOT FOR STATUTORY USE" }, receipt: null, receiptStatus: "RETRY_REQUIRED", delivery: null,
  })
  expect(JSON.stringify(input)).toBe(before)
  expect(JSON.stringify(result)).not.toContain("privateNote")
  expect(buildPOSCommitResult({ ...input, saleJournalEntry: { ...input.saleJournalEntry, postingBatchId: "batch-1" } }).accountingMovements.saleJournalEntry.postingBatchId).toBe("batch-1")
})
