import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  JournalType,
  LedgerPostingBatchStatus,
  PaymentMethod,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client"

import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import {
  assertBalancedJournalEntry,
  type AccountingAmount,
} from "../invariants"
import { getOpenPeriodForDate } from "../periods.service"
import { createLedgerPostingBatch } from "../posting.service"
import { requireActivePostingRule } from "../posting-rules.service"
import { createAccountingSourceLink } from "../source-link.service"

export type POSReversalPostingInput = {
  actorId?: string | null
  postingDate?: Date | string | null
  currency?: string | null
  sourceVersion?: number | null
  idempotencyKey?: string | null
}

type ActivePostingRule = Awaited<ReturnType<typeof requireActivePostingRule>>
type ActivePostingRuleLine = ActivePostingRule["lines"][number]

export type POSReversalPostingAmounts = {
  sourceAmount: Prisma.Decimal
  netAmount: Prisma.Decimal
  taxAmount: Prisma.Decimal
  costAmount: Prisma.Decimal
  paymentMethodAmounts: Partial<Record<PaymentMethod, Prisma.Decimal>>
}

export type POSReversalPostingSource = {
  sourceId: string
  sourceNumber: string
  sourceDate: Date
  salesOrderId: string
  salesOrderNumber: string
  locationId?: string | null
  customerId?: string | null
  createdById?: string | null
  amounts: POSReversalPostingAmounts
  metadata?: Prisma.InputJsonValue
}

export type POSReversalPostingConfig = {
  sourceType: AccountingSourceType
  postingPurpose: AccountingPostingPurpose
  entryPrefix: string
  journalType: JournalType
  memoPrefix: string
  auditAction: string
  auditResourceType: string
}

type ResolvedJournalLine = {
  accountId: string
  lineNumber: number
  description: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  currency: string
  locationId?: string | null
  customerId?: string | null
  dimensions?: Prisma.InputJsonValue | null
  metadata?: Prisma.InputJsonValue | null
}

const journalEntryInclude = {
  journal: true,
  period: true,
  postingBatch: true,
  sourceLinks: true,
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

function normalizeCurrency(currency?: string | null) {
  return (currency || "XAF").trim().toUpperCase()
}

function normalizeMappingKey(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

function toMultiplier(value: AccountingAmount) {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(1)
  }

  return new Prisma.Decimal(value).toDecimalPlaces(4)
}

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

function normalizePostingDate(value: Date | string | null | undefined, fallback: Date, label: string) {
  const date = value ? new Date(value) : fallback
  if (Number.isNaN(date.getTime())) {
    throw new BusinessRuleError(`${label} posting date is invalid`)
  }

  return date
}

async function nextEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
  prefix: string,
) {
  const count = await tx.journalEntry.count({
    where: {
      organizationId,
      entryNumber: { startsWith: `${prefix}-${compactDate(entryDate)}` },
    },
  })

  return `${prefix}-${compactDate(entryDate)}-${String(count + 1).padStart(4, "0")}`
}

function conditionList(value: unknown, key: string) {
  if (value === undefined) return null
  if (typeof value === "string") return [value.trim().toUpperCase()]
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.map((item) => item.trim().toUpperCase())
  }

  throw new BusinessRuleError(`POS reversal posting rule condition ${key} must be a string or string array`)
}

function paymentMethodsForRuleLine(line: ActivePostingRuleLine) {
  if (!line.condition) return null
  if (typeof line.condition !== "object" || Array.isArray(line.condition)) {
    throw new BusinessRuleError("POS reversal posting rule conditions must be JSON objects")
  }

  const condition = line.condition as Record<string, unknown>
  const supportedKeys = new Set(["paymentMethod", "paymentMethods"])
  const unsupportedKey = Object.keys(condition).find((key) => !supportedKeys.has(key))

  if (unsupportedKey) {
    throw new BusinessRuleError(`POS reversal posting rule condition ${unsupportedKey} is not supported`)
  }

  return conditionList(condition.paymentMethods ?? condition.paymentMethod, "paymentMethods")
}

