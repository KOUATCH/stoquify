import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { ApplicationError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { readPOSSaleCommitStatusInTx } from "@/services/pos/pos.service"
import { commitSaleSchema } from "./pos.schemas"

type Scope = { organizationId: string; userId: string; conflictId: string }
const reference = z.object({ conflictId: z.string().min(1) })
const submission = reference.extend({ expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), note: z.string().trim().min(10).max(1000) })
const open = ["OPEN", "ACKNOWLEDGED"] as const
const unsettled = ["PENDING_REPLAY", "RECORDED", "BLOCKED"] as const
function object(value: unknown): Prisma.JsonObject { return value && typeof value === "object" && !Array.isArray(value) ? value as Prisma.JsonObject : {} }
const stale = () => new ConflictError("Recorded replay evidence changed; check the current outcome before resolving")

async function evidence(tx: Prisma.TransactionClient, input: Scope) {
  const conflict = await tx.pOSOfflineSyncConflict.findFirst({ where: { id: input.conflictId, organizationId: input.organizationId } })
  if (!conflict) throw new NotFoundError("Offline conflict not found")
  const event = conflict.eventId ? await tx.pOSOfflineEvent.findFirst({ where: { id: conflict.eventId, organizationId: input.organizationId } }) : null
  const device = await tx.pOSOfflineDevice.findFirst({ where: { id: conflict.deviceId, organizationId: input.organizationId } })
  const conflicts = await tx.pOSOfflineSyncConflict.findMany({ where: { organizationId: input.organizationId, deviceId: conflict.deviceId, status: { in: [...open] } }, orderBy: { id: "asc" } })
  const pending = await tx.pOSOfflineEvent.findMany({ where: { organizationId: input.organizationId, deviceId: conflict.deviceId, status: { in: [...unsettled] } }, select: { id: true, status: true, updatedAt: true }, orderBy: { id: "asc" } })
  const replay = event ? await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: input.organizationId, eventSource: "OFFLINE_POS", idempotencyKey: `offline-event:${event.id}:replayed` } } }) : null
  const payload = object(replay?.payload)
  let reason: "VERIFIED" | "UNSUPPORTED" | "MISSING_EVIDENCE" | "EVIDENCE_MISMATCH" | "INDEPENDENT_REVIEWER" | "DEVICE_OR_DISPUTE" = "VERIFIED"
  let original: Awaited<ReturnType<typeof readPOSSaleCommitStatusInTx>> | null = null
  let posting: { id: string; postingBatchId: string | null } | null = null
  if (conflict.conflictType !== "UNPOSTED_ACCEPTED_EVENT" || object(conflict.metadata).blockerCode !== "OFFLINE_REPLAY_BLOCKED" || conflict.severity === "CRITICAL" || !open.includes(conflict.status as typeof open[number]) ||
    !event || !["BLOCKED", "REPLAYED"].includes(event.status) || (event.status === "BLOCKED" && event.blockerCode !== "OFFLINE_REPLAY_BLOCKED")) reason = "UNSUPPORTED"
  else if (!device || device.status !== "ACTIVE" || event.deviceId !== conflict.deviceId || event.locationId !== device.locationId || event.terminalId !== device.terminalId ||
    conflicts.some(row => row.id !== conflict.id && (row.severity === "CRITICAL" || row.conflictType !== "UNPOSTED_ACCEPTED_EVENT"))) reason = "DEVICE_OR_DISPUTE"
  else if (!replay?.actorId || !event.postingBatchId || !event.documentHash) reason = "MISSING_EVIDENCE"
  else if (replay.actorId === input.userId) reason = "INDEPENDENT_REVIEWER"
  else if ((conflict.incomingPayloadHash && conflict.incomingPayloadHash !== event.payloadHash) || event.eventType !== "OFFLINE_SALE_CAPTURED" || hashBusinessPayload(event.payload) !== event.payloadHash ||
    replay.eventType !== "pos.offline.event.replayed" || replay.status !== "RECORDED" || replay.deviceId !== event.deviceId || replay.locationId !== event.locationId || replay.registerId !== event.terminalId ||
    replay.payloadHash !== event.payloadHash || payload.offlineEventId !== event.id || replay.postingBatchId !== event.postingBatchId || payload.postingBatchId !== event.postingBatchId ||
    payload.documentHash !== event.documentHash || typeof payload.legalDeliveryBlocked !== "boolean") reason = "EVIDENCE_MISMATCH"
  else {
    const body = object(event.payload), candidate = object(body.commitSale ?? body)
    const parsed = commitSaleSchema.safeParse({ ...candidate, clientCommitId: candidate.clientCommitId ?? `offline:${event.id}` })
    if (!parsed.success || parsed.data.locationId !== event.locationId || parsed.data.terminalId !== event.terminalId || !event.sessionId || parsed.data.sessionId !== event.sessionId) reason = "EVIDENCE_MISMATCH"
    else {
      try { original = await readPOSSaleCommitStatusInTx(tx, { ...parsed.data, organizationId: input.organizationId, userId: replay.actorId }) }
      catch (error) {
        if (error instanceof ApplicationError && ["DUPLICATE_KEY_CONFLICT", "CONFLICT"].includes(error.code)) reason = "EVIDENCE_MISMATCH"
        else throw error
      }
      if (reason === "VERIFIED" && (original?.kind !== "RECORDED" || original.saleId !== payload.salesOrderId || original.orderNumber !== payload.orderNumber || replay.sourceId !== original.saleId)) reason = "MISSING_EVIDENCE"
      if (reason === "VERIFIED" && original?.kind === "RECORDED") {
        posting = await tx.journalEntry.findFirst({ where: { organizationId: input.organizationId, sourceType: "POS_SALE", sourceId: original.saleId, postingPurpose: "SALE_COMPLETION", status: "POSTED", postingBatchId: event.postingBatchId }, select: { id: true, postingBatchId: true } })
        if (!posting) reason = "MISSING_EVIDENCE"
      }
    }
  }
  // Bind every compared record and the displayed remaining workload; observation time is not evidence.
  const stableOriginal = original?.kind === "RECORDED" ? { ...original, observedAt: undefined } : original
  const revision = hashBusinessPayload({ conflict, event, device, replay, posting, original: stableOriginal, conflicts, pending })
  const remainingConflicts = conflicts.filter(row => row.id !== conflict.id).length
  const remainingEvents = pending.filter(row => row.id !== event?.id).length
  const preview = { conflictId: conflict.id, revision, eligible: reason === "VERIFIED", reason, remainingConflicts, remainingEvents,
    saleId: original?.kind === "RECORDED" ? original.saleId : null, orderNumber: original?.kind === "RECORDED" ? original.orderNumber : null,
    currentSaleStatus: original?.kind === "RECORDED" ? original.currentStatus : null, postingBatchId: posting?.postingBatchId ?? null,
    legalDeliveryBlocked: typeof payload.legalDeliveryBlocked === "boolean" ? payload.legalDeliveryBlocked : null }
  return { preview, conflict, event, replay, payload }
}

