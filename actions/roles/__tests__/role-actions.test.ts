import { revalidatePath } from "next/cache"

import createRole from "@/actions/roles/createRole"
import { getRoleById } from "@/actions/roles/getRoleById"
import { updateRole } from "@/actions/roles/updateRole"
import { requirePermission } from "@/lib/security/rbac"
import { db } from "@/prisma/db"

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/lib/security/audit-log", () => ({
  SecurityEventType: {
    ROLE_CHANGED: "ROLE_CHANGED",
  },
  logSecurityEvent: jest.fn(),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockDb = db as unknown as {
  role: {
    findFirst: jest.Mock
    findMany: jest.Mock
    create: jest.Mock
    updateMany: jest.Mock
  }
  organization: {
    findFirst: jest.Mock
  }
}

function rbacContext(permissions: string[]) {
  return {
    orgId: "org-1",
    userId: "user-1",
    permissions,
    isSuperUser: permissions.includes("*"),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(db as any).role = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  }
  ;(db as any).organization = {
    findFirst: jest.fn(),
  }
})

describe("role actions authorization", () => {
  it("does not read a role when the user lacks roles.read", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))

    const result = await getRoleById("role-1")

    expect(result.success).toBe(false)
    expect(mockDb.role.findFirst).not.toHaveBeenCalled()
  })

  it("reads roles only inside the authenticated organization", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["roles.read"]))
    mockDb.role.findFirst.mockResolvedValue({
      id: "role-1",
      nameEn: "Manager",
      nameFr: null,
      organizationId: "org-1",
      permissions: ["dashboard.read"],
    })

    const result = await getRoleById("role-1")

    expect(result.success).toBe(true)
    expect(mockDb.role.findFirst).toHaveBeenCalledWith({
      where: { id: "role-1", organizationId: "org-1" },
    })
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
    expect(mockDb.role.create).not.toHaveBeenCalled()
  })

  it("does not grant permissions the actor does not hold", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext(["roles.update", "roles.permissions.assign", "dashboard.read"]),
    )

    const result = await updateRole("role-1", {
      permissions: ["finance.read"],
    })

    expect(result.success).toBe(false)
    expect(mockDb.role.updateMany).not.toHaveBeenCalled()
  })

  it("updates roles only inside the authenticated organization", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext(["roles.update", "roles.permissions.assign", "dashboard.read"]),
    )
    mockDb.role.updateMany.mockResolvedValue({ count: 1 })
    mockDb.role.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "role-1",
        code: "dashboard-viewer",
        nameEn: "Dashboard Viewer",
        nameFr: null,
        organizationId: "org-1",
        permissions: ["dashboard.read"],
      })
      .mockResolvedValueOnce({
        id: "role-1",
        nameEn: "Dashboard Viewer",
        nameFr: null,
        organizationId: "org-1",
        permissions: ["dashboard.read"],
      })

    const result = await updateRole("role-1", {
      name: "Dashboard Viewer",
      permissions: ["dashboard.read"],
    })

    expect(result.success).toBe(true)
    expect(mockDb.role.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "role-1", organizationId: "org-1" },
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings/roles")
  })
})
