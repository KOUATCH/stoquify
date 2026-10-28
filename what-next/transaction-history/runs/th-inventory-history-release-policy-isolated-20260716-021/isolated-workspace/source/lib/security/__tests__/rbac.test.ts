import { logSecurityEvent } from "@/lib/security/audit-log"
import { assertCanUseOrganization, type RbacContext } from "@/lib/security/rbac"

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}))

jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}))

jest.mock("@/prisma/db", () => ({
  db: {
    user: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("@/lib/security/audit-log", () => ({
  SecurityEventType: {
    PERMISSION_GRANTED: "PERMISSION_GRANTED",
    PERMISSION_DENIED: "PERMISSION_DENIED",
  },
  logSecurityEvent: jest.fn().mockResolvedValue(undefined),
}))

const baseContext = {
  user: {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    phone: "",
    roles: [],
    permissions: ["*"],
    organizationId: "org-a",
    organizationName: "Org A",
  },
  userId: "user-1",
  orgId: "org-a",
  organizationName: "Org A",
  roles: [],
  permissions: ["*"],
  isSuperUser: true,
  source: "better-auth",
  fetchedAt: 1,
} satisfies RbacContext

describe("rbac tenant isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("allows access to the active organization without auditing a denial", async () => {
    await expect(assertCanUseOrganization(baseContext, "org-a")).resolves.toBe(true)
    expect(logSecurityEvent).not.toHaveBeenCalled()
  })

  it("denies cross-organization access even for wildcard users", async () => {
    await expect(assertCanUseOrganization(baseContext, "org-b")).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    })

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        resource: "org-b",
        type: "PERMISSION_DENIED",
      }),
    )
  })
})
