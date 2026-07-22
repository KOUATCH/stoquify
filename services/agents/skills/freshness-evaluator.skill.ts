import type { SnapshotStatus } from "@/services/snapshots/snapshot-contracts"

import type { AgentFreshness } from "../agent-contracts"

export type AgentFreshnessEvaluation = {
  freshness: AgentFreshness
  stale: boolean
  ageMinutes: number | null
  caution: string | null
}

export function evaluateAgentFreshness(input: {
  status: SnapshotStatus
  generatedAt: Date | string
  sourceMaxUpdatedAt?: Date | string | null
  maxAgeMinutes: number
  now?: Date | string
}): AgentFreshnessEvaluation {
  const now = normalizeDate(input.now ?? new Date())
  const reference = input.sourceMaxUpdatedAt
    ? normalizeDate(input.sourceMaxUpdatedAt)
    : normalizeDate(input.generatedAt)
  const ageMinutes = Math.max(0, Math.floor((now.getTime() - reference.getTime()) / 60_000))
  const staleByAge = ageMinutes > input.maxAgeMinutes
  const freshness = normalizeStatus(input.status, staleByAge)
  const stale = freshness === "stale"

  return {
    freshness,
    stale,
    ageMinutes,
    caution:
      freshness === "fresh"
        ? null
        : `Agent evidence is ${freshness} and must not be presented as current complete proof.`,
  }
}

function normalizeStatus(status: SnapshotStatus, staleByAge: boolean): AgentFreshness {
  if (status === "fresh") return staleByAge ? "stale" : "fresh"
  if (status === "building") return "partial"
  return status
}

function normalizeDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error("Freshness evidence date is invalid.")
  return date
}
