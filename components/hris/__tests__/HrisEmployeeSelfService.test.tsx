import { render, screen } from "@testing-library/react"

import { HrisEmployeeSelfService } from "../HrisEmployeeSelfService"

jest.mock("@/components/hris/HrisOperationalTimeRequestPanel", () => ({
  HrisOperationalTimeRequestPanel: () => <div>Operational time requests</div>,
}))

jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  )
  MockLink.displayName = "MockLink"
  return MockLink
})

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
    asOf: "2026-07-15T00:00:00.000Z",
    profile: {
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      status: "ACTIVE",
      employment: {
        hireDate: "2026-01-01T00:00:00.000Z",
        terminationDate: null,
        countryCode: "CM",
        locationAssigned: true,
        department: "Operations",
        jobTitle: "Supervisor",
        costCenter: "OPS",
      },
      userMappingState: "LINKED",
      blockers: [],
    },
    documents: {
      referenceCount: 2,
      referenceTypes: ["IDENTITY", "CONTRACT"],
      taxIdentifierOnFile: true,
      socialIdentifierOnFile: true,
      signedContractEvidenceOnFile: true,
      rawDocumentAccess: "NOT_CONFIGURED",
    },
    contract: { activeContractCount: 1, latestStatus: "ACTIVE" },
    attendance: {
      status: "FROZEN",
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-30T00:00:00.000Z",
      totals: {
        scheduledMinutes: 9600,
        workedMinutes: 9300,
        overtimeMinutes: 120,
        absenceMinutes: 0,
        leaveMinutes: 300,
      },
      certificationStatus: "CERTIFIED",
      sourceProofPresent: true,
      policyProofPresent: true,
      approvalProofPresent: true,
      unresolvedItemCount: 0,
      frozenAt: "2026-07-01T00:00:00.000Z",
    },
    paymentDestination: {
      state: "PENDING_APPROVAL",
      method: "BANK_TRANSFER",
      maskedDestination: "***1234",
      approvalEvidencePresent: false,
      latestChange: {
        status: "REQUESTED",
        paymentMethod: "BANK_TRANSFER",
        maskedDestination: "***1234",
        requestedAt: "2026-07-15T00:00:00.000Z",
        approvedAt: null,
        appliedAt: null,
      },
      payrollReleaseStatus: "BLOCKED",
    },
    operationalTime: { requests: [], balances: [] },
    capabilities: {
      payslips: { canRead: true, canExport: false, exportRequiresFreshAuth: true },
      paymentDestinationRequest: {
        canRequest: true,
        freshAuthRequired: true,
        uiStatus: "EVIDENCE_WORKFLOW_REQUIRED",
      },
      leaveRequest: "NOT_CONFIGURED",
      attendanceCorrectionRequest: "NOT_CONFIGURED",
      profileCorrectionRequest: "NOT_CONFIGURED",
    },
    dataOwnership: {},
    privateEmployeeId: "other-employee-id",
    rawBankAccount: "1234567890121234",
    documentHash: "sha256:private-document-proof",
    actorId: "private-actor-id",
  } as any
}

describe("HrisEmployeeSelfService", () => {
  it("renders useful own-record status without preloading sensitive values into the DOM", () => {
    render(
      <HrisEmployeeSelfService
        model={model()}
        payslipsHref="/en/dashboard/payroll/payslips"
        locale="en"
      />,
    )

    expect(screen.getByRole("heading", { name: "My HR" })).toBeInTheDocument()
    expect(screen.getByText("Alice Ngono")).toBeInTheDocument()
    expect(screen.getByText("***1234")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Payslips" })).toHaveAttribute(
      "href",
      "/en/dashboard/payroll/payslips",
    )
    expect(screen.getByText("Leave request")).toBeInTheDocument()

    expect(document.body.textContent).not.toMatch(/other-employee-id|private-actor-id/)
    expect(document.body.textContent).not.toMatch(/1234567890121234/)
    expect(document.body.textContent).not.toMatch(/sha256:private-document-proof/)
  })
})
