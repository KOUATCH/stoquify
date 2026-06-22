import "server-only"

import {
  WorkflowAssuranceAlertDeliveryStatus,
  WorkflowAssuranceIncidentStatus as PrismaIncidentStatus,
  WorkflowAssuranceRunStatus as PrismaRunStatus,
  type WorkflowAssuranceCheckDefinition,
  type WorkflowAssuranceCheckRun,
  type WorkflowAssuranceIncident,
  type WorkflowAssuranceIncidentEvent,
  type WorkflowAssuranceWaiver,
} from "@prisma/client"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { isCommercialModuleSlug, type CommercialModuleSlug } from "@/services/modules/module-control-contracts"

import { presentWorkflowAssuranceIncident } from "./assurance-incident.service"
import type {
  AssuranceControlTowerBucket,
  AssuranceControlTowerData,
  AssuranceControlTowerEngineHealth,
  AssuranceControlTowerIncident,
  AssuranceIncidentDetailData,
} from "./assurance-control-tower-contracts"
import type {
  WorkflowAssuranceIncidentStatus,
} from "./assurance-incident-contracts"
import type {
  WorkflowAssuranceRunStatus,
  WorkflowAssuranceSeverity,
  WorkflowAssuranceWorkflow,
} from "./assurance-registry-contracts"

type AssuranceControlTowerInput = {
  organizationId: string
  actorPermissions: readonly string[]
  now?: Date | string | null
  limit?: number | null
}

type IncidentRecord = WorkflowAssuranceIncident & {
  definition: WorkflowAssuranceCheckDefinition
}

type IncidentDetailRecord = IncidentRecord & {
  events: WorkflowAssuranceIncidentEvent[]
  waivers: WorkflowAssuranceWaiver[]
}

const ACTIVE_INCIDENT_STATUSES: PrismaIncidentStatus[] = [
  PrismaIncidentStatus.OPEN,
  PrismaIncidentStatus.ACKNOWLEDGED,
  PrismaIncidentStatus.ASSIGNED,
  PrismaIncidentStatus.IN_PROGRESS,
  PrismaIncidentStatus.REOPENED,
]

const INCIDENT_STATUS_TO_CONTRACT: Record<PrismaIncidentStatus, WorkflowAssuranceIncidentStatus> = {
  OPEN: "open",
  ACKNOWLEDGED: "acknowledged",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  WAIVED: "waived",
  SUPPRESSED: "suppressed",
  REOPENED: "reopened",
  CLOSED: "closed",
}

const RUN_STATUS_TO_CONTRACT: Record<PrismaRunStatus, WorkflowAssuranceRunStatus> = {
  RUNNING: "running",
  COMPLETED: "completed",
  COMPLETED_WITH_WARNINGS: "completed_with_warnings",
  FAILED: "failed",
}

const WORKFLOW_TONES: Partial<Record<WorkflowAssuranceWorkflow, AssuranceControlTowerBucket["tone"]>> = {
  payment_reconciliation: "spruce",
  payroll: "gold",
  compliance: "danger",
  close_assurance: "danger",
  ledger: "brand",
  inventory: "info",
  pos: "info",
  offline_pos: "gold",
  purchasing_ap: "gold",
}

export async function getAssuranceControlTowerData(
  input: AssuranceControlTowerInput,
): Promise<AssuranceControlTowerData> {
  const now = normalizeNow(input.now)
  const limit = clampLimit(input.limit)
  const recentRunCutoff = new Date(now.getTime() - 24 * 3_600_000)
  const staleRunCutoff = new Date(now.getTime() - 45 * 60_000)

  const [
    incidentRows,
    recentRuns,
    staleRunningCount,
    failedRunCount,
    pendingAlertCount,
    failedAlertCount,
    suppressed,
    waived,
  ] = await Promise.all([
    db.workflowAssuranceIncident.findMany({
      where: {
        organizationId: input.organizationId,
        status: { in: ACTIVE_INCIDENT_STATUSES },
      },
      include: { definition: true },
      orderBy: [{ lastDetectedAt: "desc" }],
      take: limit,
    }),
    db.workflowAssuranceCheckRun.findMany({
      where: {
        organizationId: input.organizationId,
        startedAt: { gte: recentRunCutoff },
      },
      orderBy: [{ startedAt: "desc" }],
      take: 12,
    }),
    db.workflowAssuranceCheckRun.count({
      where: {
        organizationId: input.organizationId,
        runStatus: PrismaRunStatus.RUNNING,
        startedAt: { lt: staleRunCutoff },
      },
    }),
    db.workflowAssuranceCheckRun.count({
      where: {
        organizationId: input.organizationId,
        runStatus: PrismaRunStatus.FAILED,
        startedAt: { gte: recentRunCutoff },
      },
    }),
    db.workflowAssuranceAlertDelivery.count({
      where: {
        organizationId: input.organizationId,
        status: WorkflowAssuranceAlertDeliveryStatus.PENDING,
      },
    }),
    db.workflowAssuranceAlertDelivery.count({
      where: {
        organizationId: input.organizationId,
        status: WorkflowAssuranceAlertDeliveryStatus.FAILED,
      },
    }),
    db.workflowAssuranceIncident.count({
      where: { organizationId: input.organizationId, status: PrismaIncidentStatus.SUPPRESSED },
    }),
    db.workflowAssuranceIncident.count({
      where: { organizationId: input.organizationId, status: PrismaIncidentStatus.WAIVED },
    }),
  ])

  return composeAssuranceControlTowerData({
    organizationId: input.organizationId,
    generatedAt: now.toISOString(),
    incidentRows,
    recentRuns,
    actorPermissions: input.actorPermissions,
    suppressed,
    waived,
    engineHealth: {
      recentRunCount: recentRuns.length,
      staleRunningCount,
      failedRunCount,
      pendingAlertCount,
      failedAlertCount,
      lastRunAt: recentRuns[0]?.startedAt.toISOString() ?? null,
      state: engineHealthState({ staleRunningCount, failedRunCount, failedAlertCount, pendingAlertCount }),
    },
  })
}

