#!/usr/bin/env node

const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

const DEFAULT_OUT = "what-next/master-data-onboarding-release-readiness.md"
const DEFAULT_JSON_OUT = "what-next/master-data-onboarding-release-readiness.json"
const BROWSER_EVIDENCE = "what-next/evidence/master-data-onboarding-2026-08-16/browser-matrix.json"

function read(root, relativePath) {
  const target = path.join(root, relativePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""
}

function flattenKeys(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key))
}

function check(id, label, passed, evidence) {
  return { id, label, passed: Boolean(passed), evidence }
}

function evaluateMasterDataOnboardingRelease(root = process.cwd(), options = {}) {
  const config = read(root, "config/master-data-onboarding.ts")
  const sidebar = read(root, "config/sidebar.ts")
  const routeCatalog = read(root, "app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts")
  const actions = read(root, "actions/onboarding/master-data-onboarding.actions.ts")
  const service = read(root, "services/onboarding/master-data-import.service.ts")
  const csv = read(root, "services/onboarding/master-data-csv.ts")
  const component = read(root, "components/onboarding/MasterDataOnboardingWorkbench.tsx")
  const schema = read(root, "prisma/schema.prisma")
  const riskMigration = read(root, "prisma/migrations/20260816100000_master_data_onboarding_risk_tier/migration.sql")
  const en = JSON.parse(read(root, "messages/en.json") || "{}")
  const fr = JSON.parse(read(root, "messages/fr.json") || "{}")
  const enKeys = flattenKeys(en.masterDataOnboarding ?? {}).sort()
  const frKeys = flattenKeys(fr.masterDataOnboarding ?? {}).sort()
  const browserSpec = read(root, "tests/e2e/master-data-onboarding-authenticated-release.spec.ts")
  const browserEvidenceText = read(root, BROWSER_EVIDENCE)
  let browserEvidence = null
  try { browserEvidence = browserEvidenceText ? JSON.parse(browserEvidenceText) : null } catch { browserEvidence = null }

  const checks = [
    check(
      "canonical_module",
      "One settings-module workflow contract owns the route",
      /MODULE_SLUG = "settings"/.test(config) && /ROUTE = "\/dashboard\/settings\/data-onboarding"/.test(config),
      "config/master-data-onboarding.ts",
    ),
    check(
      "single_sidebar_entry",
      "Sidebar exposes exactly one canonical workflow destination",
      (sidebar.match(/href:\s*MASTER_DATA_ONBOARDING_ROUTE/g) ?? []).length === 1 && /moduleSlug:\s*MASTER_DATA_ONBOARDING_MODULE_SLUG/.test(sidebar),
      "config/sidebar.ts",
    ),
    check(
      "page_entitlement",
      "Settings route catalog binds page access to enforced settings entitlement",
      /settings-data-onboarding/.test(routeCatalog) && /moduleSlug:\s*MASTER_DATA_ONBOARDING_MODULE_SLUG/.test(routeCatalog) && /mode:\s*"enforce"/.test(routeCatalog),
      "settings-route-data-access.ts",
    ),
    check(
      "action_entitlement",
      "Every onboarding action flows through the enforced canonical module helper",
      /observeModuleAccess/.test(actions) && /moduleSlug:\s*"settings"/.test(actions) && /mode:\s*"enforce"/.test(actions),
      "actions/onboarding/master-data-onboarding.actions.ts",
    ),
    check(
      "high_risk_maker_checker",
      "High-risk batches reject uploader approval and recheck separation at commit",
      /batch\.riskLevel === "HIGH" && batch\.uploadedById === input\.actorId/.test(service) &&
        /batch\.riskLevel === "HIGH" && batch\.approvedById === batch\.uploadedById/.test(service),
      "services/onboarding/master-data-import.service.ts",
    ),
    check(
      "risk_digest_and_schema",
      "Risk classification is persisted and bound into the approval digest",
      /\| "riskLevel"/.test(service) && /\| "riskReasons"/.test(service) &&
        /riskLevel\s+OnboardingImportRiskLevel/.test(schema) && /ADD COLUMN "riskLevel"/.test(riskMigration),
      "service + schema + additive migration",
    ),
    check(
      "domain_boundaries",
      "Imports preserve canonical customer/supplier/item writers and exclude financial/stock truth",
      /createCustomer\(input\.organizationId/.test(service) && /createSupplier\(input\.organizationId/.test(service) &&
        /createItem\(input\.organizationId/.test(service) && !/MASTER_DATA_IMPORT_TARGETS[^\n]*BALANCE/.test(csv) &&
        /opening accounting balances/.test(service) && /inventory opening quantities or stock movements/.test(service),
      "services/onboarding/*",
    ),
    check(
      "localized_robust_states",
      "English and French expose the same complete onboarding message contract",
      enKeys.length > 0 && JSON.stringify(enKeys) === JSON.stringify(frKeys) &&
        /role=\{notice\.kind === "error" \? "alert" : "status"\}/.test(component) &&
        /data-state="partial"/.test(component) && /data-state="empty"/.test(component),
      `messages/en.json + messages/fr.json (${enKeys.length} leaf keys)`,
    ),
    check(
      "route_recovery_states",
      "Localized loading and error recovery boundaries exist",
      Boolean(read(root, "app/[locale]/(dashboard)/dashboard/settings/data-onboarding/loading.tsx")) &&
        Boolean(read(root, "app/[locale]/(dashboard)/dashboard/settings/data-onboarding/error.tsx")),
      "data-onboarding/loading.tsx + error.tsx",
    ),
    check(
      "focused_tests",
      "Focused service, boundary, route, presentation, and sidebar tests exist",
      Boolean(read(root, "__tests__/master-data-onboarding-workbench.test.tsx")) &&
        /requires a different authorized approver/.test(read(root, "services/onboarding/__tests__/master-data-import-guards.test.ts")) &&
        /exactly one canonical settings-module entry/.test(read(root, "config/__tests__/sidebar.test.ts")),
      "focused Jest suites",
    ),
    check(
      "browser_harness",
      "Authenticated EN/FR desktop/mobile Axe and overflow browser harness exists",
      /for \(const locale of \["en", "fr"\]/.test(browserSpec) && /axe\.run/.test(browserSpec) && /hasDocumentOverflow/.test(browserSpec),
      "tests/e2e/master-data-onboarding-authenticated-release.spec.ts",
    ),
    check(
      "adoption_evidence",
      "Tenant-scoped recent-batch adoption evidence is visible and exportable",
      /evidenceWindow: "RECENT_12_BATCHES"/.test(service) && /separatelyApprovedHighRiskBatchCount/.test(service) &&
        /Focused adoption evidence/.test(JSON.stringify(en.masterDataOnboarding ?? {})),
      "MasterDataOnboardingDashboard.adoption",
    ),
  ]

  const browserEvidencePassed = browserEvidence?.status === "PASS" && browserEvidence?.results?.length === 4
  if (options.requireBrowserEvidence) {
    checks.push(check("executed_browser_evidence", "Executed browser matrix is present and passing", browserEvidencePassed, BROWSER_EVIDENCE))
  }
  const blockerCount = checks.filter((item) => !item.passed).length
  return {
    generatedAt: new Date().toISOString(),
    workflowKey: "governed_master_data_onboarding",
    canonicalModule: "settings",
    canonicalRoute: "/dashboard/settings/data-onboarding",
    scope: {
      included: ["customers", "suppliers", "items", "staging", "approval", "evidence", "readiness"],
      excluded: ["balances", "opening accounting balances", "opening stock", "ledger postings"],
    },
    summary: {
      status: blockerCount === 0 ? (browserEvidencePassed ? "PASS" : "PASS_WITH_CONDITIONS") : "FAIL",
      checkCount: checks.length,
      passedCheckCount: checks.length - blockerCount,
      blockerCount,
      browserEvidence: browserEvidencePassed ? "passed" : "not_run_or_not_passing",
    },
    checks,
  }
}

function renderMarkdown(report, mode) {
  const lines = [
    "# Governed Master-Data Onboarding Release Readiness",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: \`${mode}\``,
    `Result: \`${report.summary.status}\``,
    "",
    "This is evidence-scoped engineering verification, not accounting, accessibility, security, or release certification.",
    "",
    "## Canonical boundary",
    "",
    `- Workflow: \`${report.workflowKey}\``,
    `- Module: \`${report.canonicalModule}\``,
    `- Sidebar/route: \`${report.canonicalRoute}\``,
    `- Explicit exclusions: ${report.scope.excluded.join(", ")}.`,
    "",
    "## Checks",
    "",
    "| Check | Status | Evidence |",
    "| --- | --- | --- |",
    ...report.checks.map((item) => `| ${item.label} | ${item.passed ? "passed" : "failed"} | ${item.evidence} |`),
    "",
    "## Browser evidence",
    "",
    report.summary.browserEvidence === "passed"
      ? `The authenticated EN/FR desktop/mobile matrix passed: \`${BROWSER_EVIDENCE}\`.`
      : `The browser harness is present, but passing runtime evidence is not attached. Run \`npm run test:e2e:master-data-onboarding\` before promotion.`,
    "",
    "## Adoption evidence",
    "",
    "The UI reports a tenant-scoped window of the 12 latest batches: total, committed, blocked, high-risk, and independently approved high-risk batches. These measures are operational adoption evidence and do not import or infer balances or stock.",
  ]
  return lines.join(os.EOL)
}

function parseArgs(argv) {
  const args = { root: process.cwd(), mode: "report", out: DEFAULT_OUT, jsonOut: DEFAULT_JSON_OUT, requireBrowserEvidence: false }
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--out") args.out = argv[++index]
    else if (arg === "--json-out") args.jsonOut = argv[++index]
    else if (arg === "--require-browser-evidence") args.requireBrowserEvidence = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!new Set(["report", "fail"]).has(args.mode)) throw new Error("--mode must be report or fail")
  return args
}

function main(argv = process.argv) {
  const args = parseArgs(argv)
  const report = evaluateMasterDataOnboardingRelease(args.root, args)
  const markdown = renderMarkdown(report, args.mode)
  for (const [target, content] of [[args.out, markdown], [args.jsonOut, `${JSON.stringify(report, null, 2)}${os.EOL}`]]) {
    const absolute = path.resolve(args.root, target)
    fs.mkdirSync(path.dirname(absolute), { recursive: true })
    fs.writeFileSync(absolute, content, "utf8")
  }
  console.log(markdown)
  return args.mode === "fail" && report.summary.blockerCount > 0 ? 1 : 0
}

if (require.main === module) process.exitCode = main(process.argv)

module.exports = { evaluateMasterDataOnboardingRelease, flattenKeys, main, parseArgs, renderMarkdown }
