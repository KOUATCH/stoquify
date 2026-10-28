const fs = require("fs")
const path = require("path")

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
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true })
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true })
  fs.writeFileSync(jsonTarget, JSON.stringify(report, null, 2) + String.fromCharCode(10), "utf8")
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8")
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
}
