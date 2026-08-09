import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto"

const ENVELOPE_VERSION = "v1"
const ENVELOPE_AAD = Buffer.from("accountant_client_invite_delivery.v1", "utf8")

type InviteEnvelopeEnvironment = Record<string, string | undefined>

export type AccountantClientInviteEnvelope = {
  destination: string
  inviteUrl: string
  inviteId: string
  referralCode: string
  issuedAt: string
}

function encryptionKey(environment: InviteEnvelopeEnvironment) {
  const configured = (
    environment.AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY ||
    environment.ACCOUNTANT_INVITE_ENCRYPTION_KEY ||
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

function validEnvelope(value: unknown): value is AccountantClientInviteEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.destination === "string" &&
    row.destination.length > 0 &&
    typeof row.inviteUrl === "string" &&
    row.inviteUrl.length > 0 &&
    typeof row.inviteId === "string" &&
    row.inviteId.length > 0 &&
    typeof row.referralCode === "string" &&
    row.referralCode.length > 0 &&
    typeof row.issuedAt === "string" &&
    Number.isFinite(Date.parse(row.issuedAt))
  )
}

export function sealAccountantClientInviteEnvelope(
  payload: AccountantClientInviteEnvelope,
  environment: InviteEnvelopeEnvironment = process.env,
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
  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".")
}

export function openAccountantClientInviteEnvelope(
  sealed: string,
  environment: InviteEnvelopeEnvironment = process.env,
): AccountantClientInviteEnvelope | null {
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
