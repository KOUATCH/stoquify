import type { Prisma } from "@prisma/client"

import { ConflictError } from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import type { ReceiptLocale } from "@/services/pos/pos.schemas"
import type {
  ReceiptDeliveryResult,
  SalesReceiptPayload,
} from "@/services/pos/receipt.service"

import {
  hashWhatsAppDestination,
  normalizeWhatsAppPhoneNumber,
  redactWhatsAppPhoneNumber,
} from "./whatsapp-receipt.provider"

export const WHATSAPP_RECEIPT_EVENT_TYPE = "POS_RECEIPT_WHATSAPP_DELIVERY_REQUESTED"
export const WHATSAPP_RECEIPT_EVENT_NAME = "pos.receipt.whatsapp.requested"
export const WHATSAPP_RECEIPT_OUTBOX_CHANNEL = "WEBHOOK"
export const WHATSAPP_RECEIPT_MAX_ATTEMPTS = 5
export const WHATSAPP_RECEIPT_RETRYABLE_REJECTION = "WHATSAPP_RETRYABLE_REJECTION"
export const WHATSAPP_RECEIPT_OUTCOME_UNCERTAIN = "WHATSAPP_OUTCOME_UNCERTAIN"

type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0]

type WhatsAppReceiptOutboxTx = BusinessEventTx & {
  auditLog: {
    create(args: unknown): Promise<unknown>
  }
}

export type QueueWhatsAppReceiptDeliveryInput = {
  receipt: SalesReceiptPayload
  destination?: string
  locale: ReceiptLocale
  organizationId: string
  userId: string
}

export type WhatsAppReceiptOutboxPayload = {
  organizationId: string
  salesOrderId: string
  orderNumber: string
  requestedById: string
  locale: ReceiptLocale
  destinationHash: string
  redactedDestination: string
  digitalReceiptUrl: string
  sourcePayloadHash: string
}

export function whatsAppReceiptIdempotencyKey(salesOrderId: string, destinationHash: string) {
  return `pos-receipt:${salesOrderId}:whatsapp:${destinationHash}`
}

function cleanJson(input: Record<string, unknown>): Prisma.JsonObject {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Prisma.JsonObject
}

export function whatsappReceiptSourceFingerprint(input: {
  salesOrderId: string
  orderNumber: string
  total: number
  digitalReceiptUrl: string
  destinationHash: string
}) {
  return hashBusinessPayload({
    salesOrderId: input.salesOrderId,
    orderNumber: input.orderNumber,
    total: input.total,
    digitalReceiptUrl: input.digitalReceiptUrl,
    destinationHash: input.destinationHash,
  })
}

function queuedMessage(event: { outboxMessages?: unknown[] }) {
  const outbox = event.outboxMessages?.find((message) => {
    return (
      typeof message === "object" &&
      message !== null &&
      (message as { eventName?: unknown }).eventName === WHATSAPP_RECEIPT_EVENT_NAME
    )
  })
  return outbox as { id?: string; payload?: Partial<WhatsAppReceiptOutboxPayload> } | undefined
}

