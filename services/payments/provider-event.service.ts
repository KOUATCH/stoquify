import {
  ExceptionSeverity,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentReconciliationInboxSource,
  PaymentReconciliationInboxStatus,
  ProviderAccountStatus,
  ProviderEventStatus,
  Prisma,
} from "@prisma/client"
import { randomUUID } from "node:crypto"

import { AlertSeverity, AlertType, createAlert } from "@/lib/error-handling/monitoring"
import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"

import type { ParsedProviderEvent, PaymentProviderAdapter, ProviderWebhookHeaders } from "./payment-ingestion.types"
import { PaymentIngestionError } from "./payment-ingestion.types"
import { sha256 } from "./adapters/mobile-money-hmac.adapter"

export type CaptureProviderEventInput = {
  organizationId: string
  providerAccountId?: string
  providerCode?: string
  adapter: PaymentProviderAdapter
  rawBody: string
  headers: ProviderWebhookHeaders
  secret: string
  receivedAt?: Date
  now?: Date
  correlationId?: string
}

export type CaptureProviderEventResult = {
  status: "CAPTURED" | "DUPLICATE" | "TAMPERED" | "REJECTED"
  providerEventId: string
  providerEventRecordId?: string
  inboxItemId?: string
  exceptionId?: string
  rawPayloadHash: string
  correlationId: string
}

function payloadSize(rawBody: string) {
  return Buffer.byteLength(rawBody, "utf8")
}

function firstHeader(headers: ProviderWebhookHeaders, name: string) {
  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()]
  return Array.isArray(value) ? value[0] : value
}

function signatureFailureReason(headers: ProviderWebhookHeaders, toleranceSeconds: number, now: Date) {
  if (!firstHeader(headers, "x-provider-signature")) return "MISSING_SIGNATURE" as const

  const timestamp = Number(firstHeader(headers, "x-provider-timestamp"))
  if (!Number.isFinite(timestamp)) return "INVALID_SIGNATURE" as const
  if (Math.abs(now.getTime() - timestamp) > toleranceSeconds * 1000) return "REPLAYED_EVENT" as const
  return "INVALID_SIGNATURE" as const
}

function toDecimal(value: Prisma.Decimal.Value | null | undefined) {
  return value === null || value === undefined ? null : new Prisma.Decimal(value)
}

function redactedProviderPayload(parsed: ParsedProviderEvent): Prisma.InputJsonObject {
  return {
    providerEventId: parsed.providerEventId,
    providerTransactionId: parsed.providerTransactionId ?? null,
    providerReference: parsed.providerReference ?? null,
    eventType: parsed.eventType,
    currencyCode: parsed.currencyCode ?? "XAF",
    occurredAt: parsed.occurredAt?.toISOString() ?? null,
  }
}

async function emitIngestionAlert(input: {
  organizationId: string
  providerAccountId: string
  providerEventId: string
  reason: string
  correlationId: string
}) {
  logger.warn("payment-reconciliation.provider-event.alert", input)
  await createAlert({
    type: AlertType.SECURITY,
    severity: AlertSeverity.HIGH,
    title: "Payment provider evidence alert",
    message: "Payment provider evidence failed ingestion controls.",
    source: "payment-reconciliation-ingestion",
    metadata: input,
  }).catch((error) => {
    logger.warn("payment-reconciliation.provider-event.alert_failed", {
      correlationId: input.correlationId,
      error: error instanceof Error ? error.message : "unknown",
    })
  })
}

