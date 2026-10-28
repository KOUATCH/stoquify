import { createHash, randomUUID } from "node:crypto"
import {
  CustomerStatementAccessAction,
  CustomerStatementAccessOutcome,
  CustomerStatementAccessTokenStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"

import {
  type CustomerStatementTokenPermission,
  createCustomerStatementAccessToken,
  verifyCustomerStatementAccessToken,
} from "./customer-statement-token"

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60
const MIN_TTL_SECONDS = 5 * 60
const MAX_TTL_SECONDS = 90 * 24 * 60 * 60
const FORBIDDEN_EXTERNAL_KEYS = new Set([
  "email",
  "phone",
  "address",
  "notes",
  "recipientNote",
  "token",
  "tokenHash",
  "jtiHash",
  "ip",
  "userAgent",
])

export type IssueCustomerStatementAccessInput = {
  organizationId: string
  statementSnapshotId: string
  issuedById: string
  allowDispute?: boolean
  allowPromiseToPay?: boolean
  recipientReference?: string | null
  referralAttributionId?: string | null
  ttlSeconds?: number
  now?: Date
  metadata?: Record<string, unknown>
}

export type PublicCustomerStatementInput = {
  statementSnapshotId: string
  token?: string | null
  now?: Date
  ipAddress?: string | null
  userAgent?: string | null
}

export type PublicCustomerStatementResult = {
  statementId: string
  statementNumber: string
  version: number
  contentHash: string
  currency: string
  periodStart: string
  periodEnd: string
  expiresAt: string
  permissions: CustomerStatementTokenPermission[]
  responseHash: string
  payload: Prisma.JsonValue
  branding: {
    poweredBy: "Stoquify"
    referralCode: string | null
    referralUrl: string | null
  }
  controls: {
    redacted: true
    rawTokenStored: false
    requestMetadataHashed: true
  }
}

export type ResolvedCustomerStatementAccess = {
  organizationId: string
  statementSnapshotId: string
  tokenId: string
  tokenHash: string
  tokenHashPrefix: string
  statementContentHash: string
  expiresAt: Date
  permissions: CustomerStatementTokenPermission[]
  referralAttribution: {
    id: string
    referralCode: string
    campaign: string
  } | null
  snapshot: {
    id: string
    statementNumber: string
    version: number
    contentHash: string
    currency: string
    periodStart: Date
    periodEnd: Date
    closingBalance: Prisma.Decimal
    statementPayload: Prisma.JsonValue
    truncated: boolean
  }
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(label + " is required")
  return normalized
}

export function hashCustomerStatementAccessValue(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function optionalHash(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? hashCustomerStatementAccessValue(normalized) : null
}

function statementJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function permissionsFor(input: {
  allowDispute?: boolean
  allowPromiseToPay?: boolean
}): CustomerStatementTokenPermission[] {
  return [
    "view",
    ...(input.allowDispute ? ["dispute" as const] : []),
    ...(input.allowPromiseToPay ? ["promise_to_pay" as const] : []),
  ]
}

function permissionAllowed(
  action: CustomerStatementAccessAction,
  row: {
    allowView: boolean
    allowDispute: boolean
    allowPromiseToPay: boolean
  },
  permissions: CustomerStatementTokenPermission[],
) {
  if (action === CustomerStatementAccessAction.VIEW) {
    return row.allowView && permissions.includes("view")
  }
  if (action === CustomerStatementAccessAction.DISPUTE) {
    return row.allowDispute && permissions.includes("dispute")
  }
  return (
    row.allowPromiseToPay &&
    permissions.includes("promise_to_pay")
  )
}

function redactExternalValue(value: Prisma.JsonValue): Prisma.JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => redactExternalValue(item))
  }
  if (value && typeof value === "object") {
    const redacted: Record<string, Prisma.JsonValue> = {}
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_EXTERNAL_KEYS.has(key) || item === undefined) continue
      redacted[key] = redactExternalValue(item)
    }
    return redacted
  }
  return value
}

function assertSnapshotIntegrity(snapshot: {
  contentHash: string
  statementPayload: Prisma.JsonValue
  truncated: boolean
}) {
  if (snapshot.truncated) {
    throw new NotFoundError("Customer statement not found")
  }
  if (hashBusinessPayload(snapshot.statementPayload) !== snapshot.contentHash) {
    throw new ConflictError(
      "Customer statement snapshot content hash does not match its payload",
    )
  }
}

