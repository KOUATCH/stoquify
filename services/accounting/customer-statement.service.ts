import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  type AROpenItem,
  getCustomerAROpenItems,
} from "./ar-open-item.service"
import {
  receivableMoney,
} from "./customer-receivable-document.service"

export const CUSTOMER_STATEMENT_SCHEMA_VERSION = 1
export const CUSTOMER_STATEMENT_ITEM_LIMIT = 500
export const CUSTOMER_STATEMENT_SOURCE_TABLES = [
  "customer_receivable_documents",
  "customer_receivable_document_states",
  "customer_ledger_entries",
] as const

const CUSTOMER_STATEMENT_MAX_SERIALIZABLE_ATTEMPTS = 3

export type CreateCustomerStatementSnapshotInput = {
  organizationId: string
  customerId: string
  periodStart: Date | string
  periodEnd: Date | string
  currency: string
  generatedById: string
  idempotencyKey: string
  correlationId: string
  now?: Date | string | number | null
}

export type CustomerStatementSnapshotResult = {
  statementId: string
  statementNumber: string
  version: number
  contentHash: string
  businessEventId: string
  periodStart: string
  periodEnd: string
  asOf: string
  recordedThrough: string
  currency: string
  openingBalance: string
  periodDebits: string
  periodCredits: string
  closingBalance: string
  overdueBalance: string
  itemCount: number
  movementCount: number
  truncated: false
  replayed: boolean
  payload: Prisma.JsonValue
}

type NormalizedStatementCommand = {
  organizationId: string
  customerId: string
  periodStart: Date
  periodEnd: Date
  currency: string
  generatedById: string
  idempotencyKey: string
  correlationId: string
  generatedAt: Date
  idempotencyPayloadHash: string
}

type StatementLine = {
  customerReceivableDocumentId: string
  documentNumber: string
  documentVersion: number
  documentHash: string
  openingStateHash: string | null
  closingStateHash: string
  orderNumber: string | null
  invoiceDate: string
  dueDate: string
  status: AROpenItem["status"]
  agingBucket: AROpenItem["agingBucket"]
  daysPastDue: number
  openingBalance: string
  debitAmount: string
  initialCreditAmount: string
  movementCreditAmount: string
  periodCreditAmount: string
  closingBalance: string
  movements: AROpenItem["allocations"]
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(label + " is required")
  return normalized
}

function boundedKey(value: string, label: string) {
  const normalized = requiredText(value, label)
  if (normalized.length < 8 || normalized.length > 160) {
    throw new BusinessRuleError(label + " must contain between 8 and 160 characters")
  }
  return normalized
}

function normalizedDate(
  value: Date | string | number | null | undefined,
  label: string,
) {
  const result = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value ?? Number.NaN)
  if (Number.isNaN(result.getTime())) {
    throw new BusinessRuleError(label + " is invalid")
  }
  return result
}

function normalizedCurrency(value: string) {
  const currency = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new BusinessRuleError("Statement currency must be an ISO 4217 code")
  }
  return currency
}

function statementJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function money(value: Prisma.Decimal.Value) {
  return receivableMoney(value, "Statement amount")
}

function moneyText(value: Prisma.Decimal.Value) {
  return money(value).toFixed(2)
}

function isPrismaCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  )
}

function normalizeCommand(
  input: CreateCustomerStatementSnapshotInput,
): NormalizedStatementCommand {
  const organizationId = requiredText(input.organizationId, "Organization")
  const customerId = requiredText(input.customerId, "Customer")
  const generatedById = requiredText(input.generatedById, "Statement generator")
  const idempotencyKey = boundedKey(input.idempotencyKey, "Idempotency key")
  const correlationId = boundedKey(input.correlationId, "Correlation ID")
  const periodStart = normalizedDate(input.periodStart, "Statement period start")
  const periodEnd = normalizedDate(input.periodEnd, "Statement period end")
  const generatedAt = input.now == null
    ? new Date()
    : normalizedDate(input.now, "Statement generation time")
  const currency = normalizedCurrency(input.currency)

  if (periodStart.getTime() > periodEnd.getTime()) {
    throw new BusinessRuleError("Statement period start must not follow period end")
  }
  if (periodEnd.getTime() > generatedAt.getTime()) {
    throw new BusinessRuleError("Statement period end cannot be in the future")
  }

  const idempotencyPayloadHash = hashBusinessPayload({
    organizationId,
    customerId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    currency,
    generatedById,
    correlationId,
  })

  return {
    organizationId,
    customerId,
    periodStart,
    periodEnd,
    currency,
    generatedById,
    idempotencyKey,
    correlationId,
    generatedAt,
    idempotencyPayloadHash,
  }
}

