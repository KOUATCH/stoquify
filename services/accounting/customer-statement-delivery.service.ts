import { createHash, randomBytes, randomUUID } from "node:crypto"
import {
  CustomerStatementConsentBasis,
  CustomerStatementDeliveryChannel,
  CustomerStatementDeliveryStatus,
  Prisma,
  ReferralAttributionSource,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
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
  hashWhatsAppDestination,
  normalizeWhatsAppPhoneNumber,
  redactWhatsAppPhoneNumber,
} from "@/services/communication/whatsapp-receipt.provider"

import { issueCustomerStatementAccessTokenInTx } from "./customer-statement-access.service"
import { sealCustomerStatementDeliveryEnvelope } from "./customer-statement-delivery-envelope"

export const CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME =
  "customer.statement.delivery.requested"
export const CUSTOMER_STATEMENT_DELIVERY_MAX_ATTEMPTS = 5

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SHA256_EVIDENCE_PATTERN = /^sha256:[0-9a-f]{64}$/

export type QueueCustomerStatementDeliveryInput = {
  organizationId: string
  statementSnapshotId: string
  issuedById: string
  channel: "EMAIL" | "WHATSAPP"
  destination: string
  consentBasis: "EXPLICIT" | "RECIPIENT_REQUESTED"
  consentEvidenceHash: string
  consentCapturedAt: Date | string
  allowDispute?: boolean
  allowPromiseToPay?: boolean
  locale?: "EN" | "FR"
  tokenTtlSeconds?: number
  idempotencyKey: string
  correlationId: string
  now?: Date
  environment?: Record<string, string | undefined>
}

export type CustomerStatementDeliveryResult = {
  deliveryId: string
  statementSnapshotId: string
  tokenId: string
  attributionId: string
  referralCode: string
  channel: CustomerStatementDeliveryChannel
  status: CustomerStatementDeliveryStatus
  redactedDestination: string
  destinationHash: string
  outboxId: string
  expiresAt: string
  replayed: boolean
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(label + " is required")
  return normalized
}

function boundedKey(value: string, label: string) {
  const normalized = requiredText(value, label)
  if (normalized.length < 8 || normalized.length > 191) {
    throw new BusinessRuleError(
      label + " must contain between 8 and 191 characters",
    )
  }
  return normalized
}

function sha256(value: string) {
  return "sha256:" + createHash("sha256").update(value).digest("hex")
}

function normalizeEmail(destination: string) {
  const normalized = destination.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(normalized) || normalized.length > 254) {
    throw new BusinessRuleError("Statement email destination is invalid")
  }
  return normalized
}

function redactEmail(destination: string) {
  const [local, domain] = destination.split("@")
  return local.slice(0, 1) + "***@" + domain
}

function normalizedDestination(
  channel: CustomerStatementDeliveryChannel,
  destination: string,
) {
  if (channel === CustomerStatementDeliveryChannel.EMAIL) {
    const normalized = normalizeEmail(destination)
    return {
      value: normalized,
      hash: sha256(normalized),
      redacted: redactEmail(normalized),
    }
  }
  const normalized = normalizeWhatsAppPhoneNumber(destination)
  return {
    value: normalized,
    hash: hashWhatsAppDestination(normalized),
    redacted: redactWhatsAppPhoneNumber(normalized),
  }
}

function statementAccessUrl(input: {
  statementSnapshotId: string
  token: string
  referralCode: string
  environment: Record<string, string | undefined>
}) {
  const baseUrl = (
    input.environment.NEXT_PUBLIC_BASE_URL ||
    input.environment.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "")
  const path =
    "/customer-statement/" +
    encodeURIComponent(input.statementSnapshotId) +
    "?token=" +
    encodeURIComponent(input.token) +
    "&ref=" +
    encodeURIComponent(input.referralCode)
  return baseUrl ? baseUrl + path : path
}

