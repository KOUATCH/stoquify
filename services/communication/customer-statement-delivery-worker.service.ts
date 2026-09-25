import { createHash, randomUUID } from "node:crypto"
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
import { hashCustomerStatementAccessValue } from "@/services/accounting/customer-statement-access.service"
import { statementDispatchMetadata as dispatchMetadata } from "@/services/accounting/customer-statement-delivery-recovery"
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

type StatementLease = {
  requestId: string
  organizationId: string
  workerId: string
  attempt: number
  executionId?: string
  expectedUpdatedAt?: Date
  expectedMetadata?: Prisma.JsonValue | null
}

function leaseWhere(lease: StatementLease): Prisma.BusinessEventOutboxWhereInput {
  return {
    id: lease.requestId, organizationId: lease.organizationId,
    eventName: CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME, status: BusinessOutboxStatus.LOCKED,
    lockedBy: lease.workerId, attempts: lease.attempt,
    ...(lease.expectedUpdatedAt ? { updatedAt: lease.expectedUpdatedAt } : {}),
    ...(lease.executionId ? { metadata: { path: ["statementDispatch", "executionId"], equals: lease.executionId } }
      : lease.expectedMetadata !== undefined ? { metadata: { equals: lease.expectedMetadata === null ? Prisma.DbNull : lease.expectedMetadata } } : {}),
  }
}

async function settleDelivery(input: StatementLease & {
  status: CustomerStatementDeliveryStatus
  outboxStatus: BusinessOutboxStatus
  now: Date
  providerResult?: CustomerStatementProviderResult
  errorCode?: string
}) {
  return db.$transaction(async tx => {
    const request = await tx.businessEventOutbox.findFirst({ where: leaseWhere(input) })
    if (!request) return false
    const dispatch = dispatchMetadata(request.metadata)
    const outcome = input.status === "SENT" ? "ACCEPTED" : input.errorCode === "PROVIDER_OUTCOME_UNKNOWN" ? "UNKNOWN" : "NOT_SENT"
    const metadata = dispatch.parsed.success
      ? { ...dispatch.container, statementDispatch: { ...dispatch.parsed.data, outcome } }
      : dispatch.container
    // The update locks this generation before the state chain is read. A stale
    // worker, including one reusing the same worker ID, cannot settle another claim.
    const updated = await tx.businessEventOutbox.updateMany({
      where: { ...leaseWhere(input), updatedAt: request.updatedAt },
      data: {
        status: input.outboxStatus, metadata,
        availableAt: input.outboxStatus === "FAILED" ? retryAt(input.attempt, input.now) : input.now,
        processedAt: input.outboxStatus === "SENT" ? input.now : null,
        failedAt: ["FAILED", "DEAD_LETTER", "DEFERRED"].includes(input.outboxStatus) ? input.now : null,
        lockedAt: null, lockedBy: null, lastErrorCode: input.errorCode ?? null,
        lastErrorMessage: null,
      },
    })
    if (updated.count !== 1) return false
    const delivery = await tx.customerStatementDelivery.findFirst({
      where: { organizationId: input.organizationId, outboxId: request.id },
      include: { states: { orderBy: [{ version: "desc" }, { occurredAt: "desc" }], take: 1, select: { version: true, status: true, stateHash: true } } },
    })
    const current = delivery?.states[0]
    if (delivery && current && !["SENT", "CANCELLED", "DEAD_LETTER"].includes(current.status)) {
      await appendDeliveryStateInTx(tx, {
        delivery, status: input.status, occurredAt: input.now,
        providerReference: input.providerResult?.providerReference, errorCode: input.errorCode,
        outboxId: request.id, outboxPayloadHash: request.payloadHash, attempt: input.attempt,
      })
    } else if (input.status === "SENT") {
      throw new ConflictError("Statement delivery state cannot establish acceptance")
    }
    await tx.auditLog.create({ data: {
      organizationId: input.organizationId, userId: null,
      entityType: delivery ? "CustomerStatementDelivery" : "BusinessEventOutbox",
      entityId: delivery?.id ?? request.id, action: "CUSTOMER_STATEMENT_DELIVERY_" + input.status,
      changes: { after: { status: input.status, outboxStatus: input.outboxStatus, attempt: input.attempt,
        providerReferenceHash: input.providerResult?.providerReference ? hashBusinessPayload(input.providerResult.providerReference) : null,
        errorCode: input.errorCode ?? null, domainStateAppended: Boolean(current && !["SENT", "CANCELLED", "DEAD_LETTER"].includes(current.status)) } },
    } })
    return true
  })
}

