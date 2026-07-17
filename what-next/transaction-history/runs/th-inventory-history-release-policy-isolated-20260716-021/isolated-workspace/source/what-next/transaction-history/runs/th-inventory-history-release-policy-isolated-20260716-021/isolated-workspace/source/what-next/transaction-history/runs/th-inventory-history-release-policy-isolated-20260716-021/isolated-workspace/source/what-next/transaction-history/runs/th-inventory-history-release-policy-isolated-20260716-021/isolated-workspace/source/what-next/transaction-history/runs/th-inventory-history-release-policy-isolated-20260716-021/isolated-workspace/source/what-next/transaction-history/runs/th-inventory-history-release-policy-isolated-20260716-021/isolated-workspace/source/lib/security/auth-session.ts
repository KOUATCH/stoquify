import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/prisma/db"
import { RbacError, requireRbacContext, type RbacContext } from "@/lib/security/rbac"
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log"

export type AuthSessionClaims = {
  sessionId: string
  sessionToken: string
  userId: string
  tenantId: string
  membershipId: string
  roles: string[]
  permissions: string[]
  branchIds: string[]
  modulesEnabled: string[]
  permsFetchedAt: number
  mfaVerifiedAt?: number
  assuranceMethod: string | null
  assuranceOrganizationId: string | null
  assuranceLevel: number
  lastAuthAt: number
}

export const SESSION_ASSURANCE_LEVEL = {
  NONE: 0,
  PASSWORD: 1,
} as const

export type VerifiedAuthSession = {
  raw: Awaited<ReturnType<typeof auth.api.getSession>>
  ctx: RbacContext
  claims: AuthSessionClaims
}

export class FreshAuthRequiredError extends Error {
  constructor(message = "Fresh authentication required") {
    super(message)
    this.name = "FreshAuthRequiredError"
  }
}

function readSessionParts(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  const rawSession = session?.session as
    | { id?: string | null; token?: string | null }
    | undefined
  const rawUser = session?.user as { id?: string | null } | undefined

  return {
    sessionId: rawSession?.id ?? null,
    sessionToken: rawSession?.token ?? null,
    userId: rawUser?.id ?? null,
  }
}

type SessionAssuranceEvidence = {
  id: string
  assuranceVerifiedAt: Date | null
  assuranceMethod: string | null
  assuranceOrganizationId: string | null
  assuranceLevel: number
}

function buildClaims(
  ctx: RbacContext,
  parts: ReturnType<typeof readSessionParts>,
  evidence: SessionAssuranceEvidence,
): AuthSessionClaims {
  if (!parts.sessionId || !parts.sessionToken || !parts.userId) {
    throw new RbacError("Authentication required", "UNAUTHENTICATED", 401)
  }

  return {
    sessionId: parts.sessionId,
    sessionToken: parts.sessionToken,
    userId: parts.userId,
    tenantId: ctx.orgId,
    membershipId: `${ctx.orgId}:${ctx.userId}`,
    roles: ctx.roles.map((role) => role.code),
    permissions: ctx.permissions,
    branchIds: [],
    modulesEnabled: ["inventory", "pos", "purchasing", "finance", "reports", "admin"],
    permsFetchedAt: ctx.fetchedAt,
    assuranceMethod: evidence.assuranceMethod,
    assuranceOrganizationId: evidence.assuranceOrganizationId,
    assuranceLevel: evidence.assuranceLevel,
    lastAuthAt: evidence.assuranceVerifiedAt?.getTime() ?? 0,
  }
}

export async function requireSession(): Promise<VerifiedAuthSession> {
  const raw = await auth.api.getSession({ headers: await headers() })
  const parts = readSessionParts(raw)

  if (!parts.sessionId || !parts.sessionToken || !parts.userId) {
    throw new RbacError("Authentication required", "UNAUTHENTICATED", 401)
  }

  const checkedAt = new Date()
  const mirror = await db.session.findFirst({
    where: {
      id: parts.sessionId,
      token: parts.sessionToken,
      userId: parts.userId,
      expiresAt: { gt: checkedAt },
    },
    select: {
      id: true,
      assuranceVerifiedAt: true,
      assuranceMethod: true,
      assuranceOrganizationId: true,
      assuranceLevel: true,
    },
  })

  if (!mirror) {
    throw new RbacError("Session expired or revoked", "UNAUTHENTICATED", 401)
  }

  const ctx = await requireRbacContext()
  if (ctx.userId !== parts.userId) {
    throw new RbacError("Session identity mismatch", "UNAUTHENTICATED", 401)
  }

  return {
    raw,
    ctx,
    claims: buildClaims(ctx, parts, mirror),
  }
}

export async function requireFreshAuth(
  maxAgeSeconds = 300,
  minimumLevel = SESSION_ASSURANCE_LEVEL.PASSWORD,
) {
  const verified = await requireSession()
  const now = Date.now()
  const maxAgeMs = maxAgeSeconds * 1000
  const { claims } = verified

  if (
    !Number.isFinite(maxAgeMs) ||
    maxAgeMs <= 0 ||
    !Number.isFinite(minimumLevel) ||
    minimumLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
    !claims.assuranceMethod ||
    !claims.assuranceOrganizationId ||
    claims.assuranceOrganizationId !== claims.tenantId ||
    claims.assuranceLevel < minimumLevel ||
    !Number.isFinite(claims.lastAuthAt) ||
    claims.lastAuthAt <= 0 ||
    claims.lastAuthAt > now ||
    now - claims.lastAuthAt > maxAgeMs
  ) {
    throw new FreshAuthRequiredError()
  }

  return verified
}

export async function revokeAllSessionsForUser(input: {
  userId: string
  organizationId?: string | null
  actorUserId?: string | null
  exceptSessionToken?: string | null
  reason?: string
}) {
  const deleted = await db.session.deleteMany({
    where: {
      userId: input.userId,
      ...(input.exceptSessionToken
        ? { token: { not: input.exceptSessionToken } }
        : {}),
    },
  })

  await logSecurityEvent({
    type: SecurityEventType.AUTH_SESSION_REVOKED,
    userId: input.actorUserId ?? input.userId,
    organizationId: input.organizationId,
    resource: input.userId,
    details: {
      revokedUserId: input.userId,
      count: deleted.count,
      reason: input.reason ?? "session_revocation",
      exceptCurrent: Boolean(input.exceptSessionToken),
    },
  })

  return deleted.count
}
