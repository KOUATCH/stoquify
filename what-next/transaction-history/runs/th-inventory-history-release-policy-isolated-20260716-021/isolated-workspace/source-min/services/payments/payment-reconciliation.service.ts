import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"

import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"

export type ElectronicPaymentMethod =
  | "CARD"
  | "MOBILE_MONEY"
  | "BANK_TRANSFER"

export type ProviderCaptureCandidate = {
  organizationId: string
  paymentMethod: PaymentMethod | string
  reference?: string | null
  authorizationCode?: string | null
  mobileMoneyProvider?: string | null
  bankName?: string | null
  excludePaymentId?: string | null
}

export type ProviderCaptureEvidence = {
  organizationId: string
  paymentMethod: ElectronicPaymentMethod
  providerReference: string
  providerReferenceField: "authorizationCode" | "mobileMoneyReference" | "bankReference"
  providerName?: string | null
}

export type SettlementPayment = {
  id: string
  paymentNumber?: string | null
  amount: Prisma.Decimal | Prisma.Decimal.Value
  method: PaymentMethod | string
  status: PaymentStatus | string
  authorizationCode?: string | null
  mobileMoneyProvider?: string | null
  mobileMoneyReference?: string | null
  bankReference?: string | null
  bankName?: string | null
  transactionId?: string | null
  processedAt?: Date | string | null
}

export type SettlementProviderLine = {
  id: string
  providerReference: string
  amount: Prisma.Decimal | Prisma.Decimal.Value
  occurredAt?: Date | string | null
  providerStatus?: string | null
  feesAmount?: Prisma.Decimal | Prisma.Decimal.Value | null
}

export type ReconciliationFailureType =
  | "MISSING_PROVIDER_REFERENCE"
  | "DUPLICATE_INTERNAL_PROVIDER_REFERENCE"
  | "DUPLICATE_PROVIDER_SETTLEMENT_REFERENCE"
  | "NON_FINAL_PAYMENT_STATUS"
  | "MISSING_PROVIDER_SETTLEMENT"
  | "UNMATCHED_PROVIDER_REFERENCE"
  | "AMOUNT_MISMATCH"
  | "SETTLEMENT_GROSS_MISMATCH"
  | "SETTLEMENT_FEE_MISMATCH"

export type PaymentReconciliationFailure = {
  type: ReconciliationFailureType
  severity: "high" | "critical"
  message: string
  providerReference?: string | null
  paymentId?: string | null
  providerLineId?: string | null
  metadata?: Record<string, unknown>
}

export type PaymentSuspenseItem = {
  type:
    | "duplicate_provider_id"
    | "missing_provider_reference"
    | "missing_settlement_line"
    | "unmatched_provider_line"
    | "amount_mismatch"
    | "settlement_shortfall"
    | "fee_deviation"
  severity: "high" | "critical"
  amount: string
  currency: string
  providerReference?: string | null
  evidence: Record<string, unknown>
}

export type SettlementBatchInput = {
  organizationId: string
  rail: ElectronicPaymentMethod
  settlementBatchId: string
  settlementReference: string
  currency?: string | null
  settlementGrossAmount?: Prisma.Decimal | Prisma.Decimal.Value | null
  expectedFeesAmount?: Prisma.Decimal | Prisma.Decimal.Value | null
  payments: SettlementPayment[]
  providerLines: SettlementProviderLine[]
}

export type PaymentReconciliationResult = {
  organizationId: string
  rail: ElectronicPaymentMethod
  settlementBatchId: string
  settlementReference: string
  currency: string
  isClean: boolean
  matchedCount: number
  matchedGrossAmount: string
  providerGrossAmount: string
  providerFeesAmount: string
  failures: PaymentReconciliationFailure[]
  suspenseItems: PaymentSuspenseItem[]
}

const ELECTRONIC_METHODS = new Set<string>([
  PaymentMethod.CARD,
  PaymentMethod.MOBILE_MONEY,
  PaymentMethod.BANK_TRANSFER,
])

function money(value: Prisma.Decimal | Prisma.Decimal.Value | null | undefined) {
  if (value === null || value === undefined || value === "") return new Prisma.Decimal(0)
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function formatMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2)
}

