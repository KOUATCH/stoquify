import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"

import {
  assertPortfolioAccess,
  createPortfolioEvidenceEnvelope,
  decideEvidenceReliance,
  PortfolioControlError,
  type EvidenceRelianceDecision,
  type PortfolioEvidenceEnvelope,
  type PortfolioRelianceIntent,
} from "./evidence-trust.contracts"

export type ConnectorHealthInput = {
  trustedOrganizationId: string
  organizationId: string
  actorAuthorized: boolean
  correlationId: string
  connectorId: string
  connectorKind: string
  sourceReference: string
  sourceHash: string
  observedAt: string
  evaluatedAt: string
  lastSuccessfulSyncAt: string | null
  freshnessSlaMinutes: number
  credentialExpiresAt: string | null
  previousCredentialExpiresAt?: string | null
  signatureValid: boolean | null
  schemaDriftDetected: boolean
  gapCount: number
  duplicateCount: number
  deadLetterCount: number
  previousGapCount?: number | null
  previousDeadLetterCount?: number | null
  credentialWarningWindowDays?: number
  evidenceGrade: EvidenceGrade
}

export type ConnectorHealthFindingCode =
  | "NO_SUCCESSFUL_SYNC"
  | "FRESHNESS_SLA_BREACH"
  | "CREDENTIAL_EXPIRED"
  | "CREDENTIAL_EXPIRING_SOON"
  | "CREDENTIAL_EXPIRY_DRIFT"
  | "SIGNATURE_INVALID"
  | "SCHEMA_DRIFT"
  | "EVENT_GAPS"
  | "EVENT_GAP_DRIFT"
  | "DUPLICATE_EVENTS"
  | "DEAD_LETTER_EVENTS"
  | "DEAD_LETTER_DRIFT"

export type ConnectorHealthFinding = {
  code: ConnectorHealthFindingCode
  severity: "warning" | "blocking"
  message: string
}

export type ConnectorHealthResult = {
  organizationId: string
  connectorId: string
  connectorKind: string
  state: "HEALTHY" | "DEGRADED" | "BLOCKED"
  reasons: string[]
  findings: ConnectorHealthFinding[]
  ageMinutes: number | null
  risk: {
    level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    score: number
  }
  credential: {
    expiresAt: string | null
    daysUntilExpiry: number | null
    warningWindowDays: number
    warning: boolean
    expired: boolean
  }
  drift: {
    gapDelta: number | null
    deadLetterDelta: number | null
    credentialExpiryDeltaDays: number | null
    worsening: boolean
    improving: boolean
  }
  evidence: PortfolioEvidenceEnvelope
  reliance: EvidenceRelianceDecision
  mayReconnectAutomatically: false
  mayReplayDeadLettersAutomatically: false
  mayExposeCredentials: false
}

