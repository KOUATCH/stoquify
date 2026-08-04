import { BusinessOutboxStatus } from "@prisma/client"
import { z } from "zod"

import { db } from "@/prisma/db"
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  getSalesReceipt,
  type ReceiptDeliveryProviderInput,
  type ReceiptDeliveryResult,
  type SalesReceiptPayload,
} from "@/services/pos/receipt.service"

import {
  WHATSAPP_RECEIPT_EVENT_NAME,
  WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
  whatsappReceiptSourceFingerprint,
  type WhatsAppReceiptOutboxPayload,
} from "./whatsapp-receipt-outbox.service"
import {
  describeWhatsAppReceiptConfig,
  sendWhatsAppReceipt,
} from "./whatsapp-receipt.provider"

type WhatsAppReceiptWorkerEnvironment = Record<string, string | undefined>

type WhatsAppReceiptWorkerDependencies = {
  describeWhatsAppReceiptConfig: typeof describeWhatsAppReceiptConfig
  getSalesReceipt: typeof getSalesReceipt
  sendWhatsAppReceipt: (input: ReceiptDeliveryProviderInput) => Promise<ReceiptDeliveryResult>
}

export type WhatsAppReceiptQueueSummary = {
  pending: number
  locked: number
  deferred: number
  failed: number
  deadLetter: number
  oldestActionableAt: Date | null
}

const defaultDependencies: WhatsAppReceiptWorkerDependencies = {
  describeWhatsAppReceiptConfig,
  getSalesReceipt,
  sendWhatsAppReceipt,
}

export const whatsAppReceiptOutboxPayloadSchema = z
  .object({
    organizationId: z.string().trim().min(1),
    salesOrderId: z.string().trim().min(1),
    orderNumber: z.string().trim().min(1),
    requestedById: z.string().trim().min(1),
    locale: z.enum(["EN", "FR"]),
    destinationHash: z.string().trim().min(1),
    redactedDestination: z.string().trim().min(1),
    digitalReceiptUrl: z.string().trim().min(1),
    sourcePayloadHash: z.string().trim().min(1),
  })
  .strict()

function retryAt(attempts: number, now: Date) {
  const seconds = Math.min(3600, 15 * 2 ** Math.max(0, attempts - 1))
  return new Date(now.getTime() + seconds * 1000)
}

async function deferRequest(
  id: string,
  workerId: string,
  reason: string,
  now: Date,
) {
  await db.businessEventOutbox.updateMany({
    where: {
      id,
      channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
      eventName: WHATSAPP_RECEIPT_EVENT_NAME,
      status: BusinessOutboxStatus.LOCKED,
      lockedBy: workerId,
    },
    data: {
      status: BusinessOutboxStatus.DEFERRED,
      lockedAt: null,
      lockedBy: null,
      failedAt: now,
      lastErrorCode: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
      lastErrorMessage: reason.slice(0, 1000),
    },
  })
}

async function failRequest(
  request: {
    id: string
    attempts: number
    maxAttempts: number
  },
  workerId: string,
  error: unknown,
  now: Date,
  retryable = true,
) {
  const exhausted = request.attempts >= request.maxAttempts || !retryable
  const message = error instanceof Error ? error.message : String(error)

  await db.businessEventOutbox.updateMany({
    where: {
      id: request.id,
      channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
      eventName: WHATSAPP_RECEIPT_EVENT_NAME,
      status: BusinessOutboxStatus.LOCKED,
      lockedBy: workerId,
    },
    data: {
      status: exhausted ? BusinessOutboxStatus.DEAD_LETTER : BusinessOutboxStatus.FAILED,
      availableAt: exhausted ? now : retryAt(request.attempts, now),
      lockedAt: null,
      lockedBy: null,
      failedAt: now,
      lastErrorCode: error instanceof z.ZodError ? "INVALID_PAYLOAD" : "WHATSAPP_RECEIPT_FAILED",
      lastErrorMessage: message.slice(0, 1000),
    },
  })
}

function receiptWithQueuedUrl(
  receipt: SalesReceiptPayload,
  payload: WhatsAppReceiptOutboxPayload,
): SalesReceiptPayload {
  return {
    ...receipt,
    digitalReceiptUrl: payload.digitalReceiptUrl,
  }
}

function assertReceiptStillMatchesQueue(
  receipt: SalesReceiptPayload,
  payload: WhatsAppReceiptOutboxPayload,
) {
  const sourcePayloadHash = whatsappReceiptSourceFingerprint({
    salesOrderId: receipt.receipt.id,
    orderNumber: receipt.receipt.orderNumber,
    total: receipt.receipt.total,
    digitalReceiptUrl: payload.digitalReceiptUrl,
    destinationHash: payload.destinationHash,
  })

  if (
    payload.salesOrderId !== receipt.receipt.id ||
    payload.orderNumber !== receipt.receipt.orderNumber ||
    sourcePayloadHash !== payload.sourcePayloadHash
  ) {
    throw new ConflictError(
      "WhatsApp receipt payload no longer matches the queued POS sale receipt.",
    )
  }
}

