import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/prisma/db"
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log"
import {
  expandPermissions,
  hasAllRbacPermissions,
  hasAnyRbacPermission,
  hasRbacPermission,
  isKnownPermission,
  permissionRisk,
  type PermissionRisk,
} from "@/lib/security/rbac-permissions"

export {
  expandPermissions,
  hasAllRbacPermissions,
  hasAnyRbacPermission,
  hasRbacPermission,
  isKnownPermission,
  permissionRisk,
} from "@/lib/security/rbac-permissions"

export type RbacErrorCode =
  | "UNAUTHENTICATED"
  | "NO_ACTIVE_ORG"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_LOCKED"
  | "FORBIDDEN"

export class RbacError extends Error {
  constructor(
    message: string,
    public readonly code: RbacErrorCode,
    public readonly status: 401 | 403,
  ) {
    super(message)
    this.name = "RbacError"
  }
}

export type RbacRole = {
  id: string
  name: string
  nameEn?: string | null
  nameFr?: string | null
  code: string
  permissions: string[]
}

export type RbacUser = {
  id: string
  firstName: string
  lastName: string
  phone: string
  roles: RbacRole[]
  permissions: string[]
  name?: string | null
  email?: string | null
  image?: string | null
  organizationId: string
  organizationName: string | null
}

export type RbacContext = {
  user: RbacUser
  userId: string
  orgId: string
  organizationName: string | null
  roles: RbacRole[]
  permissions: string[]
  isSuperUser: boolean
  source: "better-auth"
  fetchedAt: number
}

export type RbacDecisionInput = {
  ctx?: Pick<RbacContext, "userId" | "orgId"> | null
  permission: string
  result: "allowed" | "denied"
  risk?: PermissionRisk
  resource?: string | null
  resourceId?: string | null
  reason?: string | null
}

async function getBetterAuthSession() {
  try {
    return await auth.api.getSession({ headers: await headers() })
  } catch {
    return null
  }
}

