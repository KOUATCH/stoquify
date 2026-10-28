import "server-only"

import type {
  Prisma,
  WorkflowAssuranceAlertChannel as PrismaAlertChannel,
  WorkflowAssuranceAlertDeliveryStatus as PrismaAlertDeliveryStatus,
  WorkflowAssuranceIncident,
  WorkflowAssuranceIncidentEventType as PrismaIncidentEventType,
  WorkflowAssuranceIncidentStatus as PrismaIncidentStatus,
  WorkflowAssuranceSeverity as PrismaAssuranceSeverity,
  WorkflowAssuranceWaiver,
  WorkflowAssuranceWaiverStatus as PrismaWaiverStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import {
  EVIDENCE_GRADES,
  type EvidenceGrade,
  type ProofTrailRedaction,
  type ProofTrailSubjectType,
} from "@/services/evidence/evidence-contracts"
import { createProofTrailRedaction } from "@/services/evidence/evidence-redaction.service"
import {
  evaluateRedaction,
  maskSensitiveValue,
  type RedactionDecision,
  type SensitiveFieldCategory,
} from "@/services/security/redaction-policy.service"

import type { WorkflowAssuranceEvidenceLink, WorkflowAssuranceSeverity } from "./assurance-registry-contracts"
import {
  detailForIncident,
  evidenceGradeForIncident,
  shouldCreateIncidentForResult,
  titleForIncident,
  type ApproveWorkflowAssuranceWaiverInput,
  type AssignWorkflowAssuranceIncidentInput,
  type RequestWorkflowAssuranceWaiverInput,
  type SuppressWorkflowAssuranceIncidentInput,
  type WorkflowAssuranceIncidentDto,
  type WorkflowAssuranceIncidentEventType,
  type WorkflowAssuranceIncidentProofSubject,
  type WorkflowAssuranceIncidentSource,
  type WorkflowAssuranceIncidentStatus,
  type WorkflowAssuranceIncidentTransitionInput,
  type WorkflowAssuranceWaiverDto,
} from "./assurance-incident-contracts"

const INCIDENT_STATUS_TO_PRISMA = {
  open: "OPEN",
  acknowledged: "ACKNOWLEDGED",
  assigned: "ASSIGNED",
  in_progress: "IN_PROGRESS",
  resolved: "RESOLVED",
  waived: "WAIVED",
  suppressed: "SUPPRESSED",
  reopened: "REOPENED",
  closed: "CLOSED",
} as const satisfies Record<WorkflowAssuranceIncidentStatus, PrismaIncidentStatus>

const INCIDENT_EVENT_TO_PRISMA = {
  created: "CREATED",
  duplicate_detected: "DUPLICATE_DETECTED",
  severity_changed: "SEVERITY_CHANGED",
  acknowledged: "ACKNOWLEDGED",
  assigned: "ASSIGNED",
  in_progress: "IN_PROGRESS",
  resolved: "RESOLVED",
  waiver_requested: "WAIVER_REQUESTED",
  waiver_approved: "WAIVER_APPROVED",
  waiver_rejected: "WAIVER_REJECTED",
  suppressed: "SUPPRESSED",
  reopened: "REOPENED",
  closed: "CLOSED",
  alert_recorded: "ALERT_RECORDED",
} as const satisfies Record<WorkflowAssuranceIncidentEventType, PrismaIncidentEventType>

const SEVERITY_TO_PRISMA = {
  info: "INFO",
  warning: "WARNING",
  high: "HIGH",
  blocking: "BLOCKING",
  compliance_critical: "COMPLIANCE_CRITICAL",
} as const satisfies Record<WorkflowAssuranceSeverity, PrismaAssuranceSeverity>

const ALERT_CHANNEL_TO_PRISMA = {
  in_app: "IN_APP",
  email: "EMAIL",
  webhook: "WEBHOOK",
  sms: "SMS",
  task_queue: "TASK_QUEUE",
} as const satisfies Record<string, PrismaAlertChannel>

const ALERT_STATUS_TO_PRISMA = {
  pending: "PENDING",
  delivered: "DELIVERED",
  skipped: "SKIPPED",
  failed: "FAILED",
  suppressed: "SUPPRESSED",
} as const satisfies Record<string, PrismaAlertDeliveryStatus>

const WAIVER_STATUS_TO_PRISMA = {
  requested: "REQUESTED",
  approved: "APPROVED",
  rejected: "REJECTED",
  expired: "EXPIRED",
  revoked: "REVOKED",
} as const satisfies Record<string, PrismaWaiverStatus>

const PRISMA_TO_INCIDENT_STATUS = invertMap(INCIDENT_STATUS_TO_PRISMA)
const PRISMA_TO_SEVERITY = invertMap(SEVERITY_TO_PRISMA)
const PRISMA_TO_WAIVER_STATUS = invertMap(WAIVER_STATUS_TO_PRISMA)

const REOPENABLE_STATUSES: PrismaIncidentStatus[] = ["RESOLVED", "WAIVED", "CLOSED"]
const FINAL_STATUSES = new Set<PrismaIncidentStatus>(["RESOLVED", "WAIVED", "SUPPRESSED", "CLOSED"])
const EVIDENCE_GRADE_SET = new Set<EvidenceGrade>(EVIDENCE_GRADES)

const PROOF_SUBJECT_TABLE_MAP: Record<string, ProofTrailSubjectType> = {
  journal_entries: "journal.entry",
  journal_entry: "journal.entry",
  accounting_journal_entries: "journal.entry",
  reconciliation_runs: "reconciliation.run",
  payment_reconciliation_runs: "reconciliation.run",
  close_runs: "close.run",
  close_run: "close.run",
}

type IncidentDbClient = typeof db
type IncidentPresentationContext = {
  actorPermissions?: readonly string[]
  hasFreshAuth?: boolean
}

export async function upsertWorkflowAssuranceIncidentFromResult(input: WorkflowAssuranceIncidentSource) {
  if (!shouldCreateIncidentForResult(input.result.status)) return null

  return db.$transaction(async (tx) => {
    const client = tx as unknown as IncidentDbClient
    return upsertIncidentInTx(client, input)
  })
}

export async function acknowledgeWorkflowAssuranceIncident(input: WorkflowAssuranceIncidentTransitionInput) {
  return transitionWorkflowAssuranceIncident(input, {
    eventType: "acknowledged",
    status: "acknowledged",
    message: "Workflow assurance incident acknowledged",
    data: {},
  })
}

export async function assignWorkflowAssuranceIncident(input: AssignWorkflowAssuranceIncidentInput) {
  return transitionWorkflowAssuranceIncident(input, {
    eventType: "assigned",
    status: "assigned",
    message: "Workflow assurance incident assigned",
    data: {
      ownerId: input.ownerId,
      assignedRole: input.assignedRole ?? null,
      dueAt: input.dueAt ?? null,
    },
  })
}

export async function resolveWorkflowAssuranceIncident(input: WorkflowAssuranceIncidentTransitionInput) {
  if (!input.note?.trim()) throw new BusinessRuleError("Resolution note is required.")

  return transitionWorkflowAssuranceIncident(input, {
    eventType: "resolved",
    status: "resolved",
    message: "Workflow assurance incident resolved",
    data: {
      resolvedAt: new Date(),
      resolvedById: input.actorId ?? null,
      resolutionNote: input.note.trim(),
    },
  })
}

export async function suppressWorkflowAssuranceIncident(input: SuppressWorkflowAssuranceIncidentInput) {
  if (!input.reason.trim()) throw new BusinessRuleError("Suppression reason is required.")

  return transitionWorkflowAssuranceIncident(input, {
    eventType: "suppressed",
    status: "suppressed",
    message: "Workflow assurance incident suppressed",
    data: {
      suppressedAt: new Date(),
      suppressedById: input.actorId ?? null,
      suppressionReason: input.reason.trim(),
      metadata: jsonObject({
        ...(input.metadata ?? {}),
        suppressedUntil: input.suppressedUntil?.toISOString() ?? null,
      }),
    },
  })
}

export async function reopenWorkflowAssuranceIncident(input: WorkflowAssuranceIncidentTransitionInput) {
  return transitionWorkflowAssuranceIncident(input, {
    eventType: "reopened",
    status: "reopened",
    message: "Workflow assurance incident reopened",
    data: {
      reopenedAt: new Date(),
      resolvedAt: null,
      resolvedById: null,
      resolutionNote: null,
      suppressionReason: null,
      suppressedAt: null,
      suppressedById: null,
      closedAt: null,
    },
  })
}

export async function requestWorkflowAssuranceWaiver(input: RequestWorkflowAssuranceWaiverInput) {
  const requesterId = input.actorId
  if (!requesterId) throw new BusinessRuleError("A waiver requester is required.")
  if (!input.reason.trim()) throw new BusinessRuleError("Waiver reason is required.")
  if (!input.evidenceHash.trim()) throw new BusinessRuleError("Waiver evidence hash is required.")
  if (input.expiresAt <= new Date()) throw new BusinessRuleError("Waiver expiry must be in the future.")

  return db.$transaction(async (tx) => {
    const client = tx as unknown as IncidentDbClient
    const incident = await findIncidentForTenant(client, input.organizationId, input.incidentId)
    if (FINAL_STATUSES.has(incident.status) || incident.status === "WAIVED") {
      throw new BusinessRuleError("Finalized incidents must be reopened before receiving a waiver request.")
    }

    const waiver = await client.workflowAssuranceWaiver.create({
      data: {
        organizationId: input.organizationId,
        incidentId: incident.id,
        status: WAIVER_STATUS_TO_PRISMA.requested,
        requesterId,
        reason: input.reason.trim(),
        evidenceHash: input.evidenceHash.trim(),
        expiresAt: input.expiresAt,
        metadata: jsonObject(input.metadata ?? {}),
      },
    })

    await recordIncidentEvent(client, {
      organizationId: input.organizationId,
      incidentId: incident.id,
      eventType: "waiver_requested",
      fromStatus: incident.status,
      toStatus: incident.status,
      actorId: input.actorId,
      message: "Workflow assurance waiver requested",
      metadata: {
        waiverId: waiver.id,
        evidenceHash: waiver.evidenceHash,
        expiresAt: waiver.expiresAt.toISOString(),
      },
    })
    await recordAuditLog(client, {
      organizationId: input.organizationId,
      incidentId: incident.id,
      actorId: input.actorId,
      action: "WORKFLOW_ASSURANCE_WAIVER_REQUESTED",
      before: { status: incident.status },
      after: { waiverId: waiver.id, status: incident.status },
    })

    return toWaiverDto(waiver)
  })
}

export async function approveWorkflowAssuranceWaiver(input: ApproveWorkflowAssuranceWaiverInput) {
  if (!input.actorId) throw new BusinessRuleError("A waiver approver is required.")

  return db.$transaction(async (tx) => {
    const client = tx as unknown as IncidentDbClient
    const waiver = await client.workflowAssuranceWaiver.findFirst({
      where: {
        id: input.waiverId,
        organizationId: input.organizationId,
      },
      include: { incident: true },
    })
    if (!waiver) throw new NotFoundError("Workflow assurance waiver not found.")
    if (waiver.status !== "REQUESTED") throw new BusinessRuleError("Only requested waivers can be approved.")
    if (waiver.requesterId === input.actorId) {
      throw new BusinessRuleError("The waiver requester cannot approve the same assurance waiver.")
    }
    if (waiver.expiresAt <= new Date()) throw new BusinessRuleError("Expired waivers cannot be approved.")

    const now = new Date()
    const updatedWaiver = await client.workflowAssuranceWaiver.update({
      where: { id: waiver.id },
      data: {
        status: WAIVER_STATUS_TO_PRISMA.approved,
        approverId: input.actorId,
        approvedAt: now,
      },
    })
    const updatedIncident = await client.workflowAssuranceIncident.update({
      where: { id: waiver.incidentId },
      data: {
        status: INCIDENT_STATUS_TO_PRISMA.waived,
        resolvedAt: now,
        resolvedById: input.actorId,
        resolutionNote: input.note ?? "Approved assurance waiver.",
      },
    })

    await recordIncidentEvent(client, {
      organizationId: input.organizationId,
      incidentId: updatedIncident.id,
      eventType: "waiver_approved",
      fromStatus: waiver.incident.status,
      toStatus: updatedIncident.status,
      actorId: input.actorId,
      message: "Workflow assurance waiver approved",
      metadata: {
        waiverId: waiver.id,
        requestedById: waiver.requesterId,
        evidenceHash: waiver.evidenceHash,
      },
    })
    await recordAuditLog(client, {
      organizationId: input.organizationId,
      incidentId: updatedIncident.id,
      actorId: input.actorId,
      action: "WORKFLOW_ASSURANCE_WAIVER_APPROVED",
      before: { status: waiver.incident.status, waiverStatus: waiver.status },
      after: { status: updatedIncident.status, waiverStatus: updatedWaiver.status },
    })

    return toWaiverDto(updatedWaiver)
  })
}

async function upsertIncidentInTx(client: IncidentDbClient, input: WorkflowAssuranceIncidentSource) {
  const now = new Date()
  const sourceType = input.result.sourceType ?? "workflow_assurance_check"
  const sourceId = input.result.sourceId ?? input.definition.checkKey
  const title = titleForIncident(input.definition)
  const detail = detailForIncident(input.result)
  const sourceLinks = jsonObject(input.result.evidenceLinks)
  const metadata = jsonObject({
    resultStatus: input.result.status,
    resultMetadata: input.result.metadata,
    recommendedAction: input.result.recommendedAction,
    counts: input.result.counts,
    errorCode: input.result.errorCode,
    errorMessage: input.result.errorMessage,
  })

  const exact = await client.workflowAssuranceIncident.findUnique({
    where: {
      workflow_assurance_incident_dedupe_key: {
        organizationId: input.organizationId,
        checkKey: input.definition.checkKey,
        sourceType,
        sourceId,
        fingerprint: input.result.fingerprint,
        sourceHash: input.result.sourceHash,
      },
    },
  })

  if (exact) {
    const severityChanged = exact.severity !== SEVERITY_TO_PRISMA[input.result.severity]
    const updated = await client.workflowAssuranceIncident.update({
      where: { id: exact.id },
      data: {
        checkRunId: input.checkRunId ?? null,
        title,
        detail,
        severity: SEVERITY_TO_PRISMA[input.result.severity],
        sourceLinks,
        actionRoute: input.definition.actionRoute,
        lastDetectedAt: now,
        occurrenceCount: { increment: 1 },
        metadata,
      },
    })
    await recordIncidentEvent(client, {
      organizationId: input.organizationId,
      incidentId: updated.id,
      eventType: severityChanged ? "severity_changed" : "duplicate_detected",
      fromStatus: exact.status,
      toStatus: updated.status,
      actorId: input.actorId,
      message: severityChanged
        ? "Workflow assurance incident severity changed for unchanged source state"
        : "Workflow assurance incident duplicate detected for unchanged source state",
      metadata: {
        previousSeverity: exact.severity,
        currentSeverity: updated.severity,
        sourceHash: updated.sourceHash,
      },
    })
    await recordAuditLog(client, {
      organizationId: input.organizationId,
      incidentId: updated.id,
      actorId: input.actorId,
      action: severityChanged
        ? "WORKFLOW_ASSURANCE_INCIDENT_SEVERITY_CHANGED"
        : "WORKFLOW_ASSURANCE_INCIDENT_DUPLICATE_DETECTED",
      before: { status: exact.status, severity: exact.severity, occurrenceCount: exact.occurrenceCount },
      after: { status: updated.status, severity: updated.severity, occurrenceCount: updated.occurrenceCount },
    })
    return toIncidentDto(updated)
  }

  const reopenable = await client.workflowAssuranceIncident.findFirst({
    where: {
      organizationId: input.organizationId,
      checkKey: input.definition.checkKey,
      sourceType,
      sourceId,
      fingerprint: input.result.fingerprint,
      status: { in: REOPENABLE_STATUSES },
      NOT: { sourceHash: input.result.sourceHash },
    },
    orderBy: { lastDetectedAt: "desc" },
  })

  if (reopenable) {
    const updated = await client.workflowAssuranceIncident.update({
      where: { id: reopenable.id },
      data: {
        checkRunId: input.checkRunId ?? null,
        sourceHash: input.result.sourceHash,
        title,
        detail,
        severity: SEVERITY_TO_PRISMA[input.result.severity],
        status: INCIDENT_STATUS_TO_PRISMA.reopened,
        evidenceGrade: evidenceGradeForIncident(input.result.status),
        sourceLinks,
        actionRoute: input.definition.actionRoute,
        lastDetectedAt: now,
        reopenedAt: now,
        resolvedAt: null,
        resolvedById: null,
        closedAt: null,
        occurrenceCount: { increment: 1 },
        metadata,
      },
    })
    await recordIncidentEvent(client, {
      organizationId: input.organizationId,
      incidentId: updated.id,
      eventType: "reopened",
      fromStatus: reopenable.status,
      toStatus: updated.status,
      actorId: input.actorId,
      message: "Resolved workflow assurance incident reopened for a newer source hash",
      metadata: {
        previousSourceHash: reopenable.sourceHash,
        currentSourceHash: updated.sourceHash,
      },
    })
    await recordIncidentAlert(client, updated, "reopened")
    await recordAuditLog(client, {
      organizationId: input.organizationId,
      incidentId: updated.id,
      actorId: input.actorId,
      action: "WORKFLOW_ASSURANCE_INCIDENT_REOPENED",
      before: { status: reopenable.status, sourceHash: reopenable.sourceHash },
      after: { status: updated.status, sourceHash: updated.sourceHash },
    })
    return toIncidentDto(updated)
  }

  const created = await client.workflowAssuranceIncident.create({
    data: {
      organizationId: input.organizationId,
      definitionId: input.definitionId,
      checkRunId: input.checkRunId ?? null,
      checkKey: input.definition.checkKey,
      definitionVersion: input.definition.version,
      workflow: workflowToPrisma(input.definition.workflow),
      moduleSlug: input.definition.moduleSlug,
      sourceType,
      sourceId,
      sourceHash: input.result.sourceHash,
      fingerprint: input.result.fingerprint,
      title,
      detail,
      severity: SEVERITY_TO_PRISMA[input.result.severity],
      status: INCIDENT_STATUS_TO_PRISMA.open,
      evidenceGrade: evidenceGradeForIncident(input.result.status),
      sourceLinks,
      assignedRole: input.definition.ownerRole,
      actionRoute: input.definition.actionRoute,
      firstDetectedAt: now,
      lastDetectedAt: now,
      metadata,
    },
  })
  await recordIncidentEvent(client, {
    organizationId: input.organizationId,
    incidentId: created.id,
    eventType: "created",
    toStatus: created.status,
    actorId: input.actorId,
    message: "Workflow assurance incident created",
    metadata: {
      sourceHash: created.sourceHash,
      fingerprint: created.fingerprint,
      resultStatus: input.result.status,
    },
  })
  await recordIncidentAlert(client, created, "created")
  await recordAuditLog(client, {
    organizationId: input.organizationId,
    incidentId: created.id,
    actorId: input.actorId,
    action: "WORKFLOW_ASSURANCE_INCIDENT_CREATED",
    before: null,
    after: { status: created.status, severity: created.severity, sourceHash: created.sourceHash },
  })

  return toIncidentDto(created)
}

async function transitionWorkflowAssuranceIncident(
  input: WorkflowAssuranceIncidentTransitionInput,
  transition: {
    eventType: WorkflowAssuranceIncidentEventType
    status: WorkflowAssuranceIncidentStatus
    message: string
    data: Prisma.WorkflowAssuranceIncidentUpdateInput
  },
) {
  return db.$transaction(async (tx) => {
    const client = tx as unknown as IncidentDbClient
    const incident = await findIncidentForTenant(client, input.organizationId, input.incidentId)
    if (FINAL_STATUSES.has(incident.status) && transition.status !== "reopened") {
      throw new BusinessRuleError("Finalized incidents must be reopened before another transition.")
    }

    const updateData: Prisma.WorkflowAssuranceIncidentUpdateInput = {
      ...transition.data,
      status: INCIDENT_STATUS_TO_PRISMA[transition.status],
    }
    if (!("metadata" in updateData) && input.metadata) {
      updateData.metadata = jsonObject(input.metadata)
    }

    const updated = await client.workflowAssuranceIncident.update({
      where: { id: incident.id },
      data: updateData,
    })

    await recordIncidentEvent(client, {
      organizationId: input.organizationId,
      incidentId: incident.id,
      eventType: transition.eventType,
      fromStatus: incident.status,
      toStatus: updated.status,
      actorId: input.actorId,
      message: transition.message,
      metadata: {
        note: input.note,
        ...(input.metadata ?? {}),
      },
    })
    await recordAuditLog(client, {
      organizationId: input.organizationId,
      incidentId: incident.id,
      actorId: input.actorId,
      action: `WORKFLOW_ASSURANCE_INCIDENT_${INCIDENT_EVENT_TO_PRISMA[transition.eventType]}`,
      before: { status: incident.status },
      after: { status: updated.status },
    })

    return toIncidentDto(updated)
  })
}

async function findIncidentForTenant(client: IncidentDbClient, organizationId: string, incidentId: string) {
  const incident = await client.workflowAssuranceIncident.findFirst({
    where: {
      id: incidentId,
      organizationId,
    },
  })
  if (!incident) throw new NotFoundError("Workflow assurance incident not found.")
  return incident
}

async function recordIncidentAlert(
  client: IncidentDbClient,
  incident: WorkflowAssuranceIncident,
  reason: "created" | "reopened",
) {
  const dedupeKey = `${reason}:${incident.fingerprint}:${incident.sourceHash}`
  await client.workflowAssuranceAlertDelivery.upsert({
    where: {
      organizationId_incidentId_channel_dedupeKey: {
        organizationId: incident.organizationId,
        incidentId: incident.id,
        channel: ALERT_CHANNEL_TO_PRISMA.in_app,
        dedupeKey,
      },
    },
    create: {
      organizationId: incident.organizationId,
      incidentId: incident.id,
      channel: ALERT_CHANNEL_TO_PRISMA.in_app,
      status: ALERT_STATUS_TO_PRISMA.pending,
      dedupeKey,
      recipientRole: incident.assignedRole,
      title: incident.title,
      message: safeAlertMessage(incident),
      actionRoute: incident.actionRoute,
      metadata: jsonObject({
        reason,
        severity: incident.severity,
        sourceHash: incident.sourceHash,
      }),
    },
    update: {
      status: ALERT_STATUS_TO_PRISMA.pending,
      title: incident.title,
      message: safeAlertMessage(incident),
      actionRoute: incident.actionRoute,
      metadata: jsonObject({
        reason,
        severity: incident.severity,
        sourceHash: incident.sourceHash,
        refreshedAt: new Date().toISOString(),
      }),
    },
  })
  await recordIncidentEvent(client, {
    organizationId: incident.organizationId,
    incidentId: incident.id,
    eventType: "alert_recorded",
    toStatus: incident.status,
    message: "Workflow assurance alert delivery recorded",
    metadata: {
      channel: "in_app",
      dedupeKey,
    },
  })
}

async function recordIncidentEvent(
  client: IncidentDbClient,
  input: {
    organizationId: string
    incidentId: string
    eventType: WorkflowAssuranceIncidentEventType
    fromStatus?: PrismaIncidentStatus | null
    toStatus?: PrismaIncidentStatus | null
    actorId?: string | null
    message: string
    metadata?: Record<string, unknown>
  },
) {
  await client.workflowAssuranceIncidentEvent.create({
    data: {
      organizationId: input.organizationId,
      incidentId: input.incidentId,
      eventType: INCIDENT_EVENT_TO_PRISMA[input.eventType],
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      actorId: input.actorId ?? null,
      message: input.message,
      metadata: jsonObject(input.metadata ?? {}),
    },
  })
}

async function recordAuditLog(
  client: IncidentDbClient,
  input: {
    organizationId: string
    incidentId: string
    actorId?: string | null
    action: string
    before: unknown
    after: unknown
  },
) {
  await client.auditLog.create({
    data: {
      entityType: "WorkflowAssuranceIncident",
      entityId: input.incidentId,
      action: input.action,
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: jsonObject({
        before: input.before,
        after: input.after,
      }),
    },
  })
}

export function presentWorkflowAssuranceIncident(
  incident: WorkflowAssuranceIncident,
  context: IncidentPresentationContext = {},
): WorkflowAssuranceIncidentDto {
  return toIncidentDto(incident, context)
}

function toIncidentDto(
  incident: WorkflowAssuranceIncident,
  context: IncidentPresentationContext = {},
): WorkflowAssuranceIncidentDto {
  const workflow = prismaWorkflowToContract(incident.workflow)
  const severity = PRISMA_TO_SEVERITY[incident.severity]
  const status = PRISMA_TO_INCIDENT_STATUS[incident.status]
  const evidenceGrade = normalizeEvidenceGrade(incident.evidenceGrade)
  const rawMetadata = objectMetadata(incident.metadata)
  const rawSourceLinks = parseSourceLinks(incident.sourceLinks)
  const rawProofSubject = resolveIncidentProofSubject(incident, rawSourceLinks)
  const redactionDecisions = buildIncidentRedactionDecisions({
    incident,
    sourceLinks: rawSourceLinks,
    proofSubject: rawProofSubject,
    context,
  })
  const presentation = applyIncidentPresentationRedactions({
    incident,
    metadata: rawMetadata,
    sourceLinks: rawSourceLinks,
    proofSubject: rawProofSubject,
    decisions: redactionDecisions,
  })
  const proofBlocker = proofBlockerReason({
    rawProofSubject,
    proofSubject: presentation.proofSubject,
    redactions: presentation.redactions,
  })

  return {
    id: incident.id,
    organizationId: incident.organizationId,
    checkKey: incident.checkKey,
    workflow,
    moduleSlug: incident.moduleSlug,
    sourceType: incident.sourceType,
    sourceId: presentation.sourceId,
    sourceLabel: presentation.sourceLabel,
    sourceHash: incident.sourceHash,
    fingerprint: incident.fingerprint,
    title: incident.title,
    detail: incident.detail,
    severity,
    status,
    evidenceGrade,
    actionRoute: incident.actionRoute,
    ownerId: incident.ownerId,
    assignedRole: incident.assignedRole,
    dueAt: incident.dueAt?.toISOString() ?? null,
    occurrenceCount: incident.occurrenceCount,
    firstDetectedAt: incident.firstDetectedAt.toISOString(),
    lastDetectedAt: incident.lastDetectedAt.toISOString(),
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    reopenedAt: incident.reopenedAt?.toISOString() ?? null,
    suppressedAt: incident.suppressedAt?.toISOString() ?? null,
    metadata: presentation.metadata,
    sourceLinks: presentation.sourceLinks,
    proofSubject: presentation.proofSubject,
    proofSummary: {
      evidenceGrade,
      sourceHash: incident.sourceHash,
      freshness: freshnessForIncident(status, evidenceGrade, presentation.proofSubject),
      proofSubject: presentation.proofSubject,
      blockerReason: proofBlocker,
      actionRoute: incident.actionRoute,
    },
    redactions: presentation.redactions,
  }
}

function parseSourceLinks(value: unknown): WorkflowAssuranceEvidenceLink[] {
  if (!Array.isArray(value)) return []

  const links: WorkflowAssuranceEvidenceLink[] = []
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue
    const record = candidate as Record<string, unknown>
    const sourceTable = stringOrEmpty(record.sourceTable)
    const label = stringOrEmpty(record.label)
    if (!sourceTable || !label) continue

    const link: WorkflowAssuranceEvidenceLink = { sourceTable, label }
    const sourceType = optionalString(record.sourceType)
    const sourceId = optionalString(record.sourceId)
    const sourceHash = optionalString(record.sourceHash)
    const route = optionalString(record.route)
    const metadata = objectMetadata(record.metadata)
    if (sourceType) link.sourceType = sourceType
    if (sourceId) link.sourceId = sourceId
    if (sourceHash) link.sourceHash = sourceHash
    if (route) link.route = route
    if (Object.keys(metadata).length > 0) link.metadata = metadata
    links.push(link)
  }

  return links
}

