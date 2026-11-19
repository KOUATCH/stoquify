import { randomUUID } from "node:crypto"
import {
  AccountantClientInviteStatus,
  BusinessOutboxStatus,
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
import { openAccountantClientInviteEnvelope } from "@/services/accounting/accountant-client-invite-envelope"
import {
  ACCOUNTANT_CLIENT_INVITE_EVENT_NAME,
} from "@/services/accounting/accountant-client-invite.service"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  sendAccountantClientInvite,
  type AccountantClientInviteProviderResult,
} from "./accountant-client-invite.provider"

type WorkerEnvironment = Record<string, string | undefined>

const outboxPayloadSchema = z.object({
  schemaVersion: z.literal("accountant-client-invite.v1"),
  inviteId: z.string().min(1),
  organizationId: z.string().min(1),
  attributionId: z.string().min(1),
  referralCode: z.string().min(12).max(64),
  emailHash: z.string().regex(/^[0-9a-f]{64}$/),
  redactedEmail: z.string().min(3),
  role: z.enum(["READ_ONLY", "REVIEWER", "PREPARER"]),
  locale: z.enum(["EN", "FR"]),
  consentEvidenceHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  expiresAt: z.string().datetime(),
  sealedEnvelope: z.string().min(1),
  sealedEnvelopeHash: z.string().regex(/^[0-9a-f]{64}$/),
}).strict()

type WorkerDependencies = {
  sendAccountantClientInvite: typeof sendAccountantClientInvite
}

const defaultDependencies: WorkerDependencies = {
  sendAccountantClientInvite,
}

function retryAt(attempts: number, now: Date) {
  const seconds = Math.min(3600, 15 * 2 ** Math.max(0, attempts - 1))
  return new Date(now.getTime() + seconds * 1000)
}

function providerReferenceHash(result?: AccountantClientInviteProviderResult) {
  return result?.status === "SENT"
    ? hashBusinessPayload(result.providerReference)
    : null
}

const workerIdentity = z.object({
  organizationId: z.string().trim().min(1).max(191),
  workerId: z.string().trim().min(1).max(191),
})

const dispatchSchema = z.object({
  version: z.literal(1),
  attempt: z.number().int().positive(),
  executionId: z.string().uuid(),
  reservedAt: z.string().datetime(),
  outcome: z.enum(["RESERVED", "ACCEPTED", "NOT_SENT", "UNKNOWN"]),
}).strict()

function dispatchMetadata(value: Prisma.JsonValue | null) {
  const container = value && typeof value === "object" && !Array.isArray(value) ? value : {}
  const raw = container.accountantInviteDispatch
  return { container, raw, parsed: dispatchSchema.safeParse(raw) }
}

type InviteLease = {
  requestId: string
  organizationId: string
  workerId: string
  attempt: number
  executionId?: string
  expectedUpdatedAt?: Date
  expectedMetadata?: Prisma.JsonValue | null
}

function leaseWhere(lease: InviteLease): Prisma.BusinessEventOutboxWhereInput {
  return {
    id: lease.requestId,
    organizationId: lease.organizationId,
    eventName: ACCOUNTANT_CLIENT_INVITE_EVENT_NAME,
    status: BusinessOutboxStatus.LOCKED,
    lockedBy: lease.workerId,
    attempts: lease.attempt,
    ...(lease.expectedUpdatedAt ? { updatedAt: lease.expectedUpdatedAt } : {}),
    ...(lease.executionId
      ? { metadata: { path: ["accountantInviteDispatch", "executionId"], equals: lease.executionId } }
      : lease.expectedMetadata !== undefined
        ? { metadata: { equals: lease.expectedMetadata === null ? Prisma.AnyNull : lease.expectedMetadata } }
        : {}),
  }
}

