import "server-only"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { evaluateRoleGrantAuthority, evaluateRoleGrantPolicy, INVITATION_ROLE_GRANT_PERMISSIONS } from "@/services/security/role-grant-policy.service"
import { readCurrentInvitationIssuer } from "./user-invitation-authority.service"
import { readInvitationRedemptionAuthority } from "./user-invitation-redemption-authority.service"
import { invitationCancellationInput } from "./invitation-input"
import { hasInvitationGrantEvidence, invitationDeliveryPayload, USER_INVITATION_DELIVERY, USER_INVITATION_EVENT } from "./user-invitation-delivery-contract"

export const INVITATION_HISTORY_PERMISSIONS = ["users.read", ...INVITATION_ROLE_GRANT_PERMISSIONS] as const
const cancellationEvent = "identity.user_invitation.cancelled.v1"
const requestSchema = z.object({ inviteId: z.string().trim().min(1).max(191), cursor: z.string().min(1).max(191).optional() })
const cancellationPayload = invitationCancellationInput.extend({ actorId: z.string().min(1), organizationId: z.string().min(1) }).strict()
const pageSize = 20

export type InvitationHistory = {
  asOf: string; inviteId: string; status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED"
  reviewRequired: boolean; transport: "disabled"; acceptedAt: string | null
  entries: {
    id: string; kind: "issued" | "replaced" | "cancelled"; recordedAt: string
    evidenceValid: boolean; actorName: string | null; roleName: string | null; reason: string | null
    delivery: { status: string; attempts: number; checkedAt: string; recovery: "none" | "review" | "waiting" } | null
  }[]
  nextCursor: string | null
}

