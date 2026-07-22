import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"

export type BranchDailyCloseSignOffStateInput = {
  accessContext: OperatingAccessContext
  locationId: string
  businessDate: string
  now?: Date | string | null
}

export type BranchDailyCloseSignOffState =
  | "NOT_STARTED"
  | "BLOCKED"
  | "AWAITING_SIGN_OFF"
  | "SIGNED"

export type BranchDailyCloseReviewStateRecord = Readonly<{
  id: string
  status: "IN_REVIEW" | "BLOCKED"
  readinessState:
    | "READY_FOR_REVIEW"
    | "ACTION_REQUIRED"
    | "NO_ACTIVITY"
    | "UNAVAILABLE"
  evidenceCoverageState: "PARTIAL" | "COMPLETE"
  supportedItemCount: number
  unsupportedItemCount: number
  blockerCount: number
  evidenceObservedAt: string
  readinessSourceHash: string
  evidenceHash: string
  startedById: string
  startedAt: string
}>

export type BranchDailyCloseActiveSignOffStateRecord = Readonly<{
  id: string
  status: "ACTIVE"
  signedReadinessSourceHash: string
  signedEvidenceHash: string
  signedEvidenceObservedAt: string
  signedById: string
  signedAt: string
  authAssuranceLevel: "L1"
  freshAuthAt: string
}>

export type BranchDailyCloseSignOffHistorySummary = Readonly<{
  totalCount: number
  activeCount: 0 | 1
  revokedCount: number
  supersededCount: number
  terminalCount: number
  latestTerminalAt: string | null
}>

export type BranchDailyCloseSignOffStateResult = Readonly<{
  kind: "BRANCH_DAILY_CLOSE_SIGN_OFF_STATE"
  organizationId: string
  actorId: string
  generatedAt: string
  businessDate: string
  authority:
    | {
        kind: "TENANT_WIDE"
        basis: "RBAC_SUPER_USER" | "RBAC_ROLE"
      }
    | {
        kind: "LOCATION_RESPONSIBILITY"
        basis: "Location.managerId"
      }
  scope: {
    kind: "LOCATION"
    locationId: string
  }
  location: {
    id: string
    name: string
    code: string
  }
  state: BranchDailyCloseSignOffState
  review: BranchDailyCloseReviewStateRecord | null
  signOff: BranchDailyCloseActiveSignOffStateRecord | null
  history: BranchDailyCloseSignOffHistorySummary
  controls: {
    projectionPurpose: "SIGN_OFF_STATE_ONLY"
    preSignReadinessSourceHashIncludesSignOff: false
    readinessPromoted: false
    finalCloseClaimed: false
  }
  projectionHash: string
}>
