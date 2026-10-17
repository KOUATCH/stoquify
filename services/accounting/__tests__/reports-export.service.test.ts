jest.mock("@/prisma/db", () => {
  const dbMock = {
    $transaction: jest.fn(),
    auditLog: { create: jest.fn() },
    chartOfAccount: { findMany: jest.fn() },
    journalEntryLine: { findMany: jest.fn(), aggregate: jest.fn() },
    organizationAccountingSettings: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    accountingPeriod: { findFirst: jest.fn() },
  }
  dbMock.$transaction = jest.fn((callback) => callback(dbMock))
  return { db: dbMock }
})

import { Prisma } from "@prisma/client"
import { createHash } from "node:crypto"

import { db } from "@/prisma/db"
import { exportAccountingReport } from "../reports.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  auditLog: { create: jest.Mock }
  chartOfAccount: { findMany: jest.Mock }
  journalEntryLine: { findMany: jest.Mock; aggregate: jest.Mock }
  organizationAccountingSettings: { findUnique: jest.Mock }
  organization: { findUnique: jest.Mock }
  accountingPeriod: { findFirst: jest.Mock }
}

function seedTrialBalanceRows() {
  jest.clearAllMocks()
  mockDb.$transaction.mockImplementation((callback) => callback(mockDb))
  mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" })
  mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ baseCurrency: "XAF" })
  mockDb.organization.findUnique.mockResolvedValue({ currency: "USD" })
  mockDb.accountingPeriod.findFirst.mockResolvedValue({
    id: "period-1",
    name: "June 2026",
    startDate: new Date("2026-06-01T00:00:00.000Z"),
    endDate: new Date("2026-06-30T23:59:59.999Z"),
    status: "CLOSED",
  })
  mockDb.chartOfAccount.findMany.mockResolvedValue([
    {
      id: "account-1",
      code: "701",
      nameEn: "Sales revenue",
      nameFr: "Ventes de marchandises",
      type: "REVENUE",
      normalBalance: "CREDIT",
    },
  ])
  mockDb.journalEntryLine.findMany.mockResolvedValue([
    {
      accountId: "account-1",
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(25_000),
      baseDebit: new Prisma.Decimal(0),
      baseCredit: new Prisma.Decimal(25_000),
    },
  ])
}

describe("accounting report export service", () => {
  beforeEach(() => {
    seedTrialBalanceRows()
  })

  it("owns statutory export control auditing in the service transaction", async () => {
    const result = await exportAccountingReport({
      organizationId: "org-1",
      actorId: "controller-1",
      actorPermissions: ["accounting.exports.create"],
      reportType: "TRIAL_BALANCE",
      fileType: "csv",
      periodId: "period-1",
      includeZeroBalance: true,
    })

    expect(result).toMatchObject({
      schemaVersion: "accounting-report-export.v1",
      reportType: "TRIAL_BALANCE",
      fileType: "csv",
      rowCount: 1,
      provenance: {
        source: "POSTED_LEDGER_READ_MODEL",
        currency: "XAF",
        periodStatus: "CLOSED",
        balanceStatus: "OUT_OF_BALANCE",
        redactionStatus: "NO_CONTACT_OR_AUTHENTICATION_FIELDS_INCLUDED",
        certification: {
          status: "INTERNAL_ACCOUNTING_REPORT_ONLY",
        },
      },
    })
    expect(result.filtersHash).toMatch(/^sha256:/)
    expect(result.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(result.watermarkId).toBe(`acct-org-1-${result.exportId}`)
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTING_EXPORT_CONTROL",
          entityType: "AccountingExport",
          entityId: result.exportId,
          organizationId: "org-1",
          userId: "controller-1",
          changes: expect.objectContaining({
            allowed: true,
            exportControl: true,
            exportContext: expect.objectContaining({
              filtersHash: result.filtersHash,
              rowCount: 1,
              fileType: "csv",
              sensitivity: "statutory",
              watermarkId: result.watermarkId,
            }),
            detectorInputs: expect.objectContaining({
              currency: "XAF",
              metadata: expect.objectContaining({
                contentHash: result.contentHash,
                periodStatus: "CLOSED",
                balanceStatus: "OUT_OF_BALANCE",
                certificationStatus: "INTERNAL_ACCOUNTING_REPORT_ONLY",
                redactionStatus: "NO_CONTACT_OR_AUTHENTICATION_FIELDS_INCLUDED",
              }),
            }),
          }),
        }),
      }),
    )
  })

  it("audits and rejects accounting exports without the export permission", async () => {
    await expect(
      exportAccountingReport({
        organizationId: "org-1",
        actorId: "viewer-1",
        actorPermissions: ["accounting.reports.read"],
        reportType: "TRIAL_BALANCE",
        fileType: "json",
      }),
    ).rejects.toThrow("You are not allowed to perform this action.")

    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTING_EXPORT_CONTROL_DENIED",
          entityType: "AccountingExport",
          organizationId: "org-1",
          userId: "viewer-1",
          changes: expect.objectContaining({
            allowed: false,
            reasonCode: "MISSING_PERMISSION",
          }),
        }),
      }),
    )
  })
})

