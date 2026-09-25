import "server-only"
import { db } from "@/prisma/db"
import { invitationCancellationInput } from "./invitation-input"
import { invitationRevision } from "./invitation-revision"
import { readCurrentInvitationIssuer } from "./user-invitation-authority.service"
import { evaluateRoleGrantAuthority, evaluateRoleGrantPolicy } from "@/services/security/role-grant-policy.service"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { USER_INVITATION_DELIVERY } from "./user-invitation-delivery-contract"

export async function cancelUserInvitation(input: {
  actorId: string; organizationId: string; actorPermissions: readonly string[]
  request: unknown
}) {
  const parsed = invitationCancellationInput.safeParse(input.request)
  if (!parsed.success) return { status: 400, error: "Select an invitation and enter a cancellation reason", data: null, code: "INVITATION_INPUT_INVALID" }
  if (!input.actorId || !input.organizationId || !evaluateRoleGrantAuthority(input.actorPermissions).allowed) return { status: 403, error: "Invitation authority is required", data: null, code: "FORBIDDEN" }
  const request = parsed.data, key = `user-invitation-cancel/${request.requestId}`
  const fingerprint = hashBusinessPayload({ ...request, actorId: input.actorId, organizationId: input.organizationId })
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async tx => {
        const invite = await tx.invite.findFirst({ where: { id: request.inviteId, organizationId: input.organizationId }, include: { role: { select: { organizationId: true, permissions: true } } } })
        if (!invite) return { status: 404, error: "Invitation is unavailable", data: null, code: "INVITATION_UNAVAILABLE" }
        if (!evaluateRoleGrantPolicy({ actorOrganizationId: input.organizationId, actorPermissions: input.actorPermissions, targetRole: invite.role }).allowed || !await readCurrentInvitationIssuer(tx, { actorId: input.actorId, organizationId: input.organizationId, role: invite.role })) return { status: 403, error: "Current invitation authority is required", data: null, code: "INVITATION_AUTHORITY_CHANGED" }
        const existing = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: input.organizationId, eventSource: "API", idempotencyKey: key } } })
        if (existing) {
          if (existing.payloadHash !== fingerprint || existing.eventType !== "identity.user_invitation.cancelled.v1") return { status: 409, error: "Request reference belongs to different details", data: null, code: "INVITATION_REQUEST_CONFLICT" }
          return { status: 200, error: null, data: { inviteId: invite.id, cancellationId: existing.id, replayed: true } }
        }
        if (invitationRevision(invite) !== request.revision) return { status: 409, error: "Invitation changed. Refresh before cancelling.", data: null, code: "INVITATION_CHANGED" }
        if (invite.status === "ACCEPTED") return { status: 409, error: "Accepted invitations cannot be cancelled. Manage the user's access instead.", data: null, code: "INVITATION_ALREADY_ACCEPTED" }
        if (invite.status === "CANCELLED") return { status: 409, error: "This invitation is already cancelled", data: null, code: "INVITATION_CHANGED" }
        await tx.invite.update({ where: { id: invite.id }, data: { status: "CANCELLED" } })
        const event = await tx.businessEvent.create({ data: { organizationId: input.organizationId, eventType: "identity.user_invitation.cancelled.v1", eventSource: "API", idempotencyKey: key, payloadHash: fingerprint, payload: { ...request, actorId: input.actorId, organizationId: input.organizationId }, actorId: input.actorId, sourceId: invite.id, occurredAt: new Date(), status: "APPLIED", processedAt: new Date(), audits: { create: { organizationId: input.organizationId, action: "RECORDED", actorId: input.actorId, eventSource: "API", payloadHash: fingerprint, reason: request.reason } } }, select: { id: true } })
        // Acceptance/delivery receipts remain historical. Cancelling a link cannot
        // recall an email already accepted by its provider or stop an in-flight call.
        await tx.businessEventOutbox.updateMany({ where: { organizationId: input.organizationId, eventName: USER_INVITATION_DELIVERY, businessEvent: { sourceId: invite.id, organizationId: input.organizationId }, status: { in: ["PENDING", "FAILED", "DEFERRED"] } }, data: { status: "CANCELLED", lastErrorCode: "INVITATION_CANCELLED", lastErrorMessage: null } })
        await tx.auditLog.create({ data: { organizationId: input.organizationId, userId: input.actorId, entityType: "UserInvite", entityId: invite.id, action: "INVITE_CANCELLED", changes: { cancellationId: event.id, previousStatus: invite.status, previousRevision: request.revision, reason: request.reason } } })
        return { status: 200, error: null, data: { inviteId: invite.id, cancellationId: event.id, replayed: false } }
      }, { isolationLevel: "Serializable" })
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null
      if (attempt < 2 && (code === "P2034" || code === "P2002")) continue
      throw error
    }
  }
}
