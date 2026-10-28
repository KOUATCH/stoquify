#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const MODES = new Set(["report", "warn", "fail"])
const RELEASE_VALUES = new Set(["1", "true", "yes", "release", "production", "prod", "enforce"])
const MIN_SECRET_LENGTH = 32

function parseArgs(argv = process.argv) {
  const args = {
    root: process.cwd(),
    mode: "report",
    release: "auto",
    out: null,
    jsonOut: null,
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--mode") args.mode = argv[++index] || "report"
    else if (arg === "--release") args.release = argv[++index] || "auto"
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(argv[++index])
    else if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!MODES.has(args.mode)) throw new Error("--mode must be one of: report, warn, fail")
  if (!["auto", "true", "false", "on", "off"].includes(args.release)) {
    throw new Error("--release must be one of: auto, true, false, on, off")
  }
  return args
}

function printHelp() {
  console.log(`Public Receipt Token Config Gate

Usage:
  node scripts/public-receipt-token-config-gate.js [--mode report|warn|fail] [--release auto|true|false|on|off]

Modes:
  report  Generate readiness evidence and exit 0.
  warn    Generate readiness evidence, print blockers, and exit 0.
  fail    Exit 1 for release blockers.

Release detection:
  auto    Enforce secret configuration when production/release environment signals are present.
  true/on Force release enforcement.
  false/off
          Disable release-only secret enforcement.
`)
}

function isReleaseEnvironment(env = process.env) {
  return [
    env.AQSTOQFLOW_RELEASE_MODE,
    env.PUBLIC_RECEIPT_TOKEN_CONFIG_REQUIRED,
    env.CI_RELEASE,
    env.VERCEL_ENV,
    env.NODE_ENV,
  ].some((value) => RELEASE_VALUES.has(String(value || "").trim().toLowerCase()))
}

function resolveReleaseRequired(input = {}) {
  if (input.release === "true" || input.release === "on") return true
  if (input.release === "false" || input.release === "off") return false
  return isReleaseEnvironment(input.env)
}

