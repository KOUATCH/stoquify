import { logSecurityEvent } from "@/lib/security/audit-log"
import { auth } from "@/lib/auth"
import { db } from "@/prisma/db"
import { assertCanUseOrganization, getOptionalRbacContext, requireRbacContext, type RbacContext } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"

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

describe("RBAC live session validation", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(logSecurityEvent as jest.Mock).mockResolvedValue(undefined)
  })

  it("rejects a revoked session even when a cookie cache could still identify the user", async () => {
    ;(auth.api.getSession as jest.Mock).mockImplementation(async (options) =>
      options.query?.disableCookieCache ? null : { user: { id: "user-1" } },
    )
    ;(db.user.findFirst as jest.Mock).mockResolvedValue({
      ...baseContext.user,
      isVerified: true,
      organization: { name: "Org A", isActive: true, deletedAt: null },
    })

    await expect(getOptionalRbacContext()).resolves.toBeNull()
    await expect(requireRbacContext()).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 })
    expect(db.user.findFirst).not.toHaveBeenCalled()
  })

  it("loads current permissions for a valid live session", async () => {
    ;(auth.api.getSession as jest.Mock).mockResolvedValue({ user: { id: "user-1", organizationId: "org-a" } })
    ;(db.user.findFirst as jest.Mock).mockResolvedValue({
      ...baseContext.user,
      isVerified: true,
      organization: { name: "Org A", isActive: true, deletedAt: null },
      roles: [{ id: "role-1", code: "reader", permissions: ["dashboard.read"] }],
    })

    await expect(requireRbacContext()).resolves.toMatchObject({
      userId: "user-1", orgId: "org-a", permissions: expect.arrayContaining(["dashboard.read"]),
    })
  })

  it("retains narrow stored grants when constructing server authority", async () => {
    ;(auth.api.getSession as jest.Mock).mockResolvedValue({ user: { id: "user-1", organizationId: "org-a" } })
    ;(db.user.findFirst as jest.Mock).mockResolvedValue({
      ...baseContext.user, isVerified: true,
      organization: { name: "Org A", isActive: true, deletedAt: null },
      roles: [{ id: "role-1", code: "reader", permissions: ["dashboard.read", "payments.reconciliation.read"] }],
    })
    const context = await requireRbacContext()
    expect(context.permissions).toEqual(["dashboard.read", "payments.reconciliation.read"])
    expect(hasRbacPermission(context.permissions, "accounting.close.read")).toBe(false)
    expect(hasRbacPermission(context.permissions, "fraud.cases.manage")).toBe(false)
  })

  it("denies access when the session authority cannot be reached", async () => {
    ;(auth.api.getSession as jest.Mock).mockRejectedValue(new Error("Session store unavailable"))

    await expect(getOptionalRbacContext()).resolves.toBeNull()
    await expect(requireRbacContext()).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 })
    expect(db.user.findFirst).not.toHaveBeenCalled()
  })
  it("does not resolve a different active account through a reassigned email", async () => {
    ;(auth.api.getSession as jest.Mock).mockResolvedValue({ user: { id: "inactive-original", email: "reassigned@example.invalid", organizationId: "org-a" } })
    ;(db.user.findFirst as jest.Mock).mockImplementation(async ({ where }) => where.OR ? {
      ...baseContext.user, id: "new-email-owner", email: "reassigned@example.invalid", isVerified: true,
      organization: { name: "Org A", isActive: true, deletedAt: null }, roles: [{ id: "privileged", code: "admin", permissions: ["*"] }],
    } : null)
    await expect(requireRbacContext()).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 })
    expect(db.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "inactive-original", isActive: true } }))
  })
  it("rejects an email-only session before looking up authority", async () => {
    ;(auth.api.getSession as jest.Mock).mockResolvedValue({ user: { email: "reassigned@example.invalid" } })
    ;(db.user.findFirst as jest.Mock).mockResolvedValue({ ...baseContext.user, isVerified: true, organization: { name: "Org A", isActive: true }, roles: [] })
    await expect(requireRbacContext()).rejects.toMatchObject({ code: "UNAUTHENTICATED" })
    expect(db.user.findFirst).not.toHaveBeenCalled()
  })
})

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
