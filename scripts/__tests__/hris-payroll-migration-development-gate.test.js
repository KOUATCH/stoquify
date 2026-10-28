const fs = require("fs")
const os = require("os")
const path = require("path")

const buildPayrollAccountingCloseDevelopmentReadiness = jest.fn()
jest.mock("../payroll-accounting-close-development-gate", () => ({
  buildPayrollAccountingCloseDevelopmentReadiness,
}))

const {
  buildHrisPayrollMigrationDevelopmentReadiness,
  gateResultForReport,
} = require("../hris-payroll-migration-development-gate")

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "migration-dev-gate-"))
  const files = {
    "services/hris/migration-backfill-pilot.service.ts": 'mutation mode is intentionally unavailable organizationId !== parsed.organizationId sourceProjectionHash correctionPlanHash reconciliationHash strategy: "CORRECTION_ONLY" mutationCount: 0 immutableEvidencePreserved rawPersonDataIncluded: false "PENDING_OWNER_SIGNOFF" requiredSignoffs',
    "services/hris/__tests__/migration-backfill-pilot.service.test.ts": 'it( dryRun: false not.toHaveBeenCalled blocks ambiguous and cross-tenant legacy rows second.evidence.reconciliationHash strategy: "CORRECTION_ONLY" blocks close signoff when immutable evidence changes closePack: { status: "PENDING_OWNER_SIGNOFF" }',
    "services/payroll/payroll-seed-backfill-plan.service.ts": "mutation mode is intentionally unavailable organizationId: input.organizationId stableKey append a reversing correction event rawPaymentDestinationIncluded: false requiredSignoffs",
    "services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts": "it( refuses mutation mode before any database read is attempted no person/payment details",
    "services/payroll/payroll-proof-backfill-reconciliation.service.ts": "requires a persisted execution certificate audit id or ledger key expectedSourceDryRunEvidenceHash idempotencyLedger rawProviderPayloadIncluded",
    "services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts": "it( requires a persisted source certificate selector before tenant scans source certificate hash does not match approval evidence keeps data-trust proof blockers when current proof gaps remain rawPersonDataIncluded: false",
    "scripts/hris-migration-backfill-pilot.ts": 'stringArg(args, "dry-run") !== "false"',
    "scripts/hris-migration-pilot-remediate-local.js": 'assertLocalOnly endsWith("_local")',
  }
  for (const [file, source] of Object.entries(files)) write(root, file, source)
  write(root, "package.json", JSON.stringify({ scripts: {
    "hris-payroll:migration:dev:gate": "node gate",
    "statutory:country-pack:gate": "node production",
    "policy:gates": "npm run statutory:country-pack:gate",
  }}))
  return root
}

beforeEach(() => {
  buildPayrollAccountingCloseDevelopmentReadiness.mockReturnValue({
    summary: { status: "READY_FOR_DEVELOPMENT_ACCOUNTING_CLOSE_ASSURANCE" },
    scope: { productionUseAllowed: false, postedLedgerMutationAllowed: false, certifiedProductionCloseAllowed: false },
    upstream: { productionStatus: "blocked", productionBlockers: ["source_artifact_hash_verification", "source_artifact_expert_approval"] },
  })
})

test("passes synthetic dry-run readiness while all mutation and signoff remain disabled", () => {
  const report = buildHrisPayrollMigrationDevelopmentReadiness(fixture(), { mode: "fail" })
  expect(report.summary).toMatchObject({ status: "READY_FOR_SYNTHETIC_MIGRATION_DRY_RUN", readyCount: 11, blockerCount: 0 })
  expect(report.scope).toMatchObject({
    productionUseAllowed: false,
    mutationModeAvailable: false,
    productionTenantWritesAllowed: false,
    ownerSignoffGranted: false,
    finalReadinessAllowed: false,
  })
  expect(report.upstream.productionStatus).toBe("blocked")
  expect(gateResultForReport(report, "fail").exitCode).toBe(0)
})

test("blocks when mutation-before-read coverage disappears", () => {
  const root = fixture()
  write(root, "services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts", "it( no person/payment details")
  const report = buildHrisPayrollMigrationDevelopmentReadiness(root, { mode: "fail" })
  expect(report.blockers).toContain("dry_run_only_before_database_reads")
})

test("blocks when the close-assurance development prerequisite regresses", () => {
  buildPayrollAccountingCloseDevelopmentReadiness.mockReturnValue({
    summary: { status: "BLOCKED_FOR_DEVELOPMENT_ACCOUNTING_CLOSE_ASSURANCE" },
    scope: { productionUseAllowed: false, postedLedgerMutationAllowed: false, certifiedProductionCloseAllowed: false },
    upstream: { productionStatus: "blocked", productionBlockers: ["source_artifact_expert_approval"] },
  })
  const report = buildHrisPayrollMigrationDevelopmentReadiness(fixture(), { mode: "fail" })
  expect(report.blockers).toContain("accounting_close_development_prerequisite_ready")
})

test("blocks if the development command enters the production policy chain", () => {
  const root = fixture()
  write(root, "package.json", JSON.stringify({ scripts: {
    "hris-payroll:migration:dev:gate": "node gate",
    "statutory:country-pack:gate": "node production",
    "policy:gates": "npm run statutory:country-pack:gate && npm run hris-payroll:migration:dev:gate",
  }}))
  const report = buildHrisPayrollMigrationDevelopmentReadiness(root, { mode: "fail" })
  expect(report.blockers).toContain("development_gate_is_not_a_production_policy_gate")
})
