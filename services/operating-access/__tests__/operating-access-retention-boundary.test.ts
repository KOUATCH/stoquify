import { resolveOperatingAccessScope } from "../operating-access-scope.service"
import type { OperatingAccessContext } from "../operating-access-scope-contracts"

jest.mock("@/prisma/db", () => ({ db: {} }))

const context: OperatingAccessContext = {
  orgId: "org-a", userId: "manager-a", permissions: ["dashboard.read"], isSuperUser: false,
  roles: [{ id: "manager", name: "Manager", code: "manager", permissions: ["dashboard.read"] }],
}

describe("P04 operating location boundary", () => {
  const locations = [
    { id: "site-a", organizationId: "org-a", managerId: "manager-a", isActive: true, deletedAt: null },
    { id: "site-b", organizationId: "org-a", managerId: "manager-b", isActive: true, deletedAt: null },
    { id: "other-tenant", organizationId: "org-b", managerId: "manager-a", isActive: true, deletedAt: null },
    { id: "inactive", organizationId: "org-a", managerId: "manager-a", isActive: false, deletedAt: null },
    { id: "deleted", organizationId: "org-a", managerId: "manager-a", isActive: true, deletedAt: new Date() },
  ]
  function client() {
    return {
      location: { findMany: jest.fn(async ({ where }) => locations.filter(row =>
        Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value),
      ).map(row => ({ id: row.id, name: row.id, code: row.id }))) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "synthetic-audit" }) },
    }
  }

  it("excludes a second tenant, another manager's location and inactive/deleted sites", async () => {
    const db = client()
    await expect(resolveOperatingAccessScope(context, db as never)).resolves.toMatchObject({
      allowed: true, organizationId: "org-a", scope: { kind: "LOCATIONS", locationIds: ["site-a"] },
    })
    expect(db.location.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      organizationId: "org-a", managerId: "manager-a", isActive: true, deletedAt: null,
    } }))
  })

  it("denies a removed location assignment on the next resolution", async () => {
    const db = client()
    await expect(resolveOperatingAccessScope(context, db as never)).resolves.toMatchObject({ allowed: true })
    db.location.findMany.mockResolvedValueOnce([])
    await expect(resolveOperatingAccessScope(context, db as never)).resolves.toMatchObject({
      allowed: false, reason: "NO_MANAGED_LOCATIONS", scope: null,
    })
    expect(db.auditLog.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({
      organizationId: "org-a", userId: "manager-a", action: "OPERATING_ACCESS_SCOPE_DENIED",
    }) }))
  })
})
