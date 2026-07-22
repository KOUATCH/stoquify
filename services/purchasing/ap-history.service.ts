import {
  PaymentMethod,
  SupplierInvoiceStatus,
  SupplierPaymentStatus,
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
import { apHistoryInputSchema, type APHistoryInput } from "./ap-history.schemas"

const AP_HISTORY_ADAPTER_ID = "supplier-ap-history.v1"

type APHistoryClient = Pick<
  Prisma.TransactionClient,
  "organization" | "supplierInvoice" | "supplierPayment"
>

export type APHistoryOptions = {
  client?: APHistoryClient
  cursorCodec?: HistoryCursorCodec
  now?: () => Date
  recordedThrough?: Date
}

export type APHistoryAppliedFilters = {
  lane: "invoice" | "payment" | "all"
  supplierId: string | null
  invoiceStatus: SupplierInvoiceStatus | null
  paymentStatus: SupplierPaymentStatus | null
  paymentMethod: PaymentMethod | null
  dateFrom: string | null
  dateTo: string | null
  effectiveAsOf: string | null
  timezone: string
  pageSize: 25 | 50 | 100
}

export type APHistoryRow = {
  id: string
  lane: "invoice" | "payment"
  sourceType: "SUPPLIER_INVOICE" | "SUPPLIER_PAYMENT"
  sourceId: string
  supplier: { id: string; name: string }
  amount: string
  signedPayableMovement: string
  currency: string
  effectiveAt: string
  recordedAt: string
  controlState: "draft" | "matched" | "posted" | "payment_pending" | "paid" | "released" | "exception" | "cancelled"
  businessState: string
  reference: {
    invoiceNumber: string | null
    paymentNumber: string | null
    purchaseOrderId: string | null
    dueDate: string | null
    notes: string | null
  }
  accounting: {
    ledgerPostingBatchId: string | null
    postedBusinessEventId: string | null
    documentHash: string | null
    evidenceHash: string | null
  }
  payment: {
    method: PaymentMethod | null
    bankDestination: string | null
    redactions: AppliedRedaction[]
  }
}

export type APHistorySummary = {
  transactionCount: number
  invoiceCount: number
  paymentCount: number
  invoiceTotal: string
  paidTotal: string
  releasedPaymentTotal: string
  openPayable: string
  postedInvoiceCount: number
  releasedPaymentCount: number
  ledgerBlockerCount: number
  currency: string
}

export type APHistoryResult = TransactionHistoryResult<
  APHistoryRow,
  APHistorySummary,
  APHistoryAppliedFilters
>

type InvoiceRow = Prisma.SupplierInvoiceGetPayload<{
  include: { supplier: { select: { id: true; name: true } } }
}>

type PaymentRow = Prisma.SupplierPaymentGetPayload<{
  include: {
    supplier: { select: { id: true; name: true } }
    bankAccount: {
      select: {
        accountNumberMasked: true
        mobileMoneyPhoneMasked: true
        bankName: true
        mobileMoneyProvider: true
      }
    }
  }
}>

type CombinedRow =
  | { lane: "invoice"; row: InvoiceRow; effectiveAt: Date; recordedAt: Date; id: string }
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

function historyCompleteness(): HistoryCompleteness {
  return {
    state: "complete",
    sources: [
      { source: "supplier_invoices", state: "complete" },
      { source: "supplier_payments", state: "complete" },
      {
        source: "supplier_ap_history_accounting_claim",
        state: "partial",
        reason:
          "Rows are service-owned AP operational history. Reconciled/system-certified AP claims still require Stage 07 release fixtures and close-control tie-out evidence.",
      },
    ],
  }
}

function invoiceCursorPredicate(payload: { effectiveAt: string; recordedAt: string; id: string }) {
  const effectiveAt = new Date(payload.effectiveAt)
  const recordedAt = new Date(payload.recordedAt)
  return {
    OR: [
      { invoiceDate: { lt: effectiveAt } },
      { invoiceDate: effectiveAt, createdAt: { lt: recordedAt } },
      { invoiceDate: effectiveAt, createdAt: recordedAt, id: { lt: payload.id } },
    ],
  }
}

function paymentCursorPredicate(payload: { effectiveAt: string; recordedAt: string; id: string }) {
  const effectiveAt = new Date(payload.effectiveAt)
  const recordedAt = new Date(payload.recordedAt)
  return {
    OR: [
      { paymentDate: { lt: effectiveAt } },
      { paymentDate: effectiveAt, createdAt: { lt: recordedAt } },
      { paymentDate: effectiveAt, createdAt: recordedAt, id: { lt: payload.id } },
    ],
  }
}

const RELEASED_PAYMENT_STATUSES = new Set<SupplierPaymentStatus>([
  SupplierPaymentStatus.RELEASED,
  SupplierPaymentStatus.POSTED,
])

const POSTED_INVOICE_STATUSES = new Set<SupplierInvoiceStatus>([
  SupplierInvoiceStatus.POSTED,
  SupplierInvoiceStatus.PAYMENT_PENDING,
  SupplierInvoiceStatus.PAID,
])

function invoiceControlState(status: SupplierInvoiceStatus): APHistoryRow["controlState"] {
  if (status === SupplierInvoiceStatus.DRAFT) return "draft"
  if (status === SupplierInvoiceStatus.MATCHED) return "matched"
  if (status === SupplierInvoiceStatus.POSTED) return "posted"
  if (status === SupplierInvoiceStatus.PAYMENT_PENDING) return "payment_pending"
  if (status === SupplierInvoiceStatus.PAID) return "paid"
  if (status === SupplierInvoiceStatus.DISPUTED) return "exception"
  return "cancelled"
}

function paymentControlState(status: SupplierPaymentStatus): APHistoryRow["controlState"] {
  if (status === SupplierPaymentStatus.RELEASED || status === SupplierPaymentStatus.POSTED) return "released"
  if (status === SupplierPaymentStatus.FAILED) return "exception"
  if (status === SupplierPaymentStatus.CANCELLED) return "cancelled"
  return "draft"
}

function redactBankDestination(input: {
  row: PaymentRow
  actorPermissions: readonly string[]
}) {
  const account = input.row.bankAccount
  const value = account
    ? [account.bankName ?? account.mobileMoneyProvider, account.accountNumberMasked ?? account.mobileMoneyPhoneMasked]
        .filter(Boolean)
        .join(" ")
        .trim() || null
    : null
  if (!value) return { value: null, redactions: [] as AppliedRedaction[] }
  const decision = evaluateRedaction({
    field: `supplierPayment:${input.row.id}:bankDestination`,
    category: "supplier_bank_detail",
    actorPermissions: input.actorPermissions,
  })
  if (decision.allowed) return { value, redactions: [] as AppliedRedaction[] }
  return {
    value: decision.replacement,
    redactions: [
      {
        field: `supplierPayment:${input.row.id}:bankDestination`,
        category: decision.category,
        mode: decision.mode as "mask" | "redact",
        reasonCode: decision.reasonCode as Exclude<typeof decision.reasonCode, "ALLOWED">,
        policy: decision.policy,
      },
    ],
  }
}

export async function readAPHistory(
  rawInput: APHistoryInput,
  options: APHistoryOptions = {},
): Promise<APHistoryResult> {
  const parsed = apHistoryInputSchema.parse(rawInput)
  const client = options.client ?? db
  const generatedAt = (options.now ?? (() => new Date()))()
  const organization = await client.organization.findFirst({
    where: { id: parsed.organizationId, deletedAt: null, isActive: true },
    select: { id: true, timezone: true, currency: true },
  })
  if (!organization) invalidHistoryInput("Organization AP history scope was not found.")

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

  const filterIdentity = {
    lane: filters.lane ?? "all",
    supplierId: filters.supplierId ?? null,
    invoiceStatus: filters.invoiceStatus ?? null,
    paymentStatus: filters.paymentStatus ?? null,
    paymentMethod: filters.paymentMethod ?? null,
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    effectiveAsOf: effectiveAsOf?.toISOString() ?? null,
    timezone: organization.timezone,
  }
  const filterHash = hashNormalizedHistoryFilters(filterIdentity)
  const cursorCodec = options.cursorCodec ?? configuredHistoryCursorCodec()
  const cursorPayload = filters.cursor ? cursorCodec.decode(filters.cursor) : undefined
  if (
    cursorPayload &&
    (cursorPayload.tenantId !== organization.id ||
      cursorPayload.adapterId !== AP_HISTORY_ADAPTER_ID ||
      cursorPayload.filterHash !== filterHash)
  ) {
    invalidHistoryInput("AP history cursor does not match the trusted tenant or filters.")
  }

  const recordedThrough = cursorPayload
    ? new Date(cursorPayload.recordedThrough)
    : options.recordedThrough
      ? new Date(options.recordedThrough)
      : new Date(generatedAt)
  if (recordedThrough.getTime() > generatedAt.getTime()) {
    invalidHistoryInput("AP history knowledge cutoff is in the future.")
  }

  const invoiceDate: Prisma.DateTimeFilter = { lte: recordedThrough }
  if (dateStart) invoiceDate.gte = dateStart
  if (dateEnd) invoiceDate.lt = dateEnd
  if (effectiveAsOf) invoiceDate.lte = effectiveAsOf

  const paymentDate: Prisma.DateTimeFilter = { lte: recordedThrough }
  if (dateStart) paymentDate.gte = dateStart
  if (dateEnd) paymentDate.lt = dateEnd
  if (effectiveAsOf) paymentDate.lte = effectiveAsOf

  const invoiceBaseWhere: Prisma.SupplierInvoiceWhereInput = {
    organizationId: organization.id,
    deletedAt: null,
    invoiceDate,
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.invoiceStatus ? { status: filters.invoiceStatus } : {}),
  }
  const paymentBaseWhere: Prisma.SupplierPaymentWhereInput = {
    organizationId: organization.id,
    deletedAt: null,
    paymentDate,
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.paymentStatus ? { status: filters.paymentStatus } : {}),
    ...(filters.paymentMethod ? { method: filters.paymentMethod } : {}),
  }
  const invoiceWhere: Prisma.SupplierInvoiceWhereInput = cursorPayload
    ? { AND: [invoiceBaseWhere, invoiceCursorPredicate(cursorPayload)] }
    : invoiceBaseWhere
  const paymentWhere: Prisma.SupplierPaymentWhereInput = cursorPayload
    ? { AND: [paymentBaseWhere, paymentCursorPredicate(cursorPayload)] }
    : paymentBaseWhere

  const readInvoices = (filters.lane ?? "all") !== "payment"
  const readPayments = (filters.lane ?? "all") !== "invoice"

  const [invoiceRows, paymentRows, invoiceSummaryRows, paymentSummaryRows] = await Promise.all([
    readInvoices
      ? client.supplierInvoice.findMany({
          where: invoiceWhere,
          include: { supplier: { select: { id: true, name: true } } },
          orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
          take: filters.pageSize + 1,
        })
      : Promise.resolve([]),
    readPayments
      ? client.supplierPayment.findMany({
          where: paymentWhere,
          include: {
            supplier: { select: { id: true, name: true } },
            bankAccount: {
              select: {
                accountNumberMasked: true,
                mobileMoneyPhoneMasked: true,
                bankName: true,
                mobileMoneyProvider: true,
              },
            },
          },
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
          take: filters.pageSize + 1,
        })
      : Promise.resolve([]),
    readInvoices
      ? client.supplierInvoice.findMany({
          where: invoiceBaseWhere,
          select: { status: true, total: true, amountPaid: true, ledgerPostingBatchId: true },
        })
      : Promise.resolve([]),
    readPayments
      ? client.supplierPayment.findMany({
          where: paymentBaseWhere,
          select: { status: true, amount: true, ledgerPostingBatchId: true },
        })
      : Promise.resolve([]),
  ])

  const combined: CombinedRow[] = [
    ...invoiceRows.map((row) => ({
      lane: "invoice" as const,
      row,
      effectiveAt: row.invoiceDate,
      recordedAt: row.createdAt,
      id: row.id,
    })),
    ...paymentRows.map((row) => ({
      lane: "payment" as const,
      row,
      effectiveAt: row.paymentDate,
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
          adapterId: AP_HISTORY_ADAPTER_ID,
          filterHash,
          recordedThrough: recordedThrough.toISOString(),
          effectiveAt: lastRow.effectiveAt.toISOString(),
          recordedAt: lastRow.recordedAt.toISOString(),
          id: lastRow.id,
        })
      : null

  const rows = pageRows.map<APHistoryRow>((entry) => {
    if (entry.lane === "invoice") {
      const total = decimal(entry.row.total)
      return {
        id: `supplier-invoice:${entry.row.id}`,
        lane: "invoice",
        sourceType: "SUPPLIER_INVOICE",
        sourceId: entry.row.id,
        supplier: entry.row.supplier,
        amount: decimalText(total),
        signedPayableMovement: decimalText(total),
        currency: entry.row.currency,
        effectiveAt: entry.effectiveAt.toISOString(),
        recordedAt: entry.recordedAt.toISOString(),
        controlState: invoiceControlState(entry.row.status),
        businessState: entry.row.status,
        reference: {
          invoiceNumber: entry.row.invoiceNumber,
          paymentNumber: null,
          purchaseOrderId: entry.row.purchaseOrderId,
          dueDate: entry.row.dueDate?.toISOString() ?? null,
          notes: entry.row.notes,
        },
        accounting: {
          ledgerPostingBatchId: entry.row.ledgerPostingBatchId,
          postedBusinessEventId: entry.row.postedBusinessEventId,
          documentHash: entry.row.documentHash,
          evidenceHash: entry.row.evidenceHash,
        },
        payment: { method: null, bankDestination: null, redactions: [] },
      }
    }

    const amount = decimal(entry.row.amount)
    const bank = redactBankDestination({ row: entry.row, actorPermissions: parsed.actorPermissions })
    return {
      id: `supplier-payment:${entry.row.id}`,
      lane: "payment",
      sourceType: "SUPPLIER_PAYMENT",
      sourceId: entry.row.id,
      supplier: entry.row.supplier,
      amount: decimalText(amount),
      signedPayableMovement: decimalText(amount.neg()),
      currency: entry.row.currency,
      effectiveAt: entry.effectiveAt.toISOString(),
      recordedAt: entry.recordedAt.toISOString(),
      controlState: paymentControlState(entry.row.status),
      businessState: entry.row.status,
      reference: {
        invoiceNumber: null,
        paymentNumber: entry.row.paymentNumber,
        purchaseOrderId: null,
        dueDate: null,
        notes: entry.row.notes,
      },
      accounting: {
        ledgerPostingBatchId: entry.row.ledgerPostingBatchId,
        postedBusinessEventId: entry.row.postedBusinessEventId,
        documentHash: entry.row.documentHash,
        evidenceHash: entry.row.evidenceHash,
      },
      payment: {
        method: entry.row.method,
        bankDestination: bank.value,
        redactions: bank.redactions,
      },
    }
  })

  const invoiceTotal = invoiceSummaryRows.reduce(
    (total, row) => total.plus(decimal(row.total)),
    new Prisma.Decimal(0),
  )
  const paidTotal = invoiceSummaryRows.reduce(
    (total, row) => total.plus(decimal(row.amountPaid)),
    new Prisma.Decimal(0),
  )
  const releasedPaymentTotal = paymentSummaryRows
    .filter((row) => RELEASED_PAYMENT_STATUSES.has(row.status))
    .reduce((total, row) => total.plus(decimal(row.amount)), new Prisma.Decimal(0))
  const postedInvoiceCount = invoiceSummaryRows.filter((row) =>
    POSTED_INVOICE_STATUSES.has(row.status),
  ).length
  const releasedPaymentCount = paymentSummaryRows.filter((row) =>
    RELEASED_PAYMENT_STATUSES.has(row.status),
  ).length
  const ledgerBlockerCount =
    invoiceSummaryRows.filter((row) =>
      POSTED_INVOICE_STATUSES.has(row.status) &&
      !row.ledgerPostingBatchId,
    ).length +
    paymentSummaryRows.filter((row) =>
      RELEASED_PAYMENT_STATUSES.has(row.status) && !row.ledgerPostingBatchId,
    ).length

  return {
    rows,
    pageInfo: { nextCursor, hasMore },
    appliedFilters: {
      ...filterIdentity,
      pageSize: filters.pageSize,
    },
    summary: {
      transactionCount: invoiceSummaryRows.length + paymentSummaryRows.length,
      invoiceCount: invoiceSummaryRows.length,
      paymentCount: paymentSummaryRows.length,
      invoiceTotal: decimalText(invoiceTotal),
      paidTotal: decimalText(paidTotal),
      releasedPaymentTotal: decimalText(releasedPaymentTotal),
      openPayable: decimalText(invoiceTotal.minus(paidTotal)),
      postedInvoiceCount,
      releasedPaymentCount,
      ledgerBlockerCount,
      currency: organization.currency,
    },
    snapshot: {
      ...(effectiveAsOf ? { effectiveAsOf: effectiveAsOf.toISOString() } : {}),
      recordedThrough: recordedThrough.toISOString(),
      generatedAt: generatedAt.toISOString(),
      timezone: organization.timezone,
    },
    completeness: historyCompleteness(),
  }
}
