jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/events/business-event.service", () => ({ hashBusinessPayload: (value: unknown) => JSON.stringify(value) }))

import { db } from "@/prisma/db"
import { getAllPermissions } from "@/config/permissions"
import { deactivateUserForOrganization } from "../user-lifecycle.service"

const revision = new Date("2026-09-06T09:00:00.000Z")
const command = { requestId: "09ba28c2-5a3a-48ae-b8c5-46e7abff3991", expectedUpdatedAt: revision.toISOString(), reason: "Member left the organization" }
const input = { organizationId: "org-1", actorId: "actor", targetUserId: "target", session: { id: "session", token: "private-session-test" }, command }
let users: any[], roles: any[], memberships: any[], session: any, organization: any, receipt: any, tx: any
const account = (id: string) => ({ id, email: id + "@example.invalid", updatedAt: revision, isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null })
const run = (overrides: Partial<typeof input> = {}) => deactivateUserForOrganization({ ...input, ...overrides })
const noChanges = () => { expect(tx.user.update).not.toHaveBeenCalled(); expect(tx.session.deleteMany).not.toHaveBeenCalled(); expect(tx.invite.update).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled() }
beforeEach(() => {
  jest.clearAllMocks()
  users = [account("actor"), account("target")]
  roles = [{ id: "admin", permissions: getAllPermissions() }, { id: "reader", permissions: ["users.read"] }]
  memberships = [{ userId: "actor", roleId: "admin" }, { userId: "target", roleId: "reader" }]
  session = { expiresAt: new Date(Date.now() + 600000), assuranceVerifiedAt: new Date(), assuranceOrganizationId: "org-1", assuranceMethod: "password", assuranceLevel: 1, assuranceLockedUntil: null }
  organization = { id: "org-1" }; receipt = null
  tx = {
    $queryRaw: jest.fn(async (strings: TemplateStringsArray) => {
      const sql = strings.join("?")
      if (sql.includes("FROM organizations")) return [organization]
      if (sql.includes("FROM users")) return users
      if (sql.includes("FROM roles")) return roles
      if (sql.includes('FROM "_UserRoles"')) return memberships
      if (sql.includes("FROM sessions")) return session ? [session] : []
      throw new Error("Unexpected query")
    }),
    organization: { findFirst: jest.fn(async () => organization) },
    user: { update: jest.fn(async ({ where, data }: any) => { const index = users.findIndex(user => user.id === where.id); users[index] = { ...users[index], ...data }; return users[index] }) },
    session: { deleteMany: jest.fn(async () => ({ count: 2 })) },
    invite: { findMany: jest.fn(async () => []), update: jest.fn(async () => ({})) },
    businessEvent: { create: jest.fn(async () => ({ id: "cancellation-event" })) },
    businessEventOutbox: { updateMany: jest.fn(async () => ({ count: 1 })) },
    auditLog: { findFirst: jest.fn(async () => receipt), create: jest.fn(async ({ data }: any) => { if (data.action === "DEACTIVATE_USER") receipt = data; return data }) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx))
})

