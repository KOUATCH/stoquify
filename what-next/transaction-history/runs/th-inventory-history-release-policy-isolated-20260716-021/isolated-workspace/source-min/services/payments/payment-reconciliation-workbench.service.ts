import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { moneyToNumber } from "@/services/pos/money"
import {
  normalizeProviderReference,
  reconcileSettlementBatch,
  type ElectronicPaymentMethod,
  type PaymentReconciliationFailure,
  type PaymentSuspenseItem,
  type SettlementPayment,
  type SettlementProviderLine,
} from "@/services/payments/payment-reconciliation.service"
import {
  paymentReconciliationWorkbenchServiceSchema,
  type PaymentReconciliationWorkbenchPeriod,
  type PaymentReconciliationWorkbenchServiceInput,
} from "@/services/payments/payment-reconciliation-workbench.schemas"

type RunStatus = "clean" | "attention" | "critical" | "no_activity"

const dayMs = 24 * 60 * 60 * 1000
const electronicRails = [
  PaymentMethod.CARD,
  PaymentMethod.MOBILE_MONEY,
  PaymentMethod.BANK_TRANSFER,
] as const

const paymentSelect = {
  id: true,
  paymentNumber: true,
  amount: true,
  method: true,
  status: true,
  authorizationCode: true,
  mobileMoneyProvider: true,
  mobileMoneyReference: true,
  mobileMoneyFeesAmount: true,
  bankName: true,
  bankReference: true,
  transactionId: true,
  processedAt: true,
  createdAt: true,
  salesOrderId: true,
  purchaseOrderId: true,
  salesOrder: {
    select: {
      orderNumber: true,
      locationId: true,
      customer: { select: { name: true } },
    },
  },
  purchaseOrder: {
    select: {
      orderNumber: true,
      locationId: true,
      supplier: { select: { name: true } },
    },
  },
} satisfies Prisma.PaymentSelect

type PaymentForWorkbench = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>

export type PaymentReconciliationLocationOption = {
  id: string
  name: string
  code: string
}

export type PaymentReconciliationRunSummary = {
  rail: ElectronicPaymentMethod
  runId: string
  settlementReference: string
  status: RunStatus
  paymentCount: number
  paidCount: number
  nonFinalCount: number
  totalAmount: number
  matchedCount: number
  matchedGrossAmount: number
  providerGrossAmount: number
  providerFeesAmount: number
  failureCount: number
  criticalFailureCount: number
  suspenseCount: number
  suspenseAmount: number
  lastPaymentAt: string | null
}

export type PaymentReconciliationFailureGroup = {
  id: string
  rail: ElectronicPaymentMethod
  type: PaymentReconciliationFailure["type"]
  severity: PaymentReconciliationFailure["severity"]
  count: number
  amount: number
  latestMessage: string
}

export type PaymentDuplicateProviderAlert = {
  id: string
  rail: ElectronicPaymentMethod
  providerName: string
  providerReference: string
  count: number
  amount: number
  paymentNumbers: string[]
  lastSeenAt: string
  severity: "critical"
}

export type PaymentSuspenseReadyFailure = {
  id: string
  rail: ElectronicPaymentMethod
  type: PaymentReconciliationFailure["type"]
  severity: PaymentReconciliationFailure["severity"]
  message: string
  amount: number
  currency: string
  providerReference: string | null
  paymentId: string | null
  paymentTransactionId: string | null
  paymentNumber: string | null
  counterparty: string
  occurredAt: string | null
  suspenseType: PaymentSuspenseItem["type"] | "pending_classification"
  suspenseAccountHint: "47x"
  readiness: "ready_for_suspense"
}

export type PaymentReconciliationWorkbenchData = {
  generatedAt: string
  organization: {
    id: string
    name: string
    currency: string
  }
  filters: {
    locationId: string | null
    period: PaymentReconciliationWorkbenchPeriod
    startDate: string
    endDate: string
  }
  source: {
    mode: "PAYMENT_CAPTURE_READ_MODEL"
    persistentRunsAvailable: false
    providerStatementPersistenceAvailable: false
  }
  locations: PaymentReconciliationLocationOption[]
  summary: {
    railCount: number
    activeRailCount: number
    cleanRunCount: number
    attentionRunCount: number
    criticalRunCount: number
    totalPayments: number
    totalAmount: number
    matchedAmount: number
    failureCount: number
    criticalFailureCount: number
    duplicateProviderReferenceCount: number
    suspenseItemCount: number
    suspenseExposure: number
    providerReferenceCoverage: number
  }
  runSummaries: PaymentReconciliationRunSummary[]
  failureGroupsByRail: PaymentReconciliationFailureGroup[]
  duplicateProviderReferenceAlerts: PaymentDuplicateProviderAlert[]
  suspenseReadyFailures: PaymentSuspenseReadyFailure[]
}

