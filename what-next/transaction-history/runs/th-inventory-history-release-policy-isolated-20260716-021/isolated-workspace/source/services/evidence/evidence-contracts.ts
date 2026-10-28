export const EVIDENCE_GRADES = [
  "raw",
  "operational",
  "posted",
  "reconciled",
  "certified",
  "blocked",
] as const

export type EvidenceGrade = (typeof EVIDENCE_GRADES)[number]

export const PROOF_TRAIL_SUBJECT_TYPES = [
  "journal.entry",
  "reconciliation.run",
  "close.run",
  "payment.transaction",
] as const

export type ProofTrailSubjectType = (typeof PROOF_TRAIL_SUBJECT_TYPES)[number]

export type ProofTrailFreshness = "fresh" | "stale" | "partial" | "blocked" | "unknown"
export type ProofTrailBlockerSeverity = "critical" | "high" | "medium" | "low"
export type ProofTrailEdgeType =
  | "source"
  | "posts_to"
  | "matches"
  | "certifies"
  | "blocks"
  | "audits"
  | "depends_on"

export type ProofTrailNode = {
  id: string
  nodeType: string
  nodeId: string
  label: string
  moduleSlug: string
  evidenceGrade: EvidenceGrade
  sourceTable?: string
  available: boolean
  redacted: boolean
  metadata?: Record<string, unknown>
}

export type ProofTrailEdge = {
  fromNodeId: string
  toNodeId: string
  edgeType: ProofTrailEdgeType
  label: string
  evidenceGrade: EvidenceGrade
}

export type ProofTrailBlocker = {
  id: string
  severity: ProofTrailBlockerSeverity
  gate: string
  title: string
  detail: string
  sourceTables: string[]
  nextAction?: string
}

export type ProofTrailRedaction = {
  id: string
  field: string
  reason: string
  policy: string
}

export type ProofTrailNextAction = {
  id: string
  label: string
  href?: string
  requiredPermission?: string
}

export type ProofTrailResult = {
  organizationId: string
  subjectType: ProofTrailSubjectType
  subjectId: string
  moduleSlug: string
  evidenceGrade: EvidenceGrade
  reason: string
  freshness: ProofTrailFreshness
  generatedAt: string
  sourceModules: string[]
  nodes: ProofTrailNode[]
  edges: ProofTrailEdge[]
  blockers: ProofTrailBlocker[]
  redactions: ProofTrailRedaction[]
  nextActions: ProofTrailNextAction[]
  audit: {
    accessLogged: boolean
    sensitiveAccess: boolean
  }
}

export type ProofTrailInput = {
  organizationId: string
  subjectType: ProofTrailSubjectType
  subjectId: string
  actorId?: string | null
}

export const SUBJECT_PERMISSION_MAP: Record<ProofTrailSubjectType, string> = {
  "journal.entry": "accounting.journal.read",
  "reconciliation.run": "payments.reconciliation.read",
  "close.run": "accounting.close.read",
  "payment.transaction": "payments.reconciliation.read",
}

export function isProofTrailSubjectType(value: unknown): value is ProofTrailSubjectType {
  return typeof value === "string" && PROOF_TRAIL_SUBJECT_TYPES.includes(value as ProofTrailSubjectType)
}

