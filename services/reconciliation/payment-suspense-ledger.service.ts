import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  JournalType,
  LedgerPostingBatchStatus,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
  SuspenseStatus,
} from "@prisma/client"

import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { assertBalancedJournalEntry } from "@/services/accounting/invariants"
import { createLedgerPostingBatch } from "@/services/accounting/posting.service"
import { requireActivePostingRule } from "@/services/accounting/posting-rules.service"
import { createAccountingSourceLink } from "@/services/accounting/source-link.service"

export type PostPaymentSuspenseToLedgerInput = {
  organizationId: string
  suspenseItemId: string
  suspenseLedgerAccountId: string
  periodId: string
  postingDate: Date
  actorId: string
  correlationId: string
}

type TruthScope =
  | { suspenseItemId: string; reconciliationRunId?: never }
  | { suspenseItemId?: never; reconciliationRunId: string }

const journalInclude = {
  postingBatch: true,
  sourceLinks: true,
  lines: {
    include: {
      account: {
        select: {
          id: true,
          code: true,
          mappingKey: true,
        },
      },
    },
    orderBy: { lineNumber: "asc" },
  },
} satisfies Prisma.JournalEntryInclude

type SuspenseJournal = Prisma.JournalEntryGetPayload<{
  include: typeof journalInclude
}>

function currency(value?: string | null) {
  return (value || "XAF").trim().toUpperCase()
}

function mappingKey(value?: string | null) {
  return value?.trim().toUpperCase() || null
}

function json(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject
}

function compactDate(value: Date) {
  return value.toISOString().slice(0, 10).replace(/-/g, "")
}

function stringList(value: unknown, key: string) {
  if (value === undefined) return null
  if (typeof value === "string") return [value.trim().toUpperCase()]
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.map((item) => item.trim().toUpperCase())
  }
  throw new BusinessRuleError(`Suspense posting rule condition ${key} must be a string or string array`)
}

function conditionMatches(
  condition: Prisma.JsonValue | null,
  context: {
    direction: string
    suspenseType: string
    providerCode: string | null
    paymentRailId: string | null
  },
) {
  if (!condition) return true
  if (typeof condition !== "object" || Array.isArray(condition)) {
    throw new BusinessRuleError("Suspense posting rule conditions must be JSON objects")
  }
  const record = condition as Record<string, unknown>
  const supported = new Set([
    "direction",
    "directions",
    "suspenseType",
    "suspenseTypes",
    "providerCode",
    "providerCodes",
    "paymentRailId",
    "paymentRailIds",
  ])
  const unsupported = Object.keys(record).find((key) => !supported.has(key))
  if (unsupported) {
    throw new BusinessRuleError(`Suspense posting rule condition ${unsupported} is not supported`)
  }

  const directions = stringList(record.directions ?? record.direction, "directions")
  const types = stringList(record.suspenseTypes ?? record.suspenseType, "suspenseTypes")
  const providers = stringList(record.providerCodes ?? record.providerCode, "providerCodes")
  const rails = stringList(record.paymentRailIds ?? record.paymentRailId, "paymentRailIds")

  return (
    (!directions || directions.includes(context.direction.toUpperCase())) &&
    (!types || types.includes(context.suspenseType.toUpperCase())) &&
    (!providers || providers.includes((context.providerCode || "").toUpperCase())) &&
    (!rails || rails.includes((context.paymentRailId || "").toUpperCase()))
  )
}

function lineAmount(
  amountSource: PostingRuleAmountSource,
  multiplier: Prisma.Decimal,
  sourceAmount: Prisma.Decimal,
) {
  if (
    amountSource !== PostingRuleAmountSource.SOURCE_AMOUNT &&
    amountSource !== PostingRuleAmountSource.GROSS_AMOUNT &&
    amountSource !== PostingRuleAmountSource.NET_AMOUNT
  ) {
    throw new BusinessRuleError(
      `Suspense posting rule amount source ${amountSource} is unsupported`,
    )
  }
  if (multiplier.lte(0)) {
    throw new BusinessRuleError("Suspense posting rule multipliers must be greater than zero")
  }
  return sourceAmount.mul(multiplier).toDecimalPlaces(2)
}

