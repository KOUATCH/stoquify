import "server-only"

import { logger } from "@/lib/logger"

export function recordAgentRunMetric(input: {
  organizationId: string
  actorId: string
  runId: string
  agentKey: string
  status: string
  durationMs: number
  toolCount: number
  evidenceCount: number
  redactionCount: number
  denialCode: string | null
  stale: boolean
  replayed: boolean
}) {
  logger.info("agent run metric", {
    operation: "agent.run.completed",
    organizationId: input.organizationId,
    actorId: input.actorId,
    runId: input.runId,
    agentKey: input.agentKey,
    status: input.status,
    durationMs: input.durationMs,
    toolCount: input.toolCount,
    evidenceCount: input.evidenceCount,
    redactionCount: input.redactionCount,
    denialCode: input.denialCode,
    stale: input.stale,
    replayed: input.replayed,
  })
}
