import { createHmac, timingSafeEqual } from "node:crypto"

export type SignedExternalAccessVerification =
  | { ok: true; encodedPayload: string }
  | {
      ok: false
      reason: "missing" | "not_configured" | "malformed" | "bad_signature"
    }

export function configuredExternalAccessSecret(names: readonly string[]) {
  for (const name of names) {
    const secret = process.env[name]?.trim()
    if (secret && secret.length >= 32) return secret
  }
  return null
}

function signatureFor(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url")
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

export function signExternalAccessPayload(
  payload: Record<string, unknown>,
  secret: string | null,
) {
  if (!secret) return null
  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url")
  return encodedPayload + "." + signatureFor(encodedPayload, secret)
}

export function verifyExternalAccessSignature(input: {
  token?: string | null
  secret: string | null
}): SignedExternalAccessVerification {
  if (!input.token) return { ok: false, reason: "missing" }
  if (!input.secret) return { ok: false, reason: "not_configured" }

  const [encodedPayload, signature, ...extra] = input.token.split(".")
  if (!encodedPayload || !signature || extra.length) {
    return { ok: false, reason: "malformed" }
  }
  const expectedSignature = signatureFor(encodedPayload, input.secret)
  if (!safeEqual(signature, expectedSignature)) {
    return { ok: false, reason: "bad_signature" }
  }
  return { ok: true, encodedPayload }
}