async function nextEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
) {
  const stem = `SP-${compactDate(entryDate)}`
  const count = await tx.journalEntry.count({
    where: { organizationId, entryNumber: { startsWith: stem } },
  })
  return `${stem}-${String(count + 1).padStart(4, "0")}`
}

async function requireJournal(
  tx: Prisma.TransactionClient,
  organizationId: string,
) {
  const journal = await tx.journal.findFirst({
    where: {
      organizationId,
      isActive: true,
      type: { in: [JournalType.ADJUSTMENT, JournalType.GENERAL] },
    },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  })
  if (!journal) {
    throw new NotFoundError("An active adjustment or general journal is required for suspense posting")
  }
  return journal
}

async function resolveAccounts(
  tx: Prisma.TransactionClient,
  organizationId: string,
  rule: Awaited<ReturnType<typeof requireActivePostingRule>>,
  currencyCode: string,
) {
  const ids = Array.from(new Set(rule.lines.map((line) => line.accountId).filter(Boolean))) as string[]
  const keys = Array.from(
    new Set(rule.lines.map((line) => mappingKey(line.mappingKey)).filter(Boolean)),
  ) as string[]
  const filters: Prisma.ChartOfAccountWhereInput[] = []
  if (ids.length) filters.push({ id: { in: ids } })
  if (keys.length) filters.push({ mappingKey: { in: keys } })
  if (!filters.length) throw new BusinessRuleError("Suspense posting rule has no account references")

  const accounts = await tx.chartOfAccount.findMany({
    where: {
      organizationId,
      deletedAt: null,
      isActive: true,
      OR: filters,
    },
    include: { _count: { select: { children: true } } },
  })
  const byId = new Map(accounts.map((account) => [account.id, account]))
  const byKey = new Map(
    accounts
      .map((account) => [mappingKey(account.mappingKey), account] as const)
      .filter(([key]) => Boolean(key)),
  )
  const resolved = new Map<string, (typeof accounts)[number]>()

  for (const line of rule.lines) {
    const account = line.accountId
      ? byId.get(line.accountId)
      : byKey.get(mappingKey(line.mappingKey))
    if (!account) {
      throw new BusinessRuleError(
        `Suspense posting account ${line.accountId || line.mappingKey || line.lineNumber} could not be resolved`,
      )
    }
    if (account._count.children > 0) {
      throw new BusinessRuleError(`Suspense posting account ${account.code} must be a leaf account`)
    }
    if (account.currency && currency(account.currency) !== currencyCode) {
      throw new BusinessRuleError(`Suspense posting account ${account.code} only accepts ${account.currency}`)
    }
    resolved.set(line.id, account)
  }
  return resolved
}

