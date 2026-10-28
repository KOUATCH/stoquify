#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const {
  buildStatutoryCountryPackDevelopmentReadiness,
} = require("./statutory-country-pack-development-gate")

const DEFAULT_JSON_OUT =
  "what-next/payroll/payments-declarations-development-readiness.json"
const DEFAULT_MARKDOWN_OUT =
  "what-next/payroll/payments-declarations-development-readiness.md"

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    root: process.cwd(),
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--mode") options.mode = argv[++index]
    else if (value === "--root") options.root = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error("Unknown argument: " + value)
  }
  if (!['report', 'fail'].includes(options.mode)) {
    throw new Error("Unsupported mode: " + options.mode)
  }
  return options
}

function read(root, relativePath) {
  const target = path.join(root, relativePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""
}

function buildPaymentsDeclarationsDevelopmentReadiness(
  root = process.cwd(),
  options = {},
) {
  const statutory = buildStatutoryCountryPackDevelopmentReadiness(root, {
    mode: "fail",
  })
  const paymentEvidence = read(root, "services/payroll/payment-evidence.service.ts")
  const reconciliation = read(root, "services/payroll/payment-reconciliation.service.ts")
  const declaration = read(root, "services/payroll/declaration-lifecycle.service.ts")
  const authority = read(root, "services/payroll/authority-adapter-execution.service.ts")
  const bridge = read(root, "services/payroll/payroll-provider-settlement-bridge.service.ts")
  const inboxWorker = read(root, "services/payroll/payroll-provider-inbox-settlement-worker.service.ts")
  const paymentTests = read(root, "services/payroll/__tests__/payroll-payment-evidence.service.test.ts")
  const reconciliationTests = read(root, "services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts")
  const declarationTests = read(root, "services/payroll/__tests__/declaration-lifecycle.service.test.ts")
  const authorityTests = read(root, "services/payroll/__tests__/authority-adapter-execution.service.test.ts")
  const bridgeTests = read(root, "services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts")
  const inboxTests = read(root, "services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts")
  let scripts = {}
  try { scripts = JSON.parse(read(root, "package.json")).scripts || {} } catch {}

  const checks = [
    {
      id: "statutory_development_prerequisite_ready",
      ready:
        statutory.summary.status === "READY_FOR_DEVELOPMENT_TESTING" &&
        statutory.productionGate.status === "blocked",
    },
    {
      id: "live_and_legal_effects_remain_disabled",
      ready:
        statutory.scope.productionUseAllowed === false &&
        statutory.scope.livePaymentsAllowed === false &&
        statutory.scope.liveDeclarationsAllowed === false &&
        statutory.scope.liveAuthoritySubmissionsAllowed === false,
    },
    {
      id: "approved_destination_maker_checker_guard",
      ready:
        paymentEvidence.includes("requester cannot approve their own request") &&
        paymentEvidence.includes("approver cannot apply their own approval") &&
        paymentEvidence.includes("has no approved payment destination evidence") &&
        paymentTests.includes("masked values, hashes, audit, and no raw details"),
    },
    {
      id: "provider_callback_idempotency_and_conflict_guard",
      ready:
        reconciliation.includes("idempotency key was reused with a different evidence hash") &&
        reconciliationTests.includes("replays duplicate provider settlement callbacks") &&
        reconciliationTests.includes("rejects duplicate provider settlement callbacks with conflicting proof") &&
        inboxWorker.includes("lease") && inboxTests.includes("redacted"),
    },
    {
      id: "authority_proof_idempotency_and_certification_guard",
      ready:
        authority.includes("execution is blocked by incomplete certification proof") &&
        authority.includes("no raw salary, employee identity, credential secret, or authority payload") &&
        authorityTests.includes("rejects conflicting queue idempotency") &&
        authorityTests.includes("duplicate terminal authority responses") &&
        declaration.includes("productionSubmissionSupported") &&
        declarationTests.includes("keeps certified enqueue disabled when proof identifiers are redacted"),
    },
    {
      id: "settlement_amount_currency_and_evidence_tieout",
      ready:
        bridge.includes("currency to tie out") &&
        bridgeTests.includes("provider evidence amount disagrees with the approved match") &&
        reconciliation.includes("requires provider event, statement line, or statement file evidence") &&
        reconciliation.includes("settlementAmount") &&
        reconciliation.includes("batchAmount"),
    },
    {
      id: "tenant_rbac_audit_and_redaction_evidence",
      ready:
        paymentEvidence.includes("Payment destination change request was not found for this tenant.") &&
        paymentEvidence.includes("auditLog.create") &&
        reconciliation.includes("evaluateRedaction") &&
        authority.includes("redactedResponseSummary") &&
        paymentTests.includes("redaction") && reconciliationTests.includes("auditLog.create"),
    },
    {
      id: "focused_negative_test_harness_present",
      ready: [paymentTests, reconciliationTests, declarationTests, authorityTests, bridgeTests, inboxTests]
        .every((source) => source.includes("it(")),
    },
    {
      id: "development_gate_is_not_a_production_policy_gate",
      ready:
        typeof scripts["payroll:payments-declarations:dev:gate"] === "string" &&
        typeof scripts["policy:gates"] === "string" &&
        !scripts["policy:gates"].includes("payroll:payments-declarations:dev:gate") &&
        scripts["policy:gates"].includes("statutory:country-pack:gate"),
    },
  ]

  const blockers = checks.filter((check) => !check.ready).map((check) => check.id)
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      status: blockers.length
        ? "BLOCKED_FOR_DEVELOPMENT_AND_SANDBOX_PROOF"
        : "READY_FOR_DEVELOPMENT_AND_SANDBOX_PROOF",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
    },
    scope: {
      environmentClass: "DEVELOPMENT_AND_SANDBOX_ONLY",
      syntheticOrAnonymizedDataOnly: true,
      productionUseAllowed: false,
      livePaymentsAllowed: false,
      legallyEffectiveDeclarationsAllowed: false,
      productionAuthorityCallsAllowed: false,
    },
    upstream: {
      developmentStatus: statutory.summary.status,
      productionStatus: statutory.productionGate.status,
      productionBlockers: statutory.productionGate.blockers,
    },
    checks,
    blockers,
  }
}

