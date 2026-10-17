import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { assertCloseEvidenceActor, type CloseEvidenceActor } from "./close-evidence-workflow.service"
import { lockCloseEvidenceAcceptanceAuthorityInTx } from "./close-evidence-acceptance-authority.service"
import { runMissingCloseEvidenceTransaction } from "./close-assurance.service"
import { readCloseAssessmentPublicationTimeInTx } from "./close-assessment-order.service"
import { CLOSE_EVIDENCE_NOTIFICATION_EVENTS } from "./close-evidence-notification.worker"

const id = z.string().trim().min(1).max(200)
export const closeNotificationOperationsInput = z.object({ periodId: id, before: z.object({ id, createdAt: z.string().datetime() }).strict().optional() }).strict()
export const retryCloseNotificationInput = z.object({ periodId: id, outboxId: id, expectedRevision: z.string().min(64).max(71), reason: z.string().trim().min(10).max(2000), correlationId: id }).strict()
const recoveryAction = "CLOSE_NOTIFICATION_RETRY_REQUESTED"
const include = { businessEvent: true, closeEvidenceNotification: true } as const
type Row = Prisma.BusinessEventOutboxGetPayload<{ include: typeof include }>
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const scope = (organizationId: string, periodId: string) => ({ organizationId, channel: "NOTIFICATION" as const, eventName: { in: [...CLOSE_EVIDENCE_NOTIFICATION_EVENTS] }, businessEvent: { organizationId, payload: { path: ["periodId"], equals: periodId } } })
function inspect(row: Row, organizationId: string, periodId: string, now: Date) {
  const event = row.businessEvent, payload = object(event.payload), notice = object(row.payload), ref = object(notice.evidenceRef), publication = row.closeEvidenceNotification
  const sourceValid = row.organizationId === organizationId && event.organizationId === organizationId && payload.periodId === periodId && ref.periodId === periodId && ref.findingId === payload.findingId && ref.closeRunId === payload.closeRunId &&
    row.channel === "NOTIFICATION" && event.eventSource === "SYSTEM" && event.sourceType === "MANUAL" && event.sourceId === payload.findingId && event.eventType === row.eventName && object(notice.notification).type === row.eventName &&
    typeof payload.requestId === "string" && hashBusinessPayload(row.payload) === row.payloadHash && hashBusinessPayload(event.payload) === event.payloadHash && row.idempotencyKey === `${event.idempotencyKey}:notification`
  const publicationValid = publication && sourceValid && publication.organizationId === organizationId && publication.periodId === periodId && publication.findingId === payload.findingId && publication.requestId === payload.requestId && publication.responseId === (payload.responseId ?? null) && publication.eventName === row.eventName && publication.payloadHash === row.payloadHash
  const reason = !sourceValid || (publication && !publicationValid) ? "SOURCE_REVIEW" as const
    : row.status === "LOCKED" ? "WORKER_LEASE" as const
    : row.status === "CANCELLED" || row.status === "DEFERRED" ? "POLICY_HOLD" as const
    : row.status === "PENDING" ? "ALREADY_QUEUED" as const
    : row.status === "SENT" && publication ? "PUBLISHED" as const
    : row.status === "FAILED" && row.availableAt > now ? "BACKOFF" as const
    : "RETRY_AVAILABLE" as const
  return { id: row.id, eventName: row.eventName, requestId: sourceValid ? payload.requestId as string : null, status: row.status, attempts: row.attempts, maxAttempts: row.maxAttempts,
    availableAt: row.availableAt.toISOString(), createdAt: row.createdAt.toISOString(), publishedAt: publicationValid ? publication.publishedAt.toISOString() : null,
    reason, revision: hashBusinessPayload({ outbox: row, publication }), retryAvailable: reason === "RETRY_AVAILABLE" }
}

