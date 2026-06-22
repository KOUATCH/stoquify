import {
  CloseRunStatus,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  ReconciliationRunStatus,
} from "@prisma/client"

import { createProofTrailBlocker } from "../evidence-blockers.service"
import {
  computeCloseRunEvidenceGrade,
  computeJournalEntryEvidenceGrade,
  computeReconciliationRunEvidenceGrade,
} from "../evidence-grade.service"

describe("evidence grade service", () => {
  it("returns raw for an unposted journal entry", () => {
    expect(
      computeJournalEntryEvidenceGrade({
        status: JournalEntryStatus.DRAFT,
        postingBatchStatus: null,
        sourceLinkCount: 0,
        blockers: [],
      }),
    ).toMatchObject({ grade: "raw" })
  })

  it("returns operational for posted journal evidence with partial source trace", () => {
    expect(
      computeJournalEntryEvidenceGrade({
        status: JournalEntryStatus.POSTED,
        postingBatchStatus: LedgerPostingBatchStatus.POSTED,
        sourceLinkCount: 0,
        blockers: [],
      }),
    ).toMatchObject({ grade: "operational" })
  })

  it("returns posted when a journal entry has posted batch and source-link evidence", () => {
    expect(
      computeJournalEntryEvidenceGrade({
        status: JournalEntryStatus.POSTED,
        postingBatchStatus: LedgerPostingBatchStatus.POSTED,
        sourceLinkCount: 1,
        blockers: [],
      }),
    ).toMatchObject({ grade: "posted" })
  })

  it("returns reconciled for a run ready for sign-off without blockers", () => {
    expect(
      computeReconciliationRunEvidenceGrade({
        status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
        certificateHash: null,
        blockers: [],
      }),
    ).toMatchObject({ grade: "reconciled" })
  })

  it("returns certified for a signed reconciliation run with certificate evidence", () => {
    expect(
      computeReconciliationRunEvidenceGrade({
        status: ReconciliationRunStatus.SIGNED,
        certificateHash: "sha256:cert",
        blockers: [],
      }),
    ).toMatchObject({ grade: "certified" })
  })

  it("returns blocked when a critical blocker is present", () => {
    expect(
      computeCloseRunEvidenceGrade({
        status: CloseRunStatus.CERTIFIED,
        certifiedPackExportCount: 1,
        blockers: [
          createProofTrailBlocker({
            id: "failed-event",
            severity: "critical",
            gate: "events.business-event",
            title: "Failed event",
            detail: "Event failed.",
          }),
        ],
      }),
    ).toMatchObject({ grade: "blocked" })
  })
})

