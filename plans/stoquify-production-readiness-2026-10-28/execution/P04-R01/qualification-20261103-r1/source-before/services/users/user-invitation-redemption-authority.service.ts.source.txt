import "server-only"
import type { BusinessEvent, Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { evaluateRoleGrantPolicy } from "@/services/security/role-grant-policy.service"
import { readCurrentInvitationIssuer } from "./user-invitation-authority.service"
import { hasInvitationGrantEvidence, invitationDeliveryPayload, invitationDigest, USER_INVITATION_EVENT } from "./user-invitation-delivery-contract"

type Invitation = {
  id: string; organizationId: string; roleId: string; email: string; token: string; expiresAt: Date
  role: { organizationId: string; permissions: string[] }
}
type Evidence = Pick<BusinessEvent, "id" | "organizationId" | "eventType" | "eventSource" | "schemaVersion" | "status" | "actorId" | "sourceId" | "payload" | "payloadHash">
type Reader = Pick<Prisma.TransactionClient, "businessEvent" | "user">
const samePermissions = (a: readonly string[], b: readonly string[]) =>
  JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort())

// The public preview is advisory. Redemption calls this again with a transaction
// after password hashing, holding the authority rows until account/audit commit.
export async function readInvitationRedemptionAuthority(tx: Reader, invite: Invitation, lock?: Prisma.TransactionClient) {
  const tokenHash = invitationDigest(invite.token)
  const events = lock
    ? await lock.$queryRaw<Evidence[]>`
      SELECT e.id, e."organizationId", e."eventType", e."eventSource", e."schemaVersion",
        e.status, e."actorId", e."sourceId", e.payload, e."payloadHash"
      FROM business_events e
      WHERE e."organizationId" = ${invite.organizationId} AND e."eventType" = ${USER_INVITATION_EVENT}
        AND e."sourceId" = ${invite.id} AND e.payload->>'tokenHash' = ${tokenHash}
      ORDER BY e.id LIMIT 2 FOR SHARE OF e`
    : await tx.businessEvent.findMany({
      where: { organizationId: invite.organizationId, eventType: USER_INVITATION_EVENT, sourceId: invite.id, payload: { path: ["tokenHash"], equals: tokenHash } },
      orderBy: { id: "asc" }, take: 2,
      select: { id: true, organizationId: true, eventType: true, eventSource: true, schemaVersion: true, status: true, actorId: true, sourceId: true, payload: true, payloadHash: true },
    })
  // Never infer a signer or permission decision for an older, unrecorded link.
  if (events.length !== 1) return null
  const event = events[0], parsed = invitationDeliveryPayload.safeParse(event.payload)
  if (!parsed.success || event.status !== "APPLIED" || event.eventSource !== "API" || event.schemaVersion !== 1
    || event.eventType !== USER_INVITATION_EVENT || event.sourceId !== invite.id
    || event.organizationId !== invite.organizationId || event.payloadHash !== hashBusinessPayload(event.payload)) return null
  const payload = parsed.data
  if (payload.organizationId !== invite.organizationId || payload.inviteId !== invite.id || payload.roleId !== invite.roleId
    || payload.actorId !== event.actorId || payload.tokenHash !== tokenHash
    || payload.recipientHash !== invitationDigest(invite.email.trim().toLowerCase())
    || payload.expiresAt !== invite.expiresAt.toISOString()
    || !hasInvitationGrantEvidence(payload)) return null

  if (lock) {
    const organizations = await lock.$queryRaw<{ isActive: boolean; deletedAt: Date | null }[]>`
      SELECT "isActive", "deletedAt" FROM organizations WHERE id = ${invite.organizationId} FOR SHARE`
    if (!organizations[0]?.isActive || organizations[0].deletedAt) return null
    const roles = await lock.$queryRaw<{ organizationId: string; permissions: string[] }[]>`
      SELECT "organizationId", permissions FROM roles
      WHERE id = ${invite.roleId} AND "organizationId" = ${invite.organizationId} FOR SHARE`
    const role = roles[0]
    if (!role || !samePermissions(role.permissions, payload.rolePermissions)) return null
    const actors = await lock.$queryRaw<{ isActive: boolean; isLocked: boolean; lockedUntil: Date | null; isVerified: boolean; emailVerified: boolean }[]>`
      SELECT "isActive", "isLocked", "lockedUntil", "isVerified", "emailVerified" FROM users
      WHERE id = ${payload.actorId} AND "organizationId" = ${invite.organizationId} FOR SHARE`
    const actor = actors[0]
    if (!actor?.isActive || (actor.isLocked && (!actor.lockedUntil || actor.lockedUntil > new Date()))
      || (!actor.isVerified && !actor.emailVerified)) return null
    // Lock both the role and its membership: deleting the assignment revokes
    // authority even if the role itself has not changed. Use these locked rows,
    // not a later read that could include newly added, unlocked memberships.
    const actorRoles = await lock.$queryRaw<{ permissions: string[] }[]>`
      SELECT r.permissions FROM roles r INNER JOIN "_UserRoles" membership ON membership."A" = r.id
      WHERE membership."B" = ${payload.actorId} AND r."organizationId" = ${invite.organizationId}
      ORDER BY r.id FOR SHARE OF r, membership`
    const actorPermissions = actorRoles.flatMap(row => row.permissions)
    if (!evaluateRoleGrantPolicy({ actorOrganizationId: invite.organizationId, actorPermissions, targetRole: role }).allowed) return null
  } else {
    if (invite.role.organizationId !== invite.organizationId || !samePermissions(invite.role.permissions, payload.rolePermissions)
      || !await readCurrentInvitationIssuer(tx, { organizationId: invite.organizationId, actorId: payload.actorId, role: invite.role })) return null
  }
  return { issueId: event.id, issuerId: payload.actorId, payloadHash: event.payloadHash, rolePermissions: payload.rolePermissions }
}
