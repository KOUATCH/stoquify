jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), auditLog: { findMany: jest.fn() }, user: { findFirst: jest.fn() }, role: { findFirst: jest.fn(), findMany: jest.fn() } } }))

import { db } from "@/prisma/db"
import { getAllPermissions } from "@/config/permissions"
import { createOrganizationRole, updateOrganizationRole, listOrganizationRoles, resolveRoleOrganization } from "../role.service"
import { getRoleEditorForOrganization } from "../role-editor.service"

const database = db as unknown as { $transaction: jest.Mock; auditLog: { findMany: jest.Mock }; user: { findFirst: jest.Mock }; role: { findFirst: jest.Mock; findMany: jest.Mock } }
const revision = new Date("2026-09-06T09:00:00.000Z")
const ctx = { orgId: "org-1", userId: "actor", isSuperUser: false, session: { id: "session", token: "test-private-session" } }
const command = { requestId: "09ba28c2-5a3a-48ae-b8c5-46e7abff3991", expectedUpdatedAt: revision.toISOString() }
const input = { name: "Cashier", nameFr: "Caissier", description: "Sales counter", organizationId: "org-1", permissions: ["dashboard.read"] }
let roles: any[], members: any[], users: any[], session: any, organization: any, receipt: any
let tx: any
function role(id: string, permissions: string[]) { return { id, code: id, nameEn: id, nameFr: null, description: "Existing", organizationId: "org-1", permissions, createdAt: revision, updatedAt: revision } }
const create = (data = input, current = ctx) => createOrganizationRole({ ctx: current, data, command })
const update = (data: any, id = "target", current = ctx, cmd = command) => updateOrganizationRole({ ctx: current, id, data, command: cmd })
beforeEach(() => {
  jest.clearAllMocks()
  roles = [role("admin", [...getAllPermissions()]), role("target", ["dashboard.read"])]
  members = [{ roleId: "admin", userId: "actor" }]
  users = [{ id: "actor", isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null }]
  session = { id: "session", expiresAt: new Date(Date.now() + 600000), assuranceVerifiedAt: new Date(), assuranceOrganizationId: "org-1", assuranceMethod: "password", assuranceLevel: 1, assuranceLockedUntil: null }
  organization = { id: "org-1" }; receipt = null
  tx = {
    $queryRaw: jest.fn(async (strings: TemplateStringsArray) => {
      const query = strings.join("?")
      if (query.includes("FROM organizations")) return [{ id: "org-1" }]
      if (query.includes("FROM users")) return users
      if (query.includes("FROM roles")) return roles
      if (query.includes('FROM "_UserRoles"')) return members
      if (query.includes("FROM sessions")) return session ? [session] : []
      throw new Error("Unexpected query")
    }),
    organization: { findFirst: jest.fn(async () => organization) },
    auditLog: { findFirst: jest.fn(async () => receipt), create: jest.fn(async ({ data }: any) => { receipt = data; return data }) },
    role: {
      create: jest.fn(async ({ data }: any) => { const result = { ...data, createdAt: new Date() }; roles.push(result); return result }),
      update: jest.fn(async ({ where, data }: any) => { const index = roles.findIndex(role => role.id === where.id); roles[index] = { ...roles[index], ...data }; return roles[index] }),
    },
  }
  database.$transaction.mockImplementation((run: any) => run(tx))
})

describe("role organization boundaries", () => {
  it.each([false, true])("rejects a foreign organization even for wildcard context %s", async isSuperUser => {
    await expect(resolveRoleOrganization({ ...ctx, isSuperUser }, "org-2")).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(database.role.findMany).not.toHaveBeenCalled()
  })
  it("lists only the active tenant", async () => {
    database.role.findMany.mockResolvedValue([roles[1]])
    await expect(listOrganizationRoles({ ctx, organizationId: " org-1 " })).resolves.toMatchObject([{ id: "target", name: "target" }])
    expect(database.role.findMany).toHaveBeenCalledWith({ where: { organizationId: "org-1" }, orderBy: { createdAt: "desc" } })
  })
  it("rejects a supplied foreign organization before any transaction", async () => {
    await expect(create({ ...input, organizationId: "org-2" })).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(database.$transaction).not.toHaveBeenCalled()
  })
  it("cannot edit a foreign or missing role", async () => {
    await expect(update({ description: "Changed" }, "foreign-role")).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(tx.role.update).not.toHaveBeenCalled()
  })
})