function outboxId(event: { id: string; outboxMessages?: unknown[] }) {
  const match = event.outboxMessages?.find((message) => {
    return (
      message !== null &&
      typeof message === "object" &&
      (message as { eventName?: unknown }).eventName ===
        CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME
    )
  })
  const id = match && typeof match === "object"
    ? (match as { id?: unknown }).id
    : null
  if (typeof id !== "string") {
    throw new ConflictError("Statement delivery outbox evidence is missing")
  }
  return id
}

function resultFromExisting(
  delivery: {
    id: string
    statementSnapshotId: string
    tokenId: string
    attributionId: string
    channel: CustomerStatementDeliveryChannel
    destinationHash: string
    redactedDestination: string
    outboxId: string
    payloadHash: string
    token: { expiresAt: Date }
    attribution: { referralCode: string }
    states: Array<{ status: CustomerStatementDeliveryStatus }>
  },
  payloadHash: string,
): CustomerStatementDeliveryResult {
  if (delivery.payloadHash !== payloadHash) {
    throw new ConflictError("Statement delivery idempotency evidence was reused")
  }
  const state = delivery.states[0]
  if (!state) throw new ConflictError("Statement delivery state evidence is missing")
  return {
    deliveryId: delivery.id,
    statementSnapshotId: delivery.statementSnapshotId,
    tokenId: delivery.tokenId,
    attributionId: delivery.attributionId,
    referralCode: delivery.attribution.referralCode,
    channel: delivery.channel,
    status: state.status,
    redactedDestination: delivery.redactedDestination,
    destinationHash: delivery.destinationHash,
    outboxId: delivery.outboxId,
    expiresAt: delivery.token.expiresAt.toISOString(),
    replayed: true,
  }
}

