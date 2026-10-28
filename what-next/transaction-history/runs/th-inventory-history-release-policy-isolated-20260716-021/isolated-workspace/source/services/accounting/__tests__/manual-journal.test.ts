import { createManualJournalEntry } from "../journals.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

import { db } from "@/prisma/db"

const mockTx = {
  journal: {
    findFirst: jest.fn(),
  },
  accountingPeriod: {
    findFirst: jest.fn(),
  },
  chartOfAccount: {
    findMany: jest.fn(),
  },
  journalEntry: {
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  ledgerAuditEvent: {
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
    allowManualPost: true,
    currency: "XAF",
    _count: { children: 0 },
  },
  {
    id: "sales",
    code: "701",
    organizationId: "org-1",
    isActive: true,
    allowManualPost: true,
    currency: "XAF",
    _count: { children: 0 },
  },
]

describe("manual journal service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    mockTx.journal.findFirst.mockResolvedValue({
      id: "journal-1",
      code: "GEN",
      organizationId: "org-1",
      isActive: true,
      allowManualEntries: true,
    })
    mockTx.accountingPeriod.findFirst.mockResolvedValue(openPeriod)
    mockTx.chartOfAccount.findMany.mockResolvedValue(postableAccounts)
    mockTx.journalEntry.count.mockResolvedValue(0)
    mockTx.journalEntry.create.mockResolvedValue({ id: "je-1" })
    mockTx.journalEntry.update.mockResolvedValue({
      id: "je-1",
      entryNumber: "JE-20260609-0001",
      status: "DRAFT",
    })
    mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
  })

  it("rejects unbalanced manual journal drafts", async () => {
    await expect(
      createManualJournalEntry(
        "org-1",
        {
          journalId: "journal-1",
          entryDate: new Date("2026-06-09T12:00:00.000Z"),
          lines: [
            { accountId: "cash", debit: 100, currency: "XAF" },
            { accountId: "sales", credit: 90, currency: "XAF" },
          ],
        },
        "user-1",
      ),
    ).rejects.toThrow(/not balanced/i)
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
  })

  it("creates a balanced manual journal as draft", async () => {
    const result = await createManualJournalEntry(
      "org-1",
      {
        journalId: "journal-1",
        entryDate: new Date("2026-06-09T12:00:00.000Z"),
        lines: [
          { accountId: "cash", debit: 100, currency: "XAF" },
          { accountId: "sales", credit: 100, currency: "XAF" },
        ],
      },
      "user-1",
    )

    expect(result).toMatchObject({ id: "je-1", status: "DRAFT" })
    expect(mockTx.journalEntry.create).toHaveBeenCalled()
  })
})
