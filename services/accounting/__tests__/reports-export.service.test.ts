jest.mock("@/prisma/db", () => {
  const dbMock = {
    $transaction: jest.fn(),
    auditLog: { create: jest.fn() },
    chartOfAccount: { findMany: jest.fn() },
    journalEntryLine: { findMany: jest.fn() },
    organizationAccountingSettings: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    accountingPeriod: { findFirst: jest.fn() },
  }
  dbMock.$transaction = jest.fn((callback) => callback(dbMock))
  return { db: dbMock }
})

import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { exportAccountingReport } from "../reports.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  auditLog: { create: jest.Mock }
  chartOfAccount: { findMany: jest.Mock }
  journalEntryLine: { findMany: jest.Mock }
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
