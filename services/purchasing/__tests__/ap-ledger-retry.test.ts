import { Prisma } from "@prisma/client"
import { createAPLedgerPosting } from "../ap-control.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"
import { createLedgerPostingBatch, linkAccountingSource } from "@/services/accounting/posting.service"

jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/accounting/periods.service", () => ({ getOpenPeriodForDate: jest.fn() }))
jest.mock("@/services/accounting/posting-rules.service", () => ({ getActivePostingRule: jest.fn() }))
jest.mock("@/services/accounting/posting.service", () => ({ createLedgerPostingBatch: jest.fn(), linkAccountingSource: jest.fn() }))
jest.mock("@/services/accounting/journal-close-invalidation.service", () => ({ recordPostedJournalCloseInvalidationInTx: jest.fn() }))

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

type RuleLine = { lineNumber: number; mappingKey: string; side: "DEBIT" | "CREDIT"; amountSource: "NET_AMOUNT" | "SOURCE_AMOUNT" | "COST_AMOUNT" | "VARIANCE_AMOUNT" | "TAX_AMOUNT" | "GROSS_AMOUNT"; condition?: Record<string, string>; account?: ReturnType<typeof postingAccount> }
function postingAccount(mappingKey: string) {
  return { id: `account-${mappingKey}`, organizationId: "org-1", code: mappingKey, mappingKey, isActive: true, deletedAt: null, _count: { children: 0 } }
}
function recognitionRule(): RuleLine[] {
  return [
    { lineNumber: 1, mappingKey: "INVENTORY", side: "DEBIT", amountSource: "NET_AMOUNT", condition: { receiptRecognition: "LEGACY" } },
    { lineNumber: 2, mappingKey: "INVENTORY", side: "DEBIT", amountSource: "SOURCE_AMOUNT", condition: { receiptRecognition: "ACCRUAL" } },
    { lineNumber: 3, mappingKey: "GRNI", side: "DEBIT", amountSource: "COST_AMOUNT", condition: { receiptRecognition: "ACCRUAL" } },
    { lineNumber: 4, mappingKey: "INVENTORY_VARIANCE", side: "DEBIT", amountSource: "VARIANCE_AMOUNT", condition: { receiptRecognition: "ACCRUAL", receiptVarianceDirection: "DEBIT" } },
    { lineNumber: 5, mappingKey: "INVENTORY_VARIANCE", side: "CREDIT", amountSource: "VARIANCE_AMOUNT", condition: { receiptRecognition: "ACCRUAL", receiptVarianceDirection: "CREDIT" } },
    { lineNumber: 6, mappingKey: "INPUT_VAT", side: "DEBIT", amountSource: "TAX_AMOUNT" },
    { lineNumber: 7, mappingKey: "ACCOUNTS_PAYABLE", side: "CREDIT", amountSource: "GROSS_AMOUNT" },
  ]
}
function postingFixture(lines = recognitionRule()) {
  const { tx: retained } = fixture()
  const tx = {
    ...retained,
    chartOfAccount: { findMany: jest.fn().mockResolvedValue(["INVENTORY", "GRNI", "INVENTORY_VARIANCE", "INPUT_VAT", "ACCOUNTS_PAYABLE"].map(postingAccount)) },
    journal: { findFirst: jest.fn().mockResolvedValue({ id: "journal-1", code: "AC" }) },
    journalEntry: { ...retained.journalEntry, count: jest.fn().mockResolvedValue(0) },
    ledgerAuditEvent: { create: jest.fn() },
  }
  ;(createLedgerPostingBatch as jest.Mock).mockResolvedValue({ id: "batch-1" })
  ;(linkAccountingSource as jest.Mock).mockResolvedValue({ id: "source-link-1" })
  ;(getActivePostingRule as jest.Mock).mockResolvedValue({ id: "rule-1", code: "AP-INVOICE", lines })
  tx.ledgerPostingBatch.update.mockImplementation(async ({ data }) => ({ id: "batch-1", ...data }))
  tx.journalEntry.create.mockImplementation(async ({ data }) => ({ ...data, id: "journal-entry-1", lines: data.lines.create.map((line: Record<string, unknown>, index: number) => ({ ...line, id: `line-${index}` })) }))
  return tx
}
function accruedInput(variance: number): Parameters<typeof createAPLedgerPosting>[1] {
  return { ...input, amounts: { sourceAmount: new Prisma.Decimal(40), netAmount: new Prisma.Decimal(140 + variance), grossAmount: new Prisma.Decimal(165 + variance), taxAmount: new Prisma.Decimal(25), costAmount: new Prisma.Decimal(100), varianceAmount: new Prisma.Decimal(Math.abs(variance)) }, conditionContext: { receiptRecognition: "ACCRUAL", receiptVarianceDirection: variance > 0 ? "DEBIT" : variance < 0 ? "CREDIT" : "NONE" } }
}

