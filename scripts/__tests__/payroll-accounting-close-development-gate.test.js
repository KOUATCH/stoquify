const fs = require("fs")
const os = require("os")
const path = require("path")

const buildPaymentsDeclarationsDevelopmentReadiness = jest.fn()
jest.mock("../payroll-payments-declarations-development-gate", () => ({
  buildPaymentsDeclarationsDevelopmentReadiness,
}))

const {
  buildPayrollAccountingCloseDevelopmentReadiness,
  gateResultForReport,
} = require("../payroll-accounting-close-development-gate")

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "accounting-close-dev-gate-"))
  const files = {
    "services/payroll/payroll-register.service.ts": "componentMappingTieOutForReadModel unmappedLineCount accounting_source_links/journal_entry_lines",
    "services/accounting/data-trust.service.ts": "payroll-posted-runs-certified-input-proof-missing payroll-paid-runs-without-settled-payments payroll-ledger-source-link-missing Only JSON accountant trust-pack exports are enabled Secrets, raw provider payloads, and tenant internals excluded",
    "services/accounting/close-assurance.service.ts": "close assurance",
    "services/accounting/close-assurance-pack.service.ts": "Certified close pack is blocked close.certification.invalidated staleReason person-level payroll amounts are redacted",
    "services/accounting/source-link.service.ts": "organizationId ledgerAuditEvent.create",
    "services/payroll/__tests__/payroll-register.service.test.ts": "it( ties the register to payslips, payments, declarations, ledger links, and close evidence payroll ledger contains unmapped extra lines",
    "services/accounting/__tests__/data-trust.service.test.ts": "it( payroll posting and source-link evidence is incomplete declaration country-pack register proof is missing exports a certified trust pack with sensitive-action audit and ledger audit evidence",
    "services/accounting/__tests__/close-assurance.service.test.ts": "it( blocks same-actor close waiver approval denies cross-tenant period access",
    "services/accounting/__tests__/close-assurance-pack.service.test.ts": "it( blocks certified exports when high-risk findings remain open blocks same-actor certification for segregation of duties records invalidation when inventory annex evidence is stale records stale evidence against an already certified run and export watermarked audit record",
    "services/accounting/__tests__/source-link.service.test.ts": "it( rejects source links that do not match their posting batch source creates an audited source link returns an existing source link idempotently",
  }
  for (const [file, source] of Object.entries(files)) write(root, file, source)
  write(root, "package.json", JSON.stringify({ scripts: {
    "payroll:accounting-close:dev:gate": "node gate",
    "statutory:country-pack:gate": "node production",
    "policy:gates": "npm run statutory:country-pack:gate",
  }}))
  return root
}

beforeEach(() => {
  buildPaymentsDeclarationsDevelopmentReadiness.mockReturnValue({
    summary: { status: "READY_FOR_DEVELOPMENT_AND_SANDBOX_PROOF" },
    scope: {
      productionUseAllowed: false,
      livePaymentsAllowed: false,
      legallyEffectiveDeclarationsAllowed: false,
    },
    upstream: {
      productionStatus: "blocked",
      productionBlockers: ["source_artifact_hash_verification", "source_artifact_expert_approval"],
    },
  })
})

test("passes synthetic close readiness while production remains blocked", () => {
  const report = buildPayrollAccountingCloseDevelopmentReadiness(fixture(), { mode: "fail" })
  expect(report.summary).toMatchObject({
    status: "READY_FOR_DEVELOPMENT_ACCOUNTING_CLOSE_ASSURANCE",
    readyCount: 10,
    blockerCount: 0,
  })
  expect(report.scope).toMatchObject({
    productionUseAllowed: false,
    postedLedgerMutationAllowed: false,
    certifiedProductionCloseAllowed: false,
    syntheticCloseAndInvalidationTestingAllowed: true,
  })
  expect(report.upstream.productionStatus).toBe("blocked")
  expect(gateResultForReport(report, "fail").exitCode).toBe(0)
})

test("blocks when register-to-ledger drift coverage disappears", () => {
  const root = fixture()
  write(root, "services/payroll/__tests__/payroll-register.service.test.ts", "it( ties the register to payslips, payments, declarations, ledger links, and close evidence")
  const report = buildPayrollAccountingCloseDevelopmentReadiness(root, { mode: "fail" })
  expect(report.blockers).toContain("register_to_ledger_and_component_tieout")
})

test("blocks when upstream development proof is no longer ready", () => {
  buildPaymentsDeclarationsDevelopmentReadiness.mockReturnValue({
    summary: { status: "BLOCKED_FOR_DEVELOPMENT_AND_SANDBOX_PROOF" },
    scope: { productionUseAllowed: false, livePaymentsAllowed: false, legallyEffectiveDeclarationsAllowed: false },
    upstream: { productionStatus: "blocked", productionBlockers: ["source_artifact_expert_approval"] },
  })
  const report = buildPayrollAccountingCloseDevelopmentReadiness(fixture(), { mode: "fail" })
  expect(report.blockers).toContain("payments_declarations_development_prerequisite_ready")
})

test("blocks if the development gate enters the production policy chain", () => {
  const root = fixture()
  write(root, "package.json", JSON.stringify({ scripts: {
    "payroll:accounting-close:dev:gate": "node gate",
    "statutory:country-pack:gate": "node production",
    "policy:gates": "npm run statutory:country-pack:gate && npm run payroll:accounting-close:dev:gate",
  }}))
  const report = buildPayrollAccountingCloseDevelopmentReadiness(root, { mode: "fail" })
  expect(report.blockers).toContain("development_gate_is_not_a_production_policy_gate")
})
