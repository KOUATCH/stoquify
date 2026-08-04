import { z } from "zod"

import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"

import type { AgentFreshness, AgentRunReceipt } from "./agent-contracts"

export const COMMAND_AGENT_KEY = "command-agent"
export const ROLE_DAILY_BRIEF_SKILL_KEY = "role-daily-brief"
export const ROLE_DAILY_BRIEF_SKILL_VERSION = 1
export const READ_ROLE_DAILY_DIGEST_TOOL_KEY = "readRoleDailyDigest"
export const ROLE_DAILY_BRIEF_PROMPT_HASH =
  "sha256:4f70962e7461bbac84276c74928f4877616afcb4a97c647e9d3d629e452e3e55"

export const commandAgentRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    digestId: z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/),
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional(),
  })
  .strict()

export type CommandAgentRequest = z.infer<typeof commandAgentRequestSchema>

export const commandAgentEvidenceSchema = z
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
  .strict()

export const commandAgentPrioritySchema = z
  .object({
    id: z.string().min(1).max(180),
    title: z.string().min(1).max(180),
    detail: z.string().min(1).max(500),
    severity: z.enum(["info", "low", "medium", "high", "critical"]),
    href: z.string().startsWith("/dashboard/").max(300),
    requiredPermission: z.string().min(1).max(120),
    evidenceIds: z.array(z.string().min(1).max(180)).min(1).max(12),
  })
  .strict()

export const commandDailyBriefSchema = z
  .object({
    kind: z.literal("stoquify.command-agent.daily-brief.v1"),
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
    priorities: z.array(commandAgentPrioritySchema).max(5),
    evidence: z.array(commandAgentEvidenceSchema).min(1).max(12),
    limitations: z.array(z.string().min(1).max(300)).max(12),
    redactionNotices: z.array(z.string().min(1).max(300)).max(12),
    provenance: z
      .object({
        tenantId: z.string().min(1).max(191),
        tenantName: z.string().min(1).max(180).nullable(),
        periodStart: z.string().datetime(),
        periodEnd: z.string().datetime(),
        asOf: z.string().datetime(),
        sourceCount: z.number().int().min(1).max(12),
      })
      .strict(),
    runId: z.string().nullable(),
  })
  .strict()

export type CommandDailyBrief = z.infer<typeof commandDailyBriefSchema>

export type CommandAgentSurfaceReason =
  | "available"
  | "disabled"
  | "shadow"
  | "kill_switch"
  | "organization_not_allowed"
  | "role_not_allowed"
  | "permission_denied"

export type CommandAgentSurfaceAccess = {
  mode: "off" | "shadow" | "internal"
  canRun: boolean
  canRender: boolean
  reason: CommandAgentSurfaceReason
}

export type CommandAgentRunResult = {
  access: CommandAgentSurfaceAccess
  receipt: AgentRunReceipt
  brief: CommandDailyBrief | null
  skill: {
    key: typeof ROLE_DAILY_BRIEF_SKILL_KEY
    version: typeof ROLE_DAILY_BRIEF_SKILL_VERSION
    promptHash: typeof ROLE_DAILY_BRIEF_PROMPT_HASH
  }
}

export type CommandAgentFeedbackKind = "helpful" | "not_helpful" | "stale" | "wrong" | "unsafe"

export const commandAgentFeedbackSchema = z
  .object({
    runId: z.string().cuid(),
    kind: z.enum(["helpful", "not_helpful", "stale", "wrong", "unsafe"]),
  })
  .strict()

export function normalizeCommandFreshness(value: string): AgentFreshness {
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

export function normalizeCommandEvidenceGrade(value: string): EvidenceGrade {
  if (
    value === "raw" ||
    value === "operational" ||
    value === "posted" ||
    value === "reconciled" ||
    value === "certified" ||
    value === "blocked"
  ) {
    return value
  }
  return "blocked"
}