function money(value: Prisma.Decimal | Prisma.Decimal.Value | null | undefined) {
  if (value === null || value === undefined || value === "") return new Prisma.Decimal(0)
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function toNumber(value: Prisma.Decimal | Prisma.Decimal.Value | null | undefined) {
  return moneyToNumber(value)
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfQuarter(date: Date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1)
}

function resolveDateRange(
  period: PaymentReconciliationWorkbenchPeriod,
  startDate?: Date,
  endDate?: Date,
) {
  const now = new Date()

  if (period === "custom") {
    return {
      startDate: startDate ? startOfDay(startDate) : startOfDay(now),
      endDate: endDate ? endOfDay(endDate) : endOfDay(now),
    }
  }

  if (period === "yesterday") {
    const yesterday = new Date(now.getTime() - dayMs)
    return { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) }
  }

  if (period === "7d") {
    return { startDate: startOfDay(new Date(now.getTime() - 6 * dayMs)), endDate: endOfDay(now) }
  }

  if (period === "30d") {
    return { startDate: startOfDay(new Date(now.getTime() - 29 * dayMs)), endDate: endOfDay(now) }
  }

  if (period === "qtd") {
    return { startDate: startOfDay(startOfQuarter(now)), endDate: endOfDay(now) }
  }

  if (period === "ytd") {
    return { startDate: startOfDay(startOfYear(now)), endDate: endOfDay(now) }
  }

  if (period === "today") {
    return { startDate: startOfDay(now), endDate: endOfDay(now) }
  }

  return { startDate: startOfDay(startOfMonth(now)), endDate: endOfDay(now) }
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function isElectronicRail(method: PaymentMethod): method is (typeof electronicRails)[number] {
  return electronicRails.includes(method as (typeof electronicRails)[number])
}

function providerReference(payment: PaymentForWorkbench) {
  if (payment.method === PaymentMethod.CARD) {
    return normalizeProviderReference(payment.authorizationCode ?? payment.transactionId)
  }

  if (payment.method === PaymentMethod.MOBILE_MONEY) {
    return normalizeProviderReference(payment.mobileMoneyReference ?? payment.transactionId)
  }

  if (payment.method === PaymentMethod.BANK_TRANSFER) {
    return normalizeProviderReference(payment.bankReference ?? payment.transactionId)
  }

  return null
}

function providerName(payment: PaymentForWorkbench) {
  if (payment.method === PaymentMethod.CARD) return "CARD_ACQUIRER"
  if (payment.method === PaymentMethod.MOBILE_MONEY) return payment.mobileMoneyProvider ?? "MOBILE_MONEY"
  if (payment.method === PaymentMethod.BANK_TRANSFER) return payment.bankName ?? "BANK"
  return "UNKNOWN"
}

function counterparty(payment?: PaymentForWorkbench | null) {
  if (!payment) return "Unlinked"
  return payment.salesOrder?.customer.name ?? payment.purchaseOrder?.supplier.name ?? "Unlinked"
}

function toSettlementPayment(payment: PaymentForWorkbench): SettlementPayment {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    authorizationCode: payment.authorizationCode,
    mobileMoneyProvider: payment.mobileMoneyProvider,
    mobileMoneyReference: payment.mobileMoneyReference,
    bankReference: payment.bankReference,
    bankName: payment.bankName,
    transactionId: payment.transactionId,
    processedAt: payment.processedAt,
  }
}

function toProviderLine(payment: PaymentForWorkbench): SettlementProviderLine | null {
  const reference = providerReference(payment)
  if (!reference) return null

  return {
    id: `capture-${payment.id}`,
    providerReference: reference,
    amount: payment.amount,
    occurredAt: payment.processedAt ?? payment.createdAt,
    providerStatus: payment.status,
    feesAmount: payment.mobileMoneyFeesAmount ?? 0,
  }
}

function runStatus(paymentCount: number, failures: PaymentReconciliationFailure[]): RunStatus {
  if (paymentCount === 0) return "no_activity"
  if (failures.some((failure) => failure.severity === "critical")) return "critical"
  if (failures.length > 0) return "attention"
  return "clean"
}

function suspenseAmount(items: PaymentSuspenseItem[]) {
  return items.reduce((total, item) => total + Number(item.amount), 0)
}