function gateResultForReport(report, mode = "report") {
  return { status: report.summary.status, exitCode: mode === "fail" && report.blockers.length ? 1 : 0 }
}

function renderMarkdown(report) {
  return [
    "# Payroll Payments and Declarations Development Readiness",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode,
    "Status: " + report.summary.status,
    "",
    "## Scope",
    "",
    "- Development and sandbox only",
    "- Synthetic or anonymized data only",
    "- Production use allowed: false",
    "- Live payments allowed: false",
    "- Legally effective declarations allowed: false",
    "- Production authority calls allowed: false",
    "",
    "## Summary",
    "",
    `- Checks ready: ${report.summary.readyCount}/${report.summary.checkCount}`,
    `- Development blockers: ${report.summary.blockerCount}`,
    `- Upstream production status: ${report.upstream.productionStatus}`,
    `- Upstream production blockers: ${report.upstream.productionBlockers.join(", ") || "none"}`,
    "",
    "## Checks",
    "",
    ...report.checks.map((check) => `- ${check.ready ? "ready" : "blocked"}: ${check.id}`),
    "",
    "## Safety",
    "",
    "- This result proves development/sandbox controls only; it is not provider, authority, legal, or production certification.",
    "- Real disbursements, production callbacks, and legally effective submissions remain prohibited.",
    "- Production handoff remains blocked until the country-pack production gate and downstream assurance gates pass.",
    "",
  ].join("\n")
}

function writeReport(root, options, report) {
  for (const [target, value] of [
    [options.jsonOut, JSON.stringify(report, null, 2) + "\n"],
    [options.out, renderMarkdown(report)],
  ]) {
    const resolved = path.resolve(root, target)
    fs.mkdirSync(path.dirname(resolved), { recursive: true })
    fs.writeFileSync(resolved, value, "utf8")
  }
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    const report = buildPaymentsDeclarationsDevelopmentReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildPaymentsDeclarationsDevelopmentReadiness,
  gateResultForReport,
  parseArgs,
  renderMarkdown,
}
