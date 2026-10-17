jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), organizationAccountingSettings: { findUnique: jest.fn() } } }))
jest.mock("@/services/modules/module-admission.service", () => ({ assertModuleNewWorkInTx: jest.fn() }))
jest.mock("../periods.service", () => ({ getOpenPeriodForDate: jest.fn().mockResolvedValue({ id: "period-1" }) }))

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { createManualJournalEntry, type ManualJournalLineInput } from "../journals.service"
import { ensureAccountingSettings, updateAccountingSettings } from "../accounting-settings.service"

const settings = { baseCurrency: "XAF", roundingScale: 2, roundingMode: "HALF_UP", setupStatus: "LOCKED" }
const tx = {
  organization: { findUnique: jest.fn() },
  organizationAccountingSettings: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  journal: { findFirst: jest.fn() },
  chartOfAccount: { findMany: jest.fn() },
  journalEntry: { count: jest.fn(), create: jest.fn(), update: jest.fn() },
  ledgerAuditEvent: { create: jest.fn() },
}
const mockDb = db as unknown as { $transaction: jest.Mock; organizationAccountingSettings: { findUnique: jest.Mock } }

function create(lines: ManualJournalLineInput[]) {
  return createManualJournalEntry("org-1", { journalId: "journal-1", entryDate: new Date("2026-06-15T00:00:00Z"), lines }, "maker")
}
function fxLines(rate: ManualJournalLineInput["exchangeRate"] = "655.957") {
  return [
    { accountId: "cash", debit: "100", currency: "EUR", exchangeRate: rate },
    { accountId: "sales", credit: "100", currency: "EUR", exchangeRate: rate },
  ]
}

beforeEach(() => {
  jest.resetAllMocks()
  mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
  // getOpenPeriodForDate is isolated from this currency contract test.
  require("../periods.service").getOpenPeriodForDate.mockResolvedValue({ id: "period-1" })
  mockDb.organizationAccountingSettings.findUnique.mockResolvedValue(settings)
  tx.organizationAccountingSettings.findUnique.mockResolvedValue(settings)
  tx.organizationAccountingSettings.update.mockImplementation(async ({ data }) => ({ ...settings, ...data }))
  tx.organization.findUnique.mockResolvedValue({ currency: "EUR" })
  tx.organizationAccountingSettings.create.mockImplementation(async ({ data }) => data)
  tx.journal.findFirst.mockResolvedValue({ id: "journal-1", code: "GEN", allowManualEntries: true })
  tx.chartOfAccount.findMany.mockResolvedValue(["cash", "sales"].map((id) => ({
    id, code: id, organizationId: "org-1", isActive: true, allowManualPost: true, currency: null, _count: { children: 0 },
  })))
  tx.journalEntry.count.mockResolvedValue(0)
  tx.journalEntry.create.mockResolvedValue({ id: "entry-1" })
  tx.journalEntry.update.mockResolvedValue({ id: "entry-1", entryNumber: "JE-1" })
})

