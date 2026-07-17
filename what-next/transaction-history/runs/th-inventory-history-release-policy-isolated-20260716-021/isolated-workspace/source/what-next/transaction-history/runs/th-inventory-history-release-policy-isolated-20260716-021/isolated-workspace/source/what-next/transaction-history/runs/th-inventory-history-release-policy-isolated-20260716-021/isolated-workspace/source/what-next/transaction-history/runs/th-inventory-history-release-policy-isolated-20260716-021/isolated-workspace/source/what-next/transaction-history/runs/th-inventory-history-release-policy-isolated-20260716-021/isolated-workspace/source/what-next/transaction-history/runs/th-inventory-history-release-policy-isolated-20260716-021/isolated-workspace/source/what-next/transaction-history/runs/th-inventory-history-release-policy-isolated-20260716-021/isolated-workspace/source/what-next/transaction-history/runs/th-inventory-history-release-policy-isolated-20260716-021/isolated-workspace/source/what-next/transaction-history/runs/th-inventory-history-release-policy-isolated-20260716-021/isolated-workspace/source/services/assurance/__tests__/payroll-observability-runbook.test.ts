import { readFileSync } from "node:fs"
import path from "node:path"

const runbookPath = path.join(process.cwd(), "docs/operations/runbooks/hr-payroll-operations.md")
const runbook = readFileSync(runbookPath, "utf8")

describe("HR/Payroll observability runbook", () => {
  it("covers Prompt 20 operational categories", () => {
    const requiredSections = [
      "## Workflow Assurance Checks",
      "## Policy Gate Evidence Inputs",
      "## Payroll Cycle Operation",
      "## Setup Readiness And Dry-Run Evidence",
      "## Correction And Evidence Repair",
      "## Register Proof And Data-Trust Incidents",
      "## Payment Failure Or Reconciliation Exception",
      "## Declaration Fallback",
      "## Country-Pack Review",
      "## Export And Payslip Privacy",
      "## Privacy Incident",
      "## Stale Close Evidence",
      "## Release Checklist",
    ]

    for (const section of requiredSections) {
      expect(runbook).toContain(section)
    }
  })

  it("documents assurance checks and uses only implemented operational routes", () => {
    const expectedChecks = [
      "payroll.released_payment_evidence.required",
      "payroll.payment_reconciliation_exception.visible",
      "payroll.declaration_lifecycle_exception.visible",
      "payroll.close_evidence.stale.visible",
    ]

    for (const checkKey of expectedChecks) {
      expect(runbook).toContain(checkKey)
    }

    expect(runbook).toContain("/dashboard/payroll")
    expect(runbook).toContain("/dashboard/payroll/setup")
    expect(runbook).toContain("/dashboard/payroll/employees")
    expect(runbook).toContain("/dashboard/payroll/contracts")
    expect(runbook).toContain("/dashboard/payroll/compensation")
    expect(runbook).toContain("/dashboard/payroll/attendance")
    expect(runbook).toContain("/dashboard/payroll/declarations")
    expect(runbook).toContain("/dashboard/payroll/payments")
    expect(runbook).toContain("/dashboard/payroll/payslips")
    expect(runbook).toContain("/dashboard/payroll/register")
    expect(runbook).toContain("/dashboard/payroll/runs")
    expect(runbook).toContain("/dashboard/assurance/control-tower")
    expect(runbook).toContain("/dashboard/accounting/close")
  })

  it("anchors operations to existing release evidence without copying sensitive payroll data", () => {
    const requiredEvidence = [
      "npm run payroll:immutability:runtime",
      "scripts/payroll-seed-backfill-dry-run.js",
      "what-next/payroll/payroll-immutability-runtime-check.md",
      "AQSTOQFLOW_HR_PAYROLL_PROMPT_06_SETUP_READINESS_DRY_RUN_REPORT_2026-06-26.md",
      "__tests__/payroll-dashboard-routes.smoke.test.tsx",
      "npm run ui:smoke:payroll",
      "playwright/.auth/payroll.json",
      "AQSTOQFLOW_HR_PAYROLL_PHASE_1_ASSURANCE_RELEASE_GATES_REPORT_2026-06-27.md",
      "AQSTOQFLOW_HR_PAYROLL_PHASE_1_CLOSE_DATA_TRUST_REPORT_2026-06-27.md",
    ]

    for (const evidence of requiredEvidence) {
      expect(runbook).toContain(evidence)
    }

    expect(runbook).toContain("aggregate, redacted evidence only")
    expect(runbook).toContain("No salary, bank, payment destination, authority payload, or raw statutory payload")
    expect(runbook).toContain("claims.lastAuthAt")
    expect(runbook).toContain("sourceRegisterHash")
    expect(runbook).toContain("metadata.latestSettlementSourceRegisterHash")
    expect(runbook).toContain("payroll-declaration-register-proof-missing")
    expect(runbook).toContain("payroll-payment-settlement-register-proof-missing")
  })
})