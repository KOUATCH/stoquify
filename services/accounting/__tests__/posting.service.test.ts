import { Prisma } from "@prisma/client"

import { postJournalEntry } from "../posting.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

import { db } from "@/prisma/db"

const mockTx = {
  chartOfAccount: {
    findMany: jest.fn(),
  },
  journalEntry: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  ledgerPostingBatch: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  accountingSourceLink: {
    findFirst: jest.fn(),
    create: jest.fn(),
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

const postableAccounts = [
  {
    id: "cash",
    code: "571",
    organizationId: "org-1",
    isActive: true,
    currency: "XAF",
    _count: { children: 0 },
  },
  {
    id: "sales",
    code: "701",
    organizationId: "org-1",
    isActive: true,
    currency: "XAF",
    _count: { children: 0 },
  },
]

describe("posting service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    mockTx.chartOfAccount.findMany.mockResolvedValue(postableAccounts)
    mockTx.accountingSourceLink.findFirst.mockResolvedValue(null)
    mockTx.accountingSourceLink.create.mockResolvedValue({ id: "link-1" })
    mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
    mockTx.auditLog.create.mockResolvedValue({ id: "control-audit-1" })
  })

  it("rejects posting anything other than a draft journal entry", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({
      id: "je-1",
      organizationId: "org-1",
      status: "POSTED",
      period: openPeriod,
      lines: [],
    })

    await expect(postJournalEntry("org-1", "je-1", "user-1")).rejects.toThrow(/only draft/i)
  })

  it("posts a balanced draft journal entry through an idempotent batch", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({
      id: "je-1",
      organizationId: "org-1",
      status: "DRAFT",
      periodId: "period-1",
      period: openPeriod,
      entryDate: new Date("2026-06-09T12:00:00.000Z"),
      entryNumber: "JE-20260609-0001",
      lines: [
        {
          accountId: "cash",
          debit: new Prisma.Decimal(100),
          credit: new Prisma.Decimal(0),
          currency: "XAF",
        },
        {
          accountId: "sales",
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(100),
          currency: "XAF",
        },
      ],
    })
    mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(null)
    mockTx.ledgerPostingBatch.create.mockResolvedValue({ id: "batch-1" })
    mockTx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-1", status: "POSTED" })
    mockTx.journalEntry.update.mockResolvedValue({
      id: "je-1",
      entryNumber: "JE-20260609-0001",
      status: "POSTED",
    })
    const result = await postJournalEntry("org-1", "je-1", "user-1", {
      actorPermissions: ["accounting.journal.post"],
      lastAuthAt: Date.now(),
    })

    expect(result).toMatchObject({ id: "je-1", status: "POSTED" })
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "JournalEntry",
          entityId: "je-1",
          action: "JOURNAL_POST_CONTROL",
          userId: "user-1",
        }),
      }),
    )
    expect(mockTx.ledgerPostingBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          sourceId: "je-1",
          postingPurpose: "MANUAL_JOURNAL",
        }),
      }),
    )
    expect(mockTx.journalEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "POSTED",
          postingBatchId: "batch-1",
          postedById: "user-1",
        }),
      }),
    )
  })

  it("audits and blocks self-posting of a manual journal", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({
      id: "je-1",
      organizationId: "org-1",
      status: "DRAFT",
      periodId: "period-1",
      period: openPeriod,
      entryDate: new Date("2026-06-09T12:00:00.000Z"),
      entryNumber: "JE-20260609-0001",
      createdById: "user-1",
      currency: "XAF",
      lines: [
        {
          accountId: "cash",
          debit: new Prisma.Decimal(100),
          credit: new Prisma.Decimal(0),
          currency: "XAF",
        },
        {
          accountId: "sales",
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(100),
          currency: "XAF",
        },
      ],
    })

    await expect(
      postJournalEntry("org-1", "je-1", "user-1", {
        actorPermissions: ["accounting.journal.post"],
        lastAuthAt: Date.now(),
      }),
    ).rejects.toThrow(/independent approval/i)

    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "JOURNAL_POST_CONTROL_DENIED",
          changes: expect.objectContaining({
            reasonCode: "SELF_APPROVAL_BLOCKED",
            allowed: false,
          }),
        }),
      }),
    )
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
  })
})
