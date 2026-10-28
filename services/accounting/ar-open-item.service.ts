import {
  CustomerReceivableDocumentStatus,
  LedgerEntryType,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
} from "@/services/_shared/action-errors"

import { CUSTOMER_RECEIVABLE_REFERENCE_TYPE } from "./customer-receivable-document.service"

type DbClient = Pick<
  Prisma.TransactionClient,
  "customerReceivableDocument" | "customerLedgerEntry"
>

const RECEIVABLE_CREDIT_TYPES = new Set<LedgerEntryType>([
  LedgerEntryType.PAYMENT,
  LedgerEntryType.REFUND,
  LedgerEntryType.CREDIT_NOTE,
  LedgerEntryType.WRITE_OFF,
])


const RECEIVABLE_ALLOCATION_REVERSAL_TYPES = new Set<LedgerEntryType>([
  LedgerEntryType.PAYMENT_REVERSAL,
])
export type AROpenItemStatus =
  | "open"
  | "partial"
  | "settled"
  | "cancelled"
  | "voided"
export type AROpenItemEvidenceGrade = "operational" | "posted"

export type AROpenItemInput = {
  organizationId: string
  customerId?: string | null
  asOf?: Date | string | null
  recordedThrough?: Date | string | null
  client?: DbClient
}

export type AROpenItemAllocation = {
  ledgerEntryId: string
  type: LedgerEntryType
  amount: string
  entryDate: string
  recordedAt: string
  description: string
}

export type AROpenItem = {
  customerId: string
  customerName: string
  referenceType: string
  referenceId: string
  documentNumber: string
  documentVersion: number
  documentHash: string
  stateHash: string
  currency: string
  orderNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  openingAmount: string
  initialPaidAmount: string
  initialUnpaidAmount: string
  paidAmount: string
  allocatedAmount: string
  openAmount: string
  status: AROpenItemStatus
  daysPastDue: number
  agingBucket: "current" | "1-30" | "31-60" | "61-90" | "90+"
  evidenceGrade: AROpenItemEvidenceGrade
  allocations: AROpenItemAllocation[]
}

export type AROpenItemSummary = {
  itemCount: number
  openItemCount: number
  settledItemCount: number
  currency: string | null
  mixedCurrency: boolean
  totalOpened: string | null
  totalAllocated: string | null
  totalOpen: string | null
  overdueAmount: string | null
}

export type AROpenItemCurrencySummary = {
  currency: string
  itemCount: number
  openItemCount: number
  settledItemCount: number
  totalOpened: string
  totalAllocated: string
  totalOpen: string
  overdueAmount: string
}

export type AROpenItemResult = {
  items: AROpenItem[]
  summary: AROpenItemSummary
  summariesByCurrency: AROpenItemCurrencySummary[]
  recordedThrough: string
  asOf: string
}

function money(value: Prisma.Decimal | Prisma.Decimal.Value | null | undefined) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(2)
}

function moneyText(value: Prisma.Decimal | Prisma.Decimal.Value | null | undefined) {
  return money(value).toFixed(2)
}

function normalizeDate(value: Date | string | null | undefined, fallback: Date) {
  const date = value ? new Date(value) : fallback
  if (Number.isNaN(date.getTime())) throw new BusinessRuleError("AR open-item date is invalid")
  return date
}

function daysBetween(left: Date, right: Date) {
  const dayMs = 24 * 60 * 60 * 1000
  return Math.max(0, Math.floor((left.getTime() - right.getTime()) / dayMs))
}

function agingBucket(daysPastDue: number): AROpenItem["agingBucket"] {
  if (daysPastDue <= 0) return "current"
  if (daysPastDue <= 30) return "1-30"
  if (daysPastDue <= 60) return "31-60"
  if (daysPastDue <= 90) return "61-90"
  return "90+"
}

function itemStatus(
  status: CustomerReceivableDocumentStatus,
  paidAmount: Prisma.Decimal,
  openAmount: Prisma.Decimal,
): AROpenItemStatus {
  if (status === CustomerReceivableDocumentStatus.CANCELLED) return "cancelled"
  if (status === CustomerReceivableDocumentStatus.VOIDED) return "voided"
  if (openAmount.eq(0)) return "settled"
  if (paidAmount.eq(0)) return "open"
  return "partial"
}

function snapshotText(value: Prisma.JsonValue, key: string) {
  if (!value || Array.isArray(value) || typeof value !== "object") return null
  const candidate = value[key]
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null
}

function assertReceivableStateConservation(
  totalAmount: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
  unpaidAmount: Prisma.Decimal,
) {
  if (paidAmount.lt(0) || unpaidAmount.lt(0)) {
    throw new ConflictError("Posted receivable state contains a negative balance")
  }
  if (!paidAmount.plus(unpaidAmount).eq(totalAmount)) {
    throw new ConflictError("Posted receivable state does not conserve its document total")
  }
}

