import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type {
  CommercialModuleSlug,
  ModuleEntitlementDecision,
} from "@/services/modules/module-control-contracts"

export const AGENT_RISK_LEVELS = [
  "read_only",
  "draft",
  "low_risk",
  "sensitive",
  "prohibited",
] as const

export type AgentRiskLevel = (typeof AGENT_RISK_LEVELS)[number]
export type AgentToolType = "read_only" | "draft" | "action" | "prohibited"
export type AgentFreshness =
  | "fresh"
  | "stale"
  | "partial"
  | "blocked"
  | "failed"
  | "empty"
  | "unknown"

export type AgentToolDefinition = {
  key: string
  description: string
  ownerService: `services/${string}`
  moduleSlug: CommercialModuleSlug
  requiredPermission: string
  riskLevel: AgentRiskLevel
  toolType: AgentToolType
  inputSchemaHash: string
  outputSchemaHash: string
  evidenceBehavior: string
}

export type AgentExecutionContext = {
  organizationId: string
  organizationName: string | null
  actorId: string
  roleCodes: string[]
  permissions: string[]
  isSuperUser: boolean
  requestedAgentKey: string
  sourceRoute: string
  locale: "en" | "fr"
  currency: string
  periodStart: Date | null
  periodEnd: Date | null
  resolvedAt: string
  moduleDecisions: Partial<Record<CommercialModuleSlug, ModuleEntitlementDecision>>
}

export type AgentEvidenceRecord = {
  subjectType: string
  subjectId: string
  sourceModule: string
  sourceTable: string | null
  sourceHash: string | null
  evidenceGrade: EvidenceGrade
  freshness: AgentFreshness
  available: boolean
  blockerCount: number
  redactionCount: number
}

export type AgentToolExecutionResult = {
  output: unknown
  safeSummary: string
  evidence: AgentEvidenceRecord[]
  redactionCount?: number
}

export type AgentToolInvocation = {
  toolKey: string
  input: Record<string, unknown>
}

export type AgentDeterministicRunStatus = "running" | "completed" | "failed" | "blocked"

export type AgentRunReceipt = {
  runId: string
  correlationId: string
  status: AgentDeterministicRunStatus
  completedStepCount: number
  evidenceLinkCount: number
  safeSummary: string
  failureCode: string | null
}

