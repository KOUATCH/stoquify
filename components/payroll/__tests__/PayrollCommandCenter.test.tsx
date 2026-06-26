import { fireEvent, render, screen } from "@testing-library/react"

import PayrollCommandCenter from "../PayrollCommandCenter"
import type { PayrollCommandReadModel } from "@/actions/payroll/payroll-command-read-model.actions"

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}))
jest.mock("lucide-react", () => {
  const React = require("react")
  const makeIcon = (name: string) => {
    const MockIcon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    MockIcon.displayName = `Mock${name}Icon`
    return MockIcon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return target[prop as keyof typeof target]
        return makeIcon(String(prop))
      },
    },
  )
})

function commandData(): PayrollCommandReadModel {
  return {
    organizationId: "org-1",
    asOf: "2026-06-26T08:00:00.000Z",
    currentPeriod: {
      id: "period-1",
      name: "June 2026",
      status: "INPUTS_LOCKED",
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-30T23:59:59.000Z",
      payDate: "2026-06-30T00:00:00.000Z",
      inputLockedAt: "2026-06-25T12:00:00.000Z",
      countryCode: "CM",
      countryPackVersion: "cm-payroll-2026.1",
      countryPackResolutionHash: "sha256:country-pack",
      countryPackCapabilityStatus: "EXPERT_REVIEW_REQUIRED",
      accountingPeriodId: "acct-period-1",
      selection: "calendar-match",
    },
    roleScope: {
      canReadCommand: true,
      canReadSalaryAmounts: false,
      canManageEmployees: false,
      canManageContracts: false,
      canManageCompensation: false,
      canReviewRuns: true,
      canCalculateRuns: false,
      canApproveRuns: false,
      canReleasePayments: false,
      canPrepareDeclarations: false,
      canExportPayroll: false,
      canReadPaymentEvidence: true,
      canReadAttendanceReadiness: true,
    },
    redaction: {
      payrollAmounts: {
        allowed: false,
        mode: "redact",
        reasonCode: "MISSING_PERMISSION",
        policy: "kontava-payroll-person-redaction-policy",
        replacement: "[REDACTED:PAYROLL]",
        requiredPermissions: ["payroll.payslips.read", "EMPLOYEE_SALARY_READ"],
      },
    },
    trustedCounts: {
      activeEmployees: 2,
      linkedEmployees: 1,
      unmappedEmployees: 1,
      activeContracts: 1,
      activeRubriqueAssignments: 3,
      frozenAttendanceSnapshots: 1,
      pendingSalaryChangeRequests: 1,
      approvedSalaryChangeRequests: 0,
      pendingPaymentDestinationChanges: 1,
      approvedPaymentDestinations: 1,
      missingPaymentDestinations: 0,
      pendingPaymentDestinations: 1,
      attendanceReadyEmployees: 1,
      attendanceDriftEmployees: 1,
      openPeriods: 1,
      calculatedRuns: 1,
      postedRuns: 0,
      releasedPaymentBatches: 0,
      openDeclarations: 1,
      ledgerBlockers: 2,
      reconciliationExceptions: 1,
      currentPeriodRuns: 1,
      currentPeriodPaymentBatches: 1,
      currentPeriodDeclarations: 1,
    },
    readiness: {
      employees: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_EMPLOYEE_USER_MAPPING_GAP"], source: "payroll.employee_source", message: "Employee/user mappings need cleanup.", counts: { activeEmployees: 2 } },
      contracts: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_ACTIVE_CONTRACT_GAP"], source: "payroll.contracts", message: "Active contract coverage is incomplete.", counts: { activeContracts: 1 } },
      compensation: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_SALARY_CHANGE_QUEUE_OPEN"], source: "payroll.compensation", message: "Salary change queue requires maker-checker follow-up." },
      attendance: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_ATTENDANCE_FREEZE_GAP"], source: "payroll.attendance_readiness", message: "Attendance freeze coverage is incomplete." },
      paymentDestinations: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_PAYMENT_DESTINATION_EVIDENCE_GAP"], source: "payroll.payment_destination", message: "Payment destination evidence requires approval/application." },
      payrollRun: { state: "READY", blockerCodes: [], source: "payroll.runs", message: "Current-period payroll run data is available." },
      payrollRegister: { state: "READY", blockerCodes: [], source: "payroll.register", message: "Payroll register lines are present." },
      payments: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_PAYMENT_RECON_EXCEPTIONS_OPEN"], source: "payroll.payments", message: "Payroll payment reconciliation exceptions are open." },
      declarations: { state: "ACTION_REQUIRED", blockerCodes: ["PAYROLL_DECLARATION_ACTION_REQUIRED"], source: "payroll.declarations", message: "Declaration data is available for the current period." },
      posting: { state: "BLOCKED", blockerCodes: ["PAYROLL_LEDGER_POSTING_BLOCKERS_OPEN"], source: "payroll.ledger_posting", message: "Ledger posting blockers must be cleared." },
      close: { state: "BLOCKED", blockerCodes: ["PAYROLL_CLOSE_CRITICAL_BLOCKERS_OPEN"], source: "accounting.close_assurance", message: "Critical close blockers are open." },
    },
    blockers: [
      { code: "PAYROLL_ACTIVE_CONTRACT_GAP", domain: "hr", severity: "high", message: "Some active payroll employees do not have an active contract.", source: "services/payroll/contract.service.ts", count: 1 },
      { code: "PAYROLL_LEDGER_POSTING_BLOCKERS_OPEN", domain: "posting", severity: "critical", message: "Payroll posting blockers remain open.", source: "services/payroll/payroll-control.service.ts", count: 2 },
    ],
    nextActions: [
      { id: "activate-payroll-contracts", label: "Activate missing payroll contracts", priority: "high", requiredPermission: "payroll.contracts.manage", source: "payroll.contracts", blockedBy: ["PAYROLL_ACTIVE_CONTRACT_GAP"] },
      { id: "resolve-payroll-payment-exceptions", label: "Resolve payroll payment reconciliation exceptions", priority: "high", requiredPermission: "payments.reconciliation.exception.resolve", source: "payroll.payment_reconciliation", blockedBy: ["PAYROLL_PAYMENT_RECON_EXCEPTIONS_OPEN"] },
    ],
    evidence: {
      latestRun: {
        id: "run-1",
        runNumber: "PR-2026-06",
        status: "CALCULATED",
        documentHash: "sha256:run-doc",
        evidenceHash: "sha256:run-evidence",
        calculationHash: "sha256:calc",
        attendanceSnapshotHash: "sha256:attendance",
        countryPackResolutionHash: "sha256:country-pack",
        ledgerPostingBatchId: null,
        postedBusinessEventId: null,
        payslipCount: 2,
        lineCount: 2,
        paymentBatchCount: 1,
        declarationCount: 1,
        updatedAt: "2026-06-26T07:00:00.000Z",
      },
      latestPaymentBatch: {
        id: "batch-1",
        batchNumber: "PB-2026-06",
        status: "DRAFT",
        documentHash: "sha256:batch-doc",
        evidenceHash: null,
        bankFileHash: null,
        ledgerPostingBatchId: null,
        postedBusinessEventId: null,
        reconciliationStatus: null,
        updatedAt: "2026-06-26T07:00:00.000Z",
      },
      latestDeclaration: {
        id: "decl-1",
        authority: "CNPS",
        declarationType: "SOCIAL_SECURITY",
        status: "REJECTED",
        payloadHash: "sha256:decl-payload",
        countryPackResolutionHash: "sha256:country-pack",
        dueDate: "2026-07-10T00:00:00.000Z",
        updatedAt: "2026-06-26T07:00:00.000Z",
      },
      closeRun: {
        id: "close-1",
        status: "READY_TO_CLOSE",
        readinessScore: 72,
        criticalBlockerCount: 1,
        highBlockerCount: 2,
        evidenceCoveragePct: "87.50",
        asOf: "2026-06-26T07:00:00.000Z",
      },
    },
    freshness: [
      { source: "payroll.period", asOf: "2026-06-26T07:00:00.000Z", status: "fresh", ageHours: 1 },
      { source: "payroll.workbench", asOf: "2026-06-26T07:30:00.000Z", status: "fresh", ageHours: 0.5 },
    ],
    sourceScope: {
      limit: 25,
      employeeSourceReturned: 2,
      paymentEvidenceReturned: 2,
      employeeCoverageComplete: true,
      paymentEvidenceCoverageComplete: true,
      sourceServices: ["services/payroll/payroll-control.service.ts"],
    },
    workbench: {
      organizationId: "org-1",
      asOf: "2026-06-26T07:30:00.000Z",
      counts: {
        openPeriods: 1,
        calculatedRuns: 1,
        postedRuns: 0,
        releasedPaymentBatches: 0,
        openDeclarations: 1,
        ledgerBlockers: 2,
        reconciliationExceptions: 1,
      },
      queues: {
        recentRuns: [
          {
            id: "run-1",
            runNumber: "PR-2026-06",
            periodName: "June 2026",
            status: "CALCULATED",
            netPayableAmount: "[REDACTED:PAYROLL]",
            currency: "XAF",
            payDate: "2026-06-30T00:00:00.000Z",
            ledgerPostingBatchId: null,
            postedBusinessEventId: null,
            payslipCount: 2,
            paymentBatchCount: 1,
            declarationCount: 1,
            countryPackVersion: "cm-payroll-2026.1",
            countryPackResolutionHash: "sha256:country-pack",
          },
        ],
        paymentBatches: [],
        declarations: [],
        ledgerBlockers: [],
      },
    },
  }
}

describe("PayrollCommandCenter", () => {
  it("renders command data, blocked actions, safe route links, and proof drawer hashes", () => {
    render(<PayrollCommandCenter data={commandData()} locale="en" />)

    expect(screen.getByRole("heading", { name: "HR, payroll, evidence, and close control" })).toBeInTheDocument()
    expect(screen.getAllByText("PAYROLL_ACTIVE_CONTRACT_GAP").length).toBeGreaterThan(0)
    expect(screen.getByText("[REDACTED:PAYROLL]")).toBeInTheDocument()
    expect(screen.getAllByText("Blocked").length).toBeGreaterThan(0)

    const hrefs = Array.from(document.querySelectorAll("a")).map((link) => link.getAttribute("href"))
    expect(hrefs).toEqual(expect.arrayContaining(["/en/dashboard/finance/reconciliation"]))
    expect(hrefs).not.toEqual(expect.arrayContaining(["/en/dashboard/payroll/employees", "/en/dashboard/presence"]))

    fireEvent.click(screen.getAllByRole("button", { name: "Proof" })[0])

    expect(screen.getByText("Country pack hash")).toBeInTheDocument()
    expect(screen.getAllByText("sha256:country-pack").length).toBeGreaterThan(0)
  })
})
