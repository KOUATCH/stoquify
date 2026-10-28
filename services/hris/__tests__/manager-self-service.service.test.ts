jest.mock("@/services/hris/employee.service", () => ({
  getHrisEmployeeDirectory: jest.fn(),
}))

jest.mock("@/services/hris/approval-inbox.service", () => ({
  getHrisApprovalInbox: jest.fn(),
}))

jest.mock("@/services/hris/operational-time.service", () => ({
  getManagedOperationalTimeInbox: jest.fn(),
}))

import { getHrisApprovalInbox } from "@/services/hris/approval-inbox.service"
import { getHrisEmployeeDirectory } from "@/services/hris/employee.service"
import { getManagedOperationalTimeInbox } from "@/services/hris/operational-time.service"

import { getHrisManagerSelfService } from "../manager-self-service.service"

const mockDirectory = getHrisEmployeeDirectory as jest.Mock
const mockInbox = getHrisApprovalInbox as jest.Mock
const mockOperationalInbox = getManagedOperationalTimeInbox as jest.Mock

function scopedDirectory() {
  return {
    organizationId: "org-1",
    asOf: "2026-07-15T00:00:00.000Z",
    accessScope: {
      organizationId: "org-1",
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        label: "Managed-location responsibility",
        basis: "Location.managerId",
        reportingLineAuthority: false,
        effectiveDating: "CURRENT_ONLY",
        historicalAccessSupported: false,
        delegationSupported: false,
      },
      managedLocations: [{ id: "private-location-id", name: "Douala Central", code: "DLA" }],
      employeeIds: ["employee-in-scope"],
      limitations: ["Employees in a managed location are not represented as direct reports."],
    },
    employees: [{
      id: "employee-in-scope",
      employeeNumber: "PRIVATE-EMP-001",
      displayName: "Alice Ngono",
      status: "ACTIVE",
      employment: {
        hireDate: "2026-01-01T00:00:00.000Z",
        terminationDate: null,
        countryCode: "CM",
        locationId: "private-location-id",
        department: "Operations",
        jobTitle: "Supervisor",
        costCenter: "PRIVATE-COST-CENTER",
      },
      userMapping: {
        state: "LINKED",
        userDisplayName: "Alice Ngono",
        userEmailMasked: "a***@private.example",
      },
      evidence: {
        referenceCount: 3,
        latestDocumentHash: "sha256:private-document-hash",
        referenceTypes: ["PRIVATE_IDENTITY_TYPE"],
        hasTaxIdentifierHash: true,
        hasSocialIdentifierHash: true,
        hasPaymentDestinationHash: true,
      },
      contractReadiness: {
        activeContractCount: 1,
        latestContractStatus: "ACTIVE",
        hasSignedDocumentEvidence: true,
      },
      attendanceReadiness: {
        frozenSnapshotCount: 1,
        latestFrozenPeriodEnd: "2026-06-30T00:00:00.000Z",
        hasFrozenAttendanceSource: true,
      },
      blockers: [],
      privateSalaryValue: "987654321",
      privateTaxIdentifier: "TAX-PRIVATE-001",
      privatePaymentDestination: "BANK-PRIVATE-001",
    }],
  }
}

function scopedInbox() {
  const item = (employeeId: string, displayName: string) => ({
    id: `PRIVATE-INBOX-ID-${employeeId}`,
    domain: "SALARY_CHANGE",
    stage: "REVIEW",
    sourceId: `PRIVATE-SOURCE-ID-${employeeId}`,
    employee: { id: employeeId, displayName },
    title: "Salary change",
    subject: "PRIVATE-SALARY-SUBJECT-987654321",
    requestedAt: "2026-07-14T00:00:00.000Z",
    effectiveAt: "2026-08-01T00:00:00.000Z",
    potentialActions: ["APPROVE", "REJECT"],
    decision: { eligible: false, reasonCode: "MISSING_MANAGE_PERMISSION" },
    evidence: {
      requestEvidencePresent: true,
      approvalEvidencePresent: false,
      rawDetailsIncluded: false,
    },
    readiness: {
      status: "BLOCKED",
      blockerCode: "COMPENSATION_CHANGE_PENDING",
      impact: "PAYROLL_INPUT",
    },
    reviewHref: `/dashboard/people/${employeeId}`,
  })

  return {
    organizationId: "org-1",
    items: [
      item("employee-in-scope", "Alice Ngono"),
      item("employee-out-of-scope", "Outside Scope Person"),
    ],
  }
}

