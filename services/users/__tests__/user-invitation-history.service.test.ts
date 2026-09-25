jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../user-invitation-redemption-authority.service", () => ({ readInvitationRedemptionAuthority: jest.fn() }))
import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { readInvitationRedemptionAuthority } from "../user-invitation-redemption-authority.service"
import { readUserInvitationHistory } from "../user-invitation-history.service"
import { USER_INVITATION_EVENT } from "../user-invitation-delivery-contract"
const permissions = ["users.invite", "users.roles.assign", "users.read", "items.read"]
function setup() {
  const invite = { id: "invite", organizationId: "org", roleId: "reader", token: "private-token", email: "private@example.invalid", status: "PENDING", expiresAt: new Date(Date.now() + 60000), role: { organizationId: "org", permissions: ["items.read"] } }
  const payload = { version: 1, organizationId: "org", inviteId: "invite", actorId: "issuer", roleId: "reader", tokenHash: "a".repeat(64), recipientHash: "b".repeat(64), requestFingerprint: "c".repeat(64), actorPermissions: permissions, rolePermissions: ["items.read"], locale: "en", companyName: "Company", roleName: "Reader", from: "invites@example.invalid", baseUrl: "https://example.invalid", expiresAt: invite.expiresAt.toISOString() }
  const event = { id: "event", eventType: USER_INVITATION_EVENT, eventSource: "API", schemaVersion: 1, actorId: "issuer", status: "APPLIED", payload, payloadHash: hashBusinessPayload(payload), idempotencyKey: "request", recordedAt: new Date(), outboxMessages: [{ status: "PENDING", attempts: 0, updatedAt: new Date(), payload, payloadHash: hashBusinessPayload(payload), idempotencyKey: "request" }] }
  const actor = { id: "reviewer", isLocked: false, isVerified: true, emailVerified: true, organization: { name: "Company", isActive: true, deletedAt: null }, roles: [{ permissions }] }
  const tx = { invite: { findFirst: jest.fn().mockResolvedValue(invite) }, user: { findFirst: jest.fn().mockResolvedValue(actor), findMany: jest.fn().mockResolvedValue([{ id: "issuer", firstName: "Ada", lastName: "Reviewer", name: null }]) }, businessEvent: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([event]) }, auditLog: { findFirst: jest.fn() } }
  ;(db.$transaction as jest.Mock).mockImplementation(async fn => fn(tx))
  ;(readInvitationRedemptionAuthority as jest.Mock).mockResolvedValue({ issueId: "event" })
  const input = { actorId: "reviewer", organizationId: "org", actorPermissions: permissions, request: { inviteId: "invite" } }
  return { tx, input, event, invite, actor }
}
beforeEach(() => jest.resetAllMocks())
it("does not label an older expanded role-control grant as verified evidence", async () => {
  const { input, event, invite, actor } = setup()
  const current = [...permissions, "roles.permissions.remove"]
  input.actorPermissions = current
  actor.roles = [{ permissions: current }]
  invite.role.permissions = ["roles.permissions.remove"]
  event.payload.rolePermissions = [...invite.role.permissions]
  event.payload.actorPermissions = [...current, "ASSIGN_ROLES"]
  event.payloadHash = hashBusinessPayload(event.payload)
  expect(await readUserInvitationHistory(input)).toMatchObject({ status: 200, data: { entries: [{ evidenceValid: false, actorName: null, roleName: null, delivery: null }] } })
})
it("returns a scoped, token-free history and explicitly disabled transport", async () => {
  const { tx, input } = setup(), result = await readUserInvitationHistory(input)
  expect(result).toMatchObject({ status: 200, data: { transport: "disabled", reviewRequired: false, entries: [{ id: "event", evidenceValid: true, kind: "issued", actorName: "Ada Reviewer", roleName: "Reader", delivery: { status: "PENDING", attempts: 0 } }] } })
  expect(tx.invite.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "invite", organizationId: "org" } }))
  expect(tx.businessEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", sourceId: "invite" }), take: 21 }))
  expect(tx.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", id: { in: ["issuer"] } } }))
  for (const privateValue of ["private-token", "private@example.invalid", "tokenHash", "recipientHash", "requestFingerprint", "payloadHash", "actorPermissions", "from", "baseUrl"]) expect(JSON.stringify(result.data)).not.toContain(privateValue)
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
})
it.each([{ actorPermissions: [] }, { actorPermissions: ["users.read"] }, { actorPermissions: ["users.invite", "users.roles.assign"] }])("denies incomplete review authority before querying records", async ({ actorPermissions }) => {
  const { input } = setup(); expect(await readUserInvitationHistory({ ...input, actorPermissions })).toMatchObject({ status: 403, data: null }); expect(db.$transaction).not.toHaveBeenCalled()
})
it.each([null, {}, { inviteId: "" }, { inviteId: "invite", cursor: "x".repeat(192) }])("bounds invalid input", async request => {
  const { input } = setup(); expect(await readUserInvitationHistory({ ...input, request })).toMatchObject({ status: 400, data: null }); expect(db.$transaction).not.toHaveBeenCalled()
})
it.each(["missing", "revoked", "above-ceiling", "users-read-revoked"])("denies %s without exposing decision records", async kind => {
  const { tx, input, invite, actor } = setup()
  if (kind === "missing") tx.invite.findFirst.mockResolvedValue(null)
  if (kind === "revoked") tx.user.findFirst.mockResolvedValue(null)
  if (kind === "above-ceiling") invite.role.permissions = ["accounting.period.close"]
  if (kind === "users-read-revoked") actor.roles = [{ permissions: permissions.filter(p => p !== "users.read") }]
  expect((await readUserInvitationHistory(input)).data).toBeNull(); expect(tx.businessEvent.findMany).not.toHaveBeenCalled()
})
it.each(["bad-hash", "foreign-payload", "actor-mismatch", "unapplied", "unexpected-schema"])("marks %s evidence unavailable instead of displaying trusted details", async kind => {
  const { input, event } = setup()
  if (kind === "bad-hash") event.payloadHash = "bad"
  if (kind === "foreign-payload") { event.payload.organizationId = "foreign"; event.payloadHash = hashBusinessPayload(event.payload) }
  if (kind === "actor-mismatch") event.actorId = "foreign-actor"
  if (kind === "unapplied") event.status = "RECORDED"
  if (kind === "unexpected-schema") event.schemaVersion = 2
  expect((await readUserInvitationHistory(input)).data?.entries[0]).toMatchObject({ evidenceValid: false, actorName: null, reason: null, roleName: null, delivery: null })
})
it("marks a pending link without current authority for review and does not invent older decisions", async () => {
  const { input, tx } = setup(); tx.businessEvent.findMany.mockResolvedValue([]); (readInvitationRedemptionAuthority as jest.Mock).mockResolvedValue(null)
  expect((await readUserInvitationHistory(input)).data).toMatchObject({ reviewRequired: true, entries: [], nextCursor: null, acceptedAt: null })
})
it("retains unknown/multiple delivery records as unavailable", async () => {
  const { input, event } = setup(); event.outboxMessages.push({ ...event.outboxMessages[0] })
  expect((await readUserInvitationHistory(input)).data?.entries[0].delivery).toBeNull()
})
it("keeps provider acceptance separate from account creation", async () => {
  const { input, event } = setup(); event.outboxMessages[0].status = "SENT"
  expect((await readUserInvitationHistory(input)).data).toMatchObject({ status: "PENDING", acceptedAt: null, entries: [{ delivery: { status: "SENT" } }] })
})
it.each(["hash", "payload", "request"])("does not attach a delivery receipt with a different %s", async field => {
  const { input, event } = setup()
  if (field === "hash") event.outboxMessages[0].payloadHash = "wrong"
  if (field === "payload") event.outboxMessages[0].payload = { ...event.payload, roleId: "another" }
  if (field === "request") event.outboxMessages[0].idempotencyKey = "another"
  expect((await readUserInvitationHistory(input)).data?.entries[0].delivery).toBeNull()
})
it("does not treat an ungrantable permission snapshot as a valid decision", async () => {
  const { input, event } = setup(); event.payload.actorPermissions = ["users.read"]; event.payloadHash = hashBusinessPayload(event.payload)
  expect((await readUserInvitationHistory(input)).data?.entries[0].evidenceValid).toBe(false)
})
it("does not convert failed history reads to empty success", async () => {
  const { input, tx } = setup(); tx.businessEvent.findMany.mockRejectedValue(new Error("database offline"))
  await expect(readUserInvitationHistory(input)).rejects.toThrow("database offline")
})
it("uses a tenant-and-invitation-scoped cursor and stable timestamp/id ordering", async () => {
  const { input, tx, event } = setup(); tx.businessEvent.findMany.mockResolvedValue(Array.from({ length: 21 }, (_, i) => ({ ...event, id: `event-${i}` })))
  expect((await readUserInvitationHistory(input)).data).toMatchObject({ nextCursor: "event-19" })
  tx.businessEvent.findFirst.mockResolvedValue({ id: "event-19", recordedAt: event.recordedAt })
  await readUserInvitationHistory({ ...input, request: { inviteId: "invite", cursor: "event-19" } })
  expect(tx.businessEvent.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "event-19", organizationId: "org", sourceId: "invite" }) }))
  expect(tx.businessEvent.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{ recordedAt: { lt: event.recordedAt } }, { recordedAt: event.recordedAt, id: { lt: "event-19" } }] }) }))
  tx.businessEvent.findFirst.mockResolvedValue(null)
  expect(await readUserInvitationHistory({ ...input, request: { inviteId: "invite", cursor: "foreign-event" } })).toMatchObject({ status: 404, data: null })
})
