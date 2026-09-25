import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"

const reference = z.object({ conflictId: z.string().min(1) })
const acknowledgement = reference.extend({ expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), note: z.string().trim().min(10).max(1000) })
const include = { event: { select: { id: true, payloadHash: true, status: true, blockerCode: true } }, device: { select: { deviceLabel: true, terminalId: true, locationId: true } } } satisfies Prisma.POSOfflineSyncConflictInclude
type Row = Prisma.POSOfflineSyncConflictGetPayload<{ include: typeof include }>
type Scope = { organizationId: string; userId: string }
function record(value: Prisma.JsonValue | undefined): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}
function review(row: Row) { return record(record(row.metadata ?? undefined).operatorReview) }
function revision(row: Row) { return hashBusinessPayload(row) }
function dto(row: Row) {
  const saved = review(row)
  return { id: row.id, revision: revision(row), status: row.status, conflictType: row.conflictType, severity: row.severity,
    device: row.device.deviceLabel, eventId: row.eventId, payloadHash: row.event?.payloadHash ?? null,
    eventStatus: row.event?.status ?? null, blockerCode: row.event?.blockerCode ?? null,
    reviewedBy: typeof saved.name === "string" ? saved.name : null,
    reviewedAt: typeof saved.at === "string" ? saved.at : null, note: typeof saved.note === "string" ? saved.note : null,
    createdAt: row.createdAt.toISOString(), resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedById: row.resolvedById, resolutionNote: row.resolutionNote }
}