export async function getCustomerAROpenItems(input: AROpenItemInput): Promise<AROpenItemResult> {
  const client = input.client ?? db
  const now = new Date()
  const asOf = normalizeDate(input.asOf, now)
  const recordedThrough = normalizeDate(input.recordedThrough, now)
  if (recordedThrough.getTime() > now.getTime()) {
    throw new BusinessRuleError("AR open-item recordedThrough cannot be in the future")
  }

  const documents = await client.customerReceivableDocument.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.customerId ? { customerId: input.customerId } : {}),
      issuedAt: { lte: asOf },
      createdAt: { lte: recordedThrough },
    },
    include: {
      customer: { select: { name: true } },
      lifecycleStates: {
        where: {
          organizationId: input.organizationId,
          effectiveAt: { lte: asOf },
          createdAt: { lte: recordedThrough },
        },
        orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ dueDate: "asc" }, { invoiceDate: "asc" }, { id: "asc" }],
  })
  const documentIds = documents.map((document) => document.id)
  const entries = documentIds.length
    ? await client.customerLedgerEntry.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.customerId ? { customerId: input.customerId } : {}),
          referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
          referenceId: { in: documentIds },
          entryDate: { lte: asOf },
          createdAt: { lte: recordedThrough },
        },
        orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      })
    : []
  const entriesByDocumentId = new Map<string, typeof entries>()
  for (const entry of entries) {
    if (!entry.referenceId) continue
    entriesByDocumentId.set(entry.referenceId, [
      ...(entriesByDocumentId.get(entry.referenceId) ?? []),
      entry,
    ])
  }

  const items: AROpenItem[] = documents.map((document) => {
    const state = document.lifecycleStates[0]
    if (!state) {
      throw new ConflictError(
        "Posted receivable lifecycle evidence is missing for the requested boundary",
      )
    }
    const totalAmount = money(document.totalAmount)
    const paidAmount = money(state.paidAmount)
    const openAmount = money(state.unpaidAmount)
    const terminal =
      state.status === CustomerReceivableDocumentStatus.CANCELLED ||
      state.status === CustomerReceivableDocumentStatus.VOIDED
    if (!terminal) {
      assertReceivableStateConservation(totalAmount, paidAmount, openAmount)
    }
    const allocatedAmount = totalAmount.minus(openAmount).toDecimalPlaces(2)
    const daysPastDue = openAmount.gt(0)
      ? daysBetween(asOf, document.dueDate)
      : 0
    const documentEntries = entriesByDocumentId.get(document.id) ?? []

    return {
      customerId: document.customerId,
      customerName:
        snapshotText(document.customerSnapshot, "name") ??
        document.customer.name,
      referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
      referenceId: document.id,
      documentNumber: document.documentNumber,
      documentVersion: document.version,
      documentHash: document.documentHash,
      stateHash: state.stateHash,
      currency: document.currency,
      orderNumber: snapshotText(document.sourceSnapshot, "orderNumber"),
      invoiceDate: document.invoiceDate.toISOString(),
      dueDate: document.dueDate.toISOString(),
      openingAmount: moneyText(totalAmount),
      initialPaidAmount: moneyText(document.initialPaidAmount),
      initialUnpaidAmount: moneyText(document.initialUnpaidAmount),
      paidAmount: moneyText(paidAmount),
      allocatedAmount: moneyText(allocatedAmount),
      openAmount: moneyText(openAmount),
      status: itemStatus(state.status, paidAmount, openAmount),
      daysPastDue,
      agingBucket: agingBucket(daysPastDue),
      evidenceGrade: "posted",
      allocations: documentEntries
        .filter(
          (entry) =>
            RECEIVABLE_CREDIT_TYPES.has(entry.type) ||
            RECEIVABLE_ALLOCATION_REVERSAL_TYPES.has(entry.type),
        )
        .map((entry) => ({
          ledgerEntryId: entry.id,
          type: entry.type,
          amount: RECEIVABLE_ALLOCATION_REVERSAL_TYPES.has(entry.type)
            ? moneyText(money(entry.debit).negated())
            : moneyText(entry.credit),
          entryDate: entry.entryDate.toISOString(),
          recordedAt: entry.createdAt.toISOString(),
          description: entry.description,
        })),
    }
  })

  items.sort((left, right) => {
    const due = new Date(left.dueDate ?? left.invoiceDate ?? 0).getTime() - new Date(right.dueDate ?? right.invoiceDate ?? 0).getTime()
    if (due !== 0) return due
    return left.referenceId.localeCompare(right.referenceId)
  })

  const currencyGroups = new Map<string, AROpenItem[]>()
  for (const item of items) {
    const currency = item.currency.trim().toUpperCase()
    currencyGroups.set(currency, [...(currencyGroups.get(currency) ?? []), item])
  }
  const summariesByCurrency = [...currencyGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, currencyItems]): AROpenItemCurrencySummary => ({
      currency,
      itemCount: currencyItems.length,
      openItemCount: currencyItems.filter((item) => item.status === "open" || item.status === "partial").length,
      settledItemCount: currencyItems.filter((item) => item.status === "settled").length,
      totalOpened: moneyText(currencyItems.reduce((total, item) => total.plus(item.openingAmount), new Prisma.Decimal(0))),
      totalAllocated: moneyText(currencyItems.reduce((total, item) => total.plus(item.allocatedAmount), new Prisma.Decimal(0))),
      totalOpen: moneyText(currencyItems.reduce((total, item) => total.plus(item.openAmount), new Prisma.Decimal(0))),
      overdueAmount: moneyText(
        currencyItems
          .filter((item) => item.daysPastDue > 0)
          .reduce((total, item) => total.plus(item.openAmount), new Prisma.Decimal(0)),
      ),
    }))
  const singleCurrencySummary = summariesByCurrency.length === 1 ? summariesByCurrency[0] : null

  return {
    items,
    summary: {
      itemCount: items.length,
      openItemCount: items.filter((item) => item.status === "open" || item.status === "partial").length,
      settledItemCount: items.filter((item) => item.status === "settled").length,
      currency: singleCurrencySummary?.currency ?? null,
      mixedCurrency: summariesByCurrency.length > 1,
      totalOpened: singleCurrencySummary?.totalOpened ?? null,
      totalAllocated: singleCurrencySummary?.totalAllocated ?? null,
      totalOpen: singleCurrencySummary?.totalOpen ?? null,
      overdueAmount: singleCurrencySummary?.overdueAmount ?? null,
    },
    summariesByCurrency,
    recordedThrough: recordedThrough.toISOString(),
    asOf: asOf.toISOString(),
  }
}