function sumPaymentMethodAmounts(
  paymentMethods: string[] | null,
  amounts: POSReversalPostingAmounts,
) {
  if (!paymentMethods) return amounts.sourceAmount

  return paymentMethods.reduce((total, method) => {
    const paymentMethod = method as PaymentMethod
    return total.plus(amounts.paymentMethodAmounts[paymentMethod] || new Prisma.Decimal(0))
  }, new Prisma.Decimal(0)).toDecimalPlaces(2)
}

function resolveAmountSource(
  line: ActivePostingRuleLine,
  amounts: POSReversalPostingAmounts,
) {
  const paymentMethods = paymentMethodsForRuleLine(line)

  switch (line.amountSource) {
    case PostingRuleAmountSource.FIXED:
      return new Prisma.Decimal(1)
    case PostingRuleAmountSource.SOURCE_AMOUNT:
    case PostingRuleAmountSource.GROSS_AMOUNT:
      return sumPaymentMethodAmounts(paymentMethods, amounts)
    case PostingRuleAmountSource.NET_AMOUNT:
      return amounts.netAmount
    case PostingRuleAmountSource.TAX_AMOUNT:
      return amounts.taxAmount
    case PostingRuleAmountSource.COST_AMOUNT:
    case PostingRuleAmountSource.QUANTITY_COST:
      return amounts.costAmount
    case PostingRuleAmountSource.VARIANCE_AMOUNT:
      throw new BusinessRuleError("Variance amount is not supported for POS reversal posting")
    default:
      throw new BusinessRuleError(`Unsupported POS reversal amount source ${line.amountSource}`)
  }
}

async function resolveRuleLineAccounts(
  organizationId: string,
  rule: ActivePostingRule,
  currency: string,
  tx: Prisma.TransactionClient,
) {
  const accountIds = Array.from(new Set(rule.lines.map((line) => line.accountId).filter(Boolean))) as string[]
  const mappingKeys = Array.from(
    new Set(rule.lines.map((line) => normalizeMappingKey(line.mappingKey)).filter(Boolean)),
  ) as string[]
  const accountFilters: Prisma.ChartOfAccountWhereInput[] = []

  if (accountIds.length > 0) accountFilters.push({ id: { in: accountIds } })
  if (mappingKeys.length > 0) accountFilters.push({ mappingKey: { in: mappingKeys } })
  if (accountFilters.length === 0) {
    throw new BusinessRuleError("POS reversal posting rule has no resolvable account lines")
  }

  const accounts = await tx.chartOfAccount.findMany({
    where: {
      organizationId,
      deletedAt: null,
      isActive: true,
      OR: accountFilters,
    },
    include: { _count: { select: { children: true } } },
  })
  const byId = new Map(accounts.map((account) => [account.id, account]))
  const byMappingKey = new Map(
    accounts
      .map((account) => [normalizeMappingKey(account.mappingKey), account] as const)
      .filter(([mappingKey]) => Boolean(mappingKey)),
  )
  const resolved = new Map<string, (typeof accounts)[number]>()

  for (const line of rule.lines) {
    const account = line.accountId
      ? byId.get(line.accountId)
      : byMappingKey.get(normalizeMappingKey(line.mappingKey))

    if (!account) {
      const reference = line.accountId || line.mappingKey || `line ${line.lineNumber}`
      throw new BusinessRuleError(`POS reversal posting rule account ${reference} could not be resolved`)
    }
    if (account._count.children > 0) {
      throw new BusinessRuleError(`POS reversal posting account ${account.code} must be a leaf account`)
    }
    if (account.currency && normalizeCurrency(account.currency) !== currency) {
      throw new BusinessRuleError(`POS reversal posting account ${account.code} only accepts ${account.currency}`)
    }

    resolved.set(line.id, account)
  }

  return resolved
}

