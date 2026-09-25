jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
import { db } from "@/prisma/db"
import { cancelUserInvitation } from "../user-invitation-management.service"
import { invitationRevision } from "../invitation-revision"
const permissions = ["users.invite", "users.roles.assign", "items.read"]
function setup() {
  const invite = { id: "invite", organizationId: "org", email: "colleague@example.invalid", roleId: "reader", status: "PENDING", expiresAt: new Date(Date.now() + 60000), updatedAt: new Date(), role: { organizationId: "org", permissions: ["items.read"] } }
  const issuer = { id: "issuer", isLocked: false, isVerified: true, emailVerified: true, organization: { name: "Company", isActive: true, deletedAt: null }, roles: [{ permissions }] }
  const tx = { invite: { findFirst: jest.fn().mockResolvedValue(invite), update: jest.fn() }, user: { findFirst: jest.fn().mockResolvedValue(issuer) }, businessEvent: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "cancellation" }) }, businessEventOutbox: { updateMany: jest.fn() }, auditLog: { create: jest.fn() } }
  ;(db.$transaction as jest.Mock).mockImplementation(async fn => fn(tx))
  const input = { organizationId: "org", actorId: "issuer", actorPermissions: permissions, request: { inviteId: invite.id, revision: invitationRevision(invite), reason: "Invitation sent to wrong colleague", requestId: "d6f031db-5f40-49f3-81ca-c5fcd2c886c1" } }
  return { tx, invite, issuer, input }
}
beforeEach(() => jest.resetAllMocks())
it("cancels the reviewed invitation and its queued work with mandatory evidence", async () => {
  const { tx, input } = setup()
  expect(await cancelUserInvitation(input)).toMatchObject({ status: 200, data: { cancellationId: "cancellation", replayed: false } })
  expect(tx.invite.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "invite", organizationId: "org" } }))
  expect(tx.invite.update).toHaveBeenCalledWith({ where: { id: "invite" }, data: { status: "CANCELLED" } })
  expect(tx.businessEventOutbox.updateMany.mock.calls[0][0].where.status.in).not.toContain("SENT")
  expect(tx.businessEventOutbox.updateMany.mock.calls[0][0].where.status.in).not.toContain("LOCKED")
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "INVITE_CANCELLED", userId: "issuer", organizationId: "org" }) }))
})
it("denies missing authority before tenant/object lookup", async () => {
  const { input } = setup(); expect(await cancelUserInvitation({ ...input, actorPermissions: ["users.read"] })).toMatchObject({ status: 403 })
  expect(db.$transaction).not.toHaveBeenCalled()
})
it.each(["missing", "changed", "accepted", "issuer", "role"])("cannot mutate an invitation when %s", async kind => {
  const { tx, invite, issuer, input } = setup()
  if (kind === "missing") tx.invite.findFirst.mockResolvedValue(null)
  if (kind === "changed") invite.updatedAt = new Date(invite.updatedAt.getTime() + 1)
  if (kind === "accepted") { invite.status = "ACCEPTED"; input.request.revision = invitationRevision(invite) }
  if (kind === "issuer") issuer.isLocked = true
  if (kind === "role") invite.role.permissions = ["accounting.period.close"]
  expect((await cancelUserInvitation(input)).status).not.toBe(200); expect(tx.invite.update).not.toHaveBeenCalled()
})
it("replays the original decision but rejects a reused key with different details", async () => {
  const { tx, invite, input } = setup(); await cancelUserInvitation(input)
  tx.businessEvent.findUnique.mockResolvedValue({ ...tx.businessEvent.create.mock.calls[0][0].data, id: "cancellation" }); invite.status = "CANCELLED"
  expect(await cancelUserInvitation(input)).toMatchObject({ status: 200, data: { replayed: true } })
  expect(tx.invite.update).toHaveBeenCalledTimes(1)
  expect(await cancelUserInvitation({ ...input, request: { ...input.request, reason: "Different decision" } })).toMatchObject({ status: 409, code: "INVITATION_REQUEST_CONFLICT" })
})
it("propagates mandatory audit failure so cancellation can roll back", async () => {
  const { tx, input } = setup(); tx.auditLog.create.mockRejectedValue(new Error("audit unavailable"))
  await expect(cancelUserInvitation(input)).rejects.toThrow("audit unavailable")
})
