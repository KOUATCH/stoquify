import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
  type SensitiveActionDecision,
} from "@/services/controls/sensitive-action.service"
import {
  recordPostedJournalCloseInvalidationInTx,
  recordOrderedReversedJournalCloseInvalidationsInTx,
} from "./journal-close-invalidation.service"
import {
  lockJournalReversalCatalogInTx,
  lockJournalReversalClosePeriodsInTx,
} from "./journal-reversal-order.service"
import {
  assertBalancedJournalEntry,
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

export type AccountingControlContext = {
  actorPermissions: readonly string[]
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
}

type ControlledResult<T> =
  | { denied: SensitiveActionDecision; value?: never }
  | { denied?: never; value: T }

function amountTotal(lines: Array<{ debit: Prisma.Decimal | Prisma.Decimal.Value; credit: Prisma.Decimal | Prisma.Decimal.Value }>) {
  return lines
    .reduce((total, line) => {
      const debit = new Prisma.Decimal(line.debit ?? 0)
      const credit = new Prisma.Decimal(line.credit ?? 0)
      return total.plus(Prisma.Decimal.max(debit, credit))
    }, new Prisma.Decimal(0))
    .toDecimalPlaces(2)
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
    throw new NotFoundError("One or more journal accounts were not found")
  }

  assertSameOrganizationAccounts(organizationId, accounts)

  for (const account of accounts) {
    if (!account.isActive) throw new BusinessRuleError(`Account ${account.code} is inactive`)
    if (account._count.children > 0) throw new BusinessRuleError(`Account ${account.code} has child accounts`)
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
  const version = input.sourceVersion ?? 1
  if (!Number.isSafeInteger(version) || version < 1 || version > 2_147_483_647) {
    throw new BusinessRuleError("Posting source version must be a positive database integer.")
  }
  const idempotencyKey =
    input.idempotencyKey ||
    buildPostingIdempotencyKey({
      organizationId: input.organizationId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      sourceVersion: input.sourceVersion,
    })

  // Check the key first: a combined OR can return the source match and conceal
  // that the submitted key already belongs to a different financial operation.
  const byKey = await tx.ledgerPostingBatch.findFirst({
    where: { organizationId: input.organizationId, idempotencyKey },
  })
  const existing = byKey ?? await tx.ledgerPostingBatch.findFirst({
    where: {
      organizationId: input.organizationId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      postingCycle: 1,
    },
  })

  if (existing) {
    if (existing.organizationId !== input.organizationId || existing.sourceType !== input.sourceType
      || existing.sourceId !== input.sourceId || existing.postingPurpose !== input.postingPurpose
      || (existing.sourceVersion ?? 1) !== version || (existing.postingCycle ?? 1) !== 1
      || (input.periodId != null && existing.periodId != null && existing.periodId !== input.periodId)) {
      throw new IdempotencyConflictError("The retained posting batch belongs to different source, version or period evidence. Review the original posting before retrying.")
    }
    // Historical null versions mean v1. Preserve canonical source deduplication,
    // including a caller retrying that source with a different request key.
    // This is identity validation; domain services must still verify payload and ledger truth.
    return existing
  }

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
  control?: AccountingControlContext,
) {
  const result = await db.$transaction(async (tx) => {
    const entry = await tx.journalEntry.findFirst({
      where: { id: journalEntryId, organizationId },
      include: {
        period: true,
        lines: { include: { account: true }, orderBy: { lineNumber: "asc" } },
      },
    })

    if (!entry) throw new NotFoundError("Journal entry not found")
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BusinessRuleError("Only draft journal entries can be posted")
    }
    const period = await getOpenPeriodForDate(organizationId, entry.entryDate, tx)
    if (period.id !== entry.periodId) throw new BusinessRuleError("Journal accounting period changed. Review the entry before posting.")
    if (entry.sourceType !== AccountingSourceType.MANUAL) {
      throw new BusinessRuleError("Source-owned journals must be posted through their source workflow")
    }

    // Revalidate persisted drafts, including drafts created before the FX fix.
    // An invalid historical draft needs an explicit correction; posting must
    // not silently rewrite its economic evidence.
    for (const line of entry.lines) {
      const rate = line.exchangeRate
      if (!rate?.isFinite() || rate.lte(0) ||
        !line.baseDebit?.eq(line.debit.times(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)) ||
        !line.baseCredit?.eq(line.credit.times(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP))) {
        throw new BusinessRuleError("Journal base amounts do not match the recorded exchange rate. Correct the draft before posting.")
      }
    }
    assertBalancedJournalEntry(entry.lines.map((line) => ({ debit: line.baseDebit, credit: line.baseCredit, currency: entry.currency })))

    assertBalancedJournalEntry(entry.lines)
    await assertEntryAccountsPostable(
      organizationId,
      entry.lines.map((line) => line.accountId),
      tx,
    )

    const controlDecision = evaluateSensitiveAction({
      action: "accounting.journal.post",
      actorId,
      organizationId,
      actorPermissions: control?.actorPermissions ?? [],
      lastAuthAt: control?.lastAuthAt,
      now: control?.now,
      resourceType: "JournalEntry",
      resourceId: entry.id,
      subjectActorId: entry.createdById,
      amount: amountTotal(entry.lines),
      currency: entry.currency,
      metadata: { entryNumber: entry.entryNumber, periodId: entry.periodId },
    })
    await auditSensitiveActionDecision(tx, controlDecision)
    if (!controlDecision.allowed) return { denied: controlDecision }

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

    await recordPostedJournalCloseInvalidationInTx(tx, organizationId, {
      journalEntryId: posted.id,
      periodId: entry.periodId,
      entryDate: posted.entryDate,
      correlationId: postedBatch.id,
    }, {
      actorId,
      now,
    })

    return { value: posted }
  })

  if (result.denied) {
    assertSensitiveActionAllowed(result.denied)
  }

  return result.value
}