it("rejects self deactivation before a transaction", async () => {
  await expect(run({ targetUserId: "actor" })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(db.$transaction).not.toHaveBeenCalled()
})
it.each([undefined, { ...command, reason: " " }, { ...command, reason: "x".repeat(401) }, { ...command, requestId: "bad" }, { ...command, expectedUpdatedAt: undefined }])("rejects a missing or malformed reviewed command %#", async invalid => {
  await expect(run({ command: invalid as any })).rejects.toMatchObject({ code: "VALIDATION_ERROR" }); expect(db.$transaction).not.toHaveBeenCalled()
})
it("requires private session evidence", async () => {
  await expect(run({ session: undefined })).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(db.$transaction).not.toHaveBeenCalled()
})
it("rejects unknown or foreign members without effects", async () => {
  await expect(run({ targetUserId: "foreign-member" })).rejects.toMatchObject({ code: "NOT_FOUND" }); noChanges()
})
it("rejects an unavailable organization", async () => {
  organization = null; await expect(run()).rejects.toMatchObject({ code: "NOT_FOUND" }); noChanges()
})
it.each(["inactive", "unverified", "locked", "missing", "permission"])("reloads current actor authority: %s", async condition => {
  if (condition === "inactive") users[0].isActive = false
  if (condition === "unverified") { users[0].isVerified = false; users[0].emailVerified = false }
  if (condition === "locked") users[0].isLocked = true
  if (condition === "missing") users.shift()
  if (condition === "permission") roles[0].permissions = ["users.read"]
  await expect(run()).rejects.toMatchObject({ code: "FORBIDDEN" }); noChanges()
})
it.each(["missing", "expired", "old", "future", "method", "organization", "locked", "level"])("rejects invalid assurance: %s", async condition => {
  if (condition === "missing") session = null
  if (condition === "expired") session.expiresAt = revision
  if (condition === "old") session.assuranceVerifiedAt = new Date(Date.now() - 301000)
  if (condition === "future") session.assuranceVerifiedAt = new Date(Date.now() + 10000)
  if (condition === "method") session.assuranceMethod = "unverified"
  if (condition === "organization") session.assuranceOrganizationId = "org-2"
  if (condition === "locked") session.assuranceLockedUntil = new Date(Date.now() + 60000)
  if (condition === "level") session.assuranceLevel = 0
  await expect(run()).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" }); noChanges()
})
it.each(["users.deactivate", "users.delete", "DEACTIVATE_USERS", "DELETE_USERS"])("accepts existing explicit deactivation authority %s", async permission => {
  roles[0].permissions = [permission]; await expect(run()).resolves.toMatchObject({ id: "target", replayed: false })
})
it("does not substitute wildcard for high-risk deactivation authority", async () => {
  roles[0].permissions = ["*"]; await expect(run()).rejects.toMatchObject({ code: "FORBIDDEN" }); noChanges()
})
it("rejects a stale preview and already inactive account", async () => {
  users[1].updatedAt = new Date(revision.getTime() + 1)
  await expect(run()).rejects.toMatchObject({ code: "CONFLICT" }); noChanges()
  users[1].updatedAt = revision; users[1].isActive = false
  await expect(run()).rejects.toMatchObject({ code: "CONFLICT" }); noChanges()
})
it("preserves the last real custodian even when the actor has permission-edit aliases", async () => {
  roles[0].permissions = getAllPermissions().filter(value => value !== "users.roles.assign")
  roles[1].permissions = getAllPermissions()
  await expect(run()).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" }); noChanges()
})
it("allows deactivation when another qualified custodian remains", async () => {
  roles[1].permissions = getAllPermissions(); await expect(run()).resolves.toMatchObject({ id: "target" })
})
it("revokes sessions and reset links while retaining the account and roles", async () => {
  const result = await run()
  expect(result).toMatchObject({ id: "target", sessionsRevoked: 2, pendingInvitesCancelled: 0, replayed: false })
  expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "target" } })
  expect(tx.user.update).toHaveBeenCalledWith({ where: { id: "target", organizationId: "org-1" }, data: expect.objectContaining({ isActive: false, isLocked: true, lockedUntil: null, verificationToken: null, verificationTokenExpires: null }) })
  expect(receipt).toMatchObject({ action: "DEACTIVATE_USER", changes: { reason: command.reason, receipt: result } })
  expect(JSON.stringify(receipt)).not.toContain(input.session.token)
  expect(memberships).toHaveLength(2)
})
it("records cancellation history and cancels only queued deliveries", async () => {
  tx.invite.findMany.mockResolvedValue([{ id: "invite", organizationId: "org-1", email: users[1].email, roleId: "reader", status: "PENDING", expiresAt: new Date(Date.now() + 600000), updatedAt: revision }])
  await expect(run()).resolves.toMatchObject({ pendingInvitesCancelled: 1 })
  expect(tx.businessEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: "identity.user_invitation.cancelled.v1", sourceId: "invite", status: "APPLIED", payload: expect.objectContaining({ actorId: "actor", requestId: command.requestId }) }) }))
  expect(tx.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: ["PENDING", "FAILED", "DEFERRED"] } }), data: expect.objectContaining({ status: "CANCELLED" }) }))
})
it("replays a committed request without duplicate effects", async () => {
  const first = await run(); const second = await run()
  expect(second).toEqual({ ...first, replayed: true })
  expect(tx.user.update).toHaveBeenCalledTimes(1); expect(tx.auditLog.create).toHaveBeenCalledTimes(1)
  await expect(run({ command: { ...command, reason: "Different reason" } })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
})
it("rejects replay after account changes or actor authority is revoked", async () => {
  await run(); users[1].updatedAt = new Date(Date.now() + 1000)
  await expect(run()).rejects.toMatchObject({ code: "CONFLICT" })
  roles[0].permissions = ["users.read"]
  await expect(run()).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("does not acknowledge a transaction whose mandatory audit fails", async () => {
  tx.auditLog.create.mockRejectedValue(new Error("audit failed"))
  await expect(run()).rejects.toThrow("audit failed")
})
