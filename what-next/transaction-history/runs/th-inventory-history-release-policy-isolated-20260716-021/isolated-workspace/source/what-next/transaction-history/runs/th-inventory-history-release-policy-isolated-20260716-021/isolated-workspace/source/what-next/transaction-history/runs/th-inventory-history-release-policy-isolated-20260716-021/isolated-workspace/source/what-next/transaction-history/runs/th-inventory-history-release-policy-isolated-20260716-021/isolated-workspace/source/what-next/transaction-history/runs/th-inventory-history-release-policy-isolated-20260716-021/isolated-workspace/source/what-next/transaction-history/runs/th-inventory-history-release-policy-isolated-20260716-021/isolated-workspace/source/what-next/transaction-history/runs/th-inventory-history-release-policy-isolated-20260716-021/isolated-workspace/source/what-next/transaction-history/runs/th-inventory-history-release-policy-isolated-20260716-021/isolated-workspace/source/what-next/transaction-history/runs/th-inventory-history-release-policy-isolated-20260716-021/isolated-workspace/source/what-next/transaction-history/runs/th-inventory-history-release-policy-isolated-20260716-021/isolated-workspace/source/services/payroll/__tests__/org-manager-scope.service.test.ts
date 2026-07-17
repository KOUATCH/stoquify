import { PayrollEmployeeStatus } from "@prisma/client"

import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"

import {
  assertPayrollEmployeeLocationInOrganization,
  getPayrollOrgManagerScopedEmployees,
} from "../org-manager-scope.service"

function buildClient({
  managedLocations = [
    { id: "loc-1", name: "Douala Branch", code: "DLA" },
    { id: "loc-2", name: "Yaounde Branch", code: "YDE" },
  ],
  employees = [
    {
      id: "emp-1",
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      status: PayrollEmployeeStatus.ACTIVE,
      locationId: "loc-1",
      department: "Operations",
      jobTitle: "Store Manager",
      costCenter: "OPS-DLA",
    },
  ],
} = {}) {
  return {
    location: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue(managedLocations),
    },
    payrollEmployee: {
      findMany: jest.fn().mockResolvedValue(employees),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
}

describe("payroll org manager scope service", () => {
  it("validates employee location against tenant-owned durable locations", async () => {
    const client = buildClient()
    client.location.findFirst.mockResolvedValue({ id: "loc-1" })

    await expect(
      assertPayrollEmployeeLocationInOrganization(client as any, "org-1", "loc-1"),
    ).resolves.toBe("loc-1")

    expect(client.location.findFirst).toHaveBeenCalledWith({
      where: {
        id: "loc-1",
        organizationId: "org-1",
        deletedAt: null,
      },
      select: { id: true },
    })
  })

  it("rejects employee location ids that do not belong to the tenant", async () => {
    const client = buildClient()
    client.location.findFirst.mockResolvedValue(null)

    await expect(
      assertPayrollEmployeeLocationInOrganization(client as any, "org-1", "loc-other"),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it("returns only employees in the authenticated manager's assigned scope", async () => {
    const client = buildClient()

    const result = await getPayrollOrgManagerScopedEmployees(
      {
        organizationId: "org-1",
        actorId: "manager-1",
        actorPermissions: ["hris.people.read"],
      },
      client as any,
    )

    expect(client.location.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        managerId: "manager-1",
        deletedAt: null,
        isActive: true,
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
      },
    })
    expect(client.payrollEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          deletedAt: null,
          locationId: { in: ["loc-1", "loc-2"] },
        },
      }),
    )
    expect(result.authority).toEqual({
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
      reportingLineAuthority: false,
      effectiveDating: "CURRENT_ONLY",
    })
    expect(result.employees).toHaveLength(1)
    expect(result.employees[0].locationId).toBe("loc-1")
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_ORG_MANAGER_SCOPE_READ",
          organizationId: "org-1",
          userId: "manager-1",
        }),
      }),
    )
  })

  it("denies a requested employee outside the manager's assigned branch", async () => {
    const client = buildClient({
      managedLocations: [{ id: "loc-1", name: "Douala Branch", code: "DLA" }],
      employees: [],
    })

    await expect(
      getPayrollOrgManagerScopedEmployees(
        {
          organizationId: "org-1",
          actorId: "manager-1",
          actorPermissions: ["payroll.employees.read"],
          employeeId: "emp-branch-2",
        },
        client as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError)

    expect(client.payrollEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          deletedAt: null,
          locationId: { in: ["loc-1"] },
          id: "emp-branch-2",
        },
      }),
    )
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYROLL_ORG_MANAGER_SCOPE_DENIED",
          entityId: "emp-branch-2",
          organizationId: "org-1",
          userId: "manager-1",
        }),
      }),
    )
  })

  it("denies cross-tenant employees by never querying outside the actor organization", async () => {
    const client = buildClient({
      managedLocations: [{ id: "loc-1", name: "Douala Branch", code: "DLA" }],
      employees: [],
    })

    await expect(
      getPayrollOrgManagerScopedEmployees(
        {
          organizationId: "org-1",
          actorId: "manager-1",
          actorPermissions: ["payroll.employees.read"],
          employeeId: "emp-other-tenant",
        },
        client as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError)

    expect(client.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          managerId: "manager-1",
        }),
      }),
    )
    expect(client.payrollEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          deletedAt: null,
          locationId: { in: ["loc-1"] },
          id: "emp-other-tenant",
        },
      }),
    )
  })
})
