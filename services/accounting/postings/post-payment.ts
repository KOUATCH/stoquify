import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  JournalType,
  LedgerPostingBatchStatus,
  PaymentMethod,
  PaymentStatus,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
  SalesOrderStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import {
  assertBalancedJournalEntry,
  type AccountingAmount,
} from "../invariants"
import { getOpenPeriodForDate } from "../periods.service"
import { createLedgerPostingBatch } from "../posting.service"
import { requireActivePostingRule } from "../posting-rules.service"
import {
  assertSourceTraceComplete,
  createAccountingSourceLink,
} from "../source-link.service"

export type PostPaymentInput = {
  paymentId: string
  actorId?: string | null
  postingDate?: Date | string | null
  currency?: string | null
  sourceVersion?: number | null
  idempotencyKey?: string | null
}

type ActivePostingRule = Awaited<ReturnType<typeof requireActivePostingRule>>
type ActivePostingRuleLine = ActivePostingRule["lines"][number]

type PaymentPostingAmounts = {
  sourceAmount: Prisma.Decimal
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

const paymentForPostingSelect = {
  id: true,
  organizationId: true,
  paymentNumber: true,
  amount: true,
  method: true,
  status: true,
  idempotencyKey: true,
  salesOrderId: true,
  processedAt: true,
  processedById: true,
  refundedAmount: true,
  cashTendered: true,
  changeGiven: true,
  cardType: true,
  cardLast4: true,
  authorizationCode: true,
  mobileMoneyProvider: true,
  mobileMoneyReference: true,
  mobileMoneyStatus: true,
  mobileMoneyFeesAmount: true,
  bankReference: true,
  bankName: true,
  chequeNumber: true,
  chequeBank: true,
  chequeDate: true,
  transactionId: true,
  createdAt: true,
  deletedAt: true,
  salesOrder: {
    select: {
      id: true,
      organizationId: true,
      orderNumber: true,
      status: true,
      orderDate: true,
      locationId: true,
      customerId: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.PaymentSelect

type PaymentForPosting = Prisma.PaymentGetPayload<{
  select: typeof paymentForPostingSelect
}>

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

function toAmount(value: AccountingAmount) {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(0)
  }

  return new Prisma.Decimal(value).toDecimalPlaces(2)
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

function normalizePostingDate(value: Date | string | null | undefined) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) {
    throw new BusinessRuleError("Payment posting date is invalid")
  }

  return date
}

async function nextPaymentEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
) {
  const prefix = "PY"
  const count = await tx.journalEntry.count({
    where: {
      organizationId,
      entryNumber: { startsWith: `${prefix}-${compactDate(entryDate)}` },
    },
  })

  return `${prefix}-${compactDate(entryDate)}-${String(count + 1).padStart(4, "0")}`
}

async function loadPaymentForPosting(
  organizationId: string,
  paymentId: string,
  tx: Prisma.TransactionClient,
) {
  const payment = await tx.payment.findFirst({
    where: {
      id: paymentId,
      organizationId,
      deletedAt: null,
    },
    select: paymentForPostingSelect,
  })

  if (!payment) throw new NotFoundError("Payment not found")
  if (!payment.salesOrder || !payment.salesOrderId) {
    throw new BusinessRuleError("Only POS sale payments can be posted through postPayment")
  }
  if (payment.salesOrder.organizationId !== organizationId || payment.salesOrder.deletedAt) {
    throw new BusinessRuleError("Payment source sale is not valid for this organization")
  }
  if (payment.salesOrder.status !== SalesOrderStatus.COMPLETED) {
    throw new BusinessRuleError("Only payments for completed POS sales can be posted")
  }
  if (payment.method === PaymentMethod.CREDIT) {
    throw new BusinessRuleError("On-account credit is posted by the sale module, not as a payment receipt")
  }
  if (payment.method === PaymentMethod.MIXED) {
    throw new BusinessRuleError("Split tenders must be posted as their individual payment rows")
  }
  if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.REFUNDED) {
    throw new BusinessRuleError("Only captured POS payment receipts can be posted to accounting")
  }

  const amount = toAmount(payment.amount)
  if (amount.lte(0)) {
    throw new BusinessRuleError("Payment amount must be greater than zero before accounting posting")
  }

  return payment
}

function buildPaymentPostingAmounts(payment: PaymentForPosting): PaymentPostingAmounts {
  return {
    sourceAmount: toAmount(payment.amount),
  }
}

