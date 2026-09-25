import { Prisma } from "@prisma/client"
import { createAPLedgerPosting } from "../ap-control.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"

jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/accounting/periods.service", () => ({ getOpenPeriodForDate: jest.fn() }))
jest.mock("@/services/accounting/posting-rules.service", () => ({ getActivePostingRule: jest.fn() }))

const input: Parameters<typeof createAPLedgerPosting>[1] = {
  organizationId: "org-1", sourceId: "invoice-1", sourceType: "SUPPLIER_INVOICE",
  postingPurpose: "SUPPLIER_INVOICE", periodId: "period-1", sourceNumber: "INV-1",
  sourceDate: new Date("2026-08-10"), supplierId: "supplier-1", currency: "XAF",
  journalType: "PURCHASE", journalPrefix: "APINV", memo: "Invoice",
  documentHash: "sha256:document", blockerCode: "AP_POSTING_RULE_REVIEW", blockerMessage: "Configure posting",
  amounts: { sourceAmount: new Prisma.Decimal(2500), grossAmount: new Prisma.Decimal(2500), netAmount: new Prisma.Decimal(2500), taxAmount: new Prisma.Decimal(0), costAmount: new Prisma.Decimal(2500) },
}

function fixture(batchOverrides: Record<string, unknown> = {}, entries: unknown[] = []) {
  const batch = { id: "batch-1", organizationId: "org-1", sourceType: "SUPPLIER_INVOICE", sourceId: "invoice-1", postingPurpose: "SUPPLIER_INVOICE", periodId: "period-1", status: "FAILED", sourceLinks: [], postedAt: null, reversedAt: null, metadata: { documentHash: "sha256:document" }, ...batchOverrides }
  const tx = { $queryRaw: jest.fn().mockResolvedValue([]), ledgerPostingBatch: { findMany: jest.fn().mockResolvedValue([batch]), update: jest.fn() }, journalEntry: { findMany: jest.fn().mockResolvedValue(entries), create: jest.fn() } }
  return { tx, post: () => createAPLedgerPosting(tx as unknown as Prisma.TransactionClient, input) }
}

beforeEach(() => { jest.clearAllMocks(); (getOpenPeriodForDate as jest.Mock).mockResolvedValue({ id: "period-1" }) })

test.each(["POSTED", "REVERSED", "PENDING"])("does not manufacture journal evidence from a %s batch", async status => {
  const { tx, post } = fixture({ status })
  await expect(post()).rejects.toThrow(/evidence|unresolved|reversed/i)
  expect(tx.ledgerPostingBatch.update).not.toHaveBeenCalled()
  expect(tx.journalEntry.create).not.toHaveBeenCalled()
  expect(getActivePostingRule).not.toHaveBeenCalled()
})

test("a failed batch with retained journal effects requires reconciliation", async () => {
  const { tx, post } = fixture({}, [{ id: "prior-journal" }])
  await expect(post()).rejects.toThrow(/unresolved/)
  expect(tx.journalEntry.create).not.toHaveBeenCalled()
})

test("a conflicting idempotency record cannot redirect the source", async () => {
  const { tx, post } = fixture({ sourceId: "another-invoice" })
  await expect(post()).rejects.toThrow(/conflicts/)
  expect(tx.ledgerPostingBatch.update).not.toHaveBeenCalled()
})

test("changed blocked document evidence requires review", async () => {
  const { tx, post } = fixture({ metadata: { documentHash: "sha256:different" } })
  await expect(post()).rejects.toThrow(/source evidence changed/)
  expect(tx.journalEntry.create).not.toHaveBeenCalled()
})

test("a period from another source date cannot be used for recovery", async () => {
  const { tx, post } = fixture()
  ;(getOpenPeriodForDate as jest.Mock).mockResolvedValue({ id: "different-period" })
  await expect(post()).rejects.toThrow(/period does not match/)
  expect(tx.journalEntry.create).not.toHaveBeenCalled()
})
