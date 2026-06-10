import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  JournalType,
  LedgerPostingBatchStatus,
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
import { createAccountingSourceLink } from "../source-link.service"

export type PostSaleInput = {
  salesOrderId: string
  actorId?: string | null
  postingDate?: Date | string | null
  currency?: string | null
  costAmount?: AccountingAmount
  sourceVersion?: number | null
  idempotencyKey?: string | null
}

type ActivePostingRule = Awaited<ReturnType<typeof requireActivePostingRule>>
type ActivePostingRuleLine = ActivePostingRule["lines"][number]

type SalePostingAmounts = {
  grossAmount: Prisma.Decimal
  netAmount: Prisma.Decimal
  taxAmount: Prisma.Decimal
  costAmount: Prisma.Decimal
  costAmountAvailable: boolean
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

const saleForPostingSelect = {
  id: true,
  organizationId: true,
  orderNumber: true,
  status: true,
  orderDate: true,
  total: true,
  taxAmount: true,
  subtotal: true,
  discount: true,
  locationId: true,
  customerId: true,
  createdById: true,
  lines: {
    select: {
      id: true,
      itemId: true,
      quantity: true,
      lineTotal: true,
      taxAmount: true,
      item: {
        select: {
          id: true,
          costPrice: true,
          trackInventory: true,
          inventoryLevels: {
            select: {
              locationId: true,
              averageCost: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SalesOrderSelect

type SaleForPosting = Prisma.SalesOrderGetPayload<{
  select: typeof saleForPostingSelect
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
    throw new BusinessRuleError("Sale posting date is invalid")
  }

  return date
}

async function nextSaleEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
) {
  const prefix = "VT"
  const count = await tx.journalEntry.count({
    where: {
      organizationId,
      entryNumber: { startsWith: `${prefix}-${compactDate(entryDate)}` },
    },
  })

  return `${prefix}-${compactDate(entryDate)}-${String(count + 1).padStart(4, "0")}`
}

async function loadSaleForPosting(
  organizationId: string,
  salesOrderId: string,
  tx: Prisma.TransactionClient,
) {
  const sale = await tx.salesOrder.findFirst({
    where: {
      id: salesOrderId,
      organizationId,
      deletedAt: null,
    },
    select: saleForPostingSelect,
  })

  if (!sale) throw new NotFoundError("Sales order not found")
  if (sale.status !== SalesOrderStatus.COMPLETED) {
    throw new BusinessRuleError("Only completed POS sales can be posted to accounting")
  }
  if (sale.lines.length === 0) {
    throw new BusinessRuleError("Sales order has no lines to post")
  }

  return sale
}

function deriveCostAmount(
  sale: SaleForPosting,
  explicitCostAmount: AccountingAmount,
) {
  if (explicitCostAmount !== null && explicitCostAmount !== undefined && explicitCostAmount !== "") {
    return {
      amount: toAmount(explicitCostAmount),
      available: true,
    }
  }

  let amount = new Prisma.Decimal(0)
  let available = false

  for (const line of sale.lines) {
    if (!line.item) continue

    const inventoryLevel = line.item.inventoryLevels.find((level) => level.locationId === sale.locationId)
    const costBasis = inventoryLevel?.averageCost ?? line.item.costPrice

    if (costBasis !== null && costBasis !== undefined) {
      available = true
      amount = amount.plus(new Prisma.Decimal(costBasis).mul(new Prisma.Decimal(line.quantity)))
    }
  }

  return {
    amount: amount.toDecimalPlaces(2),
    available,
  }
}

function buildSalePostingAmounts(
  sale: SaleForPosting,
  explicitCostAmount: AccountingAmount,
): SalePostingAmounts {
  const grossAmount = toAmount(sale.total)
  const taxAmount = toAmount(sale.taxAmount)
  const netAmount = grossAmount.minus(taxAmount).toDecimalPlaces(2)
  const costAmount = deriveCostAmount(sale, explicitCostAmount)

  if (grossAmount.lte(0)) {
    throw new BusinessRuleError("Sale total must be greater than zero before accounting posting")
  }
  if (taxAmount.lt(0)) {
    throw new BusinessRuleError("Sale tax amount cannot be negative")
  }
  if (netAmount.lt(0)) {
    throw new BusinessRuleError("Sale tax amount cannot exceed the sale total")
  }
  if (costAmount.amount.lt(0)) {
    throw new BusinessRuleError("Sale cost amount cannot be negative")
  }

  return {
    grossAmount,
    netAmount,
    taxAmount,
    costAmount: costAmount.amount,
    costAmountAvailable: costAmount.available,
  }
}

function resolveAmountSource(
  line: ActivePostingRuleLine,
  amounts: SalePostingAmounts,
) {
  switch (line.amountSource) {
    case PostingRuleAmountSource.FIXED:
      return new Prisma.Decimal(1)
    case PostingRuleAmountSource.SOURCE_AMOUNT:
    case PostingRuleAmountSource.GROSS_AMOUNT:
      return amounts.grossAmount
    case PostingRuleAmountSource.NET_AMOUNT:
      return amounts.netAmount
    case PostingRuleAmountSource.TAX_AMOUNT:
      return amounts.taxAmount
    case PostingRuleAmountSource.COST_AMOUNT:
    case PostingRuleAmountSource.QUANTITY_COST:
      if (!amounts.costAmountAvailable) {
        throw new BusinessRuleError("Sale posting rule requires a cost amount, but no cost basis is available")
      }
      return amounts.costAmount
    case PostingRuleAmountSource.VARIANCE_AMOUNT:
      throw new BusinessRuleError("Variance amount is not supported for sale completion posting")
    default:
      throw new BusinessRuleError(`Unsupported sale posting amount source ${line.amountSource}`)
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
    throw new BusinessRuleError("Sale posting rule has no resolvable account lines")
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
      throw new BusinessRuleError(`Sale posting rule account ${reference} could not be resolved`)
    }
    if (account._count.children > 0) {
      throw new BusinessRuleError(`Sale posting account ${account.code} must be a leaf account`)
    }
    if (account.currency && normalizeCurrency(account.currency) !== currency) {
      throw new BusinessRuleError(`Sale posting account ${account.code} only accepts ${account.currency}`)
    }

    resolved.set(line.id, account)
  }

  return resolved
}

function buildJournalLines(
  sale: SaleForPosting,
  rule: ActivePostingRule,
  accountsByRuleLine: Awaited<ReturnType<typeof resolveRuleLineAccounts>>,
  amounts: SalePostingAmounts,
  currency: string,
) {
  const lines: ResolvedJournalLine[] = []

  for (const ruleLine of rule.lines) {
    if (ruleLine.condition) {
      throw new BusinessRuleError("Conditional sale posting rule lines are not supported yet")
    }

    const baseAmount = resolveAmountSource(ruleLine, amounts)
    const amount = baseAmount.mul(toMultiplier(ruleLine.multiplier)).toDecimalPlaces(2)

    if (amount.lt(0)) {
      throw new BusinessRuleError("Sale posting rule produced a negative line amount")
    }
    if (amount.eq(0)) continue

    const account = accountsByRuleLine.get(ruleLine.id)
    if (!account) {
      throw new BusinessRuleError(`Sale posting rule line ${ruleLine.lineNumber} has no resolved account`)
    }

    const isDebit = ruleLine.side === PostingRuleLineSide.DEBIT
    const debit = isDebit ? amount : new Prisma.Decimal(0)
    const credit = isDebit ? new Prisma.Decimal(0) : amount

    lines.push({
      accountId: account.id,
      lineNumber: lines.length + 1,
      description: ruleLine.description?.trim() || `Sale ${sale.orderNumber} ${ruleLine.amountSource}`,
      debit,
      credit,
      currency,
      locationId: sale.locationId,
      customerId: sale.customerId,
      dimensions: ruleLine.dimensions ?? null,
      metadata: {
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: sale.id,
        sourceNumber: sale.orderNumber,
        postingRuleId: rule.id,
        postingRuleCode: rule.code,
        postingRuleLineId: ruleLine.id,
        amountSource: ruleLine.amountSource,
        mappingKey: ruleLine.mappingKey || account.mappingKey || null,
      },
    })
  }

  if (lines.length < 2) {
    throw new BusinessRuleError("Sale posting did not produce enough non-zero journal lines")
  }

  assertBalancedJournalEntry(lines)
  return lines
}

async function requireSalesJournal(organizationId: string, tx: Prisma.TransactionClient) {
  const journal = await tx.journal.findFirst({
    where: {
      organizationId,
      type: JournalType.SALES,
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  })

  if (!journal) throw new NotFoundError("Active sales journal not found")
  return journal
}

async function resolveExistingSalePosting(
  organizationId: string,
  postingBatchId: string,
  salesOrderId: string,
  tx: Prisma.TransactionClient,
) {
  return tx.journalEntry.findFirst({
    where: {
      organizationId,
      postingBatchId,
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: salesOrderId,
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
    },
    include: journalEntryInclude,
  })
}

function salePostingAudit(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    sale: SaleForPosting
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
      action: "POS_SALE_POST",
      resourceType: "SalesOrder",
      resourceId: params.sale.id,
      postingBatchId: params.postingBatchId,
      journalEntryId: params.journalEntryId,
      message: `POS sale ${params.sale.orderNumber} posted to accounting as ${params.entryNumber}`,
      metadata: params.metadata,
    },
  })
}

async function postSaleInTransaction(
  organizationId: string,
  input: PostSaleInput,
  tx: Prisma.TransactionClient,
) {
  const sale = await loadSaleForPosting(organizationId, input.salesOrderId, tx)
  const sourceVersion = input.sourceVersion ?? 1
  const sourceMetadata = {
    sourceNumber: sale.orderNumber,
    sourceDate: sale.orderDate.toISOString(),
    sourceVersion,
  }
  const batch = await createLedgerPostingBatch(
    {
      organizationId,
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: sale.id,
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      sourceVersion,
      idempotencyKey: input.idempotencyKey,
      metadata: sourceMetadata,
    },
    tx,
  )
  const existingEntry = await resolveExistingSalePosting(organizationId, batch.id, sale.id, tx)

  if (batch.status === LedgerPostingBatchStatus.POSTED) {
    if (!existingEntry || existingEntry.status !== JournalEntryStatus.POSTED) {
      throw new ConflictError("Sale posting batch is marked posted but no posted journal entry was found")
    }

    return existingEntry
  }

  if (batch.status === LedgerPostingBatchStatus.FAILED || batch.status === LedgerPostingBatchStatus.REVERSED) {
    throw new BusinessRuleError(`Sale posting batch ${batch.id} is ${batch.status.toLowerCase()}`)
  }

  if (existingEntry) {
    throw new ConflictError("Sale has an incomplete accounting posting attached to its posting batch")
  }

  const entryDate = normalizePostingDate(input.postingDate ?? sale.orderDate)
  const currency = normalizeCurrency(input.currency)
  const period = await getOpenPeriodForDate(organizationId, entryDate, tx)
  const rule = await requireActivePostingRule(
    organizationId,
    {
      sourceType: AccountingSourceType.POS_SALE,
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      effectiveAt: entryDate,
    },
    tx,
  )
  const amounts = buildSalePostingAmounts(sale, input.costAmount)
  const accountsByRuleLine = await resolveRuleLineAccounts(organizationId, rule, currency, tx)
  const journalLines = buildJournalLines(sale, rule, accountsByRuleLine, amounts, currency)
  const journal = await requireSalesJournal(organizationId, tx)
  const now = new Date()
  const postingMetadata = {
    ...sourceMetadata,
    grossAmount: amounts.grossAmount.toFixed(2),
    netAmount: amounts.netAmount.toFixed(2),
    taxAmount: amounts.taxAmount.toFixed(2),
    costAmount: amounts.costAmount.toFixed(2),
    postingRuleId: rule.id,
    postingRuleCode: rule.code,
  }

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
      entryNumber: await nextSaleEntryNumber(tx, organizationId, entryDate),
      entryDate,
      status: JournalEntryStatus.POSTED,
      currency,
      memo: `POS sale ${sale.orderNumber}`,
      reference: sale.orderNumber,
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: sale.id,
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      postedAt: now,
      postedById: input.actorId || null,
      createdById: input.actorId || sale.createdById || null,
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
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: sale.id,
      sourceNumber: sale.orderNumber,
      sourceDate: sale.orderDate,
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

  await salePostingAudit(tx, {
    organizationId,
    actorId: input.actorId,
    sale,
    postingBatchId: postedBatch.id,
    journalEntryId: entry.id,
    entryNumber: entry.entryNumber,
    metadata: postingMetadata,
  })

  return entry
}

export async function postSale(
  organizationId: string,
  input: PostSaleInput,
  tx?: Prisma.TransactionClient,
) {
  if (tx) return postSaleInTransaction(organizationId, input, tx)
  return db.$transaction((transaction) => postSaleInTransaction(organizationId, input, transaction))
}
