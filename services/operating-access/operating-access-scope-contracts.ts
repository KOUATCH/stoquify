import type { RbacContext } from "@/lib/security/rbac"

export const OPERATING_ACCESS_REQUIRED_PERMISSION = "dashboard.read" as const

export type OperatingAccessContext = Pick<
  RbacContext,
  "orgId" | "userId" | "roles" | "permissions" | "isSuperUser"
>

export type OperatingManagedLocation = {
  id: string
  name: string
  code: string
}

export type TenantWideOperatingAuthority = {
  kind: "TENANT_WIDE"
  basis: "RBAC_SUPER_USER" | "RBAC_ROLE"
  matchedRoleCode: string | null
}

export type LocationOperatingAuthority = {
  kind: "LOCATION_RESPONSIBILITY"
  basis: "Location.managerId"
  managedLocations: OperatingManagedLocation[]
}

export type OperatingAccessDenialReason =
  | "MISSING_DAILY_TRUTH_PERMISSION"
  | "NO_MANAGED_LOCATIONS"

type OperatingAccessDecisionBase = {
  organizationId: string
  actorId: string
  requiredPermission: typeof OPERATING_ACCESS_REQUIRED_PERMISSION
}

export type AllowedOperatingAccessScope = OperatingAccessDecisionBase & {
  allowed: true
  authority: TenantWideOperatingAuthority | LocationOperatingAuthority
  scope:
    | {
        kind: "TENANT"
        locationIds: null
      }
    | {
        kind: "LOCATIONS"
        locationIds: string[]
      }
}

export type DeniedOperatingAccessScope = OperatingAccessDecisionBase & {
  allowed: false
  authority: {
    kind: "DENIED"
    basis: "RBAC_PERMISSION" | "LOCATION_ASSIGNMENT"
  }
  reason: OperatingAccessDenialReason
  scope: null
}

export type OperatingAccessScopeDecision = AllowedOperatingAccessScope | DeniedOperatingAccessScope
