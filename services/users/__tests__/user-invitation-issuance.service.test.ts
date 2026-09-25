jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
import { db } from "@/prisma/db"
import { issueUserInvitation } from "../user-invitation-issuance.service"
import { invitationDigest } from "../user-invitation-delivery-contract"
import { invitationRevision } from "../invitation-revision"

const input = { actor: { id: "issuer", organizationId: "org" }, actorPermissions: ["users.invite", "users.roles.assign", "items.read"], email: " Colleague@Example.invalid ", roleId: "reader", locale: "fr" as const, requestId: "ccb01ec7-2f22-47e6-b56e-4c564269bfa6" }
function setup() {
  const issuer = { id: "issuer", isLocked: false, lockedUntil: null, isVerified: true, emailVerified: true, organization: { name: "Scoped company", isActive: true, deletedAt: null }, roles: [{ permissions: input.actorPermissions }] }
  const tx = {
    role: { findFirst: jest.fn().mockResolvedValue({ id: "reader", organizationId: "org", permissions: ["items.read"], nameEn: "Reader", nameFr: "Lecteur", code: "reader" }) },
    user: { findFirst: jest.fn().mockImplementation(async args => args.where.id ? issuer : null) },
    invite: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "invite" }), update: jest.fn().mockResolvedValue({ id: "invite" }) },
    businessEvent: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "event" }) },
    auditLog: { create: jest.fn() },
    businessEventOutbox: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation(async fn => fn(tx))
  return { tx, issuer }
}
beforeEach(() => { jest.clearAllMocks(); process.env.RESEND_FROM_EMAIL = "invites@example.invalid"; process.env.NEXT_PUBLIC_BASE_URL = "http://127.0.0.1:3107"; delete process.env.STOQUIFY_USER_INVITE_FROM_EMAIL })
it("saves the scoped issuer, approved permissions and token-free queue in one transaction", async () => {
  const { tx } = setup()
  expect(await issueUserInvitation(input)).toMatchObject({ status: 200, data: { issueId: "event", delivery: "PENDING", replayed: false } })
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" })
  const saved = tx.invite.create.mock.calls[0][0].data
  const event = tx.businessEvent.create.mock.calls[0][0].data
  expect(saved.email).toBe("colleague@example.invalid")
  expect(event.payload).toMatchObject({ actorId: "issuer", roleId: "reader", rolePermissions: ["items.read"], roleName: "Lecteur", locale: "fr", tokenHash: invitationDigest(saved.token), recipientHash: invitationDigest(saved.email) })
  expect(event.payload.actorPermissionBasis).toBe("stored-grants")
  expect(event.payload.actorPermissions).toEqual([...input.actorPermissions].sort())
  expect(event.payload.actorPermissions).not.toContain("ASSIGN_ROLES")
  expect(JSON.stringify(event)).not.toContain(saved.token)
  expect(JSON.stringify(event)).not.toContain(saved.email)
  expect(event.outboxMessages.create.payloadHash).toBe(event.payloadHash)
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "issuer", organizationId: "org", action: "INVITE_CREATED" }) }))
})
it("rejects a permission-management invitation allowed only by expanded request claims", async () => {
  const { tx } = setup()
  tx.role.findFirst.mockResolvedValue({ id: "reader", organizationId: "org", permissions: ["roles.permissions.remove"], nameEn: "Permission manager", code: "manager" })
  expect(await issueUserInvitation({ ...input, actorPermissions: [...input.actorPermissions, "ASSIGN_ROLES", "roles.permissions.remove"] })).toMatchObject({ status: 403 })
  expect(tx.invite.create).not.toHaveBeenCalled()
  expect(tx.businessEvent.create).not.toHaveBeenCalled()
})
it("returns the original request outcome without rotating its token or queue", async () => {
  const { tx } = setup(); await issueUserInvitation(input)
  const event = tx.businessEvent.create.mock.calls[0][0].data
  tx.businessEvent.findUnique.mockResolvedValue({ ...event, id: "event", outboxMessages: [{ status: "SENT" }] })
  expect(await issueUserInvitation(input)).toMatchObject({ data: { issueId: "event", replayed: true, delivery: "SENT" } })
  expect(tx.invite.create).toHaveBeenCalledTimes(1); expect(tx.businessEvent.create).toHaveBeenCalledTimes(1)
  expect(await issueUserInvitation({ ...input, email: "different@example.invalid" })).toMatchObject({ status: 409, code: "INVITATION_REQUEST_CONFLICT" })
})
it.each(["disabled", "locked", "unverified", "inactiveOrg", "authorityLost"])("rechecks the stored issuer when %s", async kind => {
  const { tx, issuer } = setup()
  if (kind === "disabled") tx.user.findFirst.mockResolvedValue(null)
  if (kind === "locked") issuer.isLocked = true
  if (kind === "unverified") { issuer.isVerified = false; issuer.emailVerified = false }
  if (kind === "inactiveOrg") issuer.organization.isActive = false
  if (kind === "authorityLost") issuer.roles = [{ permissions: ["items.read"] }]
  expect(await issueUserInvitation(input)).toMatchObject({ status: 403, code: "INVITATION_AUTHORITY_CHANGED" })
  expect(tx.invite.create).not.toHaveBeenCalled(); expect(tx.businessEvent.create).not.toHaveBeenCalled()
})
it("propagates an audit failure so the transaction cannot commit partial issuance", async () => {
  const { tx } = setup(); tx.auditLog.create.mockRejectedValue(new Error("audit offline"))
  await expect(issueUserInvitation(input)).rejects.toThrow("audit offline")
})
it("retries a serialization conflict with the same request reference", async () => {
  const { tx } = setup(); (db.$transaction as jest.Mock).mockRejectedValueOnce({ code: "P2034" })
  expect(await issueUserInvitation(input)).toMatchObject({ status: 200 })
  expect(db.$transaction).toHaveBeenCalledTimes(2)
  expect(tx.businessEvent.create.mock.calls[0][0].data.idempotencyKey).toBe(`user-invitation/${input.requestId}`)
})
it("preserves accepted invitation history", async () => {
  const { tx } = setup(); tx.invite.findUnique.mockResolvedValue({ id: "invite", status: "ACCEPTED" })
  expect(await issueUserInvitation(input)).toMatchObject({ status: 409, code: "INVITATION_ACCOUNT_EXISTS" })
  expect(tx.invite.update).not.toHaveBeenCalled()
})
it("explains incomplete delivery setup without saving an invitation", async () => {
  const { tx } = setup(); delete process.env.RESEND_FROM_EMAIL
  expect(await issueUserInvitation(input)).toMatchObject({ status: 503, code: "INVITATION_DELIVERY_NOT_CONFIGURED" })
  expect(tx.invite.create).not.toHaveBeenCalled()
})
it("requires an explicit current revision to replace a pending invitation and preserves the old queue", async () => {
  const { tx } = setup()
  const current = { id: "invite", organizationId: "org", email: "colleague@example.invalid", roleId: "reader", status: "PENDING", expiresAt: new Date(Date.now() + 60000), updatedAt: new Date(), token: "old-token" }
  tx.invite.findUnique.mockResolvedValue(current)
  expect(await issueUserInvitation(input)).toMatchObject({ code: "INVITATION_PENDING" })
  expect(await issueUserInvitation({ ...input, replace: { inviteId: current.id, revision: "0".repeat(64), reason: "Replace expired access" } })).toMatchObject({ status: 409, code: "INVITATION_CHANGED" })
  const replacement = { inviteId: current.id, revision: invitationRevision(current), reason: "Correct role assignment" }
  expect(await issueUserInvitation({ ...input, replace: replacement })).toMatchObject({ status: 200 })
  expect(tx.invite.update.mock.calls[0][0].data.token).not.toBe(current.token)
  expect(tx.businessEvent.create.mock.calls[0][0].data.payload.replacement).toEqual({ previousRevision: replacement.revision, reason: replacement.reason })
  expect(tx.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", status: { in: ["PENDING", "FAILED", "DEFERRED"] } }), data: expect.objectContaining({ status: "CANCELLED", lastErrorCode: "INVITATION_REPLACED" }) }))
})
it("cannot replace a higher-privilege invitation with a lower role to evade the existing grant ceiling", async () => {
  const { tx } = setup()
  const current = { id: "invite", organizationId: "org", email: "colleague@example.invalid", roleId: "controller", status: "PENDING", expiresAt: new Date(Date.now() + 60000), updatedAt: new Date() }
  tx.invite.findUnique.mockResolvedValue(current)
  tx.role.findFirst.mockResolvedValueOnce({ id: "reader", organizationId: "org", permissions: ["items.read"] }).mockResolvedValueOnce({ organizationId: "org", permissions: ["accounting.period.close"] })
  expect(await issueUserInvitation({ ...input, replace: { inviteId: current.id, revision: invitationRevision(current), reason: "Change role" } })).toMatchObject({ status: 403 })
  expect(tx.invite.update).not.toHaveBeenCalled()
})
