import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto"

const ENVELOPE_VERSION = "v1"
const ENVELOPE_AAD = Buffer.from("customer_statement_delivery.v1", "utf8")

type DeliveryEnvelopeEnvironment = Record<string, string | undefined>

export type CustomerStatementDeliveryEnvelope = {
  destination: string
  accessUrl: string
  statementSnapshotId: string
  tokenId: string
  referralCode: string
  issuedAt: string
}

function encryptionKey(environment: DeliveryEnvelopeEnvironment) {
  const configured = (
    environment.AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY ||
    environment.STATEMENT_DELIVERY_ENCRYPTION_KEY ||
    ""
  ).trim()
  if (!configured) return null

  if (/^[0-9a-f]{64}$/i.test(configured)) {
    return Buffer.from(configured, "hex")
  }
  try {
    const decoded = Buffer.from(configured, "base64")
    return decoded.length === 32 ? decoded : null
  } catch {
    return null
  }
}

function validEnvelope(value: unknown): value is CustomerStatementDeliveryEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.destination === "string" &&
    row.destination.length > 0 &&
    typeof row.accessUrl === "string" &&
    row.accessUrl.length > 0 &&
    typeof row.statementSnapshotId === "string" &&
    row.statementSnapshotId.length > 0 &&
    typeof row.tokenId === "string" &&
    row.tokenId.length > 0 &&
    typeof row.referralCode === "string" &&
    row.referralCode.length > 0 &&
    typeof row.issuedAt === "string" &&
    Number.isFinite(Date.parse(row.issuedAt))
  )
}

export function sealCustomerStatementDeliveryEnvelope(
  payload: CustomerStatementDeliveryEnvelope,
  environment: DeliveryEnvelopeEnvironment = process.env,
) {
  const key = encryptionKey(environment)
  if (!key || !validEnvelope(payload)) return null

  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  cipher.setAAD(ENVELOPE_AAD)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".")
}

export function openCustomerStatementDeliveryEnvelope(
  sealed: string,
  environment: DeliveryEnvelopeEnvironment = process.env,
): CustomerStatementDeliveryEnvelope | null {
  const key = encryptionKey(environment)
  if (!key) return null

  const [version, ivText, tagText, encryptedText, ...extra] = sealed.split(".")
  if (
    version !== ENVELOPE_VERSION ||
    !ivText ||
    !tagText ||
    !encryptedText ||
    extra.length
  ) {
    return null
  }

  try {
    const iv = Buffer.from(ivText, "base64url")
    const tag = Buffer.from(tagText, "base64url")
    const encrypted = Buffer.from(encryptedText, "base64url")
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) {
      return null
    }
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAAD(ENVELOPE_AAD)
    decipher.setAuthTag(tag)
    const decoded = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8")
    const payload = JSON.parse(decoded) as unknown
    return validEnvelope(payload) ? payload : null
  } catch {
    return null
  }
}