function statementNumber(command: NormalizedStatementCommand) {
  const date = command.periodEnd.toISOString().slice(0, 10).replaceAll("-", "")
  const scopeHash = hashBusinessPayload({
    organizationId: command.organizationId,
    customerId: command.customerId,
    periodStart: command.periodStart.toISOString(),
    periodEnd: command.periodEnd.toISOString(),
    currency: command.currency,
  })
  return "STM-" + date + "-" + scopeHash.slice(0, 12).toUpperCase()
}

function inPeriod(value: string, command: NormalizedStatementCommand) {
  const time = new Date(value).getTime()
  return (
    time >= command.periodStart.getTime() &&
    time <= command.periodEnd.getTime()
  )
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right))
}

function snapshotResult(
  snapshot: {
    id: string
    statementNumber: string
    version: number
    contentHash: string
    businessEventId: string
    periodStart: Date
    periodEnd: Date
    asOf: Date
    recordedThrough: Date
    currency: string
    openingBalance: Prisma.Decimal
    periodDebits: Prisma.Decimal
    periodCredits: Prisma.Decimal
    closingBalance: Prisma.Decimal
    overdueBalance: Prisma.Decimal
    itemCount: number
    movementCount: number
    truncated: boolean
    statementPayload: Prisma.JsonValue
  },
  replayed: boolean,
): CustomerStatementSnapshotResult {
  if (snapshot.truncated) {
    throw new ConflictError("Truncated customer statement snapshots cannot be used")
  }
  return {
    statementId: snapshot.id,
    statementNumber: snapshot.statementNumber,
    version: snapshot.version,
    contentHash: snapshot.contentHash,
    businessEventId: snapshot.businessEventId,
    periodStart: snapshot.periodStart.toISOString(),
    periodEnd: snapshot.periodEnd.toISOString(),
    asOf: snapshot.asOf.toISOString(),
    recordedThrough: snapshot.recordedThrough.toISOString(),
    currency: snapshot.currency,
    openingBalance: snapshot.openingBalance.toFixed(2),
    periodDebits: snapshot.periodDebits.toFixed(2),
    periodCredits: snapshot.periodCredits.toFixed(2),
    closingBalance: snapshot.closingBalance.toFixed(2),
    overdueBalance: snapshot.overdueBalance.toFixed(2),
    itemCount: snapshot.itemCount,
    movementCount: snapshot.movementCount,
    truncated: false,
    replayed,
    payload: snapshot.statementPayload,
  }
}

function assertReplay(
  snapshot: {
    idempotencyPayloadHash: string
    customerId: string
    periodStart: Date
    periodEnd: Date
    currency: string
    generatedById: string
    correlationId: string
  },
  command: NormalizedStatementCommand,
) {
  if (
    snapshot.idempotencyPayloadHash !== command.idempotencyPayloadHash ||
    snapshot.customerId !== command.customerId ||
    snapshot.periodStart.getTime() !== command.periodStart.getTime() ||
    snapshot.periodEnd.getTime() !== command.periodEnd.getTime() ||
    snapshot.currency !== command.currency ||
    snapshot.generatedById !== command.generatedById ||
    snapshot.correlationId !== command.correlationId
  ) {
    throw new ConflictError(
      "Customer statement idempotency key was reused with different evidence",
    )
  }
}

