import {
  configuredExternalAccessSecret,
  signExternalAccessPayload,
  verifyExternalAccessSignature,
} from "@/services/_shared/signed-external-access-token"

const TOKEN_VERSION = "v1"
const TOKEN_SCOPE = "supplier_po_acknowledgement"
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60
const MIN_TTL_SECONDS = 5 * 60
const MAX_TTL_SECONDS = 30 * 24 * 60 * 60

export type SupplierPoTokenPermission = "view" | "respond"

export type SupplierPoTokenPayload = {
  v: typeof TOKEN_VERSION
  scope: typeof TOKEN_SCOPE
  organizationId: string
  purchaseOrderId: string
  envelopeId: string
  envelopeContentHash: string
  jti: string
  permissions: SupplierPoTokenPermission[]
  iat: number
  exp: number
}

export type SupplierPoTokenVerification =
  | { ok: true; payload: SupplierPoTokenPayload }
  | {
      ok: false
      reason:
        | "missing"
        | "not_configured"
        | "malformed"
        | "bad_signature"
        | "wrong_scope"
        | "envelope_mismatch"
        | "expired"
    }

function tokenSecret() {
  return configuredExternalAccessSecret([
    "AQSTOQFLOW_SUPPLIER_PO_TOKEN_SECRET",
    "SUPPLIER_PO_TOKEN_SECRET",
    "AQSTOQFLOW_EXTERNAL_ACCESS_TOKEN_SECRET",
  ])
}

function isPermission(value: unknown): value is SupplierPoTokenPermission {
  return value === "view" || value === "respond"
}

function parsePayload(value: string): SupplierPoTokenPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<SupplierPoTokenPayload>
    if (
      parsed.v !== TOKEN_VERSION ||
      parsed.scope !== TOKEN_SCOPE ||
      typeof parsed.organizationId !== "string" ||
      typeof parsed.purchaseOrderId !== "string" ||
      typeof parsed.envelopeId !== "string" ||
      typeof parsed.envelopeContentHash !== "string" ||
      !/^[0-9a-f]{64}$/.test(parsed.envelopeContentHash) ||
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
    return parsed as SupplierPoTokenPayload
  } catch {
    return null
  }
}

function normalizedPermissions(allowRespond: boolean) {
  return allowRespond
    ? (["respond", "view"] as SupplierPoTokenPermission[])
    : (["view"] as SupplierPoTokenPermission[])
}

export function createSupplierPoAccessToken(input: {
  organizationId: string
  purchaseOrderId: string
  envelopeId: string
  envelopeContentHash: string
  jti: string
  allowRespond?: boolean
  now?: Date
  ttlSeconds?: number
}) {
  const secret = tokenSecret()
  if (!secret) return null
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS
  if (ttlSeconds < MIN_TTL_SECONDS || ttlSeconds > MAX_TTL_SECONDS) {
    return null
  }
  if (!/^[0-9a-f]{64}$/.test(input.envelopeContentHash)) return null

  const nowSeconds = Math.floor((input.now?.getTime() ?? Date.now()) / 1000)
  const payload: SupplierPoTokenPayload = {
    v: TOKEN_VERSION,
    scope: TOKEN_SCOPE,
    organizationId: input.organizationId,
    purchaseOrderId: input.purchaseOrderId,
    envelopeId: input.envelopeId,
    envelopeContentHash: input.envelopeContentHash,
    jti: input.jti,
    permissions: normalizedPermissions(input.allowRespond !== false),
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  }
  return signExternalAccessPayload(payload, secret)
}

export function verifySupplierPoAccessToken(input: {
  token?: string | null
  envelopeId: string
  now?: Date
}): SupplierPoTokenVerification {
  const verification = verifyExternalAccessSignature({
    token: input.token,
    secret: tokenSecret(),
  })
  if (!verification.ok) return verification

  const payload = parsePayload(verification.encodedPayload)
  if (!payload) return { ok: false, reason: "wrong_scope" }
  if (payload.envelopeId !== input.envelopeId) {
    return { ok: false, reason: "envelope_mismatch" }
  }
  const nowSeconds = Math.floor((input.now?.getTime() ?? Date.now()) / 1000)
  if (payload.exp <= nowSeconds) {
    return { ok: false, reason: "expired" }
  }
  return { ok: true, payload }
}

export const supplierPoTokenLifetime = {
  defaultSeconds: DEFAULT_TTL_SECONDS,
  minSeconds: MIN_TTL_SECONDS,
  maxSeconds: MAX_TTL_SECONDS,
} as const
