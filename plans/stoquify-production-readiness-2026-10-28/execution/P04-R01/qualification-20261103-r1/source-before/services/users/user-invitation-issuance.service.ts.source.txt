import "server-only"
import { randomBytes, randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { invitationIssueInput } from "./invitation-input"
import { invitationRevision } from "./invitation-revision"
import { evaluateRoleGrantAuthority, evaluateRoleGrantPolicy } from "@/services/security/role-grant-policy.service"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { readCurrentInvitationIssuer } from "./user-invitation-authority.service"
import { invitationDeliveryConfiguration, invitationDeliveryPayload, invitationDigest, USER_INVITATION_DELIVERY, USER_INVITATION_EVENT } from "./user-invitation-delivery-contract"

export type InviteWorkflowInput = {
  actor: { id: string; organizationId: string; organizationName?: string | null }
  actorPermissions: readonly string[]; email: string; roleId: string; roleName?: string | null
  requestId?: string; locale?: "en" | "fr"
  replace?: { inviteId: string; revision: string; reason: string }
}
const denied = (error: string, code = "INVITATION_AUTHORITY_CHANGED") => ({ error, status: 403, data: null, code })

export async function issueUserInvitation(input: InviteWorkflowInput) {
  const parsed = invitationIssueInput.safeParse(input)
  if (!parsed.success) return { error: "Enter a valid email and select a role", status: 400, data: null, code: "INVITATION_INPUT_INVALID" }
  if (!input.actor?.id || !input.actor.organizationId || !evaluateRoleGrantAuthority(input.actorPermissions).allowed) return denied("You are not allowed to invite users with roles")
  const { email, roleId, locale = "en" } = parsed.data
  const organizationId = input.actor.organizationId
  const requestId = parsed.data.requestId ?? randomUUID()
  const key = `user-invitation/${requestId}`
  const requestFingerprint = hashBusinessPayload({ organizationId, actorId: input.actor.id, email, roleId, locale, ...(parsed.data.replace ? { replace: parsed.data.replace } : {}) })

  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async tx => {
        const role = await tx.role.findFirst({ where: { id: roleId, organizationId }, select: { id: true, nameEn: true, nameFr: true, code: true, organizationId: true, permissions: true } })
        if (!role) return denied("Invalid role for this organization")
        const policy = evaluateRoleGrantPolicy({ actorOrganizationId: organizationId, actorPermissions: input.actorPermissions, targetRole: role })
        if (!policy.allowed) return denied(policy.safeMessage ?? "You cannot grant the selected role")
        const issuer = await readCurrentInvitationIssuer(tx, { organizationId, actorId: input.actor.id, role })
        if (!issuer) return denied("Invitation authority changed. Refresh your session.")
        const previous = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId, eventSource: "API", idempotencyKey: key } }, include: { outboxMessages: { select: { id: true, status: true } } } })
        if (previous) {
          const evidence = invitationDeliveryPayload.safeParse(previous.payload)
          if (!evidence.success || evidence.data.requestFingerprint !== requestFingerprint || previous.eventType !== USER_INVITATION_EVENT) return { error: "This request reference belongs to different invitation details", status: 409, data: null, code: "INVITATION_REQUEST_CONFLICT" }
          return { error: null, status: 200, data: { inviteId: evidence.data.inviteId, issueId: previous.id, delivery: previous.outboxMessages[0]?.status ?? "UNKNOWN", replayed: true } }
        }
        const configuration = invitationDeliveryConfiguration()
        if (!configuration) return { error: "Invitation sender and application URL need configuration", status: 503, data: null, code: "INVITATION_DELIVERY_NOT_CONFIGURED" }
        const existingUser = await tx.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })
        if (existingUser) return { error: "This email is already in use", status: 409, data: null, code: "INVITATION_ACCOUNT_EXISTS" }
        const existing = await tx.invite.findUnique({ where: { email_organizationId: { email, organizationId } } })
        const replacement = parsed.data.replace
        if (replacement && (!existing || existing.id !== replacement.inviteId || invitationRevision(existing) !== replacement.revision)) return { error: "Invitation changed. Refresh the register before replacing it.", status: 409, data: null, code: "INVITATION_CHANGED" }
        if (!replacement && existing?.status === "PENDING" && existing.expiresAt > new Date()) return { error: "This email already has a pending invitation", status: 409, data: null, code: "INVITATION_PENDING" }
        // Accepted records are historical evidence, including if an account was removed.
        if (existing?.status === "ACCEPTED") return { error: "This invitation was already accepted", status: 409, data: null, code: "INVITATION_ACCOUNT_EXISTS" }
        if (replacement && existing) {
          const previousRole = await tx.role.findFirst({ where: { id: existing.roleId, organizationId }, select: { organizationId: true, permissions: true } })
          if (!previousRole || !evaluateRoleGrantPolicy({ actorOrganizationId: organizationId, actorPermissions: input.actorPermissions, targetRole: previousRole }).allowed || !await readCurrentInvitationIssuer(tx, { organizationId, actorId: input.actor.id, role: previousRole })) return denied("You cannot replace the current invitation role")
        }
        const token = randomBytes(32).toString("hex"), expiresAt = new Date(Date.now() + 7 * 86400000)
        const invite = existing
          ? await tx.invite.update({ where: { id: existing.id }, data: { roleId, token, expiresAt, status: "PENDING" } })
          : await tx.invite.create({ data: { email, organizationId, roleId, token, expiresAt } })
        if (existing) await tx.businessEventOutbox.updateMany({ where: { organizationId, eventName: USER_INVITATION_DELIVERY, businessEvent: { organizationId, sourceId: existing.id }, status: { in: ["PENDING", "FAILED", "DEFERRED"] } }, data: { status: "CANCELLED", lastErrorCode: "INVITATION_REPLACED", lastErrorMessage: null } })
        const payload = invitationDeliveryPayload.parse({
          version: 1, organizationId, inviteId: invite.id, actorId: issuer.actorId, roleId, requestFingerprint,
          tokenHash: invitationDigest(token), recipientHash: invitationDigest(email), actorPermissions: issuer.permissions, actorPermissionBasis: "stored-grants",
          rolePermissions: [...new Set(role.permissions)].sort(), locale, companyName: issuer.companyName,
          roleName: (locale === "fr" ? role.nameFr || role.nameEn : role.nameEn || role.nameFr) || role.code,
          ...configuration, expiresAt: expiresAt.toISOString(),
          ...(replacement ? { replacement: { previousRevision: replacement.revision, reason: replacement.reason } } : {}),
        })
        const payloadHash = hashBusinessPayload(payload)
        const event = await tx.businessEvent.create({ data: {
          organizationId, eventType: USER_INVITATION_EVENT, eventSource: "API", schemaVersion: 1,
          idempotencyKey: key, payload, payloadHash, actorId: issuer.actorId, sourceId: invite.id,
          occurredAt: new Date(), status: "APPLIED", processedAt: new Date(),
          audits: { create: { organizationId, action: "RECORDED", eventSource: "API", actorId: issuer.actorId, payloadHash, reason: "Invitation and delivery request committed together" } },
          outboxMessages: { create: { organizationId, channel: "EMAIL", eventName: USER_INVITATION_DELIVERY, idempotencyKey: key, payload, payloadHash, maxAttempts: 5 } },
        }, select: { id: true } })
        await tx.auditLog.create({ data: { organizationId, userId: issuer.actorId, entityType: "UserInvite", entityId: invite.id, action: "INVITE_CREATED", changes: { issueId: event.id, roleId, rolePermissions: payload.rolePermissions, delivery: "PENDING", previousStatus: existing?.status ?? null, ...(replacement ? { replacedRevision: replacement.revision, reason: replacement.reason } : {}) } } })
        return { error: null, status: 200, data: { inviteId: invite.id, issueId: event.id, delivery: "PENDING", replayed: false } }
      }, { isolationLevel: "Serializable" })
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null
      if (attempt < 2 && (code === "P2034" || code === "P2002")) continue
      throw error
    }
  }
}