export async function getAssuranceIncidentDetailData(input: {
  organizationId: string
  incidentId: string
  actorPermissions: readonly string[]
  now?: Date | string | null
}): Promise<AssuranceIncidentDetailData | null> {
  const row = await db.workflowAssuranceIncident.findFirst({
    where: {
      id: input.incidentId,
      organizationId: input.organizationId,
    },
    include: {
      definition: true,
      events: { orderBy: { createdAt: "asc" } },
      waivers: { orderBy: { requestedAt: "desc" } },
    },
  })
  if (!row) return null
  if (!canOpenIncident(row.definition, input.actorPermissions)) return null

  const incident = toControlTowerIncident(row, input.actorPermissions)

  return {
    organizationId: input.organizationId,
    generatedAt: normalizeNow(input.now).toISOString(),
    incident,
    canManage: hasRbacPermission(input.actorPermissions, "controls.manage"),
    timeline: row.events.map((event) => ({
      id: event.id,
      eventType: event.eventType.toLowerCase(),
      fromStatus: event.fromStatus ? INCIDENT_STATUS_TO_CONTRACT[event.fromStatus] : null,
      toStatus: event.toStatus ? INCIDENT_STATUS_TO_CONTRACT[event.toStatus] : null,
      actorId: event.actorId,
      message: event.message,
      metadata: objectMetadata(event.metadata),
      createdAt: event.createdAt.toISOString(),
    })),
    waivers: row.waivers.map((waiver) => ({
      id: waiver.id,
      status: waiver.status.toLowerCase(),
      requesterId: waiver.requesterId,
      approverId: waiver.approverId,
      evidenceHash: waiver.evidenceHash,
      expiresAt: waiver.expiresAt.toISOString(),
      requestedAt: waiver.requestedAt.toISOString(),
      approvedAt: waiver.approvedAt?.toISOString() ?? null,
    })),
    redactions: incident.redactions,
    evidenceGrade: incident.evidenceGrade,
  }
}

export function composeAssuranceControlTowerData(input: {
  organizationId: string
  generatedAt: string
  incidentRows: IncidentRecord[]
  recentRuns: WorkflowAssuranceCheckRun[]
  actorPermissions: readonly string[]
  suppressed: number
  waived: number
  engineHealth: AssuranceControlTowerEngineHealth
}): AssuranceControlTowerData {
  const visibleRows = input.incidentRows.filter((row) => canOpenIncident(row.definition, input.actorPermissions))
  const incidents = visibleRows.map((row) => toControlTowerIncident(row, input.actorPermissions))
  const hiddenByPermission = input.incidentRows.length - visibleRows.length
  const overdue = incidents.filter((incident) => isOverdue(incident.dueAt, input.generatedAt)).length

  return {
    organizationId: input.organizationId,
    generatedAt: input.generatedAt,
    summary: {
      open: incidents.length,
      blocking: incidents.filter((incident) => incident.severity === "blocking").length,
      complianceCritical: incidents.filter((incident) => incident.severity === "compliance_critical").length,
      overdue,
      redacted: incidents.filter((incident) => incident.redactions.length > 0).length,
      suppressed: input.suppressed,
      waived: input.waived,
      hiddenByPermission,
    },
    severityBuckets: bucketBy(incidents, (incident) => incident.severity, severityLabel, severityTone),
    workflowBuckets: bucketBy(incidents, (incident) => incident.workflow, workflowLabel, workflowTone),
    ownerBuckets: bucketBy(incidents, (incident) => incident.ownerRole, titleize, ownerTone),
    incidents,
    recentRuns: input.recentRuns.map(toRunSummary),
    engineHealth: input.engineHealth,
  }
}

