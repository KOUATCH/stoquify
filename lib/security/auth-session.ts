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
  lastAuthAt: number
}

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
    | { id?: string | null; token?: string | null; createdAt?: Date | string | null }
    | undefined
  const rawUser = session?.user as { id?: string | null } | undefined

  return {
    sessionId: rawSession?.id ?? null,
    sessionToken: rawSession?.token ?? null,
    sessionCreatedAt: rawSession?.createdAt ? new Date(rawSession.createdAt) : null,
    userId: rawUser?.id ?? null,
  }
}

function buildClaims(ctx: RbacContext, parts: ReturnType<typeof readSessionParts>): AuthSessionClaims {
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
    lastAuthAt: parts.sessionCreatedAt?.getTime() ?? Date.now(),
  }
}

export async function requireSession(): Promise<VerifiedAuthSession> {
  const raw = await auth.api.getSession({ headers: await headers() })
  const parts = readSessionParts(raw)

  if (!parts.sessionId || !parts.sessionToken || !parts.userId) {
    throw new RbacError("Authentication required", "UNAUTHENTICATED", 401)
  }

  const mirror = await db.session.findFirst({
    where: {
      userId: parts.userId,
      OR: [{ id: parts.sessionId }, { token: parts.sessionToken }],
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })

  if (!mirror) {
    throw new RbacError("Session expired or revoked", "UNAUTHENTICATED", 401)
  }

  const ctx = await requireRbacContext()
  return {
    raw,
    ctx,
    claims: buildClaims(ctx, parts),
  }
}

export async function requireFreshAuth(maxAgeSeconds = 300) {
  const verified = await requireSession()
  const ageMs = Date.now() - verified.claims.lastAuthAt

  if (ageMs > maxAgeSeconds * 1000) {
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
