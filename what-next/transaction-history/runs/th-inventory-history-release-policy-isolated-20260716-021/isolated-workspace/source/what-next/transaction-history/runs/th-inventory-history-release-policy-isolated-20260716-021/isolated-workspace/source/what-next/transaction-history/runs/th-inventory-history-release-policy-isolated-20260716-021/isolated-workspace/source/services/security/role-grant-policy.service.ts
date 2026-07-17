import {
  hasRbacPermission,
  permissionRisk,
  type PermissionRisk,
} from "@/lib/security/rbac-permissions"

export const INVITATION_ROLE_GRANT_PERMISSIONS = [
  "users.invite",
  "users.roles.assign",
] as const

export type RoleGrantPolicyReasonCode =
  | "GRANT_AUTHORITY_CONFIRMED"
  | "ROLE_GRANT_ALLOWED"
  | "MISSING_GRANT_AUTHORITY"
  | "CROSS_TENANT_ROLE"
  | "TARGET_ROLE_WILDCARD"
  | "ACTOR_GRANT_CEILING_EXCEEDED"

export type RoleGrantPermissionEvidence = {
  permission: string
  risk: PermissionRisk
}

export type RoleGrantPolicyDecision = {
  allowed: boolean
  reasonCode: RoleGrantPolicyReasonCode
  risk: PermissionRisk
  deniedPermissions: RoleGrantPermissionEvidence[]
  safeMessage: string | null
}

export type RoleGrantPolicyInput = {
  actorOrganizationId: string
  actorPermissions: readonly string[]
  targetRole: {
    organizationId: string
    permissions: readonly string[]
  }
}

const ROLE_GRANT_RISK = permissionRisk("users.roles.assign")

function permissionEvidence(permissions: readonly string[]): RoleGrantPermissionEvidence[] {
  return permissions.map((permission) => ({
    permission,
    risk: permission === "*" ? "crit" : permissionRisk(permission),
  }))
}

export function evaluateRoleGrantAuthority(
  actorPermissions: readonly string[],
): RoleGrantPolicyDecision {
  const missingPermissions = INVITATION_ROLE_GRANT_PERMISSIONS.filter(
    (permission) => !hasRbacPermission(actorPermissions, permission),
  )

  if (missingPermissions.length > 0) {
    return {
      allowed: false,
      reasonCode: "MISSING_GRANT_AUTHORITY",
      risk: ROLE_GRANT_RISK,
      deniedPermissions: permissionEvidence(missingPermissions),
      safeMessage: "You are not allowed to invite users with roles",
    }
  }

  return {
    allowed: true,
    reasonCode: "GRANT_AUTHORITY_CONFIRMED",
    risk: ROLE_GRANT_RISK,
    deniedPermissions: [],
    safeMessage: null,
  }
}

export function evaluateRoleGrantPolicy(input: RoleGrantPolicyInput): RoleGrantPolicyDecision {
  const authorityDecision = evaluateRoleGrantAuthority(input.actorPermissions)
  if (!authorityDecision.allowed) return authorityDecision

  if (input.targetRole.organizationId !== input.actorOrganizationId) {
    return {
      allowed: false,
      reasonCode: "CROSS_TENANT_ROLE",
      risk: ROLE_GRANT_RISK,
      deniedPermissions: [],
      safeMessage: "Invalid role for this organization",
    }
  }

  if (input.targetRole.permissions.includes("*")) {
    return {
      allowed: false,
      reasonCode: "TARGET_ROLE_WILDCARD",
      risk: ROLE_GRANT_RISK,
      deniedPermissions: permissionEvidence(["*"]),
      safeMessage: "You cannot grant the selected role",
    }
  }

  const explicitActorPermissions = input.actorPermissions.filter(
    (permission) => permission !== "*",
  )
  const ungrantablePermissions = input.targetRole.permissions.filter(
    (permission) => !hasRbacPermission(explicitActorPermissions, permission),
  )

  if (ungrantablePermissions.length > 0) {
    return {
      allowed: false,
      reasonCode: "ACTOR_GRANT_CEILING_EXCEEDED",
      risk: ROLE_GRANT_RISK,
      deniedPermissions: permissionEvidence(ungrantablePermissions),
      safeMessage: "You cannot grant the selected role",
    }
  }

  return {
    allowed: true,
    reasonCode: "ROLE_GRANT_ALLOWED",
    risk: ROLE_GRANT_RISK,
    deniedPermissions: [],
    safeMessage: null,
  }
}
