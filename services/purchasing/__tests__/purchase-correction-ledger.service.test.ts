import { AccountingSourceType, Prisma } from "@prisma/client"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { lockJournalReversalClosePeriodsInTx } from "@/services/accounting/journal-reversal-order.service"
import { recordOrderedReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { recordInventoryValuationCloseInvalidationInTx } from "@/services/inventory/inventory-close-invalidation.service"
import { createLedgerPostingBatch, linkAccountingSource } from "@/services/accounting/posting.service"
import { preparePurchaseCorrectionReversalInTx, reversePurchaseCorrectionLedgerInTx, recordPurchaseCorrectionReversalCloseInvalidationsInTx } from "../purchase-correction-ledger.service"

jest.mock("@/services/accounting/periods.service", () => ({ getOpenPeriodForDate: jest.fn() }))
jest.mock("@/services/accounting/journal-reversal-order.service", () => ({ lockJournalReversalClosePeriodsInTx: jest.fn() }))
jest.mock("@/services/accounting/journal-close-invalidation.service", () => ({ recordOrderedReversedJournalCloseInvalidationsInTx: jest.fn() }))
jest.mock("@/services/accounting/close-assurance-pack.service", () => ({ recordCloseCertificationInvalidationsForSourceInTx: jest.fn() }))
jest.mock("@/services/inventory/inventory-close-invalidation.service", () => ({ recordInventoryValuationCloseInvalidationInTx: jest.fn() }))
jest.mock("@/services/accounting/posting.service", () => ({ createLedgerPostingBatch: jest.fn(), linkAccountingSource: jest.fn() }))

const originalDate = new Date("2026-08-15T12:00:00Z"), reversalDate = new Date("2026-09-15T12:00:00Z")
const decimal = (value: string | number) => new Prisma.Decimal(value)
function fixture(posted = false, sourceType: "PURCHASE_RETURN" | "SUPPLIER_CREDIT_NOTE" = "PURCHASE_RETURN") {
  const original = posted ? { id: "original-journal", organizationId: "org", journalId: "journal", periodId: "original-period", entryDate: originalDate,
    postingBatchId: "original-batch", entryNumber: "ORIGINAL", status: "POSTED", currency: "USD", reversedByEntries: [],
    lines: [{ accountId: "account", account: { syscohadaClass: "40" }, description: "Original", debit: decimal(12), credit: decimal(0), baseDebit: decimal(14), baseCredit: decimal(0), currency: "USD", exchangeRate: decimal("1.1667"), supplierId: "supplier" }] } : null
  const raw = { $queryRaw: jest.fn().mockResolvedValue([]),
    journalEntry: { findFirst: jest.fn().mockResolvedValue(original), count: jest.fn().mockResolvedValue(0), create: jest.fn().mockImplementation(async args => ({ id: "reversal-journal", ...args.data })), update: jest.fn().mockResolvedValue({}) },
    ledgerPostingBatch: { findFirst: jest.fn().mockResolvedValue({ id: "original-batch", periodId: "batch-period", status: posted ? "POSTED" : "FAILED", journalEntries: posted ? [{ id: "original-journal" }] : [] }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn().mockImplementation(async args => ({ id: args.where.id, ...args.data })) },
    ledgerAuditEvent: { create: jest.fn().mockResolvedValue({}) } }
  const tx = raw as unknown as Prisma.TransactionClient
  const input = { organizationId: "org", sourceType, originalSourceId: "original-source", originalJournalEntryId: original?.id ?? null, originalPostingBatchId: "original-batch", originalSourceDate: originalDate, reversalDate }
  const command = { ...input, sourceId: "reversal-source", sourceNumber: "REV-1", sourceDate: reversalDate, supplierId: "supplier", documentHash: "sha256:owned", reason: "Correct original", metadata: {} }
  return { raw, tx, original, input, command }
}
beforeEach(() => {
  jest.resetAllMocks()
  ;(getOpenPeriodForDate as jest.Mock).mockResolvedValue({ id: "reversal-period" })
  ;(lockJournalReversalClosePeriodsInTx as jest.Mock).mockResolvedValue(["original-period", "batch-period", "reversal-period", "later-period"])
  ;(createLedgerPostingBatch as jest.Mock).mockResolvedValue({ id: "reversal-batch" })
  ;(linkAccountingSource as jest.Mock).mockResolvedValue({ id: "reversal-link" })
})
it.each([AccountingSourceType.PURCHASE_RETURN, AccountingSourceType.SUPPLIER_CREDIT_NOTE])("requires an OPEN reversal period for unposted %s before changing its batch", async sourceType => {
  const f = fixture(false, sourceType)
  ;(getOpenPeriodForDate as jest.Mock).mockRejectedValue(new Error("Accounting period is closed"))
  await expect(preparePurchaseCorrectionReversalInTx(f.tx, f.input)).rejects.toThrow("closed")
  expect(f.raw.ledgerPostingBatch.updateMany).not.toHaveBeenCalled()
  expect(createLedgerPostingBatch).not.toHaveBeenCalled()
})
it("requires a period even when neither batch nor journal exists", async () => {
  const f = fixture(); f.raw.ledgerPostingBatch.findFirst.mockResolvedValue(null)
  ;(getOpenPeriodForDate as jest.Mock).mockRejectedValue(new Error("No accounting period"))
  await expect(preparePurchaseCorrectionReversalInTx(f.tx, { ...f.input, originalPostingBatchId: null })).rejects.toThrow("No accounting period")
})
it.each([AccountingSourceType.PURCHASE_RETURN, AccountingSourceType.SUPPLIER_CREDIT_NOTE])("cancels only matching unposted %s without inventing a journal", async sourceType => {
  const f = fixture(false, sourceType), prepared = await preparePurchaseCorrectionReversalInTx(f.tx, f.input)
  await expect(reversePurchaseCorrectionLedgerInTx(f.tx, f.command, prepared)).resolves.toBeNull()
  expect(lockJournalReversalClosePeriodsInTx).toHaveBeenCalledWith(f.tx, "org", expect.objectContaining({ originalPeriodId: null, additionalPeriodIds: ["batch-period"], additionalEvidenceDates: [originalDate], includeLaterPeriods: sourceType === "PURCHASE_RETURN" }))
  expect(f.raw.ledgerPostingBatch.updateMany).toHaveBeenCalledWith({ where: { id: "original-batch", organizationId: "org", sourceType, sourceId: "original-source", postingPurpose: sourceType, status: { in: ["PENDING", "FAILED"] }, journalEntries: { none: {} } }, data: { status: "REVERSED", reversedAt: expect.any(Date) } })
  expect(f.raw.journalEntry.create).not.toHaveBeenCalled()
  expect(recordOrderedReversedJournalCloseInvalidationsInTx).not.toHaveBeenCalled()
  expect(recordCloseCertificationInvalidationsForSourceInTx).not.toHaveBeenCalled()
})
it("rejects hidden journals before cancelling retained batches", async () => {
  const f = fixture(); f.raw.journalEntry.findFirst.mockResolvedValue({ id: "hidden" })
  await expect(preparePurchaseCorrectionReversalInTx(f.tx, f.input)).rejects.toThrow("journal evidence")
  expect(f.raw.ledgerPostingBatch.updateMany).not.toHaveBeenCalled()
})
it.each([null, { id: "original-batch", status: "POSTED", journalEntries: [] }, { id: "original-batch", status: "FAILED", journalEntries: [{ id: "hidden" }] }])("rejects unavailable or inconsistent unposted batch evidence %#", async batch => {
  const f = fixture(); f.raw.ledgerPostingBatch.findFirst.mockResolvedValue(batch)
  await expect(preparePurchaseCorrectionReversalInTx(f.tx, f.input)).rejects.toThrow("inconsistent")
  expect(f.raw.ledgerPostingBatch.updateMany).not.toHaveBeenCalled()
})
it("refuses source-hidden batch evidence", async () => {
  const f = fixture()
  await expect(preparePurchaseCorrectionReversalInTx(f.tx, { ...f.input, originalPostingBatchId: null })).rejects.toThrow("posting evidence")
})
it("retains a CAS refusal after preparation without writing false cancellation audit", async () => {
  const f = fixture(), prepared = await preparePurchaseCorrectionReversalInTx(f.tx, f.input)
  f.raw.ledgerPostingBatch.updateMany.mockResolvedValue({ count: 0 })
  await expect(reversePurchaseCorrectionLedgerInTx(f.tx, f.command, prepared)).rejects.toThrow("inconsistent")
  expect(f.raw.ledgerAuditEvent.create).not.toHaveBeenCalled()
})
it("mirrors retained functional amounts and defers journal/inventory invalidation until the owner finishes", async () => {
  const f = fixture(true), prepared = await preparePurchaseCorrectionReversalInTx(f.tx, f.input)
  expect(f.raw.journalEntry.create).not.toHaveBeenCalled()
  const posting = await reversePurchaseCorrectionLedgerInTx(f.tx, f.command, prepared)
  expect(f.raw.journalEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reversalOfEntryId: "original-journal", periodId: "reversal-period", sourceId: "reversal-source", lines: { create: [expect.objectContaining({ debit: decimal(0), credit: decimal(12), baseDebit: decimal(0), baseCredit: decimal(14) })] } }) })
  expect(recordOrderedReversedJournalCloseInvalidationsInTx).not.toHaveBeenCalled()
  expect(recordInventoryValuationCloseInvalidationInTx).not.toHaveBeenCalled()
  await recordPurchaseCorrectionReversalCloseInvalidationsInTx(f.tx, prepared, { sourceId: "reversal-source", documentHash: "sha256:owned", posting })
  expect(recordOrderedReversedJournalCloseInvalidationsInTx).toHaveBeenCalledWith(f.tx, "org", expect.objectContaining({ originalPeriodId: "original-period", reversalPeriodId: "reversal-period", affectedPeriodIds: prepared.affectedPeriodIds }), expect.any(Object))
  expect((recordOrderedReversedJournalCloseInvalidationsInTx as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((recordInventoryValuationCloseInvalidationInTx as jest.Mock).mock.invocationCallOrder[0])
})
it("binds the retained posted source and accounts before deciding cumulative scope", async () => {
  const f = fixture(true, "SUPPLIER_CREDIT_NOTE"); f.original!.lines[0].account.syscohadaClass = "31"
  await preparePurchaseCorrectionReversalInTx(f.tx, f.input)
  expect(f.raw.journalEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "original-journal", organizationId: "org", sourceType: "SUPPLIER_CREDIT_NOTE", sourceId: "original-source" } }))
  expect(lockJournalReversalClosePeriodsInTx).toHaveBeenCalledWith(f.tx, "org", expect.objectContaining({ includeLaterPeriods: true }))
})
it("preparation cannot be reused by a different transaction or source", async () => {
  const f = fixture(true), prepared = await preparePurchaseCorrectionReversalInTx(f.tx, f.input)
  await expect(reversePurchaseCorrectionLedgerInTx({} as Prisma.TransactionClient, f.command, prepared)).rejects.toThrow("same transaction")
  await expect(reversePurchaseCorrectionLedgerInTx(f.tx, { ...f.command, organizationId: "foreign" }, prepared)).rejects.toThrow("differs")
  await expect(reversePurchaseCorrectionLedgerInTx(f.tx, { ...f.command, sourceDate: originalDate }, prepared)).rejects.toThrow("differs")
  expect(f.raw.journalEntry.create).not.toHaveBeenCalled()
})
it("uses supplier-credit provenance for no-journal completion", async () => {
  const f = fixture(false, "SUPPLIER_CREDIT_NOTE"), prepared = await preparePurchaseCorrectionReversalInTx(f.tx, f.input)
  await recordPurchaseCorrectionReversalCloseInvalidationsInTx(f.tx, prepared, { sourceId: "reversal-credit", documentHash: "sha256:owned", posting: null })
  expect(recordCloseCertificationInvalidationsForSourceInTx).toHaveBeenCalledWith(f.tx, "org", expect.objectContaining({ sourceCode: "SUPPLIER_CREDIT_NOTE_REVERSED", sourceId: "reversal-credit", periodIds: prepared.affectedPeriodIds }), expect.any(Object))
  expect(recordOrderedReversedJournalCloseInvalidationsInTx).not.toHaveBeenCalled()
})