describe("HRIS manager self-service read model", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDirectory.mockResolvedValue(scopedDirectory())
    mockInbox.mockResolvedValue(scopedInbox())
    mockOperationalInbox.mockResolvedValue({ requests: [], accessScope: { kind: "REPORTING_RELATIONSHIP" } })
  })

  it("composes the proven location scope and emits a minimized operational model", async () => {
    const result = await getHrisManagerSelfService({
      organizationId: "org-1",
      actorId: "manager-user-1",
      actorPermissions: ["hris.people.read"],
    })

    const parsedInput = {
      organizationId: "org-1",
      actorId: "manager-user-1",
      actorPermissions: ["hris.people.read"],
      limit: 50,
    }
    expect(mockDirectory).toHaveBeenCalledWith(parsedInput)
    expect(mockInbox).toHaveBeenCalledWith(parsedInput)
    expect(result.scope).toMatchObject({
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        reportingLineAuthority: false,
      },
      managedLocations: [{ name: "Douala Central", code: "DLA" }],
      directReportsClaimed: false,
    })
    expect(result.workforce).toHaveLength(1)
    expect(result.workforce[0]).toMatchObject({
      displayName: "Alice Ngono",
      employment: {
        location: { name: "Douala Central", code: "DLA" },
      },
      readiness: { status: "READY" },
    })
    expect(result.approvals).toHaveLength(1)
    expect(result.approvals[0]).toMatchObject({
      subject: "Compensation change awaiting review",
      decision: { eligible: false, reasonCode: "MISSING_MANAGE_PERMISSION" },
    })
    expect(result.summary).toEqual({
      workforceCount: 1,
      readyCount: 1,
      attentionCount: 0,
      visiblePendingApprovals: 1,
      actionableApprovals: 0,
    })
  })

  it("removes out-of-scope people and sensitive HR, payroll, and approval fields", async () => {
    const result = await getHrisManagerSelfService({
      organizationId: "org-1",
      actorId: "manager-user-1",
      actorPermissions: ["hris.people.read"],
    })

    const serialized = JSON.stringify(result)
    expect(serialized).not.toMatch(/Outside Scope Person|employee-out-of-scope/)
    expect(serialized).not.toMatch(/PRIVATE-EMP-001|PRIVATE-COST-CENTER|a\*\*\*@private\.example/)
    expect(serialized).not.toMatch(/sha256:private-document-hash|PRIVATE_IDENTITY_TYPE/)
    expect(serialized).not.toMatch(/987654321|TAX-PRIVATE-001|BANK-PRIVATE-001/)
    expect(serialized).not.toMatch(/PRIVATE-INBOX-ID|PRIVATE-SOURCE-ID|PRIVATE-SALARY-SUBJECT/)
    expect(serialized).not.toMatch(/"employeeNumber"|"userMapping"|"latestDocumentHash"|"sourceId"/i)
    expect(result.redaction).toEqual(expect.objectContaining({
      salaryValuesIncluded: false,
      taxAndSocialIdentifiersIncluded: false,
      paymentDestinationValuesIncluded: false,
      documentHashesIncluded: false,
      rawDocumentsIncluded: false,
      approvalSourceIdsIncluded: false,
    }))
  })

  it("fails before dependent services run when scoped people permission is absent", async () => {
    await expect(getHrisManagerSelfService({
      organizationId: "org-1",
      actorId: "manager-user-1",
      actorPermissions: ["dashboard.read"],
    })).rejects.toThrow("Missing permission for managed workforce read")

    expect(mockDirectory).not.toHaveBeenCalled()
    expect(mockInbox).not.toHaveBeenCalled()
  })
})
