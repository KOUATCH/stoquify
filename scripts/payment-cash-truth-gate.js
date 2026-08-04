const fs = require("fs")
const path = require("path")
const { writeGeneratedReportFile } = require("./generated-report-writer")

const DEFAULT_JSON_OUT = "what-next/payment-cash-truth-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/payment-cash-truth-readiness.md"

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

  if (!["report", "fail"].includes(options.mode)) throw new Error("Unsupported mode: " + options.mode)
  return options
}

function read(root, relativePath) {
  const target = path.join(root, relativePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""
}

function listMigrationSources(root) {
  const migrationsRoot = path.join(root, "prisma", "migrations")
  if (!fs.existsSync(migrationsRoot)) return []

  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const migrationPath = path.join(migrationsRoot, entry.name, "migration.sql")
      return {
        name: entry.name,
        source: fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "",
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

function hasPaymentReconciliationFoundationMigration(root) {
  const migrations = listMigrationSources(root)
  const workerLeaseIndex = migrations.findIndex(
    (migration) => migration.name === "20260630100000_payment_reconciliation_inbox_worker_leases",
  )
  const upperBound = workerLeaseIndex >= 0 ? workerLeaseIndex : migrations.length
  const foundationMarkers = [
    'CREATE TYPE "PaymentRailType"',
    'CREATE TYPE "ProviderAccountStatus"',
    'CREATE TYPE "ProviderEventStatus"',
    'CREATE TYPE "PaymentReconciliationInboxSource"',
    'CREATE TABLE "payment_rails"',
    'CREATE TABLE "provider_accounts"',
    'CREATE TABLE "settlement_accounts"',
    'CREATE TABLE "provider_events"',
    'CREATE TABLE "statement_files"',
    'CREATE TABLE "statement_lines"',
    'CREATE TABLE "payment_transactions"',
    'CREATE TABLE "match_records"',
    'CREATE TABLE "suspense_items"',
    'CREATE TABLE "reconciliation_runs"',
    'CREATE TABLE "payment_exceptions"',
    'CREATE TABLE "payment_reconciliation_inbox_items"',
    'FOREIGN KEY ("organizationId") REFERENCES "organizations"',
    'FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"',
    'ON "payment_rails"("organizationId", "code")',
    'ON "provider_events"("organizationId", "providerAccountId", "providerEventId")',
    'ON "statement_lines"("organizationId", "providerAccountId", "fingerprint")',
    'ON "reconciliation_runs"("organizationId", "providerAccountId", "businessDate")',
    'ON "payment_reconciliation_inbox_items"("organizationId", "source", "idempotencyKey")',
  ]
  const hasFoundation = migrations
    .slice(0, upperBound)
    .some((migration) => foundationMarkers.every((marker) => migration.source.includes(marker)))

  const workerLeaseMigration = migrations[workerLeaseIndex]
  const hasLeaseMigration =
    Boolean(workerLeaseMigration) &&
    workerLeaseMigration.source.includes('ALTER TABLE "payment_reconciliation_inbox_items"') &&
    workerLeaseMigration.source.includes('ADD COLUMN "leasedBy" TEXT') &&
    workerLeaseMigration.source.includes('ADD COLUMN "leaseToken" TEXT')

  return hasFoundation && hasLeaseMigration
}

function markersInOrder(source, markers) {
  let cursor = -1
  for (const marker of markers) {
    cursor = source.indexOf(marker, cursor + 1)
    if (cursor < 0) return false
  }
  return true
}

function buildPaymentCashTruthReadiness(root = process.cwd(), options = {}) {
  const evidence = read(root, "services/reconciliation/payment-reconciliation-evidence.service.ts")
  const run = read(root, "services/reconciliation/payment-reconciliation-run.service.ts")
  const certification = read(root, "services/reconciliation/payment-reconciliation-certification.service.ts")
  const suspense = read(root, "services/reconciliation/payment-suspense-workflow.service.ts")
  const assurance = read(root, "services/assurance/assurance-registry.service.ts")
  const packageJson = read(root, "package.json")

  const checks = [
    {
      id: "provider_account_readiness_contract",
      ready: evidence.includes("ProviderAccountStatus.ACTIVE") &&
        evidence.includes("paymentRail.isActive") &&
        evidence.includes("settlementLedgerAccountId") &&
        evidence.includes("suspenseLedgerAccountId") &&
        evidence.includes("settlementAccounts.length === 0"),
    },
    {
      id: "run_blocks_unready_provider_before_creation",
      ready: markersInOrder(run, [
        "const providerAccount = await tx.providerAccount.findFirst(",
        "assertProviderAccountReconciliationReady(providerAccount)",
        "const existingRun = await tx.reconciliationRun.findFirst(",
        "run = await tx.reconciliationRun.create(",
      ]),
    },
    {
      id: "redacted_material_evidence_manifest",
      ready: evidence.includes("buildReconciliationEvidenceManifestInTx") &&
        evidence.includes("rawPayloadHash") && evidence.includes("fileHash") &&
        evidence.includes("fingerprint") && evidence.includes("ledgerPostingBatchId") &&
        !evidence.includes("rawPayload: true"),
    },
    {
      id: "deterministic_source_hash",
      ready: evidence.includes("stableReconciliationEvidenceStringify") &&
        evidence.includes('createHash("sha256")') && evidence.includes("sortedById"),
    },
    {
      id: "signoff_rechecks_provider_readiness",
      ready: certification.includes("assertProviderAccountReconciliationReady({") &&
        certification.includes("providerAccountReadyVerified: true"),
    },
    {
      id: "certificate_binds_source_manifest",
      ready: certification.includes("sourceManifestVersion: sourceEvidence.version") &&
        certification.includes("sourceHash: sourceEvidence.sourceHash") &&
        certification.includes("sourceCounts: sourceEvidence.counts"),
    },
    {
      id: "suspense_posting_reconciles_to_posted_ledger",
      ready: suspense.includes("postPaymentSuspenseToLedger(") &&
        certification.includes("assertPaymentSuspenseLedgerTruthInTx("),
    },
    {
      id: "export_recomputes_live_source_hash",
      ready: certification.includes("const signedSourceHash = reconciliationCertificateSourceEvidenceHash") &&
        certification.includes("signedSourceHash !== sourceEvidence.sourceHash"),
    },
    {
      id: "drift_invalidation_commits_before_error",
      ready: certification.includes("return { driftError:") &&
        markersInOrder(certification, [
          'if ("driftError" in result)',
          "throw new BusinessRuleError(result.driftError)",
        ]) &&
        !certification.includes('throw new BusinessRuleError("Reconciliation certificate hash drift detected; rerun sign-off before export.")'),
    },
    {
      id: "scheduled_assurance_recomputes_source_evidence",
      ready: assurance.includes("sourceDriftedRunIds") &&
        assurance.includes("buildReconciliationEvidenceManifestInTx(") &&
        assurance.includes("reconciliationCertificateSourceEvidenceHash("),
    },
    {
      id: "policy_gate_wiring",
      ready: packageJson.includes('"payment:cash-truth:gate"') &&
        packageJson.includes("npm run payment:cash-truth:gate"),
    },
    {
      id: "durable_payment_reconciliation_schema_migration",
      ready: hasPaymentReconciliationFoundationMigration(root),
    },
  ]

  const blockers = checks.filter((check) => !check.ready).map((check) => check.id)
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
    },
    checks,
    blockers,
  }
}

function gateResultForReport(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && report.blockers.length ? 1 : 0,
  }
}

