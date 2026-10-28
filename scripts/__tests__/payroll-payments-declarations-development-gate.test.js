const fs = require("fs")
const os = require("os")
const path = require("path")

const buildStatutoryCountryPackDevelopmentReadiness = jest.fn()
jest.mock("../statutory-country-pack-development-gate", () => ({
  buildStatutoryCountryPackDevelopmentReadiness,
}))

const {
  buildPaymentsDeclarationsDevelopmentReadiness,
  gateResultForReport,
} = require("../payroll-payments-declarations-development-gate")

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "payments-declarations-dev-gate-"))
  const files = {
    "services/payroll/payment-evidence.service.ts": 'requester cannot approve their own request approver cannot apply their own approval has no approved payment destination evidence NotFoundError("Payment destination change request was not found for this tenant.") auditLog.create',
    "services/payroll/payment-reconciliation.service.ts": "idempotency key was reused with a different evidence hash requires provider event, statement line, or statement file evidence settlementAmount batchAmount evaluateRedaction",
    "services/payroll/declaration-lifecycle.service.ts": "productionSubmissionSupported",
    "services/payroll/authority-adapter-execution.service.ts": "execution is blocked by incomplete certification proof no raw salary, employee identity, credential secret, or authority payload redactedResponseSummary",
    "services/payroll/payroll-provider-settlement-bridge.service.ts": "currency to tie out",
    "services/payroll/payroll-provider-inbox-settlement-worker.service.ts": "lease",
    "services/payroll/__tests__/payroll-payment-evidence.service.test.ts": "it( masked values, hashes, audit, and no raw details redaction",
    "services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts": "it( replays duplicate provider settlement callbacks rejects duplicate provider settlement callbacks with conflicting proof auditLog.create",
    "services/payroll/__tests__/declaration-lifecycle.service.test.ts": "it( keeps certified enqueue disabled when proof identifiers are redacted",
    "services/payroll/__tests__/authority-adapter-execution.service.test.ts": "it( rejects conflicting queue idempotency duplicate terminal authority responses",
    "services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts": "it( provider evidence amount disagrees with the approved match",
    "services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts": "it( redacted",
  }
  for (const [file, source] of Object.entries(files)) write(root, file, source)
  write(root, "package.json", JSON.stringify({ scripts: {
    "payroll:payments-declarations:dev:gate": "node gate",
    "statutory:country-pack:gate": "node production",
    "policy:gates": "npm run statutory:country-pack:gate",
  }}))
  return root
}

beforeEach(() => {
  buildStatutoryCountryPackDevelopmentReadiness.mockReturnValue({
    summary: { status: "READY_FOR_DEVELOPMENT_TESTING" },
    scope: {
      productionUseAllowed: false,
      livePaymentsAllowed: false,
      liveDeclarationsAllowed: false,
      liveAuthoritySubmissionsAllowed: false,
    },
    productionGate: {
      status: "blocked",
      blockers: ["source_artifact_hash_verification", "source_artifact_expert_approval"],
    },
  })
})

test("passes a development-only proof posture while production remains blocked", () => {
  const report = buildPaymentsDeclarationsDevelopmentReadiness(fixture(), { mode: "fail" })
  expect(report.summary).toMatchObject({
    status: "READY_FOR_DEVELOPMENT_AND_SANDBOX_PROOF",
    readyCount: 9,
    blockerCount: 0,
  })
  expect(report.scope).toMatchObject({
    productionUseAllowed: false,
    livePaymentsAllowed: false,
    legallyEffectiveDeclarationsAllowed: false,
    productionAuthorityCallsAllowed: false,
  })
  expect(report.upstream.productionStatus).toBe("blocked")
  expect(gateResultForReport(report, "fail").exitCode).toBe(0)
})

test("blocks when conflicting callback proof is no longer covered", () => {
  const root = fixture()
  write(root, "services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts", "it( replays duplicate provider settlement callbacks auditLog.create")
  const report = buildPaymentsDeclarationsDevelopmentReadiness(root, { mode: "fail" })
  expect(report.blockers).toContain("provider_callback_idempotency_and_conflict_guard")
  expect(gateResultForReport(report, "fail").exitCode).toBe(1)
})

test("blocks if the statutory development prerequisite stops being ready", () => {
  buildStatutoryCountryPackDevelopmentReadiness.mockReturnValue({
    summary: { status: "BLOCKED_FOR_DEVELOPMENT_TESTING" },
    scope: {
      productionUseAllowed: false,
      livePaymentsAllowed: false,
      liveDeclarationsAllowed: false,
      liveAuthoritySubmissionsAllowed: false,
    },
    productionGate: { status: "blocked", blockers: ["source_artifact_expert_approval"] },
  })
  const report = buildPaymentsDeclarationsDevelopmentReadiness(fixture(), { mode: "fail" })
  expect(report.blockers).toContain("statutory_development_prerequisite_ready")
})

test("blocks if the development command enters the production policy chain", () => {
  const root = fixture()
  write(root, "package.json", JSON.stringify({ scripts: {
    "payroll:payments-declarations:dev:gate": "node gate",
    "statutory:country-pack:gate": "node production",
    "policy:gates": "npm run statutory:country-pack:gate && npm run payroll:payments-declarations:dev:gate",
  }}))
  const report = buildPaymentsDeclarationsDevelopmentReadiness(root, { mode: "fail" })
  expect(report.blockers).toContain("development_gate_is_not_a_production_policy_gate")
})
