import {
  AccountantClientInviteStatus,
  BusinessOutboxStatus,
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

async function settleInviteDelivery(input: {
  requestId: string
  workerId: string
  attempt: number
  outboxStatus: BusinessOutboxStatus
  deliveryStatus: "SENT" | "DEFERRED" | "FAILED" | "DEAD_LETTER"
  now: Date
  providerResult?: AccountantClientInviteProviderResult
  errorCode?: string
}) {
  return db.$transaction(async (tx) => {
    const request = await tx.businessEventOutbox.findFirst({
      where: {
        id: input.requestId,
        eventName: ACCOUNTANT_CLIENT_INVITE_EVENT_NAME,
        status: BusinessOutboxStatus.LOCKED,
        lockedBy: input.workerId,
      },
      select: { id: true, payloadHash: true },
    })
    if (!request) throw new ConflictError("Accountant invitation lease was lost")

    const invite = await tx.accountantClientInvite.findFirst({
      where: { outboxId: input.requestId },
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
          input.deliveryStatus === "SENT"
            ? null
            : "Accountant invitation delivery did not complete.",
      },
    })
    if (transitioned.count !== 1) {
      throw new ConflictError("Accountant invitation lease was lost")
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
    return invite
  })
}

export async function claimAccountantClientInvites(input: {
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
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true },
  })

  const claimed: string[] = []
  for (const candidate of candidates) {
    const result = await db.businessEventOutbox.updateMany({
      where: {
        id: candidate.id,
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

export async function processAccountantClientInvite(input: {
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
      eventName: ACCOUNTANT_CLIENT_INVITE_EVENT_NAME,
      status: BusinessOutboxStatus.LOCKED,
      lockedBy: input.workerId,
    },
  })
  if (!request) {
    throw new NotFoundError("Claimed accountant invitation was not found")
  }

  try {
    const payload = outboxPayloadSchema.parse(request.payload)
    if (payload.organizationId !== request.organizationId) {
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

    const providerResult = await dependencies.sendAccountantClientInvite({
      destination: envelope.destination,
      inviteUrl: envelope.inviteUrl,
      organizationName: invite.organization.name,
      accountantFirmName: invite.accountantFirmName,
      role: invite.role,
      locale: payload.locale,
      expiresAt: invite.expiresAt.toISOString(),
      referralCode: payload.referralCode,
      idempotencyKey: request.idempotencyKey,
    }, environment)

    if (providerResult.status === "SENT") {
      await settleInviteDelivery({
        requestId: request.id,
        workerId: input.workerId,
        attempt: request.attempts,
        outboxStatus: BusinessOutboxStatus.SENT,
        deliveryStatus: "SENT",
        now,
        providerResult,
      })
      return { requestId: request.id, status: "SENT" as const }
    }
    if (providerResult.status === "DEFERRED") {
      await settleInviteDelivery({
        requestId: request.id,
        workerId: input.workerId,
        attempt: request.attempts,
        outboxStatus: BusinessOutboxStatus.DEFERRED,
        deliveryStatus: "DEFERRED",
        now,
        providerResult,
        errorCode: providerResult.errorCode,
      })
      return { requestId: request.id, status: "DEFERRED" as const }
    }

    const exhausted =
      request.attempts >= request.maxAttempts || !providerResult.retryable
    await settleInviteDelivery({
      requestId: request.id,
      workerId: input.workerId,
      attempt: request.attempts,
      outboxStatus: exhausted
        ? BusinessOutboxStatus.DEAD_LETTER
        : BusinessOutboxStatus.FAILED,
      deliveryStatus: exhausted ? "DEAD_LETTER" : "FAILED",
      now,
      providerResult,
      errorCode: providerResult.errorCode,
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
        status:
          request.attempts >= request.maxAttempts
            ? BusinessOutboxStatus.DEAD_LETTER
            : BusinessOutboxStatus.FAILED,
        availableAt: retryAt(request.attempts, now),
        lockedAt: null,
        lockedBy: null,
        failedAt: now,
        lastErrorCode:
          error instanceof z.ZodError
            ? "INVALID_PAYLOAD"
            : "ACCOUNTANT_INVITE_INTEGRITY_FAILED",
        lastErrorMessage: "Accountant invitation validation failed.",
      },
    })
    if (error instanceof ApplicationError) throw error
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Accountant invitation processing failed.",
      500,
      false,
    )
  }
}

export async function runAccountantClientInviteWorker(input: {
  organizationId?: string
  workerId: string
  limit?: number
  now?: Date
  environment?: WorkerEnvironment
  dependencies?: Partial<WorkerDependencies>
}) {
  const requestIds = await claimAccountantClientInvites(input)
  const results = []
  for (const requestId of requestIds) {
    try {
      results.push(await processAccountantClientInvite({
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
