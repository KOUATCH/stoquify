import {
  CashDrawerTransactionType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  configuredHistoryCursorCodec,
  hashNormalizedHistoryFilters,
} from "@/services/history/transaction-history-cursor"
import {
  HistoryCursorError,
  type HistoryCompleteness,
  type HistoryCursorCodec,
  type TransactionHistoryResult,
} from "@/services/history/transaction-history.types"
import { evaluateRedaction, type AppliedRedaction } from "@/services/security/redaction-policy.service"
import {
  cashPaymentHistoryInputSchema,
  type CashPaymentHistoryInput,
} from "./cash-payment-history.schemas"

const CASH_PAYMENT_HISTORY_ADAPTER_ID = "cash-payment-history.v1"

const CASH_IN_TYPES = new Set<CashDrawerTransactionType>([
  CashDrawerTransactionType.OPENING_BALANCE,
  CashDrawerTransactionType.SALE,
  CashDrawerTransactionType.CASH_IN,
  CashDrawerTransactionType.CLOSING_BALANCE,
])

const CASH_OUT_TYPES = new Set<CashDrawerTransactionType>([
  CashDrawerTransactionType.RETURN,
  CashDrawerTransactionType.CASH_OUT,
  CashDrawerTransactionType.REFUND,
  CashDrawerTransactionType.PAYOUT,
])

const ELECTRONIC_METHODS = new Set<PaymentMethod>([
  PaymentMethod.CARD,
  PaymentMethod.MOBILE_MONEY,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CHEQUE,
])

type CashPaymentHistoryClient = Pick<
  Prisma.TransactionClient,
  "organization" | "cashDrawerTransaction" | "payment"
>

export type CashPaymentHistoryOptions = {
  client?: CashPaymentHistoryClient
  cursorCodec?: HistoryCursorCodec
  now?: () => Date
  recordedThrough?: Date
}

export type CashPaymentHistoryAppliedFilters = {
  lane: "cash" | "payment" | "all"
  locationId: string | null
  cashierId: string | null
  paymentMethod: PaymentMethod | null
  paymentStatus: PaymentStatus | null
  cashType: CashDrawerTransactionType | null
  dateFrom: string | null
  dateTo: string | null
  effectiveAsOf: string | null
  timezone: string
  accessMode: "own" | "manager"
  pageSize: 25 | 50 | 100
}

export type CashPaymentHistoryRow = {
  id: string
  lane: "cash" | "payment"
  sourceType: string
  sourceId: string
  amount: string
  direction: "inflow" | "outflow" | "neutral"
  currency: string
  effectiveAt: string
  recordedAt: string
  controlState: "capture" | "posted" | "reconciled" | "certified" | "exception" | "suspense" | "cash_count"
  businessState: string
  location: { id: string | null; name: string | null }
  cashier: { id: string | null; name: string | null }
  terminal: { id: string | null; name: string | null }
  drawer: { id: string | null; name: string | null }
  session: { id: string | null; number: string | null }
  payment: {
    method: PaymentMethod | null
    status: PaymentStatus | null
    providerReference: string | null
    redactions: AppliedRedaction[]
  }
  accounting: {
    physicalCashImpact: string
    electronicTenderExcluded: boolean
    ledgerPostingBatchId: string | null
    reconciliationState: string | null
  }
  reference: {
    salesOrderId: string | null
    purchaseOrderId: string | null
    paymentNumber: string | null
    reason: string | null
  }
}

export type CashPaymentHistorySummary = {
  transactionCount: number
  cashEventCount: number
  paymentEventCount: number
  openingFloat: string
  cashInflows: string
  cashOutflows: string
  countedCash: string
  expectedPhysicalCash: string
  cashVariance: string
  electronicTenderTotal: string
  paymentCapturedTotal: string
  unresolvedPaymentCount: number
  currency: string
}

export type CashPaymentHistoryResult = TransactionHistoryResult<
  CashPaymentHistoryRow,
  CashPaymentHistorySummary,
  CashPaymentHistoryAppliedFilters
>

