#!/usr/bin/env node
const fs = require("fs")
const path = require("path")
const DEFAULT_MARKDOWN_OUT = "what-next/ci-release-readiness.md"
const DEFAULT_JSON_OUT = "what-next/ci-release-readiness.json"

function parseArgs(argv = process.argv.slice(2)) {
  const options = { root: process.cwd(), mode: "report", out: DEFAULT_MARKDOWN_OUT, jsonOut: DEFAULT_JSON_OUT }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--root") options.root = path.resolve(argv[++index])
    else if (value === "--mode") options.mode = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error("Unknown argument: " + value)
  }
  if (!["report", "fail"].includes(options.mode)) throw new Error("Unsupported mode: " + options.mode)
  return options
}
function read(root, relativePath) { const target = path.join(root, relativePath); return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "" }
function scalar(source, key) { const match = source.match(new RegExp("^\\s*" + key + ":\\s*([^#\\r\\n]+)", "m")); return match ? match[1].trim().replace(/^['\"]|['\"]$/g, "") : "" }
function databaseName(rawUrl) { try { return new URL(rawUrl).pathname.replace(/^\//, "") } catch { return "" } }

function buildCiReleaseReadiness(root = process.cwd()) {
  const workflow = read(root, ".github/workflows/ci.yml")
  const packageSource = read(root, "package.json")
  const packageJson = packageSource ? JSON.parse(packageSource) : { scripts: {} }
  const policySource = String(packageJson.scripts?.["policy:gates"] || "")
  const verifyCiSource = String(packageJson.scripts?.["verify:ci"] || "")
  const databaseUrl = scalar(workflow, "DATABASE_URL")
  const payrollUrl = scalar(workflow, "PAYROLL_IMMUTABILITY_DATABASE_URL")
  const authSecret = scalar(workflow, "AUTH_SECRET")
  const createDatabaseIndex = workflow.indexOf("CREATE DATABASE stockflow_immutability_test")
  const verifyCiIndex = workflow.indexOf("npm run verify:ci")
  const installDependenciesIndex = workflow.indexOf("npm ci")
  const playwrightInstallIndex = workflow.indexOf("npx playwright install --with-deps chromium")
  const closeAssuranceSmokeIndex = workflow.indexOf("npm run test:e2e:close-assurance")
  const closeAssuranceNeedsVerify = /close-assurance-smoke:\s*[\s\S]*needs:\s*verify/.test(workflow)
  const migrateIndex = verifyCiSource.indexOf("prisma:migrate:deploy")
  const verifyRepoIndex = verifyCiSource.indexOf("verify:repo")
  const productionReferences = [
    /secrets\.(?:DATABASE_URL|PUBLIC_IDENTITY_ABUSE_HASH_SECRET|AQSTOQFLOW_RECEIPT_TOKEN_SECRET)/,
    /CI_RELEASE:\s*["']?1/,
    /VERCEL_ENV:\s*["']?production/i,
    /AQSTOQFLOW_DEPLOY_MIGRATIONS:\s*["']?1/,
  ]
  const checks = [
    { id: "workflow_exists", ready: Boolean(workflow) },
    { id: "workflow_permissions_are_read_only", ready: /permissions:\s*\r?\n\s+contents:\s*read/.test(workflow) },
    { id: "postgres_16_service_is_healthy", ready: /services:\s*[\s\S]*postgres:\s*[\s\S]*image:\s*postgres:16(?:-alpine)?/.test(workflow) && /--health-cmd[\s\S]*pg_isready/.test(workflow) && /- 5432:5432/.test(workflow) },
    { id: "ci_databases_are_isolated", ready: databaseName(databaseUrl) === "aqstoqflow_ci" && databaseName(payrollUrl) === "stockflow_immutability_test" && databaseUrl !== payrollUrl },
    { id: "payroll_test_database_is_created", ready: createDatabaseIndex >= 0 && createDatabaseIndex < verifyCiIndex },
    { id: "ci_auth_configuration_is_synthetic_and_sufficient", ready: authSecret.startsWith("ci-only-") && authSecret.length >= 32 && scalar(workflow, "NODE_ENV") === "test" },
    { id: "production_credentials_and_release_flags_are_absent", ready: productionReferences.every((pattern) => !pattern.test(workflow)) },
    { id: "verify_ci_migrates_before_repository_verification", ready: migrateIndex >= 0 && verifyRepoIndex > migrateIndex && /npm run verify:ci/.test(workflow) },
    { id: "close_assurance_browser_smoke_is_configured", ready: closeAssuranceSmokeIndex > verifyCiIndex && playwrightInstallIndex > installDependenciesIndex && playwrightInstallIndex < closeAssuranceSmokeIndex && closeAssuranceNeedsVerify },
    { id: "node_and_dependency_cache_are_pinned", ready: /actions\/setup-node@v4/.test(workflow) && /node-version:\s*20/.test(workflow) && /cache:\s*npm/.test(workflow) },
    { id: "ci_readiness_gate_is_policy_owned", ready: packageSource.includes('"ci:release:gate"') && packageSource.includes('"verify:ci"') && policySource.includes("npm run ci:release:gate") && verifyCiSource.includes("npm run ci:release:gate") },
  ]
  const blockers = checks.filter((check) => !check.ready).map((check) => check.id)
  return {
    summary: { generatedAt: new Date().toISOString(), status: blockers.length ? "blocked" : "ready", checkCount: checks.length, readyCount: checks.filter((check) => check.ready).length, blockerCount: blockers.length, secretValuePrinted: false },
    checks,
    blockers,
    evidence: {
      postgresService: /image:\s*postgres:16(?:-alpine)?/.test(workflow),
      mainDatabaseConfigured: Boolean(databaseUrl),
      payrollDatabaseConfigured: Boolean(payrollUrl),
      isolatedDatabaseNames: Boolean(databaseName(databaseUrl) && databaseName(payrollUrl) && databaseName(databaseUrl) !== databaseName(payrollUrl)),
      productionSecretReferenceDetected: productionReferences.some((pattern) => pattern.test(workflow)),
      closeAssuranceBrowserSmokeConfigured: closeAssuranceSmokeIndex >= 0,
    },
  }
}
function renderMarkdown(report, mode = "report") {
  const lines = ["# CI Release Readiness", "", "Generated: " + report.summary.generatedAt, "Mode: `" + mode + "`", "Status: `" + report.summary.status + "`", "", "## Summary", "", "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount, "- Blockers: " + report.summary.blockerCount, "- PostgreSQL service: " + (report.evidence.postgresService ? "configured" : "missing"), "- Isolated database names: " + (report.evidence.isolatedDatabaseNames ? "yes" : "no"), "- Production secret references: " + (report.evidence.productionSecretReferenceDetected ? "detected" : "none"), "- Secret values printed: no", "- Close assurance browser smoke: " + (report.evidence.closeAssuranceBrowserSmokeConfigured ? "configured" : "missing"), "", "## Checks", "", ...report.checks.map((check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id), "", "## Blockers", "", ...(report.blockers.length ? report.blockers.map((blocker) => "- " + blocker) : ["- None"]), "", "## Safety", "", "- CI uses ephemeral PostgreSQL credentials and separate database names for general and payroll immutability checks.", "- The workflow must not reference production database or dedicated release-secret contexts.", "- This gate validates repository configuration; GitHub branch protection and Vercel promotion policy remain provider settings."]
  return lines.join("\n") + "\n"
}
function writeReport(root, options, report) { const markdownTarget = path.resolve(root, options.out); const jsonTarget = path.resolve(root, options.jsonOut); fs.mkdirSync(path.dirname(markdownTarget), { recursive: true }); fs.mkdirSync(path.dirname(jsonTarget), { recursive: true }); fs.writeFileSync(markdownTarget, renderMarkdown(report, options.mode), "utf8"); fs.writeFileSync(jsonTarget, JSON.stringify(report, null, 2) + "\n", "utf8") }
function gateResultForReport(report, mode = "report") { return { status: report.summary.status, exitCode: mode === "fail" && report.blockers.length ? 1 : 0 } }
if (require.main === module) { try { const options = parseArgs(); const root = path.resolve(options.root); const report = buildCiReleaseReadiness(root); writeReport(root, options, report); console.log(renderMarkdown(report, options.mode)); process.exitCode = gateResultForReport(report, options.mode).exitCode } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 } }
module.exports = { buildCiReleaseReadiness, databaseName, gateResultForReport, parseArgs, renderMarkdown, scalar }
