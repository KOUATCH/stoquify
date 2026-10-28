import type { AgentFreshness } from "../agent-contracts"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"

export const PORTFOLIO_RELIANCE_INTENTS = [
  "read",
  "draft",
  "external_message",
  "financial_mutation",
  "credit_disclosure",
  "statutory_representation",
] as const

export type PortfolioRelianceIntent = (typeof PORTFOLIO_RELIANCE_INTENTS)[number]

export type PortfolioControlErrorCode =
  | "TENANT_SCOPE_VIOLATION"
  | "FORBIDDEN"
  | "VALIDATION_FAILED"
  | "EVIDENCE_STALE"
  | "EVIDENCE_BLOCKED"

export class PortfolioControlError extends Error {
  constructor(
    public readonly code: PortfolioControlErrorCode,
    message: string,
    public readonly correlationId: string,
    public readonly retryable = false,
    public readonly userMessageKey = "agents.portfolio.controlBlocked",
  ) {
    super(message)
    this.name = "PortfolioControlError"
  }
}

export type EvidenceTransformation = {
  kind: "capture" | "parse" | "classify" | "calculate" | "review" | "redact"
  version: string
  performedAt: string
  actorId: string | null
  outputHash: string
}

export type PortfolioEvidenceEnvelope = {
  organizationId: string
  subjectType: string
  subjectId: string
  sourceSystem: string
  sourceReference: string
  sourceHash: string
  capturedAt: string
  observedAt: string
  freshness: AgentFreshness
  evidenceGrade: EvidenceGrade
  available: boolean
  confidence: number | null
  reviewerId: string | null
  reviewedAt: string | null
  retentionClass: string
  redactedFields: string[]
  transformations: EvidenceTransformation[]
}

export type EvidenceRelianceDecision = {
  decision: "ALLOW" | "ALLOW_WITH_WARNING" | "REQUIRE_HUMAN_APPROVAL" | "BLOCK"
  code: PortfolioControlErrorCode | null
  reasons: string[]
  requiresHumanApproval: boolean
  mayCreateSideEffect: false
}

const HASH_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i
const CONSEQUENTIAL_INTENTS = new Set<PortfolioRelianceIntent>([
  "external_message",
  "financial_mutation",
  "credit_disclosure",
  "statutory_representation",
])

export function assertPortfolioAccess(input: {
  trustedOrganizationId: string
  evidenceOrganizationId: string
  actorAuthorized: boolean
  correlationId: string
}) {
  if (!input.trustedOrganizationId || input.trustedOrganizationId !== input.evidenceOrganizationId) {
    throw new PortfolioControlError(
      "TENANT_SCOPE_VIOLATION",
      "Trusted organization scope does not match evidence scope.",
      input.correlationId,
    )
  }
  if (!input.actorAuthorized) {
    throw new PortfolioControlError(
      "FORBIDDEN",
      "Actor is not authorized for this portfolio evidence.",
      input.correlationId,
    )
  }
}

export function createPortfolioEvidenceEnvelope(
  input: PortfolioEvidenceEnvelope,
  correlationId: string,
): PortfolioEvidenceEnvelope {
  const required = [
    input.organizationId,
    input.subjectType,
    input.subjectId,
    input.sourceSystem,
    input.sourceReference,
    input.retentionClass,
  ]
  if (required.some((value) => !value.trim())) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      "Evidence identity and retention fields are required.",
      correlationId,
    )
  }
  if (!HASH_PATTERN.test(input.sourceHash)) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      "Evidence source hash must be SHA-256.",
      correlationId,
    )
  }
  const capturedAt = parseDate(input.capturedAt, "capturedAt", correlationId)
  const observedAt = parseDate(input.observedAt, "observedAt", correlationId)
  if (observedAt > capturedAt) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      "Evidence observedAt cannot be after capturedAt.",
      correlationId,
    )
  }
  if (input.confidence !== null && (input.confidence < 0 || input.confidence > 1)) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      "Evidence confidence must be between zero and one.",
      correlationId,
    )
  }
  if ((input.reviewerId === null) !== (input.reviewedAt === null)) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      "Reviewer identity and review timestamp must be recorded together.",
      correlationId,
    )
  }
  if (input.reviewedAt) parseDate(input.reviewedAt, "reviewedAt", correlationId)
  for (const transformation of input.transformations) {
    if (!transformation.version.trim() || !HASH_PATTERN.test(transformation.outputHash)) {
      throw new PortfolioControlError(
        "VALIDATION_FAILED",
        "Evidence transformation version and SHA-256 output hash are required.",
        correlationId,
      )
    }
    parseDate(transformation.performedAt, "transformation.performedAt", correlationId)
  }
  return {
    ...input,
    redactedFields: [...new Set(input.redactedFields)].sort(),
    transformations: [...input.transformations],
  }
}

export function decideEvidenceReliance(
  evidence: Pick<
    PortfolioEvidenceEnvelope,
    "available" | "freshness" | "evidenceGrade" | "confidence"
  >,
  intent: PortfolioRelianceIntent,
): EvidenceRelianceDecision {
  const reasons: string[] = []
  if (!evidence.available || evidence.evidenceGrade === "blocked") {
    reasons.push("Required evidence is unavailable or blocked.")
    return blocked("EVIDENCE_BLOCKED", reasons)
  }
  if (["blocked", "failed", "empty", "unknown"].includes(evidence.freshness)) {
    reasons.push(`Evidence freshness is ${evidence.freshness}.`)
    return blocked("EVIDENCE_BLOCKED", reasons)
  }
  if (evidence.freshness === "stale") {
    reasons.push("Evidence is outside its approved freshness window.")
    if (intent === "read") {
      return {
        decision: "ALLOW_WITH_WARNING",
        code: "EVIDENCE_STALE",
        reasons,
        requiresHumanApproval: false,
        mayCreateSideEffect: false,
      }
    }
    return blocked("EVIDENCE_STALE", reasons)
  }
  if (evidence.freshness === "partial") {
    reasons.push("Evidence is partial; unavailable sources must not be inferred.")
    if (CONSEQUENTIAL_INTENTS.has(intent)) return blocked("EVIDENCE_BLOCKED", reasons)
    return {
      decision: "ALLOW_WITH_WARNING",
      code: null,
      reasons,
      requiresHumanApproval: intent === "draft",
      mayCreateSideEffect: false,
    }
  }
  if (CONSEQUENTIAL_INTENTS.has(intent)) {
    reasons.push("Consequential action requires separate human approval and service authorization.")
    return {
      decision: "REQUIRE_HUMAN_APPROVAL",
      code: null,
      reasons,
      requiresHumanApproval: true,
      mayCreateSideEffect: false,
    }
  }
  return {
    decision: "ALLOW",
    code: null,
    reasons,
    requiresHumanApproval: intent === "draft",
    mayCreateSideEffect: false,
  }
}

function blocked(
  code: Extract<PortfolioControlErrorCode, "EVIDENCE_STALE" | "EVIDENCE_BLOCKED">,
  reasons: string[],
): EvidenceRelianceDecision {
  return {
    decision: "BLOCK",
    code,
    reasons,
    requiresHumanApproval: false,
    mayCreateSideEffect: false,
  }
}

function parseDate(value: string, field: string, correlationId: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      `Evidence ${field} must be a valid timestamp.`,
      correlationId,
    )
  }
  return parsed
}
