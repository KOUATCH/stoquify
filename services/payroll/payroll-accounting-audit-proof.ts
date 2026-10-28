import type { PayrollAuditProofPack } from "@/services/accounting/data-trust.service";

export type PayrollRouteAccountingAuditProof = {
  available: boolean;
  status: PayrollAuditProofPack["proofGates"][number]["status"] | "UNAVAILABLE";
  generatedAt: string | null;
  scopeHash: string | null;
  periodId: string | null;
  trustLevel: PayrollAuditProofPack["certification"]["trustLevel"] | null;
  verdict: PayrollAuditProofPack["certification"]["verdict"] | null;
  exportable: boolean;
  blockerCount: number;
  criticalBlockerCount: number;
  highBlockerCount: number;
  proofGateCount: number;
  blockedProofGateCount: number;
  reviewProofGateCount: number;
  sourceLinkCount: number;
  sourceTableCount: number;
  redactionMode: PayrollAuditProofPack["redaction"]["mode"] | "UNAVAILABLE";
  redactionExcluded: string[];
  sourceTables: string[];
  aggregateEvidence: Record<string, number>;
  proofGates: PayrollAuditProofPack["proofGates"];
  blockers: PayrollAuditProofPack["blockers"];
  latestSourceLinks: PayrollAuditProofPack["latestSourceLinks"];
};

export function payrollRouteAccountingAuditProof(
  pack: PayrollAuditProofPack | null,
  periodId: string | null,
): PayrollRouteAccountingAuditProof {
  if (!pack) {
    return {
      available: false,
      status: "UNAVAILABLE",
      generatedAt: null,
      scopeHash: null,
      periodId,
      trustLevel: null,
      verdict: null,
      exportable: false,
      blockerCount: 0,
      criticalBlockerCount: 0,
      highBlockerCount: 0,
      proofGateCount: 0,
      blockedProofGateCount: 0,
      reviewProofGateCount: 0,
      sourceLinkCount: 0,
      sourceTableCount: 0,
      redactionMode: "UNAVAILABLE",
      redactionExcluded: [],
      sourceTables: [],
      aggregateEvidence: {},
      proofGates: [],
      blockers: [],
      latestSourceLinks: [],
    };
  }

  const blockedProofGateCount = pack.proofGates.filter(
    (gate) => gate.status === "BLOCKED",
  ).length;
  const reviewProofGateCount = pack.proofGates.filter(
    (gate) => gate.status === "REVIEW",
  ).length;

  return {
    available: true,
    status:
      blockedProofGateCount > 0
        ? "BLOCKED"
        : reviewProofGateCount > 0
          ? "REVIEW"
          : "PASS",
    generatedAt: pack.generatedAt,
    scopeHash: pack.scopeHash,
    periodId,
    trustLevel: pack.certification.trustLevel,
    verdict: pack.certification.verdict,
    exportable: pack.certification.exportable,
    blockerCount: pack.certification.blockerCount,
    criticalBlockerCount: pack.certification.criticalBlockerCount,
    highBlockerCount: pack.certification.highBlockerCount,
    proofGateCount: pack.proofGates.length,
    blockedProofGateCount,
    reviewProofGateCount,
    sourceLinkCount: pack.latestSourceLinks.length,
    sourceTableCount: pack.sourceTables.length,
    redactionMode: pack.redaction.mode,
    redactionExcluded: [...pack.redaction.excluded],
    sourceTables: [...pack.sourceTables],
    aggregateEvidence: { ...pack.aggregateEvidence },
    proofGates: pack.proofGates.map((gate) => ({
      gate: gate.gate,
      status: gate.status,
      blockerCount: gate.blockerCount,
      blockerIds: [...gate.blockerIds],
      evidence: [...gate.evidence],
    })),
    blockers: pack.blockers.map((blocker) => ({ ...blocker })),
    latestSourceLinks: pack.latestSourceLinks.map((link) => ({ ...link })),
  };
}
