const fs = require("fs")
const path = require("path")

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