function resolveIncidentProofSubject(
  incident: WorkflowAssuranceIncident,
  sourceLinks: readonly WorkflowAssuranceEvidenceLink[],
): WorkflowAssuranceIncidentProofSubject | null {
  const directSubjectType = proofSubjectTypeForSource(incident.sourceType)
  if (directSubjectType && isConcreteSourceId(incident.sourceId)) {
    return {
      subjectType: directSubjectType,
      subjectId: incident.sourceId,
      available: true,
    }
  }

  for (const link of sourceLinks) {
    const subjectType = proofSubjectTypeForSource(link.sourceTable) ?? proofSubjectTypeForSource(link.sourceType)
    const subjectId = link.sourceId
    if (!subjectType || !isConcreteSourceId(subjectId)) continue
    return {
      subjectType,
      subjectId,
      available: true,
    }
  }

  return null
}

function buildIncidentRedactionDecisions(input: {
  incident: WorkflowAssuranceIncident
  sourceLinks: readonly WorkflowAssuranceEvidenceLink[]
  proofSubject: WorkflowAssuranceIncidentProofSubject | null
  context: IncidentPresentationContext
}): RedactionDecision[] {
  const categories = redactionCategoriesForIncident(input.incident, input.sourceLinks)
  if (categories.length === 0) return []

  const fields = ["sourceId", "sourceLinks", "metadata"]
  if (input.proofSubject) fields.push("proofSubject.subjectId")

  return categories.flatMap((category) =>
    fields.map((field) =>
      evaluateRedaction({
        field,
        category,
        actorPermissions: input.context.actorPermissions ?? [],
        hasFreshAuth: input.context.hasFreshAuth ?? false,
      }),
    ),
  )
}

