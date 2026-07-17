import { createHmac, timingSafeEqual } from "node:crypto"

const LEGACY_TOKEN_VERSION = "v1"
const TOKEN_VERSION = "v2"
const TOKEN_SCOPE = "public_receipt"
const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60

export type LegacyPublicReceiptTokenPayload = {
  v: typeof LEGACY_TOKEN_VERSION
  scope: typeof TOKEN_SCOPE
  salesOrderId: string
  iat: number
  exp: number
}

export type PublicReceiptTokenPayload =
  | LegacyPublicReceiptTokenPayload
  | {
      v: typeof TOKEN_VERSION
      scope: typeof TOKEN_SCOPE
      organizationId: string
      salesOrderId: string
      jti: string
      iat: number
      exp: number
    }

export type PublicReceiptTokenVerification =
  | { ok: true; payload: PublicReceiptTokenPayload }
  | {
      ok: false
      reason:
        | "missing"
        | "not_configured"
        | "malformed"
        | "bad_signature"
        | "wrong_scope"
        | "receipt_mismatch"
        | "organization_mismatch"
        | "expired"
    }

function receiptTokenSecret() {
  return process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET || process.env.RECEIPT_TOKEN_SECRET || null
}

function base64UrlJson(value: PublicReceiptTokenPayload) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url")
}

function parseBase64UrlJson(value: string): PublicReceiptTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<PublicReceiptTokenPayload>
    const hasSharedReceiptFields =
      parsed.scope === TOKEN_SCOPE &&
      typeof parsed.salesOrderId === "string" &&
      typeof parsed.iat === "number" &&
      typeof parsed.exp === "number"

    if (
      parsed.v === TOKEN_VERSION &&
      hasSharedReceiptFields &&
      typeof (parsed as { organizationId?: unknown }).organizationId === "string" &&
      typeof (parsed as { jti?: unknown }).jti === "string"
    ) {
      return parsed as PublicReceiptTokenPayload
    }

    if (parsed.v === LEGACY_TOKEN_VERSION && hasSharedReceiptFields) {
      return parsed as PublicReceiptTokenPayload
    }

    return null
  } catch {
    return null
  }
}

function signatureFor(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url")
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function createPublicReceiptAccessToken(input: {
  organizationId?: string
  salesOrderId: string
  jti?: string
  now?: Date
  ttlSeconds?: number
}) {
  const secret = receiptTokenSecret()
  if (!secret) return null

  const nowSeconds = Math.floor((input.now?.getTime() ?? Date.now()) / 1000)
  const exp = nowSeconds + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS)
  const payload: PublicReceiptTokenPayload =
    input.organizationId && input.jti
      ? {
          v: TOKEN_VERSION,
          scope: TOKEN_SCOPE,
          organizationId: input.organizationId,
          salesOrderId: input.salesOrderId,
          jti: input.jti,
          iat: nowSeconds,
          exp,
        }
      : {
          v: LEGACY_TOKEN_VERSION,
          scope: TOKEN_SCOPE,
          salesOrderId: input.salesOrderId,
          iat: nowSeconds,
          exp,
        }
  const encodedPayload = base64UrlJson(payload)
  return `${encodedPayload}.${signatureFor(encodedPayload, secret)}`
}

export function verifyPublicReceiptAccessToken(input: {
  token?: string | null
  salesOrderId: string
  organizationId?: string
  now?: Date
}): PublicReceiptTokenVerification {
  if (!input.token) return { ok: false, reason: "missing" }

  const secret = receiptTokenSecret()
  if (!secret) return { ok: false, reason: "not_configured" }

  const [encodedPayload, signature, ...extra] = input.token.split(".")
  if (!encodedPayload || !signature || extra.length) return { ok: false, reason: "malformed" }

  const expectedSignature = signatureFor(encodedPayload, secret)
  if (!safeEqual(signature, expectedSignature)) return { ok: false, reason: "bad_signature" }

  const payload = parseBase64UrlJson(encodedPayload)
  if (!payload) return { ok: false, reason: "wrong_scope" }
  if (payload.salesOrderId !== input.salesOrderId) return { ok: false, reason: "receipt_mismatch" }
  if (
    input.organizationId &&
    "organizationId" in payload &&
    payload.organizationId !== input.organizationId
  ) {
    return { ok: false, reason: "organization_mismatch" }
  }

  const nowSeconds = Math.floor((input.now?.getTime() ?? Date.now()) / 1000)
  if (payload.exp <= nowSeconds) return { ok: false, reason: "expired" }

  return { ok: true, payload }
}