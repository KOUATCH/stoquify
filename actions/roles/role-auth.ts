import { requirePermission, type RbacContext } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"

export const ROLE_ACTION_PERMISSIONS = {
  read: "roles.read",
  create: "roles.create",
  update: "roles.update",
  assignPermissions: "roles.permissions.assign",
  removePermissions: "roles.permissions.remove",
} as const

export const ROLE_AUTH_SURFACE = {
  moduleSlug: "settings",
  permissions: [
    "roles.read",
    "roles.create",
    "roles.update",
    "roles.permissions.assign",
    "roles.permissions.remove",
  ],
} as const

type AuthedRoleContext = Pick<RbacContext, "orgId" | "userId" | "permissions" | "isSuperUser">

export type RoleActionContext = {
  orgId: string
  userId: string
  permissions: string[]
  isSuperUser: boolean
}

export async function requireRoleAction(permission: string): Promise<AuthedRoleContext> {
  const ctx = await requirePermission(permission, { resource: "Role" })
  return ctx
}

export function roleWriteContext(ctx: AuthedRoleContext, claims: { userId: string; tenantId: string; sessionId: string; sessionToken: string }) {
  if (claims.userId !== ctx.userId || claims.tenantId !== ctx.orgId) throw new ForbiddenError("Your organization session changed. Reload before saving.")
  return { ...ctx, session: { id: claims.sessionId, token: claims.sessionToken } }
}

export function assertCanAssignPermissions(ctx: AuthedRoleContext, requestedPermissions?: string[] | null) {
  // An explicit empty selection revokes permissions; it is still an assignment.
  // Tenant wildcard status does not bypass the canonical risk-aware grant ceiling.
  if (requestedPermissions == null) return

  if (!hasRbacPermission(ctx.permissions, ROLE_ACTION_PERMISSIONS.assignPermissions)) {
    throw new ForbiddenError("Forbidden")
  }

  const notGrantable = requestedPermissions.filter(
    (permission) => !hasRbacPermission(ctx.permissions, permission),
  )
  if (notGrantable.length > 0) {
    throw new ForbiddenError("Forbidden")
  }
}