function resolveAmountSource(
  line: ActivePostingRuleLine,
  amounts: PaymentPostingAmounts,
) {
  switch (line.amountSource) {
    case PostingRuleAmountSource.FIXED:
      return new Prisma.Decimal(1)
    case PostingRuleAmountSource.SOURCE_AMOUNT:
    case PostingRuleAmountSource.GROSS_AMOUNT:
    case PostingRuleAmountSource.NET_AMOUNT:
      return amounts.sourceAmount
    case PostingRuleAmountSource.TAX_AMOUNT:
    case PostingRuleAmountSource.COST_AMOUNT:
    case PostingRuleAmountSource.QUANTITY_COST:
    case PostingRuleAmountSource.VARIANCE_AMOUNT:
      throw new BusinessRuleError(`${line.amountSource} is not supported for payment receipt posting`)
    default:
      throw new BusinessRuleError(`Unsupported payment posting amount source ${line.amountSource}`)
  }
}

function conditionList(value: unknown, key: string) {
  if (value === undefined) return null
  if (typeof value === "string") return [value.trim().toUpperCase()]
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.map((item) => item.trim().toUpperCase())
  }

  throw new BusinessRuleError(`Payment posting rule condition ${key} must be a string or string array`)
}

function ruleLineAppliesToPayment(line: ActivePostingRuleLine, payment: PaymentForPosting) {
  if (!line.condition) return true
  if (typeof line.condition !== "object" || Array.isArray(line.condition)) {
    throw new BusinessRuleError("Payment posting rule conditions must be JSON objects")
  }

  const condition = line.condition as Record<string, unknown>
  const supportedKeys = new Set([
    "paymentMethod",
    "paymentMethods",
    "mobileMoneyProvider",
    "mobileMoneyProviders",
  ])
  const unsupportedKey = Object.keys(condition).find((key) => !supportedKeys.has(key))

  if (unsupportedKey) {
    throw new BusinessRuleError(`Payment posting rule condition ${unsupportedKey} is not supported`)
  }

  const paymentMethods = conditionList(
    condition.paymentMethods ?? condition.paymentMethod,
    "paymentMethods",
  )
  if (paymentMethods && !paymentMethods.includes(payment.method)) return false

  const mobileMoneyProviders = conditionList(
    condition.mobileMoneyProviders ?? condition.mobileMoneyProvider,
    "mobileMoneyProviders",
  )
  if (
    mobileMoneyProviders &&
    !mobileMoneyProviders.includes((payment.mobileMoneyProvider || "").trim().toUpperCase())
  ) {
    return false
  }

  return true
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
    throw new BusinessRuleError("Payment posting rule has no resolvable account lines")
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
      throw new BusinessRuleError(`Payment posting rule account ${reference} could not be resolved`)
    }
    if (account._count.children > 0) {
      throw new BusinessRuleError(`Payment posting account ${account.code} must be a leaf account`)
    }
    if (account.currency && normalizeCurrency(account.currency) !== currency) {
      throw new BusinessRuleError(`Payment posting account ${account.code} only accepts ${account.currency}`)
    }

    resolved.set(line.id, account)
  }

  return resolved
}

