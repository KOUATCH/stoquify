import { createHash } from "node:crypto"

// An optimistic revision of the controlled invitation fields. This is not a
// signature or authorization; every mutation still reloads current authority.
export function invitationRevision(invite: {
  id: string; organizationId: string; email: string; roleId: string; status: string
  expiresAt: Date; updatedAt: Date
}) {
  return createHash("sha256").update(JSON.stringify([
    invite.id, invite.organizationId, invite.email, invite.roleId, invite.status,
    invite.expiresAt.toISOString(), invite.updatedAt.toISOString(),
  ])).digest("hex")
}
