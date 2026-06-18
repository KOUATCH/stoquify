import { db } from "@/prisma/db"
import { ForbiddenError, NotFoundError } from "./action-errors"
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

  const organization = await db.organization.findFirst({
    where: {
      id: requestedOrgId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!organization) {
    throw new NotFoundError("Organization not found or inactive")
  }

  return organization.id
}