export function evaluateConnectorHealth(
  input: ConnectorHealthInput,
  intent: PortfolioRelianceIntent = "read",
): ConnectorHealthResult {
  assertPortfolioAccess({
    trustedOrganizationId: input.trustedOrganizationId,
    evidenceOrganizationId: input.organizationId,
    actorAuthorized: input.actorAuthorized,
    correlationId: input.correlationId,
  })
  if (!input.connectorId.trim() || !input.connectorKind.trim()) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      "Connector identity and kind are required.",
      input.correlationId,
    )
  }
  if (!Number.isFinite(input.freshnessSlaMinutes) || input.freshnessSlaMinutes <= 0) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      "Connector freshness SLA must be a positive number of minutes.",
      input.correlationId,
    )
  }
  for (const [field, value] of [
    ["gapCount", input.gapCount],
    ["duplicateCount", input.duplicateCount],
    ["deadLetterCount", input.deadLetterCount],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new PortfolioControlError(
        "VALIDATION_FAILED",
        `Connector ${field} must be a non-negative integer.`,
        input.correlationId,
      )
    }
  }

  const evaluatedAt = validDate(input.evaluatedAt, "evaluatedAt", input.correlationId)
  const observedAt = validDate(input.observedAt, "observedAt", input.correlationId)
  const lastSync = input.lastSuccessfulSyncAt
    ? validDate(input.lastSuccessfulSyncAt, "lastSuccessfulSyncAt", input.correlationId)
    : null
  const credentialExpiry = input.credentialExpiresAt
    ? validDate(input.credentialExpiresAt, "credentialExpiresAt", input.correlationId)
    : null
  const previousCredentialExpiry = input.previousCredentialExpiresAt
    ? validDate(input.previousCredentialExpiresAt, "previousCredentialExpiresAt", input.correlationId)
    : null
  const credentialWarningWindowDays = input.credentialWarningWindowDays ?? 14
  if (
    !Number.isInteger(credentialWarningWindowDays) ||
    credentialWarningWindowDays < 0 ||
    credentialWarningWindowDays > 180
  ) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      "Connector credential warning window must be between 0 and 180 days.",
      input.correlationId,
    )
  }
  const previousGapCount = validateOptionalCount(
    input.previousGapCount,
    "previousGapCount",
    input.correlationId,
  )
  const previousDeadLetterCount = validateOptionalCount(
    input.previousDeadLetterCount,
    "previousDeadLetterCount",
    input.correlationId,
  )
  const ageMinutes = lastSync
    ? Math.max(0, Math.floor((evaluatedAt.getTime() - lastSync.getTime()) / 60_000))
    : null
  const daysUntilExpiry = credentialExpiry
    ? Math.floor((credentialExpiry.getTime() - evaluatedAt.getTime()) / 86_400_000)
    : null
  const credentialExpired = credentialExpiry ? credentialExpiry <= evaluatedAt : false
  const credentialWarning =
    !credentialExpired &&
    daysUntilExpiry !== null &&
    daysUntilExpiry <= credentialWarningWindowDays
  const gapDelta = previousGapCount === null ? null : input.gapCount - previousGapCount
  const deadLetterDelta =
    previousDeadLetterCount === null ? null : input.deadLetterCount - previousDeadLetterCount
  const credentialExpiryDeltaDays =
    credentialExpiry && previousCredentialExpiry
      ? Math.floor((credentialExpiry.getTime() - previousCredentialExpiry.getTime()) / 86_400_000)
      : null
  const driftWorsening =
    (gapDelta !== null && gapDelta > 0) ||
    (deadLetterDelta !== null && deadLetterDelta > 0) ||
    (credentialExpiryDeltaDays !== null && credentialExpiryDeltaDays < 0)
  const driftImproving =
    (gapDelta !== null && gapDelta < 0) ||
    (deadLetterDelta !== null && deadLetterDelta < 0) ||
    (credentialExpiryDeltaDays !== null && credentialExpiryDeltaDays > 0)
  const reasons: string[] = []
  const findings: ConnectorHealthFinding[] = []
  let freshness: PortfolioEvidenceEnvelope["freshness"] = "fresh"
  let state: ConnectorHealthResult["state"] = "HEALTHY"

  if (!lastSync) addFinding(findings, "NO_SUCCESSFUL_SYNC", "blocking", "No successful connector synchronization is recorded.")
  if (ageMinutes !== null && ageMinutes > input.freshnessSlaMinutes) {
    addFinding(findings, "FRESHNESS_SLA_BREACH", "blocking", "Connector data is outside its approved freshness SLA.")
  }
  if (credentialExpired) {
    addFinding(findings, "CREDENTIAL_EXPIRED", "blocking", "Connector credential is expired.")
  }
  if (credentialWarning) {
    addFinding(findings, "CREDENTIAL_EXPIRING_SOON", "warning", "Connector credential expires within its warning window.")
  }
  if (credentialExpiryDeltaDays !== null && credentialExpiryDeltaDays < 0) {
    addFinding(findings, "CREDENTIAL_EXPIRY_DRIFT", "warning", "Connector credential expiry moved earlier than the last trusted baseline.")
  }
  if (input.signatureValid === false) addFinding(findings, "SIGNATURE_INVALID", "blocking", "Provider signature validation failed.")
  if (input.schemaDriftDetected) addFinding(findings, "SCHEMA_DRIFT", "blocking", "Provider schema drift is detected.")
  if (input.gapCount > 0) addFinding(findings, "EVENT_GAPS", "blocking", "Connector event gaps are detected.")
  if (gapDelta !== null && gapDelta > 0) {
    addFinding(findings, "EVENT_GAP_DRIFT", "blocking", "Connector event gaps increased since the last trusted baseline.")
  }
  if (input.duplicateCount > 0) addFinding(findings, "DUPLICATE_EVENTS", "warning", "Duplicate provider events require review.")
  if (input.deadLetterCount > 0) addFinding(findings, "DEAD_LETTER_EVENTS", "warning", "Dead-letter events require review.")
  if (deadLetterDelta !== null && deadLetterDelta > 0) {
    addFinding(findings, "DEAD_LETTER_DRIFT", "warning", "Dead-letter events increased since the last trusted baseline.")
  }

  reasons.push(...findings.map((finding) => finding.message))

  if (findings.some((finding) => finding.severity === "blocking")) {
    state = "BLOCKED"
    freshness = lastSync && ageMinutes !== null ? "stale" : "unknown"
  } else if (findings.length > 0) {
    state = "DEGRADED"
    freshness = "partial"
  }

  const evidence = createPortfolioEvidenceEnvelope(
    {
      organizationId: input.organizationId,
      subjectType: "connector.health",
      subjectId: input.connectorId,
      sourceSystem: input.connectorKind,
      sourceReference: input.sourceReference,
      sourceHash: input.sourceHash,
      capturedAt: input.evaluatedAt,
      observedAt: observedAt.toISOString(),
      freshness,
      evidenceGrade: state === "BLOCKED" ? "blocked" : input.evidenceGrade,
      available: state !== "BLOCKED",
      confidence: null,
      reviewerId: null,
      reviewedAt: null,
      retentionClass: "connector-operational-evidence",
      redactedFields: [],
      transformations: [],
    },
    input.correlationId,
  )

  return {
    organizationId: input.organizationId,
    connectorId: input.connectorId,
    connectorKind: input.connectorKind,
    state,
    reasons,
    findings,
    ageMinutes,
    risk: scoreRisk(findings),
    credential: {
      expiresAt: credentialExpiry ? credentialExpiry.toISOString() : null,
      daysUntilExpiry,
      warningWindowDays: credentialWarningWindowDays,
      warning: credentialWarning,
      expired: credentialExpired,
    },
    drift: {
      gapDelta,
      deadLetterDelta,
      credentialExpiryDeltaDays,
      worsening: driftWorsening,
      improving: driftImproving,
    },
    evidence,
    reliance: decideEvidenceReliance(evidence, intent),
    mayReconnectAutomatically: false,
    mayReplayDeadLettersAutomatically: false,
    mayExposeCredentials: false,
  }
}