function readText(root, relativePath) {
  const target = path.join(root, relativePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""
}

function configuredSecret(env = process.env) {
  const candidates = [
    { name: "AQSTOQFLOW_RECEIPT_TOKEN_SECRET", value: env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET },
    { name: "RECEIPT_TOKEN_SECRET", value: env.RECEIPT_TOKEN_SECRET },
  ].filter((item) => typeof item.value === "string" && item.value.trim().length > 0)

  return candidates[0] || null
}

function evaluatePublicReceiptTokenConfigGate(root = process.cwd(), options = {}) {
  const resolvedRoot = path.resolve(root)
  const env = options.env || process.env
  const releaseRequired = resolveReleaseRequired({ release: options.release || "auto", env })
  const tokenHelperText = readText(resolvedRoot, "services/pos/public-receipt-token.ts")
  const receiptServiceText = readText(resolvedRoot, "services/pos/receipt.service.ts")
  const tokenRegistryServiceText = readText(resolvedRoot, "services/pos/public-receipt-token-registry.service.ts")
  const receiptRouteText = readText(resolvedRoot, "app/api/receipts/[receiptId]/route.ts")
  const secret = configuredSecret(env)

  const checks = [
    {
      id: "token_helper_exists",
      label: "Public receipt token helper exists",
      passed: /createPublicReceiptAccessToken/.test(tokenHelperText) && /verifyPublicReceiptAccessToken/.test(tokenHelperText),
    },
    {
      id: "token_helper_signs_and_expires",
      label: "Token helper signs, expires, and compares safely",
      passed:
        /createHmac\("sha256"/.test(tokenHelperText) &&
        /timingSafeEqual/.test(tokenHelperText) &&
        /exp/.test(tokenHelperText),
    },
    {
      id: "route_requires_token",
      label: "Public receipt route requires a token before service access",
      passed:
        /receiptAccessToken/.test(receiptRouteText) &&
        /if\s*\(\s*!receiptAccessToken\s*\)/.test(receiptRouteText) &&
        /getPublicSalesReceipt/.test(receiptRouteText),
    },
    {
      id: "service_verifies_token_before_lookup",
      label: "Public receipt service verifies token and registry before lookup",
      passed:
        (
          /verifyPublicReceiptAccessToken/.test(receiptServiceText) &&
          /if\s*\(\s*!verification\.ok\s*\)/.test(receiptServiceText) &&
          /findSalesReceipt\(input\.salesOrderId,\s*undefined,\s*\{\s*includeCustomerContact:\s*false\s*\}\)/.test(receiptServiceText)
        ) || (
          /assertPublicReceiptAccessToken/.test(receiptServiceText) &&
          /findSalesReceipt\(input\.salesOrderId,\s*access\.organizationId/.test(receiptServiceText) &&
          /includeCustomerContact:\s*false/.test(receiptServiceText) &&
          /issuePublicReceiptToken:\s*false/.test(receiptServiceText) &&
          /verifyPublicReceiptAccessToken/.test(tokenRegistryServiceText) &&
          /publicReceiptAccessToken\.findFirst/.test(tokenRegistryServiceText) &&
          /row\.status\s*!==\s*ACTIVE_STATUS/.test(tokenRegistryServiceText)
        ),
    },
  ]

  const blockers = checks
    .filter((check) => !check.passed)
    .map((check) => ({ area: "receipt_token_access_path", blocker: check.label }))

  const warnings = []
  if (!secret) {
    const finding = {
      area: "receipt_token_secret",
      blocker: "Production public receipt token secret is not configured.",
    }
    if (releaseRequired) blockers.push(finding)
    else warnings.push(finding)
  } else if (secret.value.trim().length < MIN_SECRET_LENGTH) {
    const finding = {
      area: "receipt_token_secret",
      blocker: `Configured public receipt token secret is shorter than ${MIN_SECRET_LENGTH} characters.`,
      variable: secret.name,
    }
    if (releaseRequired) blockers.push(finding)
    else warnings.push(finding)
  }

  return {
    generatedAt: new Date().toISOString(),
    root: resolvedRoot,
    releaseRequired,
    summary: {
      status: blockers.length > 0 ? "blocked" : "ready",
      checkCount: checks.length,
      readyCheckCount: checks.filter((check) => check.passed).length,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      secretConfigured: Boolean(secret),
      secretVariable: secret ? secret.name : null,
      secretValuePrinted: false,
    },
    checks,
    blockers,
    warnings,
  }
}

function renderMarkdown(report, mode) {
  const lines = [
    "# Public Receipt Token Config Gate",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: \`${mode}\``,
    `Root: \`${report.root}\``,
    "",
    "## Summary",
    "",
    `- Status: \`${report.summary.status}\``,
    `- Release secret enforcement: \`${report.releaseRequired ? "on" : "off"}\``,
    `- Checks ready: ${report.summary.readyCheckCount}/${report.summary.checkCount}`,
    `- Blockers: ${report.summary.blockerCount}`,
    `- Warnings: ${report.summary.warningCount}`,
    `- Secret configured: ${report.summary.secretConfigured ? "yes" : "no"}`,
    `- Secret value printed: ${report.summary.secretValuePrinted ? "yes" : "no"}`,
    "",
    "## Checks",
    "",
    "| Status | Check |",
    "| --- | --- |",
    ...report.checks.map((check) => `| ${check.passed ? "ready" : "blocked"} | ${check.label} |`),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length
      ? report.blockers.map((item) => `- ${item.area}: ${item.blocker}`)
      : ["No public receipt token configuration blockers detected."]),
    "",
    "## Warnings",
    "",
    ...(report.warnings.length
      ? report.warnings.map((item) => `- ${item.area}: ${item.blocker}`)
      : ["No report-mode warnings detected."]),
    "",
    "## Safety Notes",
    "",
    "- This gate never prints secret values.",
    "- Local development can run without a receipt token secret; production/release mode cannot.",
    "- Public receipt URLs remain unsafe for launch unless token signing is configured in the release environment.",
  ]

  return `${lines.join("\n")}\n`
}

function writeReport(report, args) {
  if (args.jsonOut) {
    fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true })
    fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  }
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true })
    fs.writeFileSync(args.out, renderMarkdown(report, args.mode), "utf8")
  }
}

function main() {
  const args = parseArgs(process.argv)
  const report = evaluatePublicReceiptTokenConfigGate(args.root, {
    release: args.release,
  })
  writeReport(report, args)
  console.log(renderMarkdown(report, args.mode))

  if (args.mode === "fail" && report.blockers.length > 0) process.exit(1)
}

if (require.main === module) main()

module.exports = {
  evaluatePublicReceiptTokenConfigGate,
  isReleaseEnvironment,
  parseArgs,
  renderMarkdown,
}