export async function readUserInvitationHistory(input: {
  actorId: string; organizationId: string; actorPermissions: readonly string[]; request: unknown
}): Promise<{ status: number; error: string | null; data: InvitationHistory | null; code?: string }> {
  const parsed = requestSchema.safeParse(input.request)
  if (!parsed.success) return { status: 400, error: "Select an invitation", data: null, code: "INVITATION_INPUT_INVALID" }
  if (!input.actorId || !input.organizationId || !hasRbacPermission(input.actorPermissions, "users.read") || !evaluateRoleGrantAuthority(input.actorPermissions).allowed) return { status: 403, error: "Invitation review authority is required", data: null, code: "FORBIDDEN" }
  return db.$transaction(async tx => {
    const invite = await tx.invite.findFirst({ where: { id: parsed.data.inviteId, organizationId: input.organizationId }, include: { role: { select: { organizationId: true, permissions: true } } } })
    if (!invite) return { status: 404, error: "Invitation is unavailable", data: null, code: "INVITATION_UNAVAILABLE" }
    if (!evaluateRoleGrantPolicy({ actorOrganizationId: input.organizationId, actorPermissions: input.actorPermissions, targetRole: invite.role }).allowed) return { status: 403, error: "Invitation review authority changed", data: null, code: "FORBIDDEN" }
    const reviewer = await readCurrentInvitationIssuer(tx, { organizationId: input.organizationId, actorId: input.actorId, role: invite.role })
    if (!reviewer || !hasRbacPermission(reviewer.permissions, "users.read")) return { status: 403, error: "Invitation review authority changed", data: null, code: "FORBIDDEN" }
    const scope = { organizationId: input.organizationId, sourceId: invite.id, eventType: { in: [USER_INVITATION_EVENT, cancellationEvent] } }
    const cursor = parsed.data.cursor ? await tx.businessEvent.findFirst({ where: { ...scope, id: parsed.data.cursor }, select: { id: true, recordedAt: true } }) : null
    if (parsed.data.cursor && !cursor) return { status: 404, error: "History page is unavailable. Refresh the history.", data: null, code: "INVITATION_UNAVAILABLE" }
    const events = await tx.businessEvent.findMany({
      where: { ...scope, ...(cursor ? { OR: [{ recordedAt: { lt: cursor.recordedAt } }, { recordedAt: cursor.recordedAt, id: { lt: cursor.id } }] } : {}) },
      orderBy: [{ recordedAt: "desc" }, { id: "desc" }], take: pageSize + 1,
      select: { id: true, eventType: true, eventSource: true, schemaVersion: true, actorId: true, status: true, payload: true, payloadHash: true, idempotencyKey: true, recordedAt: true,
        outboxMessages: { where: { organizationId: input.organizationId, channel: "EMAIL", eventName: USER_INVITATION_DELIVERY }, take: 2,
          select: { status: true, attempts: true, updatedAt: true, payload: true, payloadHash: true, idempotencyKey: true } } },
    })
    const actorIds = [...new Set(events.slice(0, pageSize).flatMap(row => row.actorId ? [row.actorId] : []))]
    const actors = actorIds.length ? await tx.user.findMany({ where: { organizationId: input.organizationId, id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true, name: true } }) : []
    const accepted = invite.status === "ACCEPTED" ? await tx.auditLog.findFirst({ where: { organizationId: input.organizationId, action: "INVITE_REDEEMED", changes: { path: ["inviteId"], equals: invite.id } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }) : null
    const status = invite.status === "PENDING" && invite.expiresAt <= new Date() ? "EXPIRED" : invite.status
    const reviewRequired = status === "PENDING" && !await readInvitationRedemptionAuthority(tx, invite)
    const entries: InvitationHistory["entries"] = events.slice(0, pageSize).map(event => {
      const issued = event.eventType === USER_INVITATION_EVENT ? invitationDeliveryPayload.safeParse(event.payload) : null
      const cancelled = event.eventType === cancellationEvent ? cancellationPayload.safeParse(event.payload) : null
      const payload = issued?.success ? issued.data : cancelled?.success ? cancelled.data : null
      const evidenceValid = Boolean(payload && payload.organizationId === input.organizationId && payload.inviteId === invite.id && payload.actorId === event.actorId && event.eventSource === "API" && event.schemaVersion === 1 && event.status === "APPLIED" && hashBusinessPayload(event.payload) === event.payloadHash
        && (!issued?.success || hasInvitationGrantEvidence(issued.data)))
      const actor = evidenceValid ? actors.find(row => row.id === event.actorId) : null
      const queued = event.outboxMessages.length === 1 ? event.outboxMessages[0] : null
      const delivery = evidenceValid && issued?.success && queued && queued.idempotencyKey === event.idempotencyKey && queued.payloadHash === event.payloadHash && hashBusinessPayload(queued.payload) === event.payloadHash ? queued : null
      return {
        id: event.id, recordedAt: event.recordedAt.toISOString(), evidenceValid,
        kind: event.eventType === cancellationEvent ? "cancelled" : evidenceValid && issued?.success && issued.data.replacement ? "replaced" : "issued",
        actorName: actor ? ([actor.firstName, actor.lastName].filter(Boolean).join(" ") || actor.name || null) : null,
        roleName: evidenceValid && issued?.success ? issued.data.roleName : null,
        reason: !evidenceValid ? null : issued?.success ? issued.data.replacement?.reason ?? null : cancelled?.success ? cancelled.data.reason : null,
        delivery: delivery ? { status: delivery.status, attempts: delivery.attempts, checkedAt: delivery.updatedAt.toISOString(), recovery: delivery.status === "DEAD_LETTER" ? "review" : ["PENDING", "FAILED", "DEFERRED", "LOCKED"].includes(delivery.status) ? "waiting" : "none" } : null,
      }
    })
    return { status: 200, error: null, data: { asOf: new Date().toISOString(), inviteId: invite.id, status, reviewRequired, transport: "disabled", acceptedAt: accepted?.createdAt.toISOString() ?? null, entries, nextCursor: events.length > pageSize ? events[pageSize - 1].id : null } }
  }, { isolationLevel: "RepeatableRead" })
}
