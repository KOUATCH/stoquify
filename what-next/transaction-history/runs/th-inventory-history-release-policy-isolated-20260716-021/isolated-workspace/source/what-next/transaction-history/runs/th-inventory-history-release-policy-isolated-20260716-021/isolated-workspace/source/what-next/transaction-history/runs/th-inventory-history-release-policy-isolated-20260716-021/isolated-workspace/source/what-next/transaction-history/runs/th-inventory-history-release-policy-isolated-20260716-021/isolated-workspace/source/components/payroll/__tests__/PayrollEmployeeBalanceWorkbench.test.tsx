import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { settlePayrollEmployeeBalanceCaseAction } from "@/actions/payroll/payroll-control.actions"
import type { PayrollEmployeeBalanceWorkbenchResult } from "@/actions/payroll/payroll-control.actions"
import PayrollEmployeeBalanceWorkbench from "../PayrollEmployeeBalanceWorkbench"

const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock("@/actions/payroll/payroll-control.actions", () => ({
  settlePayrollEmployeeBalanceCaseAction: jest.fn(),
}))

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

const mockSettlePayrollEmployeeBalanceCaseAction = settlePayrollEmployeeBalanceCaseAction as jest.Mock

function workbenchData(): PayrollEmployeeBalanceWorkbenchResult {
  return {
    organizationId: "org-1",
    asOf: "2026-06-28T10:00:00.000Z",
    statusFilter: ["OPEN", "PARTIALLY_SETTLED"],
    redaction: {
      payrollAmounts: {
        allowed: false,
        mode: "redact",
        reasonCode: "MISSING_PERMISSION",
        policy: "kontava-payroll-person-redaction-policy",
        replacement: "[REDACTED:PAYROLL]",
        requiredPermissions: ["payroll.payslips.read"],
      },
    },
    summary: {
      totalCases: 1,
      filteredCases: 1,
      returnedCases: 1,
      openCases: 1,
      partiallySettledCases: 0,
      settledCases: 0,
      activeCases: 1,
      activeAmount: "[REDACTED:PAYROLL]",
      activeSettledAmount: "[REDACTED:PAYROLL]",
      activeOutstandingAmount: "[REDACTED:PAYROLL]",
      coverageComplete: true,
    },
    cases: [
      {
        id: "balance-case-1",
        caseNumber: "EBC-2026-0001",
        caseType: "EMPLOYEE_RECEIVABLE",
        status: "OPEN",
        employee: {
          id: "employee-1",
          employeeNumber: "EMP-001",
          displayName: "Ada Payroll",
        },
        payrollRun: {
          id: "run-1",
          runNumber: "PR-2026-06",
          status: "CALCULATED",
          periodId: "period-1",
          periodName: "June 2026",
          periodStart: "2026-06-01T00:00:00.000Z",
          periodEnd: "2026-06-30T23:59:59.000Z",
        },
        payslip: {
          id: "payslip-1",
          payslipNumber: "PS-2026-0001",
          status: "EMITTED",
        },
        amounts: {
          amount: "[REDACTED:PAYROLL]",
          settledAmount: "[REDACTED:PAYROLL]",
          outstandingAmount: "[REDACTED:PAYROLL]",
          sourceNetPayableAmount: "[REDACTED:PAYROLL]",
          currency: "XAF",
        },
        timeline: {
          openedAt: "2026-06-27T08:00:00.000Z",
          settledAt: null,
          createdAt: "2026-06-27T08:00:00.000Z",
          updatedAt: "2026-06-27T08:00:00.000Z",
          ageDays: 1,
        },
        proof: {
          documentHash: "sha256:case-doc",
          evidenceHash: "sha256:case-evidence",
          ledgerPostingBatchId: "ledger-batch-1",
          journalEntryId: "journal-1",
          accountingSourceLinkId: "source-link-1",
          openedBusinessEventId: "event-open-1",
          latestEvent: {
            id: "event-1",
            eventType: "OPENED",
            eventDate: "2026-06-27T08:00:00.000Z",
            evidenceHash: "sha256:event-evidence",
            documentHash: "sha256:event-doc",
            ledgerPostingBatchId: "ledger-batch-1",
            journalEntryId: "journal-1",
            accountingSourceLinkId: "source-link-1",
            businessEventId: "event-open-1",
          },
        },
        nextAction: {
          id: "settle",
          label: "Record settlement evidence",
          requiredPermission: "payroll.payments.reconcile",
        },
      },
    ],
    sourceScope: {
      limit: 80,
      returned: 1,
      coverageComplete: true,
      sourceService: "services/payroll/payroll-employee-balance.service.ts",
    },
  }
}

