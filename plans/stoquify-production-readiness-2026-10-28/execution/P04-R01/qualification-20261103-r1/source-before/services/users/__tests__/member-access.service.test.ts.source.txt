jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
import { db } from "@/prisma/db"
import { getAllPermissions } from "@/config/permissions"
import { changeMemberAccess } from "../member-access.service"
import { getMemberAccess } from "../member-access-read.service"
import { canGrantMemberRole, hasMemberControl, memberAccessRevision } from "../member-access-policy"

const date = new Date("2026-09-06T09:00:00.000Z")
let users: any[], roles: any[], memberships: any[], tx: any, session: any, recorded: any, deactivation: any, command: any
const actor = { organizationId: "org", actorId: "actor", targetUserId: "member", session: { id: "session", token: "private-unit-fixture" } }
const account = (id: string) => ({ id, email: id + "@example.invalid", firstName: null, lastName: null, updatedAt: date, isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null })
const revision = () => memberAccessRevision(users[1], memberships.filter(row => row.userId === "member").map(row => row.roleId), roles)
const run = (changes = {}) => changeMemberAccess({ ...actor, command, ...changes })
const noEffects = () => { expect(tx.user.update).not.toHaveBeenCalled(); expect(tx.session.deleteMany).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled() }
beforeEach(() => {
  jest.clearAllMocks(); recorded = null; deactivation = null
  users = [account("actor"), account("member")]
  roles = [{ id: "admin", permissions: getAllPermissions(), updatedAt: date }, { id: "reader", permissions: ["users.read"], updatedAt: date }, { id: "stock", permissions: ["inventory.items.read"], updatedAt: date }]
  memberships = [{ userId: "actor", roleId: "admin" }, { userId: "member", roleId: "reader" }]
  session = { expiresAt: new Date(Date.now() + 600000), assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: "org", assuranceLevel: 1 }
  command = { requestId: "09ba28c2-5a3a-48ae-b8c5-46e7abff3991", expectedRevision: revision(), roleIds: ["reader", "stock"], reason: "Changed responsibilities", operation: "roles" }
  tx = {
    $queryRaw: jest.fn(async (strings: TemplateStringsArray) => { const sql = strings.join("?"); if (sql.includes('FROM "_UserRoles"')) return memberships; if (sql.includes("FROM users")) return users; if (sql.includes("FROM roles")) return roles; if (sql.includes("FROM sessions")) return session ? [session] : []; return [] }),
    organization: { findFirst: jest.fn(async () => ({ id: "org" })) },
    role: { findMany: jest.fn(async () => roles) },
    user: {
      findFirst: jest.fn(async ({ where }: any) => { const user = users.find(row => row.id === where.id); return user ? { ...user, roles: where.id === "actor" ? [{ permissions: roles[0].permissions }] : memberships.filter(row => row.userId === user.id).map(row => ({ id: row.roleId })) } : null }),
      update: jest.fn(async ({ where, data }: any) => { const index = users.findIndex(user => user.id === where.id); const { roles: links, ...fields } = data; users[index] = { ...users[index], ...fields }; memberships = [...memberships.filter(row => row.userId !== where.id), ...links.set.map((role: any) => ({ userId: where.id, roleId: role.id }))]; return users[index] }),
    },
    session: { deleteMany: jest.fn(async () => ({ count: 2 })) },
    auditLog: { findFirst: jest.fn(async ({ where }: any) => where.action === "DEACTIVATE_USER" ? deactivation : recorded), findMany: jest.fn(async () => []), create: jest.fn(async ({ data }: any) => { recorded = data; return data }) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx))
})