function buildJournalLines(
  source: POSReversalPostingSource,
  config: POSReversalPostingConfig,
  rule: ActivePostingRule,
  accountsByRuleLine: Awaited<ReturnType<typeof resolveRuleLineAccounts>>,
  currency: string,
) {
  const lines: ResolvedJournalLine[] = []

  for (const ruleLine of rule.lines) {
    const baseAmount = resolveAmountSource(ruleLine, source.amounts)
    const amount = baseAmount.mul(toMultiplier(ruleLine.multiplier)).toDecimalPlaces(2)

    if (amount.lt(0)) {
      throw new BusinessRuleError("POS reversal posting rule produced a negative line amount")
    }
    if (amount.eq(0)) continue

    const account = accountsByRuleLine.get(ruleLine.id)
    if (!account) {
      throw new BusinessRuleError(`POS reversal posting rule line ${ruleLine.lineNumber} has no resolved account`)
    }

    const isDebit = ruleLine.side === PostingRuleLineSide.DEBIT
    const debit = isDebit ? amount : new Prisma.Decimal(0)
    const credit = isDebit ? new Prisma.Decimal(0) : amount

    lines.push({
      accountId: account.id,
      lineNumber: lines.length + 1,
      description:
        ruleLine.description?.trim() ||
        `${config.memoPrefix} ${source.sourceNumber} ${ruleLine.amountSource}`,
      debit,
      credit,
      currency,
      locationId: source.locationId || null,
      customerId: source.customerId || null,
      dimensions: ruleLine.dimensions ?? null,
      metadata: {
        sourceType: config.sourceType,
        sourceId: source.sourceId,
        sourceNumber: source.sourceNumber,
        salesOrderId: source.salesOrderId,
        salesOrderNumber: source.salesOrderNumber,
        postingRuleId: rule.id,
        postingRuleCode: rule.code,
        postingRuleLineId: ruleLine.id,
        amountSource: ruleLine.amountSource,
        mappingKey: ruleLine.mappingKey || account.mappingKey || null,
      },
    })
  }

  if (lines.length < 2) {
    throw new BusinessRuleError("POS reversal posting did not produce enough non-zero journal lines")
  }

  assertBalancedJournalEntry(lines)
  return lines
}

async function requirePostingJournal(
  organizationId: string,
  journalType: JournalType,
  tx: Prisma.TransactionClient,
) {
  const journal = await tx.journal.findFirst({
    where: {
      organizationId,
      type: journalType,
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  })

  if (!journal) throw new NotFoundError(`Active ${journalType.toLowerCase()} journal not found`)
  return journal
}

async function resolveExistingPosting(
  organizationId: string,
  postingBatchId: string,
  source: POSReversalPostingSource,
  config: POSReversalPostingConfig,
  tx: Prisma.TransactionClient,
) {
  return tx.journalEntry.findFirst({
    where: {
      organizationId,
      postingBatchId,
      sourceType: config.sourceType,
      sourceId: source.sourceId,
      postingPurpose: config.postingPurpose,
    },
    include: journalEntryInclude,
  })
}

function postingMetadata(
  source: POSReversalPostingSource,
  sourceVersion: number,
  rule?: ActivePostingRule,
) {
  return {
    sourceNumber: source.sourceNumber,
    sourceDate: source.sourceDate.toISOString(),
    sourceVersion,
    salesOrderId: source.salesOrderId,
    salesOrderNumber: source.salesOrderNumber,
    sourceAmount: source.amounts.sourceAmount.toFixed(2),
    netAmount: source.amounts.netAmount.toFixed(2),
    taxAmount: source.amounts.taxAmount.toFixed(2),
    costAmount: source.amounts.costAmount.toFixed(2),
    paymentMethodAmounts: Object.fromEntries(
      Object.entries(source.amounts.paymentMethodAmounts)
        .filter(([, amount]) => amount && amount.gt(0))
        .map(([method, amount]) => [method, amount?.toFixed(2)]),
    ),
    postingRuleId: rule?.id || null,
    postingRuleCode: rule?.code || null,
    source: source.metadata || null,
  }
}

function reversalPostingAudit(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    source: POSReversalPostingSource
    config: POSReversalPostingConfig
    postingBatchId: string
    journalEntryId: string
    entryNumber: string
    metadata: Prisma.InputJsonValue
  },
) {
  return tx.ledgerAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.config.auditAction,
      resourceType: params.config.auditResourceType,
      resourceId: params.source.sourceId,
      postingBatchId: params.postingBatchId,
      journalEntryId: params.journalEntryId,
      message: `${params.config.memoPrefix} ${params.source.sourceNumber} posted to accounting as ${params.entryNumber}`,
      metadata: params.metadata,
    },
  })
}