function addFinding(
  findings: ConnectorHealthFinding[],
  code: ConnectorHealthFindingCode,
  severity: ConnectorHealthFinding["severity"],
  message: string,
) {
  findings.push({ code, severity, message })
}

function validateOptionalCount(value: number | null | undefined, field: string, correlationId: string) {
  if (value === null || value === undefined) return null
  if (!Number.isInteger(value) || value < 0) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      `Connector ${field} must be a non-negative integer when provided.`,
      correlationId,
    )
  }
  return value
}

function scoreRisk(findings: ConnectorHealthFinding[]): ConnectorHealthResult["risk"] {
  const score = findings.reduce((total, finding) => {
    if (finding.severity === "blocking") return total + 40
    if (finding.code === "CREDENTIAL_EXPIRING_SOON") return total + 15
    return total + 10
  }, 0)
  const bounded = Math.min(100, score)
  if (bounded >= 80) return { level: "CRITICAL", score: bounded }
  if (bounded >= 40) return { level: "HIGH", score: bounded }
  if (bounded > 0) return { level: "MEDIUM", score: bounded }
  return { level: "LOW", score: 0 }
}

function validDate(value: string, field: string, correlationId: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new PortfolioControlError(
      "VALIDATION_FAILED",
      `Connector ${field} must be a valid timestamp.`,
      correlationId,
    )
  }
  return parsed
}
