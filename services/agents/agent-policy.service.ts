import "server-only"

import {
  hasRbacPermission,
  isKnownPermission,
} from "@/lib/security/rbac-permissions"

import type { AgentExecutionContext, AgentToolDefinition } from "./agent-contracts"

export type AgentPolicyErrorCode =
  | "UNKNOWN_TOOL"
  | "UNKNOWN_PERMISSION"
  | "PROHIBITED_TOOL"
  | "WRITE_TOOL_NOT_ALLOWED"
  | "MISSING_PERMISSION"
  | "MODULE_NOT_EVALUATED"
  | "MODULE_NOT_ENTITLED"

export class AgentPolicyError extends Error {
  constructor(
    public readonly code: AgentPolicyErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "AgentPolicyError"
  }
}

export const PROHIBITED_AGENT_TOOL_PATTERNS = [
  /prisma/i,
  /ledger.*post|post.*ledger/i,
  /journal.*post|post.*journal/i,
  /statutory.*fil|fil.*statutory/i,
  /payroll.*approv|approv.*payroll/i,
  /close.*certif|certif.*close/i,
  /cash.*adjust|adjust.*cash/i,
  /stock.*write.?off|write.?off.*stock/i,
  /stock.*adjust|adjust.*stock/i,
  /permission.*(change|grant|revoke)|(change|grant|revoke).*permission/i,
  /role.*(change|grant|revoke)|(change|grant|revoke).*role/i,
  /entitlement.*(change|grant|revoke)|(change|grant|revoke).*entitlement/i,
] as const

export function assertAgentToolDefinitionSafe(tool: AgentToolDefinition) {
  if (PROHIBITED_AGENT_TOOL_PATTERNS.some((pattern) => pattern.test(tool.key))) {
    throw new AgentPolicyError("PROHIBITED_TOOL", `Agent tool ${tool.key} is prohibited.`)
  }
  if (tool.toolType !== "read_only" || tool.riskLevel !== "read_only") {
    throw new AgentPolicyError(
      "WRITE_TOOL_NOT_ALLOWED",
      `Phase 1 agent tool ${tool.key} must be read-only.`,
    )
  }
  if (!isKnownPermission(tool.requiredPermission)) {
    throw new AgentPolicyError(
      "UNKNOWN_PERMISSION",
      `Agent tool ${tool.key} uses an unknown permission.`,
    )
  }
  return tool
}

export function assertAgentToolAllowed(
  context: AgentExecutionContext,
  tool: AgentToolDefinition,
) {
  assertAgentToolDefinitionSafe(tool)

  if (!hasRbacPermission(context.permissions, tool.requiredPermission)) {
    throw new AgentPolicyError(
      "MISSING_PERMISSION",
      `Actor cannot use agent tool ${tool.key}.`,
    )
  }

  const moduleDecision = context.moduleDecisions[tool.moduleSlug]
  if (!moduleDecision) {
    throw new AgentPolicyError(
      "MODULE_NOT_EVALUATED",
      `Module ${tool.moduleSlug} was not evaluated for this agent run.`,
    )
  }
  if (!moduleDecision.allowed || moduleDecision.wouldBlock) {
    throw new AgentPolicyError(
      "MODULE_NOT_ENTITLED",
      `Module ${tool.moduleSlug} is unavailable for this agent run.`,
    )
  }

  return tool
}

export function isAgentPolicyError(error: unknown): error is AgentPolicyError {
  return error instanceof AgentPolicyError
}

