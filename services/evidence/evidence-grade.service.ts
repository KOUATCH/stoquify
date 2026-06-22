import {
  CloseRunStatus,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  ReconciliationRunStatus,
} from "@prisma/client"

import type { EvidenceGrade, ProofTrailBlocker } from "./evidence-contracts"
import { hasBlockingProofTrailBlocker } from "./evidence-blockers.service"

export type EvidenceGradeDecision = {
  grade: EvidenceGrade
  reason: string
}

export function computeJournalEntryEvidenceGrade(input: {
  status: JournalEntryStatus
  postingBatchStatus?: LedgerPostingBatchStatus | null
  sourceLinkCount: number
  blockers: ProofTrailBlocker[]
}): EvidenceGradeDecision {
  if (hasBlockingProofTrailBlocker(input.blockers)) {
    return { grade: "blocked", reason: "Journal entry has unresolved proof blockers." }
  }

  if (input.status === JournalEntryStatus.POSTED || input.status === JournalEntryStatus.REVERSED) {
    if (input.postingBatchStatus === LedgerPostingBatchStatus.POSTED && input.sourceLinkCount > 0) {
      return { grade: "posted", reason: "Journal entry is posted and linked to a posted ledger batch." }
    }
    return { grade: "operational", reason: "Journal entry is posted but source trace is partial." }
  }

  return { grade: "raw", reason: "Journal entry exists but is not posted." }
}

export function computeReconciliationRunEvidenceGrade(input: {
  status: ReconciliationRunStatus
  certificateHash?: string | null
  blockers: ProofTrailBlocker[]
}): EvidenceGradeDecision {
  if (hasBlockingProofTrailBlocker(input.blockers)) {
    return { grade: "blocked", reason: "Reconciliation run has unresolved exceptions, suspense, or failed state." }
  }

  if (input.status === ReconciliationRunStatus.SIGNED && input.certificateHash) {
    return { grade: "certified", reason: "Reconciliation run is signed and has certificate evidence." }
  }

  if (input.status === ReconciliationRunStatus.SIGNED) {
    return { grade: "reconciled", reason: "Reconciliation run is signed." }
  }

  if (input.status === ReconciliationRunStatus.READY_FOR_SIGNOFF) {
    return { grade: "reconciled", reason: "Reconciliation run is ready for sign-off with no blocking exceptions." }
  }

  if (input.status === ReconciliationRunStatus.NEEDS_REVIEW) {
    return { grade: "operational", reason: "Reconciliation run exists but still needs review." }
  }

  return { grade: "raw", reason: "Reconciliation run has not reached review or sign-off." }
}

export function computeCloseRunEvidenceGrade(input: {
  status: CloseRunStatus
  certifiedPackExportCount: number
  blockers: ProofTrailBlocker[]
}): EvidenceGradeDecision {
  if (hasBlockingProofTrailBlocker(input.blockers)) {
    return { grade: "blocked", reason: "Close run has unresolved blockers or unavailable evidence." }
  }

  if (
    input.status === CloseRunStatus.CERTIFIED ||
    (input.status === CloseRunStatus.EXPORTED && input.certifiedPackExportCount > 0)
  ) {
    return { grade: "certified", reason: "Close run has explicit certification or certified close-pack export evidence." }
  }

  if (input.status === CloseRunStatus.READY || input.status === CloseRunStatus.EXPORTED) {
    return { grade: "operational", reason: "Close run is ready but is not certified." }
  }

  return { grade: "raw", reason: "Close run exists but is not ready for certification." }
}

