import { ForbiddenError } from "./action-errors"
import { requireOrg } from "./require-org"

export async function resolveActionOrganization(explicitOrgId?: string | null, resourceName = "resources") {
  const { orgId } = await requireOrg()
  const requestedOrgId = explicitOrgId?.trim()

  if (!requestedOrgId || requestedOrgId === orgId) {
    return orgId
  }

  throw new ForbiddenError(`You cannot access ${resourceName} for another organization`)
}
