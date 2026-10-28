import "server-only"

import { db } from "@/prisma/db"

import type { CommandAgentFeedbackKind } from "./command-agent-contracts"

export class AgentFeedbackError extends Error {
  constructor(
    public readonly code: "RUN_NOT_FOUND" | "FEEDBACK_WRITE_FAILED",
    message: string,
  ) {
    super(message)
    this.name = "AgentFeedbackError"
  }
}

export async function recordCommandAgentFeedback(input: {
  runId: string
  organizationId: string
  actorId: string
  kind: CommandAgentFeedbackKind
}) {
  return db.$transaction(async (tx) => {
    const run = await tx.agentRun.findFirst({
      where: {
        id: input.runId,
        organizationId: input.organizationId,
        actorId: input.actorId,
        agentKey: "command-agent",
      },
      select: { id: true },
    })
    if (!run) {
      throw new AgentFeedbackError("RUN_NOT_FOUND", "The Command Agent run is not available.")
    }

    const feedback = feedbackData(input.kind)
    const record = await tx.agentFeedback.upsert({
      where: { runId_actorId: { runId: input.runId, actorId: input.actorId } },
      create: {
        runId: input.runId,
        organizationId: input.organizationId,
        actorId: input.actorId,
        ...feedback,
      },
      update: feedback,
      select: { id: true, createdAt: true },
    })
    return { feedbackId: record.id, recordedAt: record.createdAt.toISOString() }
  })
}

function feedbackData(kind: CommandAgentFeedbackKind) {
  return {
    helpful: kind === "helpful" ? true : kind === "not_helpful" ? false : null,
    accepted: null,
    rejectedReason: kind === "not_helpful" ? "NOT_HELPFUL" : null,
    staleAnswer: kind === "stale",
    wrongAnswer: kind === "wrong",
    unsafeAttempt: kind === "unsafe",
    correctionText: null,
  }
}
