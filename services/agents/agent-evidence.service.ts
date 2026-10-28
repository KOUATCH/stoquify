import "server-only"

import type { ProofTrailResult } from "@/services/evidence/evidence-contracts"
import type { SnapshotResult } from "@/services/snapshots/snapshot-contracts"

import type { AgentEvidenceRecord, AgentFreshness } from "./agent-contracts"

export function bindSnapshotEvidence<TMetrics>(
  snapshot: SnapshotResult<TMetrics>,
): AgentEvidenceRecord[] {
  const subjectId = [
    snapshot.kind,
    snapshot.organizationId,
    snapshot.locationId ?? "tenant",
    snapshot.periodStart,
    snapshot.periodEnd,
  ].join(":")
  const available =
    snapshot.status !== "failed" &&
    snapshot.status !== "empty" &&
    snapshot.evidenceGrade !== "blocked"

  return snapshot.sourceModules.map((sourceModule) => ({
    subjectType: `snapshot.${snapshot.kind}`,
    subjectId,
    sourceModule,
    sourceTable: null,
    sourceHash: snapshot.sourceHash || null,
    evidenceGrade: snapshot.evidenceGrade,
    freshness: normalizeEvidenceFreshness(snapshot.status),
    available,
    blockerCount: snapshot.blockers.length,
    redactionCount: snapshot.redactions.length,
  }))
}

export function bindProofTrailEvidence(proof: ProofTrailResult): AgentEvidenceRecord[] {
  const sourceModules = proof.sourceModules.length > 0 ? proof.sourceModules : [proof.moduleSlug]
  const sourceTables = Array.from(
    new Set(proof.nodes.map((node) => node.sourceTable).filter((value): value is string => Boolean(value))),
  )
  const sourceHash = readProofSourceHash(proof)

  return sourceModules.map((sourceModule, index) => ({
    subjectType: proof.subjectType,
    subjectId: proof.subjectId,
    sourceModule,
    sourceTable: sourceTables[index] ?? sourceTables[0] ?? null,
    sourceHash,
    evidenceGrade: proof.evidenceGrade,
    freshness: normalizeEvidenceFreshness(proof.freshness),
    available: proof.nodes.some((node) => node.available) && proof.evidenceGrade !== "blocked",
    blockerCount: proof.blockers.length,
    redactionCount: proof.redactions.length,
  }))
}

export function bindUnavailableEvidence(input: {
  subjectType: string
  subjectId: string
  sourceModule: string
  freshness?: AgentFreshness
}): AgentEvidenceRecord {
  return {
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    sourceModule: input.sourceModule,
    sourceTable: null,
    sourceHash: null,
    evidenceGrade: "blocked",
    freshness: input.freshness ?? "unknown",
    available: false,
    blockerCount: 1,
    redactionCount: 0,
  }
}

export function hasAvailableAgentEvidence(evidence: readonly AgentEvidenceRecord[]) {
  return evidence.some((item) => item.available && item.evidenceGrade !== "blocked")
}

function normalizeEvidenceFreshness(value: string): AgentFreshness {
  if (
    value === "fresh" ||
    value === "stale" ||
    value === "partial" ||
    value === "blocked" ||
    value === "failed" ||
    value === "empty"
  ) {
    return value
  }
  return "unknown"
}

function readProofSourceHash(proof: ProofTrailResult) {
  for (const node of proof.nodes) {
    const sourceHash = node.metadata?.sourceHash
    if (typeof sourceHash === "string" && sourceHash.trim()) return sourceHash
  }
  return null
}

