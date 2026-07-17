jest.mock("server-only", () => ({}))

import { adminPermissions } from "@/config/permissions"
import { db } from "@/prisma/db"
import { evaluateRoleGrantPolicy } from "@/services/security/role-grant-policy.service"

import { createOrganizationForSettings } from "../organization-settings.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    organization: {
      findUnique: jest.fn(),
    },
  },
}))

const mockDb = db as unknown as {
  $transaction: jest.Mock
  organization: {
    findUnique: jest.Mock
  }
}

describe("organization settings administrator provisioning", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.organization.findUnique.mockResolvedValue(null)
  })

  it("creates an allowlisted administrator template that can grant canonical roles", async () => {
    const now = new Date()
    const tx = {
      organization: {
        create: jest.fn().mockResolvedValue({
          id: "org-1",
          name: "Demo Org",
          slug: "demo-org",
          industry: null,
          country: null,
          state: null,
          address: null,
          currency: "XAF",
          timezone: "Africa/Douala",
          defaultLocale: "EN",
          inventoryStartDate: null,
          fiscalYearStart: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      },
      role: {
        create: jest.fn().mockResolvedValue({ id: "role-1" }),
      },
    }
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))

    await createOrganizationForSettings({ name: "Demo Org" })

    expect(tx.role.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "administrator",
        permissions: ["*", ...adminPermissions],
        organizationId: "org-1",
      }),
    })

    const createdPermissions = tx.role.create.mock.calls[0][0].data.permissions
    expect(createdPermissions).toEqual(
      expect.arrayContaining(["users.invite", "users.roles.assign"]),
    )
    expect(
      evaluateRoleGrantPolicy({
        actorOrganizationId: "org-1",
        actorPermissions: createdPermissions,
        targetRole: {
          organizationId: "org-1",
          permissions: ["dashboard.read", "users.invite", "users.roles.assign"],
        },
      }),
    ).toMatchObject({
      allowed: true,
      reasonCode: "ROLE_GRANT_ALLOWED",
    })
  })
})
