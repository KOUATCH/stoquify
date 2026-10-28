import { Prisma } from "@prisma/client"

import { BusinessRuleError } from "@/services/_shared/action-errors"

export type PaymentIngestionErrorReason =
  | "PROVIDER_ACCOUNT_NOT_FOUND"
  | "PROVIDER_ACCOUNT_INACTIVE"
  | "PAYLOAD_TOO_LARGE"
  | "MISSING_SIGNATURE"
  | "INVALID_SIGNATURE"
  | "REPLAYED_EVENT"
  | "INVALID_PAYLOAD"
  | "DUPLICATE_PROVIDER_EVENT"
  | "TAMPERED_PROVIDER_EVENT"
  | "DUPLICATE_STATEMENT_FILE"
  | "DUPLICATE_STATEMENT_LINE"
  | "RATE_LIMITED"
  | "PROVIDER_TIMEOUT"

export class PaymentIngestionError extends BusinessRuleError {
  constructor(
    public readonly reason: PaymentIngestionErrorReason,
    message: string,
    public readonly safeDetails: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = "PaymentIngestionError"
  }
}

export type ProviderWebhookHeaders = Record<string, string | string[] | undefined>

export type SignatureVerificationInput = {
  rawBody: string
  headers: ProviderWebhookHeaders
  secret: string
  now?: Date
}

export type ParsedProviderEvent = {
  providerEventId: string
  providerTransactionId?: string | null
  providerReference?: string | null
  eventType: string
  direction?: "INBOUND" | "OUTBOUND" | "INTERNAL" | null
  amount?: Prisma.Decimal.Value | null
  feeAmount?: Prisma.Decimal.Value | null
  currencyCode?: string | null
  occurredAt?: Date | null
  providerCustomerReferenceMasked?: string | null
  providerCustomerReferenceHash?: string | null
  rawPayload: Prisma.InputJsonValue
}

export type ParsedStatementLine = {
  lineNumber?: number | null
  providerTransactionId?: string | null
  providerReference?: string | null
  direction?: "CREDIT" | "DEBIT" | "FEE" | "REVERSAL" | "UNKNOWN" | null
  amount: Prisma.Decimal.Value
  feeAmount?: Prisma.Decimal.Value | null
  currencyCode?: string | null
  occurredAt: Date
  postedAt?: Date | null
  description?: string | null
  counterpartyMasked?: string | null
  counterpartyHash?: string | null
  rawLineHash?: string | null
  metadata?: Prisma.InputJsonValue | null
}

export type ParsedStatement = {
  sourceType: string
  periodStart?: Date | null
  periodEnd?: Date | null
  lines: ParsedStatementLine[]
}

export type StatementParseInput = {
  rawContent: string
  fileName?: string | null
}

export type PaymentProviderAdapter = {
  providerCode: string
  railType: "MOBILE_MONEY" | "BANK_TRANSFER" | "CARD" | "CASH" | "WALLET" | "OTHER"
  maxPayloadBytes: number
  timestampToleranceSeconds: number
  canonicalPayload(rawBody: string): string
  verifySignature(input: SignatureVerificationInput): boolean
  parseEvent(rawBody: string, headers?: ProviderWebhookHeaders): ParsedProviderEvent
  parseStatement(input: StatementParseInput): ParsedStatement
  fingerprintStatementLine(line: ParsedStatementLine): string
}