describe("manual journal functional-currency amounts", () => {
  it("preserves 100 EUR nominal while storing 65,595.70 functional currency", async () => {
    await create(fxLines())
    const [debit, credit] = tx.journalEntry.create.mock.calls[0][0].data.lines.create
    expect(debit.debit.toFixed(2)).toBe("100.00")
    expect(debit.baseDebit.toFixed(2)).toBe("65595.70")
    expect(credit.baseCredit.toFixed(2)).toBe("65595.70")
    expect(debit.exchangeRate.toString()).toBe("655.957")
    expect(debit.currency).toBe("EUR")
  })

  it("defaults omitted denomination to the tenant functional currency", async () => {
    tx.organizationAccountingSettings.findUnique.mockResolvedValue({ ...settings, baseCurrency: "USD" })
    await create([{ accountId: "cash", debit: 25 }, { accountId: "sales", credit: 25 }])
    const saved = tx.journalEntry.create.mock.calls[0][0].data
    expect(saved.currency).toBe("USD")
    expect(saved.lines.create[0].baseDebit.toFixed(2)).toBe("25.00")
    expect(saved.lines.create[0].currency).toBe("USD")
  })

  it.each([undefined, null, "", "0", "-1", "NaN", "Infinity", "bogus", "1.1234567"])("rejects missing or invalid foreign rate %s without a draft", async (rate) => {
    const lines = fxLines()
    lines.forEach((line) => { line.exchangeRate = rate as string })
    await expect(create(lines)).rejects.toThrow(/exchange rate/i)
    expect(tx.journalEntry.create).not.toHaveBeenCalled()
  })

  it("rejects a non-unit rate for the functional currency", async () => {
    await expect(create(fxLines("2").map((line) => ({ ...line, currency: "XAF" })))).rejects.toThrow(/rate of one/i)
    expect(tx.journalEntry.create).not.toHaveBeenCalled()
  })

  it("rounds HALF_UP independently of binary floating point", async () => {
    await create(fxLines("1.005").map((line) => ({ ...line, debit: line.debit ? "1" : undefined, credit: line.credit ? "1" : undefined })))
    expect(tx.journalEntry.create.mock.calls[0][0].data.lines.create[0].baseDebit.toFixed(2)).toBe("1.01")
  })

  it("rejects nominally balanced lines whose rounded functional totals differ", async () => {
    const lines = fxLines()
    lines[1].exchangeRate = "656"
    await expect(create(lines)).rejects.toThrow(/not balanced for XAF/i)
    expect(tx.journalEntry.create).not.toHaveBeenCalled()
  })

  it.each([{ roundingMode: "HALF_EVEN" }, { roundingScale: 0 }])("rejects unsupported rounding contracts %j", async (policy) => {
    tx.organizationAccountingSettings.findUnique.mockResolvedValue({ ...settings, ...policy })
    await expect(create(fxLines())).rejects.toThrow(/rounding policy/i)
  })

  it("rejects negative amounts instead of manufacturing a correction", async () => {
    await expect(create(fxLines().map((line) => ({ ...line, debit: line.debit ? "-100" : undefined, credit: line.credit ? "-100" : undefined })))).rejects.toThrow(/negative/i)
  })

  it("supports a mixed-denomination balanced journal with distinct base amounts", async () => {
    await create([...fxLines(), { accountId: "cash", debit: 100, currency: "XAF" }, { accountId: "sales", credit: 100, currency: "XAF" }])
    const lines = tx.journalEntry.create.mock.calls[0][0].data.lines.create
    expect(lines.reduce((sum: Prisma.Decimal, line: { baseDebit: Prisma.Decimal }) => sum.plus(line.baseDebit), new Prisma.Decimal(0)).toFixed(2)).toBe("65695.70")
  })
})

describe("functional-currency authority", () => {
  it.each(["NOT_STARTED", "IN_PROGRESS", "READY", "LOCKED"])("blocks unsupported currency transitions for %s setup", async (setupStatus) => {
    tx.organizationAccountingSettings.findUnique.mockResolvedValue({ ...settings, setupStatus })
    await expect(updateAccountingSettings("org-1", { baseCurrency: "EUR" }, "actor")).rejects.toThrow(/controlled migration/i)
    expect(tx.organizationAccountingSettings.update).not.toHaveBeenCalled()
  })

  it("allows a normalized same-currency edit without relabeling history", async () => {
    await expect(updateAccountingSettings("org-1", { baseCurrency: " xaf ", taxRegime: "example" }, "actor")).resolves.toMatchObject({ baseCurrency: "XAF", taxRegime: "example" })
  })

  it("initializes accounting from the organization denomination", async () => {
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue(null)
    await expect(ensureAccountingSettings("org-1", "actor")).resolves.toMatchObject({ baseCurrency: "EUR" })
  })
})
