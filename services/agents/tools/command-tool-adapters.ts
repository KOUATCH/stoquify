import "server-only"

import { z } from "zod"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import type { BIDailyDigest, BIKpiState } from "@/services/bi/bi-contracts"
import {
  getDailyHabitDigestData,
} from "@/services/daily-habit/daily-habit-digest.service"
import type { DailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest-contracts"

import type {
  AgentEvidenceRecord,
  AgentExecutionContext,
  AgentToolDefinition,
  AgentToolExecutionResult,
} from "../agent-contracts"
import {
  READ_ROLE_DAILY_DIGEST_TOOL_KEY,
  normalizeCommandFreshness,
} from "../command-agent-contracts"

export const commandRoleDigestInputSchema = z
  .object({
    digestId: z.string().trim().min(1).max(80),
  })
  .strict()

export const roleDigestProjectionSchema = z
  .object({
    digestId: z.string().min(1).max(80),
    audienceRole: z.string().min(1).max(80),
    title: z.string().min(1).max(180),
    summary: z.string().min(1).max(600),
    conclusion: z.string().min(1).max(500),
    generatedAt: z.string().datetime(),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    state: z.enum(["ready", "partial", "stale", "blocked", "failed", "empty"]),
    evidenceGrade: z.enum(["raw", "operational", "posted", "reconciled", "certified", "blocked"]),
    freshness: z.enum(["fresh", "stale", "partial", "blocked", "failed", "empty", "unknown"]),
    priorities: z.array(
      z
        .object({
          id: z.string().min(1).max(180),
          title: z.string().min(1).max(180),
          detail: z.string().min(1).max(500),
          severity: z.enum(["info", "low", "medium", "high", "critical"]),
          href: z.string().startsWith("/dashboard/").max(300),
          requiredPermission: z.string().min(1).max(120),
          evidenceIds: z.array(z.string().min(1).max(180)).min(1).max(12),
        })
        .strict(),
    ).max(5),
    evidence: z.array(
      z
        .object({
          id: z.string().min(1).max(180),
          subjectType: z.string().min(1).max(120),
          subjectId: z.string().min(1).max(240),
          sourceModule: z.string().min(1).max(80),
          sourceHash: z.string().max(180).nullable(),
          evidenceGrade: z.enum(["raw", "operational", "posted", "reconciled", "certified", "blocked"]),
          freshness: z.enum(["fresh", "stale", "partial", "blocked", "failed", "empty", "unknown"]),
          available: z.boolean(),
          blockerCount: z.number().int().min(0),
          redactionCount: z.number().int().min(0),
        })
        .strict(),
    ).min(1).max(12),
    limitations: z.array(z.string().min(1).max(300)).max(12),
    redactionNotices: z.array(z.string().min(1).max(300)).max(12),
  })
  .strict()

export type RoleDigestProjection = z.infer<typeof roleDigestProjectionSchema>

export const COMMAND_AGENT_TOOL_DEFINITIONS = [
  {
    key: READ_ROLE_DAILY_DIGEST_TOOL_KEY,
    description: "Read one permission-filtered Daily Digest role projection.",
    ownerService: "services/daily-habit",
    moduleSlug: "dashboard",
    requiredPermission: "dashboard.read",
    riskLevel: "read_only",
    toolType: "read_only",
    inputSchemaHash: "agent-schema:role-daily-digest-input:v1",
    outputSchemaHash: "agent-schema:role-daily-digest-output:v1",
    evidenceBehavior: "Every priority cites the selected digest provenance; unavailable proof becomes a limitation.",
  },
] as const satisfies readonly AgentToolDefinition[]

type RoleDigestDependencies = {
  loadDigest: typeof getDailyHabitDigestData
}

const DEFAULT_DEPENDENCIES: RoleDigestDependencies = {
  loadDigest: getDailyHabitDigestData,
}

export class CommandToolAdapterError extends Error {
  constructor(
    public readonly code: "INVALID_TOOL_INPUT" | "DIGEST_NOT_AVAILABLE" | "UNAUTHORIZED_DIGEST_FIELD",
    message: string,
  ) {
    super(message)
    this.name = "CommandToolAdapterError"
  }
}

export async function readRoleDailyDigest(
  toolInput: Record<string, unknown>,
  context: AgentExecutionContext,
  dependencies: RoleDigestDependencies = DEFAULT_DEPENDENCIES,
): Promise<AgentToolExecutionResult & { output: RoleDigestProjection }> {
  const parsed = commandRoleDigestInputSchema.safeParse(toolInput)
  if (!parsed.success) {
    throw new CommandToolAdapterError("INVALID_TOOL_INPUT", "The Daily Digest tool input is invalid.")
  }

  const data = await dependencies.loadDigest({
    organizationId: context.organizationId,
    actorId: context.actorId,
    actorPermissions: context.permissions,
    actorRoleCodes: context.roleCodes,
    isSuperUser: context.isSuperUser,
    periodStart: context.periodStart,
    periodEnd: context.periodEnd,
  })
  const digest = data.digests.find((item) => item.id === parsed.data.digestId)
  if (!digest) {
    throw new CommandToolAdapterError(
      "DIGEST_NOT_AVAILABLE",
      "The requested Daily Digest is not available to this role.",
    )
  }

  const output = roleDigestProjectionSchema.parse(projectDigest(data, digest, context))
  return {
    output,
    safeSummary: output.priorities.length
      ? `${output.priorities.length} evidence-backed priority item(s) are ready for review.`
      : "No evidence-backed priority item is due for this digest.",
    evidence: output.evidence.map(toAgentEvidence),
    redactionCount: output.evidence.reduce((total, item) => total + item.redactionCount, 0),
  }
}

function projectDigest(
  data: DailyHabitDigestData,
  digest: BIDailyDigest,
  context: AgentExecutionContext,
): RoleDigestProjection {
  const freshness = normalizeCommandFreshness(digest.commandBrief.freshness.state)
  const provenance = digest.commandBrief.provenance
  const sources = provenance?.sourceModules.length
    ? provenance.sourceModules
    : ["dashboard"]
  const available = digest.commandBrief.evidenceGrade !== "blocked" && freshness !== "blocked"
  const evidence = sources.slice(0, 12).map((sourceModule, index) => ({
    id: `${digest.id}:evidence:${index + 1}`,
    subjectType: "daily-habit.digest",
    subjectId: `${data.organizationId}:${digest.id}:${data.periodStart}:${data.periodEnd}`,
    sourceModule,
    sourceHash: provenance?.sourceHash ?? null,
    evidenceGrade: digest.commandBrief.evidenceGrade,
    freshness,
    available,
    blockerCount: digest.blockers.length,
    redactionCount: digest.redactions.length,
  }))
  const evidenceIds = evidence.map((item) => item.id)
  const priorities = digest.risks
    .filter(
      (risk) =>
        risk.drillThrough.available &&
        hasRbacPermission(context.permissions, risk.drillThrough.requiredPermission),
    )
    .sort((left, right) => right.severityScore - left.severityScore)
    .slice(0, 5)
    .map((risk) => {
      if (!risk.drillThrough.available || !risk.drillThrough.href?.startsWith("/dashboard/")) {
        throw new CommandToolAdapterError(
          "UNAUTHORIZED_DIGEST_FIELD",
          "A Daily Digest priority contains an unsafe source route.",
        )
      }
      return {
        id: risk.id,
        title: risk.title,
        detail: risk.detail,
        severity: risk.severity,
        href: risk.drillThrough.href,
        requiredPermission: risk.drillThrough.requiredPermission,
        evidenceIds,
      }
    })
  const limitations: string[] = []
  if (!available) limitations.push("The selected digest has no currently available supporting evidence.")
  if (freshness === "stale") limitations.push("The selected digest is stale and must be refreshed before reliance.")
  if (freshness === "partial") limitations.push("The selected digest is partial; unavailable sources are not inferred.")
  if (priorities.length === 0) limitations.push("No permitted priority item is due for this role and period.")

  return {
    digestId: digest.id,
    audienceRole: digest.audienceRole,
    title: digest.commandBrief.title,
    summary: digest.commandBrief.summary,
    conclusion: digest.commandBrief.conclusion,
    generatedAt: digest.generatedAt,
    periodStart: digest.periodStart,
    periodEnd: digest.periodEnd,
    state: normalizeState(digest.commandBrief.state),
    evidenceGrade: digest.commandBrief.evidenceGrade,
    freshness,
    priorities,
    evidence,
    limitations,
    redactionNotices: digest.redactions.map((item) => item.reason).filter(Boolean).slice(0, 12),
  }
}

function normalizeState(state: BIKpiState): RoleDigestProjection["state"] {
  if (state === "ready" || state === "partial" || state === "stale" || state === "blocked" || state === "empty") {
    return state
  }
  if (state === "redacted") return "partial"
  return "failed"
}

function toAgentEvidence(
  evidence: RoleDigestProjection["evidence"][number],
): AgentEvidenceRecord {
  return {
    subjectType: evidence.subjectType,
    subjectId: evidence.subjectId,
    sourceModule: evidence.sourceModule,
    sourceTable: null,
    sourceHash: evidence.sourceHash,
    evidenceGrade: evidence.evidenceGrade,
    freshness: evidence.freshness,
    available: evidence.available,
    blockerCount: evidence.blockerCount,
    redactionCount: evidence.redactionCount,
  }
}
