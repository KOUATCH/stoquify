jest.mock("@/prisma/db", () => ({ db: {
  $transaction: jest.fn(),
  journalEntryLine: { findMany: jest.fn(), aggregate: jest.fn() },
  chartOfAccount: { findMany: jest.fn() },
} }))

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getGeneralLedger, getTrialBalance } from "../reports.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  journalEntryLine: { findMany: jest.Mock; aggregate: jest.Mock }
  chartOfAccount: { findMany: jest.Mock }
}
const startDate = new Date("2026-06-01T00:00:00Z")
const endDate = new Date("2026-06-30T23:59:59.999Z")
function row(id: string, debit: string, credit: string, baseDebit = debit, baseCredit = credit) {
  return { id, accountId: "cash", journalEntryId: id, description: null,
    debit: new Prisma.Decimal(debit), credit: new Prisma.Decimal(credit),
    baseDebit: new Prisma.Decimal(baseDebit), baseCredit: new Prisma.Decimal(baseCredit),
    account: { id: "cash", organizationId: "org-1", code: "571", nameEn: "Cash" },
    journalEntry: { entryNumber: id, entryDate: startDate, journal: { code: "GEN" }, period: { name: "June" } },
  }
}
beforeEach(() => {
  jest.resetAllMocks()
  mockDb.$transaction.mockImplementation(async (handler) => handler(mockDb))
  mockDb.journalEntryLine.aggregate.mockResolvedValue({ _sum: { baseDebit: new Prisma.Decimal(100), baseCredit: new Prisma.Decimal(0) }, _count: { _all: 1, baseDebit: 1, baseCredit: 1 } })
  mockDb.journalEntryLine.findMany.mockResolvedValue([row("entry-1", "25", "0")])
})

it("includes the opening 100 and range movement 25 in closing 125", async () => {
  const result = await getGeneralLedger({ organizationId: "org-1", accountId: "cash", startDate, endDate })
  expect(result[0]).toMatchObject({ openingBalance: "100.00", debit: "25.00", credit: "0.00", periodMovement: "25.00", runningBalance: "125.00" })
  expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  expect(mockDb.journalEntryLine.aggregate).toHaveBeenCalledWith({
    where: { organizationId: "org-1", accountId: "cash", journalEntry: {
      organizationId: "org-1", status: { in: ["POSTED", "REVERSED"] }, entryDate: { lt: startDate },
    } }, _sum: { baseDebit: true, baseCredit: true }, _count: { _all: true, baseDebit: true, baseCredit: true },
  })
  expect(mockDb.journalEntryLine.findMany.mock.calls[0][0].where.journalEntry.entryDate).toEqual({ gte: startDate, lte: endDate })
})

it("uses converted functional amounts for the ledger, including compensating credits", async () => {
  mockDb.journalEntryLine.findMany.mockResolvedValue([row("eur", "100", "0", "65595.70"), row("reversal", "0", "100", "0", "65595.70")])
  const result = await getGeneralLedger({ organizationId: "org-1", accountId: "cash", startDate, endDate })
  expect(result[0]).toMatchObject({ debit: "65595.70", runningBalance: "65695.70" })
  expect(result[1]).toMatchObject({ credit: "65595.70", runningBalance: "100.00", periodMovement: "0.00" })
})

it("uses zero opening only for an unbounded ledger", async () => {
  const result = await getGeneralLedger({ organizationId: "org-1", accountId: "cash" })
  expect(mockDb.journalEntryLine.aggregate).not.toHaveBeenCalled()
  expect(result[0]).toMatchObject({ openingBalance: "0.00", runningBalance: "25.00" })
})

it("treats a known empty opening population as zero", async () => {
  mockDb.journalEntryLine.aggregate.mockResolvedValue({ _sum: { baseDebit: null, baseCredit: null }, _count: { _all: 0, baseDebit: 0, baseCredit: 0 } })
  expect((await getGeneralLedger({ organizationId: "org-1", accountId: "cash", startDate }))[0].runningBalance).toBe("25.00")
})

it("propagates failed opening reads rather than understating the ledger", async () => {
  mockDb.journalEntryLine.aggregate.mockRejectedValue(new Error("opening evidence unavailable"))
  await expect(getGeneralLedger({ organizationId: "org-1", accountId: "cash", startDate })).rejects.toThrow("opening evidence unavailable")
  expect(mockDb.journalEntryLine.findMany).not.toHaveBeenCalled()
})

it("rejects reversed date bounds before querying", async () => {
  await expect(getGeneralLedger({ organizationId: "org-1", accountId: "cash", startDate: endDate, endDate: startDate })).rejects.toThrow(/end date/i)
  expect(mockDb.journalEntryLine.aggregate).not.toHaveBeenCalled()
})

it("aggregates mixed-currency trial balance activity in functional currency", async () => {
  mockDb.chartOfAccount.findMany.mockResolvedValue([])
  mockDb.journalEntryLine.findMany.mockResolvedValue([row("eur", "100", "0", "65595.70"), row("xaf", "100", "0")])
  const result = await getTrialBalance({ organizationId: "org-1" })
  expect(result.rows[0].activityDebit).toBe("65695.70")
  expect(result.totals.activityDebit).toBe("65695.70")
})

it("does not treat a missing historical base amount as zero or a nominal amount", async () => {
  mockDb.chartOfAccount.findMany.mockResolvedValue([])
  mockDb.journalEntryLine.findMany.mockResolvedValue([{ ...row("missing-base", "100", "0"), baseDebit: null }])
  await expect(getTrialBalance({ organizationId: "org-1" })).rejects.toThrow(/functional-currency evidence/i)
  await expect(getGeneralLedger({ organizationId: "org-1", accountId: "cash" })).rejects.toThrow(/functional-currency evidence/i)
})

it("detects missing base evidence even when aggregate SUM would skip a null line", async () => {
  mockDb.journalEntryLine.aggregate.mockResolvedValue({ _sum: { baseDebit: new Prisma.Decimal(100), baseCredit: new Prisma.Decimal(0) }, _count: { _all: 2, baseDebit: 1, baseCredit: 2 } })
  await expect(getGeneralLedger({ organizationId: "org-1", accountId: "cash", startDate })).rejects.toThrow(/opening ledger/i)
  expect(mockDb.journalEntryLine.findMany).not.toHaveBeenCalled()
})
