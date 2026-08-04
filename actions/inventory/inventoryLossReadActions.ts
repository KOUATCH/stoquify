"use server"

import { protect } from "@/services/_shared/protect"
import { ForbiddenError } from "@/services/_shared/action-errors"
import {
  inventoryLossReadFiltersSchema,
  readInventoryLossSummary,
} from "@/services/inventory/inventory-loss-read.service"
import type { OperatingAccessScopeDecision } from "@/services/operating-access/operating-access-scope-contracts"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"

type ParsedInventoryLossFilters = ReturnType<
  typeof inventoryLossReadFiltersSchema.parse
>

type InventoryLossSummary = Awaited<
  ReturnType<typeof readInventoryLossSummary>
>

export type InventoryLossQueryResult = {
  scope:
    | {
        kind: "TENANT"
        authorizedLocationIds: null
      }
    | {
        kind: "LOCATIONS"
        authorizedLocationIds: string[]
      }
  data: InventoryLossSummary
}

type ResolvedLocationScope = {
  scope: InventoryLossQueryResult["scope"]
  readFilter:
    | { locationId?: undefined; locationIds?: undefined }
    | { locationId: string; locationIds?: undefined }
    | { locationId?: undefined; locationIds: string[] }
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {}
}

function actionPayload(input: unknown) {
  const record = asRecord(input)
  return {
    from: record.from,
    to: record.to,
    locationId: record.locationId,
    itemId: record.itemId,
    approverId: record.approverId,
    detailLimit: record.detailLimit,
    groupLimit: record.groupLimit,
  }
}

function normalizedLocationIds(locationIds: readonly string[]) {
  return Array.from(new Set(locationIds)).sort()
}

function inconsistentScope(): never {
  throw new ForbiddenError(
    "Inventory loss operating scope evidence is inconsistent.",
  )
}

function resolveTrustedLocationScope(
  access: OperatingAccessScopeDecision,
  requestedLocationId?: string,
): ResolvedLocationScope {
  if (!access.allowed) {
    throw new ForbiddenError(
      "Inventory loss summary is not available for this account.",
    )
  }

  if (access.scope.kind === "TENANT") {
    if (access.authority.kind !== "TENANT_WIDE") {
      return inconsistentScope()
    }

    return {
      scope: {
        kind: "TENANT",
        authorizedLocationIds: null,
      },
      readFilter: requestedLocationId
        ? { locationId: requestedLocationId }
        : {},
    }
  }

  if (access.authority.kind !== "LOCATION_RESPONSIBILITY") {
    return inconsistentScope()
  }

  const scopedLocationIds = normalizedLocationIds(
    access.scope.locationIds,
  )
  const authorityLocationIds = normalizedLocationIds(
    access.authority.managedLocations.map((location) => location.id),
  )
  if (
    scopedLocationIds.length === 0 ||
    scopedLocationIds.length !== authorityLocationIds.length ||
    scopedLocationIds.some(
      (locationId, index) =>
        locationId !== authorityLocationIds[index],
    )
  ) {
    return inconsistentScope()
  }

  if (
    requestedLocationId &&
    !scopedLocationIds.includes(requestedLocationId)
  ) {
    throw new ForbiddenError(
      "Inventory loss summary is not available for the requested location.",
    )
  }

  return {
    scope: {
      kind: "LOCATIONS",
      authorizedLocationIds: scopedLocationIds,
    },
    readFilter: requestedLocationId
      ? { locationId: requestedLocationId }
      : { locationIds: scopedLocationIds },
  }
}

function trustedReadInput(
  organizationId: string,
  filters: ParsedInventoryLossFilters,
  locationScope: ResolvedLocationScope,
) {
  return {
    organizationId,
    from: filters.from,
    to: filters.to,
    ...locationScope.readFilter,
    ...(filters.itemId ? { itemId: filters.itemId } : {}),
    ...(filters.approverId
      ? { approverId: filters.approverId }
      : {}),
    detailLimit: filters.detailLimit,
    groupLimit: filters.groupLimit,
  }
}

const readInventoryLoss = protect<unknown, InventoryLossQueryResult>(
  {
    permission: "inventory.levels.read",
    auditResource: "InventoryLossSummary",
    auditAllowed: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "inventory",
      surface: "inventory.loss.summary.read",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const filters = inventoryLossReadFiltersSchema.parse(
      actionPayload(input),
    )
    const access = await resolveOperatingAccessScope(ctx)

    if (
      access.organizationId !== ctx.orgId ||
      access.actorId !== ctx.userId
    ) {
      return inconsistentScope()
    }

    const locationScope = resolveTrustedLocationScope(
      access,
      filters.locationId,
    )
    const data = await readInventoryLossSummary(
      trustedReadInput(ctx.orgId, filters, locationScope),
    )

    return {
      scope: locationScope.scope,
      data,
    }
  },
)

export async function getInventoryLossSummaryAction(
  input: unknown = {},
) {
  return readInventoryLoss(input)
}
