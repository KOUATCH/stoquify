const fs = require("fs")
const path = require("path")

const DEFAULT_JSON_OUT = "what-next/report-trust-export-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/report-trust-export-readiness.md"

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

function buildReportTrustExportReadiness(root = process.cwd(), options = {}) {
  const accountingService = read(root, "services/accounting/reports.service.ts")
  const accountingAction = read(root, "actions/accounting/reports.actions.ts")
  const analyticsService = read(root, "services/analytics/financial-reports.service.ts")
  const trustBanner = read(root, "components/reports/report-trust-banner.tsx")
  const reportComponents = [
    "components/reports/financial-summary-report.tsx",
    "components/reports/cash-flow-report.tsx",
    "components/reports/cashier-performance-report.tsx",
    "components/reports/item-performance-report.tsx",
  ].map((file) => read(root, file)).join("\n")
  const packageJson = read(root, "package.json")

  const checks = [
    {
      id: "service_owned_accounting_export_data",
      ready: accountingService.includes("await Promise.all") && accountingService.includes("getTrialBalance({") &&
        accountingService.includes("getGeneralLedger({") && accountingService.includes("data: report"),
    },
    {
      id: "versioned_self_describing_export_manifest",
      ready: accountingService.includes('schemaVersion: "accounting-report-export.v1"') &&
        accountingService.includes("sourceTables:") && accountingService.includes("rowCount,") &&
        accountingService.includes("filtersHash,") && accountingService.includes("currency,"),
    },
    {
      id: "tenant_scoped_period_status",
      ready: accountingService.includes("db.accountingPeriod.findFirst") &&
        accountingService.includes("id: input.periodId, organizationId: input.organizationId") &&
        accountingService.includes("periodStatus: period?.status"),
    },
    {
      id: "balance_redaction_and_certification_disclosed",
      ready: accountingService.includes("balanceStatus") &&
        accountingService.includes('redactionStatus: "NO_CONTACT_OR_AUTHENTICATION_FIELDS_INCLUDED"') &&
        accountingService.includes('status: "INTERNAL_ACCOUNTING_REPORT_ONLY"') &&
        accountingService.includes("Not a certified OHADA statutory filing"),
    },
    {
      id: "tamper_evident_content_and_audit",
      ready: accountingService.includes("function hashContent") && accountingService.includes("const contentHash = hashContent(payload)") &&
        accountingService.includes("contentHash,") && accountingService.includes("certificationStatus: provenance.certification.status"),
    },
    {
      id: "permission_and_fresh_auth_boundary",
      ready: accountingAction.includes('permission: "accounting.exports.create"') &&
        accountingAction.includes("freshAuth: { maxAgeSeconds: 300 }") &&
        accountingAction.includes("organizationId: ctx.orgId"),
    },
    {
      id: "analytics_currency_is_service_owned",
      ready: analyticsService.includes("currency: string") && analyticsService.includes("getReportCurrency") &&
        analyticsService.includes("currency: input.currency") && analyticsService.includes("select: { currency: true }"),
    },
    {
      id: "report_ui_has_no_hardcoded_usd",
      ready: !/currency\s*:\s*["']USD["']/.test(reportComponents) &&
        reportComponents.includes("report.provenance.currency") && reportComponents.includes("provenance!.currency"),
    },
    {
      id: "trust_banner_and_policy_wiring",
      ready: trustBanner.includes("Currency: {provenance.currency}") && trustBanner.includes("provenance.sourceTables") &&
        trustBanner.includes("provenance.knownBlockers") && packageJson.includes('"report:trust:export:gate"') &&
        packageJson.includes("npm run report:trust:export:gate"),
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
    "# Report Trust and Export Certification Readiness Gate", "", "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode, "Status: " + report.summary.status, "", "## Summary", "",
    "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount,
    "- Blockers: " + report.summary.blockerCount, "", "## Checks", "",
    ...report.checks.map((check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id),
    "", "## Blockers", "", ...(report.blockers.length ? report.blockers.map((blocker) => "- " + blocker) : ["- None"]),
    "", "## Certification Boundary", "",
    "- Readiness means report provenance, currency, period status, access controls, and integrity evidence are explicit.",
    "- This gate does not certify an export as an OHADA statutory filing or replace Close & Assurance certification.",
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
    const report = buildReportTrustExportReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = { buildReportTrustExportReadiness, gateResultForReport, parseArgs, renderMarkdown }
