import { getOrgLocations } from "@/actions/locations/getOrgLocations"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { getAuthenticatedUser } from "@/config/useAuth"
import { requirePermission } from "@/lib/security/rbac"
import { db } from "@/prisma/db"
import { listLocations } from "@/services/location/location.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { listUnits } from "@/services/unit/unit.service"

jest.mock("@/config/useAuth", () => ({
  getAuthenticatedUser: jest.fn(),
}))

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/location/location.service", () => ({
  listLocations: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/unit/unit.service", () => ({
  listUnits: jest.fn(),
}))

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockListLocations = listLocations as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockListUnits = listUnits as jest.Mock
const mockDb = db as unknown as {
  organization: {
    findFirst: jest.Mock
  }
}

function authedUser(permissions: string[] = []) {
  return {
    id: "user-1",
    email: "user@example.com",
    firstName: "Ada",
    lastName: "Admin",
    organizationId: "org-1",
    organizationName: "Org One",
    roles: [],
    permissions,
  }
}

function rbacContext(permissions: string[] = ["locations.read"]) {
  return {
    userId: "user-1",
    orgId: "org-1",
    permissions,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequirePermission.mockResolvedValue(rbacContext())
  mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
  ;(db as any).organization = {
    findFirst: jest.fn(),
  }
})

describe("tenant-scoped organization list actions", () => {
  it("uses the authenticated organization when no organization id is provided", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(authedUser())
    mockListLocations.mockResolvedValue([{ id: "loc-1" }])

    const result = await getOrgLocations()

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("locations.read", { resource: "Location" })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["locations.read"],
      moduleSlug: "settings",
      surfaceType: "action",
      surface: "actions/locations/getOrgLocations.ts",
      accessIntent: "read",
      mode: "observe",
    })
    expect(mockListLocations).toHaveBeenCalledWith("org-1")
  })

  it("fails closed before tenant resolution when locations.read is denied", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden: missing permission locations.read"))

    const result = await getOrgLocations()

    expect(result.success).toBe(false)
    expect(mockGetAuthenticatedUser).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListLocations).not.toHaveBeenCalled()
  })

  it("rejects cross-organization location reads for non-superusers", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(authedUser())

    const result = await getOrgLocations("org-2")

    expect(result.success).toBe(false)
    expect(mockRequirePermission).toHaveBeenCalledWith("locations.read", { resource: "Location" })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListLocations).not.toHaveBeenCalled()
  })

  it("uses the authenticated organization for unit reads and observes inventory", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["inventory.units.read"]))
    mockGetAuthenticatedUser.mockResolvedValue(authedUser())
    mockListUnits.mockResolvedValue([{ id: "unit-1" }])

    const result = await getOrgUnits()

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.units.read", { resource: "Unit" })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["inventory.units.read"],
      moduleSlug: "inventory",
      surfaceType: "action",
      surface: "actions/units/getOrgUnits.ts",
      accessIntent: "read",
      mode: "observe",
    })
    expect(mockListUnits).toHaveBeenCalledWith("org-1")
  })

  it("fails closed before tenant resolution when inventory.units.read is denied", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden: missing permission inventory.units.read"))

    const result = await getOrgUnits()

    expect(result.success).toBe(false)
    expect(mockGetAuthenticatedUser).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListUnits).not.toHaveBeenCalled()
  })

  it("rejects raw wildcard cross-organization unit reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["inventory.units.read"]))
    mockGetAuthenticatedUser.mockResolvedValue(authedUser(["*"]))
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-2" })
    mockListUnits.mockResolvedValue([{ id: "unit-1" }])

    const result = await getOrgUnits("org-2")

    expect(result.success).toBe(false)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.units.read", { resource: "Unit" })
    expect(mockDb.organization.findFirst).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListUnits).not.toHaveBeenCalled()
  })

  it("allows reviewed organization managers to read another active organization's units", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["inventory.units.read"]))
    mockGetAuthenticatedUser.mockResolvedValue(authedUser(["MANAGE_ORGANIZATION"]))
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-2" })
    mockListUnits.mockResolvedValue([{ id: "unit-1" }])

    const result = await getOrgUnits("org-2")

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.units.read", { resource: "Unit" })
    expect(mockDb.organization.findFirst).toHaveBeenCalledWith({
      where: {
        id: "org-2",
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-2",
      userId: "user-1",
      actorPermissions: ["inventory.units.read"],
      moduleSlug: "inventory",
      surfaceType: "action",
      surface: "actions/units/getOrgUnits.ts",
      accessIntent: "read",
      mode: "observe",
    })
    expect(mockListUnits).toHaveBeenCalledWith("org-2")
  })

  it("rejects reviewed organization manager overrides for inactive or missing organizations", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["inventory.units.read"]))
    mockGetAuthenticatedUser.mockResolvedValue(authedUser(["MANAGE_ORGANIZATION"]))
    mockDb.organization.findFirst.mockResolvedValue(null)

    const result = await getOrgUnits("org-2")

    expect(result.success).toBe(false)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.units.read", { resource: "Unit" })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListUnits).not.toHaveBeenCalled()
  })
})
