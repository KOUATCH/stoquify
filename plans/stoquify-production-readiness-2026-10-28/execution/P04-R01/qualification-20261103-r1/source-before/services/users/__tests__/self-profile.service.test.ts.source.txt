import { db } from "@/prisma/db"
import { getSelfProfile, updateSelfProfile } from "../self-profile.service"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
const scope = { actorId: "actor", organizationId: "org", sessionId: "current", sessionToken: "private-token" }
let tx: any, user: any, access: any
beforeEach(() => {
  jest.resetAllMocks()
  user = { id: "actor", name: "Alex Old", firstName: "Alex", lastName: "Old", jobTitle: null, email: "synthetic@example.invalid", emailVerified: true, phone: null, image: null, updatedAt: new Date("2026-01-01") }
  access = { isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, roles: [{ permissions: ["profile.read", "profile.update"] }] }
  tx = { $queryRaw: jest.fn().mockResolvedValue([]), user: { findFirst: jest.fn().mockImplementation(({ select }) => Promise.resolve(select.roles ? access : { ...user })), update: jest.fn().mockImplementation(({ data }) => { Object.assign(user, data); return Promise.resolve({ ...user }) }) }, session: { findFirst: jest.fn().mockResolvedValue({ id: "current" }) }, auditLog: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) } }
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx))
})
const command = async () => ({ requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: (await getSelfProfile(scope)).snapshotHash, fields: { firstName: " Camille ", lastName: "New", jobTitle: "Manager" } })
it("scopes current identity, organization, roles and exact unexpired session without exposing its token", async () => {
  const result = await getSelfProfile(scope)
  expect(result.canUpdate).toBe(true); expect(JSON.stringify(result)).not.toContain("private-token")
  expect(tx.user.findFirst.mock.calls[0][0].where).toMatchObject({ id: "actor", organizationId: "org", organization: { isActive: true, deletedAt: null } })
  expect(tx.session.findFirst.mock.calls[0][0].where).toMatchObject({ id: "current", userId: "actor", token: "private-token", expiresAt: { gt: expect.any(Date) } })
})
it("normalizes display names and updates only allowed fields with mandatory evidence", async () => {
  const result = await updateSelfProfile(scope, await command())
  expect(result).toMatchObject({ displayName: "Camille New", replayed: false, changedFields: ["firstName", "lastName", "jobTitle", "name"] })
  expect(tx.user.update.mock.calls[0][0]).toEqual({ where: { id: "actor" }, data: { firstName: "Camille", lastName: "New", jobTitle: "Manager", name: "Camille New", updatedAt: expect.any(Date) } })
  expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ organizationId: "org", userId: "actor", changes: { before: { name: "Alex Old" }, receipt: { id: result.id } } })
})
it("allows reading but rejects writing for a current read-only role", async () => {
  const input = await command(); access.roles[0].permissions = ["profile.read"]
  expect((await getSelfProfile(scope)).canUpdate).toBe(false)
  await expect(updateSelfProfile(scope, input)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.auditLog.findFirst).not.toHaveBeenCalled(); expect(tx.user.update).not.toHaveBeenCalled()
})
it.each(["actor", "role", "session"])("rejects unusable %s before replay or write", async kind => {
  const input = await command()
  if (kind === "actor") access.isActive = false
  if (kind === "role") access.roles = []
  if (kind === "session") tx.session.findFirst.mockResolvedValue(null)
  await expect(updateSelfProfile(scope, input)).rejects.toMatchObject({ code: kind === "session" ? "AUTH_REQUIRED" : "FORBIDDEN" })
  expect(tx.auditLog.findFirst).not.toHaveBeenCalled(); expect(tx.user.update).not.toHaveBeenCalled()
})
it("rejects a changed account record before any write", async () => {
  const input = await command(); user.updatedAt = new Date("2026-02-01")
  await expect(updateSelfProfile(scope, input)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(tx.user.update).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("recovers an earlier result without overwriting later changes and rejects nonce reuse for different content", async () => {
  const input = await command(), result = await updateSelfProfile(scope, input)
  tx.auditLog.findFirst.mockResolvedValue({ changes: tx.auditLog.create.mock.calls[0][0].data.changes }); tx.user.update.mockClear()
  user.name = "Later name"
  expect(await updateSelfProfile({ ...scope, sessionId: "new-session" }, input)).toEqual({ ...result, replayed: true })
  expect(tx.user.update).not.toHaveBeenCalled()
  await expect(updateSelfProfile(scope, { ...input, fields: { ...input.fields, jobTitle: "Changed" } })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
})
it("records a no-op without touching the account revision", async () => {
  const input = await command(); input.fields = { firstName: "Alex", lastName: "Old", jobTitle: "" }
  expect((await updateSelfProfile(scope, input)).changedFields).toEqual([])
  expect(tx.user.update).not.toHaveBeenCalled(); expect(tx.auditLog.create).toHaveBeenCalledTimes(1)
})
it("fails the transaction if mandatory audit persistence fails", async () => {
  const input = await command(); tx.auditLog.create.mockRejectedValue(new Error("audit unavailable"))
  await expect(updateSelfProfile(scope, input)).rejects.toThrow("audit unavailable")
})
it("does not turn corrupt or inaccessible history into an empty successful history", async () => {
  tx.auditLog.findMany.mockResolvedValue([{ id: "bad", changes: {} }])
  await expect(getSelfProfile(scope)).rejects.toMatchObject({ code: "INTERNAL_ERROR" })
  tx.auditLog.findMany.mockRejectedValue(new Error("database unavailable"))
  await expect(getSelfProfile(scope)).rejects.toThrow("database unavailable")
})
it.each([{ actorId: "foreign" }, { fields: { firstName: "A", lastName: "B", jobTitle: "C", email: "foreign@example.invalid" } }, { fields: { firstName: "", lastName: "", jobTitle: "" } }])("rejects arbitrary identity or unsupported/invalid input", async extra => {
  await expect(updateSelfProfile(scope, { ...await command(), ...extra } as any)).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  expect(tx.user.update).not.toHaveBeenCalled()
})