export async function postPOSReversalInTransaction(
  organizationId: string,
  input: POSReversalPostingInput,
  source: POSReversalPostingSource,
  config: POSReversalPostingConfig,
  tx: Prisma.TransactionClient,
) {
  const sourceVersion = input.sourceVersion ?? 1
  const initialMetadata = postingMetadata(source, sourceVersion)
  const batch = await createLedgerPostingBatch(
    {
      organizationId,
      sourceType: config.sourceType,
      sourceId: source.sourceId,
      postingPurpose: config.postingPurpose,
      sourceVersion,
      idempotencyKey: input.idempotencyKey,
      metadata: initialMetadata,
    },
    tx,
  )
  const existingEntry = await resolveExistingPosting(organizationId, batch.id, source, config, tx)

  if (batch.status === LedgerPostingBatchStatus.POSTED) {
    if (!existingEntry || existingEntry.status !== JournalEntryStatus.POSTED) {
      throw new ConflictError("POS reversal posting batch is marked posted but no posted journal entry was found")
    }

    return existingEntry
  }

  if (batch.status === LedgerPostingBatchStatus.FAILED || batch.status === LedgerPostingBatchStatus.REVERSED) {
    throw new BusinessRuleError(`POS reversal posting batch ${batch.id} is ${batch.status.toLowerCase()}`)
  }

  if (existingEntry) {
    throw new ConflictError("POS reversal has an incomplete accounting posting attached to its posting batch")
  }

  const entryDate = normalizePostingDate(input.postingDate, source.sourceDate, config.memoPrefix)
  const currency = normalizeCurrency(input.currency)
  const period = await getOpenPeriodForDate(organizationId, entryDate, tx)
  const rule = await requireActivePostingRule(
    organizationId,
    {
      sourceType: config.sourceType,
      postingPurpose: config.postingPurpose,
      effectiveAt: entryDate,
    },
    tx,
  )
  const accountsByRuleLine = await resolveRuleLineAccounts(organizationId, rule, currency, tx)
  const journalLines = buildJournalLines(source, config, rule, accountsByRuleLine, currency)
  const journal = await requirePostingJournal(organizationId, config.journalType, tx)
  const now = new Date()
  const finalMetadata = postingMetadata(source, sourceVersion, rule)
  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      periodId: period.id,
      status: LedgerPostingBatchStatus.POSTED,
      postedAt: now,
      errorMessage: null,
      metadata: finalMetadata,
    },
  })

  const entry = await tx.journalEntry.create({
    data: {
      organizationId,
      journalId: journal.id,
      periodId: period.id,
      postingBatchId: postedBatch.id,
      entryNumber: await nextEntryNumber(tx, organizationId, entryDate, config.entryPrefix),
      entryDate,
      status: JournalEntryStatus.POSTED,
      currency,
      memo: `${config.memoPrefix} ${source.sourceNumber}`,
      reference: source.sourceNumber,
      sourceType: config.sourceType,
      sourceId: source.sourceId,
      postingPurpose: config.postingPurpose,
      postedAt: now,
      postedById: input.actorId || null,
      createdById: input.actorId || source.createdById || null,
      lines: {
        create: journalLines.map((line) => ({
          organizationId,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: line.currency,
          exchangeRate: new Prisma.Decimal(1),
          baseDebit: line.debit,
          baseCredit: line.credit,
          locationId: line.locationId || null,
          customerId: line.customerId || null,
          dimensions: line.dimensions ?? undefined,
          metadata: line.metadata ?? undefined,
        })),
      },
    },
    include: journalEntryInclude,
  })

  await createAccountingSourceLink(
    {
      organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: entry.id,
      sourceType: config.sourceType,
      sourceId: source.sourceId,
      sourceNumber: source.sourceNumber,
      sourceDate: source.sourceDate,
      metadata: finalMetadata,
    },
    tx,
    {
      actorId: input.actorId,
      audit: true,
      verifyPostingBatch: false,
      verifyJournalEntry: false,
    },
  )

  await reversalPostingAudit(tx, {
    organizationId,
    actorId: input.actorId,
    source,
    config,
    postingBatchId: postedBatch.id,
    journalEntryId: entry.id,
    entryNumber: entry.entryNumber,
    metadata: finalMetadata,
  })

  return entry
}
