import type { Prisma } from "@prisma/client"

import {
  recordCloseCertificationInvalidationsForSourceInTx,
  type ExportClosePackControl,
} from "./close-assurance-pack.service"

type PostedJournalCloseInvalidationInput = {
  journalEntryId: string
  periodId: string
  entryDate?: Date | string | null
  correlationId?: string | null
  staleReason?: string
}

type ReversedJournalCloseInvalidationInput = {
  originalJournalEntryId: string
  reversalJournalEntryId: string
  originalPeriodId: string
  reversalPeriodId: string
  reversalDate?: Date | string | null
  correlationId?: string | null
  staleReason?: string
}

export async function recordPostedJournalCloseInvalidationInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: PostedJournalCloseInvalidationInput,
  control: ExportClosePackControl = {},
) {
  return recordCloseCertificationInvalidationsForSourceInTx(tx, organizationId, {
    sourceCode: "LEDGER_JOURNAL_POSTED",
    sourceId: input.journalEntryId,
    periodId: input.periodId,
    periodStart: input.entryDate ?? null,
    periodEnd: input.entryDate ?? null,
    staleReason: input.staleReason ?? "Ledger journal posting changed certified close evidence.",
    newEvidenceHash: input.journalEntryId,
    correlationId: input.correlationId ?? null,
  }, control)
}

export async function recordReversedJournalCloseInvalidationsInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: ReversedJournalCloseInvalidationInput,
  control: ExportClosePackControl = {},
) {
  const periodIds = [...new Set([input.originalPeriodId, input.reversalPeriodId])]
  const results = []

  for (const periodId of periodIds) {
    results.push(await recordCloseCertificationInvalidationsForSourceInTx(tx, organizationId, {
      sourceCode: "LEDGER_JOURNAL_REVERSED",
      sourceId: input.originalJournalEntryId,
      periodId,
      periodStart: periodId === input.reversalPeriodId ? input.reversalDate ?? null : null,
      periodEnd: periodId === input.reversalPeriodId ? input.reversalDate ?? null : null,
      staleReason: input.staleReason ?? "Ledger journal reversal changed certified close evidence.",
      newEvidenceHash: input.reversalJournalEntryId,
      correlationId: input.correlationId ?? null,
    }, control))
  }

  return {
    invalidatedCount: results.reduce((total, result) => total + result.invalidatedCount, 0),
    results: results.flatMap((result) => result.results),
  }
}
