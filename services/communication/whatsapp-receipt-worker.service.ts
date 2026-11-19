import { BusinessOutboxStatus, type BusinessEventOutbox, type Prisma } from "@prisma/client"
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
  getPOSSaleCommitReceipt,
  type ReceiptDeliveryProviderInput,
  type SalesReceiptPayload,
} from "@/services/pos/receipt.service"
import { verifyPublicReceiptAccessToken } from "@/services/pos/public-receipt-token"
import { hashPublicReceiptToken } from "@/services/pos/public-receipt-token-registry.service"

import {
  WHATSAPP_RECEIPT_EVENT_NAME,
  WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
  WHATSAPP_RECEIPT_OUTCOME_UNCERTAIN,
  WHATSAPP_RECEIPT_RETRYABLE_REJECTION,
  whatsappReceiptSourceFingerprint,
  type WhatsAppReceiptOutboxPayload,
} from "./whatsapp-receipt-outbox.service"
import {
  describeWhatsAppReceiptConfig,
  hashWhatsAppDestination,
  sendWhatsAppReceipt,
  WhatsAppReceiptValidationError,
  type WhatsAppReceiptProviderResult,
} from "./whatsapp-receipt.provider"

type WhatsAppReceiptWorkerEnvironment = Record<string, string | undefined>

