import { Prisma } from "@prisma/client"
import type { AccountingPostingPurpose, AccountingSourceType } from "@prisma/client"

export type SuspensePostingRequest = {
  organizationId: string
  suspenseItemId: string
  amount: Prisma.Decimal
  currencyCode: string
  requestedById: string
  correlationId: string
  sourceType: AccountingSourceType
  postingPurpose: AccountingPostingPurpose
}

export function buildSuspensePostingRequest(input: {
  organizationId: string
  suspenseItemId: string
  amount: Prisma.Decimal.Value
  currencyCode: string
  requestedById: string
  correlationId: string
}): SuspensePostingRequest {
  return {
    organizationId: input.organizationId,
    suspenseItemId: input.suspenseItemId,
    amount: new Prisma.Decimal(input.amount).toDecimalPlaces(2),
    currencyCode: input.currencyCode,
    requestedById: input.requestedById,
    correlationId: input.correlationId,
    sourceType: "PAYMENT_SUSPENSE" as AccountingSourceType,
    postingPurpose: "SUSPENSE_RECLASSIFICATION" as AccountingPostingPurpose,
  }
}
