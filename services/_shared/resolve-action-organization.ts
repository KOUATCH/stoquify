import { ForbiddenError } from "./action-errors"
import { assertActiveOrganization } from "./assert-active-organization"
import { requireOrg } from "./require-org"

export async function resolveActionOrganization(explicitOrgId?: string | null, resourceName = "resources") {
  const { user, orgId } = await requireOrg()
  const requestedOrgId = explicitOrgId?.trim()

  if (!requestedOrgId || requestedOrgId === orgId) {
    return orgId
  }

  if (!user.permissions?.includes("*")) {
    throw new ForbiddenError(`You cannot access ${resourceName} for another organization`)
  }

  return assertActiveOrganization(requestedOrgId)
}
