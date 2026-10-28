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
  return "INBOUND"
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

function csvRows(rawContent: string): Record<string, unknown>[] {
  const rows = rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (rows.length < 2) return []

  const headers = rows[0].split(",").map((part) => part.trim())
  return rows.slice(1).map((row, index) => {
    const values = row.split(",").map((part) => part.trim())
    return Object.fromEntries(headers.map((key, valueIndex) => [key, values[valueIndex] ?? ""])) as Record<string, string>
  }).map((row, index) => ({ ...row, lineNumber: String(index + 1) }))
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
    const trimmed = input.rawContent.trim()
    const rows: Record<string, unknown>[] = trimmed.startsWith("[")
      ? (JSON.parse(trimmed) as Record<string, unknown>[])
      : csvRows(trimmed)

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new PaymentIngestionError("INVALID_PAYLOAD", "Statement file did not contain importable lines.")
    }

    const lines = rows.map((row, index): ParsedStatementLine => {
      const amount = numberValue(row.amount)
      const occurredAt = dateValue(row.occurredAt ?? row.date ?? row.timestamp)
      if (amount === null || !occurredAt) {
        throw new PaymentIngestionError("INVALID_PAYLOAD", "Statement line amount and date are required.")
      }

      const counterparty = stringValue(row.counterparty ?? row.customerMsisdn)

      return {
        lineNumber: Number(row.lineNumber ?? index + 1),
        providerTransactionId: stringValue(row.providerTransactionId ?? row.transactionId),
        providerReference: stringValue(row.providerReference ?? row.reference),
        direction: parseLineDirection(row.direction),
        amount,
        feeAmount: numberValue(row.feeAmount ?? row.fee),
        currencyCode: stringValue(row.currencyCode ?? row.currency) ?? "XAF",
        occurredAt,
        postedAt: dateValue(row.postedAt),
        description: stringValue(row.description),
        counterpartyMasked: maskReference(counterparty),
        counterpartyHash: counterparty ? sha256(counterparty) : null,
        metadata: row as Prisma.InputJsonObject,
      }
    })

    return {
      sourceType: "MOBILE_MONEY_STATEMENT",
      periodStart: lines.reduce<Date | null>((min, line) => (!min || line.occurredAt < min ? line.occurredAt : min), null),
      periodEnd: lines.reduce<Date | null>((max, line) => (!max || line.occurredAt > max ? line.occurredAt : max), null),
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
