import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  Prisma,
} from "@prisma/client"

import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { recordReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { createLedgerPostingBatch, linkAccountingSource } from "@/services/accounting/posting.service"
import type { APPostingStatus } from "./ap-control.service"

export type PurchaseCorrectionLedgerReversalInput = {
  organizationId: string
  sourceType:
    | typeof AccountingSourceType.PURCHASE_RETURN
    | typeof AccountingSourceType.SUPPLIER_CREDIT_NOTE
  sourceId: string
  sourceNumber: string
  sourceDate: Date
  originalJournalEntryId: string | null
  originalPostingBatchId?: string | null
  actorId?: string | null
  supplierId: string
  documentHash: string
  reason: string
  metadata: Record<string, unknown>
}

function json(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

async function nextCorrectionEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  sourceDate: Date,
  sourceType: PurchaseCorrectionLedgerReversalInput["sourceType"],
) {
  const prefix = sourceType === AccountingSourceType.PURCHASE_RETURN ? "APRET" : "APCR"
  const datedPrefix = `${prefix}-${sourceDate.toISOString().slice(0, 10).replace(/-/g, "")}`
  const count = await tx.journalEntry.count({
    where: { organizationId, entryNumber: { startsWith: datedPrefix } },
  })
  return `${datedPrefix}-${String(count + 1).padStart(4, "0")}`
}

/**
 * Reverses the original posted correction journal line-for-line. This is
 * intentionally not rule-derived: later mapping/rule changes must never alter
 * the economic effect of a reversal.
 */
export async function reversePurchaseCorrectionLedgerInTx(
  tx: Prisma.TransactionClient,
  input: PurchaseCorrectionLedgerReversalInput,
): Promise<APPostingStatus | null> {
  if (!input.originalJournalEntryId) {
    if (input.originalPostingBatchId) {
      await tx.ledgerPostingBatch.updateMany({
        where: {
          id: input.originalPostingBatchId,
          organizationId: input.organizationId,
          status: { not: LedgerPostingBatchStatus.REVERSED },
        },
        data: { status: LedgerPostingBatchStatus.REVERSED, reversedAt: new Date() },
      })
    }
    return null
  }

  const original = await tx.journalEntry.findFirst({
    where: {
      id: input.originalJournalEntryId,
      organizationId: input.organizationId,
      sourceType: input.sourceType,
    },
    include: {
      lines: { orderBy: { lineNumber: "asc" } },
      reversedByEntries: { select: { id: true } },
    },
  })
  if (!original) throw new NotFoundError("Original purchase correction journal entry was not found.")
  if (original.status !== JournalEntryStatus.POSTED || original.reversedByEntries.length > 0) {
    throw new BusinessRuleError("Purchase correction journal has already been reversed or is not posted.")
  }

  const period = await getOpenPeriodForDate(input.organizationId, input.sourceDate, tx)
  const postingPurpose = input.sourceType === AccountingSourceType.PURCHASE_RETURN
    ? AccountingPostingPurpose.PURCHASE_RETURN
    : AccountingPostingPurpose.SUPPLIER_CREDIT_NOTE
  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: period.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose,
      idempotencyKey: `${input.sourceType}:${input.sourceId}:${postingPurpose}:reversal`,
      metadata: json({
        ...input.metadata,
        originalJournalEntryId: original.id,
        documentHash: input.documentHash,
        reason: input.reason,
      }),
    },
    tx,
  )
  const now = new Date()
  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: { status: LedgerPostingBatchStatus.POSTED, postedAt: now, errorMessage: null },
  })
  const reversal = await tx.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      journalId: original.journalId,
      periodId: period.id,
      postingBatchId: postedBatch.id,
      entryNumber: await nextCorrectionEntryNumber(tx, input.organizationId, input.sourceDate, input.sourceType),
      entryDate: input.sourceDate,
      status: JournalEntryStatus.POSTED,
      currency: original.currency,
      memo: input.reason,
      reference: input.sourceNumber,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose,
      reversalOfEntryId: original.id,
      postedAt: now,
      postedById: input.actorId ?? null,
      createdById: input.actorId ?? null,
      lines: {
        create: original.lines.map((line, index) => ({
          organizationId: input.organizationId,
          accountId: line.accountId,
          lineNumber: index + 1,
          description: line.description ? `Reversal: ${line.description}` : `Reversal of ${original.entryNumber}`,
          debit: line.credit,
          credit: line.debit,
          currency: line.currency,
          exchangeRate: line.exchangeRate,
          baseDebit: line.baseCredit ?? line.credit,
          baseCredit: line.baseDebit ?? line.debit,
          locationId: line.locationId,
          customerId: line.customerId,
          supplierId: line.supplierId ?? input.supplierId,
          itemId: line.itemId,
          dimensions: line.dimensions ?? undefined,
          metadata: line.metadata ?? undefined,
        })),
      },
    },
  })

  await tx.journalEntry.update({
    where: { id: original.id },
    data: { status: JournalEntryStatus.REVERSED, reversedAt: now, reversedById: input.actorId ?? null },
  })
  if (original.postingBatchId) {
    await tx.ledgerPostingBatch.update({
      where: { id: original.postingBatchId },
      data: { status: LedgerPostingBatchStatus.REVERSED, reversedAt: now },
    })
  }
  const sourceLink = await linkAccountingSource(
    {
      organizationId: input.organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: reversal.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceNumber: input.sourceNumber,
      sourceDate: input.sourceDate,
      metadata: json({ ...input.metadata, originalJournalEntryId: original.id }),
    },
    tx,
  )
  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: "PURCHASING_AP_LEDGER_REVERSED",
      resourceType: "LedgerPostingBatch",
      resourceId: postedBatch.id,
      postingBatchId: postedBatch.id,
      journalEntryId: reversal.id,
      message: `${input.sourceNumber} exactly reversed journal ${original.entryNumber}.`,
      metadata: json({ originalJournalEntryId: original.id, reason: input.reason }),
    },
  })
  await recordReversedJournalCloseInvalidationsInTx(
    tx,
    input.organizationId,
    {
      originalJournalEntryId: original.id,
      reversalJournalEntryId: reversal.id,
      originalPeriodId: original.periodId,
      reversalPeriodId: period.id,
      reversalDate: input.sourceDate,
      correlationId: postedBatch.id,
    },
    { actorId: input.actorId, now },
  )

  return {
    ledgerBatch: postedBatch,
    ledgerStatus: "POSTED",
    journalEntryId: reversal.id,
    accountingSourceLinkId: sourceLink.id,
  }
}
