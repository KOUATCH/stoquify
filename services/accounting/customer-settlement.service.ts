import { createHash } from "crypto"

import {
  AccountingPostingPurpose,
  AccountingSourceType,
  CustomerSettlementStatus,
  JournalEntryStatus,
  JournalType,
  LedgerEntryType,
  LedgerPostingBatchStatus,
  PaymentMethod,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
  hashBusinessPayload,
} from "@/services/events/business-event.service"

import {
  collectCustomerSettlementInputSchema,
  type CollectCustomerSettlementInput,
  type ParsedCollectCustomerSettlementInput,
} from "./customer-settlement.schemas"
import { createCustomerLedgerEntry } from "./customer-ledger.service"
import {
  CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
  ensurePostedCustomerReceivableDocumentInTx,
} from "./customer-receivable-document.service"
import {
  recordCustomerReceivableSettlementAppliedInTx,
} from "./customer-receivable-lifecycle.service"

import { recordPostedJournalCloseInvalidationInTx } from "./journal-close-invalidation.service"
import { getOpenPeriodForDate } from "./periods.service"
import { createLedgerPostingBatch } from "./posting.service"
import { requireActivePostingRule } from "./posting-rules.service"
import { createAccountingSourceLink } from "./source-link.service"

export const CUSTOMER_SETTLEMENT_SOURCE_VERSION = 1
export const CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS = 3

export type CustomerSettlementControlContext = {
  organizationId: string
  actorId: string
  actorPermissions: readonly string[]
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
}

type CustomerSettlementClient = typeof db

type NormalizedAllocation = {
  salesOrderId: string
  amount: Prisma.Decimal
}

type NormalizedCommand = {
  parsed: ParsedCollectCustomerSettlementInput
  amount: Prisma.Decimal
  settlementDate: Date
  allocations: NormalizedAllocation[]
  idempotencyPayloadHash: string
}

type PersistedSettlement = Prisma.CustomerSettlementGetPayload<{
  include: { allocations: true }
}>

type SettlementPostingResult = {
  postingBatchId: string
  journalEntryId: string
  sourceLinkId: string
  postingRuleId: string
  postingRuleCode: string
}

type ReplayLedgerEntryEvidence = {
  id: string
  referenceType: string | null
  referenceId: string | null
  debit: Prisma.Decimal
  credit: Prisma.Decimal
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(`${label} is required`)
  return normalized
}

function normalizeDate(value: Date | string, label: string) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new BusinessRuleError(`${label} is invalid`)
  }
  return date
}

function normalizeNow(value: CustomerSettlementControlContext["now"]) {
  if (value === null || value === undefined) return new Date()
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new BusinessRuleError("Control clock is invalid")
  return date
}

function money(value: Prisma.Decimal.Value, label: string) {
  let decimal: Prisma.Decimal
  try {
    decimal = new Prisma.Decimal(value)
  } catch {
    throw new BusinessRuleError(`${label} is invalid`)
  }

  const normalized = decimal.toDecimalPlaces(2)
  if (!decimal.eq(normalized)) {
    throw new BusinessRuleError(`${label} cannot contain more than two decimal places`)
  }
  return normalized
}

function normalizeCurrency(value: string | null | undefined) {
  const currency = value?.trim().toUpperCase()
  if (!currency || currency.length !== 3) {
    throw new BusinessRuleError("Organization currency is invalid")
  }
  return currency
}

function normalizeMappingKey(value: string | null | undefined) {
  return value?.trim().toUpperCase() || null
}

function json(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function conditionMatches(
  condition: Prisma.JsonValue | null | undefined,
  context: Record<string, unknown>,
) {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
    return true
  }

  return Object.entries(condition as Record<string, unknown>).every(
    ([key, expected]) => {
      const actual = context[key]
      if (Array.isArray(expected)) return expected.includes(actual)
      return actual === expected
    },
  )
}

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

