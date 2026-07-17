import "server-only"

import {
  type BusinessSignal,
  type BusinessSignalSeverity,
  type NotificationPreference,
} from "./business-signal-contracts"

const SEVERITY_ORDER: Record<BusinessSignalSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

export function shouldNotifyForSignal(input: {
  signal: BusinessSignal
  preference: NotificationPreference
  now?: Date | string | null
}) {
  if (input.signal.organizationId !== input.preference.organizationId) return false
  if (!input.preference.enabledSignalTypes.includes(input.signal.signalType)) return false
  if (SEVERITY_ORDER[input.signal.severity] < SEVERITY_ORDER[input.preference.minimumSeverity]) return false
  if (input.preference.digestOnly && input.signal.severity !== "critical") return false
  if (isQuietHour(input.preference, input.now) && input.signal.severity !== "critical") return false
  return input.preference.channels.length > 0
}

export function buildSignalDigest(input: {
  organizationId: string
  userId: string
  signals: readonly BusinessSignal[]
  preference: NotificationPreference
  now?: Date | string | null
}) {
  const signals = input.signals.filter((signal) =>
    shouldNotifyForSignal({ signal, preference: input.preference, now: input.now }),
  )

  return {
    organizationId: input.organizationId,
    userId: input.userId,
    generatedAt: normalizeDate(input.now).toISOString(),
    channels: input.preference.channels,
    signalCount: signals.length,
    criticalCount: signals.filter((signal) => signal.severity === "critical").length,
    signals: signals.map((signal) => ({
      id: signal.id,
      signalType: signal.signalType,
      title: signal.title,
      severity: signal.severity,
      actionPath: signal.actionPath,
      evidenceGrade: signal.evidenceGrade,
    })),
  }
}

function isQuietHour(preference: NotificationPreference, nowInput: Date | string | null | undefined) {
  if (!preference.quietHours) return false
  const now = normalizeDate(nowInput)
  const hour = now.getUTCHours()
  const { startHour, endHour } = preference.quietHours
  if (startHour === endHour) return false
  if (startHour < endHour) return hour >= startHour && hour < endHour
  return hour >= startHour || hour < endHour
}

function normalizeDate(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}
