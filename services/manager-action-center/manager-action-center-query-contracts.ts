import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"
import type { SnapshotScopeInput } from "@/services/snapshots/snapshot-contracts"

import type { ManagerActionCenterData } from "./manager-action-center-contracts"
import type { ManagerLocationActionCenterData } from "./manager-location-action-center-contracts"

export type ManagerActionCenterQueryInput = Omit<
  SnapshotScopeInput,
  "organizationId" | "locationId"
> & {
  accessContext: OperatingAccessContext
}

export type ManagerActionCenterTenantQueryResult = {
  kind: "TENANT"
  organizationId: string
  actorId: string
  data: ManagerActionCenterData
}

export type ManagerActionCenterLocationsQueryResult = {
  kind: "LOCATIONS"
  organizationId: string
  actorId: string
  data: ManagerLocationActionCenterData
}

export type ManagerActionCenterQueryResult =
  | ManagerActionCenterTenantQueryResult
  | ManagerActionCenterLocationsQueryResult
