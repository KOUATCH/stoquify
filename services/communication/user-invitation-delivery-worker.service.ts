import "server-only"
import { randomUUID } from "node:crypto"
import type { BusinessOutboxStatus, Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { readCurrentInvitationIssuer } from "@/services/users/user-invitation-authority.service"
import { hasInvitationGrantEvidence, invitationDeliveryPayload, invitationDigest, invitationEmailV1, USER_INVITATION_DELIVERY, USER_INVITATION_EVENT } from "@/services/users/user-invitation-delivery-contract"

export type InvitationDeliveryResult = { state: "accepted"; providerId: string }
  | { state: "retryable" | "rejected" | "unknown"; code: string }
export type InvitationDeliveryAdapter = (mail: ReturnType<typeof invitationEmailV1>, requestKey: string) => Promise<InvitationDeliveryResult>

// There is deliberately no production adapter or network implementation. Default
// execution cannot transmit mail. The injected adapter supports isolated tests;
// connecting a live transport remains an explicitly outstanding review decision.
const SAFE_RETRY_MS = 23 * 60 * 60 * 1000
const LEASE_MS = 5 * 60 * 1000
type DeliveryMetadata = { firstDispatchAt?: string; providerId?: string }
function metadata(value: Prisma.JsonValue | null): DeliveryMetadata | null {
  if (value === null) return {}
  if (typeof value !== "object" || Array.isArray(value)) return null
  const first = value.firstDispatchAt
  if (first !== undefined && (typeof first !== "string" || !Number.isFinite(Date.parse(first)))) return null
  return { ...(typeof first === "string" ? { firstDispatchAt: first } : {}) }
}

export async function runUserInvitationDeliveryWorker(input: { organizationId: string; workerId: string; limit?: number }, adapter?: InvitationDeliveryAdapter) {
  if (!input.organizationId?.trim() || !input.workerId?.trim()) throw new Error("A tenant and worker identity are required")
  if (!adapter) return { state: "disabled", results: [] }
  const now = new Date()
  const eligible: Prisma.BusinessEventOutboxWhereInput = {
    organizationId: input.organizationId, channel: "EMAIL", eventName: USER_INVITATION_DELIVERY,
    OR: [
      { status: { in: ["PENDING", "FAILED"] }, availableAt: { lte: now } },
      { status: "LOCKED", lockedAt: { lt: new Date(now.getTime() - LEASE_MS) } },
    ],
  }
  const rows = await db.businessEventOutbox.findMany({ where: eligible, orderBy: [{ availableAt: "asc" }, { id: "asc" }], take: Math.max(1, Math.min(100, input.limit ?? 25)) })
  const results: { id: string; status: string; code?: string }[] = []
  for (const row of rows) {
    const lease = `${input.workerId.slice(0, 80)}/${randomUUID()}`
    const claimed = await db.businessEventOutbox.updateMany({ where: { ...eligible, id: row.id, attempts: row.attempts, updatedAt: row.updatedAt }, data: { status: "LOCKED", lockedBy: lease, lockedAt: now, attempts: { increment: 1 } } })
    if (claimed.count !== 1) continue
    const fence = { id: row.id, organizationId: input.organizationId, eventName: USER_INVITATION_DELIVERY, status: "LOCKED" as const, lockedBy: lease, attempts: row.attempts + 1 }
    let deliveryMetadata = metadata(row.metadata)
    const settle = async (status: BusinessOutboxStatus, code?: string, providerId?: string) => {
      let settled = false
      await db.$transaction(async tx => {
        const updated = await tx.businessEventOutbox.updateMany({ where: fence, data: {
          status, lockedAt: null, lockedBy: null, lastErrorCode: code ?? null, lastErrorMessage: null,
          processedAt: status === "SENT" ? new Date() : null, failedAt: code ? new Date() : null,
          availableAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** row.attempts)),
          metadata: { ...deliveryMetadata, ...(providerId ? { providerId } : {}) },
        } })
        if (updated.count !== 1) return
        await tx.auditLog.create({ data: { organizationId: input.organizationId, userId: null, entityType: "UserInviteDelivery", entityId: row.id, action: `INVITATION_DELIVERY_${status}`, changes: { businessEventId: row.businessEventId, attempt: row.attempts + 1, code: code ?? null, providerAccepted: status === "SENT" } } })
        settled = true
      })
      results.push({ id: row.id, status: settled ? status : "LEASE_LOST", ...(code ? { code } : {}) })
    }
    const parsed = invitationDeliveryPayload.safeParse(row.payload)
    const evidence = await db.businessEvent.findFirst({ where: { id: row.businessEventId, organizationId: input.organizationId, eventType: USER_INVITATION_EVENT }, select: { payloadHash: true, payload: true, idempotencyKey: true, actorId: true } })
    if (!deliveryMetadata || !parsed.success || parsed.data.organizationId !== input.organizationId || hashBusinessPayload(parsed.data) !== row.payloadHash || !evidence || evidence.payloadHash !== row.payloadHash || hashBusinessPayload(evidence.payload) !== row.payloadHash || evidence.idempotencyKey !== row.idempotencyKey || evidence.actorId !== parsed.data.actorId) {
      await settle("DEAD_LETTER", "INVITATION_DELIVERY_EVIDENCE_INVALID"); continue
    }
    const payload = parsed.data
    if (!hasInvitationGrantEvidence(payload)) { await settle("DEAD_LETTER", "INVITATION_DELIVERY_EVIDENCE_INVALID"); continue }
    const invitation = await db.invite.findFirst({ where: { id: payload.inviteId, organizationId: input.organizationId }, include: { role: { select: { organizationId: true, permissions: true } }, organization: { select: { isActive: true, deletedAt: true } } } })
    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date() || invitation.expiresAt.toISOString() !== payload.expiresAt || invitation.roleId !== payload.roleId || invitationDigest(invitation.token) !== payload.tokenHash || invitationDigest(invitation.email) !== payload.recipientHash || !invitation.organization.isActive || invitation.organization.deletedAt || hashBusinessPayload([...new Set(invitation.role.permissions)].sort()) !== hashBusinessPayload(payload.rolePermissions)) {
      await settle("CANCELLED", "INVITATION_NO_LONGER_CURRENT"); continue
    }
    const issuer = await readCurrentInvitationIssuer(db, { organizationId: input.organizationId, actorId: payload.actorId, role: invitation.role })
    if (!issuer) { await settle("CANCELLED", "INVITATION_AUTHORITY_CHANGED"); continue }
    if (row.attempts >= row.maxAttempts || (deliveryMetadata.firstDispatchAt && Date.now() - Date.parse(deliveryMetadata.firstDispatchAt) >= SAFE_RETRY_MS)) {
      await settle("DEAD_LETTER", "INVITATION_DELIVERY_REVIEW_REQUIRED"); continue
    }
    deliveryMetadata = { ...deliveryMetadata, firstDispatchAt: deliveryMetadata.firstDispatchAt ?? new Date().toISOString() }
    const reserved = await db.businessEventOutbox.updateMany({ where: fence, data: { metadata: deliveryMetadata } })
    if (reserved.count !== 1) { results.push({ id: row.id, status: "LEASE_LOST" }); continue }
    let response: InvitationDeliveryResult
    try { response = await adapter(invitationEmailV1(payload, invitation.email, invitation.token), row.idempotencyKey) }
    catch { response = { state: "unknown", code: "INVITATION_PROVIDER_OUTCOME_UNKNOWN" } }
    if (response.state === "accepted") await settle("SENT", undefined, response.providerId)
    else await settle(response.state === "rejected" ? "DEAD_LETTER" : "FAILED", response.code)
  }
  return { state: "processed", results }
}