function buildStatementLines(
  openingItems: AROpenItem[],
  closingItems: AROpenItem[],
  command: NormalizedStatementCommand,
) {
  const openingByDocumentId = new Map(
    openingItems.map((item) => [item.referenceId, item]),
  )
  const lines: StatementLine[] = []

  for (const item of closingItems) {
    const openingItem = openingByDocumentId.get(item.referenceId)
    const openingBalance = money(openingItem?.openAmount ?? 0)
    const issuedInPeriod = item.invoiceDate
      ? inPeriod(item.invoiceDate, command)
      : false
    const movements = item.allocations.filter((allocation) =>
      inPeriod(allocation.entryDate, command),
    )
    const debitAmount = issuedInPeriod ? money(item.openingAmount) : money(0)
    const initialCreditAmount = issuedInPeriod
      ? money(item.initialPaidAmount)
      : money(0)
    const movementCreditAmount = movements.reduce(
      (total, movement) => total.plus(movement.amount),
      money(0),
    )
    const periodCreditAmount = initialCreditAmount
      .plus(movementCreditAmount)
      .toDecimalPlaces(2)
    const closingBalance = money(item.openAmount)

    if (
      !openingBalance
        .plus(debitAmount)
        .minus(periodCreditAmount)
        .eq(closingBalance)
    ) {
      throw new ConflictError(
        "Customer statement movement evidence does not reconcile for receivable " +
          item.documentNumber,
      )
    }

    if (
      openingBalance.eq(0) &&
      debitAmount.eq(0) &&
      periodCreditAmount.eq(0) &&
      closingBalance.eq(0)
    ) {
      continue
    }

    lines.push({
      customerReceivableDocumentId: item.referenceId,
      documentNumber: item.documentNumber,
      documentVersion: item.documentVersion,
      documentHash: item.documentHash,
      openingStateHash: openingItem?.stateHash ?? null,
      closingStateHash: item.stateHash,
      orderNumber: item.orderNumber,
      invoiceDate: item.invoiceDate ?? command.periodEnd.toISOString(),
      dueDate: item.dueDate ?? command.periodEnd.toISOString(),
      status: item.status,
      agingBucket: item.agingBucket,
      daysPastDue: item.daysPastDue,
      openingBalance: openingBalance.toFixed(2),
      debitAmount: debitAmount.toFixed(2),
      initialCreditAmount: initialCreditAmount.toFixed(2),
      movementCreditAmount: movementCreditAmount.toFixed(2),
      periodCreditAmount: periodCreditAmount.toFixed(2),
      closingBalance: closingBalance.toFixed(2),
      movements,
    })
  }

  return lines
}

