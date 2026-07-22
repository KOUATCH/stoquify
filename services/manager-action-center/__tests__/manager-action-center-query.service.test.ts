jest.mock("server-only", () => ({}))

jest.mock("@/services/operating-access/operating-access-scope.service", () => ({
  resolveOperatingAccessScope: jest.fn(),
}))

jest.mock("../manager-action-center.service", () => ({
  getManagerActionCenterDataFromResolvedAccess: jest.fn(),
}))

jest.mock("../manager-location-action-center.service", () => ({
  getManagerLocationActionCenterDataFromResolvedAccess: jest.fn(),
}))

import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"

import type { ManagerActionCenterData } from "../manager-action-center-contracts"
import { getManagerActionCenterDataFromResolvedAccess } from "../manager-action-center.service"
import type { ManagerLocationActionCenterData } from "../manager-location-action-center-contracts"
import { getManagerLocationActionCenterDataFromResolvedAccess } from "../manager-location-action-center.service"
import { getManagerActionCenterQuery } from "../manager-action-center-query.service"

const mockResolveOperatingAccessScope = resolveOperatingAccessScope as jest.Mock
const mockTenantBuilder = getManagerActionCenterDataFromResolvedAccess as jest.Mock
const mockLocationsBuilder =
  getManagerLocationActionCenterDataFromResolvedAccess as jest.Mock
const now = "2026-06-30T12:00:00.000Z"

describe("manager action center unified query", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("fails closed on a denied decision before either builder", async () => {
    const context = accessContext()
    mockResolveOperatingAccessScope.mockResolvedValue({
      allowed: false,
      organizationId: context.orgId,
      actorId: context.userId,
      requiredPermission: "dashboard.read",
      authority: { kind: "DENIED", basis: "LOCATION_ASSIGNMENT" },
      reason: "NO_MANAGED_LOCATIONS",
      scope: null,
    })

    await expect(
      getManagerActionCenterQuery({ accessContext: context, now }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        code: "FORBIDDEN",
        message: "Manager Action Center is not available for this account.",
      }),
    )

    expect(mockResolveOperatingAccessScope).toHaveBeenCalledTimes(1)
    expect(mockResolveOperatingAccessScope).toHaveBeenCalledWith(context)
    expect(mockTenantBuilder).not.toHaveBeenCalled()
    expect(mockLocationsBuilder).not.toHaveBeenCalled()
  })

  it("dispatches tenant authority through the existing tenant contract", async () => {
    const context = accessContext({
      roles: [
        {
          id: "role-admin",
          name: "Administrator",
          code: "admin",
          permissions: ["dashboard.read"],
        },
      ],
    })
    const access = tenantAccessDecision(context)
    const data = { organizationId: "org-1" } as ManagerActionCenterData
    const input = {
      accessContext: context,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now,
      maxAgeMinutes: 60,
    }
    mockResolveOperatingAccessScope.mockResolvedValue(access)
    mockTenantBuilder.mockResolvedValue(data)

    await expect(getManagerActionCenterQuery(input)).resolves.toEqual({
      kind: "TENANT",
      organizationId: "org-1",
      actorId: "user-1",
      data,
    })

    expect(mockResolveOperatingAccessScope).toHaveBeenCalledTimes(1)
    expect(mockTenantBuilder).toHaveBeenCalledWith(input, access)
    expect(mockLocationsBuilder).not.toHaveBeenCalled()
  })

  it("dispatches location responsibility through the bundle contract", async () => {
    const context = accessContext()
    const access = locationAccessDecision(context)
    const data = {
      organizationId: "org-1",
      actorId: "user-1",
      bundles: [],
    } as unknown as ManagerLocationActionCenterData
    const input = {
      accessContext: context,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now,
      maxAgeMinutes: 60,
    }
    mockResolveOperatingAccessScope.mockResolvedValue(access)
    mockLocationsBuilder.mockResolvedValue(data)

    await expect(getManagerActionCenterQuery(input)).resolves.toEqual({
      kind: "LOCATIONS",
      organizationId: "org-1",
      actorId: "user-1",
      data,
    })

    expect(mockResolveOperatingAccessScope).toHaveBeenCalledTimes(1)
    expect(mockLocationsBuilder).toHaveBeenCalledWith(input, access)
    expect(mockTenantBuilder).not.toHaveBeenCalled()
  })

  it("fails closed when authority and scope kinds disagree", async () => {
    const context = accessContext()
    mockResolveOperatingAccessScope.mockResolvedValue({
      ...locationAccessDecision(context),
      scope: { kind: "TENANT", locationIds: null },
    })

    await expect(
      getManagerActionCenterQuery({ accessContext: context, now }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        message: "Manager Action Center operating scope evidence is inconsistent.",
      }),
    )

    expect(mockResolveOperatingAccessScope).toHaveBeenCalledTimes(1)
    expect(mockTenantBuilder).not.toHaveBeenCalled()
    expect(mockLocationsBuilder).not.toHaveBeenCalled()
  })

  it("fails closed when resolved actor identity differs from trusted context", async () => {
    const context = accessContext()
    mockResolveOperatingAccessScope.mockResolvedValue({
      ...locationAccessDecision(context),
      actorId: "other-user",
    })

    await expect(
      getManagerActionCenterQuery({ accessContext: context, now }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        message: "Manager Action Center operating scope evidence is inconsistent.",
      }),
    )

    expect(mockTenantBuilder).not.toHaveBeenCalled()
    expect(mockLocationsBuilder).not.toHaveBeenCalled()
  })
})

function accessContext(
  overrides: Partial<OperatingAccessContext> = {},
): OperatingAccessContext {
  return {
    orgId: "org-1",
    userId: "user-1",
    roles: [],
    permissions: ["dashboard.read"],
    isSuperUser: false,
    ...overrides,
  }
}

function tenantAccessDecision(context: OperatingAccessContext) {
  return {
    allowed: true,
    organizationId: context.orgId,
    actorId: context.userId,
    requiredPermission: "dashboard.read",
    authority: {
      kind: "TENANT_WIDE",
      basis: "RBAC_ROLE",
      matchedRoleCode: "admin",
    },
    scope: { kind: "TENANT", locationIds: null },
  }
}

function locationAccessDecision(context: OperatingAccessContext) {
  return {
    allowed: true,
    organizationId: context.orgId,
    actorId: context.userId,
    requiredPermission: "dashboard.read",
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
      managedLocations: [
        { id: "location-1", name: "Branch One", code: "B1" },
      ],
    },
    scope: { kind: "LOCATIONS", locationIds: ["location-1"] },
  }
}
