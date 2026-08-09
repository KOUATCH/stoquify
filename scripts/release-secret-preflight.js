#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const MIN_SECRET_LENGTH = 32
const MIN_UNIQUE_CHARACTERS = 12
const DEFAULT_MARKDOWN_OUT = "what-next/release-secret-preflight.md"
const DEFAULT_JSON_OUT = "what-next/release-secret-preflight.json"
const RELEASE_VALUES = new Set(["1", "true", "yes", "release", "production", "prod", "enforce"])

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    release: "auto",
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--root") options.root = path.resolve(argv[++index])
    else if (value === "--mode") options.mode = argv[++index]
    else if (value === "--release") options.release = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error("Unknown argument: " + value)
  }

  if (!["report", "fail"].includes(options.mode)) throw new Error("Unsupported mode: " + options.mode)
  if (!["auto", "on", "off"].includes(options.release)) throw new Error("Unsupported release mode: " + options.release)
  return options
}

function releaseEnabled(value, environment = process.env) {
  if (value === "on") return true
  if (value === "off") return false
  return [
    environment.CI_RELEASE,
    environment.AQSTOQFLOW_RELEASE_MODE,
    environment.VERCEL_ENV,
    environment.NODE_ENV,
  ].some((candidate) => RELEASE_VALUES.has(String(candidate || "").trim().toLowerCase()))
}

