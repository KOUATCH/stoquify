const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const DEFAULT_JSON_OUT = "what-next/statutory-country-pack-production-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/statutory-country-pack-production-readiness.md"

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

function latestSourceEvidenceManifest(root) {
  const evidenceRoot = path.join(root, "docs/HR-Payroll/evidence/country-packs/CM")
  if (!fs.existsSync(evidenceRoot)) return null

  const manifestPath = fs.readdirSync(evidenceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(evidenceRoot, entry.name, "manifest.json"))
    .filter((candidate) => fs.existsSync(candidate))
    .sort((left, right) => right.localeCompare(left))[0]
  if (!manifestPath) return null

  try {
    return { manifestPath, manifest: JSON.parse(fs.readFileSync(manifestPath, "utf8")) }
  } catch {
    return null
  }
}

function sourceEvidenceState(root, countryPackSource) {
  const loaded = latestSourceEvidenceManifest(root)
  if (!loaded || !Array.isArray(loaded.manifest.artifacts)) {
    return { hashesVerified: false, expertApprovalComplete: false }
  }

  const manifestDir = path.dirname(loaded.manifestPath)
  const artifactHashes = new Set()
  const artifactsVerified = loaded.manifest.artifacts.length > 0 && loaded.manifest.artifacts.every((artifact) => {
    if (!artifact || typeof artifact.file !== "string" || path.basename(artifact.file) !== artifact.file) return false
    if (typeof artifact.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(artifact.sha256)) return false
    const artifactPath = path.join(manifestDir, artifact.file)
    if (!fs.existsSync(artifactPath)) return false
    const actual = crypto.createHash("sha256").update(fs.readFileSync(artifactPath)).digest("hex")
    if (actual !== artifact.sha256) return false
    artifactHashes.add(`sha256:${actual}`)
    return true
  })

  const declaredHashes = Array.from(
    countryPackSource.matchAll(/sourceEvidenceHash:\s*["']([^"']+)["']/g),
    (match) => match[1],
  )
  const hashesVerified = artifactsVerified && declaredHashes.length > 0 && declaredHashes.every(
    (hash) => /^sha256:[a-f0-9]{64}$/.test(hash) && artifactHashes.has(hash),
  )
  const approvedStatuses = new Set(["EXPERT_REVIEWED", "REGULATOR_CONFIRMED"])
  const requiredFixtureFamilies = new Set([
    "payroll.cnps.pensionRatesBps",
    "payroll.cnps.familyAllowanceRatesBps",
    "payroll.cnps.occupationalRiskRatesBps",
    "payroll.cnps.employerRules",
  ])
  const approval = loaded.manifest.requiredApproval
  const approvalArtifactVerified = Boolean(
    approval &&
    typeof approval.reviewerIdentity === "string" && approval.reviewerIdentity.trim() &&
    typeof approval.reviewedAt === "string" && approval.reviewedAt.trim() &&
    typeof approval.effectiveFrom === "string" && approval.effectiveFrom.trim() &&
    typeof approval.approvalArtifactFile === "string" &&
    path.basename(approval.approvalArtifactFile) === approval.approvalArtifactFile &&
    typeof approval.approvalArtifactHash === "string" && /^[a-f0-9]{64}$/.test(approval.approvalArtifactHash) &&
    Array.isArray(approval.approvedFixtureFamilies) &&
    approval.approvedFixtureFamilies.length === requiredFixtureFamilies.size &&
    approval.approvedFixtureFamilies.every((family) => requiredFixtureFamilies.has(family)) &&
    fs.existsSync(path.join(manifestDir, approval.approvalArtifactFile)) &&
    crypto.createHash("sha256").update(fs.readFileSync(path.join(manifestDir, approval.approvalArtifactFile))).digest("hex") === approval.approvalArtifactHash
  )
  const expertApprovalComplete = hashesVerified && loaded.manifest.productionUseAllowed === true &&
    approvedStatuses.has(loaded.manifest.reviewStatus) && loaded.manifest.artifacts.every(
      (artifact) => artifact.productionUseAllowed === true && approvedStatuses.has(artifact.reviewStatus),
    ) && approvalArtifactVerified

  return { hashesVerified, expertApprovalComplete }
}

