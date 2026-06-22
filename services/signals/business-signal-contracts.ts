import type {
  EvidenceGrade,
  ProofTrailSubjectType,
} from "@/services/evidence/evidence-contracts"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import type {
  SnapshotBlocker,
  SnapshotFreshness,
  SnapshotKind,
  SnapshotRedaction,
  SnapshotSourceModule,
} from "@/services/snapshots/snapshot-contracts"

export const BUSINESS_SIGNAL_TYPES = [
  "cash_drawer_variance",
  "open_payment_suspense",
  "duplicate_provider_reference",
  "refund_void_spike",
  "stockout_risk",
  "dead_stock_cash_exposure",
  "purchase_order_receiving_delay",
  "payroll_exposure",
  "close_blocker",
] as const

export type BusinessSignalType = (typeof BUSINESS_SIGNAL_TYPES)[number]

export type BusinessSignalSeverity = "info" | "low" | "medium" | "high" | "critical"
export type BusinessSignalStatus = "active" | "stale" | "expired" | "resolved" | "dismissed" | "suppressed"
export type ActionItemStatus = "open" | "assigned" | "resolved" | "dismissed" | "expired"
export type ActionItemEventType = "created" | "assigned" | "resolved" | "dismissed" | "expired"
export type BusinessSignalEventType = "created" | "suppressed" | "expired" | "escalated"
export type NotificationChannel = "in_app" | "email" | "digest"

export type SignalOwnerRole =
  | "owner"
  | "accountant"
  | "finance"
  | "stockkeeper"
  | "purchasing"
  | "payroll"
  | "manager"

export type BusinessSignalPayload = Record<
  string,
  string | number | boolean | null | string[] | number[]
>

export type BusinessSignalProofLink = {
  subjectType: ProofTrailSubjectType
  subjectId: string
}

export type BusinessSignal = {
  id: string
  organizationId: string
  moduleSlug: CommercialModuleSlug
  sourceModule: SnapshotSourceModule
  sourceSnapshotKind?: SnapshotKind
  sourceHash?: string | null
  signalType: BusinessSignalType
  title: string
  detail: string
  businessImpact: string
  subjectType: string
  subjectId: string
  evidenceGrade: EvidenceGrade
  severity: BusinessSignalSeverity
  severityScore: number
  status: BusinessSignalStatus
  dedupeKey: string
  generatedAt: string
  expiresAt: string
  freshness: SnapshotFreshness
  suggestedAction: string
  actionPath: string
  requiredPermission: string
  assignedRole: SignalOwnerRole
  assigneeId: string | null
  blockers: SnapshotBlocker[]
  redactions: SnapshotRedaction[]
  payload: BusinessSignalPayload
  proofLink?: BusinessSignalProofLink | null
}

export type BusinessSignalFact = {
  organizationId: string
  signalType: BusinessSignalType
  moduleSlug: CommercialModuleSlug
  sourceModule: SnapshotSourceModule
  subjectType: string
  subjectId: string
  title?: string
  detail?: string
  businessImpact?: string
  evidenceGrade?: EvidenceGrade
  severity?: BusinessSignalSeverity
  severityScore?: number
  generatedAt?: Date | string | null
  expiresAt?: Date | string | null
  expiresInHours?: number | null
  freshness?: Partial<SnapshotFreshness>
  suggestedAction?: string
  actionPath?: string
  requiredPermission?: string
  assignedRole?: SignalOwnerRole
  assigneeId?: string | null
  blockers?: SnapshotBlocker[]
  redactions?: SnapshotRedaction[]
  payload?: BusinessSignalPayload
  proofLink?: BusinessSignalProofLink | null
  dedupeScope?: string | null
}

export type BusinessSignalEvent = {
  id: string
  organizationId: string
  signalId: string
  eventType: BusinessSignalEventType
  actorId: string | null
  occurredAt: string
  metadata: Record<string, unknown>
}

export type ActionItem = {
  id: string
  organizationId: string
  signalId: string
  signalType: BusinessSignalType
  title: string
  nextStep: string
  actionPath: string
  requiredPermission: string
  status: ActionItemStatus
  severity: BusinessSignalSeverity
  severityScore: number
  assignedRole: SignalOwnerRole
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  dueAt: string
  resolvedAt: string | null
  dismissedAt: string | null
  evidenceGrade: EvidenceGrade
  redactions: SnapshotRedaction[]
  blockers: SnapshotBlocker[]
}

export type ActionItemEvent = {
  id: string
  organizationId: string
  actionItemId: string
  signalId: string
  eventType: ActionItemEventType
  actorId: string | null
  occurredAt: string
  metadata: Record<string, unknown>
}

export type AssignmentCandidate = {
  userId: string
  organizationId: string
  displayName: string
  permissions: readonly string[]
  active?: boolean
}

export type ActionQueueSummary = {
  total: number
  open: number
  assigned: number
  stale: number
  expired: number
  redacted: number
  bySeverity: Record<BusinessSignalSeverity, number>
  byRole: Partial<Record<SignalOwnerRole, number>>
}

export type ActionQueueResult = {
  organizationId: string
  generatedAt: string
  signals: BusinessSignal[]
  actionItems: ActionItem[]
  filteredOutCount: number
  summary: ActionQueueSummary
}

export type NotificationPreference = {
  organizationId: string
  userId: string
  channels: NotificationChannel[]
  enabledSignalTypes: BusinessSignalType[]
  minimumSeverity: BusinessSignalSeverity
  digestOnly?: boolean
  quietHours?: {
    startHour: number
    endHour: number
    timezone?: string
  } | null
}
