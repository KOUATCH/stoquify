import type { Prisma } from "@prisma/client"

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

function queuedReference(event: { id: string; outboxMessages?: unknown[] }) {
  const outbox = event.outboxMessages?.find((message) => {
    return (
      typeof message === "object" &&
      message !== null &&
      (message as { eventName?: unknown }).eventName === WHATSAPP_RECEIPT_EVENT_NAME
    )
  })
  const outboxId = outbox && typeof outbox === "object" ? (outbox as { id?: unknown }).id : null
  return typeof outboxId === "string" ? outboxId : event.id
}

export async function queueWhatsAppReceiptDeliveryInTx(
  tx: WhatsAppReceiptOutboxTx,
  input: QueueWhatsAppReceiptDeliveryInput,
): Promise<ReceiptDeliveryResult> {
  const normalizedDestination = normalizeWhatsAppPhoneNumber(input.destination)
  const destinationHash = hashWhatsAppDestination(normalizedDestination)
  const redactedDestination = redactWhatsAppPhoneNumber(normalizedDestination)
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

  const idempotencyKey = `pos-receipt:${input.receipt.receipt.id}:whatsapp:${destinationHash}`
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
    payload,
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
    channel: "WHATSAPP",
    status: "PENDING",
    destination: redactedDestination,
    destinationHash,
    providerReference: queuedReference(recorded.event),
    retryable: false,
    message: "WhatsApp receipt delivery was queued for controlled background processing.",
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
        digitalReceiptUrl: input.receipt.digitalReceiptUrl,
        businessEventId: recorded.event.id,
        created: recorded.created,
      }),
    },
  })

  return result
}