export async function getCloseNotificationOperations(actor: CloseEvidenceActor, input: z.input<typeof closeNotificationOperationsInput>) {
  const { periodId, before } = closeNotificationOperationsInput.parse(input)
  const authority = await assertCloseEvidenceActor(actor, "accounting.close.accountant.review")
  const result = await db.$transaction(async tx => {
    if (!await tx.accountingPeriod.findFirst({ where: { organizationId: actor.organizationId, id: periodId }, select: { id: true } })) throw new NotFoundError()
    const now = new Date(), rows = await tx.businessEventOutbox.findMany({ where: { ...scope(actor.organizationId, periodId), ...(before ? { OR: [{ createdAt: { lt: new Date(before.createdAt) } }, { createdAt: new Date(before.createdAt), id: { lt: before.id } }] } : {}) }, include, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51 })
    const last = rows[49]
    return { items: rows.slice(0, 50).map(row => inspect(row, actor.organizationId, periodId, now)), next: rows.length > 50 ? { id: last.id, createdAt: last.createdAt.toISOString() } : null }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  const latest = await assertCloseEvidenceActor(actor, "accounting.close.accountant.review")
  return { ...result, periodId, generatedAt: new Date().toISOString(), writable: authority.writable && latest.writable }
}

/** Queue one additional attempt; never repair payloads, reset attempts, bypass
 * the worker's source validation, reactivate cancelled work or steal a lease. */
export async function retryCloseNotification(actor: CloseEvidenceActor, input: z.input<typeof retryCloseNotificationInput>, session: { id: string; token: string } | null | undefined) {
  const command = retryCloseNotificationInput.parse(input)
  return runMissingCloseEvidenceTransaction(async tx => {
    const authority = await lockCloseEvidenceAcceptanceAuthorityInTx(tx, { ...actor, homeOrganizationId: actor.organizationId, session, requireCloseRead: true })
    const key = JSON.stringify([recoveryAction, actor.organizationId, command.correlationId])
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`)
    const replay = await tx.ledgerAuditEvent.findFirst({ where: { organizationId: actor.organizationId, action: recoveryAction, metadata: { path: ["command", "correlationId"], equals: command.correlationId } } })
    if (replay) {
      const metadata = object(replay.metadata)
      if (replay.actorId !== actor.actorId || replay.resourceType !== "BusinessEventOutbox" || replay.resourceId !== command.outboxId || hashBusinessPayload(metadata.command) !== hashBusinessPayload(command)) throw new ConflictError("This retry reference was already used for a different request.")
      await authority.revalidate(); return { auditId: replay.id, outboxId: command.outboxId, state: "RETRY_REQUESTED" as const }
    }
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "business_event_outbox" WHERE "organizationId" = ${actor.organizationId} AND "id" = ${command.outboxId} FOR UPDATE`)
    const row = await tx.businessEventOutbox.findFirst({ where: { ...scope(actor.organizationId, command.periodId), id: command.outboxId }, include })
    if (!row) throw new NotFoundError()
    const now = await readCloseAssessmentPublicationTimeInTx(tx), preview = inspect(row, actor.organizationId, command.periodId, now)
    if (preview.revision !== command.expectedRevision) throw new ConflictError("Notification processing changed. Refresh and review before retrying.")
    if (!preview.retryAvailable) throw new BusinessRuleError("This notification cannot be retried in its current state. Review the delivery guidance.")
    if (row.attempts >= 2147483647) throw new BusinessRuleError("The retained attempt counter requires operator investigation.")
    await authority.revalidate(now)
    await tx.businessEventOutbox.update({ where: { id: row.id, organizationId: actor.organizationId }, data: { status: "PENDING", maxAttempts: Math.max(row.maxAttempts, row.attempts + 1), availableAt: now } })
    const audit = await tx.ledgerAuditEvent.create({ data: { organizationId: actor.organizationId, actorId: actor.actorId, action: recoveryAction, resourceType: "BusinessEventOutbox", resourceId: row.id, createdAt: now,
      metadata: { version: 1, command, previousStatus: row.status, attempts: row.attempts, previousMaxAttempts: row.maxAttempts, publishedAt: preview.publishedAt, payloadHash: row.payloadHash, state: "RETRY_REQUESTED" } } })
    return { auditId: audit.id, outboxId: row.id, state: "RETRY_REQUESTED" as const }
  }, Prisma.TransactionIsolationLevel.ReadCommitted)
}
export type CloseNotificationOperations = Awaited<ReturnType<typeof getCloseNotificationOperations>>
