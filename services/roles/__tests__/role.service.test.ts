jest.mock("server-only", () => ({}))

import { getAllPermissions } from "@/config/permissions"
import { createRoleName } from "@/lib/createRoleName"
import { logSecurityEvent } from "@/lib/security/audit-log"
import { db } from "@/prisma/db"
import { ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import {
  createOrganizationRole,
  resolveRoleOrganization,
  updateOrganizationRole,
} from "../role.service"

jest.mock("@/prisma/db", () => ({
  db: {
    organization: {
      findFirst: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

jest.mock("@/config/permissions", () => ({
  getAllPermissions: jest.fn(),
}))

jest.mock("@/lib/createRoleName", () => ({
  createRoleName: jest.fn(),
}))

jest.mock("@/lib/security/audit-log", () => ({
  SecurityEventType: {
    ROLE_CHANGED: "ROLE_CHANGED",
  },
  logSecurityEvent: jest.fn(),
}))

const mockDb = db as unknown as {
  organization: {
    findFirst: jest.Mock
  }
  role: {
    findFirst: jest.Mock
    findMany: jest.Mock
    create: jest.Mock
    updateMany: jest.Mock
  }
}
const mockGetAllPermissions = getAllPermissions as jest.Mock
const mockCreateRoleName = createRoleName as jest.Mock
const mockLogSecurityEvent = logSecurityEvent as jest.Mock

const ctx = {
  orgId: "org-1",
  userId: "user-1",
  isSuperUser: false,
}

beforeEach(() => {
  mockDb.organization.findFirst.mockReset()
  mockDb.role.findFirst.mockReset()
  mockDb.role.findMany.mockReset()
  mockDb.role.create.mockReset()
  mockDb.role.updateMany.mockReset()
  mockGetAllPermissions.mockReset()
  mockCreateRoleName.mockReset()
  mockLogSecurityEvent.mockReset()
  mockGetAllPermissions.mockReturnValue(["dashboard.read", "finance.read", "roles.read"])
  mockCreateRoleName.mockImplementation((name: string) => name.toLowerCase().replace(/\s+/g, "-"))
})

describe("role.service organization boundary", () => {
  it("keeps non-super users inside their active organization", async () => {
    await expect(resolveRoleOrganization(ctx, "org-2")).rejects.toBeInstanceOf(ForbiddenError)
    expect(mockDb.organization.findFirst).not.toHaveBeenCalled()
  })

  it("requires an active target organization for super-user overrides", async () => {
    mockDb.organization.findFirst.mockResolvedValue(null)

    await expect(
      resolveRoleOrganization({ ...ctx, isSuperUser: true }, "org-2"),
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(mockDb.organization.findFirst).toHaveBeenCalledWith({
      where: {
        id: "org-2",
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    })
  })
})

describe("role.service CRUD", () => {
  it("rejects invalid permission strings before writing", async () => {
    await expect(
      createOrganizationRole({
        ctx,
        data: {
          name: "Finance",
          description: "Finance role",
          permissions: ["unknown.permission"],
          organizationId: "org-1",
        },
      }),
    ).rejects.toMatchObject({ message: "Invalid permissions detected: unknown.permission" })

    expect(mockDb.role.create).not.toHaveBeenCalled()
  })

  it("rejects duplicate role names inside the organization", async () => {
    mockDb.role.findFirst.mockResolvedValue({ id: "existing-role" })

    await expect(
      createOrganizationRole({
        ctx,
        data: {
          name: "Cashier",
          description: "POS role",
          permissions: ["dashboard.read"],
          organizationId: "org-1",
        },
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(mockDb.role.create).not.toHaveBeenCalled()
  })

  it("creates a role inside the actor organization and records audit evidence", async () => {
    const role = {
      id: "role-1",
      code: "cashier",
      nameEn: "Cashier",
      nameFr: null,
      description: "POS role",
      permissions: ["dashboard.read"],
      organizationId: "org-1",
    }
    mockDb.role.findFirst.mockResolvedValue(null)
    mockDb.role.create.mockResolvedValue(role)

    const result = await createOrganizationRole({
      ctx,
      data: {
        name: "Cashier",
        description: "POS role",
        permissions: ["dashboard.read"],
        organizationId: "ignored-org",
      },
    })

    expect(result).toEqual({ ...role, name: "Cashier" })
    expect(mockDb.role.create).toHaveBeenCalledWith({
      data: {
        code: "cashier",
        nameEn: "Cashier",
        description: "POS role",
        permissions: ["dashboard.read"],
        organizationId: "org-1",
      },
    })
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ROLE_CHANGED",
        userId: "user-1",
        organizationId: "org-1",
        resource: "role-1",
      }),
    )
  })

  it("updates roles only inside the actor organization", async () => {
    const beforeRole = {
      id: "role-1",
      code: "cashier",
      nameEn: "Cashier",
      nameFr: null,
      permissions: ["dashboard.read"],
    }
    const afterRole = {
      ...beforeRole,
      code: "finance",
      nameEn: "Finance",
      permissions: ["finance.read"],
      organizationId: "org-1",
    }
    mockDb.role.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(beforeRole)
      .mockResolvedValueOnce(afterRole)
    mockDb.role.updateMany.mockResolvedValue({ count: 1 })

    const result = await updateOrganizationRole({
      ctx,
      id: "role-1",
      data: {
        name: "Finance",
        permissions: ["finance.read"],
      },
    })

    expect(result).toEqual({ ...afterRole, name: "Finance" })
    expect(mockDb.role.updateMany).toHaveBeenCalledWith({
      where: { id: "role-1", organizationId: "org-1" },
      data: {
        nameEn: "Finance",
        code: "finance",
        permissions: ["finance.read"],
      },
    })
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ROLE_CHANGED",
        details: expect.objectContaining({
          action: "role.update",
          before: expect.objectContaining({ code: "cashier" }),
          after: expect.objectContaining({ code: "finance" }),
        }),
      }),
    )
  })
})
