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
  const authSecrets = [
    normalizedSecret(environment.AUTH_SECRET),
    normalizedSecret(environment.NEXTAUTH_SECRET),
  ].filter(Boolean)

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
      id: "dedicated_secrets_are_distinct",
      variable: null,
      satisfied:
        new Set([identitySecret, receiptSecret, historyCursorSecret].filter(Boolean)).size ===
        [identitySecret, receiptSecret, historyCursorSecret].filter(Boolean).length,
      remediation: "Use separate random values for identity hashing, receipt signing, and history cursor signing.",
    },
    {
      id: "dedicated_secrets_are_not_auth_secrets",
      variable: null,
      satisfied:
        (!identitySecret || !authSecrets.includes(identitySecret)) &&
        (!receiptSecret || !authSecrets.includes(receiptSecret)) &&
        (!historyCursorSecret || !authSecrets.includes(historyCursorSecret)),
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
