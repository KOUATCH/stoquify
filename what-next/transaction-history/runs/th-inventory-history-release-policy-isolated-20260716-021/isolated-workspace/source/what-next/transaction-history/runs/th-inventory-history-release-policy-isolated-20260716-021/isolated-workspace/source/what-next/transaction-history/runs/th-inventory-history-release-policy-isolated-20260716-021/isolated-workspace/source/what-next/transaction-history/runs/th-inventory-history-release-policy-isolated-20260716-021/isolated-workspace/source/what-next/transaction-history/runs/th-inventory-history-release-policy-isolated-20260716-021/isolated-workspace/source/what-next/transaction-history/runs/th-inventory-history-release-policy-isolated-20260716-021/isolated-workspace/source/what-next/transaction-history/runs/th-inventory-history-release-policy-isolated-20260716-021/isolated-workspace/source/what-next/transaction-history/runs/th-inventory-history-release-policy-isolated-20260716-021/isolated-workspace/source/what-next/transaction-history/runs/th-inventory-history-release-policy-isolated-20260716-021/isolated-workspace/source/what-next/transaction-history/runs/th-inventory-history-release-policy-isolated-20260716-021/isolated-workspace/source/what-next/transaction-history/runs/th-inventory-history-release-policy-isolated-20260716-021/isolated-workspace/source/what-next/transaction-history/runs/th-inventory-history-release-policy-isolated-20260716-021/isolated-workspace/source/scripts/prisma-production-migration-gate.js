#!/usr/bin/env node

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const DEFAULT_MARKDOWN_OUT = "what-next/prisma-migration-deployment-readiness.md"
const DEFAULT_JSON_OUT = "what-next/prisma-migration-deployment-readiness.json"
const APPROVALS_FILE = "prisma/migration-risk-approvals.json"
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"])
const EXPLICIT_TARGETS = new Set(["production", "staging", "preview-isolated"])

const RISK_RULES = [
  { id: "drop_table", pattern: /\bDROP\s+TABLE\b/gi },
  { id: "drop_column", pattern: /\bDROP\s+COLUMN\b/gi },
  { id: "drop_type", pattern: /\bDROP\s+TYPE\b/gi },
  { id: "drop_schema", pattern: /\bDROP\s+SCHEMA\b/gi },
  { id: "truncate", pattern: /\bTRUNCATE(?:\s+TABLE)?\b/gi },
  { id: "delete_rows", pattern: /\bDELETE\s+FROM\b/gi },
  { id: "alter_column_type", pattern: /\bALTER\s+(?:TABLE\s+[^;]+?\s+)?COLUMN\s+[^;]+?\s+TYPE\b/gis },
  { id: "rename_table_or_column", pattern: /\bRENAME\s+(?:TABLE|COLUMN)\b/gi },
]
const RISK_RULE_IDS = new Set(RISK_RULES.map((rule) => rule.id))

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    environment: "auto",
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--root") options.root = path.resolve(argv[++index])
    else if (value === "--mode") options.mode = argv[++index]
    else if (value === "--environment") options.environment = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error("Unknown argument: " + value)
  }

  if (!["report", "fail", "execute"].includes(options.mode)) throw new Error("Unsupported mode: " + options.mode)
  if (!["auto", "production", "preview", "local"].includes(options.environment)) {
    throw new Error("Unsupported environment: " + options.environment)
  }
  return options
}

function normalizeRelativePath(value) {
  return String(value || "").replace(/\\/g, "/")
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length
}

function listMigrationFiles(root) {
  const migrationsRoot = path.join(root, "prisma", "migrations")
  if (!fs.existsSync(migrationsRoot)) return []
  return fs.readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsRoot, entry.name, "migration.sql"))
    .filter((file) => fs.existsSync(file))
    .sort()
}

function readApprovalRegistry(root) {
  const target = path.join(root, APPROVALS_FILE)
  if (!fs.existsSync(target)) {
    return { exists: false, valid: false, approvals: [], errors: ["approval_registry_missing"] }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(target, "utf8"))
    const approvals = Array.isArray(parsed.approvals) ? parsed.approvals : []
    const errors = []
    if (parsed.version !== 1) errors.push("approval_registry_version")
    for (const approval of approvals) {
      if (
        typeof approval.migration !== "string" ||
        !/^prisma\/migrations\/[^/]+\/migration\.sql$/.test(normalizeRelativePath(approval.migration)) ||
        !/^[a-f0-9]{64}$/.test(String(approval.sha256 || "")) ||
        !Array.isArray(approval.rules) ||
        !approval.rules.length ||
        !approval.rules.every((rule) => RISK_RULE_IDS.has(rule)) ||
        typeof approval.approvedBy !== "string" ||
        !approval.approvedBy.trim() ||
        typeof approval.reason !== "string" ||
        !approval.reason.trim() ||
        !/^\d{4}-\d{2}-\d{2}/.test(String(approval.approvedAt || ""))
      ) {
        errors.push("approval_registry_entry_invalid")
      }
    }
    return { exists: true, valid: errors.length === 0, approvals, errors: [...new Set(errors)] }
  } catch {
    return { exists: true, valid: false, approvals: [], errors: ["approval_registry_unparseable"] }
  }
}

