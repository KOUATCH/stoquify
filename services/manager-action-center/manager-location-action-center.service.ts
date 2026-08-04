import "server-only"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"
import type { AllowedOperatingAccessScope } from "@/services/operating-access/operating-access-scope-contracts"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import { buildBusinessSignalsFromSnapshots } from "@/services/signals/business-signal-rules.service"
import { getBranchOperatingSnapshot } from "@/services/snapshots/branch-operating-snapshot.service"
import { getInventoryLossSnapshot } from "@/services/snapshots/inventory-loss-snapshot.service"
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
  const inventoryLossAllowed = await canLoadManagedLocationInventoryLoss({
    organizationId: access.organizationId,
    actorId: access.actorId,
    actorPermissions: input.accessContext.permissions,
    now: scope.now,
  })
  const bundles = await Promise.all(
    managedLocations.map(async (location) => {
      const [snapshot, inventoryLoss] = await Promise.all([
        getBranchOperatingSnapshot({
          ...scope,
          locationId: location.id,
        }),
        inventoryLossAllowed
          ? getInventoryLossSnapshot({
              ...scope,
              locationId: location.id,
            })
          : Promise.resolve(null),
      ])
      const signals = buildBusinessSignalsFromSnapshots({
        organizationId: access.organizationId,
        snapshots: [
          snapshot,
          ...(inventoryLoss ? [inventoryLoss] : []),
        ],
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

async function canLoadManagedLocationInventoryLoss(input: {
  organizationId: string
  actorId: string
  actorPermissions: readonly string[]
  now: Date
}) {
  if (!hasRbacPermission(input.actorPermissions, "inventory.levels.read")) return false

  const access = await observeModuleAccess({
    organizationId: input.organizationId,
    userId: input.actorId,
    actorPermissions: input.actorPermissions,
    moduleSlug: "inventory",
    surfaceType: "page",
    surface: "manager-location-action-center.inventory-loss",
    accessIntent: "read",
    mode: "enforce",
    audit: true,
    now: input.now,
  })

  return access.allowed
}
