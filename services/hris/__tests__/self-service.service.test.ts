jest.mock("@/services/hris/employee.service", () => ({
  getOwnHrisEmployeeProfile: jest.fn(),
}))

jest.mock("@/services/hris/payment-destination.service", () => ({
  getOwnHrisPaymentDestinationStatus: jest.fn(),
}))

jest.mock("@/services/hris/time-leave.service", () => ({
  getOwnHrisTimeLeaveAttendanceStatus: jest.fn(),
}))

jest.mock("@/services/hris/operational-time.service", () => ({
  getOwnOperationalTime: jest.fn(),
}))

import { getOwnHrisEmployeeProfile } from "@/services/hris/employee.service"
import { getOwnHrisPaymentDestinationStatus } from "@/services/hris/payment-destination.service"
import { getOwnHrisTimeLeaveAttendanceStatus } from "@/services/hris/time-leave.service"
import { getOwnOperationalTime } from "@/services/hris/operational-time.service"

import { getHrisEmployeeSelfService } from "../self-service.service"

const mockOwnProfile = getOwnHrisEmployeeProfile as jest.Mock
const mockOwnPayment = getOwnHrisPaymentDestinationStatus as jest.Mock
const mockOwnAttendance = getOwnHrisTimeLeaveAttendanceStatus as jest.Mock
const mockOwnOperationalTime = getOwnOperationalTime as jest.Mock

function ownProfile() {
  return {
    organizationId: "org-1",
    asOf: "2026-07-15T00:00:00.000Z",
    employee: {
      id: "private-employee-id",
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      status: "ACTIVE",
      employment: {
        hireDate: "2026-01-01T00:00:00.000Z",
        terminationDate: null,
        countryCode: "CM",
        locationId: "private-location-id",
        department: "Operations",
        jobTitle: "Supervisor",
        costCenter: "OPS",
      },
      userMapping: {
        state: "LINKED",
        userDisplayName: "Alice Ngono",
        userEmailMasked: "a***@example.com",
      },
      evidence: {
        referenceCount: 2,
        latestDocumentHash: "sha256:private-document-proof",
        referenceTypes: ["IDENTITY", "CONTRACT"],
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
    },
  }
}

describe("HRIS employee self-service read model", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOwnProfile.mockResolvedValue(ownProfile())
    mockOwnOperationalTime.mockResolvedValue({ requests: [], balances: [] })
    mockOwnPayment.mockResolvedValue({
      employee: {
        id: "private-employee-id",
        paymentDestination: {
          state: "PENDING_APPROVAL",
          method: "BANK_TRANSFER",
          maskedDestination: "***1234",
          approvalEvidencePresent: false,
          destinationFingerprintPresent: true,
          latestChange: {
            id: "private-change-id",
            employeeId: "private-employee-id",
            status: "REQUESTED",
            paymentMethod: "BANK_TRANSFER",
            maskedDestination: "***1234",
            requestedAt: "2026-07-15T00:00:00.000Z",
            approvedAt: null,
            appliedAt: null,
          },
        },
        payrollReleaseReadiness: { status: "BLOCKED", blockers: [] },
      },
    })
    mockOwnAttendance.mockResolvedValue({
      snapshots: [{
        id: "private-snapshot-id",
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
        sourceProofPresent: true,
        certificationStatus: "CERTIFIED",
        policyProofPresent: true,
        approvalProofPresent: true,
        unresolvedItemCount: 0,
        frozenAt: "2026-07-01T00:00:00.000Z",
        correctedFromId: "private-correction-id",
      }],
    })
  })

  it("composes only authenticated own-record readers and emits a minimized model", async () => {
    const input = {
      organizationId: "org-1",
      actorId: "employee-user-1",
      actorPermissions: [
        "hris.self_service.read",
        "hris.self_service.request",
        "payroll.payslips.self.read",
      ],
    }

    const result = await getHrisEmployeeSelfService(input)

    expect(mockOwnProfile).toHaveBeenCalledWith(input)
    expect(mockOwnPayment).toHaveBeenCalledWith(input)
    expect(mockOwnAttendance).toHaveBeenCalledWith({ ...input, limit: 1 })
    expect(result.profile).toMatchObject({
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
    })
    expect(result.paymentDestination).toMatchObject({
      maskedDestination: "***1234",
      latestChange: { status: "REQUESTED" },
    })
    expect(result.capabilities).toMatchObject({
      payslips: { canRead: true, canExport: false, exportRequiresFreshAuth: true },
      paymentDestinationRequest: { canRequest: true, freshAuthRequired: true },
    })

    const serialized = JSON.stringify(result)
    expect(serialized).not.toMatch(/private-employee-id|private-location-id|private-change-id/)
    expect(serialized).not.toMatch(/private-snapshot-id|private-correction-id/)
    expect(serialized).not.toMatch(/sha256:private-document-proof|a\*\*\*@example\.com/)
    expect(serialized).not.toMatch(/latestDocumentHash|userId|employeeId|sourceHash/i)
  })

  it("fails before any own-record service runs when self-service permission is absent", async () => {
    await expect(getHrisEmployeeSelfService({
      organizationId: "org-1",
      actorId: "employee-user-1",
      actorPermissions: ["dashboard.read"],
    })).rejects.toThrow("Missing permission for HRIS employee self-service")

    expect(mockOwnProfile).not.toHaveBeenCalled()
    expect(mockOwnPayment).not.toHaveBeenCalled()
    expect(mockOwnAttendance).not.toHaveBeenCalled()
  })
})
