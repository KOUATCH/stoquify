jest.mock("@/prisma/db", () => ({
  db: {
    chartOfAccount: { findMany: jest.fn() },
    journalEntryLine: { findMany: jest.fn() },
  },
}))

import { JournalEntryStatus, Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getTrialBalance } from "../reports.service"

const mockDb = db as unknown as {
  chartOfAccount: { findMany: jest.Mock }
  journalEntryLine: { findMany: jest.Mock }
}

function account(id: string, code: string, archived = false, organizationId = "org-1") {
  return {
    id, code, nameEn: id, nameFr: null, organizationId,
    type: code.startsWith("7") ? "REVENUE" : "ASSET",
    normalBalance: code.startsWith("7") ? "CREDIT" : "DEBIT",
    isActive: !archived,
    deletedAt: archived ? new Date("2026-08-01T00:00:00Z") : null,
  }
}

function line(descriptor: ReturnType<typeof account>, debit: number, credit: number, options: {
  periodId?: string; entryDate?: string; status?: JournalEntryStatus; organizationId?: string;
} = {}) {
  return {
    accountId: descriptor.id, account: descriptor,
    organizationId: options.organizationId ?? "org-1",
    debit: new Prisma.Decimal(debit), credit: new Prisma.Decimal(credit),
    baseDebit: new Prisma.Decimal(debit), baseCredit: new Prisma.Decimal(credit),
    journalEntry: {
      organizationId: options.organizationId ?? "org-1", periodId: options.periodId ?? "period-1",
      status: options.status ?? JournalEntryStatus.POSTED,
      entryDate: new Date(options.entryDate ?? "2026-06-10T00:00:00Z"),
    },
  }
}

describe("trial balance retained account evidence", () => {
  const cash = account("cash", "571", true)
  const sales = account("sales", "701", true)
  const unused = account("unused", "521")

  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.chartOfAccount.findMany.mockResolvedValue([unused])
    mockDb.journalEntryLine.findMany.mockResolvedValue([line(cash, 120, 0), line(sales, 0, 120)])
  })

  it("keeps both archived sides of posted activity instead of returning a balanced zero", async () => {
    const report = await getTrialBalance({ organizationId: "org-1", includeZeroBalance: false })
    expect(report.rows.map(row => row.accountId)).toEqual(["cash", "sales"])
    expect(report.rows[0]).toMatchObject({ code: "571", activityDebit: "120.00", debitBalance: "120.00" })
    expect(report.totals).toEqual({ activityDebit: "120.00", activityCredit: "120.00", debitBalance: "120.00", creditBalance: "120.00", isBalanced: true })
  })

  it("preserves an archived side alongside an active account and sorts by account code", async () => {
    const activeSales = account("sales", "701")
    mockDb.chartOfAccount.findMany.mockResolvedValue([activeSales, unused])
    mockDb.journalEntryLine.findMany.mockResolvedValue([line(activeSales, 0, 120), line(cash, 120, 0)])
    const report = await getTrialBalance({ organizationId: "org-1", includeZeroBalance: true })
    expect(report.rows.map(row => row.code)).toEqual(["521", "571", "701"])
    expect(report.totals.isBalanced).toBe(true)
    expect(report.rows.find(row => row.accountId === "unused")?.activityDebit).toBe("0.00")
  })

  it("includes reversed original and compensating posted activity without reviving new-post eligibility", async () => {
    mockDb.journalEntryLine.findMany.mockResolvedValue([
      line(cash, 120, 0, { status: JournalEntryStatus.REVERSED }),
      line(sales, 0, 120, { status: JournalEntryStatus.REVERSED }),
      line(cash, 0, 120), line(sales, 120, 0),
    ])
    const report = await getTrialBalance({ organizationId: "org-1", includeZeroBalance: false })
    expect(report.rows).toHaveLength(2)
    expect(report.totals).toEqual({ activityDebit: "240.00", activityCredit: "240.00", debitBalance: "0.00", creditBalance: "0.00", isBalanced: true })
    expect(cash.isActive).toBe(false)
    expect(cash.deletedAt).not.toBeNull()
  })

  it("retains tenant, posted-state, period and date filtering for archived sources", async () => {
    const entries = [
      line(cash, 120, 0), line(sales, 0, 120),
      line(cash, 900, 0, { status: JournalEntryStatus.DRAFT }),
      line(cash, 800, 0, { organizationId: "org-other" }),
      line(cash, 700, 0, { periodId: "period-other" }),
      line(cash, 600, 0, { entryDate: "2026-05-10T00:00:00Z" }),
      line(cash, 500, 0, { entryDate: "2026-07-10T00:00:00Z" }),
    ]
    mockDb.journalEntryLine.findMany.mockImplementation(async ({ where }) => entries.filter(entry => {
      const scoped = where.journalEntry
      return entry.organizationId === where.organizationId && entry.journalEntry.organizationId === scoped.organizationId &&
        scoped.status.in.includes(entry.journalEntry.status) && entry.journalEntry.periodId === scoped.periodId &&
        entry.journalEntry.entryDate >= scoped.entryDate.gte && entry.journalEntry.entryDate <= scoped.entryDate.lte
    }))
    const startDate = new Date("2026-06-01T00:00:00Z")
    const endDate = new Date("2026-06-30T23:59:59Z")
    const report = await getTrialBalance({ organizationId: "org-1", periodId: "period-1", startDate, endDate })
    expect(report.totals.activityDebit).toBe("120.00")
    expect(report.totals.isBalanced).toBe(true)
    expect(mockDb.journalEntryLine.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-1", journalEntry: { organizationId: "org-1", periodId: "period-1", status: { in: ["POSTED", "REVERSED"] }, entryDate: { gte: startDate, lte: endDate } } },
      include: expect.objectContaining({ account: true }),
    }))
  })

  it.each(["missing", "foreign", "mismatched"])("rejects %s historical account evidence instead of dropping the amount", async (invalid) => {
    const entry = line(cash, 120, 0)
    mockDb.journalEntryLine.findMany.mockResolvedValue([{
      ...entry,
      account: invalid === "missing" ? null : invalid === "foreign" ? account("cash", "571", true, "org-other") : account("other-id", "571", true),
    }])
    await expect(getTrialBalance({ organizationId: "org-1" })).rejects.toThrow(/account evidence/i)
  })

  it("does not turn failed line reads into a zero report", async () => {
    mockDb.journalEntryLine.findMany.mockRejectedValue(new Error("ledger unavailable"))
    await expect(getTrialBalance({ organizationId: "org-1" })).rejects.toThrow("ledger unavailable")
  })
})