const workerIdentity = z.object({ organizationId: z.string().trim().min(1).max(191), workerId: z.string().trim().min(1).max(191) })

export async function claimCustomerStatementDeliveries(input: {
  organizationId: string; workerId: string; limit?: number; now?: Date; staleAfterMs?: number
}) {
  const identity = workerIdentity.parse(input), now = input.now ?? new Date()
  const limit = z.number().int().min(1).max(100).parse(input.limit ?? 25)
  const staleAfterMs = z.number().int().min(1).max(3600000).parse(input.staleAfterMs ?? 5 * 60_000)
  const eligible: Prisma.BusinessEventOutboxWhereInput = {
    organizationId: identity.organizationId, eventName: CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME,
    OR: [
      { status: { in: [BusinessOutboxStatus.PENDING, BusinessOutboxStatus.FAILED] }, availableAt: { lte: now } },
      { status: BusinessOutboxStatus.LOCKED, lockedAt: { lt: new Date(now.getTime() - staleAfterMs) } },
    ],
  }
  const candidates = await db.businessEventOutbox.findMany({
    where: eligible, orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }, { id: "asc" }], take: limit,
    select: { id: true, attempts: true, updatedAt: true },
  })
  const claimed: string[] = []
  for (const row of candidates) {
    const result = await db.businessEventOutbox.updateMany({
      where: { ...eligible, id: row.id, attempts: row.attempts, updatedAt: row.updatedAt },
      data: { status: BusinessOutboxStatus.LOCKED, lockedAt: now, lockedBy: identity.workerId, attempts: { increment: 1 } },
    })
    if (result.count === 1) claimed.push(row.id)
  }
  return claimed
}

