import { ForbiddenError } from "@/services/_shared/action-errors"
import { getPayrollOrgManagerScopedEmployees } from "@/services/payroll/org-manager-scope.service"

import { resolveHrisPeopleAccessScope } from "../org.service"

jest.mock("@/services/payroll/org-manager-scope.service", () => ({
  getPayrollOrgManagerScopedEmployees: jest.fn(),
}))

const compatibilityScope = getPayrollOrgManagerScopedEmployees as jest.Mock
const AS_OF = new Date("2026-04-15T12:00:00.000Z")

function relationship(overrides: Record<string, unknown> = {}) {
  return {
    id: "rel-1",
    managerEmployeeId: "manager-employee-1",
    reportEmployeeId: "emp-1",
    reportAssignment: {
      orgUnitId: "unit-douala",
      position: {
        location: { id: "loc-douala", name: "Douala", code: "DLA" },
      },
    },
    ...overrides,
  }
}

function buildClient(options: {
  targetOwned?: boolean
  directRows?: ReturnType<typeof relationship>[]
  delegations?: Array<{ id: string; delegatorEmployeeId: string; scopeOrgUnitId: string | null }>
  delegatedRows?: ReturnType<typeof relationship>[]
  actorExists?: boolean
} = {}) {
  const directRows = options.directRows ?? []
  const delegations = options.delegations ?? []
  const delegatedRows = options.delegatedRows ?? []
  const reportingFindMany = jest.fn()
    .mockResolvedValueOnce(directRows)
    .mockResolvedValueOnce(delegatedRows)

  return {
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    payrollEmployee: {
      findFirst: jest.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        if (where.userId) return Promise.resolve(options.actorExists === false ? null : { id: "manager-employee-1" })
        return Promise.resolve(options.targetOwned === false ? null : { id: String(where.id) })
      }),
    },
    hrisReportingRelationship: { findMany: reportingFindMany },
    hrisManagerDelegation: { findMany: jest.fn().mockResolvedValue(delegations) },
  }
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    actorId: "manager-user-1",
    actorPermissions: ["hris.people.read"],
    asOf: AS_OF,
    ...overrides,
  }
}

describe("effective-dated HRIS manager scope", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("resolves historical reporting authority with tenant-owned assignment edges", async () => {
    const scopedClient = buildClient({ directRows: [relationship()] })

    const result = await resolveHrisPeopleAccessScope(request(), scopedClient as never)

    expect(result).toMatchObject({
      authority: {
        kind: "REPORTING_RELATIONSHIP",
        basis: "HrisReportingRelationship",
        reportingLineAuthority: true,
        effectiveDating: "AS_OF",
        historicalAccessSupported: true,
      },
      employeeIds: ["emp-1"],
      managedLocations: [{ id: "loc-douala", code: "DLA" }],
      auditEvidence: {
        asOf: AS_OF.toISOString(),
        relationshipIds: ["rel-1"],
        delegationIds: [],
      },
    })
    expect(scopedClient.hrisReportingRelationship.findMany).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          managerEmployeeId: "manager-employee-1",
          effectiveFrom: { lte: AS_OF },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: AS_OF } }],
          managerAssignment: expect.objectContaining({ organizationId: "org-1" }),
          reportAssignment: expect.objectContaining({ organizationId: "org-1" }),
        }),
      }),
    )
    expect(scopedClient.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "HRIS_EFFECTIVE_MANAGER_SCOPE_RESOLVED",
        organizationId: "org-1",
        changes: expect.objectContaining({ relationshipIds: ["rel-1"] }),
      }),
    }))
  })

  it("denies and audits a cross-tenant employee before resolving relationships", async () => {
    const scopedClient = buildClient({ targetOwned: false, directRows: [relationship()] })

    await expect(resolveHrisPeopleAccessScope(request({ employeeId: "foreign-emp" }), scopedClient as never))
      .rejects.toBeInstanceOf(ForbiddenError)

    expect(scopedClient.hrisReportingRelationship.findMany).not.toHaveBeenCalled()
    expect(scopedClient.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "HRIS_CROSS_TENANT_SCOPE_DENIED",
        entityId: "foreign-emp",
      }),
    }))
  })

  it("denies a same-tenant employee in another branch without an explicit relationship", async () => {
    const scopedClient = buildClient({ directRows: [relationship()] })

    await expect(resolveHrisPeopleAccessScope(request({ employeeId: "emp-other-branch" }), scopedClient as never))
      .rejects.toBeInstanceOf(ForbiddenError)

    expect(compatibilityScope).not.toHaveBeenCalled()
  })

  it("grants only the delegated org-unit scope at the effective boundary", async () => {
    const scopedClient = buildClient({
      delegations: [{ id: "delegation-1", delegatorEmployeeId: "manager-employee-2", scopeOrgUnitId: "unit-yaounde" }],
      delegatedRows: [
        relationship({
          id: "rel-yaounde",
          managerEmployeeId: "manager-employee-2",
          reportEmployeeId: "emp-yaounde",
          reportAssignment: {
            orgUnitId: "unit-yaounde",
            position: { location: { id: "loc-yaounde", name: "Yaounde", code: "YDE" } },
          },
        }),
        relationship({
          id: "rel-douala",
          managerEmployeeId: "manager-employee-2",
          reportEmployeeId: "emp-douala",
        }),
      ],
    })

    const result = await resolveHrisPeopleAccessScope(request({
      delegationAuthority: "APPROVAL_DECISION",
    }), scopedClient as never)

    expect(result).toMatchObject({
      authority: { kind: "DELEGATED_MANAGER_AUTHORITY", basis: "HrisManagerDelegation" },
      employeeIds: ["emp-yaounde"],
      auditEvidence: { relationshipIds: ["rel-yaounde"], delegationIds: ["delegation-1"] },
    })
    expect(scopedClient.hrisManagerDelegation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-1",
        authority: "APPROVAL_DECISION",
        effectiveFrom: { lte: AS_OF },
        effectiveTo: { gt: AS_OF },
      }),
    }))
  })

  it("fails closed for future, expired, or assignment-less authority and never uses location fallback", async () => {
    const scopedClient = buildClient()

    await expect(resolveHrisPeopleAccessScope(request(), scopedClient as never))
      .rejects.toBeInstanceOf(ForbiddenError)

    expect(compatibilityScope).not.toHaveBeenCalled()
    expect(scopedClient.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "HRIS_EFFECTIVE_MANAGER_SCOPE_DENIED",
        changes: expect.objectContaining({ reason: "NO_ACTIVE_DURABLE_AUTHORITY" }),
      }),
    }))
  })
})