function sortFailures(
  left: PaymentSuspenseReadyFailure,
  right: PaymentSuspenseReadyFailure,
) {
  if (left.severity !== right.severity) return left.severity === "critical" ? -1 : 1
  return right.amount - left.amount
}

function buildDuplicateAlerts(
  payments: PaymentForWorkbench[],
): PaymentDuplicateProviderAlert[] {
  const groups = new Map<string, PaymentForWorkbench[]>()

  for (const payment of payments) {
    if (!isElectronicRail(payment.method)) continue
    const reference = providerReference(payment)
    if (!reference) continue

    const key = `${payment.method}:${providerName(payment)}:${reference}`
    const rows = groups.get(key) ?? []
    rows.push(payment)
    groups.set(key, rows)
  }

  return Array.from(groups.entries())
    .flatMap(([key, rows]) => {
      if (rows.length < 2) return []
      const [rail, name, reference] = key.split(":")
      const latest = rows.reduce((current, row) =>
        row.createdAt > current.createdAt ? row : current,
      rows[0])

      return [
        {
          id: `duplicate-${key}`,
          rail: rail as ElectronicPaymentMethod,
          providerName: name,
          providerReference: reference,
          count: rows.length,
          amount: rows.reduce((total, row) => total + toNumber(row.amount), 0),
          paymentNumbers: rows.map((row) => row.paymentNumber),
          lastSeenAt: latest.createdAt.toISOString(),
          severity: "critical" as const,
        },
      ]
    })
    .sort((left, right) => right.amount - left.amount)
}

function addFailureGroup(
  groups: Map<string, PaymentReconciliationFailureGroup>,
  rail: ElectronicPaymentMethod,
  failure: PaymentReconciliationFailure,
  amount: number,
) {
  const id = `${rail}-${failure.type}`
  const current = groups.get(id)

  if (!current) {
    groups.set(id, {
      id,
      rail: rail as ElectronicPaymentMethod,
      type: failure.type,
      severity: failure.severity,
      count: 1,
      amount,
      latestMessage: failure.message,
    })
    return
  }

  current.count += 1
  current.amount += amount
  current.latestMessage = failure.message
  if (failure.severity === "critical") current.severity = "critical"
}

