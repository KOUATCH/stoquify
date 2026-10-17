import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  Prisma,
} from "@prisma/client"

import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { recordOrderedReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { lockJournalReversalClosePeriodsInTx } from "@/services/accounting/journal-reversal-order.service"
import { recordInventoryValuationCloseInvalidationInTx } from "@/services/inventory/inventory-close-invalidation.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { createLedgerPostingBatch, linkAccountingSource } from "@/services/accounting/posting.service"
import type { APPostingStatus } from "./ap-control.service"

export type PurchaseCorrectionLedgerReversalInput = {
  organizationId: string
  sourceType:
    | typeof AccountingSourceType.PURCHASE_RETURN
    | typeof AccountingSourceType.SUPPLIER_CREDIT_NOTE
  sourceId: string
  originalSourceId: string
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

type PurchaseCorrectionPreparationInput = Pick<PurchaseCorrectionLedgerReversalInput,
  "organizationId" | "sourceType" | "originalSourceId" | "originalJournalEntryId" | "originalPostingBatchId"> & {
  originalSourceDate: Date
  reversalDate: Date
}

type OriginalCorrectionJournal = Prisma.JournalEntryGetPayload<{
  include: { lines: { include: { account: true } }; reversedByEntries: { select: { id: true } } }
}>

export type PreparedPurchaseCorrectionReversal = Readonly<{
  transaction: Prisma.TransactionClient
  organizationId: string
  sourceType: PurchaseCorrectionLedgerReversalInput["sourceType"]
  originalSourceId: string
  originalJournalEntryId: string | null
  originalPostingBatchId: string | null
  reversalDate: Date
  reversalPeriodId: string
  original: OriginalCorrectionJournal | null
  affectedPeriodIds: readonly string[]
}>

/** The owner holds catalog and source locks. Prepare before numbering or writes. */
export async function preparePurchaseCorrectionReversalInTx(
  tx: Prisma.TransactionClient,
  input: PurchaseCorrectionPreparationInput,
): Promise<PreparedPurchaseCorrectionReversal> {
  const postingPurpose = input.sourceType === AccountingSourceType.PURCHASE_RETURN
    ? AccountingPostingPurpose.PURCHASE_RETURN : AccountingPostingPurpose.SUPPLIER_CREDIT_NOTE
  let original: OriginalCorrectionJournal | null = null
  if (input.originalJournalEntryId) {
    await tx.$queryRaw`SELECT id FROM journal_entries WHERE id = ${input.originalJournalEntryId} AND "organizationId" = ${input.organizationId} FOR UPDATE`
    original = await tx.journalEntry.findFirst({
      where: { id: input.originalJournalEntryId, organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.originalSourceId },
      include: { lines: { include: { account: true }, orderBy: { lineNumber: "asc" } }, reversedByEntries: { select: { id: true } } },
    })
    if (!original) throw new NotFoundError("Original purchase correction journal entry was not found.")
    if (original.status !== JournalEntryStatus.POSTED || original.reversedByEntries.length > 0) {
      throw new BusinessRuleError("Purchase correction journal has already been reversed or is not posted.")
    }
    if (input.originalPostingBatchId && input.originalPostingBatchId !== original.postingBatchId) {
      throw new BusinessRuleError("The original correction posting evidence changed or is inconsistent. Review it before reversal.")
    }
  } else if (await tx.journalEntry.findFirst({
    where: { organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.originalSourceId }, select: { id: true },
  })) throw new BusinessRuleError("The original correction has journal evidence that requires review before reversal.")

  const batchId = original?.postingBatchId ?? input.originalPostingBatchId ?? null
  let batchPeriodId: string | null = null
  if (batchId) {
    await tx.$queryRaw`SELECT id FROM ledger_posting_batches WHERE id = ${batchId} AND "organizationId" = ${input.organizationId} FOR UPDATE`
    const batch = await tx.ledgerPostingBatch.findFirst({
      where: { id: batchId, organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.originalSourceId, postingPurpose },
      select: { id: true, periodId: true, status: true, journalEntries: { select: { id: true } } },
    })
    if (!batch || (!original && (![LedgerPostingBatchStatus.PENDING, LedgerPostingBatchStatus.FAILED].some(status => status === batch.status) || batch.journalEntries.length > 0))) {
      throw new BusinessRuleError("The original correction posting evidence changed or is inconsistent. Review it before reversal.")
    }
    batchPeriodId = batch.periodId
  } else if (!original && await tx.ledgerPostingBatch.findFirst({
    where: { organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.originalSourceId }, select: { id: true },
  })) throw new BusinessRuleError("The original correction has posting evidence that requires review before reversal.")

  const period = await getOpenPeriodForDate(input.organizationId, input.reversalDate, tx)
  const affectedPeriodIds = await lockJournalReversalClosePeriodsInTx(tx, input.organizationId, {
    originalPeriodId: original?.periodId ?? null, reversalPeriodId: period.id,
    originalEntryDate: original?.entryDate ?? input.originalSourceDate, reversalDate: input.reversalDate,
    additionalEvidenceDates: [input.originalSourceDate], additionalPeriodIds: batchPeriodId ? [batchPeriodId] : [],
    includeLaterPeriods: input.sourceType === AccountingSourceType.PURCHASE_RETURN || !!original?.lines.some(line => line.account.syscohadaClass?.startsWith("3")),
  })
  return { transaction: tx, organizationId: input.organizationId, sourceType: input.sourceType,
    originalSourceId: input.originalSourceId, originalJournalEntryId: input.originalJournalEntryId,
    originalPostingBatchId: input.originalPostingBatchId ?? null, reversalDate: input.reversalDate,
    reversalPeriodId: period.id, original, affectedPeriodIds }
}

function assertPrepared(tx: Prisma.TransactionClient, prepared: PreparedPurchaseCorrectionReversal) {
  if (!prepared || prepared.transaction !== tx || !prepared.affectedPeriodIds.includes(prepared.reversalPeriodId)) {
    throw new ConflictError("Purchase correction requires its prepared evidence scope in the same transaction.")
  }
}

/** Complete stock and source writes before taking Close run locks. */
export async function recordPurchaseCorrectionReversalCloseInvalidationsInTx(
  tx: Prisma.TransactionClient,
  prepared: PreparedPurchaseCorrectionReversal,
  input: { sourceId: string; documentHash: string; actorId?: string | null; posting: APPostingStatus | null },
) {
  assertPrepared(tx, prepared)
  if (prepared.original && !input.posting?.journalEntryId) throw new ConflictError("The prepared journal reversal has no completed posting evidence.")
  if (prepared.original && input.posting?.journalEntryId) {
    await recordOrderedReversedJournalCloseInvalidationsInTx(tx, prepared.organizationId, {
      originalJournalEntryId: prepared.original.id, reversalJournalEntryId: input.posting.journalEntryId,
      originalPeriodId: prepared.original.periodId, reversalPeriodId: prepared.reversalPeriodId,
      reversalDate: prepared.reversalDate, affectedPeriodIds: prepared.affectedPeriodIds, correlationId: input.posting.ledgerBatch.id,
    }, { actorId: input.actorId })
  }
  if (prepared.sourceType === AccountingSourceType.PURCHASE_RETURN) {
    await recordInventoryValuationCloseInvalidationInTx(tx, {
      organizationId: prepared.organizationId, sourceId: input.sourceId, periodId: prepared.reversalPeriodId,
      occurredAt: prepared.reversalDate, affectedPeriodIds: prepared.affectedPeriodIds,
      actorId: input.actorId, documentHash: input.documentHash,
    })
  } else if (!prepared.original) {
    await recordCloseCertificationInvalidationsForSourceInTx(tx, prepared.organizationId, {
      sourceCode: "SUPPLIER_CREDIT_NOTE_REVERSED", sourceId: input.sourceId, periodIds: prepared.affectedPeriodIds,
      newEvidenceHash: input.documentHash, staleReason: "Supplier credit reversal changed retained payable and posting evidence.",
    }, { actorId: input.actorId })
  }
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
  prepared: PreparedPurchaseCorrectionReversal,
): Promise<APPostingStatus | null> {
  // The reversal still changes stock or supplier obligations when the original
  // journal failed to post. Its accounting date must satisfy the same control.
  assertPrepared(tx, prepared)
  if (prepared.organizationId !== input.organizationId || prepared.sourceType !== input.sourceType ||
    prepared.originalSourceId !== input.originalSourceId || prepared.originalJournalEntryId !== input.originalJournalEntryId ||
    prepared.originalPostingBatchId !== (input.originalPostingBatchId ?? null) || prepared.reversalDate.getTime() !== input.sourceDate.getTime()) {
    throw new ConflictError("Purchase correction differs from its prepared evidence scope.")
  }
  const period = { id: prepared.reversalPeriodId }
  const postingPurpose = input.sourceType === AccountingSourceType.PURCHASE_RETURN
    ? AccountingPostingPurpose.PURCHASE_RETURN
    : AccountingPostingPurpose.SUPPLIER_CREDIT_NOTE
  if (!input.originalJournalEntryId) {
    const retainedJournal = await tx.journalEntry.findFirst({
      where: { organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.originalSourceId },
      select: { id: true },
    })
    if (retainedJournal) throw new BusinessRuleError("The original correction has journal evidence that requires review before reversal.")
    if (input.originalPostingBatchId) {
      const changed = await tx.ledgerPostingBatch.updateMany({
        where: {
          id: input.originalPostingBatchId,
          organizationId: input.organizationId,
          sourceType: input.sourceType,
          sourceId: input.originalSourceId,
          postingPurpose,
          status: { in: [LedgerPostingBatchStatus.PENDING, LedgerPostingBatchStatus.FAILED] },
          journalEntries: { none: {} },
        },
        data: { status: LedgerPostingBatchStatus.REVERSED, reversedAt: new Date() },
      })
      if (changed.count !== 1) throw new BusinessRuleError("The original correction posting evidence changed or is inconsistent. Review it before reversal.")
    } else {
      const retainedBatch = await tx.ledgerPostingBatch.findFirst({
        where: { organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.originalSourceId },
        select: { id: true },
      })
      if (retainedBatch) throw new BusinessRuleError("The original correction has posting evidence that requires review before reversal.")
    }
    await tx.ledgerAuditEvent.create({ data: {
      organizationId: input.organizationId, actorId: input.actorId ?? null,
      action: "PURCHASING_AP_UNPOSTED_CORRECTION_REVERSED", resourceType: input.sourceType,
      resourceId: input.originalSourceId, postingBatchId: input.originalPostingBatchId ?? null,
      message: `${input.sourceNumber} reversed an unposted correction; no journal reversal was created.`,
      metadata: json({ originalSourceId: input.originalSourceId, reversalSourceId: input.sourceId, reversalPeriodId: period.id, documentHash: input.documentHash, reason: input.reason }),
    } })
    return null
  }

  const original = prepared.original
  if (!original) throw new NotFoundError("Original purchase correction journal entry was not found.")
  if (original.status !== JournalEntryStatus.POSTED || original.reversedByEntries.length > 0) {
    throw new BusinessRuleError("Purchase correction journal has already been reversed or is not posted.")
  }

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

  return {
    ledgerBatch: postedBatch,
    ledgerStatus: "POSTED",
    journalEntryId: reversal.id,
    accountingSourceLinkId: sourceLink.id,
  }
}
