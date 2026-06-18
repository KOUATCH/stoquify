jest.mock("@/prisma/db", () => {
  const dbMock = {
    $transaction: jest.fn(),
    auditLog: { create: jest.fn() },
    chartOfAccount: { findMany: jest.fn() },
    journalEntryLine: { findMany: jest.fn() },
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
}

function seedTrialBalanceRows() {
  jest.clearAllMocks()
  mockDb.$transaction.mockImplementation((callback) => callback(mockDb))
  mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" })
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
      includeZeroBalance: true,
    })

    expect(result).toMatchObject({
      reportType: "TRIAL_BALANCE",
      fileType: "csv",
      rowCount: 1,
    })
    expect(result.filtersHash).toMatch(/^sha256:/)
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
