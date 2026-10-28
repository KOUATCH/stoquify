const fs = require("fs")
const path = require("path")

const DEFAULT_JSON_OUT = "what-next/role-based-operating-cockpit-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/role-based-operating-cockpit-readiness.md"

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

function buildRoleCockpitReadiness(root = process.cwd(), options = {}) {
  const service = read(root, "services/daily-habit/daily-habit-digest.service.ts")
  const contracts = read(root, "services/daily-habit/daily-habit-digest-contracts.ts")
  const component = read(root, "components/daily-habit/DailyHabitDigestDashboard.tsx")
  const route = read(root, "app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx")
  const loading = read(root, "app/[locale]/(dashboard)/dashboard/daily-digest/loading.tsx")
  const error = read(root, "app/[locale]/(dashboard)/dashboard/daily-digest/error.tsx")
  const packageJson = read(root, "package.json")

  const checks = [
    {
      id: "tenant_metadata_is_service_owned",
      ready: service.includes("db.organization.findFirst") && service.includes("isActive: true, deletedAt: null") &&
        service.includes("select: { name: true, currency: true }") && service.includes("organization.currency.trim().toUpperCase()"),
    },
    {
      id: "route_propagates_roles_without_currency_override",
      ready: route.includes("actorRoleCodes: ctx.roles.map") && route.includes("actorPermissions: ctx.permissions") &&
        route.includes('"analytics.read"') && !route.includes('currency: "XAF"'),
    },
    {
      id: "digest_configs_are_permission_filtered",
      ready: service.includes("DIGEST_CONFIGS.filter((config) => isDigestVisible(config, input))") &&
        service.includes("hasRbacPermission(input.actorPermissions, config.requiredPermission)"),
    },
    {
      id: "owner_and_manager_dashboard_roles_are_separated",
      ready: service.includes('audienceRoleCodes: ["owner", "admin", "administrator", "org_admin", "super_admin"]') &&
        service.includes('audienceRoleCodes: ["manager"]') && service.includes("actorRoleCodes.map(normalizeRoleCode)"),
    },
    {
      id: "hidden_workspace_evidence_is_explicit",
      ready: contracts.includes("hiddenDigestCount: number") &&
        service.includes("hiddenDigestCount: DIGEST_CONFIGS.length - visibleConfigs.length") &&
        component.includes("data.summary.hiddenDigestCount"),
    },
    {
      id: "no_workspace_permission_and_session_states",
      ready: component.includes("No Daily Digest workspace is available") && component.includes('role="status"') &&
        route.includes('kind={noActiveOrg ? "no_active_org" : "permission_denied"}') &&
        loading.includes("Preparing Daily Digest") && error.includes("Daily Digest could not load"),
    },
    {
      id: "command_center_anatomy_is_present",
      ready: component.includes("BICommandBriefHeader") && component.includes("BIKpiCard") &&
        component.includes("BIWhatChangedStrip") && component.includes("DigestActions") &&
        component.includes("BIRiskOpportunityRadar") && component.includes("BIBusinessTruthZone"),
    },
    {
      id: "canonical_dashboard_tokens_and_accessibility",
      ready: component.includes("dashboard-landing-theme dark") && component.includes("dashboardPanelClass") &&
        component.includes('aria-hidden="true"') && component.includes("Back to dashboard"),
    },
    {
      id: "cockpit_gate_is_in_policy_chain",
      ready: packageJson.includes('"role:cockpit:gate"') && packageJson.includes("npm run role:cockpit:gate"),
    },
  ]

  const blockers = checks.filter((check) => !check.ready).map((check) => check.id)
  return {
    summary: {
      generatedAt: new Date().toISOString(), mode: options.mode || "report", status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length, readyCount: checks.filter((check) => check.ready).length, blockerCount: blockers.length,
    },
    scope: {
      roleWorkspace: "Daily Digest",
      route: "/[locale]/dashboard/daily-digest",
      service: "services/daily-habit/daily-habit-digest.service.ts",
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
    "# Role-Based Operating Cockpit Readiness Gate", "", "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode, "Status: " + report.summary.status, "", "## Scope", "",
    "- Workspace: " + report.scope.roleWorkspace, "- Route: " + report.scope.route,
    "- Service: " + report.scope.service, "", "## Summary", "",
    "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount,
    "- Blockers: " + report.summary.blockerCount, "", "## Checks", "",
    ...report.checks.map((check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id),
    "", "## Blockers", "", ...(report.blockers.length ? report.blockers.map((blocker) => "- " + blocker) : ["- None"]),
    "", "## Boundary", "",
    "- Readiness applies to the Daily Digest cockpit slice, not every Stoquify role surface.",
    "- Metrics remain read-only, service-owned, permission-filtered, and explicit about hidden workspaces.",
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
    const report = buildRoleCockpitReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = { buildRoleCockpitReadiness, gateResultForReport, parseArgs, renderMarkdown }