export async function queueWhatsAppReceiptDeliveryInTx(
  tx: WhatsAppReceiptOutboxTx,
  input: QueueWhatsAppReceiptDeliveryInput,
): Promise<ReceiptDeliveryResult> {
  const normalizedDestination = normalizeWhatsAppPhoneNumber(input.destination)
  const destinationHash = hashWhatsAppDestination(normalizedDestination)
  const redactedDestination = redactWhatsAppPhoneNumber(normalizedDestination)
  const idempotencyKey = whatsAppReceiptIdempotencyKey(input.receipt.receipt.id, destinationHash)
  const pendingResult = {
    channel: "WHATSAPP",
    status: "PENDING",
    destination: redactedDestination,
    destinationHash,
    retryable: false,
    message: "WhatsApp receipt delivery was queued for controlled background processing.",
  } as const

  const existing = await tx.businessEvent.findUnique({
    where: {
      organizationId_eventSource_idempotencyKey: {
        organizationId: input.organizationId,
        eventSource: "POS",
        idempotencyKey,
      },
    },
    include: { outboxMessages: true },
  })
  if (existing) {
    const original = queuedMessage(existing)
    const prev = original?.payload
    if (existing.eventType !== WHATSAPP_RECEIPT_EVENT_TYPE || !original?.id || !prev ||
        prev.organizationId !== input.organizationId || prev.destinationHash !== destinationHash ||
        prev.salesOrderId !== input.receipt.receipt.id || prev.orderNumber !== input.receipt.receipt.orderNumber ||
        typeof prev.digitalReceiptUrl !== "string" ||
        prev.sourcePayloadHash !== whatsappReceiptSourceFingerprint({
          salesOrderId: input.receipt.receipt.id,
          orderNumber: input.receipt.receipt.orderNumber,
          total: input.receipt.receipt.total,
          digitalReceiptUrl: prev.digitalReceiptUrl,
          destinationHash,
        })) {
      throw new ConflictError("The stored WhatsApp delivery does not match this receipt request.")
    }
    return { ...pendingResult, providerReference: original.id, digitalReceiptUrl: prev.digitalReceiptUrl }
  }

  const sourcePayloadHash = whatsappReceiptSourceFingerprint({
    salesOrderId: input.receipt.receipt.id,
    orderNumber: input.receipt.receipt.orderNumber,
    total: input.receipt.receipt.total,
    digitalReceiptUrl: input.receipt.digitalReceiptUrl,
    destinationHash,
  })

  const payload: WhatsAppReceiptOutboxPayload = {
    organizationId: input.organizationId,
    salesOrderId: input.receipt.receipt.id,
    orderNumber: input.receipt.receipt.orderNumber,
    requestedById: input.userId,
    locale: input.locale,
    destinationHash,
    redactedDestination,
    digitalReceiptUrl: input.receipt.digitalReceiptUrl,
    sourcePayloadHash,
  }

  // Only the dispatch worker needs the bearer URL. Keep it out of the business
  // event and audit payloads.
  const { digitalReceiptUrl: _receiptUrl, ...eventPayload } = payload
  const recorded = await recordBusinessEventInTx(tx, {
    organizationId: input.organizationId,
    eventType: WHATSAPP_RECEIPT_EVENT_TYPE,
    eventSource: "POS",
    idempotencyKey,
    actorId: input.userId,
    locationId: undefined,
    registerId: input.receipt.receipt.terminal,
    sourceType: "POS_SALE",
    sourceId: input.receipt.receipt.id,
    documentHash: sourcePayloadHash,
    payload: eventPayload,
    metadata: {
      receiptChannel: "WHATSAPP",
      destinationHash,
      redactedDestination,
    },
    outboxMessages: [
      {
        channel: WHATSAPP_RECEIPT_OUTBOX_CHANNEL,
        eventName: WHATSAPP_RECEIPT_EVENT_NAME,
        destination: normalizedDestination,
        idempotencyKey,
        payload,
        maxAttempts: WHATSAPP_RECEIPT_MAX_ATTEMPTS,
        metadata: {
          provider: "WHATSAPP",
          destinationHash,
          redactedDestination,
        },
      },
    ],
  })

  const result: ReceiptDeliveryResult = {
    ...pendingResult,
    providerReference: queuedMessage(recorded.event)?.id ?? recorded.event.id,
    digitalReceiptUrl: input.receipt.digitalReceiptUrl,
  }

  await tx.auditLog.create({
    data: {
      entityType: "SalesOrder",
      entityId: input.receipt.receipt.id,
      action: "RECEIPT_WHATSAPP",
      organizationId: input.organizationId,
      userId: input.userId,
      changes: cleanJson({
        channel: result.channel,
        status: result.status,
        destination: result.destination,
        destinationHash: result.destinationHash,
        providerReference: result.providerReference,
        retryable: result.retryable,
        message: result.message,
        orderNumber: input.receipt.receipt.orderNumber,
        businessEventId: recorded.event.id,
        created: recorded.created,
      }),
    },
  })

  return result
}
