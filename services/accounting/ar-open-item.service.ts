import { LedgerEntryType, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"

type DbClient = Pick<Prisma.TransactionClient, "customer" | "customerLedgerEntry" | "salesOrder">

const RECEIVABLE_DEBIT_TYPES = new Set<LedgerEntryType>([
  LedgerEntryType.SALE,
  LedgerEntryType.DEBIT_NOTE,
  LedgerEntryType.OPENING_BALANCE,
  LedgerEntryType.ADJUSTMENT,
])

const RECEIVABLE_CREDIT_TYPES = new Set<LedgerEntryType>([
  LedgerEntryType.PAYMENT,
  LedgerEntryType.REFUND,
  LedgerEntryType.CREDIT_NOTE,
  LedgerEntryType.WRITE_OFF,
])

export type AROpenItemStatus = "open" | "partial" | "settled" | "overapplied"
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
  orderNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  openingAmount: string
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
  totalOpened: string
  totalAllocated: string
  totalOpen: string
  overdueAmount: string
}

export type AROpenItemResult = {
  items: AROpenItem[]
  summary: AROpenItemSummary
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

function itemStatus(openAmount: Prisma.Decimal) {
  if (openAmount.eq(0)) return "settled"
  if (openAmount.lt(0)) return "overapplied"
  return "partial"
}

function referenceKey(entry: { referenceType: string | null; referenceId: string | null }) {
  return `${entry.referenceType ?? "UNREFERENCED"}:${entry.referenceId ?? "UNREFERENCED"}`
}

export async function getCustomerAROpenItems(input: AROpenItemInput): Promise<AROpenItemResult> {
  const client = input.client ?? db
  const now = new Date()
  const asOf = normalizeDate(input.asOf, now)
  const recordedThrough = normalizeDate(input.recordedThrough, now)
  if (recordedThrough.getTime() > now.getTime()) {
    throw new BusinessRuleError("AR open-item recordedThrough cannot be in the future")
  }

  const [entries, salesOrders] = await Promise.all([
    client.customerLedgerEntry.findMany({
      where: {
        organizationId: input.organizationId,
        ...(input.customerId ? { customerId: input.customerId } : {}),
        entryDate: { lte: asOf },
        createdAt: { lte: recordedThrough },
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    client.salesOrder.findMany({
      where: {
        organizationId: input.organizationId,
        ...(input.customerId ? { customerId: input.customerId } : {}),
        deletedAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        dueDate: true,
        customerId: true,
        customer: { select: { paymentTerms: true } },
      },
    }),
  ])

  const orderById = new Map(salesOrders.map((order) => [order.id, order]))
  const groups = new Map<string, typeof entries>()
  for (const entry of entries) {
    const key = referenceKey(entry)
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }

  const items: AROpenItem[] = []
  for (const [key, group] of groups.entries()) {
    const [referenceType, referenceId] = key.split(":")
    const debit = group
      .filter((entry) => RECEIVABLE_DEBIT_TYPES.has(entry.type))
      .reduce((total, entry) => total.plus(money(entry.debit)), new Prisma.Decimal(0))
    const credit = group
      .filter((entry) => RECEIVABLE_CREDIT_TYPES.has(entry.type))
      .reduce((total, entry) => total.plus(money(entry.credit)), new Prisma.Decimal(0))
    if (debit.eq(0) && credit.eq(0)) continue

    const openAmount = debit.minus(credit).toDecimalPlaces(2)
    const firstEntry = group[0]
    const order = referenceType === "SALES_ORDER" && referenceId ? orderById.get(referenceId) : undefined
    const invoiceDate = order?.orderDate ?? firstEntry.entryDate
    const dueDate = order?.dueDate ?? new Date(invoiceDate.getTime() + (order?.customer.paymentTerms ?? 30) * 24 * 60 * 60 * 1000)
    const daysPastDue = openAmount.gt(0) ? daysBetween(asOf, dueDate) : 0

    items.push({
      customerId: firstEntry.customerId,
      customerName: firstEntry.customer.name,
      referenceType,
      referenceId,
      orderNumber: order?.orderNumber ?? null,
      invoiceDate: invoiceDate.toISOString(),
      dueDate: dueDate.toISOString(),
      openingAmount: moneyText(debit),
      allocatedAmount: moneyText(credit),
      openAmount: moneyText(openAmount),
      status: debit.gt(0) && credit.eq(0) ? "open" : itemStatus(openAmount),
      daysPastDue,
      agingBucket: agingBucket(daysPastDue),
      evidenceGrade: "operational",
      allocations: group
        .filter((entry) => entry.credit.gt(0))
        .map((entry) => ({
          ledgerEntryId: entry.id,
          type: entry.type,
          amount: moneyText(entry.credit),
          entryDate: entry.entryDate.toISOString(),
          recordedAt: entry.createdAt.toISOString(),
          description: entry.description,
        })),
    })
  }

  items.sort((left, right) => {
    const due = new Date(left.dueDate ?? left.invoiceDate ?? 0).getTime() - new Date(right.dueDate ?? right.invoiceDate ?? 0).getTime()
    if (due !== 0) return due
    return left.referenceId.localeCompare(right.referenceId)
  })

  const totalOpened = items.reduce((total, item) => total.plus(item.openingAmount), new Prisma.Decimal(0))
  const totalAllocated = items.reduce((total, item) => total.plus(item.allocatedAmount), new Prisma.Decimal(0))
  const totalOpen = items.reduce((total, item) => total.plus(item.openAmount), new Prisma.Decimal(0))
  const overdueAmount = items
    .filter((item) => item.daysPastDue > 0)
    .reduce((total, item) => total.plus(item.openAmount), new Prisma.Decimal(0))

  return {
    items,
    summary: {
      itemCount: items.length,
      openItemCount: items.filter((item) => item.status === "open" || item.status === "partial").length,
      settledItemCount: items.filter((item) => item.status === "settled").length,
      totalOpened: moneyText(totalOpened),
      totalAllocated: moneyText(totalAllocated),
      totalOpen: moneyText(totalOpen),
      overdueAmount: moneyText(overdueAmount),
    },
    recordedThrough: recordedThrough.toISOString(),
    asOf: asOf.toISOString(),
  }
}
