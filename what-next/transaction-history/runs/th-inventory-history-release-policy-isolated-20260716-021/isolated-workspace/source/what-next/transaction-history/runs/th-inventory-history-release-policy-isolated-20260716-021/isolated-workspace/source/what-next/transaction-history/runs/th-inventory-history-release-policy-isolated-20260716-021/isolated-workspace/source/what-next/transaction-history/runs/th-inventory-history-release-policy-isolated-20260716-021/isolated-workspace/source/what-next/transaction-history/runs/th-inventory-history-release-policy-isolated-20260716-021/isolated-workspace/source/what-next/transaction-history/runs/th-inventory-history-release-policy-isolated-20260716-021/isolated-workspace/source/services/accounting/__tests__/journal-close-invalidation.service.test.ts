import type { Prisma } from "@prisma/client"

import { recordCloseCertificationInvalidationsForSourceInTx } from "../close-assurance-pack.service"
import {
  recordPostedJournalCloseInvalidationInTx,
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

  it("invalidates both periods for a cross-period manual reversal", async () => {
    const reversalDate = new Date("2026-07-01T10:00:00.000Z")

    const result = await recordReversedJournalCloseInvalidationsInTx(tx, "org-1", {
      originalJournalEntryId: "journal-original",
      reversalJournalEntryId: "journal-reversal",
      originalPeriodId: "period-june",
      reversalPeriodId: "period-july",
      reversalDate,
      correlationId: "batch-reversal",
    })

    expect(mockRecordInvalidations).toHaveBeenCalledTimes(2)
    expect(mockRecordInvalidations.mock.calls.map((call) => call[2].periodId)).toEqual([
      "period-june",
      "period-july",
    ])
    expect(mockRecordInvalidations.mock.calls[1][2]).toMatchObject({
      sourceCode: "LEDGER_JOURNAL_REVERSED",
      sourceId: "journal-original",
      newEvidenceHash: "journal-reversal",
      periodStart: reversalDate,
      periodEnd: reversalDate,
      correlationId: "batch-reversal",
    })
    expect(result.invalidatedCount).toBe(2)
  })

  it("deduplicates same-period manual reversal targets", async () => {
    await recordReversedJournalCloseInvalidationsInTx(tx, "org-1", {
      originalJournalEntryId: "journal-original",
      reversalJournalEntryId: "journal-reversal",
      originalPeriodId: "period-1",
      reversalPeriodId: "period-1",
    })

    expect(mockRecordInvalidations).toHaveBeenCalledTimes(1)
  })
})
