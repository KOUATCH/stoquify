import { db } from "@/prisma/db"
import { getAccountSessionPreview, revokeReviewedAccountSessions } from "../account-session.service"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
const scope = { actorId: "actor", organizationId: "org", sessionId: "current", sessionToken: "private-token" }
let tx: any
const row = { id: "other", createdAt: new Date("2026-01-01"), expiresAt: new Date("2099-01-01"), userAgent: "Synthetic device" }
beforeEach(() => {
  jest.resetAllMocks()
  tx = { $queryRaw: jest.fn().mockResolvedValue([]), user: { findFirst: jest.fn().mockResolvedValue({ isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, roles: [{ permissions: ["profile.read"] }] }) }, session: { findFirst: jest.fn().mockResolvedValue({ id: "current" }), findMany: jest.fn().mockResolvedValue([row]), deleteMany: jest.fn().mockResolvedValue({ count: 1 }) }, auditLog: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) } }
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx))
})
const command = async () => ({ requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: (await getAccountSessionPreview(scope)).snapshotHash })
it("returns only scoped session display data and no authentication tokens", async () => {
  const preview = await getAccountSessionPreview(scope)
  expect(preview.others).toEqual([{ id: "other", device: "Synthetic device", createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString() }])
  expect(JSON.stringify(preview)).not.toMatch(/private-token|userAgent|ipAddress/)
  expect(tx.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "actor", organizationId: "org" }) }))
  expect(tx.session.findFirst.mock.calls[0][0].where).toMatchObject({ id: "current", userId: "actor", token: "private-token", expiresAt: { gt: expect.any(Date) } })
})
it("deletes only the reviewed own IDs, preserves current, and saves mandatory evidence", async () => {
  const receipt = await revokeReviewedAccountSessions(scope, await command())
  expect(receipt).toMatchObject({ actorId: "actor", revokedCount: 1, reviewedCount: 1, replayed: false })
  expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "actor", AND: [{ id: { in: ["other"] } }, { id: { not: "current" } }] } })
  expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ userId: "actor", organizationId: "org", changes: { receipt: { id: receipt.id }, preservedRequestingSession: true } })
})
it("rejects changes to the reviewed list before deletion", async () => {
  const input = await command(); tx.session.findMany.mockResolvedValue([row, { ...row, id: "new" }])
  await expect(revokeReviewedAccountSessions(scope, input)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(tx.session.deleteMany).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("replays the recorded result without deleting newly created sessions", async () => {
  const input = await command(), first = await revokeReviewedAccountSessions(scope, input)
  tx.auditLog.findFirst.mockResolvedValue({ changes: tx.auditLog.create.mock.calls[0][0].data.changes })
  tx.session.findMany.mockResolvedValue([{ ...row, id: "new" }]); tx.session.deleteMany.mockClear()
  expect(await revokeReviewedAccountSessions(scope, input)).toEqual({ ...first, replayed: true })
  expect(tx.session.deleteMany).not.toHaveBeenCalled()
  await expect(revokeReviewedAccountSessions(scope, { ...input, expectedHash: "b".repeat(64) })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
})
it("rejects expired or revoked requesting sessions before replay or mutation", async () => {
  const input = await command(); tx.session.findFirst.mockResolvedValue(null)
  await expect(revokeReviewedAccountSessions(scope, input)).rejects.toMatchObject({ code: "AUTH_REQUIRED" })
  expect(tx.auditLog.findFirst).not.toHaveBeenCalled(); expect(tx.session.deleteMany).not.toHaveBeenCalled()
})
it.each([null, { isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, roles: [] }])("rechecks actor and current permissions before replay", async actor => {
  const input = await command(); tx.user.findFirst.mockResolvedValue(actor)
  await expect(revokeReviewedAccountSessions(scope, input)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.auditLog.findFirst).not.toHaveBeenCalled(); expect(tx.session.deleteMany).not.toHaveBeenCalled()
})
it("propagates audit failure to its owning transaction", async () => {
  const input = await command(); tx.auditLog.create.mockRejectedValue(new Error("audit failed"))
  await expect(revokeReviewedAccountSessions(scope, input)).rejects.toThrow("audit failed")
})
it("does not replace malformed history with a successful empty list", async () => {
  tx.auditLog.findMany.mockResolvedValue([{ id: "bad", changes: {} }])
  await expect(getAccountSessionPreview(scope)).rejects.toMatchObject({ code: "INTERNAL_ERROR" })
})
it("rejects arbitrary target or actor fields", async () => {
  await expect(revokeReviewedAccountSessions(scope, { ...await command(), actorId: "foreign" } as any)).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  expect(tx.session.deleteMany).not.toHaveBeenCalled()
})