function normalizedSecret(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function hasAcceptableStrength(value) {
  if (!value || value.length < MIN_SECRET_LENGTH) return false
  if (/your[-_ ]|change[-_ ]?me|replace[-_ ]?me|placeholder|example|sample|test[-_ ]?secret/i.test(value)) return false
  return new Set(value).size >= MIN_UNIQUE_CHARACTERS
}

function buildReleaseSecretPreflight(options = {}) {
  const environment = options.environment || process.env
  const releaseEnforced = releaseEnabled(options.release || "auto", environment)
  const identitySecret = normalizedSecret(environment.PUBLIC_IDENTITY_ABUSE_HASH_SECRET)
  const receiptSecret = normalizedSecret(environment.AQSTOQFLOW_RECEIPT_TOKEN_SECRET)
  const historyCursorSecret = normalizedSecret(environment.AQSTOQFLOW_HISTORY_CURSOR_SECRET)
  const statementTokenSecret = normalizedSecret(environment.AQSTOQFLOW_STATEMENT_TOKEN_SECRET)
  const statementDeliveryKey = normalizedSecret(
    environment.AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY,
  )
  const accountantInviteKey = normalizedSecret(
    environment.AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY,
  )
  const authSecrets = [
    normalizedSecret(environment.AUTH_SECRET),
    normalizedSecret(environment.NEXTAUTH_SECRET),
  ].filter(Boolean)
  const dedicatedSecrets = [
    identitySecret,
    receiptSecret,
    historyCursorSecret,
    statementTokenSecret,
    statementDeliveryKey,
    accountantInviteKey,
  ].filter(Boolean)
  const liveEnabled = (value) =>
    ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase())
  const publicAppUrl = normalizedSecret(
    environment.NEXT_PUBLIC_BASE_URL ||
      environment.NEXT_PUBLIC_APP_URL ||
      environment.APP_URL,
  )
  const publicAppUrlIsHttps = (() => {
    if (!publicAppUrl) return false
    try {
      const parsed = new URL(publicAppUrl)
      return parsed.protocol === "https:" && Boolean(parsed.hostname)
    } catch {
      return false
    }
  })()
  const statementEmailLive = liveEnabled(environment.STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS)
  const statementWhatsAppLive = liveEnabled(
    environment.STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS,
  )
  const accountantInviteLive = liveEnabled(
    environment.STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS,
  )
  const resendApiKey = normalizedSecret(environment.RESEND_API_KEY)
  const resendFromEmail = normalizedSecret(environment.RESEND_FROM_EMAIL)
  const accountantFromEmail = normalizedSecret(
    environment.STOQUIFY_ACCOUNTANT_INVITE_FROM_EMAIL ||
      environment.RESEND_FROM_EMAIL,
  )
  const whatsAppPhoneNumberId = normalizedSecret(environment.WHATSAPP_PHONE_NUMBER_ID)
  const whatsAppAccessToken = normalizedSecret(environment.WHATSAPP_ACCESS_TOKEN)
  const hasAes256Key = (value) => {
    if (!value) return false
    if (/^[0-9a-f]{64}$/i.test(value)) return true
    try {
      return Buffer.from(value, "base64").length === 32
    } catch {
      return false
    }
  }

  const evaluations = [
    {
      id: "public_identity_secret_present",
      variable: "PUBLIC_IDENTITY_ABUSE_HASH_SECRET",
      satisfied: Boolean(identitySecret),
      remediation: "Configure the dedicated public-identity HMAC secret in the production environment.",
    },
    {
      id: "public_identity_secret_strong",
      variable: "PUBLIC_IDENTITY_ABUSE_HASH_SECRET",
      satisfied: hasAcceptableStrength(identitySecret),
      remediation: `Use a random secret with at least ${MIN_SECRET_LENGTH} characters and ${MIN_UNIQUE_CHARACTERS} distinct characters.`,
    },
    {
      id: "public_receipt_secret_present",
      variable: "AQSTOQFLOW_RECEIPT_TOKEN_SECRET",
      satisfied: Boolean(receiptSecret),
      remediation: "Configure the dedicated public-receipt signing secret in the production environment.",
    },
    {
      id: "public_receipt_secret_strong",
      variable: "AQSTOQFLOW_RECEIPT_TOKEN_SECRET",
      satisfied: hasAcceptableStrength(receiptSecret),
      remediation: `Use a random secret with at least ${MIN_SECRET_LENGTH} characters and ${MIN_UNIQUE_CHARACTERS} distinct characters.`,
    },
    {
      id: "history_cursor_secret_present",
      variable: "AQSTOQFLOW_HISTORY_CURSOR_SECRET",
      satisfied: Boolean(historyCursorSecret),
      remediation: "Configure the dedicated transaction-history cursor signing secret in the production environment.",
    },
    {
      id: "history_cursor_secret_strong",
      variable: "AQSTOQFLOW_HISTORY_CURSOR_SECRET",
      satisfied: hasAcceptableStrength(historyCursorSecret),
      remediation: "Use a random, purpose-specific secret that meets the release strength policy.",
    },
    {
      id: "statement_token_secret_present",
      variable: "AQSTOQFLOW_STATEMENT_TOKEN_SECRET",
      satisfied: Boolean(statementTokenSecret),
      remediation: "Configure the dedicated customer-statement signing secret in production.",
    },
    {
      id: "statement_token_secret_strong",
      variable: "AQSTOQFLOW_STATEMENT_TOKEN_SECRET",
      satisfied: hasAcceptableStrength(statementTokenSecret),
      remediation: "Use a strong, random, purpose-specific statement signing secret.",
    },
    {
      id: "statement_delivery_encryption_key_present",
      variable: "AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY",
      satisfied: Boolean(statementDeliveryKey),
      remediation: "Configure the AES-256 key used to seal statement delivery envelopes.",
    },
    {
      id: "statement_delivery_encryption_key_valid",
      variable: "AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY",
      satisfied: hasAes256Key(statementDeliveryKey),
      remediation: "Use exactly 32 random bytes encoded as base64 or 64 hexadecimal characters.",
    },
    {
      id: "accountant_invite_encryption_key_present",
      variable: "AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY",
      satisfied: Boolean(accountantInviteKey),
      remediation: "Configure the AES-256 key used to seal accountant invitation envelopes.",
    },
    {
      id: "accountant_invite_encryption_key_valid",
      variable: "AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY",
      satisfied: hasAes256Key(accountantInviteKey),
      remediation: "Use exactly 32 random bytes encoded as base64 or 64 hexadecimal characters.",
    },
    {
      id: "public_app_url_present",
      variable: "NEXT_PUBLIC_BASE_URL",
      satisfied: Boolean(publicAppUrl),
      remediation: "Configure the canonical public application URL used in signed referral links.",
    },
    {
      id: "public_app_url_https",
      variable: "NEXT_PUBLIC_BASE_URL",
      satisfied: publicAppUrlIsHttps,
      remediation: "Use a valid HTTPS origin for production referral links.",
    },
    {
      id: "statement_live_delivery_channel_enabled",
      variable: null,
      satisfied: statementEmailLive || statementWhatsAppLive,
      remediation: "Enable at least one live customer-statement channel: email or WhatsApp.",
    },
    {
      id: "statement_email_provider_configured",
      variable: "RESEND_API_KEY",
      satisfied: !statementEmailLive || Boolean(resendApiKey && resendFromEmail),
      remediation: "When statement email sends are enabled, configure RESEND_API_KEY and RESEND_FROM_EMAIL.",
    },
    {
      id: "statement_whatsapp_provider_configured",
      variable: "WHATSAPP_ACCESS_TOKEN",
      satisfied:
        !statementWhatsAppLive ||
        Boolean(whatsAppPhoneNumberId && whatsAppAccessToken),
      remediation: "When statement WhatsApp sends are enabled, configure WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.",
    },
    {
      id: "accountant_invite_live_delivery_enabled",
      variable: "STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS",
      satisfied: accountantInviteLive,
      remediation: "Enable live accountant invitation delivery for production onboarding.",
    },
    {
      id: "accountant_invite_provider_configured",
      variable: "RESEND_API_KEY",
      satisfied:
        !accountantInviteLive || Boolean(resendApiKey && accountantFromEmail),
      remediation: "When accountant invitation sends are enabled, configure RESEND_API_KEY and an accountant or default Resend sender.",
    },
    {
      id: "dedicated_secrets_are_distinct",
      variable: null,
      satisfied: new Set(dedicatedSecrets).size === dedicatedSecrets.length,
      remediation: "Use separate random values for every signing, hashing, cursor, and envelope-encryption boundary.",
    },
    {
      id: "dedicated_secrets_are_not_auth_secrets",
      variable: null,
      satisfied: dedicatedSecrets.every((secret) => !authSecrets.includes(secret)),
      remediation: "Do not reuse AUTH_SECRET or NEXTAUTH_SECRET for any dedicated boundary secret.",
    },
  ]

  const findings = evaluations.filter((evaluation) => !evaluation.satisfied)
  const blockers = releaseEnforced ? findings : []
  const warnings = releaseEnforced ? [] : findings
  const status = blockers.length ? "blocked" : warnings.length ? "conditional" : "ready"

  return {
    summary: {
      generatedAt: new Date().toISOString(),
      releaseEnforced,
      status,
      checkCount: evaluations.length,
      readyCount: evaluations.filter((evaluation) => evaluation.satisfied).length,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      secretValuePrinted: false,
    },
    checks: evaluations.map(({ id, variable, satisfied, remediation }) => ({
      id,
      variable,
      ready: satisfied,
      remediation,
    })),
    blockers: blockers.map(({ id }) => id),
    warnings: warnings.map(({ id }) => id),
  }
}
function renderMarkdown(report, mode = "report") {
  const lines = [
    "# Release Secret Preflight",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: `" + mode + "`",
    "Status: `" + report.summary.status + "`",
    "",
    "## Summary",
    "",
    "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount,
    "- Release enforcement: " + (report.summary.releaseEnforced ? "on" : "off"),
    "- Blockers: " + report.summary.blockerCount,
    "- Warnings: " + report.summary.warningCount,
    "- Secret value printed: no",
    "",
    "## Checks",
    "",
    "| Status | Check | Variable | Remediation |",
    "| --- | --- | --- | --- |",
    ...report.checks.map((check) =>
      "| " + (check.ready ? "ready" : "blocked") + " | " + check.id + " | " + (check.variable || "n/a") + " | " + check.remediation + " |",
    ),
    "",
    "## Safety",
    "",
    "- This preflight reads secret values only from the process environment.",
    "- It never writes, hashes, serializes, or prints secret values.",
    "- Local and preview environments report missing production secrets without blocking; release mode fails closed.",
  ]
  return lines.join("\n") + "\n"
}

function gateResultForReport(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && report.blockers.length ? 1 : 0,
  }
}

function writeReport(root, options, report) {
  const markdownTarget = path.resolve(root, options.out)
  const jsonTarget = path.resolve(root, options.jsonOut)
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true })
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true })
  fs.writeFileSync(markdownTarget, renderMarkdown(report, options.mode), "utf8")
  fs.writeFileSync(jsonTarget, JSON.stringify(report, null, 2) + "\n", "utf8")
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    const report = buildReleaseSecretPreflight({ release: options.release })
    writeReport(root, options, report)
    console.log(renderMarkdown(report, options.mode))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildReleaseSecretPreflight,
  gateResultForReport,
  hasAcceptableStrength,
  parseArgs,
  releaseEnabled,
  renderMarkdown,
}
