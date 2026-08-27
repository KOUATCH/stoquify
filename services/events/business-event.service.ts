import { createHash } from "crypto"

import type { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { createCorrelationId } from "@/lib/error-handling/canonical"
import {
  ApplicationError,
  DuplicateKeyConflictError,
  IdempotencyConflictError,
  getPrismaKnownRequest,
  isApplicationError,
} from "@/services/_shared/action-errors"

import {
  recordIdempotencyConflictEvidence,
  type BusinessEventEvidenceClient,
} from "./business-event-anomaly.service"
import {
  recordBusinessEventInputSchema,
  type ParsedRecordBusinessEventInput,
  type RecordBusinessEventInput,
} from "./business-event.schemas"

type BusinessEventRecord = {
  id: string
  organizationId: string
  eventType: string
  eventSource: string
  idempotencyKey: string
  payloadHash: string
  correlationId?: string | null
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

export type BusinessEventDatabaseClient = {
  businessEvent: {
    findUnique(args: unknown): Promise<BusinessEventRecord | null>
  }
  $transaction<T>(
    callback: (tx: BusinessEventTransactionalClient) => Promise<T>,
  ): Promise<T>
}

type RecordBusinessEventOptions = {
  evidenceClient?: BusinessEventEvidenceClient
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
  return (
    message.idempotencyKey ??
    `${event.eventSource}:${event.idempotencyKey}:${message.channel}:${message.eventName}`
  )
}

function parseBusinessEventInput(input: RecordBusinessEventInput) {
  const parsed = recordBusinessEventInputSchema.safeParse(input)
  if (parsed.success) return parsed.data

  throw new ApplicationError(
    "VALIDATION_ERROR",
    "Invalid business-event input.",
    400,
    true,
    { fieldErrors: parsed.error.flatten().fieldErrors },
  )
}

function prepareBusinessEvent(input: RecordBusinessEventInput) {
  const parsed = parseBusinessEventInput(input)
  return {
    parsed,
    payloadHash: parsed.payloadHash ?? hashBusinessPayload(parsed.payload),
    correlationId: parsed.correlationId ?? createCorrelationId("evt"),
  }
}

async function recordIdempotencyConflict(
  input: ParsedRecordBusinessEventInput,
  existing: BusinessEventRecord,
  attemptedPayloadHash: string,
  correlationId: string,
  evidenceClient?: BusinessEventEvidenceClient,
) {
  const fingerprint = hashBusinessPayload({
    organizationId: input.organizationId,
    eventSource: input.eventSource,
    idempotencyKey: input.idempotencyKey,
    existingPayloadHash: existing.payloadHash,
    attemptedPayloadHash,
  })

  await recordIdempotencyConflictEvidence(
    {
      organizationId: input.organizationId,
      businessEventId: existing.id,
      eventType: input.eventType,
      eventSource: input.eventSource,
      idempotencyKey: input.idempotencyKey,
      existingPayloadHash: existing.payloadHash,
      attemptedPayloadHash,
      fingerprint,
      actorId: input.actorId,
      correlationId,
    },
    evidenceClient,
  )

  throw new IdempotencyConflictError(
    "Business event idempotency key was reused with a different payload.",
    {
      organizationId: input.organizationId,
      businessEventId: existing.id,
      eventSource: input.eventSource,
      idempotencyKey: input.idempotencyKey,
      existingPayloadHash: existing.payloadHash,
      attemptedPayloadHash,
      correlationId,
    },
  )
}

export async function recordBusinessEventInTx(
  tx: BusinessEventTransactionalClient,
  input: RecordBusinessEventInput,
  options: RecordBusinessEventOptions = {},
): Promise<RecordBusinessEventResult> {
  const { parsed, payloadHash, correlationId } = prepareBusinessEvent(input)

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
      await recordIdempotencyConflict(
        parsed,
        existing,
        payloadHash,
        correlationId,
        options.evidenceClient,
      )
    }

    return { event: existing, created: false }
  }

  try {
    const event = await tx.businessEvent.create({
      data: {
        organizationId: parsed.organizationId,
        eventType: parsed.eventType,
        eventSource: parsed.eventSource,
        schemaVersion: parsed.schemaVersion,
        idempotencyKey: parsed.idempotencyKey,
        payloadHash,
        payload: parsed.payload as Prisma.InputJsonValue,
        correlationId,
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
        audits: {
          create: {
            organizationId: parsed.organizationId,
            action: "RECORDED",
            eventSource: parsed.eventSource,
            actorId: parsed.actorId,
            reason: "Business event recorded.",
            payloadHash,
            correlationId,
            metadata: {
              eventType: parsed.eventType,
              schemaVersion: parsed.schemaVersion,
              outboxMessageCount: parsed.outboxMessages.length,
            },
          },
        },
        outboxMessages: {
          create: parsed.outboxMessages.map((message) => ({
            organizationId: parsed.organizationId,
            channel: message.channel,
            eventName: message.eventName,
            destination: message.destination,
            idempotencyKey: outboxIdempotencyKey(parsed, message),
            payloadHash: hashBusinessPayload(message.payload),
            payload: message.payload as Prisma.InputJsonValue,
            correlationId,
            availableAt: message.availableAt,
            maxAttempts: message.maxAttempts,
            metadata: message.metadata as Prisma.InputJsonValue | undefined,
          })),
        },
      },
      include: { outboxMessages: true },
    })

    return { event, created: true }
  } catch (error) {
    const prismaError = getPrismaKnownRequest(error)
    if (prismaError?.code === "P2002") {
      throw new DuplicateKeyConflictError(
        "A concurrent business-event or outbox record already uses this unique key.",
        {
          organizationId: parsed.organizationId,
          eventSource: parsed.eventSource,
          idempotencyKey: parsed.idempotencyKey,
          payloadHash,
          correlationId,
        },
      )
    }
    if (isApplicationError(error)) {
      throw new ApplicationError(
        error.code,
        error.message,
        error.status,
        error.expose,
        error.metadata,
      )
    }

    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Business event could not be recorded.",
      500,
      false,
      {
        operation: "business_event.record",
        organizationId: parsed.organizationId,
        eventSource: parsed.eventSource,
        correlationId,
      },
    )
  }
}