export function normalizeProviderReference(value?: string | null) {
  const normalized = value?.trim().toUpperCase()
  return normalized || null
}

export function resolveProviderCaptureEvidence(
  input: ProviderCaptureCandidate,
): ProviderCaptureEvidence | null {
  const method = input.paymentMethod
  if (!ELECTRONIC_METHODS.has(method)) return null

  if (method === PaymentMethod.CARD) {
    const providerReference = normalizeProviderReference(input.authorizationCode ?? input.reference)
    if (!providerReference) {
      throw new BusinessRuleError("Card payments require an acquirer authorization or transaction reference")
    }

    return {
      organizationId: input.organizationId,
      paymentMethod: PaymentMethod.CARD,
      providerReference,
      providerReferenceField: "authorizationCode",
      providerName: "CARD_ACQUIRER",
    }
  }

  if (method === PaymentMethod.MOBILE_MONEY) {
    const providerReference = normalizeProviderReference(input.reference)
    if (!providerReference) {
      throw new BusinessRuleError("Mobile money payments require the provider transaction reference")
    }
    if (!input.mobileMoneyProvider) {
      throw new BusinessRuleError("Mobile money payments require the provider name")
    }

    return {
      organizationId: input.organizationId,
      paymentMethod: PaymentMethod.MOBILE_MONEY,
      providerReference,
      providerReferenceField: "mobileMoneyReference",
      providerName: input.mobileMoneyProvider,
    }
  }

  const providerReference = normalizeProviderReference(input.reference)
  if (!providerReference) {
    throw new BusinessRuleError("Bank transfer payments require the bank transaction reference")
  }

  return {
    organizationId: input.organizationId,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    providerReference,
    providerReferenceField: "bankReference",
    providerName: input.bankName ?? "BANK",
  }
}

export function assertUniqueProviderCaptureReferences(captures: Array<ProviderCaptureEvidence | null>) {
  const seen = new Map<string, ProviderCaptureEvidence>()

  for (const capture of captures) {
    if (!capture) continue

    const key = `${capture.paymentMethod}:${capture.providerName ?? ""}:${capture.providerReference}`
    const existing = seen.get(key)
    if (existing) {
      throw new ConflictError(
        `Duplicate ${capture.paymentMethod.toLowerCase()} provider reference ${capture.providerReference} in the same sale`,
      )
    }
    seen.set(key, capture)
  }
}

export async function assertNoDuplicateProviderCapture(
  tx: Prisma.TransactionClient,
  input: ProviderCaptureEvidence & { excludePaymentId?: string | null },
) {
  const providerReference = normalizeProviderReference(input.providerReference)
  if (!providerReference) return null
  const providerReferenceFilters: Prisma.PaymentWhereInput[] = [{ transactionId: providerReference }]

  if (input.providerReferenceField === "authorizationCode") {
    providerReferenceFilters.push({ authorizationCode: providerReference })
  }
  if (input.providerReferenceField === "mobileMoneyReference") {
    providerReferenceFilters.push({ mobileMoneyReference: providerReference })
  }
  if (input.providerReferenceField === "bankReference") {
    providerReferenceFilters.push({ bankReference: providerReference })
  }

  const existing = await tx.payment.findFirst({
    where: {
      organizationId: input.organizationId,
      method: input.paymentMethod,
      deletedAt: null,
      ...(input.excludePaymentId ? { id: { not: input.excludePaymentId } } : {}),
      OR: providerReferenceFilters,
    },
    select: { id: true, paymentNumber: true },
  })

  if (existing) {
    throw new ConflictError(
      `Provider reference ${providerReference} has already been captured by payment ${existing.paymentNumber}`,
    )
  }

  return input
}