function applyIncidentPresentationRedactions(input: {
  incident: WorkflowAssuranceIncident
  metadata: Record<string, unknown>
  sourceLinks: WorkflowAssuranceEvidenceLink[]
  proofSubject: WorkflowAssuranceIncidentProofSubject | null
  decisions: readonly RedactionDecision[]
}) {
  const deniedDecisions = input.decisions.filter((decision) => !decision.allowed)
  const sourceIdDecision = firstDeniedDecision(deniedDecisions, "sourceId")
  const sourceLinksDecision = firstDeniedDecision(deniedDecisions, "sourceLinks")
  const metadataDecision = firstDeniedDecision(deniedDecisions, "metadata")
  const proofSubjectDecision = firstDeniedDecision(deniedDecisions, "proofSubject.subjectId")
  const sourceId = sourceIdDecision ? protectedValue(input.incident.sourceId, sourceIdDecision) : input.incident.sourceId
  const sourceLinks = sourceLinksDecision
    ? input.sourceLinks.map((link) => redactEvidenceLink(link, sourceLinksDecision))
    : input.sourceLinks
  const metadata = metadataDecision
    ? {
        redacted: true,
        reason: metadataDecision.safeMessage,
        policy: metadataDecision.policy,
      }
    : input.metadata
  const proofSubject =
    input.proofSubject && proofSubjectDecision
      ? {
          ...input.proofSubject,
          subjectId: protectedValue(input.proofSubject.subjectId, proofSubjectDecision),
          available: false,
        }
      : input.proofSubject
  const redactions = deniedDecisions.map((decision, index) => redactionDecisionToProofRedaction(input.incident.id, decision, index))
  const sourceLabel = sourceLinksDecision
    ? "Redacted evidence"
    : input.sourceLinks[0]?.label ?? `${input.incident.sourceType}:${input.incident.sourceId}`

  return {
    sourceId,
    sourceLabel,
    metadata,
    sourceLinks,
    proofSubject,
    redactions,
  }
}