describe("general ledger export summary and period contract", () => {
  const start = new Date("2026-06-01T00:00:00.000Z")
  const end = new Date("2026-06-30T23:59:59.999Z")
  const input = {
    organizationId: "org-1", actorId: "controller-1", actorPermissions: ["accounting.exports.create"],
    reportType: "GENERAL_LEDGER" as const, fileType: "json" as const, periodId: "period-1", accountId: "cash",
  }
  beforeEach(() => {
    seedTrialBalanceRows()
    mockDb.journalEntryLine.aggregate.mockResolvedValue({ _sum: { baseDebit: new Prisma.Decimal(100), baseCredit: new Prisma.Decimal(0) }, _count: { _all: 1, baseDebit: 1, baseCredit: 1 } })
    mockDb.journalEntryLine.findMany.mockResolvedValue([])
  })

  it("preserves opening and closing 100 in an empty-range export without synthetic transactions", async () => {
    const report = await exportAccountingReport(input)
    expect(report.data).toEqual([])
    expect(report.rowCount).toBe(0)
    expect(report).toMatchObject({ summary: {
      schemaVersion: "general-ledger-summary.v1", amountBasis: "FUNCTIONAL_CURRENCY", signConvention: "DEBIT_POSITIVE", currency: "XAF",
      openingDebit: "100.00", openingCredit: "0.00", openingBalance: "100.00", movementDebit: "0.00", movementCredit: "0.00", movementBalance: "0.00", closingBalance: "100.00", rowCount: 0,
    } })
  })

  it("uses the tenant-owned period bounds in query, summary, normalized filters and their hash", async () => {
    const report = await exportAccountingReport(input)
    expect(mockDb.accountingPeriod.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "period-1", organizationId: "org-1" } }))
    expect(mockDb.journalEntryLine.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ journalEntry: expect.objectContaining({ entryDate: { gte: start, lte: end } }) }) }))
    expect(mockDb.journalEntryLine.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ journalEntry: expect.objectContaining({ entryDate: { lt: start } }) }) }))
    expect(report.filters).toMatchObject({ startDate: start.toISOString(), endDate: end.toISOString() })
    expect(report).toMatchObject({ summary: { startDate: start.toISOString(), endDate: end.toISOString() } })
    expect(report.filtersHash).toBe(`sha256:${createHash("sha256").update(JSON.stringify(report.filters)).digest("hex")}`)
  })

  it.each([
    { startDate: new Date("2026-05-31") },
    { endDate: new Date("2026-07-01") },
    { startDate: new Date("2026-06-20"), endDate: new Date("2026-06-10") },
  ])("rejects a date window inconsistent with its period label: %j", async (dates) => {
    await expect(exportAccountingReport({ ...input, ...dates })).rejects.toThrow(/within the selected accounting period/i)
    expect(mockDb.journalEntryLine.findMany).not.toHaveBeenCalled()
    expect(mockDb.journalEntryLine.aggregate).not.toHaveBeenCalled()
  })

  it("keeps transaction rows compatible and integrity-protects the additive summary", async () => {
    mockDb.journalEntryLine.findMany.mockResolvedValue([{
      id: "line-1", journalEntryId: "entry-1", description: "Movement", baseDebit: new Prisma.Decimal(25), baseCredit: new Prisma.Decimal(0),
      account: { code: "571", nameEn: "Cash" },
      journalEntry: { entryNumber: "JE-1", entryDate: new Date("2026-06-15"), journal: { code: "GEN" }, period: { name: "June 2026" } },
    }])
    const report = await exportAccountingReport(input)
    expect(report.data).toEqual([expect.objectContaining({ id: "line-1", entryId: "entry-1", openingBalance: "100.00", debit: "25.00", runningBalance: "125.00" })])
    expect(report).toMatchObject({ rowCount: 1, summary: { movementBalance: "25.00", closingBalance: "125.00", rowCount: 1 } })
    const { rowCount, filtersHash, contentHash, ...payload } = report
    expect(contentHash).toBe(`sha256:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`)
    expect(contentHash).not.toBe(`sha256:${createHash("sha256").update(JSON.stringify({ ...payload, summary: { ...payload.summary, closingBalance: "0.00" } })).digest("hex")}`)
  })

  it("rejects an unavailable tenant period before querying financial data", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValue(null)
    await expect(exportAccountingReport(input)).rejects.toThrow(/period is unavailable/i)
    expect(mockDb.journalEntryLine.aggregate).not.toHaveBeenCalled()
    expect(mockDb.journalEntryLine.findMany).not.toHaveBeenCalled()
  })
})