type CashRow = Prisma.CashDrawerTransactionGetPayload<{
  include: {
    cashDrawer: {
      include: {
        location: { select: { id: true; name: true; organizationId: true } }
        terminal: { select: { id: true; name: true } }
      }
    }
    session: { select: { id: true; sessionNumber: true; organizationId: true } }
    user: { select: { id: true; firstName: true; lastName: true; email: true } }
  }
}>

type PaymentRow = Prisma.PaymentGetPayload<{
  include: {
    processedBy: { select: { id: true; firstName: true; lastName: true; email: true } }
    salesOrder: { select: { id: true; locationId: true } }
    purchaseOrder: { select: { id: true; locationId: true } }
    reconciliationTransaction: {
      select: {
        id: true
        state: true
        providerReference: true
        ledgerPostingBatchId: true
        settledAt: true
        confirmedAt: true
      }
    }
  }
}>

type CombinedRow =
  | { lane: "cash"; row: CashRow; effectiveAt: Date; recordedAt: Date; id: string }
  | { lane: "payment"; row: PaymentRow; effectiveAt: Date; recordedAt: Date; id: string }

function invalidHistoryInput(message: string): never {
  throw new HistoryCursorError("invalid_payload", message)
}

function decimal(value: Prisma.Decimal | Prisma.Decimal.Value | null | undefined) {
  if (value === null || value === undefined || value === "") return new Prisma.Decimal(0)
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function decimalText(value: Prisma.Decimal | Prisma.Decimal.Value | null | undefined) {
  return decimal(value).toFixed(2)
}

function userName(user?: { firstName: string | null; lastName: string | null; email: string } | null) {
  if (!user) return null
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email
}

function parseCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) invalidHistoryInput(`Invalid calendar date: ${value}.`)
  return parsed
}

function addDay(value: Date) {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + 1)
  return next
}

function cursorPredicate(payload: { effectiveAt: string; recordedAt: string; id: string }) {
  const effectiveAt = new Date(payload.effectiveAt)
  const recordedAt = new Date(payload.recordedAt)
  return {
    OR: [
      { createdAt: { lt: effectiveAt } },
      { createdAt: effectiveAt, id: { lt: payload.id } },
      { createdAt: { lt: recordedAt } },
    ],
  }
}

function paymentCursorPredicate(payload: { effectiveAt: string; recordedAt: string; id: string }) {
  const effectiveAt = new Date(payload.effectiveAt)
  const recordedAt = new Date(payload.recordedAt)
  return {
    OR: [
      { processedAt: { lt: effectiveAt } },
      { processedAt: null, createdAt: { lt: effectiveAt } },
      { processedAt: effectiveAt, createdAt: { lt: recordedAt } },
      { processedAt: effectiveAt, createdAt: recordedAt, id: { lt: payload.id } },
    ],
  }
}

function cashDirection(type: CashDrawerTransactionType): CashPaymentHistoryRow["direction"] {
  if (CASH_IN_TYPES.has(type)) return "inflow"
  if (CASH_OUT_TYPES.has(type)) return "outflow"
  return "neutral"
}

function physicalCashImpact(type: CashDrawerTransactionType, amount: Prisma.Decimal) {
  if (type === CashDrawerTransactionType.CLOSING_BALANCE) return new Prisma.Decimal(0)
  if (CASH_IN_TYPES.has(type)) return amount
  if (CASH_OUT_TYPES.has(type)) return amount.neg()
  return new Prisma.Decimal(0)
}

const UNRESOLVED_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.PENDING,
  PaymentStatus.PARTIAL,
  PaymentStatus.CANCELLED,
])

function paymentControlState(row: PaymentRow): CashPaymentHistoryRow["controlState"] {
  if (row.reconciliationTransaction?.state === "SETTLED") return "reconciled"
  if (row.reconciliationTransaction?.state === "CONFIRMED") return "posted"
  if (row.reconciliationTransaction?.state === "FAILED" || row.reconciliationTransaction?.state === "DISPUTED") return "exception"
  if (row.reconciliationTransaction?.state === "SUSPENSE") return "suspense"
  if (row.status === PaymentStatus.PAID) return "capture"
  return "suspense"
}