export async function captureProviderEvent(input: CaptureProviderEventInput): Promise<CaptureProviderEventResult> {
  const correlationId = input.correlationId ?? randomUUID()
  const receivedAt = input.receivedAt ?? new Date()
  const now = input.now ?? receivedAt

  if (payloadSize(input.rawBody) > input.adapter.maxPayloadBytes) {
    throw new PaymentIngestionError("PAYLOAD_TOO_LARGE", "Provider payload exceeds the allowed size.", {
      correlationId,
      maxPayloadBytes: input.adapter.maxPayloadBytes,
    })
  }

  const parsed = input.adapter.parseEvent(input.rawBody, input.headers)
  const canonicalPayload = input.adapter.canonicalPayload(input.rawBody)
  const rawPayloadHash = sha256(canonicalPayload)
  const headersHash = sha256(JSON.stringify(input.headers))

  return db.$transaction(async (tx) => {
    const providerAccount = await tx.providerAccount.findFirst({
      where: {
        organizationId: input.organizationId,
        ...(input.providerAccountId ? { id: input.providerAccountId } : { providerCode: input.providerCode ?? input.adapter.providerCode }),
      },
      select: { id: true, status: true },
    })

    if (!providerAccount) {
      throw new PaymentIngestionError("PROVIDER_ACCOUNT_NOT_FOUND", "Provider account mapping was not found.", {
        correlationId,
      })
    }

    if (providerAccount.status !== ProviderAccountStatus.ACTIVE) {
      throw new PaymentIngestionError("PROVIDER_ACCOUNT_INACTIVE", "Provider account is not active for ingestion.", {
        correlationId,
        providerAccountId: providerAccount.id,
      })
    }

    const existing = await tx.providerEvent.findFirst({
      where: {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        providerEventId: parsed.providerEventId,
      },
      select: { id: true, rawPayloadHash: true },
    })

    const inboxIdempotencyKey = sha256(`${providerAccount.id}|${parsed.providerEventId}|${rawPayloadHash}`)
    const signatureValid = input.adapter.verifySignature({
      rawBody: input.rawBody,
      headers: input.headers,
      secret: input.secret,
      now,
    })

    if (existing?.rawPayloadHash === rawPayloadHash) {
      const inbox = await tx.paymentReconciliationInboxItem.upsert({
        where: {
          organizationId_source_idempotencyKey: {
            organizationId: input.organizationId,
            source: PaymentReconciliationInboxSource.PROVIDER_EVENT,
            idempotencyKey: inboxIdempotencyKey,
          },
        },
        create: {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          source: PaymentReconciliationInboxSource.PROVIDER_EVENT,
          status: PaymentReconciliationInboxStatus.IGNORED,
          idempotencyKey: inboxIdempotencyKey,
          externalId: parsed.providerEventId,
          payloadHash: rawPayloadHash,
          payloadSummary: redactedProviderPayload(parsed),
          processedAt: receivedAt,
          correlationId,
        },
        update: {
          attempts: { increment: 1 },
          processedAt: receivedAt,
          correlationId,
        },
        select: { id: true },
      })

      logger.info("payment-reconciliation.provider-event.duplicate", {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        providerEventId: parsed.providerEventId,
        correlationId,
      })

      return {
        status: "DUPLICATE",
        providerEventId: parsed.providerEventId,
        providerEventRecordId: existing.id,
        inboxItemId: inbox.id,
        rawPayloadHash,
        correlationId,
      }
    }

    if (existing && existing.rawPayloadHash !== rawPayloadHash) {
      const exception = await tx.paymentException.create({
        data: {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          providerEventId: existing.id,
          type: PaymentExceptionType.TAMPER_SIGNAL,
          severity: ExceptionSeverity.CRITICAL,
          status: PaymentExceptionStatus.OPEN,
          sourceType: "ProviderEvent",
          sourceId: parsed.providerEventId,
          evidence: {
            existingPayloadHash: existing.rawPayloadHash,
            incomingPayloadHash: rawPayloadHash,
            correlationId,
          },
          correlationId,
        },
        select: { id: true },
      })

      await emitIngestionAlert({
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        providerEventId: parsed.providerEventId,
        reason: "TAMPERED_PROVIDER_EVENT",
        correlationId,
      })

      return {
        status: "TAMPERED",
        providerEventId: parsed.providerEventId,
        providerEventRecordId: existing.id,
        exceptionId: exception.id,
        rawPayloadHash,
        correlationId,
      }
    }

    const failureReason = signatureValid
      ? null
      : signatureFailureReason(input.headers, input.adapter.timestampToleranceSeconds, now)
    const rejectedStatus = failureReason === "REPLAYED_EVENT"
      ? ProviderEventStatus.REPLAYED
      : ProviderEventStatus.TAMPERED

    const event = await tx.providerEvent.create({
      data: {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        providerEventId: parsed.providerEventId,
        providerTransactionId: parsed.providerTransactionId,
        providerReference: parsed.providerReference,
        eventType: parsed.eventType,
        status: signatureValid ? ProviderEventStatus.VERIFIED : rejectedStatus,
        direction: parsed.direction,
        amount: toDecimal(parsed.amount),
        feeAmount: toDecimal(parsed.feeAmount),
        currencyCode: parsed.currencyCode ?? "XAF",
        occurredAt: parsed.occurredAt,
        receivedAt,
        idempotencyKey: inboxIdempotencyKey,
        correlationId,
        rawPayload: parsed.rawPayload,
        redactedPayload: redactedProviderPayload(parsed),
        rawPayloadHash,
        headersHash,
        signatureHash: firstHeader(input.headers, "x-provider-signature")
          ? sha256(String(firstHeader(input.headers, "x-provider-signature")))
          : null,
        signatureValid,
        providerCustomerReferenceMasked: parsed.providerCustomerReferenceMasked,
        providerCustomerReferenceHash: parsed.providerCustomerReferenceHash,
      },
      select: { id: true },
    })

    const inbox = await tx.paymentReconciliationInboxItem.upsert({
      where: {
        organizationId_source_idempotencyKey: {
          organizationId: input.organizationId,
          source: PaymentReconciliationInboxSource.PROVIDER_EVENT,
          idempotencyKey: inboxIdempotencyKey,
        },
      },
      create: {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        source: PaymentReconciliationInboxSource.PROVIDER_EVENT,
        status: signatureValid ? PaymentReconciliationInboxStatus.RECEIVED : PaymentReconciliationInboxStatus.FAILED,
        idempotencyKey: inboxIdempotencyKey,
        externalId: parsed.providerEventId,
        payloadHash: rawPayloadHash,
        payloadSummary: redactedProviderPayload(parsed),
        lastError: failureReason,
        correlationId,
      },
      update: {
        attempts: { increment: 1 },
        lastError: failureReason,
        correlationId,
      },
      select: { id: true },
    })

    if (!signatureValid) {
      const exception = await tx.paymentException.create({
        data: {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          providerEventId: event.id,
          type: failureReason === "REPLAYED_EVENT" ? PaymentExceptionType.REPLAY_SPIKE : PaymentExceptionType.SIGNATURE_FAILURE,
          severity: ExceptionSeverity.CRITICAL,
          status: PaymentExceptionStatus.OPEN,
          sourceType: "ProviderEvent",
          sourceId: event.id,
          evidence: {
            failureReason,
            rawPayloadHash,
            correlationId,
          },
          correlationId,
        },
        select: { id: true },
      })

      await emitIngestionAlert({
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        providerEventId: parsed.providerEventId,
        reason: failureReason ?? "INVALID_SIGNATURE",
        correlationId,
      })

      await recordBusinessEventInTx(tx, {
        organizationId: input.organizationId,
        eventType: "payment.provider_event.rejected",
        eventSource: "PROVIDER_WEBHOOK",
        idempotencyKey: `provider-event:${event.id}:rejected`,
        sourceType: "PAYMENT_RECONCILIATION",
        sourceId: event.id,
        documentHash: rawPayloadHash,
        payload: {
          providerEventRecordId: event.id,
          providerEventId: parsed.providerEventId,
          providerTransactionId: parsed.providerTransactionId ?? null,
          providerReference: parsed.providerReference ?? null,
          providerAccountId: providerAccount.id,
          inboxItemId: inbox.id,
          exceptionId: exception.id,
          status: rejectedStatus,
          failureReason,
          rawPayloadHash,
          headersHash,
          correlationId,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: "payment.provider_event.rejected",
            payload: {
              providerEventRecordId: event.id,
              providerEventId: parsed.providerEventId,
              providerAccountId: providerAccount.id,
              exceptionId: exception.id,
              failureReason,
              correlationId,
            },
          },
        ],
      })

      return {
        status: "REJECTED",
        providerEventId: parsed.providerEventId,
        providerEventRecordId: event.id,
        inboxItemId: inbox.id,
        exceptionId: exception.id,
        rawPayloadHash,
        correlationId,
      }
    }

    logger.info("payment-reconciliation.provider-event.captured", {
      organizationId: input.organizationId,
      providerAccountId: providerAccount.id,
      providerEventId: parsed.providerEventId,
      correlationId,
    })

    await recordBusinessEventInTx(tx, {
      organizationId: input.organizationId,
      eventType: "payment.provider_event.captured",
      eventSource: "PROVIDER_WEBHOOK",
      idempotencyKey: `provider-event:${event.id}:captured`,
      sourceType: "PAYMENT_RECONCILIATION",
      sourceId: event.id,
      documentHash: rawPayloadHash,
      payload: {
        providerEventRecordId: event.id,
        providerEventId: parsed.providerEventId,
        providerTransactionId: parsed.providerTransactionId ?? null,
        providerReference: parsed.providerReference ?? null,
        providerAccountId: providerAccount.id,
        inboxItemId: inbox.id,
        eventType: parsed.eventType,
        direction: parsed.direction,
        amount: parsed.amount === null || parsed.amount === undefined ? null : String(parsed.amount),
        feeAmount: parsed.feeAmount === null || parsed.feeAmount === undefined ? null : String(parsed.feeAmount),
        currencyCode: parsed.currencyCode ?? "XAF",
        occurredAt: parsed.occurredAt,
        receivedAt,
        rawPayloadHash,
        headersHash,
        signatureValid,
        correlationId,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "payment.provider_event.captured",
          payload: {
            providerEventRecordId: event.id,
            providerEventId: parsed.providerEventId,
            providerAccountId: providerAccount.id,
            inboxItemId: inbox.id,
            amount: parsed.amount === null || parsed.amount === undefined ? null : String(parsed.amount),
            currencyCode: parsed.currencyCode ?? "XAF",
            correlationId,
          },
        },
      ],
    })

    await recordCloseCertificationInvalidationsForSourceInTx(tx, input.organizationId, {
      sourceCode: "PAYMENT_PROVIDER_EVENT_CAPTURED",
      sourceId: event.id,
      periodStart: parsed.occurredAt ?? receivedAt,
      periodEnd: parsed.occurredAt ?? receivedAt,
      staleReason: "Provider event capture changed certified close evidence.",
      newEvidenceHash: rawPayloadHash,
      correlationId,
    })

    return {
      status: "CAPTURED",
      providerEventId: parsed.providerEventId,
      providerEventRecordId: event.id,
      inboxItemId: inbox.id,
      rawPayloadHash,
      correlationId,
    }
  })
}
