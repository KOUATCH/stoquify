import {
  MobileMoneyProvider,
  PaymentDirection,
  PaymentMethod,
  PaymentRailType,
  PaymentTransactionState,
  ProviderAccountStatus,
  ProviderEventStatus,
  Prisma,
} from "@prisma/client"

import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"

export type POSElectronicTenderMethod = "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER"

export type POSElectronicTenderAuthorityInput = {
  organizationId: string
  paymentMethod: PaymentMethod | string
  paymentTransactionId?: string | null
  amount: Prisma.Decimal.Value
  currencyCode: string
}

export type POSElectronicTenderAuthorityEvidence = {
  paymentMethod: POSElectronicTenderMethod
  paymentTransactionId: string
  providerEventId: string
  providerAccountId: string
  providerTransactionId: string
  providerReference: string
  providerName: string
  mobileMoneyProvider: MobileMoneyProvider | null
  state: "CONFIRMED" | "SETTLED"
}

const ELECTRONIC_TENDER_METHODS = new Set<string>([
  PaymentMethod.CARD,
  PaymentMethod.MOBILE_MONEY,
  PaymentMethod.BANK_TRANSFER,
])

const PENDING_PROVIDER_STATES = new Set<PaymentTransactionState>([
  PaymentTransactionState.PENDING,
  PaymentTransactionState.PROCESSING,
  PaymentTransactionState.UNKNOWN,
])

const REJECTED_PROVIDER_EVENT_STATES = new Set<ProviderEventStatus>([
  ProviderEventStatus.REJECTED,
  ProviderEventStatus.FAILED,
  ProviderEventStatus.TAMPERED,
  ProviderEventStatus.REPLAYED,
  ProviderEventStatus.ARCHIVED,
])

function expectedRailType(method: POSElectronicTenderMethod) {
  if (method === PaymentMethod.CARD) return PaymentRailType.CARD
  if (method === PaymentMethod.MOBILE_MONEY) return PaymentRailType.MOBILE_MONEY
  return PaymentRailType.BANK_TRANSFER
}

function normalizedCurrency(value: string) {
  return value.trim().toUpperCase()
}

function mobileMoneyProvider(providerCode: string) {
  return Object.values(MobileMoneyProvider).includes(providerCode as MobileMoneyProvider)
    ? providerCode as MobileMoneyProvider
    : null
}

export function isPOSElectronicTenderMethod(
  method: PaymentMethod | string,
): method is POSElectronicTenderMethod {
  return ELECTRONIC_TENDER_METHODS.has(method)
}

