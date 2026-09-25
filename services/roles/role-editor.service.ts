import "server-only"
import { permissionCategories } from "@/config/permissions"
import { hasRbacPermission, permissionRisk } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { canChangeRolePermissions, canGrantRolePermission } from "./role-permission-policy"

export async function getRoleEditorForOrganization(ctx: { orgId: string; userId: string; permissions: string[] }, id?: string) {
  if (!hasRbacPermission(ctx.permissions, id ? "roles.update" : "roles.create")) throw new ForbiddenError()
  const actor = await db.user.findFirst({ where: { id: ctx.userId, organizationId: ctx.orgId, isActive: true, organization: { isActive: true, deletedAt: null }, OR: [{ isVerified: true }, { emailVerified: true }], AND: [{ OR: [{ isLocked: false }, { lockedUntil: { lte: new Date() } }] }] }, select: { roles: { where: { organizationId: ctx.orgId }, select: { permissions: true } } } })
  if (!actor) throw new ForbiddenError()
  const storedPermissions = actor.roles.flatMap(role => role.permissions)
  if (!hasRbacPermission(storedPermissions, id ? "roles.update" : "roles.create")) throw new ForbiddenError()
  const role = id ? await db.role.findFirst({ where: { id, organizationId: ctx.orgId } }) : null
  if (id && !role) throw new NotFoundError("Role not found.")
  const canReadHistory = hasRbacPermission(storedPermissions, "controls.audit.read")
  const history = id && canReadHistory ? await db.auditLog.findMany({ where: { organizationId: ctx.orgId, entityType: "Role", entityId: id, action: "ROLE_CHANGED" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10, select: { id: true, createdAt: true, changes: true } }) : []
  return {
    organizationId: ctx.orgId, role, checkedAt: new Date().toISOString(),
    canReadHistory,
    history: history.map(record => {
      const change = record.changes as { operation?: string; delta?: { added?: unknown; removed?: unknown } } | null
      return { id: record.id, createdAt: record.createdAt.toISOString(), operation: change?.operation === "role.create" ? "create" as const : change?.operation === "role.update" ? "update" as const : "change" as const, added: Array.isArray(change?.delta?.added) ? change.delta.added.filter((value): value is string => typeof value === "string") : null, removed: Array.isArray(change?.delta?.removed) ? change.delta.removed.filter((value): value is string => typeof value === "string") : null }
    }),
    canRemove: canChangeRolePermissions(storedPermissions, "remove"),
    catalogue: Object.entries(permissionCategories).map(([category, permissions]) => ({
      category,
      permissions: [...new Set(permissions)].map(permission => ({
        permission, risk: permissionRisk(permission),
        canAdd: canChangeRolePermissions(storedPermissions, "assign") && canGrantRolePermission(storedPermissions, permission),
      })),
    })),
  }
}