it("records an assignment, revokes sessions and replays exactly once", async () => { const first = await run(); expect(first.sessionsRevoked).toBe(2); expect(await run()).toEqual({ ...first, replayed: true }); expect(tx.user.update).toHaveBeenCalledTimes(1); expect(recorded.changes.afterRoleIds).toEqual(["reader", "stock"]) })
it("binds read and locked-write projections regardless of object key order", async () => { const model = await getMemberAccess(actor); command.expectedRevision = model.revision; await expect(run()).resolves.toMatchObject({ id: "member" }); expect(memberAccessRevision({ ...users[1] }, ["stock", "reader"], [...roles].reverse())).toBe(revision()) })
it.each(["missing", "expired", "old", "future", "method", "organization", "locked"])("rejects invalid current session %s", async kind => { if (kind === "missing") session = null; if (kind === "expired") session.expiresAt = date; if (kind === "old") session.assuranceVerifiedAt = date; if (kind === "future") session.assuranceVerifiedAt = new Date(Date.now() + 60000); if (kind === "method") session.assuranceMethod = "mfa"; if (kind === "organization") session.assuranceOrganizationId = "other"; if (kind === "locked") session.assuranceLockedUntil = new Date(Date.now() + 60000); await expect(run()).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" }); noEffects() })
it("denies self changes before the transaction", async () => { await expect(run({ targetUserId: "actor" })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" }); expect(db.$transaction).not.toHaveBeenCalled() })
it.each(["member", "role", "membership"])("rejects stale %s evidence", async kind => { if (kind === "member") users[1].firstName = "Changed"; if (kind === "role") roles[2].permissions = ["customers.read"]; if (kind === "membership") memberships.push({ userId: "member", roleId: "stock" }); await expect(run()).rejects.toMatchObject({ code: "CONFLICT" }); noEffects() })
it("rejects foreign role IDs without effects", async () => { command.roleIds.push("other-tenant-role"); await expect(run()).rejects.toMatchObject({ code: "NOT_FOUND" }); noEffects() })
it("retains inconsistent historical assignments for investigation", async () => { memberships.push({ userId: "member", roleId: "foreign" }); command.expectedRevision = revision(); await expect(run()).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" }); noEffects() })
it("requires distinct removal authority even when assignment is held", async () => { roles[0].permissions = ["users.read", "users.roles.assign", "items.read"]; command = { ...command, roleIds: [], expectedRevision: revision() }; await expect(run()).rejects.toMatchObject({ code: "FORBIDDEN" }); noEffects() })
it("permits removal without assignment when no role is added", async () => { roles[0].permissions = ["users.read", "users.roles.remove"]; command = { ...command, roleIds: [], expectedRevision: revision() }; await expect(run()).resolves.toMatchObject({ id: "member" }) })
it.each(["*", "roles.permissions.assign", "users.roles.remove"])("does not infer assignment authority from %s", async permission => { roles[0].permissions = ["users.read", "items.read", permission]; command.expectedRevision = revision(); await expect(run()).rejects.toMatchObject({ code: "FORBIDDEN" }); noEffects() })
it("does not grant a role containing wildcard", async () => { roles[2].permissions = ["*"]; command.expectedRevision = revision(); await expect(run()).rejects.toMatchObject({ code: "FORBIDDEN" }); noEffects() })
it("rechecks authority before returning an idempotent receipt", async () => { await run(); roles[0].permissions = ["users.read"]; await expect(run()).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(tx.auditLog.create).toHaveBeenCalledTimes(1) })
it("rejects reuse of a request for another selection", async () => { await run(); command.reason = "Different purpose"; await expect(run()).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" }) })
it("retains the last usable administrator", async () => { roles[0].permissions = ["users.read", "users.roles.remove"]; roles[1].permissions = getAllPermissions(); command = { ...command, roleIds: [], expectedRevision: revision() }; await expect(run()).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" }); noEffects() })
function inactive() { users[1].isActive = false; users[1].isLocked = true; deactivation = { entityId: "member", changes: { after: { isActive: false, isLocked: true }, receipt: { id: "member", updatedAt: date.toISOString() } } }; command = { ...command, operation: "reactivate", expectedRevision: revision() } }
it("reactivates through matching evidence without changing identity or verification", async () => { inactive(); await expect(run()).resolves.toMatchObject({ operation: "reactivate" }); expect(tx.user.update.mock.calls[0][0].data).toMatchObject({ isActive: true, isLocked: false, verificationToken: null }); expect(tx.user.update.mock.calls[0][0].data).not.toHaveProperty("emailVerified"); expect(tx.user.update.mock.calls[0][0].data).not.toHaveProperty("password") })
it.each(["missing", "outdated", "unverified", "temporary-lock", "active", "authority", "ceiling"])("rejects unsupported reactivation %s", async kind => { inactive(); if (kind === "missing") deactivation = null; if (kind === "outdated") deactivation.changes.receipt.updatedAt = "2000-01-01T00:00:00.000Z"; if (kind === "unverified") { users[1].emailVerified = false; users[1].isVerified = false }; if (kind === "temporary-lock") users[1].lockedUntil = new Date(); if (kind === "active") users[1].isActive = true; if (kind === "authority") roles[0].permissions = roles[0].permissions.filter((value: string) => value !== "users.activate"); if (kind === "ceiling") roles[0].permissions = roles[0].permissions.filter((value: string) => value !== "users.read").concat("READ_USERS"); if (kind === "ceiling") roles[1].permissions = ["roles.permissions.remove"]; if (kind === "ceiling") roles[0].permissions = roles[0].permissions.filter((value: string) => value !== "roles.permissions.remove"); command.expectedRevision = revision(); await expect(run()).rejects.toMatchObject({ code: ["authority", "ceiling"].includes(kind) ? "FORBIDDEN" : "BUSINESS_RULE_VIOLATION" }); noEffects() })
it("does not mask a failed history read as an empty history", async () => { tx.auditLog.findFirst.mockResolvedValue({ id: "history", createdAt: date }); tx.auditLog.findMany.mockRejectedValue(new Error("database unavailable")); await expect(getMemberAccess(actor)).rejects.toThrow("database unavailable") })
it("redacts history for a directory-only reader", async () => { roles[0].permissions = ["users.read"]; const model = await getMemberAccess(actor); expect(model.canReadHistory).toBe(false); expect(tx.auditLog.findMany).not.toHaveBeenCalled(); expect(model.catalogue.every(role => !role.canAssign)).toBe(true) })
it("honors explicit legacy assignment but never infers activation or removal from it", () => { expect(hasMemberControl(["ASSIGN_ROLES"], "assign")).toBe(true); expect(hasMemberControl(["ASSIGN_ROLES"], "remove")).toBe(false); expect(hasMemberControl(["*"], "activate")).toBe(false); expect(canGrantMemberRole(["users.roles.assign", "*"], { permissions: ["users.activate"] })).toBe(false) })
