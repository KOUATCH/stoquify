import { hashBusinessPayload } from "@/services/events/business-event.service"

export const PAYMENT_RECONCILIATION_SOURCE_VERSION_HASH_PATTERN =
  /^sha256:[a-f0-9]{64}$/

export type PaymentReconciliationSignOffSourceFacts = Readonly<{
  version: 1
  sourceType: "ReconciliationRun"
  organizationId: string
  runId: string
  providerAccountId: string
  provider: {
    id: string
    displayName: string
    currencyCode: string
  }
  businessDate: string
  periodStart: string
  periodEnd: string
  status: "READY_FOR_SIGNOFF"
  makerActorId: string
  totals: {
    internalAmount: string
    externalAmount: string
    matchedAmount: string
    suspenseAmount: string
  }
  matchCount: number
  exceptionCount: number
  updatedAt: string
}>

export function buildPaymentReconciliationSignOffSourceVersionHash(
  facts: PaymentReconciliationSignOffSourceFacts,
) {
  return `sha256:${hashBusinessPayload(facts)}`
}

export function isPaymentReconciliationSourceVersionHash(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    PAYMENT_RECONCILIATION_SOURCE_VERSION_HASH_PATTERN.test(value)
  )
}