export async function lockElectronicTenderAuthoritiesInTx(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; paymentTransactionIds: readonly string[] },
) {
  // Financial writers must hold native receipts before publishing source changes.
  // A consistent order also covers split tenders claiming several receipts.
  const ids = [...new Set(input.paymentTransactionIds.map(id => id.trim()).filter(Boolean))].sort()
  for (const id of ids) {
    const native = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "payment_transactions"
      WHERE "organizationId" = ${input.organizationId} AND "id" = ${id}
      FOR UPDATE
    `)
    if (native.length !== 1) {
      throw new BusinessRuleError("Electronic tender authority evidence was not found for this organization")
    }
  }
}

export async function resolvePOSElectronicTenderAuthority(
  tx: Prisma.TransactionClient,
  input: POSElectronicTenderAuthorityInput,
): Promise<POSElectronicTenderAuthorityEvidence | null> {
  if (!isPOSElectronicTenderMethod(input.paymentMethod)) return null

  const paymentTransactionId = input.paymentTransactionId?.trim()
  if (!paymentTransactionId) {
    throw new BusinessRuleError(
      "Electronic tenders require provider-authoritative payment transaction evidence",
    )
  }

  const transaction = await tx.paymentTransaction.findFirst({
    where: {
      id: paymentTransactionId,
      organizationId: input.organizationId,
    },
    include: {
      providerAuthorityEvent: true,
      providerAccount: {
        include: {
          paymentRail: true,
        },
      },
    },
  })

  if (!transaction || transaction.organizationId !== input.organizationId) {
    throw new BusinessRuleError(
      "Electronic tender authority evidence was not found for this organization",
    )
  }
  if (transaction.legacyPaymentId || transaction.ledgerPostingBatchId || transaction.sourceType === "CUSTOMER_SETTLEMENT") {
    throw new ConflictError("Electronic tender authority evidence has already been used")
  }

  if (PENDING_PROVIDER_STATES.has(transaction.state)) {
    throw new BusinessRuleError("Electronic tender is still pending provider confirmation")
  }
  if (
    transaction.state !== PaymentTransactionState.CONFIRMED &&
    transaction.state !== PaymentTransactionState.SETTLED
  ) {
    throw new BusinessRuleError("Electronic tender was rejected or is no longer capturable")
  }
  if (!transaction.confirmedAt) {
    throw new BusinessRuleError("Electronic tender is missing provider confirmation time")
  }
  if (transaction.direction !== PaymentDirection.INBOUND) {
    throw new BusinessRuleError("Electronic tender authority evidence is not an inbound payment")
  }

  const providerAccount = transaction.providerAccount
  if (
    !providerAccount ||
    providerAccount.organizationId !== input.organizationId ||
    providerAccount.status !== ProviderAccountStatus.ACTIVE ||
    providerAccount.paymentRail.organizationId !== input.organizationId ||
    !providerAccount.paymentRail.isActive ||
    providerAccount.paymentRail.type !== expectedRailType(input.paymentMethod)
  ) {
    throw new BusinessRuleError("Electronic tender provider account or rail is not authorized")
  }

  const expectedCurrency = normalizedCurrency(input.currencyCode)
  if (
    normalizedCurrency(transaction.currencyCode) !== expectedCurrency ||
    normalizedCurrency(providerAccount.currencyCode) !== expectedCurrency ||
    normalizedCurrency(providerAccount.paymentRail.currencyCode) !== expectedCurrency ||
    !new Prisma.Decimal(transaction.amount).eq(new Prisma.Decimal(input.amount))
  ) {
    throw new BusinessRuleError("Electronic tender amount or currency does not match the sale")
  }

  const providerEvent = transaction.providerAuthorityEvent
  if (!providerEvent) {
    throw new BusinessRuleError("Electronic tender is missing signed provider event evidence")
  }
  if (REJECTED_PROVIDER_EVENT_STATES.has(providerEvent.status)) {
    throw new BusinessRuleError("Electronic tender provider event was rejected")
  }
  if (
    providerEvent.status === ProviderEventStatus.RECEIVED ||
    providerEvent.status === ProviderEventStatus.VERIFIED
  ) {
    throw new BusinessRuleError("Electronic tender provider event is still pending processing")
  }
  if (
    providerEvent.status !== ProviderEventStatus.PROCESSED ||
    !providerEvent.signatureValid ||
    !providerEvent.occurredAt ||
    providerEvent.direction !== PaymentDirection.INBOUND ||
    providerEvent.organizationId !== input.organizationId ||
    providerEvent.providerAccountId !== providerAccount.id ||
    !providerEvent.amount ||
    !new Prisma.Decimal(providerEvent.amount).eq(new Prisma.Decimal(input.amount)) ||
    normalizedCurrency(providerEvent.currencyCode) !== expectedCurrency
  ) {
    throw new BusinessRuleError("Electronic tender provider event is not authoritative capture evidence")
  }

  const providerTransactionId = transaction.providerTransactionId?.trim()
  if (
    !providerTransactionId ||
    providerEvent.providerTransactionId?.trim() !== providerTransactionId
  ) {
    throw new BusinessRuleError("Electronic tender provider transaction identity is inconsistent")
  }
  if (
    transaction.providerReference &&
    providerEvent.providerReference &&
    transaction.providerReference.trim() !== providerEvent.providerReference.trim()
  ) {
    throw new BusinessRuleError("Electronic tender provider reference is inconsistent")
  }

  const providerReference =
    transaction.providerReference?.trim() ||
    providerEvent.providerReference?.trim() ||
    providerTransactionId
  const resolvedMobileMoneyProvider = input.paymentMethod === PaymentMethod.MOBILE_MONEY
    ? mobileMoneyProvider(providerAccount.providerCode)
    : null
  if (input.paymentMethod === PaymentMethod.MOBILE_MONEY && !resolvedMobileMoneyProvider) {
    throw new BusinessRuleError("Mobile money provider identity is not supported")
  }

  return {
    paymentMethod: input.paymentMethod,
    paymentTransactionId: transaction.id,
    providerEventId: providerEvent.id,
    providerAccountId: providerAccount.id,
    providerTransactionId,
    providerReference,
    providerName: providerAccount.displayName,
    mobileMoneyProvider: resolvedMobileMoneyProvider,
    state: transaction.state,
  }
}

// Customer collections use the same provider-authority checks without creating
// a legacy POS Payment or a second financial posting.
export const resolveElectronicTenderAuthority = resolvePOSElectronicTenderAuthority

export async function claimPOSElectronicTenderAuthority(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    legacyPaymentId: string
    evidence: POSElectronicTenderAuthorityEvidence
  },
) {
  const claim = await tx.paymentTransaction.updateMany({
    where: {
      id: input.evidence.paymentTransactionId,
      organizationId: input.organizationId,
      providerAuthorityEventId: input.evidence.providerEventId,
      legacyPaymentId: null,
      ledgerPostingBatchId: null,
      OR: [{ sourceType: null }, { sourceType: { not: "CUSTOMER_SETTLEMENT" } }],
      state: {
        in: [PaymentTransactionState.CONFIRMED, PaymentTransactionState.SETTLED],
      },
    },
    data: {
      legacyPaymentId: input.legacyPaymentId,
    },
  })

  if (claim.count !== 1) {
    throw new ConflictError("Electronic tender authority evidence changed or was already used")
  }
}
