import "server-only"

import {
  applyFieldRedactions,
  evaluateRedaction,
  getRedactionPolicy,
  type AppliedRedaction,
  type SensitiveFieldCategory,
} from "@/services/security/redaction-policy.service"

import type { AgentExecutionContext } from "./agent-contracts"

export type AgentRedactionField = {
  field: string
  category: SensitiveFieldCategory
}

export type AgentRedactionResult<T extends Record<string, unknown>> = {
  data: T
  redactions: AppliedRedaction[]
  notices: string[]
}

export function redactBeforeAgentPrompt<T extends Record<string, unknown>>(input: {
  data: T
  fields: readonly AgentRedactionField[]
  context: AgentExecutionContext
  hasFreshAuth?: boolean
  consentGranted?: boolean
}): AgentRedactionResult<T> {
  return applyAgentRedactionBoundary(input)
}

export function redactBeforeAgentOutput<T extends Record<string, unknown>>(input: {
  data: T
  fields: readonly AgentRedactionField[]
  context: AgentExecutionContext
  hasFreshAuth?: boolean
  consentGranted?: boolean
}): AgentRedactionResult<T> {
  return applyAgentRedactionBoundary(input)
}

function applyAgentRedactionBoundary<T extends Record<string, unknown>>(input: {
  data: T
  fields: readonly AgentRedactionField[]
  context: AgentExecutionContext
  hasFreshAuth?: boolean
  consentGranted?: boolean
}): AgentRedactionResult<T> {
  const decisions = input.fields.map(({ field, category }) => {
    const policy = getRedactionPolicy(category)
    return evaluateRedaction({
      field,
      category,
      actorPermissions: input.context.permissions,
      moduleDecision: policy.moduleSlug
        ? input.context.moduleDecisions[policy.moduleSlug]
        : null,
      hasFreshAuth: input.hasFreshAuth,
      consentGranted: input.consentGranted,
    })
  })
  const applied = applyFieldRedactions(input.data, decisions)
  return {
    ...applied,
    notices: decisions
      .filter((decision) => !decision.allowed)
      .map((decision) => decision.safeMessage),
  }
}

