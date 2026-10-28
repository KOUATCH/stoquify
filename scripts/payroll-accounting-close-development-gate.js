#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const {
  buildPaymentsDeclarationsDevelopmentReadiness,
} = require("./payroll-payments-declarations-development-gate")

const DEFAULT_JSON_OUT =
  "what-next/payroll/accounting-close-development-readiness.json"
const DEFAULT_MARKDOWN_OUT =
  "what-next/payroll/accounting-close-development-readiness.md"

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
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Unsupported mode: " + options.mode)
  }
  return options
}

function read(root, relativePath) {
  const target = path.join(root, relativePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""
}

function buildPayrollAccountingCloseDevelopmentReadiness(
  root = process.cwd(),
  options = {},
) {
  const upstream = buildPaymentsDeclarationsDevelopmentReadiness(root, {
    mode: "fail",
  })
  const register = read(root, "services/payroll/payroll-register.service.ts")
  const dataTrust = read(root, "services/accounting/data-trust.service.ts")
  const close = read(root, "services/accounting/close-assurance.service.ts")
  const closePack = read(root, "services/accounting/close-assurance-pack.service.ts")
  const sourceLink = read(root, "services/accounting/source-link.service.ts")
  const registerTests = read(root, "services/payroll/__tests__/payroll-register.service.test.ts")
  const dataTrustTests = read(root, "services/accounting/__tests__/data-trust.service.test.ts")
  const closeTests = read(root, "services/accounting/__tests__/close-assurance.service.test.ts")
  const closePackTests = read(root, "services/accounting/__tests__/close-assurance-pack.service.test.ts")
  const sourceLinkTests = read(root, "services/accounting/__tests__/source-link.service.test.ts")
  let scripts = {}
  try { scripts = JSON.parse(read(root, "package.json")).scripts || {} } catch {}

  const checks = [
    {
      id: "payments_declarations_development_prerequisite_ready",
      ready:
        upstream.summary.status === "READY_FOR_DEVELOPMENT_AND_SANDBOX_PROOF" &&
        upstream.upstream.productionStatus === "blocked",
    },
    {
      id: "production_close_claims_remain_disabled",
      ready:
        upstream.scope.productionUseAllowed === false &&
        upstream.scope.livePaymentsAllowed === false &&
        upstream.scope.legallyEffectiveDeclarationsAllowed === false,
    },
    {
      id: "register_to_ledger_and_component_tieout",
      ready:
        register.includes("componentMappingTieOutForReadModel") &&
        register.includes("unmappedLineCount") &&
        register.includes("accounting_source_links/journal_entry_lines") &&
        registerTests.includes("ties the register to payslips, payments, declarations, ledger links, and close evidence") &&
        registerTests.includes("payroll ledger contains unmapped extra lines"),
    },
    {
      id: "unresolved_payroll_proof_blocks_close",
      ready:
        dataTrust.includes("payroll-posted-runs-certified-input-proof-missing") &&
        dataTrust.includes("payroll-paid-runs-without-settled-payments") &&
        dataTrust.includes("payroll-ledger-source-link-missing") &&
        dataTrustTests.includes("payroll posting and source-link evidence is incomplete") &&
        dataTrustTests.includes("declaration country-pack register proof is missing"),
    },
    {
      id: "source_links_are_tenant_scoped_audited_and_idempotent",
      ready:
        sourceLink.includes("organizationId") &&
        sourceLink.includes("ledgerAuditEvent.create") &&
        sourceLinkTests.includes("rejects source links that do not match their posting batch source") &&
        sourceLinkTests.includes("creates an audited source link") &&
        sourceLinkTests.includes("returns an existing source link idempotently"),
    },
    {
      id: "certification_requires_clean_evidence_and_segregation",
      ready:
        closePack.includes("Certified close pack is blocked") &&
        closePackTests.includes("blocks certified exports when high-risk findings remain open") &&
        closePackTests.includes("blocks same-actor certification for segregation of duties") &&
        closeTests.includes("blocks same-actor close waiver approval") &&
        closeTests.includes("denies cross-tenant period access"),
    },
    {
      id: "stale_evidence_invalidates_certification",
      ready:
        closePack.includes("close.certification.invalidated") &&
        closePack.includes("staleReason") &&
        closePackTests.includes("records invalidation when inventory annex evidence is stale") &&
        closePackTests.includes("records stale evidence against an already certified run and export"),
    },
    {
      id: "auditor_exports_are_controlled_audited_and_redacted",
      ready:
        dataTrust.includes("Only JSON accountant trust-pack exports are enabled") &&
        dataTrust.includes("Secrets, raw provider payloads, and tenant internals excluded") &&
        closePack.includes("person-level payroll amounts are redacted") &&
        dataTrustTests.includes("exports a certified trust pack with sensitive-action audit and ledger audit evidence") &&
        closePackTests.includes("watermarked audit record"),
    },
    {
      id: "focused_close_negative_test_harness_present",
      ready: [registerTests, dataTrustTests, closeTests, closePackTests, sourceLinkTests]
        .every((source) => source.includes("it(")),
    },
    {
      id: "development_gate_is_not_a_production_policy_gate",
      ready:
        typeof scripts["payroll:accounting-close:dev:gate"] === "string" &&
        typeof scripts["policy:gates"] === "string" &&
        !scripts["policy:gates"].includes("payroll:accounting-close:dev:gate") &&
        scripts["policy:gates"].includes("statutory:country-pack:gate"),
    },
  ]

  const blockers = checks.filter((check) => !check.ready).map((check) => check.id)
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      status: blockers.length
        ? "BLOCKED_FOR_DEVELOPMENT_ACCOUNTING_CLOSE_ASSURANCE"
        : "READY_FOR_DEVELOPMENT_ACCOUNTING_CLOSE_ASSURANCE",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
    },
    scope: {
      environmentClass: "DEVELOPMENT_AND_SYNTHETIC_CLOSE_ONLY",
      productionUseAllowed: false,
      postedLedgerMutationAllowed: false,
      certifiedProductionCloseAllowed: false,
      syntheticCloseAndInvalidationTestingAllowed: true,
    },
    upstream: {
      developmentStatus: upstream.summary.status,
      productionStatus: upstream.upstream.productionStatus,
      productionBlockers: upstream.upstream.productionBlockers,
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
    "# Payroll Accounting-Close Development Readiness",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode,
    "Status: " + report.summary.status,
    "",
    "## Scope",
    "",
    "- Development and synthetic close only",
    "- Production use allowed: false",
    "- Posted ledger mutation allowed: false",
    "- Certified production close allowed: false",
    "- Synthetic close, invalidation, correction, and redaction testing allowed: true",
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
    "- This gate proves synthetic accounting-close controls only; it is not production close certification.",
    "- No posted ledger entry may be changed except through approved reversal or correction workflows.",
    "- Production handoff remains blocked until country-pack, payment/declaration, migration, and final assurance gates pass.",
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
    const report = buildPayrollAccountingCloseDevelopmentReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildPayrollAccountingCloseDevelopmentReadiness,
  gateResultForReport,
  parseArgs,
  renderMarkdown,
}
