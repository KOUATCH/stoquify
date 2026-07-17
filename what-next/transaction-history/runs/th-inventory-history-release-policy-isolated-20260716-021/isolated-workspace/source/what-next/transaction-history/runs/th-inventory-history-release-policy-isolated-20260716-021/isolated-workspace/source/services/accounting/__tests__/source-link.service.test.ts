import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    ledgerPostingBatch: { findFirst: jest.fn() },
    journalEntry: { findFirst: jest.fn() },
    accountingSourceLink: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    ledgerAuditEvent: { create: jest.fn() },
  },
}))

import { db } from "@/prisma/db"
import {
  assertSourceTraceComplete,
  createAccountingSourceLink,
  getSourceTrace,
} from "../source-link.service"

const mockDb = db as unknown as {
  ledgerPostingBatch: { findFirst: jest.Mock }
  journalEntry: { findFirst: jest.Mock }
  accountingSourceLink: {
    findFirst: jest.Mock
    create: jest.Mock
    findMany: jest.Mock
  }
  ledgerAuditEvent: { create: jest.Mock }
}

const postedBatch = {
  id: "batch-1",
  sourceType: AccountingSourceType.POS_SALE,
  sourceId: "sale-1",
  postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
  status: LedgerPostingBatchStatus.POSTED,
}

const postedEntry = {
  id: "je-1",
  entryNumber: "JE-1",
  postingBatchId: "batch-1",
  status: JournalEntryStatus.POSTED,
}

describe("source link service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.ledgerPostingBatch.findFirst.mockResolvedValue(postedBatch)
    mockDb.journalEntry.findFirst.mockResolvedValue(postedEntry)
    mockDb.accountingSourceLink.findFirst.mockResolvedValue(null)
    mockDb.accountingSourceLink.create.mockResolvedValue({
      id: "link-1",
      organizationId: "org-1",
      postingBatchId: "batch-1",
      journalEntryId: "je-1",
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: "sale-1",
      postingBatch: postedBatch,
      journalEntry: postedEntry,
    })
    mockDb.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
  })

  it("rejects source links that do not match their posting batch source", async () => {
    mockDb.ledgerPostingBatch.findFirst.mockResolvedValue({
      ...postedBatch,
      sourceType: AccountingSourceType.POS_PAYMENT,
    })

    await expect(
      createAccountingSourceLink({
        organizationId: "org-1",
        postingBatchId: "batch-1",
        journalEntryId: "je-1",
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: "sale-1",
      }),
    ).rejects.toThrow(/does not match/i)
  })

  it("creates an audited source link when batch and journal ownership are valid", async () => {
    const result = await createAccountingSourceLink(
      {
        organizationId: "org-1",
        postingBatchId: "batch-1",
        journalEntryId: "je-1",
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: "sale-1",
        sourceNumber: "SALE-1",
      },
      db,
      { actorId: "user-1" },
    )

    expect(result).toMatchObject({ id: "link-1", sourceId: "sale-1" })
    expect(mockDb.accountingSourceLink.create).toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTING_SOURCE_LINK_CREATE",
          actorId: "user-1",
          postingBatchId: "batch-1",
          journalEntryId: "je-1",
        }),
      }),
    )
  })

  it("returns an existing source link idempotently", async () => {
    mockDb.accountingSourceLink.findFirst.mockResolvedValue({
      id: "link-existing",
      postingBatch: postedBatch,
      journalEntry: postedEntry,
    })

    const result = await createAccountingSourceLink({
      organizationId: "org-1",
      postingBatchId: "batch-1",
      journalEntryId: "je-1",
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: "sale-1",
    })

    expect(result).toMatchObject({ id: "link-existing" })
    expect(mockDb.accountingSourceLink.create).not.toHaveBeenCalled()
    expect(mockDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
  })

  it("retrieves and asserts complete source traceability", async () => {
    mockDb.accountingSourceLink.findMany.mockResolvedValue([
      {
        id: "link-1",
        journalEntryId: "je-1",
        postingBatch: postedBatch,
        journalEntry: postedEntry,
      },
    ])

    await expect(
      getSourceTrace("org-1", {
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: "sale-1",
      }),
    ).resolves.toHaveLength(1)

    await expect(
      assertSourceTraceComplete("org-1", {
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: "sale-1",
        postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      }),
    ).resolves.toHaveLength(1)
  })
})
