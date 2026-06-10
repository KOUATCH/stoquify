import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  assertBalancedJournalEntry,
  assertOpenPeriod,
  assertSameOrganizationAccounts,
  buildPostingIdempotencyKey,
} from "./invariants"
import { getOpenPeriodForDate } from "./periods.service"
import { createAccountingSourceLink } from "./source-link.service"

export type LedgerPostingBatchInput = {
  organizationId: string
  periodId?: string | null
  sourceType: AccountingSourceType
  sourceId: string
  postingPurpose: AccountingPostingPurpose
  sourceVersion?: number | null
  idempotencyKey?: string | null
  metadata?: Prisma.InputJsonValue | null
}

const journalEntryInclude = {
  journal: true,
  period: true,
  postingBatch: true,
  lines: {
    include: {
      account: {
        select: {
          id: true,
          code: true,
          nameEn: true,
          nameFr: true,
          type: true,
          normalBalance: true,
        },
      },
    },
    orderBy: { lineNumber: "asc" },
  },
} satisfies Prisma.JournalEntryInclude

function toDecimal(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(0)
  }

  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function normalizeCurrency(currency?: string | null) {
  return (currency || "XAF").trim().toUpperCase()
}

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

async function nextEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
  prefix = "RV",
) {
  const count = await tx.journalEntry.count({
    where: {
      organizationId,
      entryNumber: { startsWith: `${prefix}-${compactDate(entryDate)}` },
    },
  })

  return `${prefix}-${compactDate(entryDate)}-${String(count + 1).padStart(4, "0")}`
}

async function assertEntryAccountsPostable(
  organizationId: string,
  accountIds: string[],
  tx: Prisma.TransactionClient,
) {
  const accounts = await tx.chartOfAccount.findMany({
    where: {
      organizationId,
      id: { in: Array.from(new Set(accountIds)) },
      deletedAt: null,
    },
    include: { _count: { select: { children: true } } },
  })

  if (accounts.length !== new Set(accountIds).size) {
    throw new Error("One or more journal accounts were not found")
  }

  assertSameOrganizationAccounts(organizationId, accounts)

  for (const account of accounts) {
    if (!account.isActive) throw new Error(`Account ${account.code} is inactive`)
    if (account._count.children > 0) throw new Error(`Account ${account.code} has child accounts`)
  }
}

function postingAudit(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    action: string
    resourceId?: string | null
    postingBatchId?: string | null
    journalEntryId?: string | null
    message: string
    metadata?: Prisma.InputJsonValue
  },
) {
  return tx.ledgerAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      resourceType: "LedgerPostingBatch",
      resourceId: params.resourceId,
      postingBatchId: params.postingBatchId,
      journalEntryId: params.journalEntryId,
      message: params.message,
      metadata: params.metadata,
    },
  })
}

export async function createLedgerPostingBatch(
  input: LedgerPostingBatchInput,
  tx: Prisma.TransactionClient | typeof db = db,
) {
  const idempotencyKey =
    input.idempotencyKey ||
    buildPostingIdempotencyKey({
      organizationId: input.organizationId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      sourceVersion: input.sourceVersion,
    })

  const existing = await tx.ledgerPostingBatch.findFirst({
    where: {
      organizationId: input.organizationId,
      OR: [
        { idempotencyKey },
        {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          postingPurpose: input.postingPurpose,
        },
      ],
    },
  })

  if (existing) return existing

  return tx.ledgerPostingBatch.create({
    data: {
      organizationId: input.organizationId,
      periodId: input.periodId || null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      sourceVersion: input.sourceVersion ?? null,
      idempotencyKey,
      metadata: input.metadata ?? undefined,
    },
  })
}

export async function linkAccountingSource(
  input: {
    organizationId: string
    postingBatchId: string
    journalEntryId?: string | null
    sourceType: AccountingSourceType
    sourceId: string
    sourceNumber?: string | null
    sourceDate?: Date | null
    metadata?: Prisma.InputJsonValue | null
  },
  tx: Prisma.TransactionClient | typeof db = db,
) {
  return createAccountingSourceLink(input, tx, {
    audit: false,
    verifyPostingBatch: false,
    verifyJournalEntry: false,
  })
}

