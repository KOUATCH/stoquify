import { requirePermission, type RbacContext } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"

export const ROLE_ACTION_PERMISSIONS = {
  read: "roles.read",
  create: "roles.create",
  update: "roles.update",
  assignPermissions: "roles.permissions.assign",
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

export function assertCanAssignPermissions(ctx: AuthedRoleContext, requestedPermissions?: string[] | null) {
  if (!requestedPermissions?.length || ctx.isSuperUser) return

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