function assertJournalTruth(
  input: {
    organizationId: string
    suspenseItemId: string
    suspenseLedgerAccountId: string
    ledgerPostingBatchId: string
    amount: Prisma.Decimal
    currencyCode: string
  },
  journal: SuspenseJournal,
) {
  const batch = journal.postingBatch
  if (
    journal.organizationId !== input.organizationId ||
    journal.status !== JournalEntryStatus.POSTED ||
    journal.postingBatchId !== input.ledgerPostingBatchId ||
    journal.sourceType !== AccountingSourceType.PAYMENT_SUSPENSE ||
    journal.sourceId !== input.suspenseItemId ||
    journal.postingPurpose !== AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION ||
    !batch ||
    batch.status !== LedgerPostingBatchStatus.POSTED ||
    batch.sourceType !== AccountingSourceType.PAYMENT_SUSPENSE ||
    batch.sourceId !== input.suspenseItemId ||
    batch.postingPurpose !== AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION
  ) {
    throw new BusinessRuleError("Payment suspense journal or posting batch is not valid posted-ledger evidence")
  }
  if (currency(journal.currency) !== input.currencyCode) {
    throw new BusinessRuleError("Payment suspense journal currency does not match the suspense item")
  }

  assertBalancedJournalEntry(journal.lines)
  const suspenseLines = journal.lines.filter(
    (line) => line.accountId === input.suspenseLedgerAccountId,
  )
  if (suspenseLines.length !== 1) {
    throw new BusinessRuleError("Payment suspense journal must contain exactly one configured suspense-account line")
  }
  const suspenseAmount = Prisma.Decimal.max(
    suspenseLines[0].debit,
    suspenseLines[0].credit,
  ).toDecimalPlaces(2)
  if (!suspenseAmount.eq(input.amount) || currency(suspenseLines[0].currency) !== input.currencyCode) {
    throw new BusinessRuleError("Payment suspense ledger line does not match the operational amount and currency")
  }

  const links = journal.sourceLinks.filter(
    (link) =>
      link.organizationId === input.organizationId &&
      link.postingBatchId === input.ledgerPostingBatchId &&
      link.journalEntryId === journal.id &&
      link.sourceType === AccountingSourceType.PAYMENT_SUSPENSE &&
      link.sourceId === input.suspenseItemId,
  )
  if (links.length !== 1) {
    throw new BusinessRuleError("Payment suspense posting must have exactly one accounting source link")
  }
  return suspenseAmount
}

export async function assertPaymentSuspenseLedgerTruthInTx(
  tx: Prisma.TransactionClient,
  input: { organizationId: string } & TruthScope,
) {
  const items = await tx.suspenseItem.findMany({
    where: {
      organizationId: input.organizationId,
      status: SuspenseStatus.POSTED_TO_SUSPENSE,
      ...("suspenseItemId" in input
        ? { id: input.suspenseItemId }
        : { reconciliationRunId: input.reconciliationRunId }),
    },
    select: {
      id: true,
      organizationId: true,
      amount: true,
      currencyCode: true,
      suspenseLedgerAccountId: true,
      ledgerPostingBatchId: true,
      ledgerPostingBatch: {
        include: {
          journalEntries: { include: journalInclude },
        },
      },
    },
  })
  if ("suspenseItemId" in input && items.length !== 1) {
    throw new BusinessRuleError("Posted payment suspense item was not found for ledger verification")
  }

  const operationalTotals = new Map<string, Prisma.Decimal>()
  const ledgerTotals = new Map<string, Prisma.Decimal>()
  for (const item of items) {
    const batch = item.ledgerPostingBatch
    if (!item.suspenseLedgerAccountId || !item.ledgerPostingBatchId || !batch) {
      throw new BusinessRuleError("Posted payment suspense item is missing ledger evidence")
    }
    if (batch.journalEntries.length !== 1) {
      throw new BusinessRuleError("Payment suspense posting must have exactly one journal entry")
    }
    const itemAmount = new Prisma.Decimal(item.amount).toDecimalPlaces(2)
    const key = `${item.suspenseLedgerAccountId}:${currency(item.currencyCode)}`
    const ledgerAmount = assertJournalTruth(
      {
        organizationId: item.organizationId,
        suspenseItemId: item.id,
        suspenseLedgerAccountId: item.suspenseLedgerAccountId,
        ledgerPostingBatchId: item.ledgerPostingBatchId,
        amount: itemAmount,
        currencyCode: currency(item.currencyCode),
      },
      batch.journalEntries[0],
    )
    operationalTotals.set(key, (operationalTotals.get(key) || new Prisma.Decimal(0)).plus(itemAmount))
    ledgerTotals.set(key, (ledgerTotals.get(key) || new Prisma.Decimal(0)).plus(ledgerAmount))
  }
  for (const [key, amount] of operationalTotals) {
    if (!(ledgerTotals.get(key) || new Prisma.Decimal(0)).eq(amount)) {
      throw new BusinessRuleError(`Payment suspense operational and ledger totals do not reconcile for ${key}`)
    }
  }
  return {
    itemCount: items.length,
    totals: Array.from(operationalTotals, ([key, amount]) => ({ key, amount: amount.toFixed(2) })),
  }
}

