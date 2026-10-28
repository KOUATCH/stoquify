import { render, screen } from "@testing-library/react"

import { HrisManagerSelfService } from "../HrisManagerSelfService"

jest.mock("@/components/hris/HrisOperationalTimeApprovalPanel", () => ({
  HrisOperationalTimeApprovalPanel: () => <div>Operational time approvals</div>,
}))

jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  )
  MockLink.displayName = "MockLink"
  return MockLink
})

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}))

jest.mock("lucide-react", () => {
  const React = require("react")
  return new Proxy({ __esModule: true }, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target]
      const Icon = (props: Record<string, unknown>) =>
        React.createElement("svg", { "data-testid": `icon-${prop}`, ...props })
      Icon.displayName = prop
      return Icon
    },
  })
})

function model() {
  return {
    organizationId: "org-1",
    asOf: "2026-07-15T00:00:00.000Z",
    scope: {
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        label: "Managed-location responsibility",
        basis: "Location.managerId",
        reportingLineAuthority: false,
        effectiveDating: "CURRENT_ONLY",
        historicalAccessSupported: false,
        delegationSupported: false,
      },
      managedLocations: [{ name: "Douala Central", code: "DLA" }],
      limitations: ["Employees in a managed location are not represented as direct reports."],
      directReportsClaimed: false,
    },
    summary: {
      workforceCount: 1,
      readyCount: 0,
      attentionCount: 1,
      visiblePendingApprovals: 1,
      actionableApprovals: 0,
    },
    workforce: [{
      profileHref: "/dashboard/people/employee-1",
      displayName: "Alice Ngono",
      status: "ACTIVE",
      employment: {
        jobTitle: "Supervisor",
        department: "Operations",
        countryCode: "CM",
        location: { name: "Douala Central", code: "DLA" },
      },
      contract: {
        activeCount: 1,
        latestStatus: "ACTIVE",
        signedEvidenceOnFile: true,
      },
      attendance: {
        frozenSnapshotCount: 0,
        latestCertifiedPeriodEnd: null,
        certifiedSourceOnFile: false,
      },
      readiness: {
        status: "ATTENTION_REQUIRED",
        blockerCount: 1,
        blockerCodes: ["FROZEN_ATTENDANCE_MISSING"],
      },
      privateEmployeeNumber: "PRIVATE-EMP-001",
      privateSalary: "987654321",
      privateIdentifier: "TAX-PRIVATE-001",
      privateBank: "BANK-PRIVATE-001",
      privateDocumentHash: "sha256:private-document-hash",
    }],
    approvals: [{
      domain: "SALARY_CHANGE",
      stage: "REVIEW",
      title: "Salary change",
      subject: "Compensation change awaiting review",
      employee: {
        displayName: "Alice Ngono",
        profileHref: "/dashboard/people/employee-1",
      },
      requestedAt: "2026-07-14T00:00:00.000Z",
      effectiveAt: "2026-08-01T00:00:00.000Z",
      decision: { eligible: false, reasonCode: "MISSING_MANAGE_PERMISSION" },
      evidence: { requestEvidencePresent: true, approvalEvidencePresent: false },
      readiness: { blockerCode: "COMPENSATION_CHANGE_PENDING", impact: "PAYROLL_INPUT" },
    }],
    operationalTime: { requests: [] },
    capabilities: {
      approvalDecisions: {
        available: false,
        authority: "HRIS_PEOPLE_MANAGE_AND_SEPARATION_OF_DUTIES",
      },
      reportingLineWorkflows: {
        available: false,
        reasonCode: "REPORTING_LINE_AUTHORITY_NOT_MODELED",
      },
      leaveRequests: { available: false, reasonCode: "LEAVE_LEDGER_NOT_CONFIGURED" },
      onboardingOffboardingTasks: { available: false, reasonCode: "TASK_LEDGER_NOT_CONFIGURED" },
      rawDocumentAccess: { available: false, reasonCode: "RAW_DOCUMENT_ACCESS_NOT_CONFIGURED" },
    },
    redaction: {
      employeeNumbersIncluded: false,
      userIdentifiersIncluded: false,
      salaryValuesIncluded: false,
      taxAndSocialIdentifiersIncluded: false,
      paymentDestinationValuesIncluded: false,
      documentHashesIncluded: false,
      rawDocumentsIncluded: false,
      approvalSourceIdsIncluded: false,
    },
    dataOwnership: {
      workforceOwner: "HRIS_PEOPLE_CORE",
      approvalOwner: "HRIS_APPROVAL_INBOX_PROJECTION",
      scopeOwner: "HRIS_ORGANIZATION_SCOPE",
      mutationAuthority: "DOMAIN_SERVICES_ONLY",
    },
  } as any
}

describe("HrisManagerSelfService", () => {
  it("renders a useful location-responsibility workspace without claiming direct reports", () => {
    render(
      <HrisManagerSelfService
        model={model()}
        approvalsHref="/en/dashboard/people/approvals"
        locale="en"
      />,
    )

    expect(screen.getByRole("heading", { name: "Managed workforce" })).toBeInTheDocument()
    expect(screen.getByText(/current location responsibility, not direct-report authority/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Douala Central \(DLA\)/)).not.toHaveLength(0)
    expect(screen.getAllByRole("link", { name: "Alice Ngono" })[0]).toHaveAttribute(
      "href",
      "/en/dashboard/people/employee-1",
    )
    expect(screen.getByRole("link", { name: "Approval inbox" })).toHaveAttribute(
      "href",
      "/en/dashboard/people/approvals",
    )
    expect(screen.getByText("HR admin review required")).toBeInTheDocument()
    expect(screen.getByText("frozen attendance missing")).toBeInTheDocument()
  })

  it("does not render salary, identifiers, payment data, or document hashes", () => {
    const { container } = render(
      <HrisManagerSelfService
        model={model()}
        approvalsHref="/en/dashboard/people/approvals"
        locale="en"
      />,
    )

    expect(container.textContent).not.toMatch(/PRIVATE-EMP-001|987654321|TAX-PRIVATE-001/)
    expect(container.textContent).not.toMatch(/BANK-PRIVATE-001|sha256:private-document-hash/)
    expect(screen.getByText(/Salary, personal identifiers, payment destinations/)).toBeInTheDocument()
  })
})
