import "server-only"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"

import {
  type BusinessSignal,
  type BusinessSignalSeverity,
  type BusinessSignalStatus,
} from "./business-signal-contracts"

const SEVERITY_ORDER: Record<BusinessSignalSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

export function dedupeBusinessSignals(signals: readonly BusinessSignal[]): BusinessSignal[] {
  const byKey = new Map<string, BusinessSignal>()

  for (const signal of signals) {
    const existing = byKey.get(signal.dedupeKey)
    if (!existing || compareSignalPriority(signal, existing) > 0) {
      byKey.set(signal.dedupeKey, signal)
    }
  }

  return Array.from(byKey.values()).sort((left, right) => compareSignalPriority(right, left))
}

export function filterBusinessSignalsForPermissions(
  signals: readonly BusinessSignal[],
  actorPermissions: readonly string[],
) {
  return signals.filter((signal) => hasRbacPermission(actorPermissions, signal.requiredPermission))
}

export function markExpiredBusinessSignals(
  signals: readonly BusinessSignal[],
  nowInput: Date | string | null = null,
) {
  const now = normalizeDate(nowInput)
  return signals.map((signal) =>
    new Date(signal.expiresAt).getTime() <= now.getTime()
      ? { ...signal, status: "expired" as BusinessSignalStatus }
      : signal,
  )
}

export function summarizeSignals(signals: readonly BusinessSignal[]) {
  return signals.reduce(
    (summary, signal) => {
      summary.total += 1
      summary.bySeverity[signal.severity] += 1
      summary.byRole[signal.assignedRole] = (summary.byRole[signal.assignedRole] ?? 0) + 1
      if (signal.status === "stale") summary.stale += 1
      if (signal.status === "expired") summary.expired += 1
      if (signal.redactions.length > 0) summary.redacted += 1
      return summary
    },
    {
      total: 0,
      stale: 0,
      expired: 0,
      redacted: 0,
      bySeverity: {
        info: 0,
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      byRole: {} as Record<string, number>,
    },
  )
}

function compareSignalPriority(left: BusinessSignal, right: BusinessSignal) {
  const severityDelta = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]
  if (severityDelta !== 0) return severityDelta
  const scoreDelta = left.severityScore - right.severityScore
  if (scoreDelta !== 0) return scoreDelta
  return new Date(left.generatedAt).getTime() - new Date(right.generatedAt).getTime()
}

function normalizeDate(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}
