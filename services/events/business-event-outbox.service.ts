import {
  BusinessOutboxStatus,
  type BusinessOutboxChannel,
  type BusinessEventSource,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  ApplicationError,
  NotFoundError,
  isApplicationError,
} from "@/services/_shared/action-errors"

type OutboxStatus =
  | "PENDING"
  | "LOCKED"
  | "DEFERRED"
  | "SENT"
  | "FAILED"
  | "DEAD_LETTER"
  | "CANCELLED"

export type BusinessEventOutboxMessage = {
  id: string
  organizationId: string
  businessEventId: string
  channel: BusinessOutboxChannel
  eventName: string
  destination: string | null
  idempotencyKey: string
  payloadHash: string
  payload: unknown
  status: OutboxStatus
  attempts: number
  maxAttempts: number
  availableAt: Date
  lockedAt: Date | null
  lockedBy: string | null
  correlationId: string | null
}

type OutboxMessageWithEvent = BusinessEventOutboxMessage & {
  businessEvent: {
    eventSource: BusinessEventSource
    payloadHash: string
    correlationId: string | null
  }
}

type BusinessEventOutboxStore = {
  businessEventOutbox: {
    findMany(args: unknown): Promise<BusinessEventOutboxMessage[]>
    findFirst(args: unknown): Promise<OutboxMessageWithEvent | null>
    updateMany(args: unknown): Promise<{ count: number }>
    groupBy(
      args: unknown,
    ): Promise<Array<{ status: OutboxStatus; _count: { _all: number } }>>
  }
  businessEventAudit: {
    create(args: unknown): Promise<unknown>
  }
}

export type BusinessEventOutboxClient = BusinessEventOutboxStore & {
  $transaction<T>(
    callback: (tx: BusinessEventOutboxStore) => Promise<T>,
  ): Promise<T>
}

export type ClaimBusinessEventOutboxInput = {
  organizationId: string
  workerId: string
  channels?: BusinessOutboxChannel[]
  limit?: number
  now?: Date
  staleAfterMs?: number
}

const defaultOutboxClient = db as unknown as BusinessEventOutboxClient
const GENERIC_FAILURE_MESSAGE = "Business-event outbox delivery failed."

function requiredScope(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) {
    throw new ApplicationError("VALIDATION_ERROR", `${label} is required.`, 400)
  }
  return normalized
}

function retryAt(attempts: number, now: Date, baseDelayMs = 15_000) {
  const delayMs = Math.min(
    60 * 60_000,
    baseDelayMs * 2 ** Math.max(0, attempts - 1),
  )
  return new Date(now.getTime() + delayMs)
}

function safeFailure(error: unknown) {
  if (isApplicationError(error)) {
    return {
      code: error.code,
      message: error.expose
        ? error.message.slice(0, 500)
        : GENERIC_FAILURE_MESSAGE,
    }
  }

  return { code: "INTERNAL_ERROR", message: GENERIC_FAILURE_MESSAGE }
}

