import { revalidatePath } from "next/cache"

import createRole from "@/actions/roles/createRole"
import getOrgRoles from "@/actions/roles/getOrgRoles"
import { getRoleById } from "@/actions/roles/getRoleById"
import { updateRole } from "@/actions/roles/updateRole"
import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  createOrganizationRole,
  getOrganizationRoleById,
  listOrganizationRoles,
  updateOrganizationRole,
} from "@/services/roles/role.service"

jest.mock("@/lib/security/auth-session", () => {
  class MockFreshAuthRequiredError extends Error {
    constructor(message = "Fresh authentication required") {
      super(message)
      this.name = "FreshAuthRequiredError"
    }
  }

  return {
    FreshAuthRequiredError: MockFreshAuthRequiredError,
    requireFreshAuth: jest.fn(),
  }
})

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/roles/role.service", () => ({
  createOrganizationRole: jest.fn(),
  getOrganizationRoleById: jest.fn(),
  listOrganizationRoles: jest.fn(),
  updateOrganizationRole: jest.fn(),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockCreateOrganizationRole = createOrganizationRole as jest.Mock
const mockGetOrganizationRoleById = getOrganizationRoleById as jest.Mock
const mockListOrganizationRoles = listOrganizationRoles as jest.Mock
const mockUpdateOrganizationRole = updateOrganizationRole as jest.Mock

function rbacContext(permissions: string[]) {
  return {
    orgId: "org-1",
    userId: "user-1",
    permissions,
    isSuperUser: permissions.includes("*"),
  }
}

beforeEach(() => {
  mockRequireFreshAuth.mockReset()
  mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: Date.now() } })
  mockRequirePermission.mockReset()
  mockObserveModuleAccess.mockReset()
  mockObserveModuleAccess.mockResolvedValue({ allowed: true })
  mockCreateOrganizationRole.mockReset()
  mockGetOrganizationRoleById.mockReset()
  mockListOrganizationRoles.mockReset()
  mockUpdateOrganizationRole.mockReset()
  ;(revalidatePath as jest.Mock).mockReset()
})

describe("role actions service boundary", () => {
  it("does not call the role service when the user lacks roles.read", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))

    const result = await getRoleById("role-1")

    expect(result.success).toBe(false)
    expect(mockGetOrganizationRoleById).not.toHaveBeenCalled()
  })

  it("reads roles through the service and preserves the success envelope", async () => {
    const ctx = rbacContext(["roles.read"])
    const role = {
      id: "role-1",
      nameEn: "Manager",
      nameFr: null,
      name: "Manager",
      organizationId: "org-1",
      permissions: ["dashboard.read"],
    }
    mockRequirePermission.mockResolvedValue(ctx)
    mockGetOrganizationRoleById.mockResolvedValue(role)

    const result = await getRoleById("role-1")

    expect(result).toEqual({ success: true, data: role, error: null })
    expect(mockGetOrganizationRoleById).toHaveBeenCalledWith({ ctx, id: "role-1" })
  })

  it("does not create a role when the user lacks roles.create", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))

    const result = await createRole({
      name: "Cashier",
      description: "POS role",
      permissions: ["dashboard.read"],
      organizationId: "org-1",
    })

    expect(result.success).toBe(false)
    expect(mockRequireFreshAuth).toHaveBeenCalledTimes(1)
    expect(mockCreateOrganizationRole).not.toHaveBeenCalled()
  })

  it("requires fresh authentication before role writes", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await createRole({
      name: "Cashier",
      description: "POS role",
      permissions: ["dashboard.read"],
      organizationId: "org-1",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockCreateOrganizationRole).not.toHaveBeenCalled()
  })

  it("does not grant permissions the actor does not hold", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext(["roles.update", "roles.permissions.assign", "dashboard.read"]),
    )

    const result = await updateRole("role-1", {
      permissions: ["finance.read"],
    })

    expect(result.success).toBe(false)
    expect(mockUpdateOrganizationRole).not.toHaveBeenCalled()
  })

  it("creates and updates roles through the service and revalidates the roles page", async () => {
    const ctx = rbacContext([
      "roles.create",
      "roles.update",
      "roles.permissions.assign",
      "dashboard.read",
    ])
    const createdRole = {
      id: "role-1",
      nameEn: "Dashboard Viewer",
      nameFr: null,
      name: "Dashboard Viewer",
      organizationId: "org-1",
      permissions: ["dashboard.read"],
    }
    const roleInput = {
      name: "Dashboard Viewer",
      description: "Read dashboards",
      permissions: ["dashboard.read"],
      organizationId: "org-1",
    }
    mockRequirePermission.mockResolvedValue(ctx)
    mockCreateOrganizationRole.mockResolvedValue(createdRole)
    mockUpdateOrganizationRole.mockResolvedValue(createdRole)

    const created = await createRole(roleInput)
    const updated = await updateRole("role-1", roleInput)

    expect(created).toEqual({ success: true, data: createdRole, error: null })
    expect(updated).toEqual({ success: true, data: createdRole, error: null })
    expect(mockCreateOrganizationRole).toHaveBeenCalledWith({ ctx, data: roleInput })
    expect(mockUpdateOrganizationRole).toHaveBeenCalledWith({
      ctx,
      id: "role-1",
      data: roleInput,
    })
    expect(mockRequireFreshAuth).toHaveBeenCalledTimes(2)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      moduleSlug: "settings",
      surface: "actions/roles/createRole.ts",
      accessIntent: "write",
      mode: "observe",
    }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      moduleSlug: "settings",
      surface: "actions/roles/updateRole.ts",
      accessIntent: "write",
      mode: "observe",
    }))
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings/roles")
  })

  it("lists roles through the service with optional organization override", async () => {
    const ctx = rbacContext(["roles.read"])
    mockRequirePermission.mockResolvedValue(ctx)
    mockListOrganizationRoles.mockResolvedValue([])

    const result = await getOrgRoles("org-2")

    expect(result).toEqual({ success: true, data: [], error: null })
    expect(mockListOrganizationRoles).toHaveBeenCalledWith({
      ctx,
      organizationId: "org-2",
    })
  })
})
