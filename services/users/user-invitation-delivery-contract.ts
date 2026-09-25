import { createHash } from "node:crypto"
import { z } from "zod"
import { isRoleControlPermission } from "@/services/roles/role-permission-policy"
import { evaluateRoleGrantPolicy } from "@/services/security/role-grant-policy.service"

export const USER_INVITATION_EVENT = "identity.user_invitation.issued.v1"
export const USER_INVITATION_DELIVERY = "identity.user_invitation.email.v1"
export const invitationDigest = (value: string) => createHash("sha256").update(value).digest("hex")

// No bearer token or recipient address is copied into the event/outbox. The
// worker resolves them only from the current invitation and verifies both hashes.
export const invitationDeliveryPayload = z.object({
  version: z.literal(1), organizationId: z.string().min(1), inviteId: z.string().min(1),
  actorId: z.string().min(1), roleId: z.string().min(1), requestFingerprint: z.string().length(64),
  tokenHash: z.string().length(64), recipientHash: z.string().length(64),
  actorPermissions: z.array(z.string()), rolePermissions: z.array(z.string()),
  actorPermissionBasis: z.literal("stored-grants").optional(),
  locale: z.enum(["en", "fr"]), companyName: z.string(), roleName: z.string(),
  baseUrl: z.string().url(), from: z.string().email(), expiresAt: z.string().datetime(),
  replacement: z.object({ previousRevision: z.string().length(64), reason: z.string().min(3).max(500) }).optional(),
}).strict()
export type InvitationDeliveryPayload = z.infer<typeof invitationDeliveryPayload>

export function hasInvitationGrantEvidence(payload: InvitationDeliveryPayload) {
  if (payload.rolePermissions.some(isRoleControlPermission) && payload.actorPermissionBasis !== "stored-grants") return false
  return evaluateRoleGrantPolicy({ actorOrganizationId: payload.organizationId, actorPermissions: payload.actorPermissions,
    targetRole: { organizationId: payload.organizationId, permissions: payload.rolePermissions } }).allowed
}

export function invitationDeliveryConfiguration(environment = process.env) {
  const from = environment.STOQUIFY_USER_INVITE_FROM_EMAIL || environment.RESEND_FROM_EMAIL
  const configured = environment.NEXT_PUBLIC_BASE_URL || environment.AUTH_URL
  if (!from || !z.string().email().safeParse(from).success || !configured) return null
  try {
    const url = new URL(configured)
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(local && url.protocol === "http:"))) return null
    return { from, baseUrl: url.origin }
  } catch { return null }
}

// Version 1 rendering is frozen so retries keep identical provider bytes.
export function invitationEmailV1(payload: InvitationDeliveryPayload, email: string, token: string) {
  const link = `${payload.baseUrl}/${payload.locale}/user-invite/invitation?token=${encodeURIComponent(token)}`
  const subject = payload.locale === "fr" ? `Invitation à rejoindre ${payload.companyName}` : `Invitation to join ${payload.companyName}`
  const text = payload.locale === "fr"
    ? `Vous êtes invité(e) à rejoindre ${payload.companyName} dans Stoquify avec le rôle ${payload.roleName}.\n\nCréez votre compte :\n${link}\n\nCe lien expire le ${payload.expiresAt} (UTC). Vos accès dépendent du rôle autorisé.\nSi vous ne reconnaissez pas cette invitation, contactez votre administrateur et ne partagez pas ce lien.`
    : `You are invited to join ${payload.companyName} in Stoquify with the ${payload.roleName} role.\n\nCreate your account:\n${link}\n\nThis link expires at ${payload.expiresAt} (UTC). Your access depends on the authorized role.\nIf you do not recognize this invitation, contact your administrator and do not share this link.`
  return { from: payload.from, to: email, subject, text }
}
