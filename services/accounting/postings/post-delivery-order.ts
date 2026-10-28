import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  JournalType,
  LedgerPostingBatchStatus,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
  SalesOrderChannel,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { ensureDefaultDeliveryOrderPostingRule } from "@/services/accounting/default-posting-rules.service"
import { assertBalancedJournalEntry } from "@/services/accounting/invariants"
import { recordPostedJournalCloseInvalidationInTx } from "@/services/accounting/journal-close-invalidation.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { createLedgerPostingBatch } from "@/services/accounting/posting.service"
import { requireActivePostingRule } from "@/services/accounting/posting-rules.service"
import { createAccountingSourceLink } from "@/services/accounting/source-link.service"

type DeliveryPostingInput = {
  organizationId: string
  salesOrderId: string
  sourceId: string
  sourceNumber: string
  sourceType: AccountingSourceType
  postingPurpose: AccountingPostingPurpose
  actorId: string
  postingDate: Date
  grossAmount?: Prisma.Decimal.Value
  netAmount?: Prisma.Decimal.Value
  taxAmount?: Prisma.Decimal.Value
  costAmount?: Prisma.Decimal.Value
  idempotencyKey: string
}

export type PostDeliveryGoodsIssueAccountingInput = Omit<
  DeliveryPostingInput,
  "sourceType" | "postingPurpose" | "grossAmount" | "netAmount" | "taxAmount"
> & { costAmount: Prisma.Decimal.Value }

export type PostDeliveryInvoiceAccountingInput = Omit<
  DeliveryPostingInput,
  "sourceType" | "postingPurpose" | "costAmount"
> & {
  grossAmount: Prisma.Decimal.Value
  netAmount: Prisma.Decimal.Value
  taxAmount: Prisma.Decimal.Value
}

function money(value: Prisma.Decimal.Value | undefined) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(2)
}

function compactDate(value: Date) {
  return value.toISOString().slice(0, 10).replace(/-/g, "")
}

function entryPrefix(input: DeliveryPostingInput) {
  return input.postingPurpose === AccountingPostingPurpose.GOODS_ISSUE ? "GI" : "VT"
}

async function nextEntryNumber(tx: Prisma.TransactionClient, input: DeliveryPostingInput) {
  const prefix = `${entryPrefix(input)}-${compactDate(input.postingDate)}`
  const count = await tx.journalEntry.count({
    where: { organizationId: input.organizationId, entryNumber: { startsWith: prefix } },
  })
  return `${prefix}-${String(count + 1).padStart(4, "0")}`
}

function amountForSource(
  amountSource: PostingRuleAmountSource,
  input: DeliveryPostingInput,
) {
  switch (amountSource) {
    case PostingRuleAmountSource.GROSS_AMOUNT:
    case PostingRuleAmountSource.SOURCE_AMOUNT:
      return money(input.grossAmount)
    case PostingRuleAmountSource.NET_AMOUNT:
      return money(input.netAmount)
    case PostingRuleAmountSource.TAX_AMOUNT:
      return money(input.taxAmount)
    case PostingRuleAmountSource.COST_AMOUNT:
    case PostingRuleAmountSource.QUANTITY_COST:
      return money(input.costAmount)
    default:
      throw new BusinessRuleError(
        `Unsupported delivery posting amount source ${amountSource}`,
      )
  }
}

