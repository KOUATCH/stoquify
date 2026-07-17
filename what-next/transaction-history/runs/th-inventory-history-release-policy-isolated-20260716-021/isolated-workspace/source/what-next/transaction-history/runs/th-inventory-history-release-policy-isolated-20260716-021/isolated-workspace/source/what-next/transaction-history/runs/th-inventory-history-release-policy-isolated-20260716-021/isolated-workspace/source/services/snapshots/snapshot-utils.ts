import "server-only"

import { createHash } from "node:crypto"

import { BusinessRuleError } from "@/services/_shared/action-errors"
import type {
  EvidenceGrade,
  ProofTrailBlockerSeverity,
} from "@/services/evidence/evidence-contracts"
import {
  DEFAULT_SNAPSHOT_MAX_AGE_MINUTES,
  type NormalizedSnapshotScope,
  type SnapshotBlocker,
  type SnapshotFreshness,
  type SnapshotKind,
  type SnapshotRedaction,
  type SnapshotResult,
  type SnapshotScopeInput,
  type SnapshotSourceModule,
  type SnapshotStatus,
  type SnapshotUiState,
} from "./snapshot-contracts"

const SNAPSHOT_GRADE_ORDER: Record<EvidenceGrade, number> = {
  raw: 0,
  operational: 1,
  posted: 2,
  reconciled: 3,
  certified: 4,
  blocked: 5,
}

const BLOCKER_SEVERITY_ORDER: Record<ProofTrailBlockerSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "object") {
    const decimalLike = value as { toNumber?: () => number; toString?: () => string }
    if (typeof decimalLike.toNumber === "function") return decimalLike.toNumber()
    if (typeof decimalLike.toString === "function") {
      const parsed = Number(decimalLike.toString())
      return Number.isFinite(parsed) ? parsed : 0
    }
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeSnapshotScope(input: SnapshotScopeInput): NormalizedSnapshotScope {
  const organizationId = input.organizationId?.trim()
  if (!organizationId) throw new BusinessRuleError("A tenant organization is required for snapshot reads.")

  const now = normalizeDate(input.now, new Date())
  const periodStart = startOfUtcDay(normalizeDate(input.periodStart, now))
  const periodEnd = endOfUtcDay(normalizeDate(input.periodEnd, input.periodStart ? periodStart : now))

  if (periodEnd < periodStart) {
    throw new BusinessRuleError("Snapshot periodEnd must be after periodStart.")
  }

  const maxAgeMinutes =
    typeof input.maxAgeMinutes === "number" && Number.isFinite(input.maxAgeMinutes) && input.maxAgeMinutes > 0
      ? Math.floor(input.maxAgeMinutes)
      : DEFAULT_SNAPSHOT_MAX_AGE_MINUTES

  return {
    organizationId,
    locationId: input.locationId?.trim() || null,
    periodStart,
    periodEnd,
    now,
    maxAgeMinutes,
  }
}

export function maxDate(values: Array<Date | string | null | undefined>) {
  let latest: Date | null = null
  for (const value of values) {
    if (!value) continue
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) continue
    if (!latest || date > latest) latest = date
  }
  return latest
}

export function createFreshness(input: {
  generatedAt: Date
  sourceMaxUpdatedAt?: Date | null
  maxAgeMinutes: number
}): SnapshotFreshness {
  const sourceMaxUpdatedAt = input.sourceMaxUpdatedAt ?? null
  const ageMinutes = sourceMaxUpdatedAt
    ? Math.max(0, Math.floor((input.generatedAt.getTime() - sourceMaxUpdatedAt.getTime()) / 60_000))
    : null
  const stale = ageMinutes !== null && ageMinutes > input.maxAgeMinutes

  return {
    generatedAt: input.generatedAt.toISOString(),
    sourceMaxUpdatedAt: sourceMaxUpdatedAt?.toISOString() ?? null,
    maxAgeMinutes: input.maxAgeMinutes,
    stale,
    staleReason: stale ? `Source data is ${ageMinutes} minutes old.` : null,
  }
}