async function loadRbacContextFromSession(session: Awaited<ReturnType<typeof getBetterAuthSession>>) {
  const sessionUser = session?.user as
    | { id?: string | null; email?: string | null; organizationId?: string | null }
    | undefined

  if (!sessionUser?.id && !sessionUser?.email) {
    throw new RbacError("Authentication required", "UNAUTHENTICATED", 401)
  }

  const user = await db.user.findFirst({
    where: {
      isActive: true,
      OR: [
        ...(sessionUser.id ? [{ id: sessionUser.id }] : []),
        ...(sessionUser.email ? [{ email: { equals: sessionUser.email, mode: "insensitive" as const } }] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      image: true,
      emailVerified: true,
      isVerified: true,
      isLocked: true,
      lockedUntil: true,
      organizationId: true,
      organization: {
        select: {
          name: true,
          isActive: true,
          deletedAt: true,
        },
      },
      roles: {
        select: {
          id: true,
          nameEn: true,
          nameFr: true,
          code: true,
          permissions: true,
        },
      },
    },
  })

  if (!user) {
    throw new RbacError("Authentication required", "UNAUTHENTICATED", 401)
  }

  if (!user.organizationId || !user.organization?.isActive || user.organization.deletedAt) {
    throw new RbacError("Active organization required", "NO_ACTIVE_ORG", 403)
  }

  if (user.isLocked && (!user.lockedUntil || user.lockedUntil > new Date())) {
    throw new RbacError("Account is locked", "ACCOUNT_LOCKED", 403)
  }

  if (!user.emailVerified && !user.isVerified) {
    throw new RbacError("Email verification required", "EMAIL_NOT_VERIFIED", 403)
  }

  const sessionOrgId = sessionUser?.organizationId
  if (sessionOrgId && sessionOrgId !== user.organizationId) {
    throw new RbacError("Session organization is stale", "FORBIDDEN", 403)
  }

  const rawPermissions = user.roles.flatMap((role) => role.permissions ?? [])
  const permissions = expandPermissions(rawPermissions)
  const roles = user.roles.map((role) => ({
    id: role.id,
    name: role.nameEn || role.nameFr || role.code,
    nameEn: role.nameEn,
    nameFr: role.nameFr,
    code: role.code,
    permissions: role.permissions ?? [],
  }))
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
  const rbacUser: RbacUser = {
    id: user.id,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    roles,
    permissions,
    name,
    email: user.email,
    image: user.image,
    organizationId: user.organizationId,
    organizationName: user.organization.name,
  }

  return {
    user: rbacUser,
    userId: user.id,
    orgId: user.organizationId,
    organizationName: user.organization.name,
    roles,
    permissions,
    isSuperUser: hasRbacPermission(permissions, "*"),
    source: "better-auth",
    fetchedAt: Date.now(),
  } satisfies RbacContext
}

export async function getOptionalRbacContext() {
  const session = await getBetterAuthSession()
  if (!session?.user) return null

  try {
    return await loadRbacContextFromSession(session)
  } catch {
    return null
  }
}

export async function requireRbacContext() {
  const session = await getBetterAuthSession()
  return loadRbacContextFromSession(session)
}

export async function auditRbacDecision(input: RbacDecisionInput) {
  await logSecurityEvent({
    type:
      input.result === "allowed"
        ? SecurityEventType.PERMISSION_GRANTED
        : SecurityEventType.PERMISSION_DENIED,
    userId: input.ctx?.userId,
    organizationId: input.ctx?.orgId,
    resource: input.resourceId ?? input.resource ?? input.permission,
    details: {
      permission: input.permission,
      result: input.result,
      risk: input.risk ?? permissionRisk(input.permission),
      resource: input.resource,
      resourceId: input.resourceId,
      reason: input.reason,
    },
  })
}

export function canUsePermission(ctx: Pick<RbacContext, "permissions">, permission: string) {
  return hasRbacPermission(ctx.permissions, permission)
}

export function canUseAnyPermission(ctx: Pick<RbacContext, "permissions">, permissions: readonly string[]) {
  return hasAnyRbacPermission(ctx.permissions, permissions)
}

export function canUseAllPermissions(ctx: Pick<RbacContext, "permissions">, permissions: readonly string[]) {
  return hasAllRbacPermissions(ctx.permissions, permissions)
}

export async function requirePermission(
  permission: string,
  options?: { resource?: string; resourceId?: string; auditAllowed?: boolean },
) {
  const ctx = await requireRbacContext()
  const risk = permissionRisk(permission)

  if (!isKnownPermission(permission)) {
    await auditRbacDecision({
      ctx,
      permission,
      result: "denied",
      risk,
      resource: options?.resource,
      resourceId: options?.resourceId,
      reason: "Unknown permission",
    })
    throw new RbacError(`Forbidden: unknown permission ${permission}`, "FORBIDDEN", 403)
  }

  if (!canUsePermission(ctx, permission)) {
    await auditRbacDecision({
      ctx,
      permission,
      result: "denied",
      risk,
      resource: options?.resource,
      resourceId: options?.resourceId,
      reason: "Missing permission",
    })
    throw new RbacError(`Forbidden: missing permission ${permission}`, "FORBIDDEN", 403)
  }

  if (options?.auditAllowed || risk === "high" || risk === "crit") {
    await auditRbacDecision({
      ctx,
      permission,
      result: "allowed",
      risk,
      resource: options?.resource,
      resourceId: options?.resourceId,
    })
  }

  return ctx
}

export async function requireAnyPermission(
  permissions: readonly string[],
  options?: { resource?: string; resourceId?: string },
) {
  const ctx = await requireRbacContext()
  const unknownPermissions = permissions.filter((permission) => !isKnownPermission(permission))
  if (unknownPermissions.length) {
    await auditRbacDecision({
      ctx,
      permission: permissions.join("|"),
      result: "denied",
      risk: "high",
      resource: options?.resource,
      resourceId: options?.resourceId,
      reason: `Unknown permission: ${unknownPermissions.join(", ")}`,
    })
    throw new RbacError(`Forbidden: unknown permission ${unknownPermissions.join(", ")}`, "FORBIDDEN", 403)
  }

  if (!canUseAnyPermission(ctx, permissions)) {
    await auditRbacDecision({
      ctx,
      permission: permissions.join("|"),
      result: "denied",
      risk: "high",
      resource: options?.resource,
      resourceId: options?.resourceId,
      reason: "Missing any required permission",
    })
    throw new RbacError(`Forbidden: missing one of ${permissions.join(", ")}`, "FORBIDDEN", 403)
  }
  return ctx
}

export async function requireAllPermissions(
  permissions: readonly string[],
  options?: { resource?: string; resourceId?: string },
) {
  const ctx = await requireRbacContext()
  const unknownPermissions = permissions.filter((permission) => !isKnownPermission(permission))
  if (unknownPermissions.length) {
    await auditRbacDecision({
      ctx,
      permission: permissions.join("&"),
      result: "denied",
      risk: "high",
      resource: options?.resource,
      resourceId: options?.resourceId,
      reason: `Unknown permission: ${unknownPermissions.join(", ")}`,
    })
    throw new RbacError(`Forbidden: unknown permission ${unknownPermissions.join(", ")}`, "FORBIDDEN", 403)
  }

  if (!canUseAllPermissions(ctx, permissions)) {
    await auditRbacDecision({
      ctx,
      permission: permissions.join("&"),
      result: "denied",
      risk: "high",
      resource: options?.resource,
      resourceId: options?.resourceId,
      reason: "Missing all required permissions",
    })
    throw new RbacError(`Forbidden: missing required permissions ${permissions.join(", ")}`, "FORBIDDEN", 403)
  }
  return ctx
}

export async function assertCanUseOrganization(ctx: RbacContext, organizationId: string) {
  if (organizationId === ctx.orgId) return true
  await auditRbacDecision({
    ctx,
    permission: "system.organization.read",
    result: "denied",
    risk: "crit",
    resource: "Organization",
    resourceId: organizationId,
    reason: "Cross-organization access denied",
  })
  throw new RbacError("Forbidden: cannot access another organization", "FORBIDDEN", 403)
}

export function isRbacError(error: unknown): error is RbacError {
  return error instanceof RbacError
}
