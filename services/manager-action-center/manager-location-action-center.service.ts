import "server-only"

import { ForbiddenError } from "@/services/_shared/action-errors"
import type { AllowedOperatingAccessScope } from "@/services/operating-access/operating-access-scope-contracts"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import { buildBusinessSignalsFromSnapshots } from "@/services/signals/business-signal-rules.service"
import { getBranchOperatingSnapshot } from "@/services/snapshots/branch-operating-snapshot.service"
import { normalizeSnapshotScope } from "@/services/snapshots/snapshot-utils"

import type { ManagerLocationActionCenterData } from "./manager-location-action-center-contracts"
import type { ManagerActionCenterQueryInput } from "./manager-action-center-query-contracts"

export async function getManagerLocationActionCenterData(
  input: ManagerActionCenterQueryInput,
): Promise<ManagerLocationActionCenterData> {
  const access = await resolveOperatingAccessScope(input.accessContext)
  if (!access.allowed) {
    throw new ForbiddenError(
      "Managed-location action bundles are not available for this account.",
    )
  }

  return getManagerLocationActionCenterDataFromResolvedAccess(input, access)
}

export async function getManagerLocationActionCenterDataFromResolvedAccess(
  input: ManagerActionCenterQueryInput,
  access: AllowedOperatingAccessScope,
): Promise<ManagerLocationActionCenterData> {
  if (
    access.organizationId !== input.accessContext.orgId ||
    access.actorId !== input.accessContext.userId
  ) {
    throw new ForbiddenError("Managed-location scope evidence is inconsistent.")
  }
  if (
    access.scope.kind !== "LOCATIONS" ||
    access.authority.kind !== "LOCATION_RESPONSIBILITY"
  ) {
    throw new ForbiddenError(
      "Managed-location action bundles require location-responsibility access.",
    )
  }

  const managedLocations = access.authority.managedLocations
  const scopedLocationIds = access.scope.locationIds
  const locationIds = managedLocations.map((location) => location.id)
  if (
    locationIds.length !== scopedLocationIds.length ||
    locationIds.some((locationId, index) => locationId !== scopedLocationIds[index])
  ) {
    throw new ForbiddenError("Managed-location scope evidence is inconsistent.")
  }

  const scope = normalizeSnapshotScope({
    organizationId: access.organizationId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    now: input.now,
    maxAgeMinutes: input.maxAgeMinutes,
  })
  const bundles = await Promise.all(
    managedLocations.map(async (location) => {
      const snapshot = await getBranchOperatingSnapshot({
        ...scope,
        locationId: location.id,
      })
      const signals = buildBusinessSignalsFromSnapshots({
        organizationId: access.organizationId,
        snapshots: [snapshot],
        now: scope.now,
      })
      const actionQueue = buildActionQueue({
        organizationId: access.organizationId,
        signals,
        actorPermissions: input.accessContext.permissions,
        now: scope.now,
      })

      return {
        location,
        snapshot,
        actionQueue,
      }
    }),
  )

  return {
    organizationId: access.organizationId,
    actorId: access.actorId,
    generatedAt: scope.now.toISOString(),
    periodStart: scope.periodStart.toISOString(),
    periodEnd: scope.periodEnd.toISOString(),
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
    },
    scope: {
      kind: "LOCATIONS",
      locationIds: [...locationIds],
    },
    bundles,
  }
}