function toControlTowerIncident(
  row: IncidentRecord,
  actorPermissions: readonly string[],
): AssuranceControlTowerIncident {
  const dto = presentWorkflowAssuranceIncident(row, { actorPermissions })
  const sourceRoute = dto.sourceLinks.find((link) => link.route)?.route ?? dto.actionRoute
  const blockerReason =
    dto.proofSummary.blockerReason ??
    (dto.evidenceGrade === "blocked" ? "Incident blocks trusted manager claims until resolved." : undefined)

  return {
    ...dto,
    requiredPermission: row.definition.requiredPermission,
    ownerRole: row.definition.ownerRole,
    sourceRoute,
    detailRoute: `/dashboard/assurance/control-tower/incidents/${dto.id}`,
    actionLabel: actionLabelForIncident(dto.workflow),
    canManage: hasRbacPermission(actorPermissions, "controls.manage"),
    moduleSlugNormalized: normalizeModuleSlug(row.moduleSlug),
    blockers: blockerReason
      ? [
          {
            id: `assurance-incident-${dto.id}`,
            severity: dto.severity === "compliance_critical" || dto.severity === "blocking" ? "critical" : "high",
            gate: dto.checkKey,
            title: "Assurance incident requires action",
            detail: blockerReason,
            sourceTables: dto.sourceLinks.map((link) => link.sourceTable).filter(Boolean),
            nextAction: actionLabelForIncident(dto.workflow),
          },
        ]
      : [],
  }
}

function canOpenIncident(definition: WorkflowAssuranceCheckDefinition, permissions: readonly string[]) {
  return (
    hasRbacPermission(permissions, definition.requiredPermission) ||
    hasRbacPermission(permissions, "controls.audit.read") ||
    hasRbacPermission(permissions, "controls.manage")
  )
}

function toRunSummary(run: WorkflowAssuranceCheckRun) {
  return {
    id: run.id,
    checkKey: run.checkKey,
    runStatus: RUN_STATUS_TO_CONTRACT[run.runStatus],
    resultStatus: run.resultStatus?.toLowerCase() ?? null,
    severity: (run.severity?.toLowerCase() as WorkflowAssuranceSeverity | undefined) ?? null,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    durationMs: run.durationMs,
    errorCode: run.errorCode,
    errorMessage: run.errorMessage,
  }
}

function engineHealthState(input: {
  staleRunningCount: number
  failedRunCount: number
  failedAlertCount: number
  pendingAlertCount: number
}): AssuranceControlTowerEngineHealth["state"] {
  if (input.staleRunningCount > 0 || input.failedRunCount > 0 || input.failedAlertCount > 0) return "blocked"
  if (input.pendingAlertCount > 0) return "watch"
  return "healthy"
}

function bucketBy<T>(
  items: readonly T[],
  keyFor: (item: T) => string,
  labelFor: (key: string) => string,
  toneFor: (key: string) => AssuranceControlTowerBucket["tone"],
) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = keyFor(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: labelFor(key), count, tone: toneFor(key) }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
}

function severityLabel(value: string) {
  if (value === "compliance_critical") return "Compliance critical"
  return titleize(value)
}

function severityTone(value: string): AssuranceControlTowerBucket["tone"] {
  if (value === "blocking" || value === "compliance_critical") return "danger"
  if (value === "high") return "gold"
  if (value === "warning") return "info"
  return "muted"
}

function workflowLabel(value: string) {
  return titleize(value.replace(/_/g, " "))
}

function workflowTone(value: string): AssuranceControlTowerBucket["tone"] {
  return WORKFLOW_TONES[value as WorkflowAssuranceWorkflow] ?? "brand"
}

function ownerTone(value: string): AssuranceControlTowerBucket["tone"] {
  if (/accountant|finance/.test(value)) return "brand"
  if (/payroll|supplier|purchasing/.test(value)) return "gold"
  if (/inventory|branch/.test(value)) return "info"
  if (/admin|support|operations/.test(value)) return "danger"
  return "muted"
}

function actionLabelForIncident(workflow: WorkflowAssuranceWorkflow) {
  if (workflow === "payment_reconciliation") return "Open reconciliation"
  if (workflow === "purchasing_ap") return "Open payables"
  if (workflow === "payroll") return "Open payroll controls"
  if (workflow === "inventory") return "Open inventory evidence"
  if (workflow === "close_assurance") return "Open close center"
  if (workflow === "ledger") return "Open ledger source"
  if (workflow === "compliance") return "Open compliance center"
  return "Open source workflow"
}

function normalizeModuleSlug(value: string): CommercialModuleSlug {
  if (isCommercialModuleSlug(value)) return value
  if (value === "business-events") return "dashboard"
  if (value === "accounting") return "accounting"
  if (value === "finance") return "finance"
  return "dashboard"
}

function isOverdue(value: string | null, nowInput: string) {
  if (!value) return false
  const due = new Date(value)
  const now = new Date(nowInput)
  return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime()
}

function clampLimit(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return 50
  return Math.max(1, Math.min(Math.trunc(value), 100))
}

function normalizeNow(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function objectMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function titleize(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
