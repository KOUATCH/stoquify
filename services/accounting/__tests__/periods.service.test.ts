jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"

import { closeAccountingPeriod, createFiscalYearWithPeriods, getOpenPeriodForDate } from "../periods.service"

const mockTx = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  closeRun: { findFirst: jest.fn(), findMany: jest.fn() },
  closePackExport: { findFirst: jest.fn() },
  periodControlEvent: { create: jest.fn() },
  fiscalYear: { create: jest.fn(), findUniqueOrThrow: jest.fn() },
  accountingPeriod: {
    createMany: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  journalEntry: {
    count: jest.fn(),
  },
  ledgerPostingBatch: {
    count: jest.fn(),
  },
  journalEntryLine: {
    findMany: jest.fn(),
  },
  paymentException: {
    count: jest.fn(),
  },
  suspenseItem: {
    count: jest.fn(),
  },
  reconciliationRun: {
    count: jest.fn(),
  },
  ledgerAuditEvent: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
}

const mockDb = db as unknown as { $transaction: jest.Mock }

const openPeriod = {
  id: "period-1",
  organizationId: "org-1",
  name: "June 2026",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T23:59:59.999Z"),
  status: "OPEN", controlVersion: 0, lastControlEventId: null,
}

describe("period close preflight", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockTx.$queryRaw.mockImplementation(async (sql) => {
      const text = sql.text ?? String(sql)
      if (text.includes('transaction_isolation')) return [{ level: 'read committed' }]
      if (text.includes('SELECT revision')) return [{ revision: 1n }]
      if (text.includes('clock_timestamp')) return [{ createdAt: new Date() }]
      return [openPeriod]
    })
    mockTx.accountingPeriod.findMany.mockResolvedValue([{ id: openPeriod.id }])
    mockTx.closeRun.findMany.mockResolvedValue([{ id: 'close-run-1', createdAt: new Date('2026-07-01'), status: 'CERTIFIED', voidedAt: null }])
    mockTx.closePackExport.findFirst.mockResolvedValue({ id: 'pack', contentHash: 'sha256:' + 'a'.repeat(64), exportedById: 'reviewer', exportedAt: new Date('2026-07-02'), metadata: {} })
    mockTx.periodControlEvent.create.mockImplementation(async ({ data }) => ({ id: 'event', ...data }))
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    mockTx.accountingPeriod.findFirst.mockResolvedValue(openPeriod)
    mockTx.ledgerPostingBatch.count.mockResolvedValue(0)
    mockTx.paymentException.count.mockResolvedValue(0)
    mockTx.suspenseItem.count.mockResolvedValue(0)
    mockTx.reconciliationRun.count.mockResolvedValue(0)
    mockTx.closeRun.findFirst.mockResolvedValue({
      id: "close-run-1", status: "CERTIFIED", runById: "maker", evidenceItems: [], completedAt: new Date("2026-06-30T12:00:00Z"),
      metadata: { sourceRevision: { version: 1, revision: "1" }, certifiedExportId: "pack", certifiedById: "reviewer", certifiedContentHash: "sha256:" + "a".repeat(64) }, criticalBlockerCount: 0, highBlockerCount: 0, findings: [], checklistItems: [],
    })
    mockTx.journalEntryLine.findMany.mockResolvedValue([
      { debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), baseDebit: new Prisma.Decimal(100), baseCredit: new Prisma.Decimal(0), currency: "XAF" },
      { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), baseDebit: new Prisma.Decimal(0), baseCredit: new Prisma.Decimal(100), currency: "XAF" },
    ])
    mockTx.accountingPeriod.update.mockResolvedValue({ ...openPeriod, status: "CLOSED" })
    mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
    mockTx.auditLog.create.mockResolvedValue({ id: "control-audit-1" })
  })

  it("rejects close when draft journal entries remain", async () => {
    mockTx.journalEntry.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0)

    await expect(closeAccountingPeriod("org-1", "period-1", "user-1")).rejects.toThrow(/draft journal entry/i)
    expect(mockTx.accountingPeriod.update).not.toHaveBeenCalled()
  })

  it("rejects close when posted lines do not balance", async () => {
    mockTx.journalEntry.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
    mockTx.journalEntryLine.findMany.mockResolvedValue([
      { debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), baseDebit: new Prisma.Decimal(100), baseCredit: new Prisma.Decimal(0), currency: "XAF" },
      { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(90), baseDebit: new Prisma.Decimal(0), baseCredit: new Prisma.Decimal(90), currency: "XAF" },
    ])

    await expect(closeAccountingPeriod("org-1", "period-1", "user-1")).rejects.toThrow(/trial balance is not balanced/i)
    expect(mockTx.accountingPeriod.update).not.toHaveBeenCalled()
  })

  it.each(["missing", "unbalanced"])("rejects %s functional amounts even when nominal amounts balance", async (condition) => {
    mockTx.journalEntry.count.mockResolvedValue(0)
    mockTx.journalEntryLine.findMany.mockResolvedValue([
      { debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), baseDebit: condition === "missing" ? null : new Prisma.Decimal("65595.70"), baseCredit: new Prisma.Decimal(0), currency: "EUR" },
      { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), baseDebit: new Prisma.Decimal(0), baseCredit: new Prisma.Decimal("65500.00"), currency: "EUR" },
    ])
    await expect(closeAccountingPeriod("org-1", "period-1", "user-1", {
      expectedVersion: 0, actorPermissions: ["accounting.period.close"], lastAuthAt: Date.now(),
    })).rejects.toThrow(condition === "missing" ? /missing functional-currency amounts/ : /Functional-currency trial balance is not balanced/)
    expect(mockTx.accountingPeriod.update).not.toHaveBeenCalled()
  })

  it("rejects close when payment reconciliation blockers remain", async () => {
    mockTx.journalEntry.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
    mockTx.reconciliationRun.count.mockResolvedValue(1)

    await expect(closeAccountingPeriod("org-1", "period-1", "user-1")).rejects.toThrow(/payment reconciliation run/i)
    expect(mockTx.accountingPeriod.update).not.toHaveBeenCalled()
  })

  it("closes an open period when preflight is clean", async () => {
    mockTx.journalEntry.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0)

    const result = await closeAccountingPeriod("org-1", "period-1", "user-1", {
      expectedVersion: 0, actorPermissions: ["accounting.period.close"],
      lastAuthAt: Date.now(),
    })

    expect(result).toMatchObject({ status: "CLOSED" })
    expect(mockTx.$queryRaw).toHaveBeenCalled()
    expect(mockTx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mockTx.ledgerPostingBatch.count.mock.invocationCallOrder[0])
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "AccountingPeriod",
          entityId: "period-1",
          action: "PERIOD_CLOSE_CONTROL",
          userId: "user-1",
        }),
      }),
    )
    expect(mockTx.accountingPeriod.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "period-1" },
        data: expect.objectContaining({
          status: "CLOSED",
          closedById: "user-1",
        }),
      }),
    )
  })

  it.each([
    ["missing", null],
    ["blocked", { status: "BLOCKED" }],
    ["unfinished", { completedAt: null }],
    ["stale", { metadata: { staleState: { status: "EVIDENCE_STALE" } } }],
    ["critical aggregate", { criticalBlockerCount: 1 }],
    ["high aggregate", { highBlockerCount: 1 }],
    ["open inventory finding", { findings: [{ id: "inventory-mismatch" }] }],
    ["unavailable source checklist", { checklistItems: [{ id: "payroll-unavailable" }] }],
  ])("rejects close with %s assurance even when ledger preflight is clean", async (_label, override) => {
    mockTx.journalEntry.count.mockResolvedValue(0)
    mockTx.closeRun.findFirst.mockResolvedValue(override === null ? null : {
      id: "close-run-1", status: "CERTIFIED", runById: "maker", evidenceItems: [], completedAt: new Date("2026-06-30T12:00:00Z"),
      metadata: { sourceRevision: { version: 1, revision: "1" }, certifiedExportId: "pack", certifiedById: "reviewer", certifiedContentHash: "sha256:" + "a".repeat(64) }, criticalBlockerCount: 0, highBlockerCount: 0, findings: [], checklistItems: [], ...override,
    })
    await expect(closeAccountingPeriod("org-1", "period-1", "user-1", {
      expectedVersion: 0, actorPermissions: ["accounting.period.close"], lastAuthAt: Date.now(),
    })).rejects.toThrow(/current close assurance assessment/)
    expect(mockTx.accountingPeriod.update).not.toHaveBeenCalled()
    expect(mockTx.closeRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "close-run-1", organizationId: "org-1", periodId: "period-1" },
    }))
  })

  it("links successful period closure to its current assurance run", async () => {
    mockTx.journalEntry.count.mockResolvedValue(0)
    await closeAccountingPeriod("org-1", "period-1", "user-1", {
      expectedVersion: 0, actorPermissions: ["accounting.period.close"], lastAuthAt: Date.now(),
    })
    expect(mockTx.ledgerAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ metadata: expect.objectContaining({ closeRunId: "close-run-1" }) }),
    }))
  })

  it("rechecks period state after acquiring the posting lock", async () => {
    mockTx.accountingPeriod.findFirst.mockResolvedValue(openPeriod)
    mockTx.$queryRaw.mockResolvedValueOnce([{ ...openPeriod, status: "CLOSED" }])
    await expect(getOpenPeriodForDate("org-1", new Date("2026-06-15T12:00:00Z"), mockTx as unknown as Prisma.TransactionClient)).rejects.toThrow(/not open/)
    expect(mockTx.$queryRaw).toHaveBeenCalled()
  })

  it.each([
    ["2026-09-30T23:33:26.124Z", "September", "2026-09-01T00:00:00.000Z", "2026-09-30T23:59:59.999Z"],
    ["2026-10-01T00:33:26.124Z", "October", "2026-10-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z"],
  ])("binds the full UTC source instant %s independently of the database session timezone", async (instant, name, start, end) => {
    const entryDate = new Date(instant)
    const period = { ...openPeriod, name, startDate: new Date(start), endDate: new Date(end) }
    mockTx.$queryRaw.mockResolvedValueOnce([period])

    await expect(getOpenPeriodForDate("org-1", entryDate, mockTx as unknown as Prisma.TransactionClient)).resolves.toEqual(period)

    const [parts, organizationId, startInstant, endInstant] = mockTx.$queryRaw.mock.calls[0]
    const sql = (parts as TemplateStringsArray).join("?").replace(/\s+/g, " ")
    expect(organizationId).toBe("org-1")
    expect(startInstant).toBe(entryDate)
    expect(endInstant).toBe(entryDate)
    expect(sql).toContain('"startDate" <= (?::timestamptz AT TIME ZONE \'UTC\')')
    expect(sql).toContain('"endDate" >= (?::timestamptz AT TIME ZONE \'UTC\')')
    expect(sql).toContain("LIMIT 1 FOR SHARE")
    expect(mockTx.accountingPeriod.findFirst).not.toHaveBeenCalled()
    expect(entryDate.toISOString()).toBe(instant)
  })

  it("does not proceed when the period lock cannot be acquired", async () => {
    mockTx.$queryRaw.mockRejectedValueOnce(new Error("Lock wait failed"))
    await expect(getOpenPeriodForDate("org-1", new Date("2026-06-15T12:00:00Z"), mockTx as unknown as Prisma.TransactionClient)).rejects.toThrow("Lock wait failed")
    expect(mockTx.accountingPeriod.update).not.toHaveBeenCalled()
  })

  it("audits and blocks period close without fresh control context", async () => {
    mockTx.journalEntry.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0)

    await expect(closeAccountingPeriod("org-1", "period-1", "user-1")).rejects.toThrow(/not allowed/i)

    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PERIOD_CLOSE_CONTROL_DENIED",
          changes: expect.objectContaining({
            reasonCode: "MISSING_PERMISSION",
            allowed: false,
          }),
        }),
      }),
    )
    expect(mockTx.accountingPeriod.update).not.toHaveBeenCalled()
  })
})

