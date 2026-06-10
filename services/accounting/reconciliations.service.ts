import { JournalEntryStatus, LedgerPostingBatchStatus, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"

export type ReconciliationFailureType =
  | "TRIAL_BALANCE_OUT_OF_BALANCE"
  | "POSTED_ENTRY_MISSING_TRACE"
  | "POSTING_BATCH_MISSING_JOURNAL_ENTRY"
  | "POSTING_BATCH_MISSING_SOURCE_LINK"
  | "SOURCE_LINK_MISSING_JOURNAL_ENTRY"

export type ReconciliationFailure = {
  type: ReconciliationFailureType
  severity: "high" | "critical"
  message: string
  metadata?: Record<string, unknown>
}

export type LedgerReconciliationInput = {
  periodId?: string
}

export type LedgerReconciliationResult = {
  organizationId: string
  periodId?: string
  isClean: boolean
  totalsByCurrency: Array<{
    currency: string
    debit: string
    credit: string
    difference: string
  }>
  failures: ReconciliationFailure[]
}

const postedStatuses = [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] as const

function zeroDecimal() {
  return new Prisma.Decimal(0)
}

function amount(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return zeroDecimal()
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

async function assertPeriodBelongsToOrg(
  organizationId: string,
  periodId: string | undefined,
  tx: Prisma.TransactionClient | typeof db,
) {
  if (!periodId) return null

  const period = await tx.accountingPeriod.findFirst({
    where: { id: periodId, organizationId },
    select: { id: true },
  })

  if (!period) throw new NotFoundError("Accounting period not found")
  return period
}

function formatMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2)
}

export async function reconcileLedger(
  organizationId: string,
  input: LedgerReconciliationInput = {},
  tx: Prisma.TransactionClient | typeof db = db,
): Promise<LedgerReconciliationResult> {
  await assertPeriodBelongsToOrg(organizationId, input.periodId, tx)

  const journalEntryWhere: Prisma.JournalEntryWhereInput = {
    organizationId,
    ...(input.periodId ? { periodId: input.periodId } : {}),
    status: { in: [...postedStatuses] },
  }

  const [lines, entriesMissingTrace, postedBatches, sourceLinks] = await Promise.all([
    tx.journalEntryLine.findMany({
      where: {
        organizationId,
        journalEntry: journalEntryWhere,
      },
      select: { debit: true, credit: true, currency: true },
    }),
    tx.journalEntry.findMany({
      where: {
        ...journalEntryWhere,
        OR: [{ postingBatchId: null }, { sourceType: null }, { sourceId: null }],
      },
      select: {
        id: true,
        entryNumber: true,
        postingBatchId: true,
        sourceType: true,
        sourceId: true,
      },
    }),
    tx.ledgerPostingBatch.findMany({
      where: {
        organizationId,
        ...(input.periodId ? { periodId: input.periodId } : {}),
        status: LedgerPostingBatchStatus.POSTED,
      },
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        postingPurpose: true,
        _count: { select: { journalEntries: true, sourceLinks: true } },
      },
    }),
    tx.accountingSourceLink.findMany({
      where: {
        organizationId,
        ...(input.periodId ? { postingBatch: { periodId: input.periodId } } : {}),
      },
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        postingBatchId: true,
        journalEntryId: true,
      },
    }),
  ])

  const totals = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>()

  for (const line of lines) {
    const currency = (line.currency || "XAF").trim().toUpperCase()
    const current = totals.get(currency) ?? { debit: zeroDecimal(), credit: zeroDecimal() }
    current.debit = current.debit.add(amount(line.debit))
    current.credit = current.credit.add(amount(line.credit))
    totals.set(currency, current)
  }

  const failures: ReconciliationFailure[] = []
  const totalsByCurrency = Array.from(totals.entries()).map(([currency, total]) => {
    const difference = total.debit.sub(total.credit)

    if (!difference.eq(0)) {
      failures.push({
        type: "TRIAL_BALANCE_OUT_OF_BALANCE",
        severity: "critical",
        message: `Trial balance is not balanced for ${currency}: debit ${formatMoney(total.debit)} credit ${formatMoney(total.credit)}`,
        metadata: { currency, debit: formatMoney(total.debit), credit: formatMoney(total.credit) },
      })
    }

    return {
      currency,
      debit: formatMoney(total.debit),
      credit: formatMoney(total.credit),
      difference: formatMoney(difference),
    }
  })

  for (const entry of entriesMissingTrace) {
    failures.push({
      type: "POSTED_ENTRY_MISSING_TRACE",
      severity: "critical",
      message: `Posted journal entry ${entry.entryNumber} is missing posting trace data`,
      metadata: {
        journalEntryId: entry.id,
        postingBatchId: entry.postingBatchId,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
      },
    })
  }

  for (const batch of postedBatches) {
    if (batch._count.journalEntries === 0) {
      failures.push({
        type: "POSTING_BATCH_MISSING_JOURNAL_ENTRY",
        severity: "critical",
        message: `Posted batch ${batch.id} has no journal entry`,
        metadata: { postingBatchId: batch.id, sourceType: batch.sourceType, sourceId: batch.sourceId },
      })
    }

    if (batch._count.sourceLinks === 0) {
      failures.push({
        type: "POSTING_BATCH_MISSING_SOURCE_LINK",
        severity: "high",
        message: `Posted batch ${batch.id} has no source link`,
        metadata: {
          postingBatchId: batch.id,
          sourceType: batch.sourceType,
          sourceId: batch.sourceId,
          postingPurpose: batch.postingPurpose,
        },
      })
    }
  }

  for (const link of sourceLinks) {
    if (!link.journalEntryId) {
      failures.push({
        type: "SOURCE_LINK_MISSING_JOURNAL_ENTRY",
        severity: "high",
        message: `Source link ${link.id} is not attached to a journal entry`,
        metadata: {
          sourceLinkId: link.id,
          postingBatchId: link.postingBatchId,
          sourceType: link.sourceType,
          sourceId: link.sourceId,
        },
      })
    }
  }

  return {
    organizationId,
    periodId: input.periodId,
    isClean: failures.length === 0,
    totalsByCurrency,
    failures,
  }
}

export async function assertLedgerReconciliationClean(
  organizationId: string,
  input: LedgerReconciliationInput = {},
  tx: Prisma.TransactionClient | typeof db = db,
) {
  const result = await reconcileLedger(organizationId, input, tx)

  if (!result.isClean) {
    throw new BusinessRuleError(
      `Ledger reconciliation failed: ${result.failures.map((failure) => failure.message).join("; ")}`,
    )
  }

  return result
}