function buildJournalLines(
  payment: PaymentForPosting,
  rule: ActivePostingRule,
  accountsByRuleLine: Awaited<ReturnType<typeof resolveRuleLineAccounts>>,
  amounts: PaymentPostingAmounts,
  currency: string,
) {
  const lines: ResolvedJournalLine[] = []

  for (const ruleLine of rule.lines) {
    if (!ruleLineAppliesToPayment(ruleLine, payment)) continue

    const baseAmount = resolveAmountSource(ruleLine, amounts)
    const amount = baseAmount.mul(toMultiplier(ruleLine.multiplier)).toDecimalPlaces(2)

    if (amount.lt(0)) {
      throw new BusinessRuleError("Payment posting rule produced a negative line amount")
    }
    if (amount.eq(0)) continue

    const account = accountsByRuleLine.get(ruleLine.id)
    if (!account) {
      throw new BusinessRuleError(`Payment posting rule line ${ruleLine.lineNumber} has no resolved account`)
    }

    const isDebit = ruleLine.side === PostingRuleLineSide.DEBIT
    const debit = isDebit ? amount : new Prisma.Decimal(0)
    const credit = isDebit ? new Prisma.Decimal(0) : amount
    const sourceNumber = payment.paymentNumber

    lines.push({
      accountId: account.id,
      lineNumber: lines.length + 1,
      description:
        ruleLine.description?.trim() ||
        `Payment ${sourceNumber} ${payment.method} ${ruleLine.amountSource}`,
      debit,
      credit,
      currency,
      locationId: payment.salesOrder?.locationId,
      customerId: payment.salesOrder?.customerId,
      dimensions: ruleLine.dimensions ?? null,
      metadata: {
        sourceType: AccountingSourceType.POS_PAYMENT,
        sourceId: payment.id,
        sourceNumber,
        salesOrderId: payment.salesOrderId,
        salesOrderNumber: payment.salesOrder?.orderNumber || null,
        paymentMethod: payment.method,
        mobileMoneyProvider: payment.mobileMoneyProvider || null,
        postingRuleId: rule.id,
        postingRuleCode: rule.code,
        postingRuleLineId: ruleLine.id,
        amountSource: ruleLine.amountSource,
        mappingKey: ruleLine.mappingKey || account.mappingKey || null,
      },
    })
  }

  if (lines.length < 2) {
    throw new BusinessRuleError("Payment posting did not produce enough non-zero journal lines")
  }

  assertBalancedJournalEntry(lines)
  return lines
}

function journalTypeForPayment(method: PaymentMethod) {
  if (method === PaymentMethod.CASH) return JournalType.CASH
  if (method === PaymentMethod.STORE_CREDIT) return JournalType.GENERAL
  return JournalType.BANK
}

async function requirePaymentJournal(
  organizationId: string,
  payment: PaymentForPosting,
  tx: Prisma.TransactionClient,
) {
  const journalType = journalTypeForPayment(payment.method)
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

async function resolveExistingPaymentPosting(
  organizationId: string,
  postingBatchId: string,
  paymentId: string,
  tx: Prisma.TransactionClient,
) {
  return tx.journalEntry.findFirst({
    where: {
      organizationId,
      postingBatchId,
      sourceType: AccountingSourceType.POS_PAYMENT,
      sourceId: paymentId,
      postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
    },
    include: journalEntryInclude,
  })
}

function paymentSourceDate(payment: PaymentForPosting) {
  return payment.processedAt || payment.createdAt
}

function paymentPostingMetadata(
  payment: PaymentForPosting,
  sourceVersion: number,
  rule?: ActivePostingRule,
  amounts?: PaymentPostingAmounts,
) {
  return {
    sourceNumber: payment.paymentNumber,
    sourceDate: paymentSourceDate(payment).toISOString(),
    sourceVersion,
    salesOrderId: payment.salesOrderId,
    salesOrderNumber: payment.salesOrder?.orderNumber || null,
    paymentMethod: payment.method,
    paymentStatus: payment.status,
    amount: amounts?.sourceAmount.toFixed(2) ?? toAmount(payment.amount).toFixed(2),
    refundedAmount: toAmount(payment.refundedAmount).toFixed(2),
    cashTendered: payment.cashTendered ? toAmount(payment.cashTendered).toFixed(2) : null,
    changeGiven: payment.changeGiven ? toAmount(payment.changeGiven).toFixed(2) : null,
    cardType: payment.cardType || null,
    cardLast4: payment.cardLast4 || null,
    authorizationCode: payment.authorizationCode || null,
    mobileMoneyProvider: payment.mobileMoneyProvider || null,
    mobileMoneyReference: payment.mobileMoneyReference || null,
    mobileMoneyStatus: payment.mobileMoneyStatus || null,
    mobileMoneyFeesAmount: payment.mobileMoneyFeesAmount ? toAmount(payment.mobileMoneyFeesAmount).toFixed(2) : null,
    bankReference: payment.bankReference || null,
    bankName: payment.bankName || null,
    chequeNumber: payment.chequeNumber || null,
    chequeBank: payment.chequeBank || null,
    chequeDate: payment.chequeDate?.toISOString() || null,
    transactionId: payment.transactionId || null,
    postingRuleId: rule?.id || null,
    postingRuleCode: rule?.code || null,
  }
}

function paymentPostingAudit(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    payment: PaymentForPosting
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
      action: "POS_PAYMENT_POST",
      resourceType: "Payment",
      resourceId: params.payment.id,
      postingBatchId: params.postingBatchId,
      journalEntryId: params.journalEntryId,
      message: `POS payment ${params.payment.paymentNumber} posted to accounting as ${params.entryNumber}`,
      metadata: params.metadata,
    },
  })
}