export async function createCustomerStatementSnapshotInTx(
  tx: Prisma.TransactionClient,
  input: CreateCustomerStatementSnapshotInput,
): Promise<CustomerStatementSnapshotResult> {
  const command = normalizeCommand(input)
  const existing = await tx.customerStatementSnapshot.findFirst({
    where: {
      organizationId: command.organizationId,
      OR: [
        { idempotencyKey: command.idempotencyKey },
        { correlationId: command.correlationId },
      ],
    },
  })
  if (existing) {
    if (existing.idempotencyKey !== command.idempotencyKey) {
      throw new ConflictError(
        "Customer statement correlation ID was already used",
      )
    }
    assertReplay(existing, command)
    return snapshotResult(existing, true)
  }

  const actor = await tx.user.findFirst({
    where: {
      id: command.generatedById,
      organizationId: command.organizationId,
      isActive: true,
    },
    select: { id: true },
  })
  if (!actor) throw new NotFoundError("Active statement generator not found")

  const organization = await tx.organization.findFirst({
    where: {
      id: command.organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      tradeName: true,
      taxIdentifier: true,
      address: true,
      country: true,
      countryCode: true,
      currency: true,
      timezone: true,
      defaultLocale: true,
    },
  })
  if (!organization) throw new NotFoundError("Organization not found")

  const customer = await tx.customer.findFirst({
    where: {
      id: command.customerId,
      organizationId: command.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      code: true,
      taxId: true,
      preferredLocale: true,
    },
  })
  if (!customer) throw new NotFoundError("Customer not found")

  const currency = command.currency

  const openingAsOf = new Date(command.periodStart.getTime() - 1)
  const opening = await getCustomerAROpenItems({
    organizationId: command.organizationId,
    customerId: command.customerId,
    asOf: openingAsOf,
    recordedThrough: command.generatedAt,
    client: tx,
  })
  const closing = await getCustomerAROpenItems({
    organizationId: command.organizationId,
    customerId: command.customerId,
    asOf: command.periodEnd,
    recordedThrough: command.generatedAt,
    client: tx,
  })
  const openingItems = opening.items.filter((item) => item.currency === currency)
  const closingItems = closing.items.filter((item) => item.currency === currency)
  const lines = buildStatementLines(openingItems, closingItems, command)

  if (lines.length > CUSTOMER_STATEMENT_ITEM_LIMIT) {
    throw new BusinessRuleError(
      "Customer statement exceeds the complete snapshot item limit",
    )
  }

  const openingBalance = openingItems.reduce(
    (total, item) => total.plus(item.openAmount),
    money(0),
  )
  const periodDebits = lines.reduce(
    (total, line) => total.plus(line.debitAmount),
    money(0),
  )
  const periodCredits = lines.reduce(
    (total, line) => total.plus(line.periodCreditAmount),
    money(0),
  )
  const closingBalance = closingItems.reduce(
    (total, item) => total.plus(item.openAmount),
    money(0),
  )
  const overdueBalance = closingItems
    .filter((item) => item.daysPastDue > 0)
    .reduce((total, item) => total.plus(item.openAmount), money(0))

  if (
    !openingBalance
      .plus(periodDebits)
      .minus(periodCredits)
      .eq(closingBalance)
  ) {
    throw new ConflictError(
      "Customer statement opening, movement, and closing balances do not reconcile",
    )
  }

  const latest = await tx.customerStatementSnapshot.findFirst({
    where: {
      organizationId: command.organizationId,
      customerId: command.customerId,
      periodStart: command.periodStart,
      periodEnd: command.periodEnd,
      currency,
    },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  })
  const version = (latest?.version ?? 0) + 1
  const number = statementNumber(command)
  const movementCount = lines.reduce(
    (total, line) =>
      total +
      line.movements.length +
      (money(line.debitAmount).gt(0) ? 1 : 0) +
      (money(line.initialCreditAmount).gt(0) ? 1 : 0),
    0,
  )
  const sourceDocumentHashes = uniqueSorted(
    lines.map((line) => line.documentHash),
  )
  const sourceStateHashes = uniqueSorted(
    lines.flatMap((line) => [
      line.openingStateHash,
      line.closingStateHash,
    ]),
  )
  const sourceLedgerEntryIds = uniqueSorted(
    lines.flatMap((line) =>
      line.movements.map((movement) => movement.ledgerEntryId),
    ),
  )
  const organizationSnapshot = {
    id: organization.id,
    name: organization.name,
    tradeName: organization.tradeName,
    taxIdentifier: organization.taxIdentifier,
    address: organization.address,
    country: organization.country,
    countryCode: organization.countryCode,
    currency: organization.currency,
    timezone: organization.timezone,
    defaultLocale: organization.defaultLocale,
  }
  const customerSnapshot = {
    id: customer.id,
    name: customer.name,
    code: customer.code,
    taxId: customer.taxId,
    preferredLocale: customer.preferredLocale,
  }
  const payload = {
    schemaVersion: "customer-statement.v1",
    statement: {
      statementNumber: number,
      version,
      supersedesStatementId: latest?.id ?? null,
      generatedAt: command.generatedAt.toISOString(),
      generatedById: actor.id,
      correlationId: command.correlationId,
    },
    organization: organizationSnapshot,
    customer: customerSnapshot,
    scope: {
      periodStart: command.periodStart.toISOString(),
      periodEnd: command.periodEnd.toISOString(),
      asOf: command.periodEnd.toISOString(),
      recordedThrough: command.generatedAt.toISOString(),
      currency,
      currencyPrecision: 2,
    },
    balances: {
      opening: openingBalance.toFixed(2),
      periodDebits: periodDebits.toFixed(2),
      periodCredits: periodCredits.toFixed(2),
      closing: closingBalance.toFixed(2),
      overdue: overdueBalance.toFixed(2),
    },
    completeness: {
      sourceItemCount: lines.length,
      includedItemCount: lines.length,
      itemLimit: CUSTOMER_STATEMENT_ITEM_LIMIT,
      truncated: false,
    },
    redaction: {
      profile: "CUSTOMER_STATEMENT_EXTERNAL_SAFE_V1",
      contactAndAuthenticationFieldsIncluded: false,
    },
    source: {
      tables: [...CUSTOMER_STATEMENT_SOURCE_TABLES],
      documentHashes: sourceDocumentHashes,
      stateHashes: sourceStateHashes,
      ledgerEntryIds: sourceLedgerEntryIds,
    },
    lines,
  }
  const contentHash = hashBusinessPayload(payload)

  const event = await recordBusinessEventInTx(tx, {
    organizationId: command.organizationId,
    eventType: "customer.statement.snapshot.created",
    eventSource: "INTERNAL",
    schemaVersion: CUSTOMER_STATEMENT_SCHEMA_VERSION,
    idempotencyKey:
      "customer-statement:" + number + ":version:" + version,
    payload: {
      customerId: command.customerId,
      statementNumber: number,
      version,
      periodStart: command.periodStart.toISOString(),
      periodEnd: command.periodEnd.toISOString(),
      currency,
      openingBalance: openingBalance.toFixed(2),
      periodDebits: periodDebits.toFixed(2),
      periodCredits: periodCredits.toFixed(2),
      closingBalance: closingBalance.toFixed(2),
      itemCount: lines.length,
      movementCount,
      contentHash,
    },
    occurredAt: command.generatedAt,
    actorId: actor.id,
    sourceType: "CUSTOMER_STATEMENT_SNAPSHOT",
    sourceId: number,
    documentHash: contentHash,
    metadata: {
      gate: "phase-5-customer-statement-snapshot",
      truncated: false,
      sourceTables: [...CUSTOMER_STATEMENT_SOURCE_TABLES],
    },
    outboxMessages: [],
  })

  const snapshot = await tx.customerStatementSnapshot.create({
    data: {
      organizationId: command.organizationId,
      customerId: command.customerId,
      statementNumber: number,
      version,
      periodStart: command.periodStart,
      periodEnd: command.periodEnd,
      asOf: command.periodEnd,
      recordedThrough: command.generatedAt,
      generatedAt: command.generatedAt,
      currency,
      currencyPrecision: 2,
      openingBalance,
      periodDebits,
      periodCredits,
      closingBalance,
      overdueBalance,
      itemCount: lines.length,
      movementCount,
      sourceItemCount: lines.length,
      includedItemCount: lines.length,
      itemLimit: CUSTOMER_STATEMENT_ITEM_LIMIT,
      truncated: false,
      organizationSnapshot: statementJson(organizationSnapshot),
      customerSnapshot: statementJson(customerSnapshot),
      statementPayload: statementJson(payload),
      sourceTables: statementJson([...CUSTOMER_STATEMENT_SOURCE_TABLES]),
      sourceDocumentHashes: statementJson(sourceDocumentHashes),
      sourceStateHashes: statementJson(sourceStateHashes),
      sourceLedgerEntryIds: statementJson(sourceLedgerEntryIds),
      contentHash,
      idempotencyKey: command.idempotencyKey,
      idempotencyPayloadHash: command.idempotencyPayloadHash,
      correlationId: command.correlationId,
      generatedById: actor.id,
      businessEventId: event.event.id,
      supersedesStatementId: latest?.id ?? null,
    },
  })
  await markBusinessEventAppliedInTx(tx, command.organizationId, event.event.id)
  await tx.auditLog.create({
    data: {
      organizationId: command.organizationId,
      entityType: "CustomerStatementSnapshot",
      entityId: snapshot.id,
      action: "CUSTOMER_STATEMENT_SNAPSHOT_CREATED",
      userId: actor.id,
      changes: statementJson({
        after: {
          statementNumber: number,
          version,
          customerId: command.customerId,
          periodStart: command.periodStart.toISOString(),
          periodEnd: command.periodEnd.toISOString(),
          currency,
          openingBalance: openingBalance.toFixed(2),
          periodDebits: periodDebits.toFixed(2),
          periodCredits: periodCredits.toFixed(2),
          closingBalance: closingBalance.toFixed(2),
          itemCount: lines.length,
          movementCount,
          contentHash,
          businessEventId: event.event.id,
          correlationId: command.correlationId,
          supersedesStatementId: latest?.id ?? null,
        },
      }),
    },
  })

  return snapshotResult(snapshot, false)
}

async function runSerializable<T>(
  client: typeof db,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (
    let attempt = 1;
    attempt <= CUSTOMER_STATEMENT_MAX_SERIALIZABLE_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await client.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      const retryable =
        isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")
      if (retryable && attempt < CUSTOMER_STATEMENT_MAX_SERIALIZABLE_ATTEMPTS) {
        continue
      }
      if (retryable) {
        throw new ConflictError(
          "Customer statement snapshot transaction could not be serialized",
        )
      }
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Customer statement snapshot transaction failed.",
        500,
        false,
      )
    }
  }
  throw new ConflictError(
    "Customer statement snapshot transaction could not be serialized",
  )
}

export async function createCustomerStatementSnapshot(
  input: CreateCustomerStatementSnapshotInput,
  client: typeof db = db,
) {
  return runSerializable(client, (tx) =>
    createCustomerStatementSnapshotInTx(tx, input),
  )
}
