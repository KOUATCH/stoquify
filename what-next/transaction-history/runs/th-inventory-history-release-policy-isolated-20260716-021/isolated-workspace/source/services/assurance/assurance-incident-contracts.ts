import type {
  EvidenceGrade,
  ProofTrailFreshness,
  ProofTrailRedaction,
  ProofTrailSubjectType,
} from "@/services/evidence/evidence-contracts"

import type {
  WorkflowAssuranceCheckDefinitionContract,
  WorkflowAssuranceCheckResult,
  WorkflowAssuranceEvidenceLink,
  WorkflowAssuranceResultStatus,
  WorkflowAssuranceSeverity,
  WorkflowAssuranceWorkflow,
} from "./assurance-registry-contracts"

export const WORKFLOW_ASSURANCE_INCIDENT_STATUSES = [
  "open",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
  "waived",
  "suppressed",
  "reopened",
  "closed",
] as const

export const WORKFLOW_ASSURANCE_INCIDENT_EVENT_TYPES = [
  "created",
  "duplicate_detected",
  "severity_changed",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
  "waiver_requested",
  "waiver_approved",
  "waiver_rejected",
  "suppressed",
  "reopened",
  "closed",
  "alert_recorded",
] as const

export const WORKFLOW_ASSURANCE_ALERT_CHANNELS = ["in_app", "email", "webhook", "sms", "task_queue"] as const
export const WORKFLOW_ASSURANCE_ALERT_DELIVERY_STATUSES = [
  "pending",
  "delivered",
  "skipped",
  "failed",
  "suppressed",
] as const
export const WORKFLOW_ASSURANCE_WAIVER_STATUSES = ["requested", "approved", "rejected", "expired", "revoked"] as const

export type WorkflowAssuranceIncidentStatus = (typeof WORKFLOW_ASSURANCE_INCIDENT_STATUSES)[number]
export type WorkflowAssuranceIncidentEventType = (typeof WORKFLOW_ASSURANCE_INCIDENT_EVENT_TYPES)[number]
export type WorkflowAssuranceAlertChannel = (typeof WORKFLOW_ASSURANCE_ALERT_CHANNELS)[number]
export type WorkflowAssuranceAlertDeliveryStatus = (typeof WORKFLOW_ASSURANCE_ALERT_DELIVERY_STATUSES)[number]
export type WorkflowAssuranceWaiverStatus = (typeof WORKFLOW_ASSURANCE_WAIVER_STATUSES)[number]

export type WorkflowAssuranceIncidentSource = {
  organizationId: string
  definitionId: string
  checkRunId?: string | null
  definition: WorkflowAssuranceCheckDefinitionContract
  result: WorkflowAssuranceCheckResult
  actorId?: string | null
}

export type WorkflowAssuranceIncidentProofSubject = {
  subjectType: ProofTrailSubjectType
  subjectId: string
  available: boolean
}

export type WorkflowAssuranceIncidentProofSummary = {
  evidenceGrade: EvidenceGrade
  sourceHash: string
  freshness: ProofTrailFreshness
  proofSubject: WorkflowAssuranceIncidentProofSubject | null
  blockerReason?: string
  actionRoute: string
}

export type WorkflowAssuranceIncidentDto = {
  id: string
  organizationId: string
  checkKey: string
  workflow: WorkflowAssuranceWorkflow
  moduleSlug: string
  sourceType: string
  sourceId: string
  sourceLabel: string
  sourceHash: string
  fingerprint: string
  title: string
  detail: string
  severity: WorkflowAssuranceSeverity
  status: WorkflowAssuranceIncidentStatus
  evidenceGrade: EvidenceGrade
  actionRoute: string
  ownerId: string | null
  assignedRole: string | null
  dueAt: string | null
  occurrenceCount: number
  firstDetectedAt: string
  lastDetectedAt: string
  resolvedAt: string | null
  reopenedAt: string | null
  suppressedAt: string | null
  metadata: Record<string, unknown>
  sourceLinks: WorkflowAssuranceEvidenceLink[]
  proofSubject: WorkflowAssuranceIncidentProofSubject | null
  proofSummary: WorkflowAssuranceIncidentProofSummary
  redactions: ProofTrailRedaction[]
}

export type WorkflowAssuranceIncidentTransitionInput = {
  organizationId: string
  incidentId: string
  actorId?: string | null
  note?: string
  metadata?: Record<string, unknown>
}

export type AssignWorkflowAssuranceIncidentInput = WorkflowAssuranceIncidentTransitionInput & {
  ownerId: string
  assignedRole?: string
  dueAt?: Date | null
}

export type SuppressWorkflowAssuranceIncidentInput = WorkflowAssuranceIncidentTransitionInput & {
  reason: string
  suppressedUntil?: Date | null
}

export type RequestWorkflowAssuranceWaiverInput = WorkflowAssuranceIncidentTransitionInput & {
  reason: string
  evidenceHash: string
  expiresAt: Date
}

export type ApproveWorkflowAssuranceWaiverInput = {
  organizationId: string
  waiverId: string
  actorId?: string | null
  note?: string
}

export type WorkflowAssuranceWaiverDto = {
  id: string
  incidentId: string
  status: WorkflowAssuranceWaiverStatus
  requesterId: string
  approverId: string | null
  reason: string
  evidenceHash: string
  expiresAt: string
  requestedAt: string
  approvedAt: string | null
}

const INCIDENT_RESULT_STATUSES = new Set<WorkflowAssuranceResultStatus>(["warning", "failed", "blocked", "error"])

export function shouldCreateIncidentForResult(status: WorkflowAssuranceResultStatus) {
  return INCIDENT_RESULT_STATUSES.has(status)
}

export function evidenceGradeForIncident(status: WorkflowAssuranceResultStatus): EvidenceGrade {
  return status === "warning" ? "operational" : "blocked"
}

export function titleForIncident(definition: WorkflowAssuranceCheckDefinitionContract) {
  return definition.invariantName
}

export function detailForIncident(result: WorkflowAssuranceCheckResult) {
  return result.message
}
