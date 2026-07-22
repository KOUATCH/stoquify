import type { OperatingAccessContext } from "../operating-access-scope-contracts"
import { resolveOperatingAccessScope } from "../operating-access-scope.service"

function context(overrides: Partial<OperatingAccessContext> = {}): OperatingAccessContext {
  return {
    orgId: "org-1",
    userId: "user-1",
    roles: [
      {
        id: "role-manager",
        name: "Manager",
        code: "manager",
        permissions: ["dashboard.read"],
      },
    ],
    permissions: ["dashboard.read"],
    isSuperUser: false,
    ...overrides,
  }
}

function buildClient(
  managedLocations: Array<{ id: string; name: string; code: string }> = [],
) {
  return {
    location: {
      findMany: jest.fn().mockResolvedValue(managedLocations),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
}

describe("operating access scope service", () => {
  it("grants tenant-wide scope to an authenticated super user", async () => {
    const client = buildClient()

    const result = await resolveOperatingAccessScope(
      context({ isSuperUser: true, roles: [] }),
      client as any,
    )

    expect(result).toEqual({
      allowed: true,
      organizationId: "org-1",
      actorId: "user-1",
      requiredPermission: "dashboard.read",
      authority: {
        kind: "TENANT_WIDE",
        basis: "RBAC_SUPER_USER",
        matchedRoleCode: null,
      },
      scope: {
        kind: "TENANT",
        locationIds: null,
      },
    })
    expect(client.location.findMany).not.toHaveBeenCalled()
  })

  it("grants tenant-wide scope only for an allowlisted administrator role", async () => {
    const client = buildClient()

    const result = await resolveOperatingAccessScope(
      context({
        roles: [
          {
            id: "role-admin",
            name: "Administrator",
            code: " Administrator ",
            permissions: ["dashboard.read"],
          },
        ],
      }),
      client as any,
    )

    expect(result).toMatchObject({
      allowed: true,
      authority: {
        kind: "TENANT_WIDE",
        basis: "RBAC_ROLE",
        matchedRoleCode: "administrator",
      },
      scope: { kind: "TENANT", locationIds: null },
    })
    expect(client.location.findMany).not.toHaveBeenCalled()
  })

  it("does not treat dashboard.read alone as tenant-wide authority", async () => {
    const client = buildClient([{ id: "loc-1", name: "Douala", code: "DLA" }])

    const result = await resolveOperatingAccessScope(context(), client as any)

    expect(result).toMatchObject({
      allowed: true,
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        basis: "Location.managerId",
      },
      scope: { kind: "LOCATIONS", locationIds: ["loc-1"] },
    })
  })

  it("resolves multiple managed locations with a deterministic tenant-scoped query", async () => {
    const client = buildClient([
      { id: "loc-1", name: "Douala", code: "DLA" },
      { id: "loc-2", name: "Yaounde", code: "YDE" },
    ])

    const result = await resolveOperatingAccessScope(context(), client as any)

    expect(client.location.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        managerId: "user-1",
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
      },
    })
    expect(result).toMatchObject({
      allowed: true,
      scope: { kind: "LOCATIONS", locationIds: ["loc-1", "loc-2"] },
    })
  })

  it("fails closed before location lookup when the Daily Truth permission is missing", async () => {
    const client = buildClient([{ id: "loc-1", name: "Douala", code: "DLA" }])

    const result = await resolveOperatingAccessScope(
      context({ permissions: [], isSuperUser: true }),
      client as any,
    )

    expect(result).toEqual({
      allowed: false,
      organizationId: "org-1",
      actorId: "user-1",
      requiredPermission: "dashboard.read",
      authority: { kind: "DENIED", basis: "RBAC_PERMISSION" },
      reason: "MISSING_DAILY_TRUTH_PERMISSION",
      scope: null,
    })
    expect(client.location.findMany).not.toHaveBeenCalled()
  })

  it("fails closed when an actor has no active managed locations", async () => {
    const client = buildClient()

    const result = await resolveOperatingAccessScope(
      context({
        roles: [
          {
            id: "role-custom",
            name: "Custom operator",
            code: "custom_operator",
            permissions: ["dashboard.read"],
          },
        ],
      }),
      client as any,
    )

    expect(result).toMatchObject({
      allowed: false,
      authority: { kind: "DENIED", basis: "LOCATION_ASSIGNMENT" },
      reason: "NO_MANAGED_LOCATIONS",
      scope: null,
    })
  })

  it("records minimal allowed scope evidence", async () => {
    const client = buildClient([{ id: "loc-1", name: "Douala", code: "DLA" }])

    await resolveOperatingAccessScope(context(), client as any)

    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: {
        entityType: "OperatingAccessScope",
        entityId: "org-1",
        action: "OPERATING_ACCESS_SCOPE_ALLOWED",
        userId: "user-1",
        organizationId: "org-1",
        changes: {
          requiredPermission: "dashboard.read",
          authorityKind: "LOCATION_RESPONSIBILITY",
          authorityBasis: "Location.managerId",
          locationIds: ["loc-1"],
          locationCount: 1,
          reason: null,
        },
      },
    })
  })

  it("records a denied decision without sensitive business data", async () => {
    const client = buildClient()

    await resolveOperatingAccessScope(context(), client as any)

    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: {
        entityType: "OperatingAccessScope",
        entityId: "org-1",
        action: "OPERATING_ACCESS_SCOPE_DENIED",
        userId: "user-1",
        organizationId: "org-1",
        changes: {
          requiredPermission: "dashboard.read",
          authorityKind: "DENIED",
          authorityBasis: "LOCATION_ASSIGNMENT",
          locationIds: null,
          locationCount: 0,
          reason: "NO_MANAGED_LOCATIONS",
        },
      },
    })

    const changes = client.auditLog.create.mock.calls[0][0].data.changes
    expect(Object.keys(changes).sort()).toEqual([
      "authorityBasis",
      "authorityKind",
      "locationCount",
      "locationIds",
      "reason",
      "requiredPermission",
    ])
  })
})