async function settleInviteDelivery(input: InviteLease & {
  outboxStatus: BusinessOutboxStatus
  deliveryStatus: "SENT" | "DEFERRED" | "FAILED" | "DEAD_LETTER"
  now: Date
  providerResult?: AccountantClientInviteProviderResult
  errorCode?: string
}) {
  return db.$transaction(async (tx) => {
    const request = await tx.businessEventOutbox.findFirst({
      where: leaseWhere(input),
    })
    if (!request) return false

    const dispatch = dispatchMetadata(request.metadata)
    const outcome = input.deliveryStatus === "SENT" ? "ACCEPTED"
      : input.errorCode === "PROVIDER_OUTCOME_UNKNOWN" ? "UNKNOWN" : "NOT_SENT"

    const invite = await tx.accountantClientInvite.findFirst({
      where: { organizationId: input.organizationId, outboxId: input.requestId },
      select: {
        id: true,
        organizationId: true,
        evidenceHash: true,
        redactedEmail: true,
      },
    })
    if (!invite) {
      throw new NotFoundError("Accountant invitation evidence was not found")
    }

    const transitioned = await tx.businessEventOutbox.updateMany({
      where: { ...leaseWhere(input), updatedAt: request.updatedAt },
      data: {
        status: input.outboxStatus,
        ...(dispatch.parsed.success ? {
          metadata: { ...dispatch.container, accountantInviteDispatch: { ...dispatch.parsed.data, outcome } },
        } : {}),
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
        lastErrorMessage: null,
      },
    })
    if (transitioned.count !== 1) {
      return false
    }

    const referenceHash = providerReferenceHash(input.providerResult)
    const recorded = await recordBusinessEventInTx(tx, {
      organizationId: invite.organizationId,
      eventType: "ACCOUNTANT_CLIENT_INVITE_DELIVERY_" + input.deliveryStatus,
      eventSource: "WORKER",
      schemaVersion: 1,
      idempotencyKey:
        "accountant-client-invite-delivery:" +
        invite.id +
        ":" +
        input.attempt +
        ":" +
        input.deliveryStatus,
      sourceType: "ACCOUNTANT_CLIENT_INVITE",
      sourceId: invite.id,
      documentHash: invite.evidenceHash,
      payload: {
        inviteId: invite.id,
        outboxId: request.id,
        outboxPayloadHash: request.payloadHash,
        status: input.deliveryStatus,
        attempt: input.attempt,
        providerReferenceHash: referenceHash,
        errorCode: input.errorCode ?? null,
      },
      metadata: {
        providerReferenceStoredAsHash: true,
        providerDestinationStored: false,
      },
    })
    await markBusinessEventAppliedInTx(
      tx,
      invite.organizationId,
      recorded.event.id,
    )
    await tx.auditLog.create({
      data: {
        organizationId: invite.organizationId,
        entityType: "AccountantClientInvite",
        entityId: invite.id,
        action:
          "ACCOUNTANT_CLIENT_INVITE_DELIVERY_" + input.deliveryStatus,
        userId: null,
        changes: {
          after: {
            outboxStatus: input.outboxStatus,
            deliveryStatus: input.deliveryStatus,
            redactedEmail: invite.redactedEmail,
            attempt: input.attempt,
            providerReferenceHash: referenceHash,
            errorCode: input.errorCode ?? null,
          },
        },
      },
    })
    return true
  })
}

