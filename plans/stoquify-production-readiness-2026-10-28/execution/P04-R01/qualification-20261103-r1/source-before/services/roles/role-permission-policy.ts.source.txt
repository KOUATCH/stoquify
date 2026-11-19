import { hasRbacPermission, permissionCandidates } from "@/lib/security/rbac-permissions"

const roleControls = ["users.roles.assign", "users.roles.remove", "users.activate", "admin.role.assign", "roles.permissions.assign", "roles.permissions.remove"] as const
const controlMeanings = (permission: string) => roleControls.filter(required => permission === required || (!permission.includes(".") && permission !== "*" && hasRbacPermission([permission], required)))

export const isRoleControlPermission = (permission: string) => controlMeanings(permission).length > 0

function hasStoredControl(storedPermissions: readonly string[], required: string) {
  // A shared alias is authority only when it was actually stored. Expanding a
  // different canonical operation first would manufacture that legacy grant.
  return storedPermissions.includes(required) || permissionCandidates(required).some(candidate =>
    !candidate.includes(".") && candidate !== "*" && storedPermissions.includes(candidate),
  )
}

// Use stored grants, not expanded RBAC claims: both canonical operations share
// historical aliases, and expansion loses which operation was actually assigned.
export function canChangeRolePermissions(storedPermissions: readonly string[], operation: "assign" | "remove") {
  const required = "roles.permissions." + operation
  return hasStoredControl(storedPermissions, required)
}

export function canGrantRolePermission(storedPermissions: readonly string[], permission: string) {
  const controls = controlMeanings(permission)
  if (controls.length) return controls.every(required => hasStoredControl(storedPermissions, required))
  return hasRbacPermission(storedPermissions, permission)
}
