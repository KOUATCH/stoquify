import "server-only"

import { createHmac } from "node:crypto"
import { Prisma } from "@prisma/client"

import type { PublicIdentityRequestContext } from "@/lib/security/public-request-context"
import { db } from "@/prisma/db"
import { ApplicationError, getPrismaKnownRequest } from "@/services/_shared/action-errors"

export type PublicIdentityOperation =
  | "registration"
  | "invitation_redemption"
  | "password_reset_request"
  | "password_reset_completion"
  | "email_otp_verification"

type AbusePolicy = {
  maxRequests: number
  windowSeconds: number
  blockSeconds: number
}

type StoredBucket = {
  id: string
  windowStartedAt: Date
  requestCount: number
  blockedUntil: Date | null
}

type BucketEvaluation = {
  allowed: boolean
  requestCount: number
  windowStartedAt: Date
  blockedUntil: Date | null
  retryAfterSeconds: number
  persist: boolean
}

export type PublicIdentityAbuseDecision = {
  allowed: boolean
  operation: PublicIdentityOperation
  retryAfterSeconds: number
}

const POLICIES: Record<PublicIdentityOperation, AbusePolicy> = {
  registration: { maxRequests: 3, windowSeconds: 60 * 60, blockSeconds: 60 * 60 },
  invitation_redemption: { maxRequests: 5, windowSeconds: 15 * 60, blockSeconds: 30 * 60 },
  password_reset_request: { maxRequests: 3, windowSeconds: 15 * 60, blockSeconds: 30 * 60 },
  password_reset_completion: { maxRequests: 5, windowSeconds: 15 * 60, blockSeconds: 30 * 60 },
  email_otp_verification: { maxRequests: 5, windowSeconds: 15 * 60, blockSeconds: 30 * 60 },
}

function hashingSecret() {
  const secret =
    process.env.PUBLIC_IDENTITY_ABUSE_HASH_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET

  if (!secret || secret.length < 32) {
    throw new ApplicationError(
      "DATABASE_UNAVAILABLE",
      "Public identity abuse protection is unavailable",
      503,
      false,
    )
  }

  return secret
}

export function hashPublicIdentityAbuseSubject(scope: string, subject: string) {
  return createHmac("sha256", hashingSecret())
    .update(scope)
    .update("\u0000")
    .update(subject.trim())
    .digest("hex")
}

export function evaluatePublicIdentityAbuseBucket(input: {
  bucket: StoredBucket | null
  policy: AbusePolicy
  now: Date
}): BucketEvaluation {
  const { bucket, policy, now } = input
  if (!bucket) {
    return {
      allowed: true,
      requestCount: 1,
      windowStartedAt: now,
      blockedUntil: null,
      retryAfterSeconds: 0,
      persist: true,
    }
  }

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return {
      allowed: false,
      requestCount: bucket.requestCount,
      windowStartedAt: bucket.windowStartedAt,
      blockedUntil: bucket.blockedUntil,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.blockedUntil.getTime() - now.getTime()) / 1000)),
      persist: false,
    }
  }

  const windowExpiresAt = bucket.windowStartedAt.getTime() + policy.windowSeconds * 1000
  if (windowExpiresAt <= now.getTime()) {
    return {
      allowed: true,
      requestCount: 1,
      windowStartedAt: now,
      blockedUntil: null,
      retryAfterSeconds: 0,
      persist: true,
    }
  }

  const requestCount = bucket.requestCount + 1
  if (requestCount > policy.maxRequests) {
    const blockedUntil = new Date(now.getTime() + policy.blockSeconds * 1000)
    return {
      allowed: false,
      requestCount,
      windowStartedAt: bucket.windowStartedAt,
      blockedUntil,
      retryAfterSeconds: policy.blockSeconds,
      persist: true,
    }
  }

  return {
    allowed: true,
    requestCount,
    windowStartedAt: bucket.windowStartedAt,
    blockedUntil: null,
    retryAfterSeconds: 0,
    persist: true,
  }
}

function isRetryableConflict(error: unknown) {
  const prismaError = getPrismaKnownRequest(error)
  return prismaError?.code === "P2002" || prismaError?.code === "P2034"
}

async function consumeBucket(input: {
  scope: string
  subject: string
  policy: AbusePolicy
  now: Date
}) {
  const subjectHash = hashPublicIdentityAbuseSubject(input.scope, input.subject)

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const bucket = await tx.publicIdentityAbuseBucket.findUnique({
          where: {
            scope_subjectHash: {
              scope: input.scope,
              subjectHash,
            },
          },
          select: {
            id: true,
            windowStartedAt: true,
            requestCount: true,
            blockedUntil: true,
          },
        })
        const evaluation = evaluatePublicIdentityAbuseBucket({
          bucket,
          policy: input.policy,
          now: input.now,
        })

        if (!bucket) {
          await tx.publicIdentityAbuseBucket.create({
            data: {
              scope: input.scope,
              subjectHash,
              windowStartedAt: evaluation.windowStartedAt,
              requestCount: evaluation.requestCount,
              blockedUntil: evaluation.blockedUntil,
            },
          })
        } else if (evaluation.persist) {
          await tx.publicIdentityAbuseBucket.update({
            where: { id: bucket.id },
            data: {
              windowStartedAt: evaluation.windowStartedAt,
              requestCount: evaluation.requestCount,
              blockedUntil: evaluation.blockedUntil,
            },
          })
        }

        return evaluation
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (attempt < 3 && isRetryableConflict(error)) continue
      if (isRetryableConflict(error)) {
        throw new ApplicationError(
          "DATABASE_CONFLICT",
          "Public identity abuse protection could not resolve a concurrent request",
          503,
          false,
        )
      }

      throw new ApplicationError(
        "DATABASE_UNAVAILABLE",
        "Public identity abuse protection is temporarily unavailable",
        503,
        false,
      )
    }
  }

  throw new ApplicationError(
    "DATABASE_CONFLICT",
    "Public identity abuse protection could not resolve a concurrent request",
    503,
    false,
  )
}

export async function enforcePublicIdentityAbuseLimits(input: {
  operation: PublicIdentityOperation
  subject: string
  requestContext?: PublicIdentityRequestContext | null
  now?: Date
}): Promise<PublicIdentityAbuseDecision> {
  const policy = POLICIES[input.operation]
  const now = input.now ?? new Date()
  const dimensions = [
    { scope: `${input.operation}:subject`, subject: input.subject.trim() || "missing" },
  ]

  if (input.requestContext?.ipAddress) {
    dimensions.push({ scope: `${input.operation}:ip`, subject: input.requestContext.ipAddress })
  }

  for (const dimension of dimensions) {
    const evaluation = await consumeBucket({
      ...dimension,
      policy,
      now,
    })
    if (!evaluation.allowed) {
      return {
        allowed: false,
        operation: input.operation,
        retryAfterSeconds: evaluation.retryAfterSeconds,
      }
    }
  }

  return {
    allowed: true,
    operation: input.operation,
    retryAfterSeconds: 0,
  }
}
