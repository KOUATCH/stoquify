jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), businessEventOutbox: { findMany: jest.fn(), updateMany: jest.fn() }, businessEvent: { findFirst: jest.fn() }, invite: { findFirst: jest.fn() }, user: { findFirst: jest.fn() }, auditLog: { create: jest.fn() } } }))
import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { invitationDigest, USER_INVITATION_DELIVERY, USER_INVITATION_EVENT } from "@/services/users/user-invitation-delivery-contract"
import { runUserInvitationDeliveryWorker } from "../user-invitation-delivery-worker.service"
const database = db as unknown as { $transaction: jest.Mock; businessEventOutbox: { findMany: jest.Mock; updateMany: jest.Mock }; businessEvent: { findFirst: jest.Mock }; invite: { findFirst: jest.Mock }; user: { findFirst: jest.Mock }; auditLog: { create: jest.Mock } }
const common = { organizationId: "org", workerId: "test-worker" }
function setup() {
  const token = "a".repeat(64), email = "colleague@example.invalid", expiresAt = new Date(Date.now() + 86400000)
  const role = { organizationId: "org", permissions: ["items.read"] }
  const payload = { version: 1 as const, organizationId: "org", inviteId: "invite", actorId: "issuer", roleId: "reader", requestFingerprint: "b".repeat(64), tokenHash: invitationDigest(token), recipientHash: invitationDigest(email), actorPermissions: ["users.invite", "users.roles.assign", "items.read"], rolePermissions: ["items.read"], locale: "fr" as const, companyName: "Company", roleName: "Lecteur", from: "invites@example.invalid", baseUrl: "http://127.0.0.1:3107", expiresAt: expiresAt.toISOString() }
  const row = { id: "outbox", organizationId: "org", businessEventId: "event", payload, payloadHash: hashBusinessPayload(payload), idempotencyKey: "stable-request", attempts: 0, maxAttempts: 5, metadata: null as unknown, updatedAt: new Date(), status: "PENDING", eventName: USER_INVITATION_DELIVERY }
  const invitation = { id: "invite", organizationId: "org", token, email, expiresAt, roleId: "reader", status: "PENDING", role, organization: { isActive: true, deletedAt: null } }
  database.$transaction.mockImplementation(async fn => fn(database))
  database.businessEventOutbox.findMany.mockResolvedValue([row]); database.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })
  database.businessEvent.findFirst.mockResolvedValue({ payloadHash: row.payloadHash, payload, idempotencyKey: row.idempotencyKey, actorId: payload.actorId, eventType: USER_INVITATION_EVENT })
  database.invite.findFirst.mockResolvedValue(invitation)
  database.user.findFirst.mockResolvedValue({ id: "issuer", isLocked: false, isVerified: true, emailVerified: true, organization: { name: "Company", isActive: true, deletedAt: null }, roles: [{ permissions: payload.actorPermissions }] })
  const adapter = jest.fn().mockResolvedValue({ state: "accepted", providerId: "isolated-receipt" })
  return { row, invitation, adapter }
}
beforeEach(() => jest.resetAllMocks())
it.each([false, true])("does not dispatch ambiguous or currently unauthorized role-control grants (stored=%s)", async stored => {
  const { row, invitation, adapter } = setup()
  Object.assign(row.payload, { rolePermissions: ["roles.permissions.remove"], actorPermissions: [...row.payload.actorPermissions, "roles.permissions.remove"], ...(stored ? { actorPermissionBasis: "stored-grants" } : {}) })
  invitation.role.permissions = [...row.payload.rolePermissions]
  row.payloadHash = hashBusinessPayload(row.payload)
  database.businessEvent.findFirst.mockResolvedValue({ payloadHash: row.payloadHash, payload: row.payload, idempotencyKey: row.idempotencyKey, actorId: row.payload.actorId })
  database.user.findFirst.mockResolvedValue({ id: "issuer", isVerified: true, organization: { name: "Company", isActive: true }, roles: [{ permissions: ["users.invite", "users.roles.assign"] }] })
  expect(await runUserInvitationDeliveryWorker(common, adapter)).toMatchObject({ results: [{ status: stored ? "CANCELLED" : "DEAD_LETTER" }] })
  expect(adapter).not.toHaveBeenCalled()
})
it("is disabled by default without querying or transmitting anything", async () => {
  expect(await runUserInvitationDeliveryWorker(common)).toEqual({ state: "disabled", results: [] })
  expect(database.businessEventOutbox.findMany).not.toHaveBeenCalled()
})
it("requires tenant and worker identities", async () => {
  await expect(runUserInvitationDeliveryWorker({ organizationId: "", workerId: "worker" })).rejects.toThrow("tenant")
})
it("persists the first dispatch time before the isolated adapter and fences settlement", async () => {
  const { adapter } = setup()
  adapter.mockImplementation(async (mail, key) => {
    expect(key).toBe("stable-request"); expect(mail.text).toContain("/fr/user-invite/invitation?token=")
    expect(database.businessEventOutbox.updateMany.mock.calls[1][0].data.metadata.firstDispatchAt).toEqual(expect.any(String))
    return { state: "accepted", providerId: "isolated-receipt" }
  })
  expect(await runUserInvitationDeliveryWorker(common, adapter)).toMatchObject({ results: [{ status: "SENT" }] })
  const settlement = database.businessEventOutbox.updateMany.mock.calls[2][0]
  expect(settlement.where).toMatchObject({ organizationId: "org", attempts: 1, status: "LOCKED", lockedBy: expect.stringContaining("test-worker/") })
  expect(database.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "INVITATION_DELIVERY_SENT" }) }))
})
it.each(["token", "role", "expired", "accepted", "authority"])("does not dispatch when %s changed", async kind => {
  const { invitation, adapter } = setup()
  if (kind === "token") invitation.token = "changed"
  if (kind === "role") invitation.role.permissions.push("accounting.period.close")
  if (kind === "expired") invitation.expiresAt = new Date(0)
  if (kind === "accepted") invitation.status = "ACCEPTED"
  if (kind === "authority") database.user.findFirst.mockResolvedValue(null)
  expect(await runUserInvitationDeliveryWorker(common, adapter)).toMatchObject({ results: [{ status: "CANCELLED" }] })
  expect(adapter).not.toHaveBeenCalled()
})
it.each(["hash", "foreign", "metadata"])("holds invalid %s evidence", async kind => {
  const { row, adapter } = setup()
  if (kind === "hash") row.payloadHash = "corrupt"
  if (kind === "foreign") row.payload.organizationId = "foreign"
  if (kind === "metadata") row.metadata = { firstDispatchAt: "invalid" }
  expect(await runUserInvitationDeliveryWorker(common, adapter)).toMatchObject({ results: [{ status: "DEAD_LETTER", code: "INVITATION_DELIVERY_EVIDENCE_INVALID" }] })
  expect(adapter).not.toHaveBeenCalled()
})
it("holds an uncertain delivery after the safe retry window", async () => {
  const { row, adapter } = setup(); row.metadata = { firstDispatchAt: new Date(Date.now() - 23 * 3600000).toISOString() }
  expect(await runUserInvitationDeliveryWorker(common, adapter)).toMatchObject({ results: [{ status: "DEAD_LETTER", code: "INVITATION_DELIVERY_REVIEW_REQUIRED" }] })
  expect(adapter).not.toHaveBeenCalled()
})
it("keeps an unknown adapter outcome retryable with the same request key", async () => {
  const { adapter } = setup(); adapter.mockRejectedValue(new Error("response lost"))
  expect(await runUserInvitationDeliveryWorker(common, adapter)).toMatchObject({ results: [{ status: "FAILED", code: "INVITATION_PROVIDER_OUTCOME_UNKNOWN" }] })
})
it("does not send after losing the claim", async () => {
  const { adapter } = setup(); database.businessEventOutbox.updateMany.mockResolvedValueOnce({ count: 0 })
  expect(await runUserInvitationDeliveryWorker(common, adapter)).toMatchObject({ results: [] })
  expect(adapter).not.toHaveBeenCalled()
})
it("does not report acceptance after losing the settlement lease", async () => {
  const { adapter } = setup(); database.businessEventOutbox.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
  expect(await runUserInvitationDeliveryWorker(common, adapter)).toMatchObject({ results: [{ status: "LEASE_LOST" }] })
  expect(database.auditLog.create).not.toHaveBeenCalled()
})
