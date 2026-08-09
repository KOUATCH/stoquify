import { createHmac, timingSafeEqual } from "node:crypto"

const TOKEN_VERSION = "v1"
const TOKEN_SCOPE = "customer_statement"
const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60
const MIN_TTL_SECONDS = 5 * 60
const MAX_TTL_SECONDS = 90 * 24 * 60 * 60

export type CustomerStatementTokenPermission =
  | "view"
  | "dispute"
  | "promise_to_pay"

export type CustomerStatementTokenPayload = {
  v: typeof TOKEN_VERSION
  scope: typeof TOKEN_SCOPE
  organizationId: string
  statementSnapshotId: string
  statementContentHash: string
  jti: string
  permissions: CustomerStatementTokenPermission[]
  iat: number
  exp: number
}

export type CustomerStatementTokenVerification =
  | { ok: true; payload: CustomerStatementTokenPayload }
  | {
      ok: false
      reason:
        | "missing"
        | "not_configured"
        | "malformed"
        | "bad_signature"
        | "wrong_scope"
        | "statement_mismatch"
        | "expired"
    }

function tokenSecret() {
  const secret =
    process.env.AQSTOQFLOW_STATEMENT_TOKEN_SECRET ||
    process.env.STATEMENT_TOKEN_SECRET ||
    null
  return secret && secret.length >= 32 ? secret : null
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

function normalizedPermissions(
  permissions: CustomerStatementTokenPermission[],
) {
  const unique = [...new Set(permissions)]
  if (!unique.includes("view")) unique.unshift("view")
  return unique.sort((left, right) => left.localeCompare(right))
}

function isPermission(value: unknown): value is CustomerStatementTokenPermission {
  return (
    value === "view" ||
    value === "dispute" ||
    value === "promise_to_pay"
  )
}

function parsePayload(value: string): CustomerStatementTokenPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<CustomerStatementTokenPayload>
    if (
      parsed.v !== TOKEN_VERSION ||
      parsed.scope !== TOKEN_SCOPE ||
      typeof parsed.organizationId !== "string" ||
      typeof parsed.statementSnapshotId !== "string" ||
      typeof parsed.statementContentHash !== "string" ||
      !/^[0-9a-f]{64}$/.test(parsed.statementContentHash) ||
      typeof parsed.jti !== "string" ||
      !Array.isArray(parsed.permissions) ||
      !parsed.permissions.every(isPermission) ||
      !parsed.permissions.includes("view") ||
      typeof parsed.iat !== "number" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= parsed.iat
    ) {
      return null
    }
    return parsed as CustomerStatementTokenPayload
  } catch {
    return null
  }
}

export function createCustomerStatementAccessToken(input: {
  organizationId: string
  statementSnapshotId: string
  statementContentHash: string
  jti: string
  permissions: CustomerStatementTokenPermission[]
  now?: Date
  ttlSeconds?: number
}) {
  const secret = tokenSecret()
  if (!secret) return null
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS
  if (ttlSeconds < MIN_TTL_SECONDS || ttlSeconds > MAX_TTL_SECONDS) {
    return null
  }
  if (!/^[0-9a-f]{64}$/.test(input.statementContentHash)) return null

  const nowSeconds = Math.floor((input.now?.getTime() ?? Date.now()) / 1000)
  const payload: CustomerStatementTokenPayload = {
    v: TOKEN_VERSION,
    scope: TOKEN_SCOPE,
    organizationId: input.organizationId,
    statementSnapshotId: input.statementSnapshotId,
    statementContentHash: input.statementContentHash,
    jti: input.jti,
    permissions: normalizedPermissions(input.permissions),
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  }
  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url")
  return encodedPayload + "." + signatureFor(encodedPayload, secret)
}

export function verifyCustomerStatementAccessToken(input: {
  token?: string | null
  statementSnapshotId: string
  now?: Date
}): CustomerStatementTokenVerification {
  if (!input.token) return { ok: false, reason: "missing" }
  const secret = tokenSecret()
  if (!secret) return { ok: false, reason: "not_configured" }

  const [encodedPayload, signature, ...extra] = input.token.split(".")
  if (!encodedPayload || !signature || extra.length) {
    return { ok: false, reason: "malformed" }
  }
  const expectedSignature = signatureFor(encodedPayload, secret)
  if (!safeEqual(signature, expectedSignature)) {
    return { ok: false, reason: "bad_signature" }
  }

  const payload = parsePayload(encodedPayload)
  if (!payload) return { ok: false, reason: "wrong_scope" }
  if (payload.statementSnapshotId !== input.statementSnapshotId) {
    return { ok: false, reason: "statement_mismatch" }
  }
  const nowSeconds = Math.floor((input.now?.getTime() ?? Date.now()) / 1000)
  if (payload.exp <= nowSeconds) {
    return { ok: false, reason: "expired" }
  }
  return { ok: true, payload }
}
