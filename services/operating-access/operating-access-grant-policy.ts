import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { OPERATING_ACCESS_REQUIRED_PERMISSION, resolveTenantWideOperatingAuthority } from "./operating-access-scope-contracts"

export type OperatingGrantAuthority = { permissions: readonly string[]; roleCodes: readonly string[] }
export type OperatingGrantRole = { code: string; permissions: readonly string[] }

/** Current stored actor roles only; never a client-supplied super-user claim. */
export function hasTenantWideOperatingGrantAuthority(actor: OperatingGrantAuthority) {
  return hasRbacPermission(actor.permissions, OPERATING_ACCESS_REQUIRED_PERMISSION)
    && Boolean(resolveTenantWideOperatingAuthority({ isSuperUser: actor.permissions.includes("*"), roleCodes: actor.roleCodes }))
}

/** Reserved codes carry latent authority even when their permission list is empty. */
export function canGrantOperatingRole(actor: OperatingGrantAuthority, role: Pick<OperatingGrantRole, "code">) {
  if (typeof role.code !== "string" || !role.code.trim()) return false
  return !resolveTenantWideOperatingAuthority({ isSuperUser: false, roleCodes: [role.code] })
    || hasTenantWideOperatingGrantAuthority(actor)
}

export function canChangeOperatingRoleSet(actor: OperatingGrantAuthority, before: readonly OperatingGrantRole[], after: readonly OperatingGrantRole[]) {
  if ([...before, ...after].some(role => typeof role.code !== "string" || !role.code.trim())) return false
  const tenantWide = (roles: readonly OperatingGrantRole[]) => hasTenantWideOperatingGrantAuthority({
    permissions: roles.flatMap(role => [...role.permissions]), roleCodes: roles.map(role => role.code),
  })
  return hasTenantWideOperatingGrantAuthority(actor) || !tenantWide(after) || tenantWide(before)
}