const cursor = z.object({ at: z.string().datetime(), id: z.string().min(1).max(200) }).strict()
const page = z.object({ cursor: cursor.nullable().optional() })
const history = page.extend({ locationId: z.string().min(1).max(200), terminalId: z.string().min(1).max(200), status: z.enum(["OPEN", "CLOSED", "ALL"]).default("OPEN"), reference: z.string().trim().max(200).default("") })
export type OfflineConflictHistoryInput = z.input<typeof history>
export type OfflineConflictTimelineInput = { conflictId: string; cursor?: z.infer<typeof cursor> | null }
const pageSize = 20
function older(value: z.infer<typeof cursor> | null | undefined) {
  return value ? { OR: [{ createdAt: { lt: new Date(value.at) } }, { createdAt: new Date(value.at), id: { lt: value.id } }] } : {}
}
/** Scoped keyset paging: a cursor changes position only; it never grants access to another scope. */
export async function listOfflineConflictHistory(input: Scope & OfflineConflictHistoryInput) {
  const parsed = history.parse(input)
  return db.$transaction(async tx => {
    const device = { organizationId: input.organizationId, locationId: parsed.locationId, terminalId: parsed.terminalId }
    const where: Prisma.POSOfflineSyncConflictWhereInput = { organizationId: input.organizationId, device,
      ...(parsed.status === "OPEN" ? { status: { in: ["OPEN", "ACKNOWLEDGED"] } } : parsed.status === "CLOSED" ? { status: { in: ["RESOLVED", "DISMISSED"] } } : {}),
      ...(parsed.reference ? { OR: [{ id: parsed.reference }, { eventId: parsed.reference }] } : {}),
    }
    const rows = await tx.pOSOfflineSyncConflict.findMany({ where: { AND: [where, older(parsed.cursor)] }, include, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize + 1 })
    const total = await tx.pOSOfflineSyncConflict.count({ where }), selected = rows.slice(0, pageSize), last = selected.at(-1)
    return { items: selected.map(row => ({ id: row.id, status: row.status, device: row.device.deviceLabel, eventId: row.eventId, createdAt: row.createdAt.toISOString() })), total,
      nextCursor: rows.length > pageSize && last ? { at: last.createdAt.toISOString(), id: last.id } : null, observedAt: new Date().toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

/** Whitelisted review evidence only; accepted payload, IP addresses and unrelated audits stay private. */
export async function listOfflineConflictTimeline(input: Scope & OfflineConflictTimelineInput) {
  const parsed = reference.merge(page).parse(input)
  return db.$transaction(async tx => {
    const row = await tx.pOSOfflineSyncConflict.findFirst({ where: { id: parsed.conflictId, organizationId: input.organizationId }, select: { id: true } })
    if (!row) throw new NotFoundError("Offline conflict not found")
    const rows = await tx.auditLog.findMany({ where: { organizationId: input.organizationId, entityType: "POSOfflineSyncConflict", entityId: row.id,
      action: { in: ["POS_OFFLINE_CONFLICT_REVIEWED", "POS_OFFLINE_RECORDED_REPLAY_RESOLVED"] }, ...older(parsed.cursor) }, select: { id: true, createdAt: true, userId: true, action: true, changes: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize + 1 })
    const selected = rows.slice(0, pageSize), last = selected.at(-1)
    return { items: selected.map(audit => {
      const changes = record(audit.changes ?? undefined)
      return { id: audit.id, at: audit.createdAt.toISOString(), actorId: audit.userId, kind: audit.action === "POS_OFFLINE_CONFLICT_REVIEWED" ? "REVIEW" as const : "RESOLUTION" as const,
        note: typeof changes.note === "string" ? changes.note.slice(0, 1000) : null,
        replayEventId: typeof changes.replayEventId === "string" ? changes.replayEventId : null,
        postingBatchId: typeof changes.postingBatchId === "string" ? changes.postingBatchId : null }
    }), nextCursor: rows.length > pageSize && last ? { at: last.createdAt.toISOString(), id: last.id } : null }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export async function getOfflineConflictReview(input: Scope & { conflictId: string }) {
  const parsed = reference.parse(input)
  const row = await db.pOSOfflineSyncConflict.findFirst({ where: { id: parsed.conflictId, organizationId: input.organizationId }, include })
  if (!row) throw new NotFoundError("Offline conflict not found")
  return dto(row)
}
/** Records review ownership only. Does not resolve a conflict or authorize replay. */
export async function acknowledgeOfflineConflict(input: Scope & { conflictId: string; expectedRevision: string; note: string }) {
  const parsed = acknowledgement.parse(input)
  return db.$transaction(async tx => {
    const row = await tx.pOSOfflineSyncConflict.findFirst({ where: { id: parsed.conflictId, organizationId: input.organizationId }, include })
    if (!row) throw new NotFoundError("Offline conflict not found")
    const previous = review(row)
    if (row.status === "ACKNOWLEDGED" && previous.actorId === input.userId && previous.previousRevision === parsed.expectedRevision && previous.note === parsed.note) return { review: dto(row), replayed: true }
    if (!["OPEN", "ACKNOWLEDGED"].includes(row.status) || revision(row) !== parsed.expectedRevision) throw new ConflictError("The conflict changed; review its current evidence before saving")
    const actor = await tx.user.findFirst({ where: { id: input.userId, organizationId: input.organizationId, isActive: true }, select: { name: true } })
    if (!actor) throw new NotFoundError("Current reviewer not found")
    const at = new Date().toISOString()
    const saved = { actorId: input.userId, name: actor.name ?? input.userId, at, note: parsed.note, previousRevision: parsed.expectedRevision }
    const changed = await tx.pOSOfflineSyncConflict.updateMany({ where: { id: row.id, organizationId: input.organizationId, status: row.status, updatedAt: row.updatedAt }, data: { status: "ACKNOWLEDGED", metadata: { ...record(row.metadata ?? undefined), operatorReview: saved } } })
    if (changed.count !== 1) throw new ConflictError("The conflict changed; review its current evidence before saving")
    await tx.auditLog.create({ data: { organizationId: input.organizationId, userId: input.userId, entityType: "POSOfflineSyncConflict", entityId: row.id, action: "POS_OFFLINE_CONFLICT_REVIEWED", changes: { beforeStatus: row.status, afterStatus: "ACKNOWLEDGED", eventId: row.eventId, ...saved } } })
    const updated = await tx.pOSOfflineSyncConflict.findFirstOrThrow({ where: { id: row.id, organizationId: input.organizationId }, include })
    return { review: dto(updated), replayed: false }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