function scanMigrationRisks(root) {
  const files = listMigrationFiles(root)
  const registry = readApprovalRegistry(root)
  const findings = []

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8")
    const migration = normalizeRelativePath(path.relative(root, file))
    const digest = sha256(source)
    for (const rule of RISK_RULES) {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags)
      for (const match of source.matchAll(pattern)) {
        const approval = registry.approvals.find((candidate) =>
          normalizeRelativePath(candidate.migration) === migration &&
          candidate.sha256 === digest &&
          candidate.rules.includes(rule.id),
        )
        findings.push({ migration, rule: rule.id, line: lineAt(source, match.index || 0), approved: Boolean(approval) })
      }
    }
  }

  const staleApprovals = registry.approvals.filter((approval) => {
    const relative = normalizeRelativePath(approval.migration)
    const target = path.resolve(root, relative)
    const migrationsRoot = path.resolve(root, "prisma", "migrations") + path.sep
    return !target.startsWith(migrationsRoot) || !fs.existsSync(target) || sha256(fs.readFileSync(target, "utf8")) !== approval.sha256
  }).map((approval) => normalizeRelativePath(approval.migration))

  return { files, registry, findings, staleApprovals: [...new Set(staleApprovals)] }
}

function resolveEnvironment(value, environment) {
  if (value !== "auto") return value
  const vercelEnvironment = String(environment.VERCEL_ENV || "").trim().toLowerCase()
  if (vercelEnvironment === "production") return "production"
  if (vercelEnvironment === "preview") return "preview"
  return "local"
}

function validateDatabaseTarget(rawUrl) {
  if (!rawUrl) return { configured: false, safe: false, reason: "database_url_missing" }
  try {
    const parsed = new URL(rawUrl)
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      return { configured: true, safe: false, reason: "database_protocol_not_postgresql" }
    }
    if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
      return { configured: true, safe: false, reason: "database_target_is_local" }
    }
    return { configured: true, safe: true, reason: null }
  } catch {
    return { configured: true, safe: false, reason: "database_url_invalid" }
  }
}

function buildDeploymentDecision(environmentName, environment) {
  const forced = environment.AQSTOQFLOW_DEPLOY_MIGRATIONS === "1"
  const shouldDeploy = environmentName === "production" || forced
  const attestedTarget = String(environment.AQSTOQFLOW_DATABASE_TARGET || "").trim().toLowerCase()
  const database = shouldDeploy ? validateDatabaseTarget(environment.DATABASE_URL) : { configured: false, safe: true, reason: null }
  const blockers = []

  if (shouldDeploy && !database.safe) blockers.push(database.reason)
  if (forced && environmentName !== "production" && !EXPLICIT_TARGETS.has(attestedTarget)) {
    blockers.push("explicit_database_target_attestation_missing")
  }
  if (forced && environmentName === "preview" && attestedTarget !== "preview-isolated") {
    blockers.push("preview_database_must_be_attested_isolated")
  }

  return {
    environment: environmentName,
    shouldDeploy,
    reason: shouldDeploy ? (environmentName === "production" ? "vercel_production" : "explicit_opt_in") : "non_production_default_skip",
    databaseConfigured: database.configured,
    databaseTargetSafe: database.safe,
    targetAttestation: attestedTarget || null,
    blockers: [...new Set(blockers)],
  }
}

function buildPrismaMigrationReadiness(root = process.cwd(), options = {}) {
  const environment = options.environmentValues || process.env
  const environmentName = resolveEnvironment(options.environment || "auto", environment)
  const risk = scanMigrationRisks(root)
  const deployment = buildDeploymentDecision(environmentName, environment)
  const packagePath = path.join(root, "package.json")
  const packageSource = fs.existsSync(packagePath) ? fs.readFileSync(packagePath, "utf8") : ""
  const packageJson = packageSource ? JSON.parse(packageSource) : { scripts: {} }
  const buildSource = String(packageJson.scripts?.build || "")
  const policySource = String(packageJson.scripts?.["policy:gates"] || "")
  const verifyReleaseSource = String(packageJson.scripts?.["verify:release"] || "")
  const preflightIndex = buildSource.indexOf("release:secrets:preflight")
  const migrationIndex = buildSource.indexOf("prisma:migrate:deploy:safe")
  const appBuildIndex = buildSource.indexOf("build:linted")

  const checks = [
    { id: "migration_history_present", ready: risk.files.length > 0 },
    { id: "migration_files_nonempty", ready: risk.files.length > 0 && risk.files.every((file) => fs.statSync(file).size > 0) },
    { id: "risk_approval_registry_valid", ready: risk.registry.exists && risk.registry.valid && risk.staleApprovals.length === 0 },
    { id: "destructive_sql_is_exact_hash_approved", ready: risk.findings.every((finding) => finding.approved) },
    { id: "deployment_target_is_safe", ready: deployment.blockers.length === 0 },
    {
      id: "production_build_orders_secret_migration_and_app_gates",
      ready: preflightIndex >= 0 && migrationIndex > preflightIndex && appBuildIndex > migrationIndex,
    },
    { id: "migration_safety_gate_is_in_policy_chain", ready: policySource.includes("npm run prisma:migration:safety:gate") },
    { id: "release_verification_has_migration_preflight", ready: verifyReleaseSource.includes("prisma:migration:release:preflight") },
  ]

  const blockers = [
    ...checks.filter((check) => !check.ready).map((check) => check.id),
    ...risk.registry.errors,
    ...risk.staleApprovals.map(() => "stale_migration_risk_approval"),
    ...deployment.blockers,
  ]

  return {
    summary: {
      generatedAt: new Date().toISOString(),
      status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: [...new Set(blockers)].length,
      migrationCount: risk.files.length,
      riskFindingCount: risk.findings.length,
      approvedRiskCount: risk.findings.filter((finding) => finding.approved).length,
      secretValuePrinted: false,
    },
    deployment,
    execution: { attempted: false, status: deployment.shouldDeploy ? "pending" : "skipped", exitCode: null },
    checks,
    findings: risk.findings,
    staleApprovals: risk.staleApprovals,
    blockers: [...new Set(blockers)],
  }
}