export async function claimAccountantClientInvites(input: {
  organizationId: string
  workerId: string
  limit?: number
  now?: Date
  staleAfterMs?: number
}) {
  const identity = workerIdentity.parse(input)
  const now = input.now ?? new Date()
  const limit = z.number().int().min(1).max(100).parse(input.limit ?? 25)
  const staleAfterMs = z.number().int().min(1).max(3600000).parse(input.staleAfterMs ?? 5 * 60_000)
  const staleBefore = new Date(
    now.getTime() - staleAfterMs,
  )
  const candidates = await db.businessEventOutbox.findMany({
    where: {
      organizationId: identity.organizationId,
      eventName: ACCOUNTANT_CLIENT_INVITE_EVENT_NAME,
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
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: limit,
    select: { id: true, attempts: true, updatedAt: true },
  })

  const claimed: string[] = []
  for (const candidate of candidates) {
    const result = await db.businessEventOutbox.updateMany({
      where: {
        id: candidate.id,
        organizationId: identity.organizationId,
        eventName: ACCOUNTANT_CLIENT_INVITE_EVENT_NAME,
        attempts: candidate.attempts,
        updatedAt: candidate.updatedAt,
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
        lockedBy: identity.workerId,
        attempts: { increment: 1 },
      },
    })
    if (result.count === 1) claimed.push(candidate.id)
  }
  return claimed
}

export async function processAccountantClientInvite(input: {
  organizationId: string
  requestId: string
  workerId: string
  now?: Date
  environment?: WorkerEnvironment
  dependencies?: Partial<WorkerDependencies>
  providerTimeoutMs?: number
}) {
  const identity = workerIdentity.parse(input)
  const requestId = z.string().trim().min(1).max(191).parse(input.requestId)
  const clock = () => input.now ?? new Date()
  const now = clock()
  const timeoutMs = z.number().int().min(1).max(120000).parse(input.providerTimeoutMs ?? 30000)
  const environment = input.environment ?? process.env
  const dependencies = { ...defaultDependencies, ...input.dependencies }
  const request = await db.businessEventOutbox.findFirst({
    where: {
      id: requestId,
      organizationId: identity.organizationId,
      eventName: ACCOUNTANT_CLIENT_INVITE_EVENT_NAME,
      status: BusinessOutboxStatus.LOCKED,
      lockedBy: identity.workerId,
    },
  })
  if (!request) {
    throw new NotFoundError("Claimed accountant invitation was not found")
  }

  const lease: InviteLease = { requestId, ...identity, attempt: request.attempts, expectedUpdatedAt: request.updatedAt, expectedMetadata: request.metadata }
  const settle = async (status: "SENT" | "DEFERRED" | "FAILED" | "DEAD_LETTER", code?: string, providerResult?: AccountantClientInviteProviderResult) => {
    const settled = await settleInviteDelivery({ ...lease, outboxStatus: status, deliveryStatus: status, now: clock(), errorCode: code, providerResult })
    return { requestId, status: settled ? status : "LEASE_LOST" as const, ...(code ? { code } : {}) }
  }
  const dispatch = dispatchMetadata(request.metadata)
  if (dispatch.parsed.success && dispatch.parsed.data.outcome === "RESERVED" && dispatch.parsed.data.attempt === request.attempts) {
    return { requestId, status: "PROCESSING" as const }
  }
  // A reclaimed legacy or reserved send may already have reached the provider.
  // Hold it for review rather than assuming an absent acknowledgement means no send.
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
      throw new BusinessRuleError(
        "Accountant invitation tenant evidence does not match",
      )
    }
    if (
      hashBusinessPayload(payload.sealedEnvelope) !==
      payload.sealedEnvelopeHash
    ) {
      throw new ConflictError(
        "Accountant invitation envelope hash does not match",
      )
    }
    const envelope = openAccountantClientInviteEnvelope(
      payload.sealedEnvelope,
      environment,
    )
    if (!envelope) {
      throw new ConflictError("Accountant invitation envelope is invalid")
    }

    const invite = await db.accountantClientInvite.findFirst({
      where: {
        id: payload.inviteId,
        organizationId: payload.organizationId,
        outboxId: request.id,
      },
      include: {
        attribution: { select: { id: true, referralCode: true } },
        organization: { select: { name: true } },
        states: {
          orderBy: [{ version: "desc" }, { occurredAt: "desc" }],
          take: 1,
          select: { status: true },
        },
      },
    })
    if (!invite) {
      throw new NotFoundError("Accountant invitation evidence was not found")
    }
    const current = invite.states[0]
    if (
      !current ||
      current.status !== AccountantClientInviteStatus.PENDING ||
      invite.expiresAt.getTime() <= now.getTime() ||
      invite.attributionId !== payload.attributionId ||
      invite.attribution.id !== payload.attributionId ||
      invite.attribution.referralCode !== payload.referralCode ||
      invite.emailHash !== payload.emailHash ||
      invite.redactedEmail !== payload.redactedEmail ||
      invite.role !== payload.role ||
      invite.consentEvidenceHash !== payload.consentEvidenceHash ||
      invite.expiresAt.toISOString() !== payload.expiresAt ||
      envelope.inviteId !== payload.inviteId ||
      envelope.referralCode !== payload.referralCode ||
      hashBusinessPayload(envelope.destination.trim().toLowerCase()) !==
        payload.emailHash
    ) {
      throw new ConflictError(
        "Accountant invitation evidence no longer matches",
      )
    }
    const inviteUrl = new URL(envelope.inviteUrl)
    const inviteToken = inviteUrl.searchParams.get("invite") ?? ""
    if (
      inviteUrl.pathname !==
        "/api/referrals/" + encodeURIComponent(payload.referralCode) ||
      Array.from(inviteUrl.searchParams.keys()).some(
        (key) => key !== "invite",
      ) ||
      hashBusinessPayload(inviteToken) !== invite.inviteTokenHash
    ) {
      throw new ConflictError("Accountant invitation referral URL is invalid")
    }

    if (request.attempts > request.maxAttempts) {
      return settle("DEAD_LETTER", "ACCOUNTANT_INVITE_ATTEMPTS_EXHAUSTED")
    }
    const executionId = randomUUID()
    const reservation = await db.$transaction(async tx => {
      const claimed = await tx.businessEventOutbox.updateMany({
        where: leaseWhere(lease),
        data: {
          metadata: { ...dispatch.container, accountantInviteDispatch: { version: 1, attempt: request.attempts, executionId, reservedAt: clock().toISOString(), outcome: "RESERVED" } },
        },
      })
      if (claimed.count !== 1) return false
      await tx.auditLog.create({ data: {
        organizationId: identity.organizationId,
        userId: null,
        entityType: "AccountantClientInvite",
        entityId: invite.id,
        action: "ACCOUNTANT_INVITE_DISPATCH_RESERVED",
        changes: { attempt: request.attempts, executionId, outboxId: request.id },
      } })
      return true
    })
    if (!reservation) return { requestId, status: "LEASE_LOST" as const }
    lease.executionId = executionId
    delete lease.expectedUpdatedAt
    delete lease.expectedMetadata
    reserved = true

    let timer: ReturnType<typeof setTimeout> | undefined
    let providerResult: AccountantClientInviteProviderResult
    try {
      providerResult = await Promise.race([
        dependencies.sendAccountantClientInvite({
          destination: envelope.destination,
          inviteUrl: envelope.inviteUrl,
          organizationName: invite.organization.name,
          accountantFirmName: invite.accountantFirmName,
          role: invite.role,
          locale: payload.locale,
          expiresAt: invite.expiresAt.toISOString(),
          referralCode: payload.referralCode,
          idempotencyKey: request.idempotencyKey,
        }, environment),
        new Promise<AccountantClientInviteProviderResult>(resolve => {
          timer = setTimeout(() => resolve({ status: "UNKNOWN", provider: "RESEND", errorCode: "ACCOUNTANT_INVITE_PROVIDER_OUTCOME_UNKNOWN", retryable: false }), timeoutMs)
        }),
      ])
    } finally { if (timer) clearTimeout(timer) }
    if (providerResult.status === "SENT" && providerResult.providerReference?.trim()) {
      return await settle("SENT", undefined, providerResult)
    }
    if (providerResult.status === "DEFERRED") {
      return await settle("DEFERRED", "PROVIDER_NOT_CONFIGURED", providerResult)
    }
    if (providerResult.status === "FAILED") {
      return await settle(request.attempts >= request.maxAttempts || !providerResult.retryable ? "DEAD_LETTER" : "FAILED", providerResult.errorCode, providerResult)
    }
    return await settle("DEFERRED", "PROVIDER_OUTCOME_UNKNOWN")
  } catch (error) {
    // If acceptance or its settlement is uncertain, the durable reservation is
    // retained. A later claim may hold it, but cannot blindly send it again.
    try {
      return await settle(reserved ? "DEFERRED" : "DEAD_LETTER", reserved ? "PROVIDER_OUTCOME_UNKNOWN" : error instanceof z.ZodError ? "INVALID_PAYLOAD" : "ACCOUNTANT_INVITE_INTEGRITY_FAILED")
    } catch {
      throw new ApplicationError("INTERNAL_ERROR", "Accountant invitation outcome could not be recorded. Review the retained request before retrying.", 500, false)
    }
  }
}

export async function runAccountantClientInviteWorker(input: {
  organizationId: string
  workerId: string
  limit?: number
  now?: Date
  environment?: WorkerEnvironment
  dependencies?: Partial<WorkerDependencies>
  providerTimeoutMs?: number
}) {
  const requestIds = await claimAccountantClientInvites(input)
  const results = []
  for (const requestId of requestIds) {
    try {
      results.push(await processAccountantClientInvite({
        ...input,
        requestId,
      }))
    } catch {
      results.push({
        requestId,
        status: "UNCONFIRMED" as const,
        error: "Accountant invitation outcome is unconfirmed. Review the retained request.",
      })
    }
  }
  return results
}
