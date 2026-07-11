import { ForbiddenError } from "./action-errors"
import { assertActiveOrganization } from "./assert-active-organization"
import { requireOrg } from "./require-org"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"

export const CROSS_ORG_ACTION_PERMISSION = "system.organization.update"

export function canResolveCrossOrganization(permissions: readonly string[] | null | undefined) {
  return hasRbacPermission(permissions, CROSS_ORG_ACTION_PERMISSION)
}

export async function resolveActionOrganization(explicitOrgId?: string | null, resourceName = "resources") {
  const { user, orgId } = await requireOrg()
  const requestedOrgId = explicitOrgId?.trim()

  if (!requestedOrgId || requestedOrgId === orgId) {
    return orgId
  }

  if (!canResolveCrossOrganization(user.permissions)) {
    throw new ForbiddenError(`You cannot access ${resourceName} for another organization`)
  }

  return assertActiveOrganization(requestedOrgId)
}
