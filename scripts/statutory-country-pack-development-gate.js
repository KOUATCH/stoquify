#!/usr/bin/env node

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

const {
  buildStatutoryCountryPackReadiness,
} = require("./statutory-country-pack-production-gate")

const DEFAULT_JSON_OUT =
  "what-next/statutory-country-pack-development-readiness.json"
const DEFAULT_MARKDOWN_OUT =
  "what-next/statutory-country-pack-development-readiness.md"

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

function latestSourceEvidenceManifest(root) {
  const evidenceRoot = path.join(
    root,
    "docs/HR-Payroll/evidence/country-packs/CM",
  )
  if (!fs.existsSync(evidenceRoot)) return null

  const manifestPath = fs
    .readdirSync(evidenceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(evidenceRoot, entry.name, "manifest.json"))
    .filter((candidate) => fs.existsSync(candidate))
    .sort((left, right) => right.localeCompare(left))[0]

  if (!manifestPath) return null

  try {
    return {
      manifestPath,
      manifest: JSON.parse(fs.readFileSync(manifestPath, "utf8")),
    }
  } catch {
    return null
  }
}

function developmentEvidenceState(root) {
  const loaded = latestSourceEvidenceManifest(root)
  if (!loaded || !Array.isArray(loaded.manifest.artifacts)) {
    return {
      manifestPresent: false,
      artifactsVerified: false,
      productionUseDisabled: false,
      legalNonClaimsPreserved: false,
      artifactCount: 0,
      manifestRef: null,
    }
  }

  const manifestDir = path.dirname(loaded.manifestPath)
  const artifactsVerified =
    loaded.manifest.artifacts.length > 0 &&
    loaded.manifest.artifacts.every((artifact) => {
      if (
        !artifact ||
        typeof artifact.file !== "string" ||
        path.basename(artifact.file) !== artifact.file
      ) {
        return false
      }
      if (
        typeof artifact.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(artifact.sha256)
      ) {
        return false
      }

      const artifactPath = path.join(manifestDir, artifact.file)
      if (!fs.existsSync(artifactPath)) return false
      const bytes = fs.readFileSync(artifactPath)
      const actualHash = crypto.createHash("sha256").update(bytes).digest("hex")
      const byteLengthMatches =
        typeof artifact.byteLength !== "number" ||
        artifact.byteLength === bytes.length

      return actualHash === artifact.sha256 && byteLengthMatches
    })

  const productionUseDisabled =
    loaded.manifest.productionUseAllowed === false &&
    loaded.manifest.reviewStatus === "PENDING_EXPERT_REVIEW" &&
    loaded.manifest.artifacts.every(
      (artifact) =>
        artifact.productionUseAllowed === false &&
        artifact.reviewStatus === "PENDING_EXPERT_REVIEW",
    )

  const nonClaims = Array.isArray(loaded.manifest.nonClaims)
    ? loaded.manifest.nonClaims.join(" ")
    : ""
  const legalNonClaimsPreserved =
    nonClaims.includes("does not certify legal interpretation") &&
    nonClaims.includes("does not constitute qualified reviewer approval")

  return {
    manifestPresent: true,
    artifactsVerified,
    productionUseDisabled,
    legalNonClaimsPreserved,
    artifactCount: loaded.manifest.artifacts.length,
    manifestRef: path
      .relative(root, loaded.manifestPath)
      .split(path.sep)
      .join("/"),
  }
}