export async function issueCustomerStatementAccessTokenInTx(
  tx: Prisma.TransactionClient,
  input: IssueCustomerStatementAccessInput,
) {
  const organizationId = requiredText(input.organizationId, "Organization")
  const statementSnapshotId = requiredText(
    input.statementSnapshotId,
    "Customer statement",
  )
  const issuedById = requiredText(input.issuedById, "Token issuer")
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS
  if (ttlSeconds < MIN_TTL_SECONDS || ttlSeconds > MAX_TTL_SECONDS) {
    throw new BusinessRuleError(
      "Customer statement access lifetime must be between five minutes and ninety days",
    )
  }

  const actor = await tx.user.findFirst({
    where: { id: issuedById, organizationId, isActive: true },
    select: { id: true },
  })
  if (!actor) throw new NotFoundError("Active statement token issuer not found")

  const snapshot = await tx.customerStatementSnapshot.findFirst({
    where: { id: statementSnapshotId, organizationId },
  })
  if (!snapshot) throw new NotFoundError("Customer statement not found")
  assertSnapshotIntegrity(snapshot)

  const jti = randomUUID()
  const permissions = permissionsFor(input)
  const token = createCustomerStatementAccessToken({
    organizationId,
    statementSnapshotId,
    statementContentHash: snapshot.contentHash,
    jti,
    permissions,
    now,
    ttlSeconds,
  })
  if (!token) {
    throw new BusinessRuleError(
      "Customer statement token signing is not configured or the token contract is invalid",
    )
  }

  const tokenHash = hashCustomerStatementAccessValue(token)
  const jtiHash = hashCustomerStatementAccessValue(jti)
  const recipientHash = optionalHash(input.recipientReference)
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)
  const row = await tx.customerStatementAccessToken.create({
    data: {
      organizationId,
      statementSnapshotId,
      tokenHash,
      jtiHash,
      statementContentHash: snapshot.contentHash,
      recipientHash,
      referralAttributionId: input.referralAttributionId ?? null,
      allowView: true,
      allowDispute: input.allowDispute === true,
      allowPromiseToPay: input.allowPromiseToPay === true,
      status: CustomerStatementAccessTokenStatus.ACTIVE,
      issuedById: actor.id,
      issuedAt: now,
      expiresAt,
      metadata: input.metadata
        ? statementJson(input.metadata)
        : Prisma.JsonNull,
    },
  })
  await tx.auditLog.create({
    data: {
      organizationId,
      entityType: "CustomerStatementAccessToken",
      entityId: row.id,
      action: "CUSTOMER_STATEMENT_ACCESS_TOKEN_ISSUED",
      userId: actor.id,
      changes: statementJson({
        after: {
          statementSnapshotId,
          statementContentHash: snapshot.contentHash,
          tokenHashPrefix: tokenHash.slice(0, 12),
          jtiHashPrefix: jtiHash.slice(0, 12),
          recipientHashPrefix: recipientHash?.slice(0, 12) ?? null,
          referralAttributionId: input.referralAttributionId ?? null,
          permissions,
          issuedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      }),
    },
  })

  return {
    token,
    tokenId: row.id,
    tokenHash,
    jtiHash,
    recipientHash,
    referralAttributionId: input.referralAttributionId ?? null,
    permissions,
    expiresAt,
    statementSnapshotId,
    statementContentHash: snapshot.contentHash,
  }
}