export async function reverseJournalEntry(
  organizationId: string,
  journalEntryId: string,
  actorId?: string | null,
  reason?: string | null,
  reversalDate: Date = new Date(),
  control?: AccountingControlContext,
) {
  const startedAt = Date.now()
  const suppliedNow = control?.now == null ? startedAt : new Date(control.now).getTime()
  const controlStartedAt = Number.isFinite(suppliedNow) ? suppliedNow : startedAt
  const result = await db.$transaction(async (tx) => {
    await lockJournalReversalCatalogInTx(tx, organizationId)
    // Resolution takes the same row lock before reserving a clearing journal.
    // A reversal and final resolution cannot commit against opposite snapshots.
    await tx.$queryRaw`SELECT id FROM journal_entries WHERE id = ${journalEntryId} AND "organizationId" = ${organizationId} FOR UPDATE`
    const original = await tx.journalEntry.findFirst({
      where: { id: journalEntryId, organizationId },
      include: {
        journal: true,
        period: true,
        lines: { include: { account: true }, orderBy: { lineNumber: "asc" } },
        reversedByEntries: { select: { id: true } },
        postingBatch: true,
      },
    })

    if (!original) throw new NotFoundError("Journal entry not found")

    const controlDecision = evaluateSensitiveAction({
      action: "accounting.journal.reverse",
      actorId,
      organizationId,
      actorPermissions: control?.actorPermissions ?? [],
      lastAuthAt: control?.lastAuthAt,
      now: control?.now,
      resourceType: "JournalEntry",
      resourceId: original.id,
      subjectActorId: original.postedById || original.createdById,
      amount: amountTotal(original.lines),
      currency: original.currency,
      metadata: {
        entryNumber: original.entryNumber,
        periodId: original.periodId,
        reasonProvided: Boolean(reason?.trim()),
      },
    })
    await auditSensitiveActionDecision(tx, controlDecision)
    if (!controlDecision.allowed) return { denied: controlDecision }

    // Only manual journals belong to this correction command. Domain-owned
    // entries must compensate their source effects (stock, cash and obligations).
    if (original.sourceType !== AccountingSourceType.MANUAL) {
      await tx.auditLog.create({
        data: {
          organizationId,
          entityType: "JournalEntry",
          entityId: original.id,
          action: "JOURNAL_ENTRY_SOURCE_OWNED_REVERSAL_BLOCKED",
          userId: actorId || null,
          changes: {
            sourceType: original.sourceType,
            sourceId: original.sourceId,
            journalEntryId: original.id,
            reasonProvided: Boolean(reason?.trim()),
          },
        },
      })
      return { sourceOwnedBlocked: original.sourceType }
    }
    const resolution = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId, source: "SUSPENSE_POST",
      idempotencyKey: `suspense-resolution-clearing:${original.id}` }, select: { id: true } })
    if (resolution) throw new BusinessRuleError("This journal clears a resolved suspense item. Reopening that resolution requires source-owned recovery; generic reversal is not available.")
    const recoveryMetadata = original.postingBatch?.metadata
    if (recoveryMetadata && typeof recoveryMetadata === "object" && !Array.isArray(recoveryMetadata) && recoveryMetadata.resolutionRecoveryReceiptId) {
      throw new BusinessRuleError("This journal preserves a suspense recovery. Use the source workflow for further corrections; generic reversal is not available.")
    }
    if (original.status !== JournalEntryStatus.POSTED) {
      throw new BusinessRuleError("Only posted journal entries can be reversed")
    }
    if (original.reversedByEntries.length > 0) {
      throw new BusinessRuleError("Journal entry has already been reversed")
    }

    const originalLines = original.lines.map((line) => {
      if (line.baseDebit === null || line.baseCredit === null) {
        throw new BusinessRuleError("Functional-currency evidence is missing from the original journal. Review the historical entry before reversing it.")
      }
      return { ...line, baseDebit: line.baseDebit, baseCredit: line.baseCredit }
    })
    const period = await getOpenPeriodForDate(organizationId, reversalDate, tx)
    assertBalancedJournalEntry(originalLines)
    const affectedPeriodIds = await lockJournalReversalClosePeriodsInTx(tx, organizationId, {
      originalPeriodId: original.periodId,
      reversalPeriodId: period.id,
      originalEntryDate: original.entryDate,
      reversalDate,
      includeLaterPeriods: original.lines.some((line) => line.account?.syscohadaClass?.startsWith("3")),
    })

    // Catalog, source and assessment waits must not extend the authentication
    // window. Advance an injected control clock by elapsed time as well.
    const currentControlDecision = evaluateSensitiveAction({
      ...controlDecision.input,
      now: controlStartedAt + Math.max(0, Date.now() - startedAt),
    })
    if (!currentControlDecision.allowed) {
      await auditSensitiveActionDecision(tx, currentControlDecision)
      return { denied: currentControlDecision }
    }

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
          create: originalLines.map((line, index) => {
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
              baseDebit: toDecimal(line.baseCredit),
              baseCredit: toDecimal(line.baseDebit),
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

    await recordOrderedReversedJournalCloseInvalidationsInTx(tx, organizationId, {
      originalJournalEntryId: original.id,
      reversalJournalEntryId: reversal.id,
      originalPeriodId: original.periodId,
      reversalPeriodId: period.id,
      affectedPeriodIds,
      reversalDate,
      correlationId: postedBatch.id,
    }, {
      actorId,
      now,
    })

    return { value: reversal }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })

  if ("sourceOwnedBlocked" in result) {
    throw new BusinessRuleError(
      result.sourceOwnedBlocked === AccountingSourceType.PAYMENT_SUSPENSE
        ? "Payment suspense correction requires a linked source workflow, which is not yet available. No journal was reversed."
        : result.sourceOwnedBlocked === AccountingSourceType.CUSTOMER_SETTLEMENT
          ? "Customer settlement journals must be reversed through the customer settlement source command"
          : `${result.sourceOwnedBlocked ?? "Unattributed"} journals require a source-owned correction workflow. No journal was reversed.`,
    )
  }

  if ("denied" in result && result.denied) {
    assertSensitiveActionAllowed(result.denied)
  }

  return result.value
}
