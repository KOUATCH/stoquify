import { createHash } from "crypto"

import type { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { ConflictError } from "@/services/_shared/action-errors"

import {
  recordBusinessEventInputSchema,
  type ParsedRecordBusinessEventInput,
  type RecordBusinessEventInput,
} from "./business-event.schemas"

type BusinessEventRecord = {
  id: string
  organizationId: string
  eventSource: string
  idempotencyKey: string
  payloadHash: string
  outboxMessages?: unknown[]
}

type BusinessEventTransactionalClient = {
  businessEvent: {
    findUnique(args: unknown): Promise<BusinessEventRecord | null>
    create(args: unknown): Promise<BusinessEventRecord>
    update(args: unknown): Promise<BusinessEventRecord>
  }
  auditLog: {
    create(args: unknown): Promise<unknown>
  }
}

export type RecordBusinessEventResult = {
  event: BusinessEventRecord
  created: boolean
}

function normalizeJson(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeJson)
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeJson((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  return value
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value))
}

export function hashBusinessPayload(value: unknown): string {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex")
}

function outboxIdempotencyKey(
  event: ParsedRecordBusinessEventInput,
  message: ParsedRecordBusinessEventInput["outboxMessages"][number],
): string {
  return message.idempotencyKey ?? `${event.eventSource}:${event.idempotencyKey}:${message.channel}:${message.eventName}`
}

async function auditIdempotencyConflict(
  tx: BusinessEventTransactionalClient,
  input: ParsedRecordBusinessEventInput,
  existing: BusinessEventRecord,
  attemptedPayloadHash: string,
) {
  await tx.auditLog.create({
    data: {
      entityType: "BusinessEvent",
      entityId: existing.id,
      action: "BUSINESS_EVENT_IDEMPOTENCY_CONFLICT",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: {
        before: {
          eventSource: existing.eventSource,
          idempotencyKey: existing.idempotencyKey,
          payloadHash: existing.payloadHash,
        },
        after: {
          eventSource: input.eventSource,
          idempotencyKey: input.idempotencyKey,
          payloadHash: attemptedPayloadHash,
        },
      },
    },
  })
}

export async function recordBusinessEventInTx(
  tx: BusinessEventTransactionalClient,
  input: RecordBusinessEventInput,
): Promise<RecordBusinessEventResult> {
  const parsed = recordBusinessEventInputSchema.parse(input)
  const payloadHash = parsed.payloadHash ?? hashBusinessPayload(parsed.payload)

  const existing = await tx.businessEvent.findUnique({
    where: {
      organizationId_eventSource_idempotencyKey: {
        organizationId: parsed.organizationId,
        eventSource: parsed.eventSource,
        idempotencyKey: parsed.idempotencyKey,
      },
    },
    include: { outboxMessages: true },
  })

  if (existing) {
    if (existing.payloadHash !== payloadHash) {
      await auditIdempotencyConflict(tx, parsed, existing, payloadHash)
      throw new ConflictError(
        "Business event idempotency key was reused with a different payload.",
      )
    }

    return { event: existing, created: false }
  }

  const event = await tx.businessEvent.create({
    data: {
      organizationId: parsed.organizationId,
      eventType: parsed.eventType,
      eventSource: parsed.eventSource,
      schemaVersion: parsed.schemaVersion,
      idempotencyKey: parsed.idempotencyKey,
      payloadHash,
      payload: parsed.payload as Prisma.InputJsonValue,
      occurredAt: parsed.occurredAt ?? new Date(),
      actorId: parsed.actorId,
      locationId: parsed.locationId,
      registerId: parsed.registerId,
      deviceId: parsed.deviceId,
      sourceType: parsed.sourceType,
      sourceId: parsed.sourceId,
      postingBatchId: parsed.postingBatchId,
      documentHash: parsed.documentHash,
      metadata: parsed.metadata as Prisma.InputJsonValue | undefined,
      outboxMessages: {
        create: parsed.outboxMessages.map((message) => ({
          organizationId: parsed.organizationId,
          channel: message.channel,
          eventName: message.eventName,
          destination: message.destination,
          idempotencyKey: outboxIdempotencyKey(parsed, message),
          payloadHash: hashBusinessPayload(message.payload),
          payload: message.payload as Prisma.InputJsonValue,
          availableAt: message.availableAt,
          maxAttempts: message.maxAttempts,
          metadata: message.metadata as Prisma.InputJsonValue | undefined,
        })),
      },
    },
    include: { outboxMessages: true },
  })

  return { event, created: true }
}

export async function recordBusinessEvent(input: RecordBusinessEventInput) {
  return db.$transaction((tx) =>
    recordBusinessEventInTx(tx as unknown as BusinessEventTransactionalClient, input),
  )
}

export async function markBusinessEventAppliedInTx(
  tx: BusinessEventTransactionalClient,
  organizationId: string,
  eventId: string,
) {
  return tx.businessEvent.update({
    where: { id: eventId, organizationId },
    data: {
      status: "APPLIED",
      processedAt: new Date(),
    },
  })
}

