import type { ProofTrailBlocker, ProofTrailBlockerSeverity } from "./evidence-contracts"

export function createProofTrailBlocker(input: {
  id: string
  severity: ProofTrailBlockerSeverity
  gate: string
  title: string
  detail: string
  sourceTables?: string[]
  nextAction?: string
}): ProofTrailBlocker {
  return {
    id: input.id,
    severity: input.severity,
    gate: input.gate,
    title: input.title,
    detail: input.detail,
    sourceTables: input.sourceTables ?? [],
    nextAction: input.nextAction,
  }
}

export function hasBlockingProofTrailBlocker(blockers: ProofTrailBlocker[]) {
  return blockers.some((blocker) => blocker.severity === "critical" || blocker.severity === "high")
}