export async function recordBusinessEvent(
  input: RecordBusinessEventInput,
  client: BusinessEventDatabaseClient = db as unknown as BusinessEventDatabaseClient,
) {
  const prepared = prepareBusinessEvent(input)
  const normalizedInput: RecordBusinessEventInput = {
    ...prepared.parsed,
    payloadHash: prepared.payloadHash,
    correlationId: prepared.correlationId,
  }

  try {
    return await client.$transaction((tx) =>
      recordBusinessEventInTx(tx, normalizedInput, {
        evidenceClient: client as unknown as BusinessEventEvidenceClient,
      }),
    )
  } catch (error) {
    if (!(error instanceof DuplicateKeyConflictError)) {
      if (isApplicationError(error)) {
        throw new ApplicationError(
          error.code,
          error.message,
          error.status,
          error.expose,
          error.metadata,
        )
      }

      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Business event transaction failed.",
        500,
        false,
        {
          operation: "business_event.transaction",
          organizationId: prepared.parsed.organizationId,
          correlationId: prepared.correlationId,
        },
      )
    }

    const existing = await client.businessEvent.findUnique({
      where: {
        organizationId_eventSource_idempotencyKey: {
          organizationId: prepared.parsed.organizationId,
          eventSource: prepared.parsed.eventSource,
          idempotencyKey: prepared.parsed.idempotencyKey,
        },
      },
      include: { outboxMessages: true },
    })
    if (!existing) {
      throw new DuplicateKeyConflictError(error.message, error.metadata)
    }
    if (existing.payloadHash === prepared.payloadHash) {
      return { event: existing, created: false }
    }

    return recordIdempotencyConflict(
      prepared.parsed,
      existing,
      prepared.payloadHash,
      prepared.correlationId,
      client as unknown as BusinessEventEvidenceClient,
    )
  }
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
      audits: {
        create: {
          organizationId,
          action: "APPLIED",
          reason: "Business event applied to its domain mutation.",
          metadata: {
            status: "APPLIED",
          },
        },
      },
    },
  })
}