/** Read-only: never commits a sale, hydrates a receipt, or establishes device/country certification. */
export async function previewOfflineConflictResolution(input: Scope) {
  reference.parse(input)
  return db.$transaction(async tx => (await evidence(tx, input)).preview, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

/** Reconciles only an independently verified, already-recorded replay. No new sale/admission path. */
export async function resolveOfflineRecordedReplay(input: Scope & { expectedRevision: string; note: string }) {
  const parsed = submission.parse(input)
  return db.$transaction(async tx => {
    const row = await tx.pOSOfflineSyncConflict.findFirst({ where: { id: parsed.conflictId, organizationId: input.organizationId } })
    if (!row) throw new NotFoundError("Offline conflict not found")
    const previous = object(object(row.metadata).recordedReplayResolution)
    const actor = await tx.user.findFirst({ where: { id: input.userId, organizationId: input.organizationId, isActive: true }, select: { id: true } })
    if (!actor) throw new NotFoundError("Current reviewer not found")
    if (row.status === "RESOLVED" && previous.actorId === input.userId && previous.previousRevision === parsed.expectedRevision && row.resolutionNote === parsed.note) return { conflictId: row.id, status: "RESOLVED" as const, replayed: true }
    const current = await evidence(tx, input)
    const { conflict, event, replay, payload, preview } = current
    if (!preview.eligible || preview.revision !== parsed.expectedRevision || !event || !replay) throw stale()
    const at = new Date(), resolution = { actorId: input.userId, previousRevision: parsed.expectedRevision, replayEventId: replay.id, at: at.toISOString() }
    const changed = await tx.pOSOfflineSyncConflict.updateMany({ where: { id: conflict.id, organizationId: input.organizationId, status: conflict.status, updatedAt: conflict.updatedAt, metadata: { equals: conflict.metadata ?? Prisma.AnyNull } }, data: {
      status: "RESOLVED", resolvedById: input.userId, resolvedAt: at, resolutionNote: parsed.note, metadata: { ...object(conflict.metadata), recordedReplayResolution: resolution },
    } })
    if (changed.count !== 1) throw stale()
    if (event.status === "BLOCKED") {
      const changedEvent = await tx.pOSOfflineEvent.updateMany({ where: { id: event.id, organizationId: input.organizationId, status: event.status, updatedAt: event.updatedAt, payload: { equals: event.payload ?? Prisma.AnyNull }, metadata: { equals: event.metadata ?? Prisma.AnyNull }, payloadHash: event.payloadHash, postingBatchId: event.postingBatchId, documentHash: event.documentHash }, data: {
        status: "REPLAYED", blockerCode: null, blockerMessage: null,
        metadata: { ...object(event.metadata), recordedReplayResolution: { ...resolution, previousReplay: object(object(event.metadata).offlineReplay) }, offlineReplay: {
          ...payload, status: "REPLAYED", saleId: payload.salesOrderId!, replayedAt: replay.recordedAt.toISOString(),
        } },
      } })
      if (changedEvent.count !== 1) throw stale()
    }
    const remainingConflicts = await tx.pOSOfflineSyncConflict.count({ where: { organizationId: input.organizationId, deviceId: event.deviceId, status: { in: [...open] } } })
    const remainingEvents = await tx.pOSOfflineEvent.count({ where: { organizationId: input.organizationId, deviceId: event.deviceId, status: { in: [...unsettled] } } })
    const closeBlocker = remainingConflicts > 0 || remainingEvents > 0
    // Update only the operational blocker cache. Never issue certification, advance its sequence, or erase other gates.
    await tx.pOSOfflineSyncCertificate.updateMany({ where: { organizationId: input.organizationId, deviceId: event.deviceId, certificationScope: "DEVICE", status: { in: ["OPEN", "BLOCKED"] }, blockerCode: { in: ["OFFLINE_SYNC_CONFLICT", "UNPOSTED_ACCEPTED_EVENT"] } }, data: {
      status: closeBlocker ? "BLOCKED" : "OPEN", closeBlocker, pendingReplayCount: remainingEvents,
      certificateHash: null, blockerMessage: null,
      blockerCode: remainingConflicts ? "OFFLINE_SYNC_CONFLICT" : remainingEvents ? "UNPOSTED_ACCEPTED_EVENT" : null,
    } })
    await tx.auditLog.create({ data: { organizationId: input.organizationId, userId: input.userId, entityType: "POSOfflineSyncConflict", entityId: conflict.id, action: "POS_OFFLINE_RECORDED_REPLAY_RESOLVED", changes: {
      ...resolution, note: parsed.note, beforeStatus: conflict.status, afterStatus: "RESOLVED", eventId: event.id, beforeEventStatus: event.status, postingBatchId: event.postingBatchId,
      remainingConflicts, remainingEvents, legalDeliveryBlocked: payload.legalDeliveryBlocked!,
    } } })
    return { conflictId: conflict.id, status: "RESOLVED" as const, replayed: false }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw stale()
    throw error
  })
}
