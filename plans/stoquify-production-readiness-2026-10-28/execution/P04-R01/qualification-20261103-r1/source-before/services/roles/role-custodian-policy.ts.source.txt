import { canChangeRolePermissions, canGrantRolePermission } from "./role-permission-policy"

export type CustodianAccount = {
  isActive: boolean; isVerified: boolean; emailVerified: boolean
  isLocked: boolean; lockedUntil: Date | null
}

export function isUsableAccount(user: CustodianAccount, now: Date) {
  return user.isActive && (user.isVerified || user.emailVerified)
    && !(user.isLocked && (!user.lockedUntil || user.lockedUntil > now))
}

// Role editing and member deactivation must preserve the same recovery authority.
export function isRoleCustodian(user: CustodianAccount, permissions: string[], now: Date) {
  return isUsableAccount(user, now)
    && ["roles.read", "roles.create", "roles.update", "roles.permissions.assign", "roles.permissions.remove", "users.invite", "users.roles.assign"]
      .every(permission => canGrantRolePermission(permissions, permission))
    && canChangeRolePermissions(permissions, "assign") && canChangeRolePermissions(permissions, "remove")
}
