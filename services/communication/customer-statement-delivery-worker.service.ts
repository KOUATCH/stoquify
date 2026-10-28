import { createHash } from "node:crypto"
import {
  BusinessOutboxStatus,
  CustomerStatementDeliveryChannel,
  CustomerStatementDeliveryStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { db } from "@/prisma/db"
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  openCustomerStatementDeliveryEnvelope,
} from "@/services/accounting/customer-statement-delivery-envelope"
import {
  CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME,
} from "@/services/accounting/customer-statement-delivery.service"
import { verifyCustomerStatementAccessToken } from "@/services/accounting/customer-statement-token"
import { hashWhatsAppDestination } from "./whatsapp-receipt.provider"

import {
  sendCustomerStatementDelivery,
  type CustomerStatementProviderResult,
} from "./customer-statement-delivery.provider"

type WorkerEnvironment = Record<string, string | undefined>

const outboxPayloadSchema = z.object({
  schemaVersion: z.literal("customer-statement-delivery.v1"),
  deliveryId: z.string().min(1),
  organizationId: z.string().min(1),
  statementSnapshotId: z.string().min(1),
  statementContentHash: z.string().regex(/^[0-9a-f]{64}$/),
  tokenId: z.string().min(1),
  attributionId: z.string().min(1),
  referralCode: z.string().min(12).max(64),
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  locale: z.enum(["EN", "FR"]),
  destinationHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  redactedDestination: z.string().min(3),
  consentEvidenceHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  sealedEnvelope: z.string().min(1),
  sealedEnvelopeHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
}).strict()

type WorkerDependencies = {
  sendCustomerStatementDelivery: typeof sendCustomerStatementDelivery
}

const defaultDependencies: WorkerDependencies = {
  sendCustomerStatementDelivery,
}

function sha256(value: string) {
  return "sha256:" + createHash("sha256").update(value).digest("hex")
}

function retryAt(attempts: number, now: Date) {
  const seconds = Math.min(3600, 15 * 2 ** Math.max(0, attempts - 1))
  return new Date(now.getTime() + seconds * 1000)
}

function destinationHash(
  channel: CustomerStatementDeliveryChannel,
  destination: string,
) {
  if (channel === CustomerStatementDeliveryChannel.EMAIL) {
    return sha256(destination.trim().toLowerCase())
  }
  return hashWhatsAppDestination(destination)
}

function assertTransition(
  current: CustomerStatementDeliveryStatus,
  next: CustomerStatementDeliveryStatus,
) {
  if (
    current === CustomerStatementDeliveryStatus.SENT ||
    current === CustomerStatementDeliveryStatus.DEAD_LETTER ||
    current === CustomerStatementDeliveryStatus.CANCELLED
  ) {
    throw new ConflictError("Terminal statement delivery state cannot change")
  }
  if (next === CustomerStatementDeliveryStatus.QUEUED) {
    throw new ConflictError("Statement delivery cannot return to QUEUED")
  }
}