export async function postPaymentSuspenseToLedger(
  input: PostPaymentSuspenseToLedgerInput,
  tx: Prisma.TransactionClient,
) {
  const suspense = await tx.suspenseItem.findFirst({
    where: { id: input.suspenseItemId, organizationId: input.organizationId },
    include: {
      providerAccount: {
        select: {
          providerCode: true,
          paymentRailId: true,
          suspenseLedgerAccountId: true,
        },
      },
    },
  })
  if (!suspense) throw new NotFoundError("Payment suspense item not found")
  if (
    suspense.status !== SuspenseStatus.RESOLUTION_PROPOSED &&
    suspense.status !== SuspenseStatus.POSTED_TO_SUSPENSE
  ) {
    throw new BusinessRuleError("Payment suspense item is not ready for ledger posting")
  }
  const configuredAccount =
    suspense.suspenseLedgerAccountId || suspense.providerAccount?.suspenseLedgerAccountId
  if (!configuredAccount || configuredAccount !== input.suspenseLedgerAccountId) {
    throw new BusinessRuleError("Payment suspense ledger account changed before posting")
  }

  const sourceAmount = new Prisma.Decimal(suspense.amount).toDecimalPlaces(2)
  const currencyCode = currency(suspense.currencyCode)
  if (sourceAmount.lte(0)) throw new BusinessRuleError("Payment suspense amount must be positive")

  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
      sourceId: suspense.id,
      postingPurpose: AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION,
      sourceVersion: 1,
      idempotencyKey: `payment-suspense:${suspense.id}:reclassification:v1`,
      metadata: json({
        suspenseLedgerAccountId: input.suspenseLedgerAccountId,
        amount: sourceAmount.toFixed(2),
        currencyCode,
        correlationId: input.correlationId,
      }),
    },
    tx,
  )

  if (batch.status === LedgerPostingBatchStatus.POSTED) {
    await assertPaymentSuspenseLedgerTruthInTx(tx, {
      organizationId: input.organizationId,
      suspenseItemId: suspense.id,
    })
    const existing = await tx.journalEntry.findFirst({
      where: {
        organizationId: input.organizationId,
        postingBatchId: batch.id,
        status: JournalEntryStatus.POSTED,
      },
      include: journalInclude,
    })
    if (!existing) throw new ConflictError("Posted suspense batch has no posted journal")
    return { ledgerBatch: batch, journalEntry: existing, replayed: true }
  }
  if (batch.status !== LedgerPostingBatchStatus.PENDING) {
    throw new BusinessRuleError(`Payment suspense posting batch is ${batch.status.toLowerCase()}`)
  }
  const incomplete = await tx.journalEntry.findFirst({
    where: { organizationId: input.organizationId, postingBatchId: batch.id },
    select: { id: true },
  })
  if (incomplete) throw new ConflictError("Payment suspense has an incomplete journal posting")

  const rule = await requireActivePostingRule(
    input.organizationId,
    {
      sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
      postingPurpose: AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION,
      effectiveAt: input.postingDate,
    },
    tx,
  )
  const accounts = await resolveAccounts(tx, input.organizationId, rule, currencyCode)
  const lines = rule.lines
    .filter((line) =>
      conditionMatches(line.condition, {
        direction: suspense.direction,
        suspenseType: suspense.type,
        providerCode: suspense.providerAccount?.providerCode || null,
        paymentRailId: suspense.providerAccount?.paymentRailId || null,
      }),
    )
    .map((line) => {
      const account = accounts.get(line.id)
      if (!account) throw new BusinessRuleError(`Suspense rule line ${line.lineNumber} has no account`)
      const amount = lineAmount(line.amountSource, line.multiplier, sourceAmount)
      const debit = line.side === PostingRuleLineSide.DEBIT ? amount : new Prisma.Decimal(0)
      const credit = line.side === PostingRuleLineSide.CREDIT ? amount : new Prisma.Decimal(0)
      return {
        organizationId: input.organizationId,
        accountId: account.id,
        lineNumber: line.lineNumber,
        description: line.description?.trim() || `Payment suspense ${suspense.id}`,
        debit,
        credit,
        currency: currencyCode,
        exchangeRate: new Prisma.Decimal(1),
        baseDebit: debit,
        baseCredit: credit,
        dimensions: line.dimensions ?? undefined,
        metadata: json({
          postingRuleId: rule.id,
          postingRuleCode: rule.code,
          postingRuleLineId: line.id,
          mappingKey: line.mappingKey || account.mappingKey || null,
          suspenseItemId: suspense.id,
          correlationId: input.correlationId,
        }),
      }
    })
  if (lines.length < 2) throw new BusinessRuleError("Suspense posting rule produced fewer than two lines")
  assertBalancedJournalEntry(lines)
  const suspenseLines = lines.filter((line) => line.accountId === input.suspenseLedgerAccountId)
  if (
    suspenseLines.length !== 1 ||
    !Prisma.Decimal.max(suspenseLines[0].debit, suspenseLines[0].credit).eq(sourceAmount)
  ) {
    throw new BusinessRuleError(
      "Suspense posting rule must produce one full-amount line on the configured suspense account",
    )
  }

  const journal = await requireJournal(tx, input.organizationId)
  const now = new Date()
  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      status: LedgerPostingBatchStatus.POSTED,
      postedAt: now,
      errorMessage: null,
      metadata: json({
        suspenseLedgerAccountId: input.suspenseLedgerAccountId,
        amount: sourceAmount.toFixed(2),
        currencyCode,
        postingRuleId: rule.id,
        postingRuleCode: rule.code,
        correlationId: input.correlationId,
      }),
    },
  })
  const entry = await tx.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      journalId: journal.id,
      periodId: input.periodId,
      postingBatchId: postedBatch.id,
      entryNumber: await nextEntryNumber(tx, input.organizationId, input.postingDate),
      entryDate: input.postingDate,
      status: JournalEntryStatus.POSTED,
      currency: currencyCode,
      memo: `Payment suspense reclassification ${suspense.id}`,
      reference: suspense.id,
      sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
      sourceId: suspense.id,
      postingPurpose: AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION,
      postedAt: now,
      postedById: input.actorId,
      createdById: input.actorId,
      lines: { create: lines },
    },
    include: journalInclude,
  })
  const sourceLink = await createAccountingSourceLink(
    {
      organizationId: input.organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: entry.id,
      sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
      sourceId: suspense.id,
      sourceNumber: suspense.id,
      sourceDate: input.postingDate,
      metadata: json({
        suspenseLedgerAccountId: input.suspenseLedgerAccountId,
        amount: sourceAmount.toFixed(2),
        currencyCode,
        postingRuleId: rule.id,
        correlationId: input.correlationId,
      }),
    },
    tx,
    { actorId: input.actorId, audit: true, verifyPostingBatch: false, verifyJournalEntry: false },
  )
  assertJournalTruth(
    {
      organizationId: input.organizationId,
      suspenseItemId: suspense.id,
      suspenseLedgerAccountId: input.suspenseLedgerAccountId,
      ledgerPostingBatchId: postedBatch.id,
      amount: sourceAmount,
      currencyCode,
    },
    { ...entry, postingBatch: postedBatch, sourceLinks: [sourceLink] },
  )
  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "PAYMENT_SUSPENSE_LEDGER_POST",
      resourceType: "SuspenseItem",
      resourceId: suspense.id,
      postingBatchId: postedBatch.id,
      journalEntryId: entry.id,
      message: `Payment suspense item ${suspense.id} posted to ledger`,
      metadata: json({
        suspenseLedgerAccountId: input.suspenseLedgerAccountId,
        amount: sourceAmount.toFixed(2),
        currencyCode,
        postingRuleId: rule.id,
        correlationId: input.correlationId,
      }),
    },
  })
  return { ledgerBatch: postedBatch, journalEntry: entry, replayed: false }
}