function settlementNumber(
  organizationId: string,
  idempotencyKey: string,
  settlementDate: Date,
) {
  const suffix = createHash("sha256")
    .update(`${organizationId}:${idempotencyKey}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase()
  return `CSET-${compactDate(settlementDate)}-${suffix}`
}

function isPrismaCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  )
}

function normalizeCommand(
  input: CollectCustomerSettlementInput,
  organizationId: string,
): NormalizedCommand {
  const parsed = collectCustomerSettlementInputSchema.parse(input)
  const amount = money(parsed.amount, "Settlement amount")
  if (amount.lte(0)) {
    throw new BusinessRuleError("Settlement amount must be greater than zero")
  }

  const settlementDate = normalizeDate(parsed.settlementDate, "Settlement date")
  const allocations = parsed.allocations
    .map((allocation) => ({
      salesOrderId: requiredText(allocation.salesOrderId, "Sales order"),
      amount: money(allocation.amount, "Allocation amount"),
    }))
    .sort((left, right) => left.salesOrderId.localeCompare(right.salesOrderId))

  if (allocations.some((allocation) => allocation.amount.lte(0))) {
    throw new BusinessRuleError("Settlement allocations must be greater than zero")
  }

  const allocationIds = allocations.map((allocation) => allocation.salesOrderId)
  if (allocationIds.length !== new Set(allocationIds).size) {
    throw new BusinessRuleError("Settlement cannot contain duplicate sales-order allocations")
  }

  const allocatedTotal = allocations
    .reduce(
      (total, allocation) => total.plus(allocation.amount),
      new Prisma.Decimal(0),
    )
    .toDecimalPlaces(2)
  if (!allocatedTotal.eq(amount)) {
    throw new BusinessRuleError(
      "Settlement allocations must exactly equal the settlement amount",
    )
  }

  const idempotencyPayloadHash = hashBusinessPayload({
    operation: "collectCustomerSettlement",
    sourceVersion: CUSTOMER_SETTLEMENT_SOURCE_VERSION,
    organizationId,
    customerId: parsed.customerId,
    method: parsed.method,
    amount: amount.toFixed(2),
    settlementDate: settlementDate.toISOString(),
    correlationId: parsed.correlationId,
    externalReference: parsed.externalReference ?? null,
    documentHash: parsed.documentHash.toLowerCase(),
    evidenceHash: parsed.evidenceHash.toLowerCase(),
    allocations: allocations.map((allocation) => ({
      salesOrderId: allocation.salesOrderId,
      amount: allocation.amount.toFixed(2),
    })),
  })

  return {
    parsed,
    amount,
    settlementDate,
    allocations,
    idempotencyPayloadHash,
  }
}

function assertReplayMatches(
  existing: PersistedSettlement,
  command: NormalizedCommand,
) {
  if (existing.idempotencyPayloadHash !== command.idempotencyPayloadHash) {
    throw new ConflictError(
      "Customer settlement idempotency key was reused with a different payload",
    )
  }
  if (existing.status !== CustomerSettlementStatus.POSTED) {
    throw new ConflictError("Customer settlement replay is not in posted state")
  }
  if (
    !existing.ledgerPostingBatchId ||
    !existing.journalEntryId ||
    !existing.postedBusinessEventId
  ) {
    throw new ConflictError("Customer settlement replay evidence is incomplete")
  }

  const storedAllocations = existing.allocations
    .map(
      (allocation) =>
        `${allocation.salesOrderId}:${money(allocation.amount, "Stored allocation amount").toFixed(2)}`,
    )
    .sort()
  const requestedAllocations = command.allocations.map(
    (allocation) => `${allocation.salesOrderId}:${allocation.amount.toFixed(2)}`,
  )
  if (storedAllocations.join("|") !== requestedAllocations.join("|")) {
    throw new ConflictError("Customer settlement replay allocations do not match")
  }

  ledgerEntryIdsForSettlement(existing)
}

function ledgerEntryIdsForSettlement(settlement: PersistedSettlement) {
  const ledgerEntryIds: string[] = []
  for (const allocation of settlement.allocations) {
    if (!allocation.customerLedgerEntryId) {
      throw new ConflictError(
        "Customer settlement replay allocation ledger evidence is incomplete",
      )
    }
    ledgerEntryIds.push(allocation.customerLedgerEntryId)
  }
  if (new Set(ledgerEntryIds).size !== ledgerEntryIds.length) {
    throw new ConflictError(
      "Customer settlement replay allocation ledger evidence is duplicated",
    )
  }
  return ledgerEntryIds
}

function assertReplayLedgerEvidence(
  settlement: PersistedSettlement,
  ledgerEntries: ReplayLedgerEntryEvidence[],
) {
  const ledgerEntryIds = ledgerEntryIdsForSettlement(settlement)
  if (ledgerEntries.length !== ledgerEntryIds.length) {
    throw new ConflictError("Customer settlement replay ledger evidence is incomplete")
  }

  const ledgerEntriesById = new Map(
    ledgerEntries.map((entry) => [entry.id, entry]),
  )
  for (const allocation of settlement.allocations) {
    const entry = ledgerEntriesById.get(allocation.customerLedgerEntryId)
    if (
      !entry ||
      !allocation.customerReceivableDocumentId ||
      entry.referenceType !== CUSTOMER_RECEIVABLE_REFERENCE_TYPE ||
      entry.referenceId !== allocation.customerReceivableDocumentId ||
      !entry.debit.eq(0) ||
      !entry.credit.eq(allocation.amount)
    ) {
      throw new ConflictError(
        "Customer settlement replay allocation ledger evidence does not match",
      )
    }
  }
}

function resultFor(
  settlement: PersistedSettlement,
  sourceLinkId: string | null,
  replayed: boolean,
) {
  return {
    settlement,
    settlementId: settlement.id,
    allocationIds: settlement.allocations.map((allocation) => allocation.id),
    customerLedgerEntryIds: ledgerEntryIdsForSettlement(settlement),
    postingBatchId: settlement.ledgerPostingBatchId!,
    journalEntryId: settlement.journalEntryId!,
    sourceLinkId,
    businessEventId: settlement.postedBusinessEventId!,
    replayed,
  }
}

async function nextSettlementJournalEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  settlementNumberValue: string,
) {
  const entryNumber = `ARSET-${settlementNumberValue}`
  const existing = await tx.journalEntry.findFirst({
    where: { organizationId, entryNumber },
    select: { id: true },
  })
  if (existing) {
    throw new ConflictError("Customer settlement journal number already exists")
  }
  return entryNumber
}

async function postCustomerSettlementInTx(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    customerId: string
    actorId: string
    settlementId: string
    settlementNumber: string
    settlementDate: Date
    amount: Prisma.Decimal
    method: PaymentMethod
    currency: string
    documentHash: string
    idempotencyPayloadHash: string
  },
): Promise<SettlementPostingResult> {
  const period = await getOpenPeriodForDate(
    input.organizationId,
    input.settlementDate,
    tx,
  )
  const rule = await requireActivePostingRule(
    input.organizationId,
    {
      sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
      postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
      effectiveAt: input.settlementDate,
    },
    tx,
  )
  const journalType =
    input.method === PaymentMethod.CASH ? JournalType.CASH : JournalType.BANK
  const journal = await tx.journal.findFirst({
    where: {
      organizationId: input.organizationId,
      type: journalType,
      isDefault: true,
      isActive: true,
    },
    select: { id: true },
  })
  if (!journal) {
    throw new BusinessRuleError(
      `Customer settlement requires an active default ${journalType} journal`,
    )
  }

  const mappingKeys = rule.lines
    .map((line) => normalizeMappingKey(line.mappingKey))
    .filter((mappingKey): mappingKey is string => Boolean(mappingKey))
  const directAccountIds = rule.lines
    .map((line) => line.accountId)
    .filter((accountId): accountId is string => Boolean(accountId))
  const resolvedAccounts = mappingKeys.length || directAccountIds.length
    ? await tx.chartOfAccount.findMany({
        where: {
          organizationId: input.organizationId,
          deletedAt: null,
          isActive: true,
          OR: [
            ...(directAccountIds.length
              ? [{ id: { in: Array.from(new Set(directAccountIds)) } }]
              : []),
            ...(mappingKeys.length
              ? [{ mappingKey: { in: Array.from(new Set(mappingKeys)) } }]
              : []),
          ],
        },
        include: { _count: { select: { children: true } } },
      })
    : []
  const accountByMapping = new Map(
    resolvedAccounts.map((account) => [
      normalizeMappingKey(account.mappingKey),
      account,
    ]),
  )
  const accountById = new Map(
    resolvedAccounts.map((account) => [account.id, account]),
  )

  const postingLines = rule.lines
    .filter((line) =>
      conditionMatches(line.condition, { paymentMethod: input.method }),
    )
    .map((line) => {
      if (line.amountSource !== PostingRuleAmountSource.SOURCE_AMOUNT) {
        throw new BusinessRuleError(
          `Customer settlement posting rule ${rule.code} line ${line.lineNumber} must use SOURCE_AMOUNT`,
        )
      }
      const mappingKey = normalizeMappingKey(line.mappingKey)
      const account =
        (line.accountId ? accountById.get(line.accountId) : undefined) ??
        accountByMapping.get(mappingKey)
      if (!account) {
        throw new BusinessRuleError(
          `Customer settlement posting rule ${rule.code} line ${line.lineNumber} does not resolve to an account`,
        )
      }
      if (!account.isActive || account.deletedAt || account._count.children > 0) {
        throw new BusinessRuleError(
          `Customer settlement posting account ${account.code} is not an active leaf account`,
        )
      }

      const multiplier = new Prisma.Decimal(line.multiplier ?? 1)
      const amount = input.amount.times(multiplier).toDecimalPlaces(2)
      if (amount.lte(0)) {
        throw new BusinessRuleError(
          `Customer settlement posting rule ${rule.code} produced a non-positive amount`,
        )
      }
      return {
        accountId: account.id,
        lineNumber: line.lineNumber,
        description:
          line.description ?? `Customer settlement ${input.settlementNumber}`,
        debit:
          line.side === PostingRuleLineSide.DEBIT
            ? amount
            : new Prisma.Decimal(0),
        credit:
          line.side === PostingRuleLineSide.CREDIT
            ? amount
            : new Prisma.Decimal(0),
        side: line.side,
        mappingKey,
      }
    })

  const expectedRailMappingByMethod: Partial<Record<PaymentMethod, string>> = {
    [PaymentMethod.CASH]: "CASH_ON_HAND",
    [PaymentMethod.CARD]: "CARD_CLEARING",
    [PaymentMethod.MOBILE_MONEY]: "MOBILE_MONEY_CLEARING",
    [PaymentMethod.BANK_TRANSFER]: "BANK",
    [PaymentMethod.CHEQUE]: "CHEQUE_CLEARING",
  }
  const expectedRailMapping = expectedRailMappingByMethod[input.method]
  if (!expectedRailMapping) {
    throw new BusinessRuleError("Customer settlement payment method is unsupported")
  }
  const hasRailDebit = postingLines.some(
    (line) =>
      line.side === PostingRuleLineSide.DEBIT &&
      line.mappingKey === expectedRailMapping,
  )
  const hasReceivableCredit = postingLines.some(
    (line) =>
      line.side === PostingRuleLineSide.CREDIT &&
      line.mappingKey === "ACCOUNTS_RECEIVABLE",
  )
  const debitTotal = postingLines
    .reduce(
      (total, line) => total.plus(line.debit),
      new Prisma.Decimal(0),
    )
    .toDecimalPlaces(2)
  const creditTotal = postingLines
    .reduce(
      (total, line) => total.plus(line.credit),
      new Prisma.Decimal(0),
    )
    .toDecimalPlaces(2)

  if (
    postingLines.length < 2 ||
    !hasRailDebit ||
    !hasReceivableCredit ||
    !debitTotal.eq(creditTotal) ||
    !debitTotal.eq(input.amount)
  ) {
    throw new BusinessRuleError(
      `Customer settlement posting rule ${rule.code} must debit the selected payment rail and credit accounts receivable for the exact settlement amount`,
    )
  }

  const postingMetadata = json({
    sourceVersion: CUSTOMER_SETTLEMENT_SOURCE_VERSION,
    settlementNumber: input.settlementNumber,
    customerId: input.customerId,
    amount: input.amount.toFixed(2),
    method: input.method,
    postingRuleId: rule.id,
    postingRuleCode: rule.code,
    idempotencyPayloadHash: input.idempotencyPayloadHash,
    documentHash: input.documentHash,
  })
  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: period.id,
      sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
      sourceId: input.settlementId,
      postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
      sourceVersion: CUSTOMER_SETTLEMENT_SOURCE_VERSION,
      idempotencyKey: `CUSTOMER_SETTLEMENT:${input.settlementId}:POSTED`,
      metadata: postingMetadata,
    },
    tx,
  )
  if (batch.status !== LedgerPostingBatchStatus.PENDING) {
    throw new ConflictError(
      "Customer settlement posting batch already exists in a non-pending state",
    )
  }

  const now = new Date()
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
  const entryNumber = await nextSettlementJournalEntryNumber(
    tx,
    input.organizationId,
    input.settlementNumber,
  )
  const journalEntry = await tx.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      journalId: journal.id,
      periodId: period.id,
      postingBatchId: postedBatch.id,
      entryNumber,
      entryDate: input.settlementDate,
      status: JournalEntryStatus.POSTED,
      currency: input.currency,
      memo: `Customer settlement ${input.settlementNumber}`,
      reference: input.settlementNumber,
      sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
      sourceId: input.settlementId,
      postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
      postedAt: now,
      postedById: input.actorId,
      createdById: input.actorId,
      lines: {
        create: postingLines.map((line, index) => ({
          organizationId: input.organizationId,
          accountId: line.accountId,
          lineNumber: index + 1,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: input.currency,
          exchangeRate: new Prisma.Decimal(1),
          baseDebit: line.debit,
          baseCredit: line.credit,
          customerId: input.customerId,
          metadata: json({
            postingRuleId: rule.id,
            postingRuleCode: rule.code,
            postingRuleLineNumber: line.lineNumber,
            mappingKey: line.mappingKey,
          }),
        })),
      },
    },
  })
  const sourceLink = await createAccountingSourceLink(
    {
      organizationId: input.organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
      sourceId: input.settlementId,
      sourceNumber: input.settlementNumber,
      sourceDate: input.settlementDate,
      metadata: postingMetadata,
    },
    tx,
    {
      actorId: input.actorId,
      audit: false,
      verifyPostingBatch: false,
      verifyJournalEntry: false,
    },
  )
  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "CUSTOMER_SETTLEMENT_LEDGER_POSTED",
      resourceType: "CustomerSettlement",
      resourceId: input.settlementId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      message: `Customer settlement ${input.settlementNumber} posted with rule ${rule.code}`,
      metadata: json({
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
        postingRuleId: rule.id,
        postingRuleCode: rule.code,
        accountingSourceLinkId: sourceLink.id,
        debitTotal: debitTotal.toFixed(2),
        creditTotal: creditTotal.toFixed(2),
      }),
    },
  })
  await recordPostedJournalCloseInvalidationInTx(
    tx,
    input.organizationId,
    {
      journalEntryId: journalEntry.id,
      periodId: period.id,
      entryDate: input.settlementDate,
      correlationId: postedBatch.id,
      staleReason:
        "Customer settlement posting changed certified close evidence.",
    },
    { actorId: input.actorId, now },
  )

  return {
    postingBatchId: postedBatch.id,
    journalEntryId: journalEntry.id,
    sourceLinkId: sourceLink.id,
    postingRuleId: rule.id,
    postingRuleCode: rule.code,
  }
}

async function collectCustomerSettlementInTx(
  tx: Prisma.TransactionClient,
  command: NormalizedCommand,
  control: CustomerSettlementControlContext,
) {
  const organizationId = requiredText(control.organizationId, "Organization")
  const actorId = requiredText(control.actorId, "Actor")
  const controlNow = normalizeNow(control.now)
  if (command.settlementDate.getTime() > controlNow.getTime() + 5 * 60 * 1000) {
    throw new BusinessRuleError("Settlement date cannot be in the future")
  }

  const organization = await tx.organization.findFirst({
    where: { id: organizationId, isActive: true, deletedAt: null },
    select: { id: true, currency: true },
  })
  if (!organization) throw new NotFoundError("Organization not found")

  const actor = await tx.user.findFirst({
    where: { id: actorId, organizationId, isActive: true },
    select: { id: true },
  })
  if (!actor) throw new NotFoundError("Active settlement actor not found")

  const existing = await tx.customerSettlement.findFirst({
    where: {
      organizationId,
      idempotencyKey: command.parsed.idempotencyKey,
    },
    include: { allocations: true },
  })
  if (existing) {
    assertReplayMatches(existing, command)
    const sourceLink = await tx.accountingSourceLink.findFirst({
      where: {
        organizationId,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: existing.id,
        postingBatchId: existing.ledgerPostingBatchId!,
      },
      select: { id: true },
    })
    if (!sourceLink) {
      throw new ConflictError("Customer settlement replay source link is missing")
    }
    const ledgerEntryIds = ledgerEntryIdsForSettlement(existing)
    const ledgerEntries = await tx.customerLedgerEntry.findMany({
      where: {
        id: { in: ledgerEntryIds },
        organizationId,
        customerId: existing.customerId,
        type: LedgerEntryType.PAYMENT,
        referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
      },
      select: {
        id: true,
        referenceType: true,
        referenceId: true,
        debit: true,
        credit: true,
      },
    })
    assertReplayLedgerEvidence(existing, ledgerEntries)
    return resultFor(existing, sourceLink.id, true)
  }

  const correlationConflict = await tx.customerSettlement.findFirst({
    where: { organizationId, correlationId: command.parsed.correlationId },
    select: { id: true },
  })
  if (correlationConflict) {
    throw new ConflictError("Customer settlement correlation ID is already in use")
  }

  if (command.parsed.externalReference) {
    const referenceConflict = await tx.customerSettlement.findFirst({
      where: {
        organizationId,
        method: command.parsed.method as PaymentMethod,
        externalReference: command.parsed.externalReference,
      },
      select: { id: true },
    })
    if (referenceConflict) {
      throw new ConflictError("Customer settlement external reference is already in use")
    }
  }

  const customer = await tx.customer.findFirst({
    where: {
      id: command.parsed.customerId,
      organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  })
  if (!customer) throw new NotFoundError("Active customer not found")

  const salesOrderIds = command.allocations.map(
    (allocation) => allocation.salesOrderId,
  )
  const salesOrders = await tx.salesOrder.findMany({
    where: {
      id: { in: salesOrderIds },
      organizationId,
      customerId: customer.id,
      deletedAt: null,
    },
    select: { id: true, orderNumber: true },
  })
  if (salesOrders.length !== salesOrderIds.length) {
    throw new BusinessRuleError(
      "Settlement allocations must reference this customer's sales orders",
    )
  }

  const receivableBySalesOrder = new Map<
    string,
    Awaited<ReturnType<typeof ensurePostedCustomerReceivableDocumentInTx>>
  >()
  for (const allocation of command.allocations) {
    const receivable = await ensurePostedCustomerReceivableDocumentInTx(tx, {
      organizationId,
      customerId: customer.id,
      salesOrderId: allocation.salesOrderId,
      actorId: actor.id,
      metadata: {
        settlementCorrelationId: command.parsed.correlationId,
      },
    })
    const openAmount = receivable.state.unpaidAmount
    if (openAmount.lte(0)) {
      throw new BusinessRuleError(
        "Settlement allocation receivable document has no open balance",
      )
    }
    if (allocation.amount.gt(openAmount)) {
      throw new BusinessRuleError(
        "Settlement allocation exceeds the receivable document open balance",
      )
    }
    receivableBySalesOrder.set(allocation.salesOrderId, receivable)
  }

  const currency = normalizeCurrency(organization.currency)
  const number = settlementNumber(
    organizationId,
    command.parsed.idempotencyKey,
    command.settlementDate,
  )
  const settlement = await tx.customerSettlement.create({
    data: {
      organizationId,
      customerId: customer.id,
      settlementNumber: number,
      status: CustomerSettlementStatus.POSTED,
      method: command.parsed.method as PaymentMethod,
      amount: command.amount,
      currency,
      settlementDate: command.settlementDate,
      idempotencyKey: command.parsed.idempotencyKey,
      idempotencyPayloadHash: command.idempotencyPayloadHash,
      correlationId: command.parsed.correlationId,
      externalReference: command.parsed.externalReference ?? null,
      documentHash: command.parsed.documentHash.toLowerCase(),
      evidenceHash: command.parsed.evidenceHash.toLowerCase(),
      receivedById: actor.id,
      notes: command.parsed.notes ?? null,
      metadata: json({
        gate: "phase-5-slice-435-customer-settlement",
        sourceVersion: CUSTOMER_SETTLEMENT_SOURCE_VERSION,
        allocationCount: command.allocations.length,
        idempotencyPayloadHash: command.idempotencyPayloadHash,
      }),
    },
  })

  const ledgerEntryIds: string[] = []
  const customerReceivableDocumentIds: string[] = []
  const settlementAllocations: Array<{ id: string }> = []
  for (const allocation of command.allocations) {
    const receivable = receivableBySalesOrder.get(allocation.salesOrderId)
    if (!receivable) {
      throw new ConflictError(
        "Settlement allocation receivable document evidence is missing",
      )
    }
    const ledgerEntry = await createCustomerLedgerEntry(tx, {
      organizationId,
      customerId: customer.id,
      type: LedgerEntryType.PAYMENT,
      credit: allocation.amount,
      entryDate: command.settlementDate,
      description: `Customer settlement ${settlement.settlementNumber}`,
      referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
      referenceId: receivable.document.id,
    })
    ledgerEntryIds.push(ledgerEntry.id)
    const settlementAllocation = await tx.customerSettlementAllocation.create({
      data: {
        organizationId,
        customerSettlementId: settlement.id,
        salesOrderId: allocation.salesOrderId,
        customerReceivableDocumentId: receivable.document.id,
        customerLedgerEntryId: ledgerEntry.id,
        amount: allocation.amount,
      },
    })
    customerReceivableDocumentIds.push(receivable.document.id)
    settlementAllocations.push(settlementAllocation)
    await recordCustomerReceivableSettlementAppliedInTx(tx, {
      organizationId,
      documentId: receivable.document.id,
      actorId: actor.id,
      settlementAllocationId: settlementAllocation.id,
      amount: allocation.amount,
      effectiveAt: command.settlementDate,
      evidenceHash: command.parsed.evidenceHash.toLowerCase(),
    })
  }

  const posting = await postCustomerSettlementInTx(tx, {
    organizationId,
    customerId: customer.id,
    actorId: actor.id,
    settlementId: settlement.id,
    settlementNumber: settlement.settlementNumber,
    settlementDate: command.settlementDate,
    amount: command.amount,
    method: command.parsed.method as PaymentMethod,
    currency,
    documentHash: command.parsed.documentHash.toLowerCase(),
    idempotencyPayloadHash: command.idempotencyPayloadHash,
  })
  const eventResult = await recordBusinessEventInTx(tx, {
    organizationId,
    eventType: "customer.settlement.posted",
    eventSource: "INTERNAL",
    schemaVersion: CUSTOMER_SETTLEMENT_SOURCE_VERSION,
    idempotencyKey: `customer-settlement:${settlement.id}:posted`,
    payload: {
      customerSettlementId: settlement.id,
      settlementNumber: settlement.settlementNumber,
      customerId: customer.id,
      amount: command.amount.toFixed(2),
      currency,
      method: command.parsed.method,
      allocationIds: settlementAllocations.map((allocation) => allocation.id),
      salesOrderIds,
      customerReceivableDocumentIds,
      customerLedgerEntryIds: ledgerEntryIds,
      ledgerPostingBatchId: posting.postingBatchId,
      journalEntryId: posting.journalEntryId,
      correlationId: command.parsed.correlationId,
    },
    occurredAt: command.settlementDate,
    actorId: actor.id,
    sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
    sourceId: settlement.id,
    postingBatchId: posting.postingBatchId,
    documentHash: command.parsed.documentHash.toLowerCase(),
    metadata: {
      gate: "phase-5-slice-435-customer-settlement",
      postingRuleId: posting.postingRuleId,
      postingRuleCode: posting.postingRuleCode,
      evidenceHash: command.parsed.evidenceHash.toLowerCase(),
    },
    outboxMessages: [
      {
        channel: "NOTIFICATION",
        eventName: "customer_settlement.posted",
        destination: "accounting",
        payload: {
          severity: "info",
          customerSettlementId: settlement.id,
          customerId: customer.id,
          amount: command.amount.toFixed(2),
          currency,
          allocationCount: settlementAllocations.length,
          ledgerPostingBatchId: posting.postingBatchId,
        },
      },
    ],
  })
  await markBusinessEventAppliedInTx(tx, organizationId, eventResult.event.id)

  const completed = await tx.customerSettlement.update({
    where: { id: settlement.id },
    data: {
      ledgerPostingBatchId: posting.postingBatchId,
      journalEntryId: posting.journalEntryId,
      postedBusinessEventId: eventResult.event.id,
      metadata: json({
        gate: "phase-5-slice-435-customer-settlement",
        sourceVersion: CUSTOMER_SETTLEMENT_SOURCE_VERSION,
        allocationCount: settlementAllocations.length,
        idempotencyPayloadHash: command.idempotencyPayloadHash,
        postingRuleId: posting.postingRuleId,
        postingRuleCode: posting.postingRuleCode,
        accountingSourceLinkId: posting.sourceLinkId,
      }),
    },
    include: { allocations: true },
  })
  await tx.auditLog.create({
    data: {
      organizationId,
      entityType: "CustomerSettlement",
      entityId: settlement.id,
      action: "CUSTOMER_SETTLEMENT_POSTED",
      userId: actor.id,
      changes: json({
        after: {
          customerId: customer.id,
          settlementNumber: settlement.settlementNumber,
          amount: command.amount.toFixed(2),
          currency,
          method: command.parsed.method,
          allocationCount: settlementAllocations.length,
          ledgerPostingBatchId: posting.postingBatchId,
          journalEntryId: posting.journalEntryId,
          businessEventId: eventResult.event.id,
          correlationId: command.parsed.correlationId,
        },
      }),
    },
  })

  return resultFor(completed, posting.sourceLinkId, false)
}

async function runSerializable<T>(
  client: CustomerSettlementClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (
    let attempt = 1;
    attempt <= CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await client.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      if (isPrismaCode(error, "P2002")) throw error
      if (
        isPrismaCode(error, "P2034") &&
        attempt < CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS
      ) {
        continue
      }
      if (isPrismaCode(error, "P2034")) {
        throw new ConflictError(
          "Customer settlement transaction could not be serialized",
        )
      }
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Customer settlement transaction failed.",
        500,
        false,
      )
    }
  }

  throw new ConflictError("Customer settlement transaction could not be serialized")
}

export async function collectCustomerSettlementWithControls(
  input: CollectCustomerSettlementInput,
  control: CustomerSettlementControlContext,
  client: CustomerSettlementClient = db,
) {
  const organizationId = requiredText(control.organizationId, "Organization")
  const actorId = requiredText(control.actorId, "Actor")
  const command = normalizeCommand(input, organizationId)
  const decision = evaluateSensitiveAction({
    action: "customer.settlement.collect",
    organizationId,
    actorId,
    actorPermissions: control.actorPermissions,
    lastAuthAt: control.lastAuthAt,
    now: control.now,
    resourceType: "CustomerSettlement",
    resourceId: command.parsed.idempotencyKey,
    amount: command.amount,
    metadata: {
      customerId: command.parsed.customerId,
      method: command.parsed.method,
      allocationCount: command.allocations.length,
      correlationId: command.parsed.correlationId,
    },
  })

  if (!decision.allowed) {
    await auditSensitiveActionDecision(client, decision)
    assertSensitiveActionAllowed(decision)
  }

  try {
    return await runSerializable(client, async (tx) => {
      await auditSensitiveActionDecision(tx, decision)
      return collectCustomerSettlementInTx(tx, command, control)
    })
  } catch (error) {
    if (!isPrismaCode(error, "P2002")) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Customer settlement collection failed.",
        500,
        false,
      )
    }

    const existing = await client.customerSettlement.findFirst({
      where: {
        organizationId,
        idempotencyKey: command.parsed.idempotencyKey,
      },
      include: { allocations: true },
    })
    if (!existing) {
      throw new ConflictError("Customer settlement uniqueness conflict")
    }
    assertReplayMatches(existing, command)
    const ledgerEntryIds = ledgerEntryIdsForSettlement(existing)

    const [sourceLink, ledgerEntries] = await Promise.all([
      client.accountingSourceLink.findFirst({
        where: {
          organizationId,
          sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
          sourceId: existing.id,
          postingBatchId: existing.ledgerPostingBatchId!,
        },
        select: { id: true },
      }),
      client.customerLedgerEntry.findMany({
        where: {
          id: { in: ledgerEntryIds },
          organizationId,
          customerId: existing.customerId,
          type: LedgerEntryType.PAYMENT,
          referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
        },
        select: {
          id: true,
          referenceType: true,
          referenceId: true,
          debit: true,
          credit: true,
        },
      }),
    ])
    if (!sourceLink) {
      throw new ConflictError("Customer settlement replay evidence is incomplete")
    }
    assertReplayLedgerEvidence(existing, ledgerEntries)
    return resultFor(existing, sourceLink.id, true)
  }
}