async function appendDeliveryStateInTx(
  tx: Prisma.TransactionClient,
  input: {
    delivery: {
      id: string
      organizationId: string
      payloadHash: string
      statementSnapshotId: string
      states: Array<{
        version: number
        status: CustomerStatementDeliveryStatus
        stateHash: string
      }>
    }
    status: CustomerStatementDeliveryStatus
    occurredAt: Date
    providerReference?: string
    errorCode?: string
    outboxId: string
    outboxPayloadHash: string
    attempt: number
  },
) {
  const current = input.delivery.states[0]
  if (!current) throw new ConflictError("Statement delivery state is missing")
  assertTransition(current.status, input.status)

  const providerReferenceHash = input.providerReference
    ? hashBusinessPayload(input.providerReference)
    : null
  const evidenceHash = hashBusinessPayload({
    deliveryId: input.delivery.id,
    deliveryPayloadHash: input.delivery.payloadHash,
    outboxId: input.outboxId,
    outboxPayloadHash: input.outboxPayloadHash,
    attempt: input.attempt,
    status: input.status,
    providerReferenceHash,
    errorCode: input.errorCode ?? null,
  })
  const nextVersion = current.version + 1
  const stateHash = hashBusinessPayload({
    organizationId: input.delivery.organizationId,
    deliveryId: input.delivery.id,
    version: nextVersion,
    status: input.status,
    occurredAt: input.occurredAt.toISOString(),
    providerReferenceHash,
    errorCode: input.errorCode ?? null,
    previousStateHash: current.stateHash,
    evidenceHash,
  })
  const event = await recordBusinessEventInTx(tx, {
    organizationId: input.delivery.organizationId,
    eventType: "CUSTOMER_STATEMENT_DELIVERY_" + input.status,
    eventSource: "WORKER",
    schemaVersion: 1,
    idempotencyKey:
      "customer-statement-delivery:" +
      input.delivery.id +
      ":" +
      input.attempt +
      ":" +
      input.status,
    sourceType: "CUSTOMER_STATEMENT_DELIVERY",
    sourceId: input.delivery.id,
    documentHash: input.delivery.payloadHash,
    payload: {
      deliveryId: input.delivery.id,
      statementSnapshotId: input.delivery.statementSnapshotId,
      status: input.status,
      version: nextVersion,
      outboxId: input.outboxId,
      providerReferenceHash,
      errorCode: input.errorCode ?? null,
      stateHash,
    },
    metadata: {
      providerReferenceStoredAsHash: true,
      providerDestinationStored: false,
    },
  })
  const state = await tx.customerStatementDeliveryState.create({
    data: {
      organizationId: input.delivery.organizationId,
      deliveryId: input.delivery.id,
      version: nextVersion,
      status: input.status,
      occurredAt: input.occurredAt,
      providerReferenceHash,
      errorCode: input.errorCode ?? null,
      previousStateHash: current.stateHash,
      stateHash,
      evidenceHash,
      businessEventId: event.event.id,
    },
  })
  await markBusinessEventAppliedInTx(
    tx,
    input.delivery.organizationId,
    event.event.id,
  )
  return state
}

async function settleDelivery(input: {
  requestId: string
  workerId: string
  attempt: number
  status: CustomerStatementDeliveryStatus
  outboxStatus: BusinessOutboxStatus
  now: Date
  providerResult?: CustomerStatementProviderResult
  errorCode?: string
}) {
  return db.$transaction(async (tx) => {
    const request = await tx.businessEventOutbox.findFirst({
      where: {
        id: input.requestId,
        eventName: CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME,
        status: BusinessOutboxStatus.LOCKED,
        lockedBy: input.workerId,
      },
      select: { id: true, payloadHash: true },
    })
    if (!request) throw new ConflictError("Statement delivery lease was lost")

    const delivery = await tx.customerStatementDelivery.findFirst({
      where: { outboxId: input.requestId },
      include: {
        states: {
          orderBy: [{ version: "desc" }, { occurredAt: "desc" }],
          take: 1,
          select: { version: true, status: true, stateHash: true },
        },
      },
    })
    if (!delivery) throw new NotFoundError("Statement delivery evidence was not found")

    const transitioned = await tx.businessEventOutbox.updateMany({
      where: {
        id: input.requestId,
        status: BusinessOutboxStatus.LOCKED,
        lockedBy: input.workerId,
      },
      data: {
        status: input.outboxStatus,
        availableAt:
          input.outboxStatus === BusinessOutboxStatus.FAILED
            ? retryAt(input.attempt, input.now)
            : input.now,
        processedAt:
          input.outboxStatus === BusinessOutboxStatus.SENT
            ? input.now
            : null,
        failedAt:
          input.outboxStatus === BusinessOutboxStatus.FAILED ||
          input.outboxStatus === BusinessOutboxStatus.DEAD_LETTER ||
          input.outboxStatus === BusinessOutboxStatus.DEFERRED
            ? input.now
            : null,
        lockedAt: null,
        lockedBy: null,
        lastErrorCode: input.errorCode ?? null,
        lastErrorMessage:
          input.providerResult?.message.slice(0, 1000) ?? null,
      },
    })
    if (transitioned.count !== 1) {
      throw new ConflictError("Statement delivery lease was lost")
    }

    await appendDeliveryStateInTx(tx, {
      delivery,
      status: input.status,
      occurredAt: input.now,
      providerReference: input.providerResult?.providerReference,
      errorCode: input.errorCode,
      outboxId: request.id,
      outboxPayloadHash: request.payloadHash,
      attempt: input.attempt,
    })
    await tx.auditLog.create({
      data: {
        organizationId: delivery.organizationId,
        entityType: "CustomerStatementDelivery",
        entityId: delivery.id,
        action: "CUSTOMER_STATEMENT_DELIVERY_" + input.status,
        userId: null,
        changes: {
          after: {
            status: input.status,
            outboxStatus: input.outboxStatus,
            attempt: input.attempt,
            providerReferenceHash: input.providerResult?.providerReference
              ? hashBusinessPayload(input.providerResult.providerReference)
              : null,
            errorCode: input.errorCode ?? null,
          },
        },
      },
    })
    return delivery
  })
}