export async function queueCustomerStatementDeliveryInTx(
  tx: Prisma.TransactionClient,
  input: QueueCustomerStatementDeliveryInput,
): Promise<CustomerStatementDeliveryResult> {
  const organizationId = requiredText(input.organizationId, "Organization")
  const statementSnapshotId = requiredText(
    input.statementSnapshotId,
    "Customer statement",
  )
  const issuedById = requiredText(input.issuedById, "Delivery actor")
  const idempotencyKey = boundedKey(input.idempotencyKey, "Idempotency key")
  const correlationId = boundedKey(input.correlationId, "Correlation ID")
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  const consentCapturedAt = new Date(input.consentCapturedAt)
  if (
    !Number.isFinite(consentCapturedAt.getTime()) ||
    consentCapturedAt.getTime() > now.getTime()
  ) {
    throw new BusinessRuleError("Consent capture time must be valid and not in the future")
  }
  if (!SHA256_EVIDENCE_PATTERN.test(input.consentEvidenceHash)) {
    throw new BusinessRuleError("Explicit consent evidence hash is required")
  }

  const channel = CustomerStatementDeliveryChannel[input.channel]
  const consentBasis = CustomerStatementConsentBasis[input.consentBasis]
  const destination = normalizedDestination(channel, input.destination)
  const locale = input.locale ?? "EN"
  const commandPayloadHash = hashBusinessPayload({
    organizationId,
    statementSnapshotId,
    issuedById,
    channel,
    destinationHash: destination.hash,
    consentBasis,
    consentEvidenceHash: input.consentEvidenceHash,
    consentCapturedAt: consentCapturedAt.toISOString(),
    allowDispute: input.allowDispute === true,
    allowPromiseToPay: input.allowPromiseToPay === true,
    locale,
    tokenTtlSeconds: input.tokenTtlSeconds ?? null,
    idempotencyKey,
    correlationId,
  })

  const existing = await tx.customerStatementDelivery.findFirst({
    where: { organizationId, statementSnapshotId, idempotencyKey },
    include: {
      token: { select: { expiresAt: true } },
      attribution: { select: { referralCode: true } },
      states: {
        orderBy: [{ version: "desc" }, { occurredAt: "desc" }],
        take: 1,
        select: { status: true },
      },
    },
  })
  if (existing) return resultFromExisting(existing, commandPayloadHash)

  const actor = await tx.user.findFirst({
    where: { id: issuedById, organizationId, isActive: true },
    select: { id: true },
  })
  if (!actor) throw new NotFoundError("Active statement delivery actor not found")

  const deliveryId = randomUUID()
  const attributionId = randomUUID()
  const referralCode = randomBytes(18).toString("base64url")
  const attributionEvidenceHash = hashBusinessPayload({
    organizationId,
    statementSnapshotId,
    sourceType: ReferralAttributionSource.CUSTOMER_STATEMENT,
    referralCode,
    campaign: "customer_statement_share",
    channel,
    createdById: actor.id,
    deliveryId,
  })
  await tx.referralAttribution.create({
    data: {
      id: attributionId,
      organizationId,
      statementSnapshotId,
      sourceType: ReferralAttributionSource.CUSTOMER_STATEMENT,
      sourceId: statementSnapshotId,
      referralCode,
      campaign: "customer_statement_share",
      channel,
      createdById: actor.id,
      evidenceHash: attributionEvidenceHash,
    },
  })

  const issued = await issueCustomerStatementAccessTokenInTx(tx, {
    organizationId,
    statementSnapshotId,
    issuedById: actor.id,
    allowDispute: input.allowDispute,
    allowPromiseToPay: input.allowPromiseToPay,
    recipientReference: destination.value,
    referralAttributionId: attributionId,
    ttlSeconds: input.tokenTtlSeconds,
    now,
    metadata: {
      purpose: "CONSENTED_STATEMENT_DELIVERY",
      channel,
      destinationHash: destination.hash,
      consentEvidenceHash: input.consentEvidenceHash,
    },
  })
  const environment = input.environment ?? process.env
  const accessUrl = statementAccessUrl({
    statementSnapshotId,
    token: issued.token,
    referralCode,
    environment,
  })
  const sealedEnvelope = sealCustomerStatementDeliveryEnvelope({
    destination: destination.value,
    accessUrl,
    statementSnapshotId,
    tokenId: issued.tokenId,
    referralCode,
    issuedAt: now.toISOString(),
  }, environment)
  if (!sealedEnvelope) {
    throw new BusinessRuleError(
      "Statement delivery encryption is not configured safely",
    )
  }

  const safeOutboxPayload = {
    schemaVersion: "customer-statement-delivery.v1",
    deliveryId,
    organizationId,
    statementSnapshotId,
    statementContentHash: issued.statementContentHash,
    tokenId: issued.tokenId,
    attributionId,
    referralCode,
    channel,
    locale,
    destinationHash: destination.hash,
    redactedDestination: destination.redacted,
    consentEvidenceHash: input.consentEvidenceHash,
    sealedEnvelope,
    sealedEnvelopeHash: sha256(sealedEnvelope),
  }
  const recorded = await recordBusinessEventInTx(tx, {
    organizationId,
    eventType: "CUSTOMER_STATEMENT_DELIVERY_REQUESTED",
    eventSource: "API",
    schemaVersion: 1,
    idempotencyKey: "customer-statement-delivery:" + idempotencyKey,
    actorId: actor.id,
    sourceType: "CUSTOMER_STATEMENT",
    sourceId: statementSnapshotId,
    documentHash: issued.statementContentHash,
    payload: {
      deliveryId,
      statementSnapshotId,
      statementContentHash: issued.statementContentHash,
      tokenId: issued.tokenId,
      attributionId,
      referralCode,
      channel,
      locale,
      destinationHash: destination.hash,
      redactedDestination: destination.redacted,
      consentBasis,
      consentEvidenceHash: input.consentEvidenceHash,
      consentCapturedAt: consentCapturedAt.toISOString(),
      commandPayloadHash,
    },
    metadata: {
      gate: "phase-6-consented-statement-delivery",
      rawDestinationStored: false,
      rawTokenStored: false,
      providerEnvelope: "AES_256_GCM",
    },
    outboxMessages: [
      {
        channel: channel === CustomerStatementDeliveryChannel.EMAIL
          ? "EMAIL"
          : "WEBHOOK",
        eventName: CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME,
        idempotencyKey: "customer-statement-delivery:" + deliveryId,
        payload: safeOutboxPayload,
        maxAttempts: CUSTOMER_STATEMENT_DELIVERY_MAX_ATTEMPTS,
        metadata: {
          provider: channel,
          destinationHash: destination.hash,
          redactedDestination: destination.redacted,
          consentEvidenceHash: input.consentEvidenceHash,
        },
      },
    ],
  })
  const deliveryOutboxId = outboxId(recorded.event)
  const evidenceHash = hashBusinessPayload({
    deliveryId,
    commandPayloadHash,
    attributionEvidenceHash,
    tokenHash: issued.tokenHash,
    outboxId: deliveryOutboxId,
    businessEventId: recorded.event.id,
  })
  const stateHash = hashBusinessPayload({
    organizationId,
    deliveryId,
    version: 1,
    status: CustomerStatementDeliveryStatus.QUEUED,
    occurredAt: now.toISOString(),
    previousStateHash: null,
    evidenceHash,
  })
  await tx.customerStatementDelivery.create({
    data: {
      id: deliveryId,
      organizationId,
      statementSnapshotId,
      tokenId: issued.tokenId,
      attributionId,
      channel,
      destinationHash: destination.hash,
      redactedDestination: destination.redacted,
      consentBasis,
      consentEvidenceHash: input.consentEvidenceHash,
      consentCapturedAt,
      consentCapturedById: actor.id,
      statementContentHash: issued.statementContentHash,
      payloadHash: commandPayloadHash,
      idempotencyKey,
      correlationId,
      businessEventId: recorded.event.id,
      outboxId: deliveryOutboxId,
      locale,
    },
  })
  await tx.customerStatementDeliveryState.create({
    data: {
      organizationId,
      deliveryId,
      version: 1,
      status: CustomerStatementDeliveryStatus.QUEUED,
      occurredAt: now,
      providerReferenceHash: null,
      errorCode: null,
      previousStateHash: null,
      stateHash,
      evidenceHash,
      businessEventId: recorded.event.id,
    },
  })
  await markBusinessEventAppliedInTx(tx, organizationId, recorded.event.id)
  await tx.auditLog.create({
    data: {
      organizationId,
      entityType: "CustomerStatementDelivery",
      entityId: deliveryId,
      action: "CUSTOMER_STATEMENT_DELIVERY_QUEUED",
      userId: actor.id,
      changes: {
        after: {
          statementSnapshotId,
          statementContentHash: issued.statementContentHash,
          tokenId: issued.tokenId,
          attributionId,
          referralCode,
          channel,
          destinationHash: destination.hash,
          redactedDestination: destination.redacted,
          consentBasis,
          consentEvidenceHash: input.consentEvidenceHash,
          consentCapturedAt: consentCapturedAt.toISOString(),
          outboxId: deliveryOutboxId,
          stateHash,
        },
      },
    },
  })

  return {
    deliveryId,
    statementSnapshotId,
    tokenId: issued.tokenId,
    attributionId,
    referralCode,
    channel,
    status: CustomerStatementDeliveryStatus.QUEUED,
    redactedDestination: destination.redacted,
    destinationHash: destination.hash,
    outboxId: deliveryOutboxId,
    expiresAt: issued.expiresAt.toISOString(),
    replayed: false,
  }
}

export async function queueCustomerStatementDelivery(
  input: QueueCustomerStatementDeliveryInput,
  client: typeof db = db,
) {
  return client.$transaction(
    (tx) => queueCustomerStatementDeliveryInTx(tx, input),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}