async function postDeliveryAccountingInTx(
  tx: Prisma.TransactionClient,
  input: DeliveryPostingInput,
) {
  const order = await tx.salesOrder.findFirst({
    where: {
      id: input.salesOrderId,
      organizationId: input.organizationId,
      channel: SalesOrderChannel.DELIVERY,
      deletedAt: null,
    },
    select: {
      id: true,
      customerId: true,
      locationId: true,
      orderNumber: true,
      organization: { select: { currency: true } },
    },
  })
  if (!order) throw new NotFoundError("Tenant-scoped delivery order not found")

  await ensureDefaultDeliveryOrderPostingRule(
    input.organizationId,
    { sourceType: input.sourceType, postingPurpose: input.postingPurpose },
    input.actorId,
    tx,
  )
  const period = await getOpenPeriodForDate(input.organizationId, input.postingDate, tx)
  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: period.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      sourceVersion: 1,
      idempotencyKey: input.idempotencyKey,
      metadata: {
        salesOrderId: order.id,
        orderNumber: order.orderNumber,
        sourceNumber: input.sourceNumber,
      },
    },
    tx,
  )

  const existingEntry = await tx.journalEntry.findFirst({
    where: {
      organizationId: input.organizationId,
      postingBatchId: batch.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
    },
  })
  if (batch.status === LedgerPostingBatchStatus.POSTED) {
    if (!existingEntry || existingEntry.status !== JournalEntryStatus.POSTED) {
      throw new ConflictError("Posted delivery batch has no posted journal entry")
    }
    return { postingBatch: batch, journalEntry: existingEntry, replayed: true }
  }
  if (batch.status !== LedgerPostingBatchStatus.PENDING || existingEntry) {
    throw new ConflictError("Delivery accounting source has an incomplete or closed posting")
  }

  const rule = await requireActivePostingRule(
    input.organizationId,
    {
      sourceType: input.sourceType,
      postingPurpose: input.postingPurpose,
      effectiveAt: input.postingDate,
    },
    tx,
  )
  const mappingKeys = Array.from(
    new Set(rule.lines.map((line) => line.mappingKey?.trim().toUpperCase()).filter(Boolean)),
  ) as string[]
  const accounts = await tx.chartOfAccount.findMany({
    where: {
      organizationId: input.organizationId,
      deletedAt: null,
      isActive: true,
      mappingKey: { in: mappingKeys },
    },
    include: { _count: { select: { children: true } } },
  })
  const accountsByMapping = new Map(
    accounts.map((account) => [account.mappingKey?.trim().toUpperCase(), account]),
  )
  const currency = (order.organization.currency || "XAF").trim().toUpperCase()
  const journalLines = rule.lines.flatMap((ruleLine) => {
    if (ruleLine.condition) {
      throw new BusinessRuleError("Conditional delivery posting rules are not supported")
    }
    const mappingKey = ruleLine.mappingKey?.trim().toUpperCase()
    const account = mappingKey ? accountsByMapping.get(mappingKey) : null
    if (!account || account._count.children > 0) {
      throw new BusinessRuleError(`Delivery posting account ${mappingKey ?? ruleLine.id} is unavailable`)
    }
    const amount = amountForSource(ruleLine.amountSource, input)
      .mul(new Prisma.Decimal(ruleLine.multiplier ?? 1))
      .toDecimalPlaces(2)
    if (amount.lt(0)) throw new BusinessRuleError("Delivery posting amount cannot be negative")
    if (amount.eq(0)) return []
    const debit = ruleLine.side === PostingRuleLineSide.DEBIT ? amount : new Prisma.Decimal(0)
    const credit = ruleLine.side === PostingRuleLineSide.CREDIT ? amount : new Prisma.Decimal(0)
    return [{
      accountId: account.id,
      lineNumber: 0,
      description: ruleLine.description || `${input.sourceNumber} ${ruleLine.amountSource}`,
      debit,
      credit,
      currency,
      locationId: order.locationId,
      customerId: order.customerId,
      metadata: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        salesOrderId: order.id,
        postingRuleId: rule.id,
        postingRuleLineId: ruleLine.id,
      },
    }]
  }).map((line, index) => ({ ...line, lineNumber: index + 1 }))

  if (journalLines.length < 2) {
    throw new BusinessRuleError("Delivery posting did not produce a balanced journal")
  }
  assertBalancedJournalEntry(journalLines)

  const journal = await tx.journal.findFirst({
    where: { organizationId: input.organizationId, type: JournalType.SALES, isActive: true },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  })
  if (!journal) throw new NotFoundError("Active sales journal not found")
  const now = new Date()
  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: { status: LedgerPostingBatchStatus.POSTED, periodId: period.id, postedAt: now },
  })
  const journalEntry = await tx.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      journalId: journal.id,
      periodId: period.id,
      postingBatchId: postedBatch.id,
      entryNumber: await nextEntryNumber(tx, input),
      entryDate: input.postingDate,
      status: JournalEntryStatus.POSTED,
      currency,
      memo:
        input.postingPurpose === AccountingPostingPurpose.GOODS_ISSUE
          ? `Delivery goods issue ${input.sourceNumber}`
          : `Delivery invoice ${input.sourceNumber}`,
      reference: input.sourceNumber,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      postedAt: now,
      postedById: input.actorId,
      createdById: input.actorId,
      lines: {
        create: journalLines.map((line) => ({
          organizationId: input.organizationId,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: line.currency,
          exchangeRate: new Prisma.Decimal(1),
          baseDebit: line.debit,
          baseCredit: line.credit,
          locationId: line.locationId,
          customerId: line.customerId,
          metadata: line.metadata,
        })),
      },
    },
  })

  await createAccountingSourceLink(
    {
      organizationId: input.organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceNumber: input.sourceNumber,
      sourceDate: input.postingDate,
      metadata: { salesOrderId: order.id, orderNumber: order.orderNumber },
    },
    tx,
    { actorId: input.actorId, audit: true, verifyPostingBatch: false, verifyJournalEntry: false },
  )
  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action:
        input.postingPurpose === AccountingPostingPurpose.GOODS_ISSUE
          ? "DELIVERY_GOODS_ISSUE_POST"
          : "DELIVERY_INVOICE_POST",
      resourceType: "SalesOrder",
      resourceId: order.id,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      message: `${input.sourceNumber} posted through the governed delivery accounting boundary`,
      metadata: { sourceType: input.sourceType, sourceId: input.sourceId },
    },
  })
  await recordPostedJournalCloseInvalidationInTx(
    tx,
    input.organizationId,
    {
      journalEntryId: journalEntry.id,
      periodId: period.id,
      entryDate: input.postingDate,
      correlationId: postedBatch.id,
      staleReason: "Delivery order posting changed certified close evidence.",
    },
    { actorId: input.actorId, now },
  )

  return { postingBatch: postedBatch, journalEntry, replayed: false }
}

export function postDeliveryGoodsIssueAccounting(
  input: PostDeliveryGoodsIssueAccountingInput,
  tx: Prisma.TransactionClient,
) {
  return postDeliveryAccountingInTx(tx, {
    ...input,
    sourceType: AccountingSourceType.DELIVERY_GOODS_ISSUE,
    postingPurpose: AccountingPostingPurpose.GOODS_ISSUE,
  })
}

export function postDeliveryInvoiceAccounting(
  input: PostDeliveryInvoiceAccountingInput,
  tx: Prisma.TransactionClient,
) {
  return postDeliveryAccountingInTx(tx, {
    ...input,
    sourceType: AccountingSourceType.DELIVERY_INVOICE,
    postingPurpose: AccountingPostingPurpose.SALES_INVOICE,
  })
}

export function postDeliveryAccounting(
  input: DeliveryPostingInput,
) {
  return db.$transaction((tx) => postDeliveryAccountingInTx(tx, input))
}