export async function claimCustomerStatementDeliveries(input: {
  organizationId?: string
  workerId: string
  limit?: number
  now?: Date
  staleAfterMs?: number
}) {
  const now = input.now ?? new Date()
  const limit = Math.min(100, Math.max(1, input.limit ?? 25))
  const staleBefore = new Date(
    now.getTime() - (input.staleAfterMs ?? 5 * 60_000),
  )
  const candidates = await db.businessEventOutbox.findMany({
    where: {
      organizationId: input.organizationId,
      eventName: CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME,
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
    take: limit,
    select: { id: true },
  })

  const claimed: string[] = []
  for (const candidate of candidates) {
    const result = await db.businessEventOutbox.updateMany({
      where: {
        id: candidate.id,
        eventName: CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME,
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
        lockedBy: input.workerId,
        attempts: { increment: 1 },
      },
    })
    if (result.count === 1) claimed.push(candidate.id)
  }
  return claimed
}

export async function processCustomerStatementDelivery(input: {
  requestId: string
  workerId: string
  now?: Date
  environment?: WorkerEnvironment
  dependencies?: Partial<WorkerDependencies>
}) {
  const now = input.now ?? new Date()
  const environment = input.environment ?? process.env
  const dependencies = { ...defaultDependencies, ...input.dependencies }
  const request = await db.businessEventOutbox.findFirst({
    where: {
      id: input.requestId,
      eventName: CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME,
      status: BusinessOutboxStatus.LOCKED,
      lockedBy: input.workerId,
    },
  })
  if (!request) throw new NotFoundError("Claimed statement delivery was not found")

  try {
    const payload = outboxPayloadSchema.parse(request.payload)
    if (payload.organizationId !== request.organizationId) {
      throw new BusinessRuleError("Statement delivery tenant evidence does not match")
    }
    if (sha256(payload.sealedEnvelope) !== payload.sealedEnvelopeHash) {
      throw new ConflictError("Statement delivery envelope hash does not match")
    }
    const envelope = openCustomerStatementDeliveryEnvelope(
      payload.sealedEnvelope,
      environment,
    )
    if (!envelope) throw new ConflictError("Statement delivery envelope is invalid")

    const delivery = await db.customerStatementDelivery.findFirst({
      where: {
        id: payload.deliveryId,
        organizationId: payload.organizationId,
        outboxId: request.id,
      },
      include: {
        token: {
          select: {
            id: true,
            status: true,
            revokedAt: true,
            expiresAt: true,
            statementContentHash: true,
          },
        },
        attribution: {
          select: { id: true, referralCode: true },
        },
        statementSnapshot: {
          select: {
            id: true,
            statementNumber: true,
            contentHash: true,
            closingBalance: true,
            currency: true,
            organization: { select: { name: true } },
          },
        },
      },
    })
    if (!delivery) throw new NotFoundError("Statement delivery evidence was not found")
    if (
      delivery.statementSnapshotId !== payload.statementSnapshotId ||
      delivery.statementContentHash !== payload.statementContentHash ||
      delivery.tokenId !== payload.tokenId ||
      delivery.attributionId !== payload.attributionId ||
      delivery.destinationHash !== payload.destinationHash ||
      delivery.consentEvidenceHash !== payload.consentEvidenceHash ||
      delivery.channel !== payload.channel ||
      delivery.token.id !== envelope.tokenId ||
      delivery.attribution.referralCode !== envelope.referralCode ||
      envelope.statementSnapshotId !== payload.statementSnapshotId ||
      envelope.referralCode !== payload.referralCode ||
      destinationHash(delivery.channel, envelope.destination) !==
        payload.destinationHash ||
      delivery.statementSnapshot.contentHash !== payload.statementContentHash ||
      delivery.token.statementContentHash !== payload.statementContentHash ||
      delivery.token.status !== "ACTIVE" ||
      delivery.token.revokedAt ||
      delivery.token.expiresAt.getTime() <= now.getTime()
    ) {
      throw new ConflictError("Statement delivery evidence no longer matches")
    }
    const accessUrl = new URL(envelope.accessUrl, "https://stoquify.invalid")
    const token = accessUrl.searchParams.get("token")
    const verification = verifyCustomerStatementAccessToken({
      token,
      statementSnapshotId: payload.statementSnapshotId,
      now,
    })
    if (
      !verification.ok ||
      verification.payload.organizationId !== payload.organizationId ||
      verification.payload.statementContentHash !== payload.statementContentHash
    ) {
      throw new ConflictError("Statement delivery access token is invalid")
    }

    const providerResult = await dependencies.sendCustomerStatementDelivery({
      channel: delivery.channel,
      destination: envelope.destination,
      accessUrl: envelope.accessUrl,
      statementNumber: delivery.statementSnapshot.statementNumber,
      closingBalance: delivery.statementSnapshot.closingBalance.toFixed(2),
      currency: delivery.statementSnapshot.currency,
      businessName: delivery.statementSnapshot.organization.name,
      locale: payload.locale,
      referralCode: payload.referralCode,
    }, { environment })

    if (providerResult.status === "SENT") {
      await settleDelivery({
        requestId: request.id,
        workerId: input.workerId,
        attempt: request.attempts,
        status: CustomerStatementDeliveryStatus.SENT,
        outboxStatus: BusinessOutboxStatus.SENT,
        now,
        providerResult,
      })
      return { requestId: request.id, status: "SENT" as const }
    }
    if (providerResult.status === "DEFERRED") {
      await settleDelivery({
        requestId: request.id,
        workerId: input.workerId,
        attempt: request.attempts,
        status: CustomerStatementDeliveryStatus.DEFERRED,
        outboxStatus: BusinessOutboxStatus.DEFERRED,
        now,
        providerResult,
        errorCode: "PROVIDER_NOT_CONFIGURED",
      })
      return { requestId: request.id, status: "DEFERRED" as const }
    }

    const exhausted = request.attempts >= request.maxAttempts || !providerResult.retryable
    await settleDelivery({
      requestId: request.id,
      workerId: input.workerId,
      attempt: request.attempts,
      status: exhausted
        ? CustomerStatementDeliveryStatus.DEAD_LETTER
        : CustomerStatementDeliveryStatus.FAILED,
      outboxStatus: exhausted
        ? BusinessOutboxStatus.DEAD_LETTER
        : BusinessOutboxStatus.FAILED,
      now,
      providerResult,
      errorCode: "STATEMENT_DELIVERY_PROVIDER_FAILED",
    })
    return {
      requestId: request.id,
      status: exhausted ? "DEAD_LETTER" as const : "FAILED" as const,
    }
  } catch (error) {
    await db.businessEventOutbox.updateMany({
      where: {
        id: request.id,
        status: BusinessOutboxStatus.LOCKED,
        lockedBy: input.workerId,
      },
      data: {
        status: request.attempts >= request.maxAttempts
          ? BusinessOutboxStatus.DEAD_LETTER
          : BusinessOutboxStatus.FAILED,
        availableAt: retryAt(request.attempts, now),
        lockedAt: null,
        lockedBy: null,
        failedAt: now,
        lastErrorCode:
          error instanceof z.ZodError
            ? "INVALID_PAYLOAD"
            : "STATEMENT_DELIVERY_INTEGRITY_FAILED",
        lastErrorMessage: "Statement delivery validation failed.",
      },
    })
    if (error instanceof ApplicationError) throw error
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Statement delivery processing failed.",
      500,
      false,
    )
  }
}

export async function runCustomerStatementDeliveryWorker(input: {
  organizationId?: string
  workerId: string
  limit?: number
  now?: Date
  environment?: WorkerEnvironment
  dependencies?: Partial<WorkerDependencies>
}) {
  const requestIds = await claimCustomerStatementDeliveries(input)
  const results = []
  for (const requestId of requestIds) {
    try {
      results.push(await processCustomerStatementDelivery({
        requestId,
        workerId: input.workerId,
        now: input.now,
        environment: input.environment,
        dependencies: input.dependencies,
      }))
    } catch (error) {
      results.push({
        requestId,
        status: "FAILED" as const,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return results
}
