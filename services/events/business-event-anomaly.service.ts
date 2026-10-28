import type { BusinessEventSource, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import {
  ApplicationError,
  isApplicationError,
} from "@/services/_shared/action-errors"

type BusinessEventEvidenceTransaction = {
  businessEventAudit: {
    create(args: unknown): Promise<unknown>
  }
  businessEventAnomaly: {
    upsert(args: unknown): Promise<unknown>
    findMany(args: unknown): Promise<unknown[]>
  }
}

export type BusinessEventEvidenceClient = BusinessEventEvidenceTransaction & {
  $transaction<T>(
    callback: (tx: BusinessEventEvidenceTransaction) => Promise<T>,
  ): Promise<T>
}

export type RecordIdempotencyConflictEvidenceInput = {
  organizationId: string
  businessEventId: string
  eventType: string
  eventSource: BusinessEventSource
  idempotencyKey: string
  existingPayloadHash: string
  attemptedPayloadHash: string
  fingerprint: string
  actorId?: string
  correlationId?: string
  occurredAt?: Date
}

const defaultEvidenceClient = db as unknown as BusinessEventEvidenceClient

export async function recordIdempotencyConflictEvidence(
  input: RecordIdempotencyConflictEvidenceInput,
  client: BusinessEventEvidenceClient = defaultEvidenceClient,
) {
  const now = input.occurredAt ?? new Date()
  const metadata = {
    eventType: input.eventType,
    idempotencyKey: input.idempotencyKey,
  } satisfies Prisma.InputJsonObject

  try {
    return await client.$transaction(async (tx) => {
      await tx.businessEventAudit.create({
        data: {
          organizationId: input.organizationId,
          businessEventId: input.businessEventId,
          action: "IDEMPOTENCY_CONFLICT",
          eventSource: input.eventSource,
          actorId: input.actorId ?? null,
          reason:
            "The idempotency key was reused with a different payload hash.",
          payloadHash: input.existingPayloadHash,
          attemptedPayloadHash: input.attemptedPayloadHash,
          correlationId: input.correlationId ?? null,
          metadata,
          createdAt: now,
        },
      })

      return tx.businessEventAnomaly.upsert({
        where: {
          organizationId_businessEventId_anomalyType_fingerprint: {
            organizationId: input.organizationId,
            businessEventId: input.businessEventId,
            anomalyType: "IDEMPOTENCY_PAYLOAD_CONFLICT",
            fingerprint: input.fingerprint,
          },
        },
        create: {
          organizationId: input.organizationId,
          businessEventId: input.businessEventId,
          anomalyType: "IDEMPOTENCY_PAYLOAD_CONFLICT",
          code: "IDEMPOTENCY_CONFLICT",
          severity: "HIGH",
          status: "OPEN",
          summary:
            "A business-event idempotency key was reused with a different payload.",
          fingerprint: input.fingerprint,
          correlationId: input.correlationId ?? null,
          metadata,
          firstSeenAt: now,
          lastSeenAt: now,
        },
        update: {
          status: "OPEN",
          occurrenceCount: { increment: 1 },
          correlationId: input.correlationId ?? null,
          metadata,
          lastSeenAt: now,
          acknowledgedAt: null,
          acknowledgedBy: null,
          resolvedAt: null,
          resolvedBy: null,
          resolutionReason: null,
        },
      })
    })
  } catch (error) {
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
      "Business-event conflict evidence could not be recorded.",
      500,
      false,
      {
        operation: "business_event.idempotency_conflict_evidence",
        organizationId: input.organizationId,
        businessEventId: input.businessEventId,
        correlationId: input.correlationId,
      },
    )
  }
}

export async function listOpenBusinessEventAnomalies(
  input: { organizationId: string; limit?: number },
  client: BusinessEventEvidenceClient = defaultEvidenceClient,
) {
  const organizationId = input.organizationId.trim()
  if (!organizationId) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Organization scope is required.",
      400,
    )
  }

  const limit = Math.min(100, Math.max(1, input.limit ?? 25))
  return client.businessEventAnomaly.findMany({
    where: {
      organizationId,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
    },
    orderBy: [{ severity: "desc" }, { lastSeenAt: "desc" }],
    take: limit,
    select: {
      id: true,
      businessEventId: true,
      anomalyType: true,
      code: true,
      severity: true,
      status: true,
      summary: true,
      occurrenceCount: true,
      correlationId: true,
      firstSeenAt: true,
      lastSeenAt: true,
    },
  })
}