function buildStatutoryCountryPackDevelopmentReadiness(
  root = process.cwd(),
  options = {},
) {
  const evidence = developmentEvidenceState(root)
  const productionReport = buildStatutoryCountryPackReadiness(root, {
    mode: "fail",
  })
  const cameroon = read(root, "services/regulatory/country-packs/cameroon.ts")
  const fakeAdapter = read(root, "services/compliance/adapters/fake-sandbox.ts")
  const cameroonAdapter = read(
    root,
    "services/compliance/adapters/cameroon-dgi-sandbox.ts",
  )
  const fiscalDocument = read(
    root,
    "services/compliance/fiscal-document.service.ts",
  )
  const outbox = read(root, "services/compliance/certification-outbox.service.ts")
  const payrollAdapters = read(
    root,
    "services/payroll/payroll-adapter-registry.service.ts",
  )
  const fixtureRunner = read(
    root,
    "services/payroll/payroll-country-pack-fixture-runner.ts",
  )
  const fixtureTests = read(
    root,
    "services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts",
  )
  const countryPackTests = read(
    root,
    "services/regulatory/__tests__/country-pack.service.test.ts",
  )
  const payrollControlTests = read(
    root,
    "services/payroll/__tests__/payroll-control.service.test.ts",
  )
  const packageJson = read(root, "package.json")
  let packageScripts = {}
  try {
    packageScripts = JSON.parse(packageJson).scripts ?? {}
  } catch {
    packageScripts = {}
  }

  const checks = [
    {
      id: "development_evidence_manifest_present",
      ready: evidence.manifestPresent,
    },
    {
      id: "development_source_artifact_integrity",
      ready: evidence.artifactsVerified,
    },
    {
      id: "production_use_explicitly_disabled",
      ready: evidence.productionUseDisabled,
    },
    {
      id: "legal_and_approval_non_claims_preserved",
      ready: evidence.legalNonClaimsPreserved,
    },
    {
      id: "cameroon_production_automation_claim_blocked",
      ready:
        cameroon.includes('"compliance.eInvoicing": "REQUIRES_EXPERT_REVIEW"') &&
        cameroon.includes("productionAutomationAllowed: false") &&
        cameroon.includes('adapterReadiness: "REQUIRES_EXPERT_REVIEW"') &&
        cameroon.includes("sandboxOnly: true"),
    },
    {
      id: "sandbox_adapters_enforce_environment",
      ready:
        fakeAdapter.includes('context.environment !== "FAKE_SANDBOX"') &&
        fakeAdapter.includes("productionCertification: false") &&
        cameroonAdapter.includes('context.environment !== "SANDBOX"') &&
        cameroonAdapter.includes("SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION"),
    },
    {
      id: "production_authority_submission_blocked",
      ready:
        fiscalDocument.includes("ComplianceAdapterEnvironment.PRODUCTION") &&
        fiscalDocument.includes(
          "Production tax-authority certification is blocked until an official adapter is reviewed and registered.",
        ) &&
        outbox.includes(
          "submission.environment === ComplianceAdapterEnvironment.PRODUCTION",
        ) &&
        outbox.includes('errorCode: "PRODUCTION_ADAPTER_BLOCKED"'),
    },
    {
      id: "payroll_live_adapter_certification_guards_present",
      ready:
        payrollAdapters.includes(
          'registryDecision = productionSubmissionSupported',
        ) &&
        payrollAdapters.includes('"AUTOMATION_BLOCKED"') &&
        payrollAdapters.includes(
          'productionPaymentAutomationSupported =',
        ) &&
        payrollAdapters.includes(
          '"BLOCKED_PROVIDER_ADAPTER_CERTIFICATION_INCOMPLETE"',
        ) &&
        payrollAdapters.includes(
          "automatedRetriesEnabled: productionPaymentAutomationSupported",
        ),
    },
    {
      id: "golden_fixture_and_unsupported_country_harness_present",
      ready:
        fixtureRunner.includes("validatePayrollCountryPackCalculationFixtures") &&
        fixtureTests.includes(
          "fails validation when a CNPS scenario output drifts",
        ) &&
        ((countryPackTests.toLowerCase().includes("unsupported") &&
          countryPackTests.toLowerCase().includes("fail")) ||
          payrollControlTests.includes(
            "blocks payroll calculation when the country pack is unsupported at input readiness",
          )),
    },
    {
      id: "production_gate_remains_blocked_for_expert_approval",
      ready:
        productionReport.summary.status === "blocked" &&
        productionReport.blockers.includes("source_artifact_expert_approval"),
    },
    {
      id: "development_and_production_ci_commands_are_separate",
      ready:
        typeof packageScripts["statutory:country-pack:dev:gate"] === "string" &&
        typeof packageScripts["statutory:country-pack:gate"] === "string" &&
        typeof packageScripts["policy:gates"] === "string" &&
        packageScripts["policy:gates"].includes(
          "npm run statutory:country-pack:gate",
        ) &&
        !packageScripts["policy:gates"].includes(
          "npm run statutory:country-pack:dev:gate",
        ),
    },
  ]

  const blockers = checks
    .filter((check) => !check.ready)
    .map((check) => check.id)
  const ready = blockers.length === 0

  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      status: ready
        ? "READY_FOR_DEVELOPMENT_TESTING"
        : "BLOCKED_FOR_DEVELOPMENT_TESTING",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
    },
    scope: {
      environmentClass: "DEVELOPMENT_AND_SANDBOX_ONLY",
      productionUseAllowed: false,
      legalApprovalClaimed: false,
      livePaymentsAllowed: false,
      liveDeclarationsAllowed: false,
      liveAuthoritySubmissionsAllowed: false,
    },
    evidence,
    productionGate: {
      status: productionReport.summary.status,
      blockers: productionReport.blockers,
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
    "# Statutory Country Pack Development Readiness Gate",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode,
    "Status: " + report.summary.status,
    "",
    "## Scope",
    "",
    "- Environment: development and sandbox only",
    "- Production use allowed: false",
    "- Legal approval claimed: false",
    "- Live payments allowed: false",
    "- Live declarations allowed: false",
    "- Live authority submissions allowed: false",
    "",
    "## Summary",
    "",
    "- Checks ready: " +
      report.summary.readyCount +
      "/" +
      report.summary.checkCount,
    "- Development blockers: " + report.summary.blockerCount,
    "- Production gate status: " + report.productionGate.status,
    "- Production gate blockers: " +
      (report.productionGate.blockers.join(", ") || "none"),
    "",
    "## Checks",
    "",
    ...report.checks.map(
      (check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id,
    ),
    "",
    "## Development Blockers",
    "",
    ...(report.blockers.length
      ? report.blockers.map((blocker) => "- " + blocker)
      : ["- None"]),
    "",
    "## Safety",
    "",
    "- This result authorizes only deterministic development and sandbox testing.",
    "- It does not approve statutory interpretation, production payroll, live payment, declaration, or authority submission.",
    "- The independent production gate must remain in the release policy chain and must pass before controlled live or production use.",
  ]

  return lines.join(String.fromCharCode(10)) + String.fromCharCode(10)
}

function writeReport(root, options, report) {
  const jsonTarget = path.resolve(root, options.jsonOut)
  const markdownTarget = path.resolve(root, options.out)
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true })
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true })
  fs.writeFileSync(
    jsonTarget,
    JSON.stringify(report, null, 2) + String.fromCharCode(10),
    "utf8",
  )
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8")
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    const report = buildStatutoryCountryPackDevelopmentReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildStatutoryCountryPackDevelopmentReadiness,
  developmentEvidenceState,
  gateResultForReport,
  parseArgs,
  renderMarkdown,
}