describe("authoritative role commands", () => {
  it.each([{ name: "" }, { name: " ".repeat(4) }, { description: "a".repeat(1001) }, { unexpected: true }])("rejects malformed input %j", async invalid => {
    await expect(create({ ...input, ...invalid })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    expect(database.$transaction).not.toHaveBeenCalled()
  })
  it("requires a durable request and reviewed version", async () => {
    await expect(createOrganizationRole({ ctx, data: input })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(update({ name: "Other" }, "target", ctx, { ...command, expectedUpdatedAt: undefined } as any)).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  })
  it("rejects unsupported new permissions", async () => {
    await expect(create({ ...input, permissions: ["made.up"] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    expect(tx.role.create).not.toHaveBeenCalled()
  })
  it("rejects duplicate role names case-insensitively", async () => {
    await expect(create({ ...input, name: " TARGET " })).rejects.toMatchObject({ code: "DUPLICATE_KEY_CONFLICT" })
    expect(tx.role.create).not.toHaveBeenCalled()
  })
  it("creates a bilingual role with a mandatory private-free audit", async () => {
    const result = await create({ ...input, name: " Cashier " })
    expect(result).toMatchObject({ name: "Cashier", nameFr: "Caissier", organizationId: "org-1" })
    expect(receipt).toMatchObject({ entityId: result.id, userId: "actor", action: "ROLE_CHANGED", changes: { operation: "role.create", before: null, delta: { added: ["dashboard.read"], removed: [] } } })
    expect(JSON.stringify(receipt)).not.toContain(ctx.session.token)
  })
  it("renames without changing the canonical code and allows clearing descriptions", async () => {
    const result = await update({ name: "Finance Viewer", nameFr: "Lecture financière", description: "" })
    expect(result).toMatchObject({ code: "target", nameEn: "Finance Viewer", description: null })
    expect(result.updatedAt.getTime()).toBeGreaterThan(revision.getTime())
    expect(receipt.changes.before.nameEn).toBe("target")
  })
  it("retains unsupported historical permissions on metadata-only edits", async () => {
    roles[1].permissions.push("old.unmapped")
    await expect(update({ name: "Historical" })).resolves.toMatchObject({ permissions: ["dashboard.read", "old.unmapped"] })
  })
  it("requires removal authority for explicit empty permissions", async () => {
    roles[0].permissions = ["roles.update", "roles.permissions.assign", "dashboard.read"]
    await expect(update({ permissions: [] })).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(tx.role.update).not.toHaveBeenCalled()
  })
  it("allows removal with its distinct permission without requiring grant authority", async () => {
    roles[0].permissions = ["roles.update", "roles.permissions.remove"]
    await expect(update({ permissions: [] })).resolves.toMatchObject({ permissions: [] })
    expect(receipt.changes.delta).toEqual({ added: [], removed: ["dashboard.read"] })
  })
  it("cannot grant removal authority through the shared assignment alias", async () => {
    roles[0].permissions = ["roles.update", "roles.permissions.assign", "dashboard.read"]
    await expect(update({ permissions: ["dashboard.read", "roles.permissions.remove"] })).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(tx.role.update).not.toHaveBeenCalled()
  })
  it.each(["users.roles.assign", "admin.role.assign"])("does not infer role-permission removal from %s", permission => {
    roles[0].permissions = ["roles.update", permission]
    return expect(update({ permissions: [] })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
  it("preserves explicitly stored historical assignment/removal authority", async () => {
    roles[0].permissions = ["roles.update", "ASSIGN_ROLES"]
    await expect(update({ permissions: [] })).resolves.toMatchObject({ permissions: [] })
  })
  it("does not mistake unchanged permissions for a grant on metadata edits", async () => {
    roles[0].permissions = ["roles.update"]
    await expect(update({ description: "Clarified", permissions: ["dashboard.read"] })).resolves.toMatchObject({ description: "Clarified" })
  })
  it("rejects critical grants via a wildcard", async () => {
    roles[0].permissions = ["*", "roles.update", "roles.permissions.assign"]
    await expect(update({ permissions: ["dashboard.read", "accounting.journal.post"] })).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(tx.role.update).not.toHaveBeenCalled()
  })
  it("rejects stale edits before a write", async () => {
    roles[1].updatedAt = new Date(revision.getTime() + 1)
    await expect(update({ description: "Stale" })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(tx.role.update).not.toHaveBeenCalled()
  })
  it("replays the same create without another write or audit", async () => {
    const first = await create(), second = await create()
    expect(second.id).toBe(first.id)
    expect(tx.role.create).toHaveBeenCalledTimes(1)
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1)
  })
  it("replays the same update and rejects changed reuse", async () => {
    const first = await update({ description: "Reviewed" })
    const second = await update({ description: "Reviewed" })
    expect(second.updatedAt).toEqual(first.updatedAt)
    await expect(update({ description: "Different" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
    expect(tx.role.update).toHaveBeenCalledTimes(1)
  })
  it("rejects a replay when the saved role has changed again", async () => {
    await update({ description: "Reviewed" })
    roles[1].updatedAt = new Date(roles[1].updatedAt.getTime() + 1)
    await expect(update({ description: "Reviewed" })).rejects.toMatchObject({ code: "CONFLICT" })
  })
  it("does not report success if the mandatory audit fails", async () => {
    tx.auditLog.create.mockRejectedValue(new Error("audit unavailable"))
    await expect(create()).rejects.toThrow("audit unavailable")
  })
  it.each(["actor", "permission", "session", "organization"])("rechecks current %s at commit", async kind => {
    if (kind === "actor") users[0].isActive = false
    if (kind === "permission") roles[0].permissions = []
    if (kind === "session") session.assuranceVerifiedAt = new Date(0)
    if (kind === "organization") organization = null
    await expect(create()).rejects.toMatchObject({ code: kind === "session" ? "FRESH_AUTH_REQUIRED" : kind === "organization" ? "NOT_FOUND" : "FORBIDDEN" })
    expect(tx.role.create).not.toHaveBeenCalled()
  })
  it("does not remove the final active role custodian", async () => {
    await expect(update({ permissions: roles[0].permissions.filter((permission: string) => permission !== "roles.update") }, "admin")).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
    expect(tx.role.update).not.toHaveBeenCalled()
  })
  it("preserves the last custodian's explicit user-role assignment authority", async () => {
    await expect(update({ permissions: roles[0].permissions.filter((permission: string) => permission !== "users.roles.assign") }, "admin")).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
    expect(tx.role.update).not.toHaveBeenCalled()
  })
  it("does not count another permission editor without user-role assignment as a custodian", async () => {
    roles.push(role("permission-editor", getAllPermissions().filter(permission => permission !== "users.roles.assign")))
    users.push({ ...users[0], id: "other" }); members.push({ roleId: "permission-editor", userId: "other" })
    await expect(update({ permissions: roles[0].permissions.filter((permission: string) => permission !== "roles.update") }, "admin")).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
    expect(tx.role.update).not.toHaveBeenCalled()
  })
  it("allows a custodian change when another active qualified member remains", async () => {
    roles.push(role("other-admin", [...getAllPermissions()])); users.push({ ...users[0], id: "other" }); members.push({ roleId: "other-admin", userId: "other" })
    await expect(update({ permissions: roles[0].permissions.filter((permission: string) => permission !== "roles.update") }, "admin")).resolves.toBeDefined()
  })
})

describe("editor read model", () => {
  it("scopes the requested role and exposes exact grant and removal capabilities", async () => {
    database.role.findFirst.mockResolvedValue(roles[1])
    database.user.findFirst.mockResolvedValue({ roles: [{ permissions: ["roles.update", "roles.permissions.assign", "dashboard.read"] }] })
    const result = await getRoleEditorForOrganization({ ...ctx, permissions: ["roles.update", "roles.permissions.assign", "dashboard.read"] }, "target")
    expect(database.role.findFirst).toHaveBeenCalledWith({ where: { id: "target", organizationId: "org-1" } })
    expect(result.canRemove).toBe(false)
    expect(result.canReadHistory).toBe(false)
    expect(database.auditLog.findMany).not.toHaveBeenCalled()
    expect(result.catalogue.flatMap(group => group.permissions).find(item => item.permission === "dashboard.read")?.canAdd).toBe(true)
    expect(result.catalogue.flatMap(group => group.permissions).find(item => item.permission === "accounting.journal.post")?.canAdd).toBe(false)
  })
  it("denies an editor read without the route operation permission", async () => {
    await expect(getRoleEditorForOrganization({ ...ctx, permissions: ["roles.read"] }, "target")).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(database.role.findFirst).not.toHaveBeenCalled()
  })
  it("returns bounded scoped history only with current audit-read authority", async () => {
    database.role.findFirst.mockResolvedValue(roles[1])
    database.user.findFirst.mockResolvedValue({ roles: [{ permissions: ["roles.update", "controls.audit.read"] }] })
    database.auditLog.findMany.mockResolvedValue([{ id: "event", createdAt: revision, changes: { operation: "role.create", fingerprint: "private-internal", delta: { added: ["dashboard.read"], removed: [] } } }, { id: "old-event", createdAt: revision, changes: null }])
    const result = await getRoleEditorForOrganization({ ...ctx, permissions: ["roles.update", "controls.audit.read"] }, "target")
    expect(database.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", entityType: "Role", entityId: "target", action: "ROLE_CHANGED" }, take: 10 }))
    expect(result.history[0]).toEqual({ id: "event", createdAt: revision.toISOString(), operation: "create", added: ["dashboard.read"], removed: [] })
    expect(result.history[1]).toMatchObject({ operation: "change", added: null, removed: null })
    expect(JSON.stringify(result)).not.toContain("private-internal")
  })
  it("does not turn a failed history query into successful zero rows", async () => {
    database.role.findFirst.mockResolvedValue(roles[1])
    database.user.findFirst.mockResolvedValue({ roles: [{ permissions: ["roles.update", "controls.audit.read"] }] })
    database.auditLog.findMany.mockRejectedValue(new Error("History unavailable"))
    await expect(getRoleEditorForOrganization({ ...ctx, permissions: ["roles.update"] }, "target")).rejects.toThrow("History unavailable")
  })
})
