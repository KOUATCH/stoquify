import {
  AccountantAccessRole,
  AccountantAccessStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  getPrismaKnownRequest,
  NotFoundError,
} from "@/services/_shared/action-errors"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"

import type {
  GrantAccountantAccessInput,
  RevokeAccountantAccessInput,
} from "./accountant-access.schemas"

type DbClient = typeof db | Prisma.TransactionClient
type AccessCapability = "READ" | "EXPORT" | "REVIEW"
const ACTIVE_GRANT_CONFLICT_MESSAGE =
  "This accountant already has an active or scheduled client access grant."

export type AccountantAccessGrantDto = {
  id: string
  organizationId: string
  accountantUserId: string
  accountantFirmName: string
  accountantFirmRegistrationNumber: string | null
  role: AccountantAccessRole
  status: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "REVOKED"
  consentGrantedById: string
  consentGrantedAt: string
  consentEvidenceHash: string
  effectiveFrom: string
  expiresAt: string
  revokedById: string | null
  revokedAt: string | null
  revocationReason: string | null
}

export type AccountantPortfolio = {
  generatedAt: string
  accountantUserId: string
  clientCount: number
  clients: Array<{
    grant: AccountantAccessGrantDto
    client: {
      organizationId: string
      name: string
      countryCode: string | null
      currency: string
    }
    close: {
      periodId: string
      status: string
      readinessScore: number
      blockerCount: number
      asOf: string
    } | null
  }>
}

function effectiveStatus(
  grant: {
    status: AccountantAccessStatus
    effectiveFrom: Date
    expiresAt: Date
    revokedAt: Date | null
  },
  now: Date,
): AccountantAccessGrantDto["status"] {
  if (
    grant.status === AccountantAccessStatus.REVOKED &&
    (grant.revokedAt === null || grant.revokedAt < grant.expiresAt)
  ) {
    return "REVOKED"
  }
  if (grant.expiresAt <= now) return "EXPIRED"
  if (grant.status === AccountantAccessStatus.REVOKED) return "REVOKED"
  if (grant.effectiveFrom > now) return "SCHEDULED"
  return "ACTIVE"
}

function toDto(
  grant: {
    id: string
    organizationId: string
    accountantUserId: string
    accountantFirmName: string
    accountantFirmRegistrationNumber: string | null
    role: AccountantAccessRole
    status: AccountantAccessStatus
    consentGrantedById: string
    consentGrantedAt: Date
    consentEvidenceHash: string
    effectiveFrom: Date
    expiresAt: Date
    revokedById: string | null
    revokedAt: Date | null
    revocationReason: string | null
  },
  now: Date,
): AccountantAccessGrantDto {
  return {
    id: grant.id,
    organizationId: grant.organizationId,
    accountantUserId: grant.accountantUserId,
    accountantFirmName: grant.accountantFirmName,
    accountantFirmRegistrationNumber: grant.accountantFirmRegistrationNumber,
    role: grant.role,
    status: effectiveStatus(grant, now),
    consentGrantedById: grant.consentGrantedById,
    consentGrantedAt: grant.consentGrantedAt.toISOString(),
    consentEvidenceHash: grant.consentEvidenceHash,
    effectiveFrom: grant.effectiveFrom.toISOString(),
    expiresAt: grant.expiresAt.toISOString(),
    revokedById: grant.revokedById,
    revokedAt: grant.revokedAt?.toISOString() ?? null,
    revocationReason: grant.revocationReason,
  }
}

function isActiveScopeUniqueConflict(error: unknown): boolean {
  const prismaError = getPrismaKnownRequest(error)
  if (prismaError?.code !== "P2002") return false

  const target = prismaError.meta?.target ?? prismaError.meta?.constraint
  if (Array.isArray(target)) {
    return target.some((field) => String(field).includes("activeScopeKey"))
  }
  return String(target ?? "").includes("activeScopeKey")
}


async function retireExpiredAccountantAccessGrantInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  grant: {
    id: string
    accountantUserId: string
    activeScopeKey: string | null
    expiresAt: Date
  },
): Promise<void> {
  if (grant.activeScopeKey !== null) {
    await tx.accountantAccessGrant.update({
      where: { id: grant.id },
      data: { activeScopeKey: null },
    })
  }

  await recordBusinessEventInTx(tx, {
    organizationId,
    eventType: "ACCOUNTANT_ACCESS_EXPIRED",
    eventSource: "INTERNAL",
    idempotencyKey: `accountant-access-expired:${grant.id}`,
    occurredAt: grant.expiresAt,
    sourceType: "AccountantAccessGrant",
    sourceId: grant.id,
    payload: {
      grantId: grant.id,
      accountantUserId: grant.accountantUserId,
      expiresAt: grant.expiresAt.toISOString(),
      reason: "CONSENT_WINDOW_ELAPSED",
    },
  })
}
export async function grantAccountantAccess(
  organizationId: string,
  actorId: string,
  input: GrantAccountantAccessInput,
  now = new Date(),
): Promise<AccountantAccessGrantDto> {
  const effectiveFrom = input.effectiveFrom ?? now
  if (input.expiresAt <= now) {
    throw new BusinessRuleError("Accountant access expiry must be in the future.")
  }
  if (input.expiresAt <= effectiveFrom) {
    throw new BusinessRuleError("Accountant access expiry must be after its effective date.")
  }

  const accountant = await db.user.findUnique({
    where: { email: input.accountantEmail },
    select: { id: true, isActive: true },
  })
  if (!accountant?.isActive) {
    throw new NotFoundError("An active accountant user with that email was not found.")
  }

  const activeScopeKey = `${organizationId}:${accountant.id}`

  return db.$transaction(async (tx) => {
    const existing = await tx.accountantAccessGrant.findFirst({
      where: {
        organizationId,
        accountantUserId: accountant.id,
        status: AccountantAccessStatus.ACTIVE,
        activeScopeKey,
      },
      select: {
        id: true,
        accountantUserId: true,
        activeScopeKey: true,
        expiresAt: true,
      },
    })
    if (existing && existing.expiresAt > now) {
      throw new ConflictError(ACTIVE_GRANT_CONFLICT_MESSAGE)
    }

    if (existing) {
      await retireExpiredAccountantAccessGrantInTx(
        tx,
        organizationId,
        existing,
      )
    }

    const grant = await tx.accountantAccessGrant.create({
      data: {
        organizationId,
        accountantUserId: accountant.id,
        accountantFirmName: input.accountantFirmName,
        accountantFirmRegistrationNumber:
          input.accountantFirmRegistrationNumber || null,
        role: input.role,
        status: AccountantAccessStatus.ACTIVE,
        activeScopeKey,
        consentGrantedById: actorId,
        consentGrantedAt: now,
        consentEvidenceHash: input.consentEvidenceHash,
        effectiveFrom,
        expiresAt: input.expiresAt,
        correlationId: input.correlationId || null,
        metadata: {
          consentContract: "explicit-client-consent.v1",
          accessBoundary: "ledger-backed-accountant-portal",
        },
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId,
      eventType: "ACCOUNTANT_ACCESS_GRANTED",
      eventSource: "INTERNAL",
      idempotencyKey: `accountant-access-granted:${grant.id}`,
      actorId,
      sourceType: "AccountantAccessGrant",
      sourceId: grant.id,
      documentHash: input.consentEvidenceHash,
      payload: {
        grantId: grant.id,
        accountantUserId: accountant.id,
        role: grant.role,
        effectiveFrom: grant.effectiveFrom.toISOString(),
        expiresAt: grant.expiresAt.toISOString(),
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "ACCOUNTANT_ACCESS_GRANTED",
          destination: accountant.id,
          payload: {
            grantId: grant.id,
            organizationId,
            role: grant.role,
            expiresAt: grant.expiresAt.toISOString(),
          },
        },
      ],
    })

    return toDto(grant, now)
  }).catch((error) => {
    if (isActiveScopeUniqueConflict(error)) {
      throw new ConflictError(ACTIVE_GRANT_CONFLICT_MESSAGE)
    }
    throw error
  })
}

export async function revokeAccountantAccess(
  organizationId: string,
  actorId: string,
  input: RevokeAccountantAccessInput,
  now = new Date(),
): Promise<AccountantAccessGrantDto> {
  return db.$transaction(async (tx) => {
    const existing = await tx.accountantAccessGrant.findFirst({
      where: { id: input.grantId, organizationId },
    })
    if (!existing) throw new NotFoundError("Accountant access grant was not found.")
    if (existing.status === AccountantAccessStatus.REVOKED) {
      return toDto(existing, now)
    }
    if (existing.expiresAt <= now) {
      await retireExpiredAccountantAccessGrantInTx(
        tx,
        organizationId,
        existing,
      )
      return toDto(existing, now)
    }

    const transition = await tx.accountantAccessGrant.updateMany({
      where: {
        id: existing.id,
        organizationId,
        status: AccountantAccessStatus.ACTIVE,
        activeScopeKey: `${organizationId}:${existing.accountantUserId}`,
        expiresAt: { gt: now },
      },
      data: {
        status: AccountantAccessStatus.REVOKED,
        activeScopeKey: null,
        revokedById: actorId,
        revokedAt: now,
        revocationReason: input.reason,
        correlationId: input.correlationId || existing.correlationId,
      },
    })
    if (transition.count === 0) {
      const latest = await tx.accountantAccessGrant.findFirst({
        where: { id: input.grantId, organizationId },
      })
      if (!latest) {
        throw new NotFoundError("Accountant access grant was not found.")
      }
      if (latest.status === AccountantAccessStatus.REVOKED) {
        return toDto(latest, now)
      }
      if (latest.expiresAt <= now) {
        await retireExpiredAccountantAccessGrantInTx(
          tx,
          organizationId,
          latest,
        )
        return toDto(latest, now)
      }
      throw new ConflictError(
        "Accountant access changed before revocation completed.",
      )
    }

    const grant = {
      ...existing,
      status: AccountantAccessStatus.REVOKED,
      activeScopeKey: null,
      revokedById: actorId,
      revokedAt: now,
      revocationReason: input.reason,
      correlationId: input.correlationId || existing.correlationId,
    }

    await recordBusinessEventInTx(tx, {
      organizationId,
      eventType: "ACCOUNTANT_ACCESS_REVOKED",
      eventSource: "INTERNAL",
      idempotencyKey: `accountant-access-revoked:${grant.id}`,
      actorId,
      sourceType: "AccountantAccessGrant",
      sourceId: grant.id,
      payload: {
        grantId: grant.id,
        accountantUserId: grant.accountantUserId,
        revokedAt: now.toISOString(),
        reason: input.reason,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "ACCOUNTANT_ACCESS_REVOKED",
          destination: grant.accountantUserId,
          payload: { grantId: grant.id, organizationId },
        },
      ],
    })

    return toDto(grant, now)
  })
}