export async function getPaymentReconciliationWorkbench(
  rawInput: PaymentReconciliationWorkbenchServiceInput,
): Promise<PaymentReconciliationWorkbenchData> {
  const input = paymentReconciliationWorkbenchServiceSchema.parse(rawInput)
  const range = resolveDateRange(input.period, input.startDate, input.endDate)

  if (range.endDate < range.startDate) {
    throw new BusinessRuleError("End date must be after start date")
  }

  const paymentLocationCondition: Prisma.PaymentWhereInput = input.locationId
    ? {
        OR: [
          { salesOrder: { locationId: input.locationId } },
          { purchaseOrder: { locationId: input.locationId } },
        ],
      }
    : {}

  const [organization, locations, payments] = await Promise.all([
    db.organization.findFirst({
      where: { id: input.organizationId, isActive: true, deletedAt: null },
      select: { id: true, name: true, currency: true },
    }),
    db.location.findMany({
      where: { organizationId: input.organizationId, isActive: true, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, code: true },
    }),
    db.payment.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        method: { in: [...electronicRails] },
        createdAt: { gte: range.startDate, lte: range.endDate },
        ...paymentLocationCondition,
      },
      select: paymentSelect,
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ])

  if (!organization) {
    throw new NotFoundError("Organization not found")
  }

  const currency = organization.currency || "XAF"
  const runSummaries: PaymentReconciliationRunSummary[] = []
  const failureGroups = new Map<string, PaymentReconciliationFailureGroup>()
  const suspenseReadyFailures: PaymentSuspenseReadyFailure[] = []

  for (const rail of electronicRails) {
    const railPayments = payments.filter((payment) => payment.method === rail)
    const paymentById = new Map(railPayments.map((payment) => [payment.id, payment]))
    const result = reconcileSettlementBatch({
      organizationId: input.organizationId,
      rail: rail as ElectronicPaymentMethod,
      settlementBatchId: `capture-readiness-${rail}-${dateKey(range.startDate)}-${dateKey(range.endDate)}`,
      settlementReference: `CAPTURE-${rail}-${dateKey(range.startDate)}-${dateKey(range.endDate)}`,
      currency,
      payments: railPayments.map(toSettlementPayment),
      providerLines: railPayments.flatMap((payment) => {
        const line = toProviderLine(payment)
        return line ? [line] : []
      }),
    })

    const paidCount = railPayments.filter((payment) => payment.status === PaymentStatus.PAID).length
    const latestPayment = railPayments[0] ?? null
    const suspenseTotal = suspenseAmount(result.suspenseItems)

    runSummaries.push({
      rail: rail as ElectronicPaymentMethod,
      runId: result.settlementBatchId,
      settlementReference: result.settlementReference,
      status: runStatus(railPayments.length, result.failures),
      paymentCount: railPayments.length,
      paidCount,
      nonFinalCount: railPayments.length - paidCount,
      totalAmount: railPayments.reduce((total, payment) => total + toNumber(payment.amount), 0),
      matchedCount: result.matchedCount,
      matchedGrossAmount: Number(result.matchedGrossAmount),
      providerGrossAmount: Number(result.providerGrossAmount),
      providerFeesAmount: Number(result.providerFeesAmount),
      failureCount: result.failures.length,
      criticalFailureCount: result.failures.filter((failure) => failure.severity === "critical").length,
      suspenseCount: result.suspenseItems.length,
      suspenseAmount: suspenseTotal,
      lastPaymentAt: latestPayment?.createdAt.toISOString() ?? null,
    })

    result.failures.forEach((failure, index) => {
      const suspense = result.suspenseItems[index] ?? null
      const payment = failure.paymentId ? paymentById.get(failure.paymentId) : null
      const amount = suspense ? Number(suspense.amount) : 0

      addFailureGroup(failureGroups, rail as ElectronicPaymentMethod, failure, amount)
      suspenseReadyFailures.push({
        id: `${result.settlementBatchId}-${failure.type}-${index}`,
        rail: rail as ElectronicPaymentMethod,
        type: failure.type,
        severity: failure.severity,
        message: failure.message,
        amount,
        currency,
        providerReference: failure.providerReference ?? suspense?.providerReference ?? null,
        paymentId: failure.paymentId ?? null,
        paymentTransactionId: payment?.transactionId ?? null,
        paymentNumber: payment?.paymentNumber ?? null,
        counterparty: counterparty(payment),
        occurredAt: payment?.createdAt.toISOString() ?? null,
        suspenseType: suspense?.type ?? "pending_classification",
        suspenseAccountHint: "47x",
        readiness: "ready_for_suspense",
      })
    })
  }

  const duplicateProviderReferenceAlerts = buildDuplicateAlerts(payments)
  const failureRows = suspenseReadyFailures.sort(sortFailures)
  const totalPaymentCount = payments.length
  const missingReferenceCount = failureRows.filter((failure) => failure.type === "MISSING_PROVIDER_REFERENCE").length
  const activeRunCount = runSummaries.filter((run) => run.paymentCount > 0).length

  return {
    generatedAt: new Date().toISOString(),
    organization,
    filters: {
      locationId: input.locationId ?? null,
      period: input.period,
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
    },
    source: {
      mode: "PAYMENT_CAPTURE_READ_MODEL",
      persistentRunsAvailable: false,
      providerStatementPersistenceAvailable: false,
    },
    locations,
    summary: {
      railCount: electronicRails.length,
      activeRailCount: activeRunCount,
      cleanRunCount: runSummaries.filter((run) => run.status === "clean").length,
      attentionRunCount: runSummaries.filter((run) => run.status === "attention").length,
      criticalRunCount: runSummaries.filter((run) => run.status === "critical").length,
      totalPayments: totalPaymentCount,
      totalAmount: payments.reduce((total, payment) => total + toNumber(payment.amount), 0),
      matchedAmount: runSummaries.reduce((total, run) => total + run.matchedGrossAmount, 0),
      failureCount: failureRows.length,
      criticalFailureCount: failureRows.filter((failure) => failure.severity === "critical").length,
      duplicateProviderReferenceCount: duplicateProviderReferenceAlerts.length,
      suspenseItemCount: failureRows.length,
      suspenseExposure: failureRows.reduce((total, failure) => total + failure.amount, 0),
      providerReferenceCoverage:
        totalPaymentCount === 0
          ? 100
          : Math.max(0, Math.round(((totalPaymentCount - missingReferenceCount) / totalPaymentCount) * 100)),
    },
    runSummaries,
    failureGroupsByRail: Array.from(failureGroups.values()).sort((left, right) => {
      if (left.severity !== right.severity) return left.severity === "critical" ? -1 : 1
      return right.amount - left.amount
    }),
    duplicateProviderReferenceAlerts,
    suspenseReadyFailures: failureRows,
  }
}
