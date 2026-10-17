import "server-only"
import { z } from "zod"
import { db } from "@/prisma/db"
import { ConflictError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { runBusinessEventOutboxWorker } from "@/services/events/business-event-outbox.service"
import { MISSING_CLOSE_EVIDENCE_VISIBILITY, MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY } from "./missing-close-evidence-request-queue-contracts"
import { MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY } from "./missing-close-evidence-response-acceptance-contracts"

export const CLOSE_EVIDENCE_NOTIFICATION_EVENTS = [
  "close.assurance.missing_evidence.requested",
  "close.assurance.missing_evidence.response_submitted",
  "close.assurance.missing_evidence.response_accepted",
] as const
const inputSchema = z.object({ organizationId: z.string().trim().min(1).max(128), workerId: z.string().trim().min(1).max(128), limit: z.number().int().min(1).max(100).default(25) }).strict()
const id = z.string().min(1)
const eventSchema = z.object({ periodId: id, closeRunId: id, findingId: id, requestId: id, correlationId: id,
  responseId: id.optional(), acceptanceId: id.optional(), recipientChangeId: id.optional(), ownerId: id,
  message: id, severity: id, dueAt: z.string().nullable(), requestedFromId: id.optional(), respondedById: id.optional() }).passthrough()
const notificationSchema = z.object({ notification: z.object({ type: z.enum(CLOSE_EVIDENCE_NOTIFICATION_EVENTS), ownerId: id, severity: id, dueAt: z.string().nullable(), status: z.literal("UNREAD") }),
  evidenceRef: z.object({ periodId: id, closeRunId: id, findingId: id }), correlationId: id, message: id })
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

/** Internal, tenant-explicit publication. The existing outbox owns retry and
 * acknowledgement. A committed publication survives a lost acknowledgement;
 * the unique outbox key prevents a second inbox item on retry. */
export async function runCloseEvidenceNotificationWorker(input: z.input<typeof inputSchema>) {
  const args = inputSchema.parse(input)
  return runBusinessEventOutboxWorker({ ...args, channels: ["NOTIFICATION"], eventNames: [...CLOSE_EVIDENCE_NOTIFICATION_EVENTS] }, async message => {
    await db.$transaction(async tx => {
      const retained = await tx.businessEventOutbox.findFirst({ where: { id: message.id, organizationId: args.organizationId,
        channel: "NOTIFICATION", eventName: { in: [...CLOSE_EVIDENCE_NOTIFICATION_EVENTS] }, status: "LOCKED", lockedBy: args.workerId,
        attempts: message.attempts, lockedAt: message.lockedAt }, include: { businessEvent: true } })
      const invalid = () => new ConflictError("Close notification source or delivery lease requires review.")
      if (!retained || message.organizationId !== args.organizationId || message.eventName !== retained.eventName || retained.payloadHash !== message.payloadHash
        || hashBusinessPayload(retained.payload) !== retained.payloadHash || hashBusinessPayload(message.payload) !== retained.payloadHash) throw invalid()
      const event = retained.businessEvent, payload = eventSchema.parse(event.payload), notice = notificationSchema.parse(retained.payload)
      if (event.organizationId !== args.organizationId || event.eventType !== retained.eventName || event.eventSource !== "SYSTEM" || event.sourceType !== "MANUAL"
        || event.sourceId !== payload.findingId || !event.actorId || hashBusinessPayload(event.payload) !== event.payloadHash
        || notice.notification.type !== event.eventType || notice.notification.ownerId !== payload.ownerId || notice.notification.severity !== payload.severity
        || notice.notification.dueAt !== payload.dueAt || notice.message !== payload.message || notice.correlationId !== payload.correlationId
        || Object.entries(notice.evidenceRef).some(([key, value]) => payload[key] !== value)
        || retained.idempotencyKey !== `${event.idempotencyKey}:notification`) throw invalid()
      const scope = { organizationId: args.organizationId, periodId: payload.periodId, closeRunId: payload.closeRunId, findingId: payload.findingId }
      const request = await tx.accountantComment.findFirst({ where: { ...scope, id: payload.requestId, visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY } })
      if (!request || object(request.metadata).requestType !== "MISSING_CLOSE_EVIDENCE" || !request.authorId
        || object(request.metadata).requestedById !== request.authorId
        || !await tx.closeAssuranceFinding.findFirst({ where: { id: payload.findingId, organizationId: args.organizationId, periodId: payload.periodId, closeRunId: payload.closeRunId }, select: { id: true } })) throw invalid()
      let auditId = request.id, auditAction = "CLOSE_MISSING_EVIDENCE_REQUESTED"
      if (event.eventType === CLOSE_EVIDENCE_NOTIFICATION_EVENTS[0]) {
        if (payload.responseId || payload.acceptanceId || payload.ownerId !== payload.requestedFromId) throw invalid()
        if (payload.recipientChangeId) {
          const change = await tx.ledgerAuditEvent.findFirst({ where: { id: payload.recipientChangeId, organizationId: args.organizationId,
            action: "CLOSE_MISSING_EVIDENCE_RECIPIENT_REPLACED", resourceType: "AccountantComment", resourceId: request.id, actorId: event.actorId } })
          const data = object(change?.metadata)
          if (!change || data.requestId !== request.id || data.findingId !== payload.findingId || data.periodId !== payload.periodId || data.closeRunId !== payload.closeRunId
            || data.toId !== payload.ownerId || data.fromId !== payload.previousRequestedFromId || data.correlationId !== payload.correlationId) throw invalid()
          auditAction = "CLOSE_MISSING_EVIDENCE_RECIPIENT_REPLACED"
        } else if (request.authorId !== event.actorId || request.correlationId !== payload.correlationId || object(request.metadata).requestedFromId !== payload.ownerId) throw invalid()
      } else {
        if (!payload.responseId || payload.recipientChangeId) throw invalid()
        const response = await tx.accountantComment.findFirst({ where: { ...scope, id: payload.responseId, visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY } })
        if (!response || object(response.metadata).requestId !== request.id || response.authorId !== payload.respondedById || object(response.metadata).respondedById !== response.authorId) throw invalid()
        if (event.eventType === CLOSE_EVIDENCE_NOTIFICATION_EVENTS[1]) {
          if (payload.acceptanceId || response.authorId !== event.actorId || response.correlationId !== payload.correlationId || payload.ownerId !== request.authorId) throw invalid()
          auditId = response.id; auditAction = "CLOSE_MISSING_EVIDENCE_RESPONSE_SUBMITTED"
        } else {
          if (!payload.acceptanceId) throw invalid()
          const acceptance = await tx.accountantComment.findFirst({ where: { ...scope, id: payload.acceptanceId, visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY } })
          const data = object(acceptance?.metadata)
          if (!acceptance || acceptance.authorId !== event.actorId || acceptance.authorId === response.authorId || acceptance.correlationId !== payload.correlationId
            || data.requestId !== request.id || data.responseId !== response.id || data.decision !== "ACCEPTED" || payload.ownerId !== response.authorId) throw invalid()
          auditId = acceptance.id; auditAction = "CLOSE_MISSING_EVIDENCE_RESPONSE_ACCEPTED"
        }
      }
      if (!await tx.ledgerAuditEvent.findFirst({ where: { organizationId: args.organizationId, action: auditAction, resourceType: "AccountantComment", resourceId: auditId,
        actorId: event.actorId, metadata: { path: ["correlationId"], equals: payload.correlationId } }, select: { id: true } })) throw invalid()
      await tx.closeEvidenceNotification.createMany({ data: [{ organizationId: args.organizationId, outboxId: retained.id,
        periodId: payload.periodId, findingId: payload.findingId, requestId: request.id, responseId: payload.responseId ?? null,
        eventName: retained.eventName, payloadHash: retained.payloadHash }], skipDuplicates: true })
      const published = await tx.closeEvidenceNotification.findUnique({ where: { organizationId_outboxId: { organizationId: args.organizationId, outboxId: retained.id } } })
      if (!published || published.organizationId !== args.organizationId || published.payloadHash !== retained.payloadHash || published.periodId !== payload.periodId
        || published.findingId !== payload.findingId || published.requestId !== request.id || published.responseId !== (payload.responseId ?? null) || published.eventName !== retained.eventName) throw invalid()
    })
  })
}