export async function getAccountantAccessRegister(
  organizationId: string,
  now = new Date(),
  client: DbClient = db,
): Promise<AccountantAccessGrantDto[]> {
  const grants = await client.accountantAccessGrant.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { expiresAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  })
  return grants.map((grant) => toDto(grant, now))
}

export async function resolveAccountantClientAccess(input: {
  homeOrganizationId: string
  clientOrganizationId?: string | null
  accountantUserId: string
  capability: AccessCapability
  now?: Date
  client?: DbClient
}) {
  const targetOrganizationId =
    input.clientOrganizationId || input.homeOrganizationId
  if (targetOrganizationId === input.homeOrganizationId) {
    return {
      organizationId: targetOrganizationId,
      mode: "TENANT_MEMBER" as const,
      grant: null,
    }
  }

  const now = input.now ?? new Date()
  const client = input.client ?? db
  const grant = await client.accountantAccessGrant.findFirst({
    where: {
      organizationId: targetOrganizationId,
      accountantUserId: input.accountantUserId,
      status: AccountantAccessStatus.ACTIVE,
      effectiveFrom: { lte: now },
      expiresAt: { gt: now },
      activeScopeKey: `${targetOrganizationId}:${input.accountantUserId}`,
      organization: {
        is: { isActive: true, deletedAt: null },
      },
    },
  })

  if (!grant) {
    throw new ForbiddenError("No active client consent grants access to this organization.")
  }
  if (
    input.capability === "EXPORT" &&
    grant.role === AccountantAccessRole.READ_ONLY
  ) {
    throw new ForbiddenError("This accountant grant is read-only and cannot export client data.")
  }
  if (
    input.capability === "REVIEW" &&
    grant.role === AccountantAccessRole.READ_ONLY
  ) {
    throw new ForbiddenError("This accountant grant is read-only and cannot request client work.")
  }

  return {
    organizationId: targetOrganizationId,
    mode: "DELEGATED_ACCOUNTANT" as const,
    grant: toDto(grant, now),
  }
}

export async function getAccountantPortfolio(
  accountantUserId: string,
  now = new Date(),
): Promise<AccountantPortfolio> {
  const grants = await db.accountantAccessGrant.findMany({
    where: {
      accountantUserId,
      status: AccountantAccessStatus.ACTIVE,
      effectiveFrom: { lte: now },
      expiresAt: { gt: now },
      activeScopeKey: { not: null },
      organization: {
        is: { isActive: true, deletedAt: null },
      },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          countryCode: true,
          currency: true,
        },
      },
    },
    orderBy: [{ organization: { name: "asc" } }, { expiresAt: "asc" }],
    take: 100,
  })

  const clients = await Promise.all(
    grants.map(async (grant) => {
      const close = await db.closeRun.findFirst({
        where: { organizationId: grant.organizationId, voidedAt: null },
        select: {
          periodId: true,
          status: true,
          readinessScore: true,
          criticalBlockerCount: true,
          highBlockerCount: true,
          asOf: true,
        },
        orderBy: [{ asOf: "desc" }, { createdAt: "desc" }],
      })

      return {
        grant: toDto(grant, now),
        client: {
          organizationId: grant.organization.id,
          name: grant.organization.name,
          countryCode: grant.organization.countryCode,
          currency: grant.organization.currency,
        },
        close: close
          ? {
              periodId: close.periodId,
              status: close.status,
              readinessScore: close.readinessScore,
              blockerCount:
                close.criticalBlockerCount + close.highBlockerCount,
              asOf: close.asOf.toISOString(),
            }
          : null,
      }
    }),
  )

  return {
    generatedAt: now.toISOString(),
    accountantUserId,
    clientCount: clients.length,
    clients,
  }
}
