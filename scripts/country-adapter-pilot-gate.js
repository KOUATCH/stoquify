const fs = require("fs")
const path = require("path")

const DEFAULT_JSON_OUT = "what-next/country-adapter-pilot-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/country-adapter-pilot-readiness.md"

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

function buildCountryAdapterPilotReadiness(root = process.cwd(), options = {}) {
  const adapter = read(root, "services/compliance/adapters/cameroon-dgi-sandbox.ts")
  const registry = read(root, "services/compliance/adapters/registry.ts")
  const worker = read(root, "services/compliance/certification-outbox.service.ts")
  const schemas = read(root, "services/compliance/country-adapter-pilot.schemas.ts")
  const service = read(root, "services/compliance/country-adapter-pilot.service.ts")
  const actions = read(root, "actions/compliance/country-adapter-pilot.actions.ts")
  const center = read(root, "services/compliance/compliance-center.service.ts")
  const dashboard = read(root, "components/compliance/ComplianceCenterDashboard.tsx")
  const countryPack = read(root, "services/regulatory/country-packs/cameroon.ts")
  const prismaSchema = read(root, "prisma/schema.prisma")
  const migration = read(
    root,
    "prisma/migrations/20260727143000_country_adapter_pilot_foundation/migration.sql",
  )
  const adapterTests = read(
    root,
    "services/compliance/__tests__/cameroon-dgi-sandbox.adapter.test.ts",
  )
  const serviceTests = read(
    root,
    "services/compliance/__tests__/country-adapter-pilot.service.test.ts",
  )
  const submissionTests = read(
    root,
    "services/compliance/__tests__/certification-outbox-processing.test.ts",
  )
  const runbook = read(
    root,
    "docs/domains/compliance/CAMEROON_DGI_COUNTRY_ADAPTER_PILOT_OPERATIONS_RUNBOOK_2026-07-27.md",
  )
  let packageScripts = {}
  try {
    packageScripts = JSON.parse(read(root, "package.json") || "{}").scripts || {}
  } catch {
    packageScripts = {}
  }

  const checks = [
    {
      id: "cameroon_adapter_registered_under_shared_contract",
      ready:
        adapter.includes("cameroonDgiSandboxComplianceAdapter") &&
        registry.includes("cameroonDgiSandboxComplianceAdapter") &&
        registry.includes("ComplianceAdapter"),
    },
    {
      id: "production_authority_submission_remains_fail_closed",
      ready:
        adapter.includes('context.environment !== "SANDBOX"') &&
        worker.includes("PRODUCTION_ADAPTER_BLOCKED") &&
        worker.includes("Production compliance submissions are blocked"),
    },
    {
      id: "official_spec_version_date_reference_and_hash_storage",
      ready:
        prismaSchema.includes("officialSpecVersion") &&
        prismaSchema.includes("officialSpecPublishedAt") &&
        prismaSchema.includes("officialSpecReference") &&
        prismaSchema.includes("officialSpecHash") &&
        schemas.includes("officialSpecSchema"),
    },
    {
      id: "independent_expert_review_and_conflict_declaration",
      ready:
        prismaSchema.includes("ComplianceAdapterReviewStatus") &&
        prismaSchema.includes("reviewerConflictDeclared") &&
        prismaSchema.includes("reviewEvidenceHash") &&
        service.includes("cannot independently approve") &&
        serviceTests.includes("maker-checker"),
    },
    {
      id: "credential_reference_is_external_and_redacted",
      ready:
        schemas.includes("credentialReferenceSchema") &&
        schemas.includes("aws-secretsmanager") &&
        schemas.includes("azure-keyvault") &&
        center.includes("credentialReferencePresent") &&
        !dashboard.includes("credentialReference}"),
    },
    {
      id: "credential_expiry_and_rotation_evidence",
      ready:
        prismaSchema.includes("credentialExpiresAt") &&
        prismaSchema.includes("credentialRotatedAt") &&
        service.includes("AUTHORITY_CREDENTIAL_ROTATED") &&
        worker.includes("credentials have expired"),
    },
    {
      id: "tenant_disable_control_preserves_pos_posting",
      ready:
        service.includes("disableCountryAdapter") &&
        service.includes("organizationId: parsed.organizationId") &&
        service.includes("posPostingAffected: false") &&
        worker.includes("configuration is not active or is disabled"),
    },
    {
      id: "accept_reject_outage_and_rate_limit_fixtures",
      ready:
        adapterTests.includes('"ACCEPT"') &&
        adapterTests.includes('"REJECT"') &&
        adapterTests.includes('"OUTAGE"') &&
        adapterTests.includes('"RATE_LIMITED"'),
    },
    {
      id: "idempotent_submission_and_hashed_evidence",
      ready:
        worker.includes("buildComplianceSubmissionIdempotencyKey") &&
        worker.includes("recordComplianceEvidenceOnce") &&
        worker.includes("payloadHash") &&
        worker.includes("responseHash"),
    },
    {
      id: "authority_submission_lifecycle_business_events",
      ready:
        worker.includes('eventType: "AUTHORITY_SUBMISSION_SENT"') &&
        worker.includes('eventType: "AUTHORITY_SUBMISSION_ACCEPTED"') &&
        worker.includes('"AUTHORITY_SUBMISSION_REJECTED"') &&
        submissionTests.includes('"AUTHORITY_SUBMISSION_SENT"') &&
        submissionTests.includes('"AUTHORITY_SUBMISSION_ACCEPTED"') &&
        submissionTests.includes('"AUTHORITY_SUBMISSION_REJECTED"'),
    },
    {
      id: "operator_health_queue_age_and_credential_expiry",
      ready:
        center.includes("healthStatus") &&
        center.includes("oldestQueueAgeSeconds") &&
        center.includes("credentialExpiring") &&
        dashboard.includes("adapter.healthStatus") &&
        dashboard.includes("adapter.openSubmissionCount"),
    },
    {
      id: "fresh_auth_rbac_and_stable_action_contract",
      ready:
        actions.includes('permission: "compliance.adapters.manage"') &&
        actions.includes('permission: "compliance.adapters.approve"') &&
        actions.includes("freshAuth: true") &&
        actions.includes("ok: true as const") &&
        actions.includes("ok: false as const") &&
        actions.includes("STEP_UP_REQUIRED"),
    },
    {
      id: "durable_compliance_and_adapter_schema_migration",
      ready:
        migration.includes('CREATE TABLE "fiscal_documents"') &&
        migration.includes('CREATE TABLE "compliance_submissions"') &&
        migration.includes('CREATE TABLE "compliance_adapter_configs"') &&
        migration.includes('CREATE TABLE "compliance_evidence"') &&
        migration.includes('"officialSpecVersion"') &&
        migration.includes('"reviewEvidenceHash"'),
    },
    {
      id: "country_pack_blocks_unverified_production_automation",
      ready:
        countryPack.includes("productionAutomationAllowed: false") &&
        countryPack.includes("REQUIRES_EXPERT_REVIEW") &&
        countryPack.includes("official DGI technical specifications"),
    },
    {
      id: "pilot_runbook_declares_disable_and_production_boundaries",
      ready:
        runbook.includes("Disable and containment") &&
        runbook.includes("Production promotion checklist") &&
        runbook.includes("SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION"),
    },
    {
      id: "country_adapter_gate_is_release_wired",
      ready:
        typeof packageScripts["country:adapter:pilot:gate"] === "string" &&
        packageScripts["country:adapter:pilot:gate"].includes(
          "country-adapter-pilot-gate.js --mode fail",
        ) &&
        typeof packageScripts["policy:gates"] === "string" &&
        packageScripts["policy:gates"].includes(
          "npm run country:adapter:pilot:gate",
        ),
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
    certificationBoundary: {
      developmentPilotReady: blockers.length === 0,
      productionAuthorityCertified: false,
      productionBlockers: [
        "official_dgi_technical_contract_not_validated",
        "independent_expert_production_review_not_attached",
        "regulator_production_credentials_not_provisioned",
        "external_sandbox_conformance_not_executed",
      ],
    },
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
    "# Country Adapter Pilot Readiness Gate",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode,
    "Status: " + report.summary.status,
    "",
    "## Summary",
    "",
    "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount,
    "- Development blockers: " + report.summary.blockerCount,
    "- Production authority certified: no",
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
    "## Production Certification Blockers",
    "",
    ...report.certificationBoundary.productionBlockers.map(
      (blocker) => "- " + blocker,
    ),
    "",
    "## Safety",
    "",
    "- This gate is static and read-only.",
    "- It does not call an authority, rotate a real secret, or apply a database migration.",
    "- READY means the internal sandbox pilot is development-ready, not regulator-certified.",
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
    const report = buildCountryAdapterPilotReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildCountryAdapterPilotReadiness,
  gateResultForReport,
  parseArgs,
  renderMarkdown,
}
