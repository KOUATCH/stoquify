jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"

import { closeAccountingPeriod } from "../periods.service"

const mockTx = {
  accountingPeriod: {
    findFirst: jest.fn(),
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
  status: "OPEN",
}

describe("period close preflight", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    mockTx.accountingPeriod.findFirst.mockResolvedValue(openPeriod)
    mockTx.ledgerPostingBatch.count.mockResolvedValue(0)
    mockTx.paymentException.count.mockResolvedValue(0)
    mockTx.suspenseItem.count.mockResolvedValue(0)
    mockTx.reconciliationRun.count.mockResolvedValue(0)
    mockTx.journalEntryLine.findMany.mockResolvedValue([
      { debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF" },
      { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), currency: "XAF" },
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
      { debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF" },
      { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(90), currency: "XAF" },
    ])

    await expect(closeAccountingPeriod("org-1", "period-1", "user-1")).rejects.toThrow(/trial balance is not balanced/i)
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
      actorPermissions: ["accounting.period.close"],
      lastAuthAt: Date.now(),
    })

    expect(result).toMatchObject({ status: "CLOSED" })
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