export async function resolveCustomerStatementAccessInTx(
  tx: Prisma.TransactionClient,
  input: {
    statementSnapshotId: string
    token?: string | null
    action: CustomerStatementAccessAction
    now?: Date
  },
): Promise<ResolvedCustomerStatementAccess> {
  const statementSnapshotId = requiredText(
    input.statementSnapshotId,
    "Customer statement",
  )
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  const verification = verifyCustomerStatementAccessToken({
    token: input.token,
    statementSnapshotId,
    now,
  })
  if (!verification.ok) {
    throw new NotFoundError("Customer statement not found")
  }
  const payload = verification.payload
  const tokenHash = hashCustomerStatementAccessValue(input.token ?? "")
  const jtiHash = hashCustomerStatementAccessValue(payload.jti)
  const row = await tx.customerStatementAccessToken.findFirst({
    where: {
      organizationId: payload.organizationId,
      statementSnapshotId,
      tokenHash,
      jtiHash,
      statementContentHash: payload.statementContentHash,
    },
    include: {
      referralAttribution: {
        select: { id: true, referralCode: true, campaign: true },
      },
      statementSnapshot: {
        select: {
          id: true,
          statementNumber: true,
          version: true,
          contentHash: true,
          currency: true,
          periodStart: true,
          periodEnd: true,
          closingBalance: true,
          statementPayload: true,
          truncated: true,
        },
      },
    },
  })
  if (
    !row ||
    row.status !== CustomerStatementAccessTokenStatus.ACTIVE ||
    row.revokedAt ||
    row.expiresAt.getTime() <= now.getTime() ||
    row.statementContentHash !== row.statementSnapshot.contentHash ||
    row.statementContentHash !== payload.statementContentHash ||
    !permissionAllowed(input.action, row, payload.permissions)
  ) {
    throw new NotFoundError("Customer statement not found")
  }
  assertSnapshotIntegrity(row.statementSnapshot)

  return {
    organizationId: row.organizationId,
    statementSnapshotId: row.statementSnapshotId,
    tokenId: row.id,
    tokenHash,
    tokenHashPrefix: tokenHash.slice(0, 12),
    statementContentHash: row.statementContentHash,
    expiresAt: row.expiresAt,
    permissions: payload.permissions,
    referralAttribution: row.referralAttribution,
    snapshot: row.statementSnapshot,
  }
}

export async function recordCustomerStatementAccessInTx(
  tx: Prisma.TransactionClient,
  input: ResolvedCustomerStatementAccess & {
    action: CustomerStatementAccessAction
    responseHash?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    occurredAt: Date
  },
) {
  await tx.customerStatementAccessToken.update({
    where: {
      id: input.tokenId,
      organizationId: input.organizationId,
    },
    data: {
      lastAccessedAt: input.occurredAt,
      accessCount: { increment: 1 },
    },
  })
  return tx.customerStatementAccessLog.create({
    data: {
      organizationId: input.organizationId,
      statementSnapshotId: input.statementSnapshotId,
      tokenId: input.tokenId,
      action: input.action,
      outcome: CustomerStatementAccessOutcome.GRANTED,
      statementContentHash: input.statementContentHash,
      tokenHashPrefix: input.tokenHashPrefix,
      ipHash: optionalHash(input.ipAddress),
      userAgentHash: optionalHash(input.userAgent),
      responseHash: input.responseHash ?? null,
      denialReason: null,
      occurredAt: input.occurredAt,
    },
  })
}

function customerStatementReferralUrl(referralCode: string) {
  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "")
  const path = "/api/referrals/" + encodeURIComponent(referralCode)
  return baseUrl ? baseUrl + path : path
}

