import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getOptionalRbacContext } from "@/lib/security/rbac"

import {
  requireAnyAppPermission,
  requireApiModuleAccess,
  requireApiSessionForCurrentOrg,
} from "../server-authz"

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  getOptionalRbacContext: jest.fn(),
  hasRbacPermission: jest.fn((permissions: string[], permission: string) => permissions.includes(permission)),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetOptionalRbacContext = getOptionalRbacContext as jest.Mock

describe("server authz module access helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns a safe unauthorized result when the current-org API session is missing", async () => {
    mockGetOptionalRbacContext.mockResolvedValue(null)

    const result = await requireApiSessionForCurrentOrg()

    expect(result).toEqual({
      error: "Unauthorized",
      status: 401,
      session: null,
      organizationId: null,
    })
  })

  it("returns the server-resolved organization for current-org API routes", async () => {
    const user = { id: "user-1", permissions: ["MANAGE_SYSTEM_SETTINGS"], roles: [] }
    mockGetOptionalRbacContext.mockResolvedValue({
      user,
      userId: "user-1",
      orgId: "org-1",
    })

    const result = await requireApiSessionForCurrentOrg()

    expect(result).toEqual({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })
  })

  it("enforces API module access with actor permissions and audit metadata", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, reason: "available" })

    const user = {
      id: "user-1",
      permissions: ["inventory.items.read"],
      roles: [{ code: "inventory-manager", permissions: ["inventory.read"] }],
    }

    const result = await requireApiModuleAccess({
      organizationId: "org-1",
      user,
      moduleSlug: "inventory",
      surface: "GET /api/v1/organisations/[id]/items",
    })

    expect(result).toEqual(expect.objectContaining({ allowed: true, error: null, status: 200 }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["inventory.items.read", "inventory.read"],
      moduleSlug: "inventory",
      surfaceType: "api",
      surface: "GET /api/v1/organisations/[id]/items",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    })
  })

  it("returns a safe forbidden result when module entitlement denies API access", async () => {
    const decision = { allowed: false, reason: "Tenant module entitlement is suspended." }
    mockObserveModuleAccess.mockResolvedValue(decision)

    const result = await requireApiModuleAccess({
      organizationId: "org-1",
      user: { id: "user-1", permissions: ["inventory.items.read"], roles: [] },
      moduleSlug: "inventory",
      surface: "GET /api/v1/organisations/[id]/items",
      audit: false,
    })

    expect(result).toEqual({
      allowed: false,
      error: "Forbidden",
      status: 403,
      decision,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      audit: false,
      mode: "enforce",
      moduleSlug: "inventory",
    }))
  })
  it("accepts any one of the approved API write permissions", () => {
    const user = {
      id: "user-1",
      permissions: ["inventory.items.update"],
      roles: [],
    }

    expect(() => requireAnyAppPermission(user, [
      "inventory.items.create",
      "inventory.items.update",
    ])).not.toThrow()
  })

  it("fails closed when none of the approved API write permissions are present", () => {
    const user = {
      id: "user-1",
      permissions: ["dashboard.read", "inventory.items.read"],
      roles: [],
    }

    expect(() => requireAnyAppPermission(user, [
      "inventory.items.create",
      "inventory.items.update",
    ])).toThrow("Forbidden")
  })
})
