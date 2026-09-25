import type { BusinessEventOutbox, Prisma } from "@prisma/client"
import { z } from "zod"
import { hashBusinessPayload } from "@/services/events/business-event.service"

export const statementDispatchSchema = z.object({
  version: z.literal(1), attempt: z.number().int().positive(), executionId: z.string().uuid(),
  reservedAt: z.string().datetime(), outcome: z.enum(["RESERVED", "ACCEPTED", "NOT_SENT", "UNKNOWN"]),
}).strict()

export type StatementRecoveryQueue = Pick<BusinessEventOutbox,
  "id" | "status" | "attempts" | "maxAttempts" | "lastErrorCode" | "updatedAt" | "payloadHash" | "metadata">

export function statementRecoveryRevision(queue: StatementRecoveryQueue) {
  const { id, status, attempts, maxAttempts, lastErrorCode, updatedAt, payloadHash, metadata } = queue
  return hashBusinessPayload({ id, status, attempts, maxAttempts, lastErrorCode, updatedAt, payloadHash, metadata })
}

export function statementDispatchMetadata(value: Prisma.JsonValue | null) {
  const container = value && typeof value === "object" && !Array.isArray(value) ? value : {}
  const raw = container.statementDispatch
  return { container, raw, parsed: statementDispatchSchema.safeParse(raw) }
}

export function canRetryUnsentStatement(queue: StatementRecoveryQueue, state?: { status: string; errorCode: string | null }) {
  const dispatch = statementDispatchMetadata(queue.metadata).parsed
  return queue.status === "DEFERRED" && queue.lastErrorCode === "PROVIDER_NOT_CONFIGURED" &&
    state?.status === "DEFERRED" && state.errorCode === "PROVIDER_NOT_CONFIGURED" &&
    queue.attempts < queue.maxAttempts && dispatch.success && dispatch.data.outcome === "NOT_SENT" && dispatch.data.attempt === queue.attempts
}
