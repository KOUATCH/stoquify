const fs = require("fs")
const os = require("os")
const path = require("path")
const { buildCiReleaseReadiness, gateResultForReport, renderMarkdown } = require("../ci-release-readiness-gate")

const workflow = `name: Stoquify Release Gates
permissions:
  contents: read
jobs:
  verify:
    services:
      postgres:
        image: postgres:16-alpine
        ports:
          - 5432:5432
        options: --health-cmd "pg_isready -U ci" --health-interval 10s --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: "postgresql://ci:ci@localhost:5432/aqstoqflow_ci?schema=public"
      PAYROLL_IMMUTABILITY_DATABASE_URL: "postgresql://ci:ci@localhost:5432/stockflow_immutability_test?schema=public"
      AUTH_SECRET: "ci-only-auth-secret-32-characters-minimum-value"
      NODE_ENV: test
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: psql --command 'CREATE DATABASE stockflow_immutability_test;'
      - run: npm run verify:ci
  close-assurance-smoke:
    needs: verify
    steps:
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e:close-assurance
`
function makeRepo(input = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ci-release-readiness-"))
  fs.mkdirSync(path.join(root, ".github/workflows"), { recursive: true })
  fs.writeFileSync(path.join(root, ".github/workflows/ci.yml"), input.workflow || workflow, "utf8")
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: {
    "policy:gates": "npm run ci:release:gate && npm run release:evidence:gate",
    "ci:release:gate": "node scripts/ci-release-readiness-gate.js --mode fail",
    "verify:ci": input.verifyCi || "npm run ci:release:gate && npm run prisma:migrate:deploy && npm run verify:repo",
  } }), "utf8")
  return root
}

describe("CI release readiness gate", () => {
  it("accepts an isolated database-backed verification workflow", () => {
    const report = buildCiReleaseReadiness(makeRepo())
    expect(report.summary).toMatchObject({ status: "ready", readyCount: 11, checkCount: 11, blockerCount: 0 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })
  it("blocks a missing PostgreSQL service", () => {
    const report = buildCiReleaseReadiness(makeRepo({ workflow: workflow.replace("image: postgres:16-alpine", "image: redis:7-alpine") }))
    expect(report.blockers).toContain("postgres_16_service_is_healthy")
  })
  it("blocks shared general and payroll database targets", () => {
    const shared = workflow.replace("postgresql://ci:ci@localhost:5432/stockflow_immutability_test?schema=public", "postgresql://ci:ci@localhost:5432/aqstoqflow_ci?schema=public")
    expect(buildCiReleaseReadiness(makeRepo({ workflow: shared })).blockers).toContain("ci_databases_are_isolated")
  })
  it("blocks production secret contexts and release flags", () => {
    const unsafe = workflow + "      CI_RELEASE: \"1\"\n      RECEIPT: ${{ secrets.AQSTOQFLOW_RECEIPT_TOKEN_SECRET }}\n"
    const report = buildCiReleaseReadiness(makeRepo({ workflow: unsafe }))
    expect(report.blockers).toContain("production_credentials_and_release_flags_are_absent")
  })
  it("blocks repository verification before migration deployment", () => {
    const report = buildCiReleaseReadiness(makeRepo({ verifyCi: "npm run ci:release:gate && npm run verify:repo && npm run prisma:migrate:deploy" }))
    expect(report.blockers).toContain("verify_ci_migrates_before_repository_verification")
  })
  it("blocks a missing close assurance browser smoke job", () => {
    const withoutSmoke = workflow
      .replace("      - run: npx playwright install --with-deps chromium\n", "")
      .replace("      - run: npm run test:e2e:close-assurance\n", "")
    const report = buildCiReleaseReadiness(makeRepo({ workflow: withoutSmoke }))
    expect(report.blockers).toContain("close_assurance_browser_smoke_is_configured")
  })
  it("never serializes CI credentials or database URLs", () => {
    const report = buildCiReleaseReadiness(makeRepo())
    const evidence = renderMarkdown(report, "fail") + JSON.stringify(report)
    expect(evidence).not.toContain("ci-only-auth-secret-32-characters-minimum-value")
    expect(evidence).not.toContain("postgresql://")
    expect(report.summary.secretValuePrinted).toBe(false)
    expect(evidence).toContain("closeAssuranceBrowserSmokeConfigured")
  })
})