type WhatsAppReceiptWorkerDependencies = {
  describeWhatsAppReceiptConfig: typeof describeWhatsAppReceiptConfig
  getSalesReceipt: typeof getPOSSaleCommitReceipt
  sendWhatsAppReceipt: (input: ReceiptDeliveryProviderInput) => Promise<WhatsAppReceiptProviderResult>
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
  getSalesReceipt: getPOSSaleCommitReceipt,
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

const WHATSAPP_DISPATCH_STARTED = "WHATSAPP_DISPATCH_STARTED"
const UNCERTAIN_MESSAGE = "WhatsApp acceptance is unconfirmed. Review the original delivery before taking further action."

function leaseWhere(request: BusinessEventOutbox, lastErrorCode: string | null = request.lastErrorCode) {
  return {
    id: request.id,
    organizationId: request.organizationId,
    channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
    eventName: WHATSAPP_RECEIPT_EVENT_NAME,
    status: BusinessOutboxStatus.LOCKED,
    attempts: request.attempts,
    lockedBy: request.lockedBy,
    lockedAt: request.lockedAt,
    lastErrorCode,
  } satisfies Prisma.BusinessEventOutboxWhereInput
}

async function deferRequest(request: BusinessEventOutbox, now: Date) {
  await db.businessEventOutbox.updateMany({
    where: leaseWhere(request),
    data: {
      status: BusinessOutboxStatus.DEFERRED,
      lockedAt: null,
      lockedBy: null,
      failedAt: now,
      lastErrorCode: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
      lastErrorMessage: "WhatsApp receipt provider is not enabled or fully configured.",
    },
  })
}

async function failRequest(
  request: BusinessEventOutbox,
  now: Date,
  failure: { code: string; message: string; retryable: boolean; dispatched: boolean },
) {
  const exhausted = request.attempts >= request.maxAttempts || !failure.retryable

  await db.businessEventOutbox.updateMany({
    where: leaseWhere(request, failure.dispatched ? WHATSAPP_DISPATCH_STARTED : request.lastErrorCode),
    data: {
      status: exhausted ? BusinessOutboxStatus.DEAD_LETTER : BusinessOutboxStatus.FAILED,
      availableAt: exhausted ? now : retryAt(request.attempts, now),
      lockedAt: null,
      lockedBy: null,
      failedAt: now,
      lastErrorCode: failure.code,
      lastErrorMessage: failure.message,
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

async function assertRetainedReceiptLink(
  payload: WhatsAppReceiptOutboxPayload,
  now: Date,
  configuredOrigin?: string,
) {
  let url: URL
  let app: URL
  try {
    url = new URL(payload.digitalReceiptUrl)
    app = new URL(configuredOrigin ?? "")
  } catch {
    throw new BusinessRuleError("The retained receipt link is unavailable.")
  }
  const tokens = url.searchParams.getAll("token")
  if (app.protocol !== "https:" || app.href !== `${app.origin}/` || url.origin !== app.origin ||
      url.username || url.password || url.hash || tokens.length !== 1 || url.searchParams.size !== 1 ||
      url.pathname !== `/digital-receipt/${encodeURIComponent(payload.salesOrderId)}`) {
    throw new BusinessRuleError("The retained receipt link is unavailable.")
  }

  const token = tokens[0]!
  const verification = verifyPublicReceiptAccessToken({
    token, salesOrderId: payload.salesOrderId, organizationId: payload.organizationId, now,
  })
  if (!verification.ok || !("jti" in verification.payload)) {
    throw new BusinessRuleError("The retained receipt link is unavailable.")
  }

  const active = await db.publicReceiptAccessToken.findFirst({
    where: {
      organizationId: payload.organizationId,
      salesOrderId: payload.salesOrderId,
      tokenHash: hashPublicReceiptToken(token),
      jtiHash: hashPublicReceiptToken(verification.payload.jti),
      status: "ACTIVE",
      revokedAt: null,
      expiresAt: { gt: now },
      salesOrder: { is: { organizationId: payload.organizationId, channel: "POS", status: "COMPLETED", deletedAt: null } },
    },
    select: { id: true },
  })
  if (!active) throw new BusinessRuleError("The retained receipt link or completed sale is unavailable.")
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
  const scope = {
    organizationId: input.organizationId,
    channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
    eventName: WHATSAPP_RECEIPT_EVENT_NAME,
  } as const
  const actionable: Prisma.BusinessEventOutboxWhereInput = {
    availableAt: { lte: now },
    OR: [
      { status: BusinessOutboxStatus.PENDING },
      { status: BusinessOutboxStatus.FAILED, lastErrorCode: WHATSAPP_RECEIPT_RETRYABLE_REJECTION },
    ],
  }

  // A process can exit after the provider accepts a send and before we save
  // SENT. Legacy failures did not preserve that distinction either.
  await db.businessEventOutbox.updateMany({
    where: {
      ...scope,
      OR: [
        { status: BusinessOutboxStatus.LOCKED, lockedAt: { lt: staleBefore } },
        {
          status: BusinessOutboxStatus.FAILED,
          NOT: { lastErrorCode: WHATSAPP_RECEIPT_RETRYABLE_REJECTION },
        },
        { status: BusinessOutboxStatus.FAILED, lastErrorCode: null },
      ],
    },
    data: {
      status: BusinessOutboxStatus.DEAD_LETTER,
      lockedAt: null,
      lockedBy: null,
      failedAt: now,
      lastErrorCode: WHATSAPP_RECEIPT_OUTCOME_UNCERTAIN,
      lastErrorMessage: UNCERTAIN_MESSAGE,
    },
  })

  const candidates = await db.businessEventOutbox.findMany({
    where: { ...scope, ...actionable },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true },
  })

  const claimed = []
  for (const candidate of candidates) {
    const result = await db.businessEventOutbox.updateMany({
      where: {
        ...scope,
        ...actionable,
        id: candidate.id,
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

  if (request.lastErrorCode === WHATSAPP_DISPATCH_STARTED) {
    return { requestId: request.id, status: "IN_PROGRESS" as const }
  }

  let dispatched = false
  try {
    const payload = whatsAppReceiptOutboxPayloadSchema.parse(request.payload)
    if (payload.organizationId !== request.organizationId) {
      throw new BusinessRuleError(
        "WhatsApp receipt request tenant does not match its outbox tenant.",
      )
    }
    if (!request.destination || hashWhatsAppDestination(request.destination) !== payload.destinationHash) {
      throw new BusinessRuleError("WhatsApp receipt request destination does not match the consented request.")
    }

    const environment = input.environment ?? process.env
    const config = dependencies.describeWhatsAppReceiptConfig(environment)
    if (!config.liveSendsEnabled || !config.configured ||
        environment.STOQUIFY_WHATSAPP_RECEIPT_ORGANIZATION_ID?.trim() !== request.organizationId) {
      await deferRequest(request, now)
      return { requestId: request.id, status: "DEFERRED" as const }
    }

    const receipt = await dependencies.getSalesReceipt({
      salesOrderId: payload.salesOrderId,
      organizationId: payload.organizationId,
    })
    if (receipt.certification.legalDeliveryBlocked) {
      throw new BusinessRuleError("WhatsApp receipt delivery is blocked by fiscal controls.")
    }
    assertReceiptStillMatchesQueue(receipt, payload)
    await assertRetainedReceiptLink(payload, now, environment.NEXT_PUBLIC_APP_URL)

    // Fence the irreversible call before crossing the provider boundary.
    const started = await db.businessEventOutbox.updateMany({
      where: leaseWhere(request),
      data: { lastErrorCode: WHATSAPP_DISPATCH_STARTED, lastErrorMessage: null },
    })
    if (started.count !== 1) return { requestId: request.id, status: "IN_PROGRESS" as const }
    dispatched = true

    const deliveryInput = {
      receipt: receiptWithQueuedUrl(receipt, payload),
      destination: request.destination,
      locale: payload.locale,
      organizationId: payload.organizationId,
      userId: payload.requestedById,
    }
    const delivery = input.dependencies?.sendWhatsAppReceipt
      ? await dependencies.sendWhatsAppReceipt(deliveryInput)
      : await sendWhatsAppReceipt(deliveryInput, { environment })

    if (delivery.status !== "SENT" || !delivery.providerReference) {
      const uncertain = delivery.acceptance === "UNKNOWN" || delivery.status === "SENT"
      const retryable = delivery.status === "FAILED" && !uncertain && delivery.retryable
      await failRequest(request, now, {
        code: uncertain ? WHATSAPP_RECEIPT_OUTCOME_UNCERTAIN : retryable ? WHATSAPP_RECEIPT_RETRYABLE_REJECTION : "WHATSAPP_RECEIPT_FAILED",
        message: uncertain ? UNCERTAIN_MESSAGE : retryable ? "A confirmed temporary rejection is scheduled for retry." : "WhatsApp receipt delivery was rejected.",
        retryable,
        dispatched,
      })
      return { requestId: request.id, status: "FAILED" as const }
    }

    await db.$transaction(async (tx) => {
      const completed = await tx.businessEventOutbox.updateMany({
        where: leaseWhere(request, WHATSAPP_DISPATCH_STARTED),
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
    const knownPreflightFailure = error instanceof z.ZodError ||
      error instanceof WhatsAppReceiptValidationError ||
      (error instanceof ApplicationError && error.status < 500)
    const retryable = !dispatched && !knownPreflightFailure
    await failRequest(request, now, {
      code: dispatched ? WHATSAPP_RECEIPT_OUTCOME_UNCERTAIN : retryable ? WHATSAPP_RECEIPT_RETRYABLE_REJECTION : "INVALID_PAYLOAD",
      message: dispatched ? UNCERTAIN_MESSAGE : "The queued receipt could not be verified before dispatch.",
      retryable,
      dispatched,
    })
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
        error: error instanceof ApplicationError && error.expose ? error.message : "WhatsApp receipt request processing failed.",
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