export async function claimBusinessEventOutboxMessages(
  input: ClaimBusinessEventOutboxInput,
  client: BusinessEventOutboxClient = defaultOutboxClient,
) {
  const organizationId = requiredScope(
    input.organizationId,
    "Organization scope",
  )
  const workerId = requiredScope(input.workerId, "Worker identity")
  const now = input.now ?? new Date()
  const limit = Math.min(100, Math.max(1, input.limit ?? 25))
  const staleBefore = new Date(
    now.getTime() - Math.max(1_000, input.staleAfterMs ?? 5 * 60_000),
  )

  const candidates = await client.businessEventOutbox.findMany({
    where: {
      organizationId,
      channel: input.channels?.length ? { in: input.channels } : undefined,
      OR: [
        {
          status: {
            in: [BusinessOutboxStatus.PENDING, BusinessOutboxStatus.FAILED],
          },
          availableAt: { lte: now },
        },
        {
          status: BusinessOutboxStatus.LOCKED,
          lockedAt: { lt: staleBefore },
        },
      ],
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: Math.min(200, limit * 2),
    select: {
      id: true,
      organizationId: true,
      businessEventId: true,
      channel: true,
      eventName: true,
      destination: true,
      idempotencyKey: true,
      payloadHash: true,
      payload: true,
      status: true,
      attempts: true,
      maxAttempts: true,
      availableAt: true,
      lockedAt: true,
      lockedBy: true,
      correlationId: true,
    },
  })

  const claimed: BusinessEventOutboxMessage[] = []
  for (const candidate of candidates) {
    if (claimed.length >= limit) break

    if (candidate.attempts >= candidate.maxAttempts) {
      await client.businessEventOutbox.updateMany({
        where: {
          id: candidate.id,
          organizationId,
          channel: candidate.channel,
          status: candidate.status,
          attempts: candidate.attempts,
        },
        data: {
          status: BusinessOutboxStatus.DEAD_LETTER,
          lockedAt: null,
          lockedBy: null,
          failedAt: now,
          lastErrorCode: "RETRY_EXHAUSTED",
          lastErrorMessage: "Retry limit reached before lease acquisition.",
        },
      })
      continue
    }

    const lease = await client.businessEventOutbox.updateMany({
      where: {
        id: candidate.id,
        organizationId,
        channel: candidate.channel,
        attempts: candidate.attempts,
        OR: [
          {
            status: {
              in: [BusinessOutboxStatus.PENDING, BusinessOutboxStatus.FAILED],
            },
            availableAt: { lte: now },
          },
          {
            status: BusinessOutboxStatus.LOCKED,
            lockedAt: { lt: staleBefore },
          },
        ],
      },
      data: {
        status: BusinessOutboxStatus.LOCKED,
        lockedAt: now,
        lockedBy: workerId,
        attempts: { increment: 1 },
      },
    })

    if (lease.count === 1) {
      claimed.push({
        ...candidate,
        status: "LOCKED",
        attempts: candidate.attempts + 1,
        lockedAt: now,
        lockedBy: workerId,
      })
    }
  }

  return claimed
}

export async function markBusinessEventOutboxDelivered(
  input: {
    organizationId: string
    workerId: string
    messageId: string
    now?: Date
  },
  client: BusinessEventOutboxClient = defaultOutboxClient,
) {
  const organizationId = requiredScope(
    input.organizationId,
    "Organization scope",
  )
  const workerId = requiredScope(input.workerId, "Worker identity")
  const messageId = requiredScope(input.messageId, "Outbox message")
  const now = input.now ?? new Date()

  return client.$transaction(async (tx) => {
    const message = await tx.businessEventOutbox.findFirst({
      where: {
        id: messageId,
        organizationId,
        status: BusinessOutboxStatus.LOCKED,
        lockedBy: workerId,
      },
      include: { businessEvent: true },
    })
    if (!message)
      throw new NotFoundError(
        "Claimed business-event outbox message was not found.",
      )

    const updated = await tx.businessEventOutbox.updateMany({
      where: {
        id: messageId,
        organizationId,
        status: BusinessOutboxStatus.LOCKED,
        lockedBy: workerId,
      },
      data: {
        status: BusinessOutboxStatus.SENT,
        lockedAt: null,
        lockedBy: null,
        processedAt: now,
        failedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    })
    if (updated.count !== 1)
      throw new NotFoundError(
        "Claimed business-event outbox message was not found.",
      )

    await tx.businessEventAudit.create({
      data: {
        organizationId,
        businessEventId: message.businessEventId,
        action: "OUTBOX_DELIVERED",
        eventSource: message.businessEvent.eventSource,
        reason: `Outbox message ${message.eventName} was delivered.`,
        payloadHash: message.payloadHash,
        correlationId:
          message.correlationId ?? message.businessEvent.correlationId,
        metadata: {
          outboxMessageId: message.id,
          channel: message.channel,
          attempts: message.attempts,
        },
      },
    })

    return { messageId, status: "SENT" as const, processedAt: now }
  })
}

export async function markBusinessEventOutboxFailed(
  input: {
    organizationId: string
    workerId: string
    messageId: string
    error: unknown
    now?: Date
  },
  client: BusinessEventOutboxClient = defaultOutboxClient,
) {
  const organizationId = requiredScope(
    input.organizationId,
    "Organization scope",
  )
  const workerId = requiredScope(input.workerId, "Worker identity")
  const messageId = requiredScope(input.messageId, "Outbox message")
  const now = input.now ?? new Date()
  const failure = safeFailure(input.error)

  return client.$transaction(async (tx) => {
    const message = await tx.businessEventOutbox.findFirst({
      where: {
        id: messageId,
        organizationId,
        status: BusinessOutboxStatus.LOCKED,
        lockedBy: workerId,
      },
      include: { businessEvent: true },
    })
    if (!message)
      throw new NotFoundError(
        "Claimed business-event outbox message was not found.",
      )

    const exhausted = message.attempts >= message.maxAttempts
    const status = exhausted
      ? BusinessOutboxStatus.DEAD_LETTER
      : BusinessOutboxStatus.FAILED
    const availableAt = exhausted ? now : retryAt(message.attempts, now)

    const updated = await tx.businessEventOutbox.updateMany({
      where: {
        id: messageId,
        organizationId,
        status: BusinessOutboxStatus.LOCKED,
        lockedBy: workerId,
      },
      data: {
        status,
        availableAt,
        lockedAt: null,
        lockedBy: null,
        failedAt: now,
        lastErrorCode: failure.code,
        lastErrorMessage: failure.message,
      },
    })
    if (updated.count !== 1)
      throw new NotFoundError(
        "Claimed business-event outbox message was not found.",
      )

    await tx.businessEventAudit.create({
      data: {
        organizationId,
        businessEventId: message.businessEventId,
        action: exhausted ? "OUTBOX_DEAD_LETTERED" : "OUTBOX_RETRY",
        eventSource: message.businessEvent.eventSource,
        reason: exhausted
          ? `Outbox message ${message.eventName} exhausted its retry limit.`
          : `Outbox message ${message.eventName} was scheduled for retry.`,
        payloadHash: message.payloadHash,
        correlationId:
          message.correlationId ?? message.businessEvent.correlationId,
        metadata: {
          outboxMessageId: message.id,
          channel: message.channel,
          attempts: message.attempts,
          maxAttempts: message.maxAttempts,
          errorCode: failure.code,
        },
      },
    })

    return {
      messageId,
      status: exhausted ? ("DEAD_LETTER" as const) : ("FAILED" as const),
      attempts: message.attempts,
      maxAttempts: message.maxAttempts,
      availableAt,
      errorCode: failure.code,
    }
  })
}

export async function getBusinessEventOutboxReadiness(
  organizationIdInput: string,
  client: BusinessEventOutboxClient = defaultOutboxClient,
) {
  const organizationId = requiredScope(
    organizationIdInput,
    "Organization scope",
  )
  const [groups, oldest] = await Promise.all([
    client.businessEventOutbox.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    client.businessEventOutbox.findFirst({
      where: {
        organizationId,
        status: {
          in: [
            BusinessOutboxStatus.PENDING,
            BusinessOutboxStatus.FAILED,
            BusinessOutboxStatus.LOCKED,
          ],
        },
      },
      orderBy: { availableAt: "asc" },
    }),
  ])
  const count = (status: OutboxStatus) =>
    groups.find((group) => group.status === status)?._count._all ?? 0

  return {
    pending: count("PENDING"),
    locked: count("LOCKED"),
    deferred: count("DEFERRED"),
    failed: count("FAILED"),
    deadLetter: count("DEAD_LETTER"),
    oldestActionableAt: oldest?.availableAt ?? null,
  }
}

export async function runBusinessEventOutboxWorker(
  input: ClaimBusinessEventOutboxInput,
  handler: (message: BusinessEventOutboxMessage) => Promise<void>,
  client: BusinessEventOutboxClient = defaultOutboxClient,
) {
  const messages = await claimBusinessEventOutboxMessages(input, client)
  const results = []

  for (const message of messages) {
    try {
      await handler(message)
      results.push(
        await markBusinessEventOutboxDelivered(
          {
            organizationId: message.organizationId,
            workerId: input.workerId,
            messageId: message.id,
            now: input.now,
          },
          client,
        ),
      )
    } catch (error) {
      results.push(
        await markBusinessEventOutboxFailed(
          {
            organizationId: message.organizationId,
            workerId: input.workerId,
            messageId: message.id,
            error,
            now: input.now,
          },
          client,
        ),
      )
    }
  }

  return results
}

export { retryAt as businessEventOutboxRetryAt }