function redactProviderReference(input: {
  field: string
  value: string | null
  actorPermissions: readonly string[]
}) {
  if (!input.value) return { value: null, redactions: [] as AppliedRedaction[] }
  const decision = evaluateRedaction({
    field: input.field,
    category: "payment_provider_reference",
    actorPermissions: input.actorPermissions,
  })
  if (decision.allowed) return { value: input.value, redactions: [] as AppliedRedaction[] }
  return {
    value: decision.replacement,
    redactions: [
      {
        field: input.field,
        category: decision.category,
        mode: decision.mode as "mask" | "redact",
        reasonCode: decision.reasonCode as Exclude<typeof decision.reasonCode, "ALLOWED">,
        policy: decision.policy,
      },
    ],
  }
}

function historyCompleteness(input: { accessMode: "own" | "manager" }): HistoryCompleteness {
  return {
    state: "complete",
    sources: [
      { source: "cash_drawer_transactions", state: "complete" },
      { source: "payments", state: "complete" },
      {
        source: "cashier_access_scope",
        state: "complete",
        reason:
          input.accessMode === "own"
            ? "Cashier scope is limited to the authenticated actor."
            : "Manager scope includes cross-cashier history for the tenant.",
      },
    ],
  }
}

export async function readCashPaymentHistory(
  rawInput: CashPaymentHistoryInput,
  options: CashPaymentHistoryOptions = {},
): Promise<CashPaymentHistoryResult> {
  const parsed = cashPaymentHistoryInputSchema.parse(rawInput)
  const client = options.client ?? db
  const generatedAt = (options.now ?? (() => new Date()))()
  const organization = await client.organization.findFirst({
    where: { id: parsed.organizationId, deletedAt: null, isActive: true },
    select: { id: true, timezone: true, currency: true },
  })
  if (!organization) invalidHistoryInput("Organization history scope was not found.")

  const filters = parsed.filters ?? { pageSize: 50 }
  const dateStart = filters.dateFrom ? parseCalendarDate(filters.dateFrom) : undefined
  const dateEnd = filters.dateTo ? addDay(parseCalendarDate(filters.dateTo)) : undefined
  if (dateStart && dateEnd && dateStart.getTime() >= dateEnd.getTime()) {
    invalidHistoryInput("dateFrom must not be later than dateTo.")
  }
  const effectiveAsOf = filters.effectiveAsOf ? new Date(filters.effectiveAsOf) : undefined
  if (effectiveAsOf && effectiveAsOf.getTime() > generatedAt.getTime()) {
    invalidHistoryInput("effectiveAsOf cannot be later than the response time.")
  }

  const accessCashierId = parsed.accessMode === "own" ? parsed.actorUserId : filters.cashierId
  const filterIdentity = {
    lane: filters.lane ?? "all",
    locationId: filters.locationId ?? null,
    cashierId: accessCashierId ?? null,
    paymentMethod: filters.paymentMethod ?? null,
    paymentStatus: filters.paymentStatus ?? null,
    cashType: filters.cashType ?? null,
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    effectiveAsOf: effectiveAsOf?.toISOString() ?? null,
    accessMode: parsed.accessMode,
    timezone: organization.timezone,
  }
  const filterHash = hashNormalizedHistoryFilters(filterIdentity)
  const cursorCodec = options.cursorCodec ?? configuredHistoryCursorCodec()
  const cursorPayload = filters.cursor ? cursorCodec.decode(filters.cursor) : undefined
  if (
    cursorPayload &&
    (cursorPayload.tenantId !== organization.id ||
      cursorPayload.adapterId !== CASH_PAYMENT_HISTORY_ADAPTER_ID ||
      cursorPayload.filterHash !== filterHash)
  ) {
    invalidHistoryInput("History cursor does not match the trusted tenant or filters.")
  }

  const requestedRecordedThrough = options.recordedThrough
    ? new Date(options.recordedThrough)
    : undefined
  const recordedThrough = cursorPayload
    ? new Date(cursorPayload.recordedThrough)
    : requestedRecordedThrough ?? new Date(generatedAt)
  if (recordedThrough.getTime() > generatedAt.getTime()) {
    invalidHistoryInput("History cursor knowledge cutoff is in the future.")
  }

  const createdAt: Prisma.DateTimeFilter = { lte: recordedThrough }
  if (dateStart) createdAt.gte = dateStart
  if (dateEnd) createdAt.lt = dateEnd
  if (effectiveAsOf) createdAt.lte = effectiveAsOf

  const cashBaseWhere: Prisma.CashDrawerTransactionWhereInput = {
    createdAt,
    ...(filters.cashType ? { type: filters.cashType } : {}),
    ...(accessCashierId ? { userId: accessCashierId } : {}),
    cashDrawer: {
      location: {
        organizationId: organization.id,
        ...(filters.locationId ? { id: filters.locationId } : {}),
      },
    },
  }
  const cashWhere: Prisma.CashDrawerTransactionWhereInput = cursorPayload
    ? { AND: [cashBaseWhere, cursorPredicate(cursorPayload)] }
    : cashBaseWhere

  const paymentCreatedAt: Prisma.DateTimeFilter = { lte: recordedThrough }
  if (dateStart) paymentCreatedAt.gte = dateStart
  if (dateEnd) paymentCreatedAt.lt = dateEnd
  if (effectiveAsOf) paymentCreatedAt.lte = effectiveAsOf

  const paymentBaseWhere: Prisma.PaymentWhereInput = {
    organizationId: organization.id,
    deletedAt: null,
    createdAt: paymentCreatedAt,
    ...(filters.paymentMethod ? { method: filters.paymentMethod } : {}),
    ...(filters.paymentStatus ? { status: filters.paymentStatus } : {}),
    ...(accessCashierId ? { processedById: accessCashierId } : {}),
  }
  const paymentWhere: Prisma.PaymentWhereInput = cursorPayload
    ? { AND: [paymentBaseWhere, paymentCursorPredicate(cursorPayload)] }
    : paymentBaseWhere

  const readCash = (filters.lane ?? "all") !== "payment"
  const readPayments = (filters.lane ?? "all") !== "cash"

  const [cashRows, paymentRows, cashSummaryRows, paymentSummaryRows] = await Promise.all([
    readCash
      ? client.cashDrawerTransaction.findMany({
          where: cashWhere,
          include: {
            cashDrawer: {
              include: {
                location: { select: { id: true, name: true, organizationId: true } },
                terminal: { select: { id: true, name: true } },
              },
            },
            session: { select: { id: true, sessionNumber: true, organizationId: true } },
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: filters.pageSize + 1,
        })
      : Promise.resolve([]),
    readPayments
      ? client.payment.findMany({
          where: paymentWhere,
          include: {
            processedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            salesOrder: { select: { id: true, locationId: true } },
            purchaseOrder: { select: { id: true, locationId: true } },
            reconciliationTransaction: {
              select: {
                id: true,
                state: true,
                providerReference: true,
                ledgerPostingBatchId: true,
                settledAt: true,
                confirmedAt: true,
              },
            },
          },
          orderBy: [{ processedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
          take: filters.pageSize + 1,
        })
      : Promise.resolve([]),
    readCash
      ? client.cashDrawerTransaction.findMany({
          where: cashBaseWhere,
          select: { type: true, amount: true },
        })
      : Promise.resolve([]),
    readPayments
      ? client.payment.findMany({
          where: paymentBaseWhere,
          select: { method: true, status: true, amount: true },
        })
      : Promise.resolve([]),
  ])

  const combined: CombinedRow[] = [
    ...cashRows.map((row) => ({
      lane: "cash" as const,
      row,
      effectiveAt: row.createdAt,
      recordedAt: row.createdAt,
      id: row.id,
    })),
    ...paymentRows.map((row) => ({
      lane: "payment" as const,
      row,
      effectiveAt: row.processedAt ?? row.createdAt,
      recordedAt: row.createdAt,
      id: row.id,
    })),
  ].sort((left, right) => {
    const effective = right.effectiveAt.getTime() - left.effectiveAt.getTime()
    if (effective !== 0) return effective
    const recorded = right.recordedAt.getTime() - left.recordedAt.getTime()
    if (recorded !== 0) return recorded
    return right.id.localeCompare(left.id)
  })

  const pageRows = combined.slice(0, filters.pageSize)
  const hasMore = combined.length > filters.pageSize
  const lastRow = pageRows.at(-1)
  const nextCursor =
    hasMore && lastRow
      ? cursorCodec.encode({
          v: 1,
          scope: "transaction-history",
          tenantId: organization.id,
          adapterId: CASH_PAYMENT_HISTORY_ADAPTER_ID,
          filterHash,
          recordedThrough: recordedThrough.toISOString(),
          effectiveAt: lastRow.effectiveAt.toISOString(),
          recordedAt: lastRow.recordedAt.toISOString(),
          id: lastRow.id,
        })
      : null

  const rows = pageRows.map<CashPaymentHistoryRow>((entry) => {
    if (entry.lane === "cash") {
      const amount = decimal(entry.row.amount)
      return {
        id: `cash:${entry.row.id}`,
        lane: "cash",
        sourceType: entry.row.type,
        sourceId: entry.row.id,
        amount: decimalText(amount),
        direction: cashDirection(entry.row.type),
        currency: organization.currency,
        effectiveAt: entry.effectiveAt.toISOString(),
        recordedAt: entry.recordedAt.toISOString(),
        controlState: entry.row.type === CashDrawerTransactionType.CLOSING_BALANCE ? "cash_count" : "capture",
        businessState: entry.row.type,
        location: {
          id: entry.row.cashDrawer.location.id,
          name: entry.row.cashDrawer.location.name,
        },
        cashier: { id: entry.row.user.id, name: userName(entry.row.user) },
        terminal: { id: entry.row.cashDrawer.terminal.id, name: entry.row.cashDrawer.terminal.name },
        drawer: { id: entry.row.cashDrawer.id, name: entry.row.cashDrawer.name },
        session: { id: entry.row.session?.id ?? null, number: entry.row.session?.sessionNumber ?? null },
        payment: { method: PaymentMethod.CASH, status: null, providerReference: null, redactions: [] },
        accounting: {
          physicalCashImpact: decimalText(physicalCashImpact(entry.row.type, amount)),
          electronicTenderExcluded: false,
          ledgerPostingBatchId: null,
          reconciliationState: null,
        },
        reference: {
          salesOrderId: null,
          purchaseOrderId: null,
          paymentNumber: null,
          reason: entry.row.reason,
        },
      }
    }

    const providerReference =
      entry.row.reconciliationTransaction?.providerReference ??
      entry.row.authorizationCode ??
      entry.row.mobileMoneyReference ??
      entry.row.bankReference ??
      entry.row.transactionId ??
      null
    const redacted = redactProviderReference({
      field: `payment:${entry.row.id}:providerReference`,
      value: providerReference,
      actorPermissions: parsed.actorPermissions,
    })
    const electronicTenderExcluded = ELECTRONIC_METHODS.has(entry.row.method)
    return {
      id: `payment:${entry.row.id}`,
      lane: "payment",
      sourceType: "PAYMENT",
      sourceId: entry.row.id,
      amount: decimalText(entry.row.amount),
      direction: entry.row.status === PaymentStatus.REFUNDED ? "outflow" : "inflow",
      currency: organization.currency,
      effectiveAt: entry.effectiveAt.toISOString(),
      recordedAt: entry.recordedAt.toISOString(),
      controlState: paymentControlState(entry.row),
      businessState: entry.row.status,
      location: {
        id: entry.row.salesOrder?.locationId ?? entry.row.purchaseOrder?.locationId ?? null,
        name: null,
      },
      cashier: {
        id: entry.row.processedBy?.id ?? null,
        name: userName(entry.row.processedBy),
      },
      terminal: { id: null, name: null },
      drawer: { id: null, name: null },
      session: { id: null, number: null },
      payment: {
        method: entry.row.method,
        status: entry.row.status,
        providerReference: redacted.value,
        redactions: redacted.redactions,
      },
      accounting: {
        physicalCashImpact: entry.row.method === PaymentMethod.CASH ? decimalText(entry.row.amount) : "0.00",
        electronicTenderExcluded,
        ledgerPostingBatchId: entry.row.reconciliationTransaction?.ledgerPostingBatchId ?? null,
        reconciliationState: entry.row.reconciliationTransaction?.state ?? null,
      },
      reference: {
        salesOrderId: entry.row.salesOrderId,
        purchaseOrderId: entry.row.purchaseOrderId,
        paymentNumber: entry.row.paymentNumber,
        reason: entry.row.notes,
      },
    }
  })

  const openingFloat = cashSummaryRows
    .filter((row) => row.type === CashDrawerTransactionType.OPENING_BALANCE)
    .reduce((total, row) => total.plus(decimal(row.amount)), new Prisma.Decimal(0))
  const countedCash = cashSummaryRows
    .filter((row) => row.type === CashDrawerTransactionType.CLOSING_BALANCE)
    .reduce((total, row) => total.plus(decimal(row.amount)), new Prisma.Decimal(0))
  const cashImpact = cashSummaryRows.reduce(
    (total, row) => total.plus(physicalCashImpact(row.type, decimal(row.amount))),
    new Prisma.Decimal(0),
  )
  const cashInflows = cashSummaryRows
    .filter((row) => CASH_IN_TYPES.has(row.type) && row.type !== CashDrawerTransactionType.CLOSING_BALANCE)
    .reduce((total, row) => total.plus(decimal(row.amount)), new Prisma.Decimal(0))
  const cashOutflows = cashSummaryRows
    .filter((row) => CASH_OUT_TYPES.has(row.type))
    .reduce((total, row) => total.plus(decimal(row.amount)), new Prisma.Decimal(0))
  const electronicTenderTotal = paymentSummaryRows
    .filter((row) => ELECTRONIC_METHODS.has(row.method))
    .reduce((total, row) => total.plus(decimal(row.amount)), new Prisma.Decimal(0))
  const paymentCapturedTotal = paymentSummaryRows.reduce(
    (total, row) => total.plus(decimal(row.amount)),
    new Prisma.Decimal(0),
  )
  const unresolvedPaymentCount = paymentSummaryRows.filter((row) =>
    UNRESOLVED_PAYMENT_STATUSES.has(row.status),
  ).length

  const appliedFilters: CashPaymentHistoryAppliedFilters = {
    ...filterIdentity,
    pageSize: filters.pageSize,
  }

  return {
    rows,
    pageInfo: { nextCursor, hasMore },
    appliedFilters,
    summary: {
      transactionCount: cashSummaryRows.length + paymentSummaryRows.length,
      cashEventCount: cashSummaryRows.length,
      paymentEventCount: paymentSummaryRows.length,
      openingFloat: decimalText(openingFloat),
      cashInflows: decimalText(cashInflows),
      cashOutflows: decimalText(cashOutflows),
      countedCash: decimalText(countedCash),
      expectedPhysicalCash: decimalText(cashImpact),
      cashVariance: decimalText(countedCash.minus(cashImpact)),
      electronicTenderTotal: decimalText(electronicTenderTotal),
      paymentCapturedTotal: decimalText(paymentCapturedTotal),
      unresolvedPaymentCount,
      currency: organization.currency,
    },
    snapshot: {
      ...(effectiveAsOf ? { effectiveAsOf: effectiveAsOf.toISOString() } : {}),
      recordedThrough: recordedThrough.toISOString(),
      generatedAt: generatedAt.toISOString(),
      timezone: organization.timezone,
    },
    completeness: historyCompleteness({ accessMode: parsed.accessMode }),
  }
}


