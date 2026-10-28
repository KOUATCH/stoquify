import { Prisma } from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    accountingPeriod: { findFirst: jest.fn() },
    journalEntryLine: { findMany: jest.fn() },
    journalEntry: { findMany: jest.fn() },
    ledgerPostingBatch: { findMany: jest.fn() },
    accountingSourceLink: { findMany: jest.fn() },
  },
}))

import { db } from "@/prisma/db"
import {
  assertLedgerReconciliationClean,
  reconcileLedger,
} from "../reconciliations.service"

const mockDb = db as unknown as {
  accountingPeriod: { findFirst: jest.Mock }
  journalEntryLine: { findMany: jest.Mock }
  journalEntry: { findMany: jest.Mock }
  ledgerPostingBatch: { findMany: jest.Mock }
  accountingSourceLink: { findMany: jest.Mock }
}

describe("ledger reconciliations", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.accountingPeriod.findFirst.mockResolvedValue({ id: "period-1" })
    mockDb.journalEntryLine.findMany.mockResolvedValue([
      { debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF" },
      { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), currency: "XAF" },
    ])
    mockDb.journalEntry.findMany.mockResolvedValue([])
    mockDb.ledgerPostingBatch.findMany.mockResolvedValue([
      {
        id: "batch-1",
        sourceType: "POS_SALE",
        sourceId: "sale-1",
        postingPurpose: "SALE_COMPLETION",
        _count: { journalEntries: 1, sourceLinks: 1 },
      },
    ])
    mockDb.accountingSourceLink.findMany.mockResolvedValue([
      {
        id: "link-1",
        postingBatchId: "batch-1",
        journalEntryId: "je-1",
        sourceType: "POS_SALE",
        sourceId: "sale-1",
      },
    ])
  })

  it("returns a clean reconciliation when trial balance and traceability pass", async () => {
    const result = await reconcileLedger("org-1", { periodId: "period-1" })

    expect(result).toMatchObject({
      organizationId: "org-1",
      periodId: "period-1",
      isClean: true,
      failures: [],
    })
    expect(result.totalsByCurrency).toEqual([
      { currency: "XAF", debit: "100.00", credit: "100.00", difference: "0.00" },
    ])
  })

  it("reports trial balance failures", async () => {
    mockDb.journalEntryLine.findMany.mockResolvedValue([
      { debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF" },
      { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(90), currency: "XAF" },
    ])

    const result = await reconcileLedger("org-1", { periodId: "period-1" })

    expect(result.isClean).toBe(false)
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "TRIAL_BALANCE_OUT_OF_BALANCE",
          severity: "critical",
        }),
      ]),
    )
  })

  it("reports traceability failures for posted entries, batches, and source links", async () => {
    mockDb.journalEntry.findMany.mockResolvedValue([
      {
        id: "je-1",
        entryNumber: "JE-1",
        postingBatchId: null,
        sourceType: null,
        sourceId: null,
      },
    ])
    mockDb.ledgerPostingBatch.findMany.mockResolvedValue([
      {
        id: "batch-1",
        sourceType: "POS_SALE",
        sourceId: "sale-1",
        postingPurpose: "SALE_COMPLETION",
        _count: { journalEntries: 0, sourceLinks: 0 },
      },
    ])
    mockDb.accountingSourceLink.findMany.mockResolvedValue([
      {
        id: "link-1",
        postingBatchId: "batch-1",
        journalEntryId: null,
        sourceType: "POS_SALE",
        sourceId: "sale-1",
      },
    ])

    const result = await reconcileLedger("org-1", { periodId: "period-1" })

    expect(result.failures.map((failure) => failure.type)).toEqual(
      expect.arrayContaining([
        "POSTED_ENTRY_MISSING_TRACE",
        "POSTING_BATCH_MISSING_JOURNAL_ENTRY",
        "POSTING_BATCH_MISSING_SOURCE_LINK",
        "SOURCE_LINK_MISSING_JOURNAL_ENTRY",
      ]),
    )
    await expect(assertLedgerReconciliationClean("org-1", { periodId: "period-1" })).rejects.toThrow(
      /ledger reconciliation failed/i,
    )
  })
})