function buildStatutoryCountryPackReadiness(root = process.cwd(), options = {}) {
  const schemas = read(root, "services/regulatory/country-packs/schemas.ts")
  const resolve = read(root, "services/regulatory/country-packs/resolve.ts")
  const validation = read(root, "services/regulatory/country-packs/validation.ts")
  const cameroon = read(root, "services/regulatory/country-packs/cameroon.ts")
  const registry = read(root, "services/compliance/adapters/registry.ts")
  const fakeAdapter = read(root, "services/compliance/adapters/fake-sandbox.ts")
  const cameroonAdapter = read(root, "services/compliance/adapters/cameroon-dgi-sandbox.ts")
  const fiscalDocument = read(root, "services/compliance/fiscal-document.service.ts")
  const outbox = read(root, "services/compliance/certification-outbox.service.ts")
  const payrollEvaluator = read(root, "services/payroll/payroll-tax-rule-evaluator.ts")
  const hardcodeGate = read(root, "scripts/regulatory-hardcode-gate.js")
  const packageJson = read(root, "package.json")
  const sourceEvidence = sourceEvidenceState(root, cameroon)

  const checks = [
    {
      id: "country_pack_provenance_schema",
      ready: schemas.includes("countryPackHeaderSchema") && schemas.includes("legalReferenceSchema") &&
        schemas.includes("effectiveFrom") && schemas.includes("verifiedBy") &&
        schemas.includes('hash: z.string().regex(/^sha256:'),
    },
    {
      id: "published_effective_resolution",
      ready: resolve.includes('pack.header.status === "PUBLISHED"') && resolve.includes("isDateInPackWindow") &&
        resolve.includes("pinnedPackVersion") && resolve.includes("resolutionHash"),
    },
    {
      id: "publish_requires_reviewed_evidence",
      ready: validation.includes("validateCountryPackForPublish") && validation.includes("requirePublished: true") &&
        validation.includes("requireNoExpertReview: true") && validation.includes("GOLDEN_FIXTURE_FAILED"),
    },
    {
      id: "source_artifact_hash_verification",
      ready: sourceEvidence.hashesVerified,
    },
    {
      id: "source_artifact_expert_approval",
      ready: sourceEvidence.expertApprovalComplete,
    },
    {
      id: "cameroon_automation_claim_blocked",
      ready: cameroon.includes('"compliance.eInvoicing": "REQUIRES_EXPERT_REVIEW"') &&
        cameroon.includes("productionAutomationAllowed: false") &&
        cameroon.includes('adapterReadiness: "REQUIRES_EXPERT_REVIEW"'),
    },
    {
      id: "payroll_tax_fail_closed",
      ready: payrollEvaluator.includes("PRODUCTION_TAX_CAPABILITY_STATUSES") &&
        payrollEvaluator.includes("rule.productionCalculationSupported === true") &&
        payrollEvaluator.includes('status: "BLOCKED_REQUIRES_EXPERT_REVIEW"'),
    },
    {
      id: "sandbox_only_adapter_registry",
      ready: registry.includes("fakeSandboxComplianceAdapter") && registry.includes("cameroonDgiSandboxComplianceAdapter") &&
        registry.includes("official specifications, sandbox proof, and expert review") &&
        !registry.includes('adapterKey === "CM_DGI_PRODUCTION"'),
    },
    {
      id: "fiscal_creation_blocks_production",
      ready: fiscalDocument.includes("ComplianceAdapterEnvironment.PRODUCTION") &&
        fiscalDocument.includes("Production tax-authority certification is blocked until an official adapter is reviewed and registered."),
    },
    {
      id: "enqueue_and_worker_block_production",
      ready: outbox.includes("parsed.environment === ComplianceAdapterEnvironment.PRODUCTION") &&
        outbox.includes("submission.environment === ComplianceAdapterEnvironment.PRODUCTION") &&
        outbox.includes('errorCode: "PRODUCTION_ADAPTER_BLOCKED"'),
    },
    {
      id: "sandbox_adapters_self_enforce_environment",
      ready: fakeAdapter.includes('context.environment !== "FAKE_SANDBOX"') &&
        fakeAdapter.includes("productionCertification: false") &&
        cameroonAdapter.includes('context.environment !== "SANDBOX"') &&
        cameroonAdapter.includes("SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION"),
    },
    {
      id: "hardcode_and_policy_wiring",
      ready: hardcodeGate.includes("regulatory-hardcode") && packageJson.includes('"regulatory:hardcode:fail"') &&
        packageJson.includes('"statutory:country-pack:gate"') && packageJson.includes("npm run statutory:country-pack:gate"),
    },
  ]

  const blockers = checks.filter((check) => !check.ready).map((check) => check.id)
  return {
    summary: {
      generatedAt: new Date().toISOString(), mode: options.mode || "report", status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length, readyCount: checks.filter((check) => check.ready).length, blockerCount: blockers.length,
    },
    checks,
    blockers,
  }
}

function gateResultForReport(report, mode = "report") {
  return { status: report.summary.status, exitCode: mode === "fail" && report.blockers.length ? 1 : 0 }
}

function renderMarkdown(report) {
  const lines = [
    "# Statutory Country Pack Production Readiness Gate", "", "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode, "Status: " + report.summary.status, "", "## Summary", "",
    "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount,
    "- Blockers: " + report.summary.blockerCount, "", "## Checks", "",
    ...report.checks.map((check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id),
    "", "## Blockers", "", ...(report.blockers.length ? report.blockers.map((blocker) => "- " + blocker) : ["- None"]),
    "", "## Safety", "", "- This gate is static and read-only.",
    "- It does not publish packs, call authorities, change payroll, or certify legal support.",
    "- Readiness means unsupported production automation fails closed; it is not a legal or statutory certification.",
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
    const report = buildStatutoryCountryPackReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = { buildStatutoryCountryPackReadiness, gateResultForReport, parseArgs, renderMarkdown }