async function postPaymentInTransaction(
  organizationId: string,
  input: PostPaymentInput,
  tx: Prisma.TransactionClient,
) {
  const payment = await loadPaymentForPosting(organizationId, input.paymentId, tx)
  const salesOrderId = payment.salesOrderId!

  await assertSourceTraceComplete(
    organizationId,
    {
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: salesOrderId,
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
    },
    tx,
  )

  const sourceVersion = input.sourceVersion ?? 1
  const batch = await createLedgerPostingBatch(
    {
      organizationId,
      sourceType: AccountingSourceType.POS_PAYMENT,
      sourceId: payment.id,
      postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
      sourceVersion,
      idempotencyKey: input.idempotencyKey,
      metadata: paymentPostingMetadata(payment, sourceVersion),
    },
    tx,
  )
  const existingEntry = await resolveExistingPaymentPosting(organizationId, batch.id, payment.id, tx)

  if (batch.status === LedgerPostingBatchStatus.POSTED) {
    if (!existingEntry || existingEntry.status !== JournalEntryStatus.POSTED) {
      throw new ConflictError("Payment posting batch is marked posted but no posted journal entry was found")
    }

    return existingEntry
  }

  if (batch.status === LedgerPostingBatchStatus.FAILED || batch.status === LedgerPostingBatchStatus.REVERSED) {
    throw new BusinessRuleError(`Payment posting batch ${batch.id} is ${batch.status.toLowerCase()}`)
  }

  if (existingEntry) {
    throw new ConflictError("Payment has an incomplete accounting posting attached to its posting batch")
  }

  const entryDate = normalizePostingDate(input.postingDate ?? paymentSourceDate(payment))
  const currency = normalizeCurrency(input.currency)
  const period = await getOpenPeriodForDate(organizationId, entryDate, tx)
  const rule = await requireActivePostingRule(
    organizationId,
    {
      sourceType: AccountingSourceType.POS_PAYMENT,
      postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
      effectiveAt: entryDate,
    },
    tx,
  )
  const amounts = buildPaymentPostingAmounts(payment)
  const accountsByRuleLine = await resolveRuleLineAccounts(organizationId, rule, currency, tx)
  const journalLines = buildJournalLines(payment, rule, accountsByRuleLine, amounts, currency)
  const journal = await requirePaymentJournal(organizationId, payment, tx)
  const now = new Date()
  const postingMetadata = paymentPostingMetadata(payment, sourceVersion, rule, amounts)
  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      periodId: period.id,
      status: LedgerPostingBatchStatus.POSTED,
      postedAt: now,
      errorMessage: null,
      metadata: postingMetadata,
    },
  })

  const entry = await tx.journalEntry.create({
    data: {
      organizationId,
      journalId: journal.id,
      periodId: period.id,
      postingBatchId: postedBatch.id,
      entryNumber: await nextPaymentEntryNumber(tx, organizationId, entryDate),
      entryDate,
      status: JournalEntryStatus.POSTED,
      currency,
      memo: `POS payment ${payment.paymentNumber}`,
      reference: payment.paymentNumber,
      sourceType: AccountingSourceType.POS_PAYMENT,
      sourceId: payment.id,
      postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
      postedAt: now,
      postedById: input.actorId || null,
      createdById: input.actorId || payment.processedById || null,
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
      sourceType: AccountingSourceType.POS_PAYMENT,
      sourceId: payment.id,
      sourceNumber: payment.paymentNumber,
      sourceDate: paymentSourceDate(payment),
      metadata: postingMetadata,
    },
    tx,
    {
      actorId: input.actorId,
      audit: true,
      verifyPostingBatch: false,
      verifyJournalEntry: false,
    },
  )

  await paymentPostingAudit(tx, {
    organizationId,
    actorId: input.actorId,
    payment,
    postingBatchId: postedBatch.id,
    journalEntryId: entry.id,
    entryNumber: entry.entryNumber,
    metadata: postingMetadata,
  })

  return entry
}

export async function postPayment(
  organizationId: string,
  input: PostPaymentInput,
  tx?: Prisma.TransactionClient,
) {
  if (tx) return postPaymentInTransaction(organizationId, input, tx)
  return db.$transaction((transaction) => postPaymentInTransaction(organizationId, input, transaction))
}