function paymentProviderReference(payment: SettlementPayment) {
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

function addSuspense(
  suspenseItems: PaymentSuspenseItem[],
  failure: PaymentReconciliationFailure,
  params: {
    amount: Prisma.Decimal
    currency: string
    type: PaymentSuspenseItem["type"]
  },
) {
  suspenseItems.push({
    type: params.type,
    severity: failure.severity,
    amount: formatMoney(params.amount.abs()),
    currency: params.currency,
    providerReference: failure.providerReference,
    evidence: {
      failureType: failure.type,
      paymentId: failure.paymentId,
      providerLineId: failure.providerLineId,
      ...failure.metadata,
    },
  })
}

export function reconcileSettlementBatch(input: SettlementBatchInput): PaymentReconciliationResult {
  const currency = (input.currency || "XAF").trim().toUpperCase()
  const failures: PaymentReconciliationFailure[] = []
  const suspenseItems: PaymentSuspenseItem[] = []
  const payments = input.payments.filter((payment) => payment.method === input.rail)
  const providerLinesByReference = new Map<string, SettlementProviderLine[]>()

  for (const line of input.providerLines) {
    const providerReference = normalizeProviderReference(line.providerReference)
    if (!providerReference) continue

    const lines = providerLinesByReference.get(providerReference) ?? []
    lines.push(line)
    providerLinesByReference.set(providerReference, lines)
  }

  for (const [providerReference, lines] of providerLinesByReference) {
    if (lines.length > 1) {
      const failure: PaymentReconciliationFailure = {
        type: "DUPLICATE_PROVIDER_SETTLEMENT_REFERENCE",
        severity: "critical",
        message: `Provider reference ${providerReference} appears more than once in settlement batch ${input.settlementReference}`,
        providerReference,
        metadata: { lineIds: lines.map((line) => line.id) },
      }
      failures.push(failure)
      addSuspense(suspenseItems, failure, {
        amount: lines.reduce((sum, line) => sum.plus(money(line.amount)), new Prisma.Decimal(0)),
        currency,
        type: "duplicate_provider_id",
      })
    }
  }

  const internalByReference = new Map<string, SettlementPayment[]>()
  for (const payment of payments) {
    const providerReference = paymentProviderReference(payment)
    if (!providerReference) {
      const failure: PaymentReconciliationFailure = {
        type: "MISSING_PROVIDER_REFERENCE",
        severity: "critical",
        message: `Payment ${payment.paymentNumber ?? payment.id} is missing provider evidence`,
        paymentId: payment.id,
      }
      failures.push(failure)
      addSuspense(suspenseItems, failure, {
        amount: money(payment.amount),
        currency,
        type: "missing_provider_reference",
      })
      continue
    }

    const sameReference = internalByReference.get(providerReference) ?? []
    sameReference.push(payment)
    internalByReference.set(providerReference, sameReference)
  }

  for (const [providerReference, sameReference] of internalByReference) {
    if (sameReference.length > 1) {
      const failure: PaymentReconciliationFailure = {
        type: "DUPLICATE_INTERNAL_PROVIDER_REFERENCE",
        severity: "critical",
        message: `Provider reference ${providerReference} was captured by multiple payments`,
        providerReference,
        metadata: { paymentIds: sameReference.map((payment) => payment.id) },
      }
      failures.push(failure)
      addSuspense(suspenseItems, failure, {
        amount: sameReference.reduce((sum, payment) => sum.plus(money(payment.amount)), new Prisma.Decimal(0)),
        currency,
        type: "duplicate_provider_id",
      })
    }
  }

  let matchedCount = 0
  let matchedGross = new Prisma.Decimal(0)

  for (const payment of payments) {
    const providerReference = paymentProviderReference(payment)
    if (!providerReference) continue

    if (payment.status !== PaymentStatus.PAID) {
      const failure: PaymentReconciliationFailure = {
        type: "NON_FINAL_PAYMENT_STATUS",
        severity: "high",
        message: `Payment ${payment.paymentNumber ?? payment.id} is ${String(payment.status).toLowerCase()} and cannot clear settlement`,
        providerReference,
        paymentId: payment.id,
      }
      failures.push(failure)
      addSuspense(suspenseItems, failure, {
        amount: money(payment.amount),
        currency,
        type: "missing_settlement_line",
      })
      continue
    }

    const providerLines = providerLinesByReference.get(providerReference) ?? []
    if (providerLines.length === 0) {
      const failure: PaymentReconciliationFailure = {
        type: "MISSING_PROVIDER_SETTLEMENT",
        severity: "critical",
        message: `Payment ${payment.paymentNumber ?? payment.id} has no provider settlement line`,
        providerReference,
        paymentId: payment.id,
      }
      failures.push(failure)
      addSuspense(suspenseItems, failure, {
        amount: money(payment.amount),
        currency,
        type: "missing_settlement_line",
      })
      continue
    }
    if (providerLines.length > 1) continue

    const providerLine = providerLines[0]
    const internalAmount = money(payment.amount)
    const providerAmount = money(providerLine.amount)
    if (!internalAmount.eq(providerAmount)) {
      const failure: PaymentReconciliationFailure = {
        type: "AMOUNT_MISMATCH",
        severity: "critical",
        message: `Payment ${payment.paymentNumber ?? payment.id} amount does not match provider settlement ${providerReference}`,
        providerReference,
        paymentId: payment.id,
        providerLineId: providerLine.id,
        metadata: {
          internalAmount: formatMoney(internalAmount),
          providerAmount: formatMoney(providerAmount),
        },
      }
      failures.push(failure)
      addSuspense(suspenseItems, failure, {
        amount: internalAmount.minus(providerAmount),
        currency,
        type: "amount_mismatch",
      })
      continue
    }

    matchedCount += 1
    matchedGross = matchedGross.plus(internalAmount)
  }

  for (const [providerReference, lines] of providerLinesByReference) {
    if (internalByReference.has(providerReference)) continue

    const failure: PaymentReconciliationFailure = {
      type: "UNMATCHED_PROVIDER_REFERENCE",
      severity: "critical",
      message: `Provider reference ${providerReference} has no internal payment`,
      providerReference,
      metadata: { lineIds: lines.map((line) => line.id) },
    }
    failures.push(failure)
    addSuspense(suspenseItems, failure, {
      amount: lines.reduce((sum, line) => sum.plus(money(line.amount)), new Prisma.Decimal(0)),
      currency,
      type: "unmatched_provider_line",
    })
  }

  const providerGross = input.providerLines.reduce((sum, line) => sum.plus(money(line.amount)), new Prisma.Decimal(0))
  const providerFees = input.providerLines.reduce((sum, line) => sum.plus(money(line.feesAmount)), new Prisma.Decimal(0))

  if (input.settlementGrossAmount !== null && input.settlementGrossAmount !== undefined) {
    const expectedGross = money(input.settlementGrossAmount)
    if (!providerGross.eq(expectedGross)) {
      const failure: PaymentReconciliationFailure = {
        type: "SETTLEMENT_GROSS_MISMATCH",
        severity: "critical",
        message: `Settlement batch ${input.settlementReference} gross amount does not equal provider lines`,
        metadata: {
          expectedGross: formatMoney(expectedGross),
          providerGross: formatMoney(providerGross),
        },
      }
      failures.push(failure)
      addSuspense(suspenseItems, failure, {
        amount: expectedGross.minus(providerGross),
        currency,
        type: "settlement_shortfall",
      })
    }
  }

  if (input.expectedFeesAmount !== null && input.expectedFeesAmount !== undefined) {
    const expectedFees = money(input.expectedFeesAmount)
    if (!providerFees.eq(expectedFees)) {
      const failure: PaymentReconciliationFailure = {
        type: "SETTLEMENT_FEE_MISMATCH",
        severity: "high",
        message: `Settlement batch ${input.settlementReference} fees do not match expected fees`,
        metadata: {
          expectedFees: formatMoney(expectedFees),
          providerFees: formatMoney(providerFees),
        },
      }
      failures.push(failure)
      addSuspense(suspenseItems, failure, {
        amount: expectedFees.minus(providerFees),
        currency,
        type: "fee_deviation",
      })
    }
  }

  return {
    organizationId: input.organizationId,
    rail: input.rail,
    settlementBatchId: input.settlementBatchId,
    settlementReference: input.settlementReference,
    currency,
    isClean: failures.length === 0,
    matchedCount,
    matchedGrossAmount: formatMoney(matchedGross),
    providerGrossAmount: formatMoney(providerGross),
    providerFeesAmount: formatMoney(providerFees),
    failures,
    suspenseItems,
  }
}

export function assertPaymentReconciliationClean(input: SettlementBatchInput) {
  const result = reconcileSettlementBatch(input)
  if (!result.isClean) {
    throw new BusinessRuleError(
      `Payment reconciliation failed: ${result.failures.map((failure) => failure.message).join("; ")}`,
    )
  }

  return result
}