function redactionCategoriesForIncident(
  incident: WorkflowAssuranceIncident,
  sourceLinks: readonly WorkflowAssuranceEvidenceLink[],
): SensitiveFieldCategory[] {
  const text = [
    incident.workflow,
    incident.moduleSlug,
    incident.checkKey,
    incident.sourceType,
    incident.title,
    ...sourceLinks.flatMap((link) => [link.sourceTable, link.sourceType, link.label]),
    ...metadataKeys(objectMetadata(incident.metadata)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  const categories = new Set<SensitiveFieldCategory>()

  if (text.includes("payroll")) categories.add("payroll_person_amount")
  if (/(supplier_bank|supplier_payment|bank_account|iban|swift|routing)/.test(text)) {
    categories.add("supplier_bank_detail")
  }
  if (/(payment_reconciliation|payment_provider|provider|payment_transaction|mobile_money|momo)/.test(text)) {
    categories.add("payment_provider_reference")
  }
  if (/(suspense|reconciliation_exception|payment_exception)/.test(text)) {
    categories.add("reconciliation_suspense_detail")
  }
  if (/(fiscal|tax_authority|authority_response)/.test(text)) {
    categories.add("fiscal_authority_payload")
  }
  if (/(compliance_submission|regulatory_submission|compliance_evidence)/.test(text)) {
    categories.add("compliance_submission_payload")
  }
  if (/(audit|security|permission|freshauth|actor|session)/.test(text)) {
    categories.add("audit_security_context")
  }
  if (/(close|certification|certified_pack)/.test(text)) {
    categories.add("close_certification_evidence")
  }

  return Array.from(categories)
}

function safeAlertMessage(incident: WorkflowAssuranceIncident) {
  if (redactionCategoriesForIncident(incident, parseSourceLinks(incident.sourceLinks)).length === 0) {
    return incident.detail
  }
  return "Workflow assurance incident requires review. Sensitive evidence details are protected."
}

function proofBlockerReason(input: {
  rawProofSubject: WorkflowAssuranceIncidentProofSubject | null
  proofSubject: WorkflowAssuranceIncidentProofSubject | null
  redactions: readonly ProofTrailRedaction[]
}) {
  if (input.rawProofSubject && input.proofSubject && !input.proofSubject.available) {
    return "Proof subject is protected by redaction policy."
  }
  if (!input.rawProofSubject) return "No supported proof trail subject is available for this incident yet."
  if (input.redactions.length > 0) return "Some incident evidence is redacted for this viewer."
  return undefined
}

function freshnessForIncident(
  status: WorkflowAssuranceIncidentStatus,
  evidenceGrade: EvidenceGrade,
  proofSubject: WorkflowAssuranceIncidentProofSubject | null,
) {
  if (status === "reopened") return "stale"
  if (evidenceGrade === "blocked") return "blocked"
  if (!proofSubject) return "partial"
  return "fresh"
}

function proofSubjectTypeForSource(source: string | undefined | null) {
  if (!source) return null
  return PROOF_SUBJECT_TABLE_MAP[source.toLowerCase()] ?? null
}

function isConcreteSourceId(sourceId: string | undefined | null): sourceId is string {
  if (!sourceId) return false
  return !["aggregate", "all", "latest", "unknown", "workflow_assurance_check"].includes(sourceId.toLowerCase())
}

function firstDeniedDecision(decisions: readonly RedactionDecision[], field: string) {
  return decisions.find((decision) => decision.field === field)
}

function protectedValue(value: string, decision: RedactionDecision) {
  return decision.mode === "mask" ? maskSensitiveValue(value) : decision.replacement
}

function redactEvidenceLink(
  link: WorkflowAssuranceEvidenceLink,
  decision: RedactionDecision,
): WorkflowAssuranceEvidenceLink {
  return {
    sourceTable: link.sourceTable,
    sourceType: link.sourceType,
    sourceId: link.sourceId ? protectedValue(link.sourceId, decision) : undefined,
    sourceHash: link.sourceHash,
    label: "Redacted evidence",
    metadata: {
      redacted: true,
      policy: decision.policy,
    },
  }
}

function redactionDecisionToProofRedaction(
  incidentId: string,
  decision: RedactionDecision,
  index: number,
): ProofTrailRedaction {
  return createProofTrailRedaction({
    id: `workflow-assurance-incident-${incidentId}-${decision.category}-${decision.field}-${index}`.replace(
      /[^a-zA-Z0-9_.:-]/g,
      "-",
    ),
    field: decision.field,
    reason: decision.safeMessage,
    policy: decision.policy,
  })
}

function normalizeEvidenceGrade(value: string): EvidenceGrade {
  return EVIDENCE_GRADE_SET.has(value as EvidenceGrade) ? (value as EvidenceGrade) : "blocked"
}

function toWaiverDto(waiver: WorkflowAssuranceWaiver): WorkflowAssuranceWaiverDto {
  return {
    id: waiver.id,
    incidentId: waiver.incidentId,
    status: PRISMA_TO_WAIVER_STATUS[waiver.status],
    requesterId: waiver.requesterId,
    approverId: waiver.approverId,
    reason: waiver.reason,
    evidenceHash: waiver.evidenceHash,
    expiresAt: waiver.expiresAt.toISOString(),
    requestedAt: waiver.requestedAt.toISOString(),
    approvedAt: waiver.approvedAt?.toISOString() ?? null,
  }
}

function jsonObject(value: unknown): Prisma.InputJsonValue {
  return sanitizeForJson(value) as Prisma.InputJsonValue
}

function objectMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function metadataKeys(value: Record<string, unknown>) {
  const keys: string[] = []

  const visit = (record: Record<string, unknown>) => {
    for (const [key, child] of Object.entries(record)) {
      keys.push(key)
      if (child && typeof child === "object" && !Array.isArray(child)) {
        visit(child as Record<string, unknown>)
      }
    }
  }
  visit(value)

  return keys
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : ""
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function sanitizeForJson(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(sanitizeForJson)
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = isSensitiveKey(key) ? "[redacted]" : sanitizeForJson((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  if (value === undefined) return null
  return value
}

function isSensitiveKey(key: string) {
  return /payload|secret|token|credential|password|account|bank|salary|msisdn|phone|raw|iban|swift|routing|authority|destination/i.test(
    key,
  )
}

function workflowToPrisma(workflow: string) {
  return workflow.toUpperCase() as Prisma.WorkflowAssuranceIncidentCreateInput["workflow"]
}

function prismaWorkflowToContract(workflow: string) {
  return workflow.toLowerCase() as WorkflowAssuranceIncidentDto["workflow"]
}

function invertMap<T extends Record<string, string>>(value: T) {
  return Object.fromEntries(Object.entries(value).map(([key, mapped]) => [mapped, key])) as {
    [Value in T[keyof T]]: Extract<keyof T, string>
  }
}