export async function processCustomerStatementDelivery(input: {
  organizationId: string; requestId: string; workerId: string; now?: Date
  environment?: WorkerEnvironment; dependencies?: Partial<WorkerDependencies>; providerTimeoutMs?: number
}) {
  const identity = workerIdentity.parse(input), requestId = z.string().trim().min(1).max(191).parse(input.requestId)
  const clock = () => input.now ?? new Date(), environment = input.environment ?? process.env
  const dependencies = { ...defaultDependencies, ...input.dependencies }
  const timeoutMs = z.number().int().min(1).max(120000).parse(input.providerTimeoutMs ?? 30000)
  const request = await db.businessEventOutbox.findFirst({
    where: { id: requestId, organizationId: identity.organizationId, eventName: CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME, status: BusinessOutboxStatus.LOCKED, lockedBy: identity.workerId },
  })
  if (!request) throw new NotFoundError("Claimed statement delivery was not found")
  const lease: StatementLease = { requestId, ...identity, attempt: request.attempts, expectedUpdatedAt: request.updatedAt, expectedMetadata: request.metadata }
  const settle = async (status: Exclude<CustomerStatementDeliveryStatus, "QUEUED">, code?: string, providerResult?: CustomerStatementProviderResult) => {
    const settled = await settleDelivery({ ...lease, status, outboxStatus: status, now: clock(), errorCode: code, providerResult })
    return { requestId, status: settled ? status : "LEASE_LOST" as const, ...(code ? { code } : {}) }
  }
  const dispatch = dispatchMetadata(request.metadata)
  // A repeated invocation of a currently running reservation observes it without
  // taking ownership. A reclaimed reservation has an unknown external outcome.
  if (dispatch.parsed.success && dispatch.parsed.data.outcome === "RESERVED" && dispatch.parsed.data.attempt === request.attempts) {
    return { requestId, status: "PROCESSING" as const }
  }
  if ((request.metadata !== null && (typeof request.metadata !== "object" || Array.isArray(request.metadata))) ||
      (dispatch.raw !== undefined && !dispatch.parsed.success) ||
      (dispatch.parsed.success && dispatch.parsed.data.outcome !== "NOT_SENT") ||
      (dispatch.parsed.success && dispatch.parsed.data.attempt !== request.attempts - 1) ||
      (!dispatch.parsed.success && request.attempts > 1)) {
    return settle("DEFERRED", "PROVIDER_OUTCOME_UNKNOWN")
  }
  let reserved = false
  try {
    const payload = outboxPayloadSchema.parse(request.payload)
    if (hashBusinessPayload(request.payload) !== request.payloadHash || payload.organizationId !== request.organizationId) {
      throw new ConflictError("Statement delivery payload evidence does not match")
    }
    if (sha256(payload.sealedEnvelope) !== payload.sealedEnvelopeHash) throw new ConflictError("Statement delivery envelope hash does not match")
    const envelope = openCustomerStatementDeliveryEnvelope(payload.sealedEnvelope, environment)
    if (!envelope) throw new ConflictError("Statement delivery envelope is invalid")
    const delivery = await db.customerStatementDelivery.findFirst({
      where: { id: payload.deliveryId, organizationId: identity.organizationId, outboxId: request.id },
      include: {
        token: { select: { id: true, tokenHash: true, jtiHash: true, status: true, revokedAt: true, expiresAt: true, statementContentHash: true } },
        attribution: { select: { id: true, referralCode: true } },
        statementSnapshot: { select: { id: true, statementNumber: true, contentHash: true, statementPayload: true, truncated: true, closingBalance: true, currency: true, organization: { select: { name: true, isActive: true, deletedAt: true } } } },
        states: { orderBy: { version: "desc" }, take: 1, select: { status: true } },
      },
    })
    if (!delivery) throw new NotFoundError("Statement delivery evidence was not found")
    if (!delivery.states[0] || ["SENT", "CANCELLED", "DEAD_LETTER"].includes(delivery.states[0].status)) throw new ConflictError("Statement delivery is terminal or missing state")
    if (!delivery.statementSnapshot.organization.isActive || delivery.statementSnapshot.organization.deletedAt) return settle("CANCELLED", "ORGANIZATION_UNAVAILABLE")
    if (delivery.token.status !== "ACTIVE" || delivery.token.revokedAt || delivery.token.expiresAt <= clock()) return settle("CANCELLED", "STATEMENT_ACCESS_UNAVAILABLE")
    if (delivery.statementSnapshotId !== payload.statementSnapshotId || delivery.statementContentHash !== payload.statementContentHash ||
        delivery.tokenId !== payload.tokenId || delivery.attributionId !== payload.attributionId || delivery.destinationHash !== payload.destinationHash ||
        delivery.consentEvidenceHash !== payload.consentEvidenceHash || delivery.channel !== payload.channel || delivery.locale !== payload.locale ||
        delivery.token.id !== envelope.tokenId || delivery.attribution.referralCode !== envelope.referralCode ||
        envelope.statementSnapshotId !== payload.statementSnapshotId || envelope.referralCode !== payload.referralCode ||
        destinationHash(delivery.channel, envelope.destination) !== payload.destinationHash || delivery.statementSnapshot.contentHash !== payload.statementContentHash ||
        delivery.token.statementContentHash !== payload.statementContentHash || delivery.statementSnapshot.truncated ||
        hashBusinessPayload(delivery.statementSnapshot.statementPayload) !== delivery.statementSnapshot.contentHash) {
      throw new ConflictError("Statement delivery evidence no longer matches")
    }
    const accessUrl = new URL(envelope.accessUrl, "https://stoquify.invalid"), token = accessUrl.searchParams.get("token")
    const verification = verifyCustomerStatementAccessToken({ token, statementSnapshotId: payload.statementSnapshotId, now: clock() })
    if (!verification.ok || verification.payload.organizationId !== identity.organizationId || verification.payload.statementContentHash !== payload.statementContentHash ||
        hashCustomerStatementAccessValue(token ?? "") !== delivery.token.tokenHash || hashCustomerStatementAccessValue(verification.payload.jti) !== delivery.token.jtiHash) {
      throw new ConflictError("Statement delivery access token is invalid")
    }
    if (request.attempts > request.maxAttempts) return settle("DEAD_LETTER", "STATEMENT_DELIVERY_ATTEMPTS_EXHAUSTED")
    const executionId = randomUUID()
    const reservation = await db.$transaction(async tx => {
      const claimed = await tx.businessEventOutbox.updateMany({ where: leaseWhere(lease), data: {
        metadata: { ...dispatch.container, statementDispatch: { version: 1, attempt: request.attempts, executionId, reservedAt: clock().toISOString(), outcome: "RESERVED" } },
      } })
      if (claimed.count !== 1) return false
      // Serialize the authorization cutoff with revocation. A later revocation
      // can still stop public access, but cannot recall an already reserved send.
      const active = await tx.customerStatementAccessToken.updateMany({
        where: { id: delivery.tokenId, organizationId: identity.organizationId, status: "ACTIVE", revokedAt: null, expiresAt: { gt: clock() } },
        data: { status: "ACTIVE" },
      })
      if (active.count !== 1) throw new ConflictError("Statement access changed before dispatch")
      await tx.auditLog.create({ data: { organizationId: identity.organizationId, userId: null, entityType: "CustomerStatementDelivery", entityId: delivery.id,
        action: "CUSTOMER_STATEMENT_DISPATCH_RESERVED", changes: { attempt: request.attempts, executionId, outboxId: request.id } } })
      return true
    })
    if (!reservation) return { requestId, status: "LEASE_LOST" as const }
    lease.executionId = executionId; delete lease.expectedUpdatedAt; delete lease.expectedMetadata; reserved = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let response: CustomerStatementProviderResult
    try {
      response = await Promise.race([
        dependencies.sendCustomerStatementDelivery({ channel: delivery.channel, destination: envelope.destination, accessUrl: envelope.accessUrl,
          statementNumber: delivery.statementSnapshot.statementNumber, closingBalance: delivery.statementSnapshot.closingBalance.toFixed(2), currency: delivery.statementSnapshot.currency,
          businessName: delivery.statementSnapshot.organization.name, locale: payload.locale, referralCode: payload.referralCode }, { environment }),
        new Promise<CustomerStatementProviderResult>(resolve => { timer = setTimeout(() => resolve({ status: "UNKNOWN", retryable: false, message: "Provider response deadline elapsed." }), timeoutMs) }),
      ])
    } finally { if (timer) clearTimeout(timer) }
    if (response.status === "SENT" && response.providerReference?.trim()) return await settle("SENT", undefined, response)
    if (response.status === "DEFERRED") return await settle("DEFERRED", "PROVIDER_NOT_CONFIGURED", response)
    if (response.status === "FAILED") return await settle(request.attempts >= request.maxAttempts || !response.retryable ? "DEAD_LETTER" : "FAILED", "STATEMENT_DELIVERY_PROVIDER_REJECTED", response)
    return await settle("DEFERRED", "PROVIDER_OUTCOME_UNKNOWN")
  } catch (error) {
    // Reservation survives an outage. The next claim must hold its unknown
    // outcome, even when this settlement cannot reach the database at all.
    try { return await settle(reserved ? "DEFERRED" : "DEAD_LETTER", reserved ? "PROVIDER_OUTCOME_UNKNOWN" : error instanceof z.ZodError ? "INVALID_PAYLOAD" : "STATEMENT_DELIVERY_INTEGRITY_FAILED") }
    catch { throw new ApplicationError("INTERNAL_ERROR", "Statement delivery outcome could not be recorded. Review the retained request before retrying.", 500, false) }
  }
}

export async function runCustomerStatementDeliveryWorker(input: {
  organizationId: string; workerId: string; limit?: number; now?: Date
  environment?: WorkerEnvironment; dependencies?: Partial<WorkerDependencies>; providerTimeoutMs?: number
}) {
  const requestIds = await claimCustomerStatementDeliveries(input), results = []
  for (const requestId of requestIds) {
    try { results.push(await processCustomerStatementDelivery({ ...input, requestId })) }
    catch { results.push({ requestId, status: "UNCONFIRMED" as const, error: "Statement delivery outcome is unconfirmed. Review the retained request." }) }
  }
  return results
}