function executeMigration(report, options = {}) {
  if (report.blockers.length || !report.deployment.shouldDeploy) return report
  const runner = options.runner || spawnSync
  const command = process.platform === "win32" ? "npm.cmd" : "npm"
  const result = runner(command, ["run", "prisma:migrate:deploy"], {
    cwd: options.root || process.cwd(),
    env: options.environmentValues || process.env,
    stdio: "inherit",
    shell: false,
  })
  report.execution = {
    attempted: true,
    status: result.error || result.status !== 0 ? "failed" : "succeeded",
    exitCode: result.status ?? 1,
  }
  if (report.execution.status === "failed") {
    report.blockers = [...new Set([...report.blockers, "migration_deploy_failed"])]
    report.summary.blockerCount = report.blockers.length
    report.summary.status = "blocked"
  }
  return report
}

function renderMarkdown(report, mode = "report") {
  const lines = [
    "# Prisma Migration Deployment Readiness",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: `" + mode + "`",
    "Status: `" + report.summary.status + "`",
    "",
    "## Summary",
    "",
    "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount,
    "- Migrations: " + report.summary.migrationCount,
    "- Risk findings: " + report.summary.riskFindingCount,
    "- Approved risks: " + report.summary.approvedRiskCount,
    "- Blockers: " + report.summary.blockerCount,
    "- Secret values printed: no",
    "",
    "## Deployment Decision",
    "",
    "- Environment: `" + report.deployment.environment + "`",
    "- Action: `" + (report.deployment.shouldDeploy ? "deploy" : "skip") + "`",
    "- Reason: `" + report.deployment.reason + "`",
    "- Database URL configured: " + (report.deployment.databaseConfigured ? "yes" : "no"),
    "- Database target safe: " + (report.deployment.databaseTargetSafe ? "yes" : "no"),
    "- Execution: `" + report.execution.status + "`",
    "",
    "## Checks",
    "",
    ...report.checks.map((check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id),
    "",
    "## Risk Findings",
    "",
    ...(report.findings.length
      ? report.findings.map((finding) => "- " + (finding.approved ? "approved" : "blocked") + ": " + finding.rule + " in " + finding.migration + ":" + finding.line)
      : ["- No destructive SQL patterns detected."]),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => "- " + blocker) : ["- None"]),
    "",
    "## Safety",
    "",
    "- Local and preview deployments skip database mutation by default.",
    "- Production deployment requires a non-local PostgreSQL DATABASE_URL supplied through the process environment.",
    "- Approved destructive SQL is bound to the exact migration file hash.",
    "- Database URLs and credentials are never written to evidence.",
  ]
  return lines.join("\n") + "\n"
}

function writeReport(root, options, report) {
  const markdownTarget = path.resolve(root, options.out)
  const jsonTarget = path.resolve(root, options.jsonOut)
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true })
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true })
  fs.writeFileSync(markdownTarget, renderMarkdown(report, options.mode), "utf8")
  fs.writeFileSync(jsonTarget, JSON.stringify(report, null, 2) + "\n", "utf8")
}

function gateResultForReport(report, mode = "report") {
  return { status: report.summary.status, exitCode: mode !== "report" && report.blockers.length ? 1 : 0 }
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    let report = buildPrismaMigrationReadiness(root, { environment: options.environment })
    if (options.mode === "execute") report = executeMigration(report, { root })
    writeReport(root, options, report)
    console.log(renderMarkdown(report, options.mode))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildDeploymentDecision,
  buildPrismaMigrationReadiness,
  executeMigration,
  gateResultForReport,
  parseArgs,
  renderMarkdown,
  resolveEnvironment,
  scanMigrationRisks,
  validateDatabaseTarget,
}
