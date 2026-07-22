import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"

export const BRANCH_DAILY_CLOSE_SIGN_OFF_STATUSES = [
  "ACTIVE",
  "REVOKED",
  "SUPERSEDED",
] as const

export type BranchDailyCloseSignOffStatus =
  (typeof BRANCH_DAILY_CLOSE_SIGN_OFF_STATUSES)[number]

export const BRANCH_DAILY_CLOSE_SIGN_OFF_PERSISTENCE = {
  tableName: "branch_daily_close_sign_offs",
  requiredAssurance: "L1",
  freshAuthMaxAgeSeconds: 300,
  hashPrefix: "sha256:",
  hashLength: 71,
  idempotencyKeyMaxLength: 200,
  correlationIdMaxLength: 200,
  invalidationReasonMaxLength: 500,
  activeKeyStrategy: "BRANCH_DAILY_CLOSE_RUN_ID",
  immutableEvidenceFields: [
    "organizationId",
    "branchDailyCloseRunId",
    "signedReadinessSourceHash",
    "signedEvidenceHash",
    "signedEvidenceObservedAt",
    "signedById",
    "signedAt",
    "authAssuranceLevel",
    "freshAuthAt",
    "idempotencyKey",
    "requestHash",
    "correlationId",
  ],
  terminalStatuses: ["REVOKED", "SUPERSEDED"],
} as const

export type BranchDailyCloseSignOffPersistenceContract =
  typeof BRANCH_DAILY_CLOSE_SIGN_OFF_PERSISTENCE

export type BranchDailyCloseSignOffPersistenceRecord = Readonly<{
  id: string
  organizationId: string
  branchDailyCloseRunId: string
  status: BranchDailyCloseSignOffStatus
  activeKey: string | null
  signedReadinessSourceHash: string
  signedEvidenceHash: string
  signedEvidenceObservedAt: string
  signedById: string
  signedAt: string
  authAssuranceLevel: "L1"
  freshAuthAt: string
  invalidatedById: string | null
  invalidatedAt: string | null
  invalidationReason: string | null
  supersedesSignOffId: string | null
  idempotencyKey: string
  requestHash: string
  correlationId: string
  createdAt: string
  updatedAt: string
}>

export type SignBranchDailyCloseInput = {
  accessContext: OperatingAccessContext
  actorId: string
  locationId: string
  businessDate: string
  idempotencyKey: string
  correlationId?: string | null
  lastAuthAt: Date | string | number | null
  now?: Date | string | number | null
  maxAgeMinutes?: number | null
}

export type BranchDailyCloseSignOffCommandRecord = Readonly<{
  id: string
  organizationId: string
  branchDailyCloseRunId: string
  status: "ACTIVE"
  signedReadinessSourceHash: string
  signedEvidenceHash: string
  signedEvidenceObservedAt: string
  signedById: string
  signedAt: string
  authAssuranceLevel: "L1"
  freshAuthAt: string
  idempotencyKey: string
  correlationId: string
  createdAt: string
  updatedAt: string
}>

export type SignBranchDailyCloseResult = {
  kind: "BRANCH_DAILY_CLOSE_SIGN_OFF"
  created: boolean
  replayed: boolean
  signOff: BranchDailyCloseSignOffCommandRecord
}

export function isBranchDailyCloseSignOffStatus(
  value: unknown,
): value is BranchDailyCloseSignOffStatus {
  return (
    typeof value === "string" &&
    BRANCH_DAILY_CLOSE_SIGN_OFF_STATUSES.includes(
      value as BranchDailyCloseSignOffStatus,
    )
  )
}
