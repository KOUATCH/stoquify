import { createHash } from "node:crypto"
import type { Role } from "@prisma/client"
import { permissionCandidates } from "@/lib/security/rbac-permissions"
import { canGrantRolePermission } from "@/services/roles/role-permission-policy"
import type { CustodianAccount } from "@/services/roles/role-custodian-policy"

export type AccessMember = CustodianAccount & { id: string; email: string; firstName: string | null; lastName: string | null; updatedAt: Date }
export type AccessMembership = { roleId: string; userId: string }
export const accessDigest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")

export function hasMemberControl(permissions: readonly string[], operation: "assign" | "remove" | "activate") {
  const required = operation === "activate" ? "users.activate" : "users.roles." + operation
  return permissions.includes(required) || permissionCandidates(required).some(value => !value.includes(".") && value !== "*" && permissions.includes(value))
}

export function canGrantMemberRole(permissions: readonly string[], role: Pick<Role, "permissions">) {
  const stored = permissions.filter(value => value !== "*")
  return hasMemberControl(stored, "assign") && role.permissions.every(value => value !== "*" && canGrantRolePermission(stored, value))
}

export function memberAccessRevision(member: AccessMember, roleIds: string[], roles: Role[]) {
  return accessDigest({ member: { id: member.id, email: member.email, firstName: member.firstName, lastName: member.lastName, updatedAt: member.updatedAt.toISOString(), isActive: member.isActive, isVerified: member.isVerified, emailVerified: member.emailVerified, isLocked: member.isLocked, lockedUntil: member.lockedUntil?.toISOString() ?? null }, roleIds: [...roleIds].sort(), roles: roles.map(role => ({ id: role.id, updatedAt: role.updatedAt.toISOString(), permissions: [...role.permissions].sort() })).sort((a, b) => a.id.localeCompare(b.id)) })
}

export function hasRecordedDeactivation(member: AccessMember, record: { entityId: string; changes: unknown } | null) {
  const changes = record?.changes as { after?: { isActive?: boolean; isLocked?: boolean }; receipt?: { id?: string; updatedAt?: string } } | null
  return !member.isActive && member.isLocked && !member.lockedUntil && (member.isVerified || member.emailVerified) && record?.entityId === member.id && changes?.after?.isActive === false && changes.after.isLocked === true && changes.receipt?.id === member.id && changes.receipt.updatedAt === member.updatedAt.toISOString()
}