export async function claimWhatsAppReceiptDeliveries(input: {
  organizationId?: string
  workerId: string
  limit?: number
  now?: Date
  staleAfterMs?: number
}) {
  const now = input.now ?? new Date()
  const limit = Math.min(100, Math.max(1, input.limit ?? 25))
  const staleBefore = new Date(now.getTime() - (input.staleAfterMs ?? 5 * 60_000))

  const candidates = await db.businessEventOutbox.findMany({
    where: {
      organizationId: input.organizationId,
      channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
      eventName: WHATSAPP_RECEIPT_EVENT_NAME,
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

  const claimed = []
  for (const candidate of candidates) {
    const result = await db.businessEventOutbox.updateMany({
      where: {
        id: candidate.id,
        channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
        eventName: WHATSAPP_RECEIPT_EVENT_NAME,
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

export async function processWhatsAppReceiptDelivery(input: {
  requestId: string
  workerId: string
  now?: Date
  environment?: WhatsAppReceiptWorkerEnvironment
  dependencies?: Partial<WhatsAppReceiptWorkerDependencies>
}) {
  const now = input.now ?? new Date()
  const dependencies = { ...defaultDependencies, ...input.dependencies }
  const request = await db.businessEventOutbox.findFirst({
    where: {
      id: input.requestId,
      channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
      eventName: WHATSAPP_RECEIPT_EVENT_NAME,
      status: BusinessOutboxStatus.LOCKED,
      lockedBy: input.workerId,
    },
  })
  if (!request) throw new NotFoundError("Claimed WhatsApp receipt request was not found.")

  try {
    const payload = whatsAppReceiptOutboxPayloadSchema.parse(request.payload)
    if (payload.organizationId !== request.organizationId) {
      throw new BusinessRuleError(
        "WhatsApp receipt request tenant does not match its outbox tenant.",
      )
    }
    if (!request.destination) {
      throw new BusinessRuleError("WhatsApp receipt request is missing its delivery destination.")
    }

    const config = dependencies.describeWhatsAppReceiptConfig(input.environment)
    if (!config.liveSendsEnabled || !config.configured) {
      await deferRequest(
        request.id,
        input.workerId,
        "WhatsApp receipt provider is not enabled or fully configured.",
        now,
      )
      return { requestId: request.id, status: "DEFERRED" as const }
    }

    const receipt = await dependencies.getSalesReceipt({
      salesOrderId: payload.salesOrderId,
      organizationId: payload.organizationId,
    })
    assertReceiptStillMatchesQueue(receipt, payload)

    const delivery = await dependencies.sendWhatsAppReceipt({
      receipt: receiptWithQueuedUrl(receipt, payload),
      destination: request.destination,
      locale: payload.locale,
      organizationId: payload.organizationId,
      userId: payload.requestedById,
    })

    if (delivery.status !== "SENT") {
      await failRequest(request, input.workerId, new Error(delivery.message), now, delivery.retryable)
      return { requestId: request.id, status: "FAILED" as const }
    }

    await db.$transaction(async (tx) => {
      const completed = await tx.businessEventOutbox.updateMany({
        where: {
          id: request.id,
          organizationId: payload.organizationId,
          status: BusinessOutboxStatus.LOCKED,
          lockedBy: input.workerId,
        },
        data: {
          status: BusinessOutboxStatus.SENT,
          processedAt: now,
          lockedAt: null,
          lockedBy: null,
          failedAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      })
      if (completed.count !== 1) {
        throw new ConflictError("WhatsApp receipt request lease was lost before completion.")
      }

      await recordBusinessEventInTx(tx, {
        organizationId: payload.organizationId,
        eventType: "POS_RECEIPT_WHATSAPP_DELIVERY_SENT",
        eventSource: "WORKER",
        idempotencyKey: `whatsapp-receipt:${request.id}:sent`,
        actorId: payload.requestedById,
        sourceType: "POS_SALE",
        sourceId: payload.salesOrderId,
        documentHash: hashBusinessPayload({
          outboxId: request.id,
          destinationHash: payload.destinationHash,
          providerReference: delivery.providerReference,
        }),
        payload: {
          outboxId: request.id,
          salesOrderId: payload.salesOrderId,
          destinationHash: payload.destinationHash,
          redactedDestination: payload.redactedDestination,
          providerReference: delivery.providerReference,
          status: delivery.status,
        },
      })
    })

    return {
      requestId: request.id,
      status: "SENT" as const,
      providerReference: delivery.providerReference,
    }
  } catch (error) {
    await failRequest(request, input.workerId, error, now)
    if (error instanceof ApplicationError) throw error
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "WhatsApp receipt request processing failed.",
      500,
      false,
    )
  }
}

export async function runWhatsAppReceiptWorker(input: {
  organizationId?: string
  workerId: string
  limit?: number
  now?: Date
  environment?: WhatsAppReceiptWorkerEnvironment
  dependencies?: Partial<WhatsAppReceiptWorkerDependencies>
}) {
  const requestIds = await claimWhatsAppReceiptDeliveries(input)
  const results = []

  for (const requestId of requestIds) {
    try {
      results.push(
        await processWhatsAppReceiptDelivery({
          requestId,
          workerId: input.workerId,
          now: input.now,
          environment: input.environment,
          dependencies: input.dependencies,
        }),
      )
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

export async function getWhatsAppReceiptQueueSummary(
  organizationId: string,
): Promise<WhatsAppReceiptQueueSummary> {
  const [groups, oldest] = await Promise.all([
    db.businessEventOutbox.groupBy({
      by: ["status"],
      where: {
        organizationId,
        channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
        eventName: WHATSAPP_RECEIPT_EVENT_NAME,
      },
      _count: { _all: true },
    }),
    db.businessEventOutbox.findFirst({
      where: {
        organizationId,
        channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
        eventName: WHATSAPP_RECEIPT_EVENT_NAME,
        status: {
          in: [
            BusinessOutboxStatus.PENDING,
            BusinessOutboxStatus.FAILED,
            BusinessOutboxStatus.LOCKED,
          ],
        },
      },
      orderBy: { availableAt: "asc" },
      select: { availableAt: true },
    }),
  ])
  const count = (status: string) =>
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
