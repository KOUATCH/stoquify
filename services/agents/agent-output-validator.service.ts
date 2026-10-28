import "server-only"

import type { AgentExecutionContext } from "./agent-contracts"
import {
  commandDailyBriefSchema,
  type CommandDailyBrief,
} from "./command-agent-contracts"
import {
  redactBeforeAgentOutput,
  type AgentRedactionField,
} from "./agent-redaction.service"

const SENSITIVE_TEXT_PATTERNS = [
  /\bsk-[a-z0-9_-]{12,}\b/gi,
  /\bbearer\s+[a-z0-9._~+\/-]{12,}\b/gi,
  /\b(?:password|secret|api[_ -]?key)\s*[:=]\s*[^\s,;]+/gi,
  /\b(?:provider[_ -]?reference|bank[_ -]?account|account[_ -]?number|payroll[_ -]?(?:person|employee))\s*[:=]\s*[^\s,;]+/gi,
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
] as const

export class AgentOutputValidationError extends Error {
  constructor(
    public readonly code: "INVALID_OUTPUT" | "UNCITED_CLAIM",
    message: string,
  ) {
    super(message)
    this.name = "AgentOutputValidationError"
  }
}

export function validateAndRedactCommandBrief(input: {
  brief: CommandDailyBrief
  context: AgentExecutionContext
}): { brief: CommandDailyBrief; redactionCount: number } {
  const parsed = commandDailyBriefSchema.safeParse(input.brief)
  if (!parsed.success) {
    throw new AgentOutputValidationError("INVALID_OUTPUT", "Command Agent output failed schema validation.")
  }

  const evidenceIds = new Set(parsed.data.evidence.map((item) => item.id))
  for (const priority of parsed.data.priorities) {
    if (priority.evidenceIds.some((evidenceId) => !evidenceIds.has(evidenceId))) {
      throw new AgentOutputValidationError(
        "UNCITED_CLAIM",
        "Command Agent output contains a priority without valid evidence.",
      )
    }
  }

  let policyRedactionCount = 0
  const evidence = parsed.data.evidence.map((item) => {
    const result = redactBeforeAgentOutput({
      data: item,
      fields: item.sourceHash ? [{ field: "sourceHash", category: "proof_hidden_identifier" }] : [],
      context: input.context,
    })
    policyRedactionCount += result.redactions.length
    return result.data
  })
  const priorities = parsed.data.priorities.map((priority) => {
    const fields: AgentRedactionField[] = []
    if (priority.requiredPermission.startsWith("payments.")) {
      fields.push({ field: "detail", category: "reconciliation_suspense_detail" })
    }
    if (priority.requiredPermission.startsWith("payroll.")) {
      fields.push({ field: "detail", category: "payroll_person_amount" })
    }
    const result = redactBeforeAgentOutput({ data: priority, fields, context: input.context })
    policyRedactionCount += result.redactions.length
    return result.data
  })
  const canaryRedacted = redactSensitiveStrings({ ...parsed.data, evidence, priorities })
  const finalBrief = commandDailyBriefSchema.safeParse(canaryRedacted.value)
  if (!finalBrief.success) {
    throw new AgentOutputValidationError("INVALID_OUTPUT", "Redacted Command Agent output is invalid.")
  }

  return {
    brief: finalBrief.data,
    redactionCount: policyRedactionCount + canaryRedacted.count,
  }
}

function redactSensitiveStrings(value: unknown): { value: unknown; count: number } {
  if (typeof value === "string") {
    let count = 0
    let sanitized = value
    for (const pattern of SENSITIVE_TEXT_PATTERNS) {
      sanitized = sanitized.replace(pattern, () => {
        count += 1
        return "[REDACTED:SENSITIVE]"
      })
    }
    return { value: sanitized, count }
  }
  if (Array.isArray(value)) {
    let count = 0
    const items = value.map((item) => {
      const result = redactSensitiveStrings(item)
      count += result.count
      return result.value
    })
    return { value: items, count }
  }
  if (value && typeof value === "object") {
    let count = 0
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const result = redactSensitiveStrings(item)
      count += result.count
      return [key, result.value]
    })
    return { value: Object.fromEntries(entries), count }
  }
  return { value, count: 0 }
}