function fillSettlementForm() {
  fireEvent.change(screen.getByLabelText("Settlement amount"), { target: { value: "1000.00" } })
  fireEvent.change(screen.getByLabelText("Evidence hash"), { target: { value: "sha256:settlement-evidence" } })
  fireEvent.change(screen.getByLabelText("Reference"), { target: { value: "bank-ref-1" } })
}

describe("PayrollEmployeeBalanceWorkbench", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSettlePayrollEmployeeBalanceCaseAction.mockResolvedValue({
      success: true,
      data: {
        balanceCase: { id: "balance-case-1" },
        settlementEvent: { id: "balance-event-2" },
        idempotent: false,
      },
      error: null,
      status: 200,
    })
  })

  it("renders redacted employee balance recovery proof and localized links", () => {
    render(<PayrollEmployeeBalanceWorkbench data={workbenchData()} locale="en" />)

    expect(screen.getByRole("heading", { name: "Employee balance recovery" })).toBeInTheDocument()
    expect(screen.getByText("EBC-2026-0001")).toBeInTheDocument()
    expect(screen.getByText("Ada Payroll")).toBeInTheDocument()
    expect(screen.getAllByText("[REDACTED:PAYROLL]").length).toBeGreaterThan(0)
    expect(screen.getByText("sha256:case-evidence")).toBeInTheDocument()
    expect(screen.getAllByText("Record settlement evidence").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Record settlement" })).toBeInTheDocument()

    const hrefs = Array.from(document.querySelectorAll("a")).map((link) => link.getAttribute("href"))
    expect(hrefs).toEqual(expect.arrayContaining(["/en/dashboard/payroll/register", "/en/dashboard/payroll/attendance"]))
  })

  it("submits settlement evidence with tenant and fresh-auth left to the protected action", async () => {
    render(<PayrollEmployeeBalanceWorkbench data={workbenchData()} locale="en" />)

    fillSettlementForm()
    fireEvent.click(screen.getByRole("button", { name: "Record settlement" }))

    await waitFor(() => {
      expect(mockSettlePayrollEmployeeBalanceCaseAction).toHaveBeenCalledWith(expect.objectContaining({
        balanceCaseId: "balance-case-1",
        settledById: "employee-1",
        settlementMethod: "CASH",
        amount: "1000.00",
        settlementEvidenceHash: "sha256:settlement-evidence",
        reference: "bank-ref-1",
        metadata: expect.objectContaining({ sourceSurface: "/dashboard/payroll/payments" }),
      }))
    })
    expect(mockSettlePayrollEmployeeBalanceCaseAction.mock.calls[0][0]).not.toMatchObject({
      organizationId: expect.any(String),
      approvedById: expect.any(String),
      actorPermissions: expect.any(Array),
      lastAuthAt: expect.anything(),
    })
    expect(await screen.findByText("Settlement evidence recorded.")).toBeInTheDocument()
    expect(mockRefresh).toHaveBeenCalled()
  })

  it("renders fresh-auth denial returned by the settlement action", async () => {
    mockSettlePayrollEmployeeBalanceCaseAction.mockResolvedValueOnce({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
      correlationId: "act_fresh_auth_1",
      category: "AUTHORIZATION",
      severity: "medium",
      retryable: false,
    })
    render(<PayrollEmployeeBalanceWorkbench data={workbenchData()} locale="en" />)

    fillSettlementForm()
    fireEvent.click(screen.getByRole("button", { name: "Record settlement" }))

    expect(await screen.findByText("Fresh authentication required")).toBeInTheDocument()
    expect(screen.getByText("act_fresh_auth_1")).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})