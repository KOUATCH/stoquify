import "server-only"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError } from "@/services/_shared/action-errors"

import {
  type ActionItem,
  type ActionItemEvent,
  type ActionQueueResult,
  type AssignmentCandidate,
  type BusinessSignal,
} from "./business-signal-contracts"
import {
  createStableId,
} from "./business-signal-rules.service"
import {
  filterBusinessSignalsForPermissions,
  markExpiredBusinessSignals,
} from "./business-signal.service"

export function buildActionQueue(input: {
  organizationId: string
  signals: readonly BusinessSignal[]
  actorPermissions: readonly string[]
  now?: Date | string | null
}): ActionQueueResult {
  const now = normalizeDate(input.now)
  const tenantSignals = input.signals.filter((signal) => signal.organizationId === input.organizationId)
  const refreshedSignals = markExpiredBusinessSignals(tenantSignals, now)
  const visibleSignals = filterBusinessSignalsForPermissions(refreshedSignals, input.actorPermissions)
  const actionItems = visibleSignals
    .filter((signal) => signal.status !== "resolved" && signal.status !== "dismissed")
    .map((signal) => actionItemFromSignal(signal, now))

  return {
    organizationId: input.organizationId,
    generatedAt: now.toISOString(),
    signals: visibleSignals,
    actionItems,
    filteredOutCount: refreshedSignals.length - visibleSignals.length,
    summary: summarizeActionItems(actionItems, visibleSignals),
  }
}

export function assignActionItem(input: {
  organizationId: string
  item: ActionItem
  actorId?: string | null
  assigneeId: string
  candidate?: AssignmentCandidate | null
  now?: Date | string | null
}) {
  assertSameTenant(input.organizationId, input.item.organizationId)
  if (input.candidate) {
    assertSameTenant(input.organizationId, input.candidate.organizationId)
    if (!input.candidate.active && input.candidate.active !== undefined) {
      throw new BusinessRuleError("Cannot assign an action item to an inactive user.")
    }
    if (!hasRbacPermission(input.candidate.permissions, input.item.requiredPermission)) {
      throw new BusinessRuleError("Assignee does not have the permission required for this action.")
    }
  }

  const now = normalizeDate(input.now).toISOString()
  const item: ActionItem = {
    ...input.item,
    status: "assigned",
    assigneeId: input.assigneeId,
    updatedAt: now,
  }
  return {
    item,
    event: createActionItemEvent({
      item,
      eventType: "assigned",
      actorId: input.actorId,
      metadata: { assigneeId: input.assigneeId },
      occurredAt: now,
    }),
  }
}

export function resolveActionItem(input: {
  organizationId: string
  item: ActionItem
  actorId?: string | null
  resolutionNote?: string | null
  now?: Date | string | null
}) {
  assertSameTenant(input.organizationId, input.item.organizationId)
  if (input.item.status === "resolved") return { item: input.item, event: null }
  if (input.item.status === "dismissed") {
    throw new BusinessRuleError("Dismissed action items cannot be resolved.")
  }

  const now = normalizeDate(input.now).toISOString()
  const item: ActionItem = {
    ...input.item,
    status: "resolved",
    resolvedAt: now,
    updatedAt: now,
  }
  return {
    item,
    event: createActionItemEvent({
      item,
      eventType: "resolved",
      actorId: input.actorId,
      metadata: { resolutionNote: input.resolutionNote ?? null },
      occurredAt: now,
    }),
  }
}

export function dismissActionItem(input: {
  organizationId: string
  item: ActionItem
  actorId?: string | null
  reason?: string | null
  now?: Date | string | null
}) {
  assertSameTenant(input.organizationId, input.item.organizationId)
  if (input.item.status === "resolved") {
    throw new BusinessRuleError("Resolved action items cannot be dismissed.")
  }

  const now = normalizeDate(input.now).toISOString()
  const item: ActionItem = {
    ...input.item,
    status: "dismissed",
    dismissedAt: now,
    updatedAt: now,
  }
  return {
    item,
    event: createActionItemEvent({
      item,
      eventType: "dismissed",
      actorId: input.actorId,
      metadata: { reason: input.reason ?? null },
      occurredAt: now,
    }),
  }
}

export function filterAssignmentCandidates(input: {
  organizationId: string
  requiredPermission: string
  candidates: readonly AssignmentCandidate[]
}) {
  return input.candidates.filter(
    (candidate) =>
      candidate.organizationId === input.organizationId &&
      candidate.active !== false &&
      hasRbacPermission(candidate.permissions, input.requiredPermission),
  )
}

function actionItemFromSignal(signal: BusinessSignal, now: Date): ActionItem {
  const dueAt = new Date(Math.min(new Date(signal.expiresAt).getTime(), now.getTime() + 72 * 3_600_000))
  return {
    id: createStableId("act", signal.dedupeKey),
    organizationId: signal.organizationId,
    signalId: signal.id,
    signalType: signal.signalType,
    title: signal.title,
    nextStep: signal.suggestedAction,
    actionPath: signal.actionPath,
    requiredPermission: signal.requiredPermission,
    status: signal.status === "expired" ? "expired" : signal.assigneeId ? "assigned" : "open",
    severity: signal.severity,
    severityScore: signal.severityScore,
    assignedRole: signal.assignedRole,
    assigneeId: signal.assigneeId,
    createdAt: signal.generatedAt,
    updatedAt: signal.generatedAt,
    dueAt: dueAt.toISOString(),
    resolvedAt: null,
    dismissedAt: null,
    evidenceGrade: signal.evidenceGrade,
    redactions: signal.redactions,
    blockers: signal.blockers,
  }
}

function summarizeActionItems(actionItems: readonly ActionItem[], signals: readonly BusinessSignal[]) {
  const summary: ActionQueueResult["summary"] = {
    total: actionItems.length,
    open: 0,
    assigned: 0,
    stale: signals.filter((signal) => signal.status === "stale").length,
    expired: actionItems.filter((item) => item.status === "expired").length,
    redacted: signals.filter((signal) => signal.redactions.length > 0).length,
    bySeverity: {
      info: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    byRole: {},
  }

  for (const item of actionItems) {
    if (item.status === "open") summary.open += 1
    if (item.status === "assigned") summary.assigned += 1
    summary.bySeverity[item.severity] += 1
    summary.byRole[item.assignedRole] = (summary.byRole[item.assignedRole] ?? 0) + 1
  }

  return summary
}

function createActionItemEvent(input: {
  item: ActionItem
  eventType: ActionItemEvent["eventType"]
  actorId?: string | null
  occurredAt: string
  metadata: Record<string, unknown>
}): ActionItemEvent {
  return {
    id: createStableId("aie", `${input.item.id}:${input.eventType}:${input.occurredAt}`),
    organizationId: input.item.organizationId,
    actionItemId: input.item.id,
    signalId: input.item.signalId,
    eventType: input.eventType,
    actorId: input.actorId ?? null,
    occurredAt: input.occurredAt,
    metadata: input.metadata,
  }
}

function assertSameTenant(expectedOrganizationId: string, actualOrganizationId: string) {
  if (expectedOrganizationId !== actualOrganizationId) {
    throw new BusinessRuleError("Action item does not belong to the active organization.")
  }
}

function normalizeDate(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}