export async function postJournalEntry(
  organizationId: string,
  journalEntryId: string,
  actorId?: string | null,
) {
  return db.$transaction(async (tx) => {
    const entry = await tx.journalEntry.findFirst({
      where: { id: journalEntryId, organizationId },
      include: {
        period: true,
        lines: { include: { account: true }, orderBy: { lineNumber: "asc" } },
      },
    })

    if (!entry) throw new Error("Journal entry not found")
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new Error("Only draft journal entries can be posted")
    }

    assertOpenPeriod(entry.period, entry.entryDate, organizationId)
    assertBalancedJournalEntry(entry.lines)
    await assertEntryAccountsPostable(
      organizationId,
      entry.lines.map((line) => line.accountId),
      tx,
    )

    const batch = await createLedgerPostingBatch(
      {
        organizationId,
        periodId: entry.periodId,
        sourceType: AccountingSourceType.MANUAL,
        sourceId: entry.id,
        postingPurpose: AccountingPostingPurpose.MANUAL_JOURNAL,
        metadata: { entryNumber: entry.entryNumber },
      },
      tx,
    )

    const now = new Date()

    const postedBatch = await tx.ledgerPostingBatch.update({
      where: { id: batch.id },
      data: {
        status: LedgerPostingBatchStatus.POSTED,
        postedAt: now,
        errorMessage: null,
      },
    })

    const posted = await tx.journalEntry.update({
      where: { id: entry.id },
      data: {
        status: JournalEntryStatus.POSTED,
        postingBatchId: postedBatch.id,
        postedAt: now,
        postedById: actorId,
        sourceType: AccountingSourceType.MANUAL,
        sourceId: entry.id,
        postingPurpose: AccountingPostingPurpose.MANUAL_JOURNAL,
      },
      include: journalEntryInclude,
    })

    await linkAccountingSource(
      {
        organizationId,
        postingBatchId: postedBatch.id,
        journalEntryId: posted.id,
        sourceType: AccountingSourceType.MANUAL,
        sourceId: posted.id,
        sourceNumber: posted.entryNumber,
        sourceDate: posted.entryDate,
      },
      tx,
    )

    await postingAudit(tx, {
      organizationId,
      actorId,
      action: "JOURNAL_ENTRY_POST",
      resourceId: postedBatch.id,
      postingBatchId: postedBatch.id,
      journalEntryId: posted.id,
      message: `Journal entry ${posted.entryNumber} posted`,
      metadata: { entryNumber: posted.entryNumber },
    })

    return posted
  })
}

export async function reverseJournalEntry(
  organizationId: string,
  journalEntryId: string,
  actorId?: string | null,
  reason?: string | null,
  reversalDate: Date = new Date(),
) {
  return db.$transaction(async (tx) => {
    const original = await tx.journalEntry.findFirst({
      where: { id: journalEntryId, organizationId },
      include: {
        journal: true,
        period: true,
        lines: { include: { account: true }, orderBy: { lineNumber: "asc" } },
        reversedByEntries: { select: { id: true } },
      },
    })

    if (!original) throw new Error("Journal entry not found")
    if (original.status !== JournalEntryStatus.POSTED) {
      throw new Error("Only posted journal entries can be reversed")
    }
    if (original.reversedByEntries.length > 0) {
      throw new Error("Journal entry has already been reversed")
    }

    const period = await getOpenPeriodForDate(organizationId, reversalDate, tx)
    assertBalancedJournalEntry(original.lines)

    const batch = await createLedgerPostingBatch(
      {
        organizationId,
        periodId: period.id,
        sourceType: AccountingSourceType.MANUAL,
        sourceId: original.id,
        postingPurpose: AccountingPostingPurpose.REVERSAL,
        metadata: { originalEntryNumber: original.entryNumber, reason: reason || null },
      },
      tx,
    )

    const now = new Date()
    const postedBatch = await tx.ledgerPostingBatch.update({
      where: { id: batch.id },
      data: {
        status: LedgerPostingBatchStatus.POSTED,
        postedAt: now,
      },
    })

    const reversal = await tx.journalEntry.create({
      data: {
        organizationId,
        journalId: original.journalId,
        periodId: period.id,
        postingBatchId: postedBatch.id,
        entryNumber: await nextEntryNumber(tx, organizationId, reversalDate),
        entryDate: reversalDate,
        status: JournalEntryStatus.POSTED,
        currency: normalizeCurrency(original.currency),
        memo: reason?.trim() || `Reversal of ${original.entryNumber}`,
        reference: original.reference,
        sourceType: AccountingSourceType.MANUAL,
        sourceId: original.id,
        postingPurpose: AccountingPostingPurpose.REVERSAL,
        reversalOfEntryId: original.id,
        postedAt: now,
        postedById: actorId,
        createdById: actorId,
        lines: {
          create: original.lines.map((line, index) => {
            const debit = toDecimal(line.debit)
            const credit = toDecimal(line.credit)

            return {
              organizationId,
              accountId: line.accountId,
              lineNumber: index + 1,
              description: line.description ? `Reversal: ${line.description}` : `Reversal of ${original.entryNumber}`,
              debit: credit,
              credit: debit,
              currency: normalizeCurrency(line.currency),
              exchangeRate: line.exchangeRate,
              baseDebit: toDecimal(line.baseCredit ?? line.credit),
              baseCredit: toDecimal(line.baseDebit ?? line.debit),
              locationId: line.locationId,
              customerId: line.customerId,
              supplierId: line.supplierId,
              itemId: line.itemId,
              dimensions: line.dimensions ?? undefined,
              metadata: line.metadata ?? undefined,
            }
          }),
        },
      },
      include: journalEntryInclude,
    })

    await tx.journalEntry.update({
      where: { id: original.id },
      data: {
        status: JournalEntryStatus.REVERSED,
        reversedAt: now,
        reversedById: actorId,
      },
    })

    await linkAccountingSource(
      {
        organizationId,
        postingBatchId: postedBatch.id,
        journalEntryId: reversal.id,
        sourceType: AccountingSourceType.MANUAL,
        sourceId: original.id,
        sourceNumber: original.entryNumber,
        sourceDate: original.entryDate,
      },
      tx,
    )

    await postingAudit(tx, {
      organizationId,
      actorId,
      action: "JOURNAL_ENTRY_REVERSE",
      resourceId: postedBatch.id,
      postingBatchId: postedBatch.id,
      journalEntryId: reversal.id,
      message: `Journal entry ${original.entryNumber} reversed by ${reversal.entryNumber}`,
      metadata: { originalEntryId: original.id, reversalEntryId: reversal.id, reason: reason || null },
    })

    return reversal
  })
}