describe("fiscal calendar bounds", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockDb.$transaction.mockImplementation(async (handler) => handler(mockTx))
    mockTx.fiscalYear.create.mockImplementation(async ({ data }) => ({ id: "fy-1", ...data }))
    mockTx.fiscalYear.findUniqueOrThrow.mockResolvedValue({ id: "fy-1" })
  })

  it.each([true, false])("waits for catalog authority before any fiscal write (monthly=%s)", async createMonthlyPeriods => {
    let release!: () => void
    mockTx.$queryRaw.mockReturnValue(new Promise(resolve => { release = () => resolve([]) }))
    const pending = createFiscalYearWithPeriods("org-1", {
      name: "Fiscal year", startDate: new Date("2026-06-01"), endDate: new Date("2026-06-30"), createMonthlyPeriods,
    }, "actor")
    await Promise.resolve()
    expect(mockTx.fiscalYear.create).not.toHaveBeenCalled()
    expect(mockTx.accountingPeriod.createMany).not.toHaveBeenCalled()
    expect(mockTx.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockTx.$queryRaw.mock.calls[0][0]).toMatchObject({
      text: expect.stringContaining("pg_advisory_xact_lock("),
      values: [JSON.stringify(["accounting-period-catalog", "org-1"])],
    })
    release()
    await pending
    expect(mockTx.fiscalYear.create).toHaveBeenCalledTimes(1)
    expect(mockTx.accountingPeriod.createMany).toHaveBeenCalledTimes(createMonthlyPeriods ? 1 : 0)
    expect(mockTx.ledgerAuditEvent.create).toHaveBeenCalledTimes(1)
  })

  it("propagates catalog-lock failure without fiscal, period or audit writes", async () => {
    const failure = new Error("Catalog wait failed")
    mockTx.$queryRaw.mockRejectedValue(failure)
    await expect(createFiscalYearWithPeriods("org-1", {
      name: "Fiscal year", startDate: new Date("2026-06-01"), endDate: new Date("2026-06-30"),
    }, "actor")).rejects.toBe(failure)
    expect(mockTx.fiscalYear.create).not.toHaveBeenCalled()
    expect(mockTx.accountingPeriod.createMany).not.toHaveBeenCalled()
    expect(mockTx.ledgerAuditEvent.create).not.toHaveBeenCalled()
  })

  it("propagates period creation failure without recording successful fiscal creation", async () => {
    const failure = new Error("Period insert failed")
    mockTx.accountingPeriod.createMany.mockRejectedValue(failure)
    await expect(createFiscalYearWithPeriods("org-1", {
      name: "Fiscal year", startDate: new Date("2026-06-01"), endDate: new Date("2026-06-30"),
    }, "actor")).rejects.toBe(failure)
    expect(mockTx.fiscalYear.create).toHaveBeenCalledTimes(1)
    expect(mockTx.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockTx.fiscalYear.findUniqueOrThrow).not.toHaveBeenCalled()
  })

  it.each([
    ["2026-06-15T00:00:00.000Z", "2026-08-10T00:00:00.000Z", 3],
    ["2028-02-29T00:00:00.000Z", "2028-03-02T00:00:00.000Z", 2],
    ["2026-12-15T00:00:00.000Z", "2027-01-15T00:00:00.000Z", 2],
    ["2026-06-15T00:00:00.000Z", "2026-06-20T00:00:00.000Z", 1],
  ])("clips monthly periods to %s through %s", async (start, end, count) => {
    const startDate = new Date(start), endDate = new Date(end)
    await createFiscalYearWithPeriods("org-1", { name: "Partial fiscal year", startDate, endDate }, "actor")
    const periods = mockTx.accountingPeriod.createMany.mock.calls[0][0].data
    expect(periods).toHaveLength(count)
    expect(periods[0].startDate).toEqual(startDate)
    const expectedEnd = new Date(endDate)
    expectedEnd.setUTCHours(23, 59, 59, 999)
    expect(periods[periods.length - 1].endDate).toEqual(expectedEnd)
    for (let i = 0; i < periods.length; i++) {
      expect(periods[i].startDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
      expect(periods[i].endDate.getTime()).toBeLessThanOrEqual(expectedEnd.getTime())
      expect(periods[i].startDate.getTime()).toBeLessThanOrEqual(periods[i].endDate.getTime())
      if (i > 0) expect(periods[i].startDate.getTime()).toBe(periods[i - 1].endDate.getTime() + 1)
    }
  })
})
