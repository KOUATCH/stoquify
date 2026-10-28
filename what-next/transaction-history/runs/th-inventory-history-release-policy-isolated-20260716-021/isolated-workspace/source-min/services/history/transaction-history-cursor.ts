import { createHash, createHmac, timingSafeEqual } from "node:crypto"

import {
  HistoryCursorError,
  type HistoryCursorCodec,
  type HistoryCursorPayload,
} from "@/services/history/transaction-history.types"

const CURSOR_SCOPE = "transaction-history"
const CURSOR_VERSION = 1
const MINIMUM_SECRET_LENGTH = 32
const MAXIMUM_CURSOR_LENGTH = 4096

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    )
  }
  return value
}

export function hashNormalizedHistoryFilters(filters: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(filters)))
    .digest("hex")
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url")
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value
}

function parsePayload(encodedPayload: string): HistoryCursorPayload {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<HistoryCursorPayload>
    const valid =
      parsed.v === CURSOR_VERSION &&
      parsed.scope === CURSOR_SCOPE &&
      typeof parsed.tenantId === "string" &&
      parsed.tenantId.length > 0 &&
      typeof parsed.adapterId === "string" &&
      parsed.adapterId.length > 0 &&
      typeof parsed.filterHash === "string" &&
      /^[a-f0-9]{64}$/.test(parsed.filterHash) &&
      isIsoDate(parsed.recordedThrough) &&
      isIsoDate(parsed.effectiveAt) &&
      isIsoDate(parsed.recordedAt) &&
      typeof parsed.id === "string" &&
      parsed.id.length > 0

    if (!valid) throw new HistoryCursorError("invalid_payload", "History cursor payload is invalid.")
    return parsed as HistoryCursorPayload
  } catch (error) {
    if (error instanceof HistoryCursorError) throw error
    throw new HistoryCursorError("malformed", "History cursor payload is malformed.")
  }
}

export function createHistoryCursorCodec(secret: string): HistoryCursorCodec {
  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new HistoryCursorError(
      "not_configured",
      `History cursor secret must contain at least ${MINIMUM_SECRET_LENGTH} characters.`,
    )
  }

  return {
    encode(payload) {
      const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
      return `${encodedPayload}.${sign(encodedPayload, secret)}`
    },
    decode(token) {
      if (!token || token.length > MAXIMUM_CURSOR_LENGTH) {
        throw new HistoryCursorError("malformed", "History cursor is malformed.")
      }

      const [encodedPayload, signature, ...extra] = token.split(".")
      if (!encodedPayload || !signature || extra.length > 0) {
        throw new HistoryCursorError("malformed", "History cursor is malformed.")
      }

      const expected = sign(encodedPayload, secret)
      if (!safeEqual(signature, expected)) {
        throw new HistoryCursorError("bad_signature", "History cursor signature is invalid.")
      }

      return parsePayload(encodedPayload)
    },
  }
}

export function configuredHistoryCursorCodec(): HistoryCursorCodec {
  const secret = process.env.AQSTOQFLOW_HISTORY_CURSOR_SECRET || process.env.HISTORY_CURSOR_SECRET
  if (!secret) {
    throw new HistoryCursorError("not_configured", "History cursor signing is not configured.")
  }
  return createHistoryCursorCodec(secret)
}
