import { Prisma } from "@prisma/client"
import { correctionJournalHash, correctionJournalInclude, type CorrectionJournal } from "../payment-suspense-cycle-ledger.service"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"

it("retains the previous journal evidence format when account classification is selected", () => {
  const line = { id: "line-1", lineNumber: 1, accountId: "account-1", currency: "XAF", debit: new Prisma.Decimal("100.25"), credit: new Prisma.Decimal(0),
    baseDebit: new Prisma.Decimal("100.25"), baseCredit: new Prisma.Decimal(0), exchangeRate: new Prisma.Decimal(1), dimensions: null,
    locationId: null, customerId: null, supplierId: null, itemId: null, account: { organizationId: "org-1" } }
  const before = { id: "journal-1", organizationId: "org-1", journalId: "general", periodId: "period-1", postingBatchId: "batch-1",
    entryDate: new Date("2026-09-10T00:00:00Z"), entryNumber: "SP-001", sourceType: "PAYMENT_SUSPENSE", sourceId: "suspense-1",
    postingPurpose: "SUSPENSE_RECLASSIFICATION", currency: "XAF", postedById: "checker", reversalOfEntryId: null, lines: [line] }
  // Retained V1 approval/cycle receipts bind these scalar financial values.
  const retainedV1Hash = suspenseEvidenceHash({ id: "journal-1", organizationId: "org-1", journalId: "general", periodId: "period-1", postingBatchId: "batch-1",
    entryDate: "2026-09-10T00:00:00.000Z", entryNumber: "SP-001", sourceType: "PAYMENT_SUSPENSE", sourceId: "suspense-1", purpose: "SUSPENSE_RECLASSIFICATION",
    currency: "XAF", postedById: "checker", reversalOfEntryId: null,
    lines: [{ lineNumber: 1, accountId: "account-1", currency: "XAF", debit: "100.25", credit: "0", baseDebit: "100.25", baseCredit: "0", exchangeRate: "1",
      dimensions: null, locationId: null, customerId: null, supplierId: null, itemId: null }] })
  const withClass = { ...before, lines: [{ ...line, account: { ...line.account, syscohadaClass: "3", nameEn: "Current display name" } }] }
  expect(correctionJournalInclude.lines.include.account.select.syscohadaClass).toBe(true)
  expect(correctionJournalHash(before as unknown as CorrectionJournal)).toBe(retainedV1Hash)
  expect(correctionJournalHash(withClass as unknown as CorrectionJournal)).toBe(retainedV1Hash)
  expect(correctionJournalHash({ ...withClass, lines: [{ ...withClass.lines[0], debit: new Prisma.Decimal("101.25") }] } as unknown as CorrectionJournal)).not.toBe(retainedV1Hash)
})
