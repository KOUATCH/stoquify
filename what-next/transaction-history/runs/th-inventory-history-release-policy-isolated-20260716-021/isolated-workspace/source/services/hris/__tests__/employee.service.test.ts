jest.mock("@/services/payroll/employee.service", () => ({
  getPayrollEmployeeSourceData: jest.fn(),
  upsertPayrollEmployeeSourceProfile: jest.fn(),
  attachPayrollEmployeeEvidenceReferences: jest.fn(),
}))

jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
  ownHrisRecordAccessScope: jest.fn(),
}))

import { ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import {
  ownHrisRecordAccessScope,
  resolveHrisPeopleAccessScope,
} from "@/services/hris/org.service"
import {
  attachPayrollEmployeeEvidenceReferences,
  getPayrollEmployeeSourceData,
  upsertPayrollEmployeeSourceProfile,
} from "@/services/payroll/employee.service"

import {
  HRIS_PEOPLE_CORE_DATA_OWNERSHIP,
  attachHrisEmployeeEvidenceReferences,
  getHrisEmployeeDirectory,
  getHrisEmployeeProfile,
  getOwnHrisEmployeeProfile,
  upsertHrisEmployeeProfile,
} from "../employee.service"

const mockedGetPayrollEmployeeSourceData = getPayrollEmployeeSourceData as jest.MockedFunction<
  typeof getPayrollEmployeeSourceData
>
const mockedUpsertPayrollEmployeeSourceProfile = upsertPayrollEmployeeSourceProfile as jest.MockedFunction<
  typeof upsertPayrollEmployeeSourceProfile
>
const mockedAttachPayrollEmployeeEvidenceReferences = attachPayrollEmployeeEvidenceReferences as jest.MockedFunction<
  typeof attachPayrollEmployeeEvidenceReferences
>
const mockedResolveHrisPeopleAccessScope = resolveHrisPeopleAccessScope as jest.Mock
const mockedOwnHrisRecordAccessScope = ownHrisRecordAccessScope as jest.Mock

const tenantAdminScope = {
  organizationId: "org-1",
  authority: {
    kind: "TENANT_HRIS_ADMIN",
    label: "Tenant HRIS administration",
    basis: "HRIS_PERMISSION",
    reportingLineAuthority: false,
    effectiveDating: "NOT_APPLICABLE",
    historicalAccessSupported: false,
    delegationSupported: false,
  },
  managedLocations: [],
  employeeIds: null,
  limitations: [],
}

const ownRecordScope = {
  organizationId: "org-1",
  authority: {
    kind: "OWN_RECORD",
    label: "Own employee record",
    basis: "PayrollEmployee.userId",
    reportingLineAuthority: false,
    effectiveDating: "CURRENT_ONLY",
    historicalAccessSupported: false,
    delegationSupported: false,
  },
  managedLocations: [],
  employeeIds: null,
  limitations: [],
}

function payrollEmployee(overrides: Record<string, unknown> = {}) {
  return {
    id: "emp-1",
    employeeNumber: "EMP-001",
    displayName: "Alice Ngono",
    status: "ACTIVE",
    employment: {
      hireDate: "2026-01-01T00:00:00.000Z",
      terminationDate: null,
      countryCode: "CM",
      locationId: "loc-1",
      department: "Operations",
      jobTitle: "Supervisor",
      costCenter: "OPS",
    },
    userMapping: {
      state: "LINKED",
      userId: "user-1",
      userDisplayName: "Alice Ngono",
      userEmailMasked: "a***@example.com",
    },
    evidence: {
      referenceCount: 1,
      latestDocumentHash: "[REDACTED:HR_DOCUMENT]",
      referenceTypes: ["IDENTITY"],
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
    ...overrides,
  }
}

function payrollResult(employees = [payrollEmployee()]) {
  return {
    organizationId: "org-1",
    asOf: "2026-07-14T00:00:00.000Z",
    employees,
    summary: {
      totalEmployees: employees.length,
      linkedUsers: employees.length,
      unmappedEmployees: 0,
      orphanedUserMappings: 0,
      activeContractReady: employees.length,
      frozenAttendanceReady: employees.length,
      payrollReadyCandidates: employees.length,
    },
    redaction: {
      salaryDecision: {
        allowed: false,
        mode: "redact",
        reasonCode: "MISSING_PERMISSION",
        policy: "kontava-payroll-source-data-redaction-policy",
      },
      documentEvidenceDecision: {
        allowed: false,
        mode: "redact",
        reasonCode: "MISSING_PERMISSION",
        policy: "kontava-payroll-document-evidence-redaction-policy",
      },
    },
  } as Awaited<ReturnType<typeof getPayrollEmployeeSourceData>>
}

describe("HRIS employee facade", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedResolveHrisPeopleAccessScope.mockResolvedValue(tenantAdminScope)
    mockedOwnHrisRecordAccessScope.mockReturnValue(ownRecordScope)
  })

  it("returns a redacted directory without internal user identifiers", async () => {
    const input = {
      organizationId: "org-1",
      actorId: "actor-1",
      actorPermissions: ["hris.people.read"],
    }
    const client = { payrollEmployee: { findMany: jest.fn() } }
    mockedGetPayrollEmployeeSourceData.mockResolvedValue(payrollResult())

    const result = await getHrisEmployeeDirectory(input, client as never)

    expect(mockedGetPayrollEmployeeSourceData).toHaveBeenCalledWith(input, client)
    expect(result.dataOwnership).toEqual(HRIS_PEOPLE_CORE_DATA_OWNERSHIP)
    expect(result.accessScope).toEqual(tenantAdminScope)
    expect(result.employees[0].userMapping).toEqual({
      state: "LINKED",
      userDisplayName: "Alice Ngono",
      userEmailMasked: "a***@example.com",
    })
    expect(result.employees[0].userMapping).not.toHaveProperty("userId")
    expect(JSON.stringify(result.employees[0])).not.toMatch(/legalName|taxIdentifier|socialIdentifier|bankAccount|mobileMoney|salary/)
  })

  it("filters a read-only manager directory to employees proven by current location responsibility", async () => {
    const input = {
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      limit: 50,
    }
    const managerScope = {
      ...tenantAdminScope,
      authority: {
        ...tenantAdminScope.authority,
        kind: "LOCATION_RESPONSIBILITY",
        label: "Managed-location responsibility",
        basis: "Location.managerId",
        effectiveDating: "CURRENT_ONLY",
      },
      managedLocations: [{ id: "loc-1", name: "Douala Branch", code: "DLA" }],
      employeeIds: ["emp-1"],
    }
    mockedResolveHrisPeopleAccessScope.mockResolvedValue(managerScope)
    mockedGetPayrollEmployeeSourceData.mockResolvedValue(payrollResult())

    const result = await getHrisEmployeeDirectory(input)

    expect(mockedResolveHrisPeopleAccessScope).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      limit: 50,
    }, undefined)
    expect(mockedGetPayrollEmployeeSourceData).toHaveBeenCalledWith({
      ...input,
      employeeIds: ["emp-1"],
    }, undefined)
    expect(result.accessScope.authority).toMatchObject({
      kind: "LOCATION_RESPONSIBILITY",
      reportingLineAuthority: false,
    })
  })
  it("loads one tenant-scoped profile and keeps the same redacted record contract", async () => {
    mockedGetPayrollEmployeeSourceData.mockResolvedValue(payrollResult())

    const result = await getHrisEmployeeProfile({
      organizationId: "org-1",
      actorId: "actor-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
    })

    expect(mockedGetPayrollEmployeeSourceData).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "actor-1",
        employeeId: "emp-1",
        limit: 1,
      }),
      undefined,
    )
    expect(result.employee.id).toBe("emp-1")
    expect(result.employee.userMapping).not.toHaveProperty("userId")
    expect(result.accessScope).toEqual(tenantAdminScope)
  })

  it("fails closed when a profile does not exist in the active tenant", async () => {
    mockedGetPayrollEmployeeSourceData.mockResolvedValue(payrollResult([]))

    await expect(
      getHrisEmployeeProfile({
        organizationId: "org-1",
        actorPermissions: ["hris.people.read"],
        employeeId: "other-tenant-employee",
      }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it("resolves own-record access from the authenticated user instead of an employee id", async () => {
    mockedGetPayrollEmployeeSourceData.mockResolvedValue(payrollResult())

    await getOwnHrisEmployeeProfile({
      organizationId: "org-1",
      actorId: "user-1",
      actorPermissions: ["hris.self_service.read"],
    })

    expect(mockedGetPayrollEmployeeSourceData).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        actorId: "user-1",
        actorPermissions: ["hris.self_service.read", "hris.people.read"],
        userId: "user-1",
        limit: 2,
      },
      undefined,
    )
  })

  it("denies own-record reads without a self-service or elevated HRIS grant", async () => {
    await expect(getOwnHrisEmployeeProfile({
      organizationId: "org-1",
      actorId: "user-1",
      actorPermissions: ["dashboard.read"],
    })).rejects.toBeInstanceOf(ForbiddenError)

    expect(mockedGetPayrollEmployeeSourceData).not.toHaveBeenCalled()
  })

  it("denies stale or duplicate user mappings instead of choosing a profile", async () => {
    mockedGetPayrollEmployeeSourceData.mockResolvedValue(
      payrollResult([
        payrollEmployee(),
        payrollEmployee({ id: "emp-2", employeeNumber: "EMP-002" }),
      ]),
    )

    await expect(
      getOwnHrisEmployeeProfile({
        organizationId: "org-1",
        actorId: "user-1",
        actorPermissions: ["hris.people.read"],
      }),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it("delegates profile mutations through the compatibility writer", async () => {
    const input = {
      organizationId: "org-1",
      actorId: "actor-1",
      actorPermissions: ["hris.people.manage"],
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      status: "ACTIVE",
      hireDate: new Date("2026-01-01T00:00:00.000Z"),
    }
    const payrollMutation = {
      payrollEmployee: { id: "emp-1", organizationId: "org-1" },
      created: true,
      businessEventId: "event-1",
      evidenceReferenceCount: 0,
    } as Awaited<ReturnType<typeof upsertPayrollEmployeeSourceProfile>>
    mockedUpsertPayrollEmployeeSourceProfile.mockResolvedValue(payrollMutation)

    const result = await upsertHrisEmployeeProfile(input)

    expect(mockedUpsertPayrollEmployeeSourceProfile).toHaveBeenCalledWith(input, undefined)
    expect(result.dataOwnership).toEqual(HRIS_PEOPLE_CORE_DATA_OWNERSHIP)
  })

  it("preserves duplicate conflicts from the compatibility writer", async () => {
    mockedUpsertPayrollEmployeeSourceProfile.mockRejectedValue(new ConflictError("Duplicate employee mapping"))

    await expect(
      upsertHrisEmployeeProfile({
        organizationId: "org-1",
        actorPermissions: ["hris.people.manage"],
        employeeNumber: "EMP-001",
        displayName: "Alice Ngono",
        hireDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it("delegates evidence attachment without taking ownership of document payloads", async () => {
    const input = {
      organizationId: "org-1",
      actorId: "actor-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      evidenceReferences: [{ type: "CONTRACT" as const, documentHash: "sha256:contract-hash" }],
    }
    const payrollMutation = {
      payrollEmployee: { id: "emp-1", organizationId: "org-1" },
      businessEventId: "event-2",
      evidenceReferenceCount: 1,
    } as Awaited<ReturnType<typeof attachPayrollEmployeeEvidenceReferences>>
    mockedAttachPayrollEmployeeEvidenceReferences.mockResolvedValue(payrollMutation)

    const result = await attachHrisEmployeeEvidenceReferences(input)

    expect(mockedAttachPayrollEmployeeEvidenceReferences).toHaveBeenCalledWith(input, undefined)
    expect(result.dataOwnership.compatibilityStorageModel).toBe("PayrollEmployee")
  })
})