export async function getPublicCustomerStatement(
  input: PublicCustomerStatementInput,
  client: typeof db = db,
): Promise<PublicCustomerStatementResult> {
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  return client.$transaction(
    async (tx) => {
      const access = await resolveCustomerStatementAccessInTx(tx, {
        statementSnapshotId: input.statementSnapshotId,
        token: input.token,
        action: CustomerStatementAccessAction.VIEW,
        now,
      })
      const payload = redactExternalValue(access.snapshot.statementPayload)
      const branding = {
        poweredBy: "Stoquify" as const,
        referralCode: access.referralAttribution?.referralCode ?? null,
        referralUrl: access.referralAttribution
          ? customerStatementReferralUrl(access.referralAttribution.referralCode)
          : null,
      }
      const responseHash = hashBusinessPayload({
        statementSnapshotId: access.statementSnapshotId,
        statementContentHash: access.statementContentHash,
        payload,
        branding,
      })
      const accessLog = await recordCustomerStatementAccessInTx(tx, {
        ...access,
        action: CustomerStatementAccessAction.VIEW,
        responseHash,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        occurredAt: now,
      })
      if (access.referralAttribution) {
        const subjectHash = optionalHash(
          [input.ipAddress?.trim(), input.userAgent?.trim()]
            .filter(Boolean)
            .join("|"),
        )
        await tx.referralAttributionEvent.create({
          data: {
            organizationId: access.organizationId,
            attributionId: access.referralAttribution.id,
            eventType: "IMPRESSION",
            sourceEventKey: accessLog.id,
            subjectHash,
            payloadHash: hashBusinessPayload({
              attributionId: access.referralAttribution.id,
              statementSnapshotId: access.statementSnapshotId,
              accessLogId: accessLog.id,
              responseHash,
            }),
            occurredAt: now,
            metadata: {
              source: "CUSTOMER_STATEMENT_VIEW",
              campaign: access.referralAttribution.campaign,
            },
          },
        })
      }
      return {
        statementId: access.snapshot.id,
        statementNumber: access.snapshot.statementNumber,
        version: access.snapshot.version,
        contentHash: access.snapshot.contentHash,
        currency: access.snapshot.currency,
        periodStart: access.snapshot.periodStart.toISOString(),
        periodEnd: access.snapshot.periodEnd.toISOString(),
        expiresAt: access.expiresAt.toISOString(),
        permissions: access.permissions,
        responseHash,
        payload,
        branding,
        controls: {
          redacted: true,
          rawTokenStored: false,
          requestMetadataHashed: true,
        },
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

export async function revokeCustomerStatementAccessTokenInTx(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    tokenId: string
    revokedById: string
    reason: string
    now?: Date
  },
) {
  const organizationId = requiredText(input.organizationId, "Organization")
  const tokenId = requiredText(input.tokenId, "Statement token")
  const revokedById = requiredText(input.revokedById, "Revoking user")
  const reason = requiredText(input.reason, "Revocation reason")
  if (reason.length < 3 || reason.length > 500) {
    throw new BusinessRuleError(
      "Revocation reason must contain between 3 and 500 characters",
    )
  }
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  const actor = await tx.user.findFirst({
    where: { id: revokedById, organizationId, isActive: true },
    select: { id: true },
  })
  if (!actor) throw new NotFoundError("Active revoking user not found")

  const existing = await tx.customerStatementAccessToken.findFirst({
    where: { id: tokenId, organizationId },
  })
  if (!existing) throw new NotFoundError("Customer statement token not found")
  if (
    existing.status === CustomerStatementAccessTokenStatus.REVOKED &&
    existing.revokedAt
  ) {
    return { token: existing, replayed: true }
  }
  if (existing.status !== CustomerStatementAccessTokenStatus.ACTIVE) {
    throw new ConflictError("Customer statement token is not active")
  }

  const claim = await tx.customerStatementAccessToken.updateMany({
    where: {
      id: tokenId,
      organizationId,
      status: CustomerStatementAccessTokenStatus.ACTIVE,
      revokedAt: null,
    },
    data: {
      status: CustomerStatementAccessTokenStatus.REVOKED,
      revokedById: actor.id,
      revokedAt: now,
      revocationReason: reason,
    },
  })
  if (claim.count !== 1) {
    throw new ConflictError("Customer statement token revocation lost a race")
  }
  const token = {
    ...existing,
    status: CustomerStatementAccessTokenStatus.REVOKED,
    revokedById: actor.id,
    revokedAt: now,
    revocationReason: reason,
  }
  await tx.auditLog.create({
    data: {
      organizationId,
      entityType: "CustomerStatementAccessToken",
      entityId: tokenId,
      action: "CUSTOMER_STATEMENT_ACCESS_TOKEN_REVOKED",
      userId: actor.id,
      changes: statementJson({
        after: {
          status: token.status,
          revokedAt: now.toISOString(),
          revokedById: actor.id,
          revocationReason: reason,
          statementSnapshotId: existing.statementSnapshotId,
          tokenHashPrefix: existing.tokenHash.slice(0, 12),
        },
      }),
    },
  })
  return { token, replayed: false }
}

export async function issueCustomerStatementAccessToken(
  input: IssueCustomerStatementAccessInput,
  client: typeof db = db,
) {
  return client.$transaction(
    (tx) => issueCustomerStatementAccessTokenInTx(tx, input),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

export async function revokeCustomerStatementAccessToken(
  input: Parameters<typeof revokeCustomerStatementAccessTokenInTx>[1],
  client: typeof db = db,
) {
  return client.$transaction(
    (tx) => revokeCustomerStatementAccessTokenInTx(tx, input),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}
