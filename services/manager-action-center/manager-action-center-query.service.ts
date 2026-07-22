import "server-only"

import { ForbiddenError } from "@/services/_shared/action-errors"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"

import type {
  ManagerActionCenterQueryInput,
  ManagerActionCenterQueryResult,
} from "./manager-action-center-query-contracts"
import { getManagerActionCenterDataFromResolvedAccess } from "./manager-action-center.service"
import { getManagerLocationActionCenterDataFromResolvedAccess } from "./manager-location-action-center.service"

export async function getManagerActionCenterQuery(
  input: ManagerActionCenterQueryInput,
): Promise<ManagerActionCenterQueryResult> {
  const access = await resolveOperatingAccessScope(input.accessContext)
  if (!access.allowed) {
    throw new ForbiddenError("Manager Action Center is not available for this account.")
  }
  if (
    access.organizationId !== input.accessContext.orgId ||
    access.actorId !== input.accessContext.userId
  ) {
    throw new ForbiddenError("Manager Action Center operating scope evidence is inconsistent.")
  }

  if (
    access.scope.kind === "TENANT" &&
    access.authority.kind === "TENANT_WIDE"
  ) {
    const data = await getManagerActionCenterDataFromResolvedAccess(input, access)
    return {
      kind: "TENANT",
      organizationId: access.organizationId,
      actorId: access.actorId,
      data,
    }
  }

  if (
    access.scope.kind === "LOCATIONS" &&
    access.authority.kind === "LOCATION_RESPONSIBILITY"
  ) {
    const data = await getManagerLocationActionCenterDataFromResolvedAccess(
      input,
      access,
    )
    return {
      kind: "LOCATIONS",
      organizationId: access.organizationId,
      actorId: access.actorId,
      data,
    }
  }

  throw new ForbiddenError(
    "Manager Action Center operating scope evidence is inconsistent.",
  )
}
