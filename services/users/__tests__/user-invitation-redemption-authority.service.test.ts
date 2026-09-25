jest.mock("server-only", () => ({}))
import type { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { invitationDigest, USER_INVITATION_EVENT } from "../user-invitation-delivery-contract"
import { readInvitationRedemptionAuthority } from "../user-invitation-redemption-authority.service"

const permissions = ["users.invite", "users.roles.assign", "items.read"]
function setup() {
  const invite = { id: "invite", organizationId: "org", roleId: "reader", email: "reader@example.invalid", token: "a".repeat(64), expiresAt: new Date("2027-01-01T00:00:00Z"), role: { organizationId: "org", permissions: ["items.read"] } }
  const payload = { version: 1, organizationId: "org", inviteId: "invite", actorId: "issuer", roleId: "reader", requestFingerprint: "b".repeat(64), tokenHash: invitationDigest(invite.token), recipientHash: invitationDigest(invite.email), actorPermissions: permissions, rolePermissions: ["items.read"], locale: "en", companyName: "Synthetic", roleName: "Reader", baseUrl: "https://example.invalid", from: "invites@example.invalid", expiresAt: invite.expiresAt.toISOString() }
  const event = { id: "issue", organizationId: "org", eventType: USER_INVITATION_EVENT, eventSource: "API", schemaVersion: 1, status: "APPLIED", actorId: "issuer", sourceId: "invite", payload, payloadHash: hashBusinessPayload(payload) }
  const actor = { id: "issuer", isLocked: false, lockedUntil: null, isVerified: true, emailVerified: true, organization: { name: "Synthetic", isActive: true, deletedAt: null }, roles: [{ permissions }] }
  const mock = { businessEvent: { findMany: jest.fn().mockResolvedValue([event]) }, user: { findFirst: jest.fn().mockResolvedValue(actor) }, $queryRaw: jest.fn() }
  const tx = mock as unknown as Prisma.TransactionClient
  return { invite, payload, event, actor, mock, tx }
}
it("requires stored-grant provenance for a historical role-management invitation", async () => {
  const { invite, payload, event, actor, tx } = setup()
  payload.rolePermissions = ["roles.permissions.remove"]
  payload.actorPermissions = [...permissions, "ASSIGN_ROLES", "roles.permissions.remove"]
  invite.role.permissions = [...payload.rolePermissions]
  actor.roles = [{ permissions: payload.actorPermissions }]
  event.payloadHash = hashBusinessPayload(payload)
  expect(await readInvitationRedemptionAuthority(tx, invite)).toBeNull()
})
it.each([false, true])("rechecks exact stored control authority at redemption (locked=%s)", async locked => {
  const { invite, payload, event, tx, mock } = setup()
  Object.assign(payload, { actorPermissionBasis: "stored-grants", rolePermissions: ["roles.permissions.remove"], actorPermissions: [...permissions, "roles.permissions.remove"] })
  invite.role.permissions = [...payload.rolePermissions]
  event.payloadHash = hashBusinessPayload(payload)
  if (locked) mock.$queryRaw.mockResolvedValueOnce([event]).mockResolvedValueOnce([{ isActive: true, deletedAt: null }]).mockResolvedValueOnce([invite.role]).mockResolvedValueOnce([{ isActive: true, isVerified: true }]).mockResolvedValueOnce([{ permissions }])
  expect(await readInvitationRedemptionAuthority(tx, invite, locked ? tx : undefined)).toBeNull()
})
it("accepts a recorded stored grant that is still held by the issuer", async () => {
  const { invite, payload, event, actor, tx } = setup()
  Object.assign(payload, { actorPermissionBasis: "stored-grants", rolePermissions: ["roles.permissions.remove"], actorPermissions: [...permissions, "roles.permissions.remove"] })
  invite.role.permissions = [...payload.rolePermissions]
  actor.roles = [{ permissions: payload.actorPermissions }]
  event.payloadHash = hashBusinessPayload(payload)
  expect(await readInvitationRedemptionAuthority(tx, invite)).toMatchObject({ issueId: "issue" })
})
it("matches the exact tenant, invitation generation and approved permission set", async () => {
  const { invite, event, tx, mock } = setup()
  expect(await readInvitationRedemptionAuthority(tx, invite)).toEqual({ issueId: "issue", issuerId: "issuer", payloadHash: event.payloadHash, rolePermissions: ["items.read"] })
  expect(mock.businessEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", eventType: USER_INVITATION_EVENT, sourceId: "invite", payload: { path: ["tokenHash"], equals: invitationDigest(invite.token) } }, take: 2 }))
  expect(mock.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "issuer", organizationId: "org", isActive: true } }))
})
it.each(["missing", "ambiguous", "wrongTenant", "wrongInvite", "wrongActor", "wrongRole", "wrongRecipient", "wrongToken", "wrongExpiry", "unapplied", "wrongSource", "wrongSchema", "corruptHash", "unapprovedPermission", "wildcardApproval", "expandedRole", "reducedRole", "foreignRole"])("rejects %s evidence without inferring approval", async kind => {
  const { invite, payload, event, tx, mock } = setup()
  if (kind === "missing") mock.businessEvent.findMany.mockResolvedValue([])
  if (kind === "ambiguous") mock.businessEvent.findMany.mockResolvedValue([event, { ...event, id: "duplicate" }])
  if (kind === "wrongTenant") payload.organizationId = "foreign"
  if (kind === "wrongInvite") payload.inviteId = "foreign-invite"
  if (kind === "wrongActor") event.actorId = "another"
  if (kind === "wrongRole") payload.roleId = "another"
  if (kind === "wrongRecipient") payload.recipientHash = "c".repeat(64)
  if (kind === "wrongToken") payload.tokenHash = "c".repeat(64)
  if (kind === "wrongExpiry") payload.expiresAt = "2028-01-01T00:00:00.000Z"
  if (kind === "unapplied") event.status = "RECORDED"
  if (kind === "wrongSource") event.eventSource = "INTERNAL"
  if (kind === "wrongSchema") event.schemaVersion = 2
  if (kind === "unapprovedPermission") payload.actorPermissions = ["users.invite", "users.roles.assign"]
  if (kind === "wildcardApproval") payload.rolePermissions = ["*"]
  if (kind === "expandedRole") invite.role.permissions.push("users.read")
  if (kind === "reducedRole") invite.role.permissions = []
  if (kind === "foreignRole") invite.role.organizationId = "foreign"
  event.payloadHash = kind === "corruptHash" ? "corrupt" : hashBusinessPayload(payload)
  expect(await readInvitationRedemptionAuthority(tx, invite)).toBeNull()
})
it.each(["missing", "revoked", "locked", "unverified", "disabledOrg"])("rejects a currently %s issuer", async kind => {
  const { invite, actor, tx, mock } = setup()
  if (kind === "missing") mock.user.findFirst.mockResolvedValue(null)
  if (kind === "revoked") actor.roles = [{ permissions: ["items.read"] }]
  if (kind === "locked") actor.isLocked = true
  if (kind === "unverified") { actor.isVerified = false; actor.emailVerified = false }
  if (kind === "disabledOrg") actor.organization.isActive = false
  expect(await readInvitationRedemptionAuthority(tx, invite)).toBeNull()
})
it("holds the issuance, organization, role, issuer and actual memberships through commit", async () => {
  const { invite, event, tx, mock } = setup()
  mock.$queryRaw.mockResolvedValueOnce([event]).mockResolvedValueOnce([{ isActive: true, deletedAt: null }]).mockResolvedValueOnce([invite.role]).mockResolvedValueOnce([{ isActive: true, isLocked: false, isVerified: true }]).mockResolvedValueOnce([{ permissions }])
  expect(await readInvitationRedemptionAuthority(tx, invite, tx)).toMatchObject({ issueId: "issue" })
  expect(mock.user.findFirst).not.toHaveBeenCalled()
  expect(mock.businessEvent.findMany).not.toHaveBeenCalled()
  const statements = mock.$queryRaw.mock.calls.map(call => call[0].join("?"))
  expect(statements.every(sql => sql.includes("FOR SHARE"))).toBe(true)
  expect(statements[4]).toContain('INNER JOIN "_UserRoles" membership')
  expect(statements[4]).toContain("FOR SHARE OF r, membership")
})
it("uses the locked target role rather than the pre-hash role snapshot", async () => {
  const { invite, event, tx, mock } = setup()
  mock.$queryRaw.mockResolvedValueOnce([event]).mockResolvedValueOnce([{ isActive: true, deletedAt: null }]).mockResolvedValueOnce([{ organizationId: "org", permissions: ["items.read", "users.read"] }])
  expect(await readInvitationRedemptionAuthority(tx, invite, tx)).toBeNull()
  expect(mock.$queryRaw).toHaveBeenCalledTimes(3)
})
