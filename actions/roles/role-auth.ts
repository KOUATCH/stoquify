import { requirePermission, type RbacContext } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"

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
    throw new Error("Forbidden: missing permission assignment rights")
  }

  const notGrantable = requestedPermissions.filter(
    (permission) => !hasRbacPermission(ctx.permissions, permission),
  )
  if (notGrantable.length > 0) {
    throw new Error(`Forbidden: cannot grant permissions you do not hold: ${notGrantable.join(", ")}`)
  }
}

export async function resolveRoleOrganization(ctx: AuthedRoleContext, explicitOrgId?: string | null) {
  const requestedOrgId = explicitOrgId?.trim()

  if (!requestedOrgId || requestedOrgId === ctx.orgId) {
    return ctx.orgId
  }

  if (!ctx.isSuperUser) {
    throw new Error("Forbidden: cannot manage roles for another organization")
  }

  const organization = await db.organization.findFirst({
    where: {
      id: requestedOrgId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!organization) {
    throw new Error("Organization not found or inactive")
  }

  return organization.id
}
