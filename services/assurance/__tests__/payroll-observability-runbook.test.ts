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
    expect(runbook).toContain("/dashboard/payroll/payslips")
    expect(runbook).toContain("/dashboard/payroll/register")
    expect(runbook).toContain("/dashboard/assurance/control-tower")
    expect(runbook).toContain("/dashboard/accounting/close")
    expect(runbook).not.toContain("/dashboard/payroll/payments")
    expect(runbook).not.toContain("/dashboard/payroll/declarations")
  })

  it("anchors operations to existing release evidence without copying sensitive payroll data", () => {
    const requiredEvidence = [
      "npm run payroll:immutability:runtime",
      "scripts/payroll-seed-backfill-dry-run.js",
      "what-next/payroll/payroll-immutability-runtime-check.md",
      "AQSTOQFLOW_HR_PAYROLL_PROMPT_06_SETUP_READINESS_DRY_RUN_REPORT_2026-06-26.md",
      "__tests__/payroll-dashboard-routes.smoke.test.tsx",
    ]

    for (const evidence of requiredEvidence) {
      expect(runbook).toContain(evidence)
    }

    expect(runbook).toContain("aggregate, redacted evidence only")
    expect(runbook).toContain("No salary, bank, payment destination, authority payload, or raw statutory payload")
  })
})