function renderMarkdown(report) {
  const lines = [
    "# Payment Cash Truth Readiness Gate",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode,
    "Status: " + report.summary.status,
    "",
    "## Summary",
    "",
    "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount,
    "- Blockers: " + report.summary.blockerCount,
    "",
    "## Checks",
    "",
    ...report.checks.map((check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => "- " + blocker) : ["- None"]),
    "",
    "## Safety",
    "",
    "- This gate is static and read-only.",
    "- It does not read provider credentials or raw provider payloads.",
    "- It verifies system evidence controls, not external provider or statutory certification.",
  ]
  return lines.join(String.fromCharCode(10)) + String.fromCharCode(10)
}

function writeReport(root, options, report) {
  const jsonTarget = path.resolve(root, options.jsonOut)
  const markdownTarget = path.resolve(root, options.out)
  writeGeneratedReportFile(jsonTarget, JSON.stringify(report, null, 2) + String.fromCharCode(10), "utf8")
  writeGeneratedReportFile(markdownTarget, renderMarkdown(report), "utf8")
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    const report = buildPaymentCashTruthReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildPaymentCashTruthReadiness,
  gateResultForReport,
  markersInOrder,
  parseArgs,
  renderMarkdown,
  hasPaymentReconciliationFoundationMigration,
}
