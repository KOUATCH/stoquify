import { ForbiddenError } from "@/services/_shared/action-errors"
import { getPayrollOrgManagerScopedEmployees } from "@/services/payroll/org-manager-scope.service"

import {
  ownHrisRecordAccessScope,
  resolveHrisPeopleAccessScope,
} from "../org.service"

jest.mock("@/services/payroll/org-manager-scope.service", () => ({
  getPayrollOrgManagerScopedEmployees: jest.fn(),
}))

const mockGetCompatibilityScope = getPayrollOrgManagerScopedEmployees as jest.Mock

function client() {
  return {
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
  }
}

function compatibilityScope() {
  return {
    organizationId: "org-1",
    actorId: "manager-1",
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
      reportingLineAuthority: false,
      effectiveDating: "CURRENT_ONLY",
    },
    managedLocations: [{ id: "loc-1", name: "Douala Branch", code: "DLA" }],
    employees: [{
      id: "emp-1",
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      status: "ACTIVE",
      locationId: "loc-1",
      department: "Operations",
      jobTitle: "Supervisor",
      costCenter: "OPS-DLA",
    }],
    summary: { managedLocationCount: 1, employeeCount: 1, scoped: true },
  }
}

describe("HRIS organization and people access scope", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCompatibilityScope.mockResolvedValue(compatibilityScope())
  })

  it("treats HRIS manage permission as tenant administration, not reporting-line authority", async () => {
    const result = await resolveHrisPeopleAccessScope({
      organizationId: "org-1",
      actorId: "hr-admin-1",
      actorPermissions: ["hris.people.read", "hris.people.manage"],
    }, client() as never)

    expect(result.authority).toMatchObject({
      kind: "TENANT_HRIS_ADMIN",
      basis: "HRIS_PERMISSION",
      reportingLineAuthority: false,
      effectiveDating: "NOT_APPLICABLE",
    })
    expect(result.employeeIds).toBeNull()
    expect(mockGetCompatibilityScope).not.toHaveBeenCalled()
  })

  it("resolves read-only managers to current managed-location responsibility", async () => {
    const scopedClient = client()

    const result = await resolveHrisPeopleAccessScope({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      limit: 50,
    }, scopedClient as never)

    expect(mockGetCompatibilityScope).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: undefined,
      limit: 50,
    }, scopedClient)
    expect(result).toMatchObject({
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        basis: "Location.managerId",
        reportingLineAuthority: false,
        effectiveDating: "CURRENT_ONLY",
        historicalAccessSupported: false,
        delegationSupported: false,
      },
      employeeIds: ["emp-1"],
    })
    const resultKeys = JSON.stringify(result, (key, value) => {
      expect(key).not.toMatch(/salary|bankAccount|taxIdentifier|socialIdentifier/i)
      return value
    })
    expect(resultKeys).toBeDefined()
    expect(scopedClient.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "HRIS_LOCATION_RESPONSIBILITY_SCOPE_RESOLVED",
        organizationId: "org-1",
        userId: "manager-1",
      }),
    }))
  })

  it("denies and audits an employee outside current location responsibility", async () => {
    const scopedClient = client()
    mockGetCompatibilityScope.mockRejectedValue(
      new ForbiddenError("Payroll employee is outside the manager's assigned scope."),
    )

    await expect(resolveHrisPeopleAccessScope({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-other-tenant",
    }, scopedClient as never)).rejects.toBeInstanceOf(ForbiddenError)

    expect(scopedClient.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "HRIS_LOCATION_RESPONSIBILITY_SCOPE_DENIED",
        entityId: "emp-other-tenant",
        organizationId: "org-1",
      }),
    }))
  })

  it("rejects scope resolution without an HRIS people permission", async () => {
    await expect(resolveHrisPeopleAccessScope({
      organizationId: "org-1",
      actorId: "staff-1",
      actorPermissions: ["inventory.read"],
    }, client() as never)).rejects.toBeInstanceOf(ForbiddenError)

    expect(mockGetCompatibilityScope).not.toHaveBeenCalled()
  })

  it("labels own-record access without implying manager authority", () => {
    expect(ownHrisRecordAccessScope("org-1")).toMatchObject({
      organizationId: "org-1",
      authority: {
        kind: "OWN_RECORD",
        basis: "PayrollEmployee.userId",
        reportingLineAuthority: false,
      },
    })
  })
})