export function createSnapshotSourceHash(value: unknown) {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`
}

export function buildSnapshotResult<TMetrics>(input: {
  kind: SnapshotKind
  scope: NormalizedSnapshotScope
  status: SnapshotStatus
  evidenceGrade: EvidenceGrade
  sourceModules: SnapshotSourceModule[]
  metrics: TMetrics
  blockers?: SnapshotBlocker[]
  redactions?: SnapshotRedaction[]
  sourceMaxUpdatedAt?: Date | null
  sourceHashParts?: unknown
}): SnapshotResult<TMetrics> {
  const generatedAt = input.scope.now
  const blockers = input.blockers ?? []
  const redactions = input.redactions ?? []
  const freshness = createFreshness({
    generatedAt,
    sourceMaxUpdatedAt: input.sourceMaxUpdatedAt ?? null,
    maxAgeMinutes: input.scope.maxAgeMinutes,
  })
  const status =
    input.status === "failed" || input.status === "building"
      ? input.status
      : blockers.some((blocker) => blocker.severity === "critical" || blocker.severity === "high")
        ? "blocked"
        : freshness.stale && input.status === "fresh"
          ? "stale"
          : input.status

  return {
    kind: input.kind,
    organizationId: input.scope.organizationId,
    locationId: input.scope.locationId,
    periodStart: input.scope.periodStart.toISOString(),
    periodEnd: input.scope.periodEnd.toISOString(),
    status,
    uiState: statusToUiState(status, redactions),
    evidenceGrade: status === "blocked" ? "blocked" : input.evidenceGrade,
    freshness,
    sourceHash: createSnapshotSourceHash({
      kind: input.kind,
      organizationId: input.scope.organizationId,
      locationId: input.scope.locationId,
      periodStart: input.scope.periodStart.toISOString(),
      periodEnd: input.scope.periodEnd.toISOString(),
      sourceMaxUpdatedAt: freshness.sourceMaxUpdatedAt,
      metrics: input.metrics,
      blockers: blockers.map((blocker) => ({ id: blocker.id, severity: blocker.severity, gate: blocker.gate })),
      redactions: redactions.map((redaction) => ({ id: redaction.id, field: redaction.field, policy: redaction.policy })),
      sourceHashParts: input.sourceHashParts ?? null,
    }),
    generatedAt: generatedAt.toISOString(),
    sourceModules: input.sourceModules,
    metrics: input.metrics,
    blockers,
    redactions,
  }
}

export function strongestEvidenceGrade(grades: EvidenceGrade[]): EvidenceGrade {
  if (grades.includes("blocked")) return "blocked"
  return grades.reduce<EvidenceGrade>((strongest, grade) =>
    SNAPSHOT_GRADE_ORDER[grade] > SNAPSHOT_GRADE_ORDER[strongest] ? grade : strongest,
  "raw")
}

export function weakestEvidenceGrade(grades: EvidenceGrade[]): EvidenceGrade {
  if (grades.includes("blocked")) return "blocked"
  return grades.reduce<EvidenceGrade>((weakest, grade) =>
    SNAPSHOT_GRADE_ORDER[grade] < SNAPSHOT_GRADE_ORDER[weakest] ? grade : weakest,
  grades[0] ?? "raw")
}

export function deriveAggregateSnapshotStatus(statuses: SnapshotStatus[]): Exclude<SnapshotStatus, "building" | "empty"> {
  if (statuses.includes("failed")) return "failed"
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("partial") || statuses.includes("empty")) return "partial"
  if (statuses.includes("stale")) return "stale"
  return "fresh"
}

export function blocker(input: {
  id: string
  severity: ProofTrailBlockerSeverity
  gate: string
  title: string
  detail: string
  sourceTables: string[]
  nextAction?: string
}): SnapshotBlocker {
  return input
}

export function mostSevereBlocker(blockers: SnapshotBlocker[]) {
  return blockers.reduce<SnapshotBlocker | null>((mostSevere, current) => {
    if (!mostSevere) return current
    return BLOCKER_SEVERITY_ORDER[current.severity] > BLOCKER_SEVERITY_ORDER[mostSevere.severity]
      ? current
      : mostSevere
  }, null)
}

function statusToUiState(status: SnapshotStatus, redactions: SnapshotRedaction[]): SnapshotUiState {
  if (redactions.length > 0 && status === "fresh") return "redacted"
  if (status === "building") return "loading"
  if (status === "failed") return "safe_error"
  return status
}

function normalizeDate(value: Date | string | null | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value)
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date(fallback)
}

function startOfUtcDay(date: Date) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

function endOfUtcDay(date: Date) {
  const next = startOfUtcDay(date)
  next.setUTCDate(next.getUTCDate() + 1)
  next.setUTCMilliseconds(next.getUTCMilliseconds() - 1)
  return next
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null"
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null"
  if (typeof value === "bigint") return JSON.stringify(value.toString())
  if (typeof value !== "object") return JSON.stringify(value)

  const decimalLike = value as { toFixed?: () => string; toString?: () => string }
  if (typeof decimalLike.toFixed === "function") return JSON.stringify(decimalLike.toFixed())

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }

  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`
}