test.each([-10, 0, 10])("clears receipt accrual and posts only remaining inventory with signed price variance %s", async variance => {
  const tx = postingFixture()
  const result = await createAPLedgerPosting(tx as unknown as Prisma.TransactionClient, accruedInput(variance))
  expect(result.ledgerStatus).toBe("POSTED")
  expect(tx.journalEntry.create).toHaveBeenCalledTimes(1)
  const lines = tx.journalEntry.create.mock.calls[0][0].data.lines.create as Array<{ accountId: string; debit: Prisma.Decimal; credit: Prisma.Decimal }>
  const values = Object.fromEntries(lines.map(line => [line.accountId, [line.debit.toFixed(2), line.credit.toFixed(2)]]))
  expect(values).toEqual({
    "account-INVENTORY": ["40.00", "0.00"], "account-GRNI": ["100.00", "0.00"],
    "account-INPUT_VAT": ["25.00", "0.00"], "account-ACCOUNTS_PAYABLE": ["0.00", (165 + variance).toFixed(2)],
    ...(variance === 0 ? {} : { "account-INVENTORY_VARIANCE": variance > 0 ? ["10.00", "0.00"] : ["0.00", "10.00"] }),
  })
})

test("empty recognition context preserves legacy inventory posting", async () => {
  const tx = postingFixture()
  await expect(createAPLedgerPosting(tx as unknown as Prisma.TransactionClient, input)).resolves.toMatchObject({ ledgerStatus: "POSTED" })
  const lines = tx.journalEntry.create.mock.calls[0][0].data.lines.create as Array<{ accountId: string; debit: Prisma.Decimal; credit: Prisma.Decimal }>
  expect(lines.map(line => [line.accountId, line.debit.toFixed(2), line.credit.toFixed(2)])).toEqual([
    ["account-INVENTORY", "2500.00", "0.00"], ["account-ACCOUNTS_PAYABLE", "0.00", "2500.00"],
  ])
})

test.each(["legacy inventory rule", "mislabelled explicit account"])("retains a review blocker before journaling an accrual under %s", async kind => {
  const lines = kind === "legacy inventory rule"
    ? recognitionRule().filter(line => [1, 6, 7].includes(line.lineNumber)).map(line => ({ ...line, condition: undefined }))
    : recognitionRule().map(line => line.mappingKey === "GRNI" ? { ...line, account: postingAccount("INVENTORY") } : line)
  const tx = postingFixture(lines)
  const result = await createAPLedgerPosting(tx as unknown as Prisma.TransactionClient, accruedInput(10))
  expect(result).toMatchObject({ ledgerStatus: "BLOCKED_PENDING_RULES", blockerCode: "AP_RECEIPT_RECOGNITION_RULE_REVIEW" })
  expect(tx.journalEntry.create).not.toHaveBeenCalled()
  expect(linkAccountingSource).not.toHaveBeenCalled()
  expect(tx.ledgerPostingBatch.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", metadata: expect.objectContaining({ blockerCode: "AP_RECEIPT_RECOGNITION_RULE_REVIEW" }) }) }))
})
