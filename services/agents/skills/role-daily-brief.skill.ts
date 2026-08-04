import "server-only"

import type { AgentExecutionContext } from "../agent-contracts"
import {
  commandDailyBriefSchema,
  type CommandDailyBrief,
} from "../command-agent-contracts"
import {
  validateAndRedactCommandBrief,
} from "../agent-output-validator.service"
import type { RoleDigestProjection } from "../tools/command-tool-adapters"

export function buildRoleDailyBrief(input: {
  projection: RoleDigestProjection
  context: AgentExecutionContext
}): { brief: CommandDailyBrief; redactionCount: number } {
  const draft = commandDailyBriefSchema.parse({
    kind: "stoquify.command-agent.daily-brief.v1",
    ...input.projection,
    priorities: [...input.projection.priorities]
      .sort((left, right) => severityScore(right.severity) - severityScore(left.severity))
      .slice(0, 5),
    provenance: {
      tenantId: input.context.organizationId,
      tenantName: input.context.organizationName,
      periodStart: input.projection.periodStart,
      periodEnd: input.projection.periodEnd,
      asOf: input.projection.generatedAt,
      sourceCount: input.projection.evidence.length,
    },
    runId: null,
  })

  return validateAndRedactCommandBrief({ brief: draft, context: input.context })
}

function severityScore(value: CommandDailyBrief["priorities"][number]["severity"]) {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[value]
}
