import type { Prisma } from "@prisma/client"

import { recordCloseCertificationInvalidationsForSourceInTx } from "../close-assurance-pack.service"
import {
  recordPostedJournalCloseInvalidationInTx,
  recordOrderedReversedJournalCloseInvalidationsInTx,
  recordReversedJournalCloseInvalidationsInTx,
} from "../journal-close-invalidation.service"

jest.mock("../close-assurance-pack.service", () => ({
  recordCloseCertificationInvalidationsForSourceInTx: jest.fn(),
}))

const mockRecordInvalidations = recordCloseCertificationInvalidationsForSourceInTx as jest.Mock
const tx = {} as Prisma.TransactionClient

describe("journal close invalidation service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRecordInvalidations.mockResolvedValue({ invalidatedCount: 1, results: [{ closeRunId: "close-run-1" }] })
  })

  it("records posted journal evidence against its posting period", async () => {
    const entryDate = new Date("2026-06-10T10:00:00.000Z")

    await recordPostedJournalCloseInvalidationInTx(tx, "org-1", {
      journalEntryId: "journal-1",
      periodId: "period-1",
      entryDate,
      correlationId: "batch-1",
    }, {
      actorId: "accountant-1",
      now: entryDate,
    })

    expect(mockRecordInvalidations).toHaveBeenCalledWith(tx, "org-1", {
      sourceCode: "LEDGER_JOURNAL_POSTED",
      sourceId: "journal-1",
      periodId: "period-1",
      periodStart: entryDate,
      periodEnd: entryDate,
      staleReason: "Ledger journal posting changed certified close evidence.",
      newEvidenceHash: "journal-1",
      correlationId: "batch-1",
    }, {
      actorId: "accountant-1",
      now: entryDate,
    })
  })

  it("invalidates a complete overlapping period union in one globally ordered discovery pass", async () => {
    const reversalDate = new Date("2026-07-01T10:00:00.000Z")

    const result = await recordOrderedReversedJournalCloseInvalidationsInTx(tx, "org-1", {
      originalJournalEntryId: "journal-original",
      reversalJournalEntryId: "journal-reversal",
      originalPeriodId: "period-june",
      reversalPeriodId: "period-july",
      affectedPeriodIds: ["period-june", "overlap", "period-july", "period-june", "later"],
      reversalDate,
      correlationId: "batch-reversal",
    })

    expect(mockRecordInvalidations).toHaveBeenCalledTimes(1)
    expect(mockRecordInvalidations.mock.calls[0][2]).toMatchObject({
      periodIds: ["later", "overlap", "period-july", "period-june"],
      sourceCode: "LEDGER_JOURNAL_REVERSED",
      sourceId: "journal-original",
      newEvidenceHash: "journal-reversal",
      correlationId: "batch-reversal",
    })
    expect(result.invalidatedCount).toBe(1)
  })

  it("deduplicates same-period manual reversal targets", async () => {
    await recordOrderedReversedJournalCloseInvalidationsInTx(tx, "org-1", {
      originalJournalEntryId: "journal-original",
      reversalJournalEntryId: "journal-reversal",
      originalPeriodId: "period-1",
      reversalPeriodId: "period-1",
      affectedPeriodIds: ["period-1", "period-1"],
    })

    expect(mockRecordInvalidations).toHaveBeenCalledTimes(1)
  })

  it("refuses incomplete scope instead of silently skipping an explicit period", async () => {
    await expect(recordOrderedReversedJournalCloseInvalidationsInTx(tx, "org-1", {
      originalJournalEntryId: "original", reversalJournalEntryId: "reversal",
      originalPeriodId: "period-1", reversalPeriodId: "period-2", affectedPeriodIds: ["period-2"],
    })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mockRecordInvalidations).not.toHaveBeenCalled()
  })

  it("preserves the existing source-writer contract until each owner adopts pre-write ordering", async () => {
    const reversalDate = new Date("2026-07-01T10:00:00.000Z")
    const result = await recordReversedJournalCloseInvalidationsInTx(tx, "org-1", {
      originalJournalEntryId: "original", reversalJournalEntryId: "reversal",
      originalPeriodId: "original-period", reversalPeriodId: "reversal-period", reversalDate,
    })
    expect(mockRecordInvalidations).toHaveBeenCalledTimes(2)
    expect(mockRecordInvalidations.mock.calls.map(call => call[2])).toEqual([
      expect.objectContaining({ periodId: "original-period", periodStart: null, periodEnd: null }),
      expect.objectContaining({ periodId: "reversal-period", periodStart: reversalDate, periodEnd: reversalDate }),
    ])
    expect(result.invalidatedCount).toBe(2)
  })
})
