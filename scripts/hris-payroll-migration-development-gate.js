#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const {
  buildPayrollAccountingCloseDevelopmentReadiness,
} = require("./payroll-accounting-close-development-gate")

const DEFAULT_JSON_OUT =
  "what-next/payroll/migration-backfill-development-readiness.json"
const DEFAULT_MARKDOWN_OUT =
  "what-next/payroll/migration-backfill-development-readiness.md"

function parseArgs(argv = process.argv.slice(2)) {
  const options = { mode: "report", root: process.cwd(), out: DEFAULT_MARKDOWN_OUT, jsonOut: DEFAULT_JSON_OUT }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--mode") options.mode = argv[++index]
    else if (value === "--root") options.root = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error("Unknown argument: " + value)
  }
  if (!["report", "fail"].includes(options.mode)) throw new Error("Unsupported mode: " + options.mode)
  return options
}

function read(root, relativePath) {
  const target = path.join(root, relativePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""
}

function buildHrisPayrollMigrationDevelopmentReadiness(root = process.cwd(), options = {}) {
  const upstream = buildPayrollAccountingCloseDevelopmentReadiness(root, { mode: "fail" })
  const hrisPilot = read(root, "services/hris/migration-backfill-pilot.service.ts")
  const hrisTests = read(root, "services/hris/__tests__/migration-backfill-pilot.service.test.ts")
  const payrollPlan = read(root, "services/payroll/payroll-seed-backfill-plan.service.ts")
  const payrollPlanTests = read(root, "services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts")
  const reconciliation = read(root, "services/payroll/payroll-proof-backfill-reconciliation.service.ts")
  const reconciliationTests = read(root, "services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts")
  const cli = read(root, "scripts/hris-migration-backfill-pilot.ts")
  const localRemediation = read(root, "scripts/hris-migration-pilot-remediate-local.js")
  let scripts = {}
  try { scripts = JSON.parse(read(root, "package.json")).scripts || {} } catch {}

  const checks = [
    {
      id: "accounting_close_development_prerequisite_ready",
      ready:
        upstream.summary.status === "READY_FOR_DEVELOPMENT_ACCOUNTING_CLOSE_ASSURANCE" &&
        upstream.upstream.productionStatus === "blocked",
    },
    {
      id: "production_migration_and_final_readiness_remain_disabled",
      ready:
        upstream.scope.productionUseAllowed === false &&
        upstream.scope.postedLedgerMutationAllowed === false &&
        upstream.scope.certifiedProductionCloseAllowed === false,
    },
    {
      id: "dry_run_only_before_database_reads",
      ready:
        hrisPilot.includes("mutation mode is intentionally unavailable") &&
        payrollPlan.includes("mutation mode is intentionally unavailable") &&
        hrisTests.includes("dryRun: false") &&
        hrisTests.includes("not.toHaveBeenCalled") &&
        payrollPlanTests.includes("refuses mutation mode before any database read is attempted") &&
        cli.includes('stringArg(args, "dry-run") !== "false"'),
    },
    {
      id: "tenant_and_cross_tenant_rows_fail_closed",
      ready:
        hrisPilot.includes("organizationId !== parsed.organizationId") &&
        hrisTests.includes("blocks ambiguous and cross-tenant legacy rows") &&
        payrollPlan.includes("organizationId: input.organizationId") &&
        localRemediation.includes("assertLocalOnly") &&
        localRemediation.includes('endsWith("_local")'),
    },
    {
      id: "stable_hashes_and_idempotency_evidence",
      ready:
        hrisPilot.includes("sourceProjectionHash") &&
        hrisPilot.includes("correctionPlanHash") &&
        hrisPilot.includes("reconciliationHash") &&
        hrisTests.includes("second.evidence.reconciliationHash") &&
        payrollPlan.includes("stableKey") &&
        reconciliation.includes("idempotencyLedger"),
    },
    {
      id: "correction_only_rollback_preserves_immutable_evidence",
      ready:
        hrisPilot.includes('strategy: "CORRECTION_ONLY"') &&
        hrisPilot.includes("mutationCount: 0") &&
        hrisPilot.includes("immutableEvidencePreserved") &&
        hrisTests.includes('strategy: "CORRECTION_ONLY"') &&
        hrisTests.includes("blocks close signoff when immutable evidence changes") &&
        payrollPlan.includes("append a reversing correction event"),
    },
    {
      id: "backfill_reconciliation_requires_source_certificate",
      ready:
        reconciliation.includes("requires a persisted execution certificate audit id or ledger key") &&
        reconciliation.includes("expectedSourceDryRunEvidenceHash") &&
        reconciliationTests.includes("requires a persisted source certificate selector before tenant scans") &&
        reconciliationTests.includes("source certificate hash does not match approval evidence") &&
        reconciliationTests.includes("keeps data-trust proof blockers when current proof gaps remain"),
    },
    {
      id: "reports_and_certificates_are_redacted",
      ready:
        hrisPilot.includes("rawPersonDataIncluded: false") &&
        payrollPlan.includes("rawPaymentDestinationIncluded: false") &&
        reconciliation.includes("rawProviderPayloadIncluded") &&
        payrollPlanTests.includes("no person/payment details") &&
        reconciliationTests.includes("rawPersonDataIncluded: false"),
    },
    {
      id: "owner_signoff_remains_pending_and_non_automated",
      ready:
        hrisPilot.includes('"PENDING_OWNER_SIGNOFF"') &&
        hrisPilot.includes("requiredSignoffs") &&
        hrisTests.includes('closePack: { status: "PENDING_OWNER_SIGNOFF" }') &&
        payrollPlan.includes("requiredSignoffs"),
    },
    {
      id: "focused_migration_test_harness_present",
      ready: [hrisTests, payrollPlanTests, reconciliationTests].every((source) => source.includes("it(")),
    },
    {
      id: "development_gate_is_not_a_production_policy_gate",
      ready:
        typeof scripts["hris-payroll:migration:dev:gate"] === "string" &&
        typeof scripts["policy:gates"] === "string" &&
        !scripts["policy:gates"].includes("hris-payroll:migration:dev:gate") &&
        scripts["policy:gates"].includes("statutory:country-pack:gate"),
    },
  ]

  const blockers = checks.filter((check) => !check.ready).map((check) => check.id)
  return {
    summary: {
      generatedAt: new Date().toISOString(), mode: options.mode || "report",
      status: blockers.length ? "BLOCKED_FOR_SYNTHETIC_MIGRATION_DRY_RUN" : "READY_FOR_SYNTHETIC_MIGRATION_DRY_RUN",
      checkCount: checks.length, readyCount: checks.filter((check) => check.ready).length, blockerCount: blockers.length,
    },
    scope: {
      environmentClass: "DEVELOPMENT_SYNTHETIC_DRY_RUN_ONLY",
      productionUseAllowed: false,
      mutationModeAvailable: false,
      productionTenantWritesAllowed: false,
      ownerSignoffGranted: false,
      finalReadinessAllowed: false,
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
    "# HRIS/Payroll Migration-Backfill Development Readiness", "",
    "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode,
    "Status: " + report.summary.status, "", "## Scope", "",
    "- Development synthetic dry run only",
    "- Production use allowed: false",
    "- Mutation mode available: false",
    "- Production tenant writes allowed: false",
    "- Owner signoff granted: false",
    "- Final readiness allowed: false", "", "## Summary", "",
    `- Checks ready: ${report.summary.readyCount}/${report.summary.checkCount}`,
    `- Development blockers: ${report.summary.blockerCount}`,
    `- Upstream production status: ${report.upstream.productionStatus}`,
    `- Upstream production blockers: ${report.upstream.productionBlockers.join(", ") || "none"}`, "", "## Checks", "",
    ...report.checks.map((check) => `- ${check.ready ? "ready" : "blocked"}: ${check.id}`), "", "## Safety", "",
    "- This gate proves dry-run planning and reconciliation controls only; it does not execute a migration.",
    "- All mutations, owner signoff, production tenant writes, and final-readiness claims remain disabled.",
    "- Corrections must be append-only and preserve immutable evidence.", "",
  ].join("\n")
}

function writeReport(root, options, report) {
  for (const [target, value] of [[options.jsonOut, JSON.stringify(report, null, 2) + "\n"], [options.out, renderMarkdown(report)]]) {
    const resolved = path.resolve(root, target)
    fs.mkdirSync(path.dirname(resolved), { recursive: true })
    fs.writeFileSync(resolved, value, "utf8")
  }
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    const report = buildHrisPayrollMigrationDevelopmentReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = { buildHrisPayrollMigrationDevelopmentReadiness, gateResultForReport, parseArgs, renderMarkdown }
