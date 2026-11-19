import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import type { Prisma } from "@prisma/client"

import type {
  ParsedProviderEvent,
  ParsedStatement,
  ParsedStatementLine,
  PaymentProviderAdapter,
  ProviderWebhookHeaders,
  SignatureVerificationInput,
  StatementParseInput,
} from "../payment-ingestion.types"
import { PaymentIngestionError } from "../payment-ingestion.types"

import { statementDocument, statementField, statementMoney, statementDate, STATEMENT_FORMAT_VERSION } from "./statement-pilot-format"

function header(headers: ProviderWebhookHeaders, name: string) {
  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()]
  return Array.isArray(value) ? value[0] : value
}

function normalizeSignature(value?: string) {
  if (!value) return null
  return value.startsWith("sha256=") ? value.slice("sha256=".length) : value
}

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex")
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`
}

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex")
  const rightBuffer = Buffer.from(right, "hex")
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function parseJsonObject(rawBody: string) {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawBody)
  } catch {
    throw new PaymentIngestionError("INVALID_PAYLOAD", "Provider payload could not be parsed.")
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PaymentIngestionError("INVALID_PAYLOAD", "Provider payload must be a JSON object.")
  }

  return parsed as Record<string, unknown>
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

function dateValue(value: unknown) {
  const raw = stringValue(value)
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseDirection(value: unknown): ParsedProviderEvent["direction"] {
  const raw = stringValue(value)?.toUpperCase()
  if (raw === "OUTBOUND" || raw === "DEBIT") return "OUTBOUND"
  if (raw === "INTERNAL") return "INTERNAL"
  if (raw === "INBOUND" || raw === "CREDIT") return "INBOUND"
  return null
}

function parseLineDirection(value: unknown): ParsedStatementLine["direction"] {
  const raw = stringValue(value)?.toUpperCase()
  if (raw === "DEBIT") return "DEBIT"
  if (raw === "FEE") return "FEE"
  if (raw === "REVERSAL") return "REVERSAL"
  if (raw === "CREDIT") return "CREDIT"
  return "UNKNOWN"
}

function maskReference(value: string | null) {
  if (!value) return null
  if (value.length <= 4) return "****"
  return `${value.slice(0, 2)}****${value.slice(-2)}`
}

export class MobileMoneyHmacAdapter implements PaymentProviderAdapter {
  readonly railType = "MOBILE_MONEY" as const

  constructor(
    readonly providerCode: string,
    readonly maxPayloadBytes = 256 * 1024,
    readonly timestampToleranceSeconds = 300,
  ) {}

  canonicalPayload(rawBody: string) {
    try {
      return stableStringify(JSON.parse(rawBody))
    } catch {
      return rawBody
    }
  }

  verifySignature(input: SignatureVerificationInput) {
    const signature = normalizeSignature(header(input.headers, "x-provider-signature"))
    const timestamp = header(input.headers, "x-provider-timestamp")
    if (!signature || !timestamp) return false

    const timestampMs = Number(timestamp)
    if (!Number.isFinite(timestampMs)) return false

    const nowMs = (input.now ?? new Date()).getTime()
    if (Math.abs(nowMs - timestampMs) > this.timestampToleranceSeconds * 1000) return false

    const canonical = `${timestamp}.${this.canonicalPayload(input.rawBody)}`
    const expected = createHmac("sha256", input.secret).update(canonical).digest("hex")
    return safeEqualHex(signature, expected)
  }

  parseEvent(rawBody: string): ParsedProviderEvent {
    const payload = parseJsonObject(rawBody)
    const providerEventId = stringValue(payload.eventId) ?? stringValue(payload.id)
    const providerTransactionId = stringValue(payload.transactionId) ?? stringValue(payload.providerTransactionId)

    if (!providerEventId) {
      throw new PaymentIngestionError("INVALID_PAYLOAD", "Provider event id is required.")
    }

    return {
      providerEventId,
      providerTransactionId,
      providerReference: stringValue(payload.reference) ?? stringValue(payload.providerReference),
      eventType: stringValue(payload.eventType) ?? stringValue(payload.type) ?? "PAYMENT_EVENT",
      direction: parseDirection(payload.direction),
      amount: numberValue(payload.amount),
      feeAmount: numberValue(payload.feeAmount ?? payload.fee),
      currencyCode: stringValue(payload.currencyCode ?? payload.currency) ?? "XAF",
      occurredAt: dateValue(payload.occurredAt ?? payload.timestamp),
      providerCustomerReferenceMasked: maskReference(stringValue(payload.customerMsisdn ?? payload.customerReference)),
      providerCustomerReferenceHash: stringValue(payload.customerMsisdn ?? payload.customerReference)
        ? sha256(String(payload.customerMsisdn ?? payload.customerReference))
        : null,
      rawPayload: payload as Prisma.InputJsonObject,
    }
  }

  parseStatement(input: StatementParseInput): ParsedStatement {
    const { rows, declaredCoverage } = statementDocument(input.rawContent)
    if (declaredCoverage && declaredCoverage.providerCode !== this.providerCode)
      throw new PaymentIngestionError("INVALID_PAYLOAD", "Statement provider identity does not match its adapter.")
    const lines = rows.map((row, index): ParsedStatementLine => {
      const amount = statementMoney(row.amount)!
      const occurredAt = statementDate(statementField(row, "occurredAt", "date", "timestamp"))!
      const direction = parseLineDirection(row.direction)
      const currencyCode = stringValue(statementField(row, "currencyCode", "currency"))
      const providerTransactionId = stringValue(statementField(row, "providerTransactionId", "transactionId"))
      const providerReference = stringValue(statementField(row, "providerReference", "reference"))
      const lineNumber = row.lineNumber === undefined ? index + 1
        : typeof row.lineNumber === "number" || (typeof row.lineNumber === "string" && /^[1-9]\d*$/.test(row.lineNumber.trim()))
          ? Number(row.lineNumber) : NaN
      if (direction === "UNKNOWN" || !currencyCode || !/^[A-Z]{3}$/.test(currencyCode)
        || (!providerTransactionId && !providerReference) || !Number.isSafeInteger(lineNumber) || lineNumber < 1 || lineNumber > 2147483647)
        throw new PaymentIngestionError("INVALID_PAYLOAD", "Statement line requires an identity, direction, uppercase currency and positive line number.")
      const counterparty = stringValue(row.counterparty ?? row.customerMsisdn)

      return {
        lineNumber,
        providerTransactionId,
        providerReference,
        direction,
        amount,
        feeAmount: statementMoney(statementField(row, "feeAmount", "fee"), true),
        currencyCode,
        occurredAt,
        postedAt: statementDate(row.postedAt, true),
        description: stringValue(row.description),
        counterpartyMasked: maskReference(counterparty),
        counterpartyHash: counterparty ? sha256(counterparty) : null,
        metadata: { formatVersion: STATEMENT_FORMAT_VERSION, fingerprintVersion: 1 },
      }
    })

    const observedPeriodStart = lines.reduce<Date | null>((min, line) => (!min || line.occurredAt < min ? line.occurredAt : min), null)
    const observedPeriodEnd = lines.reduce<Date | null>((max, line) => (!max || line.occurredAt > max ? line.occurredAt : max), null)
    if (declaredCoverage && lines.some(line => line.currencyCode !== declaredCoverage.currencyCode ||
      line.occurredAt < declaredCoverage.periodStart || line.occurredAt > declaredCoverage.periodEnd))
      throw new PaymentIngestionError("INVALID_PAYLOAD", "Statement lines must match the declared currency and coverage bounds.")

    return {
      sourceType: "MOBILE_MONEY_STATEMENT",
      periodStart: declaredCoverage?.periodStart ?? observedPeriodStart,
      periodEnd: declaredCoverage?.periodEnd ?? observedPeriodEnd,
      observedPeriodStart, observedPeriodEnd,
      ...(declaredCoverage ? { declaredCoverage } : {}),
      lines,
    }
  }

  fingerprintStatementLine(line: ParsedStatementLine) {
    return sha256(
      [
        line.providerTransactionId ?? "",
        line.providerReference ?? "",
        line.direction ?? "UNKNOWN",
        String(line.amount),
        line.currencyCode ?? "XAF",
        line.occurredAt.toISOString(),
      ].join("|"),
    )
  }
}
