import type { OperatingManagedLocation } from "@/services/operating-access/operating-access-scope-contracts"
import type { ActionQueueResult } from "@/services/signals/business-signal-contracts"
import type {
  BranchOperatingMetrics,
  SnapshotResult,
} from "@/services/snapshots/snapshot-contracts"

export type ManagerLocationActionBundle = {
  location: OperatingManagedLocation
  snapshot: SnapshotResult<BranchOperatingMetrics>
  actionQueue: ActionQueueResult
}

export type ManagerLocationActionCenterData = {
  organizationId: string
  actorId: string
  generatedAt: string
  periodStart: string
  periodEnd: string
  authority: {
    kind: "LOCATION_RESPONSIBILITY"
    basis: "Location.managerId"
  }
  scope: {
    kind: "LOCATIONS"
    locationIds: string[]
  }
  bundles: ManagerLocationActionBundle[]
}
