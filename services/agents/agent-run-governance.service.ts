import "server-only";

import { db } from "@/prisma/db";
import {
  ConflictError,
  getPrismaKnownRequest,
} from "@/services/_shared/action-errors";

import type { AgentRunReceipt } from "./agent-contracts";

export async function findScopedAgentRunReceipt(input: {
  organizationId: string;
  actorId: string;
  agentKey: string;
  correlationId: string;
}): Promise<AgentRunReceipt | null> {
  const run = await db.agentRun.findFirst({
    where: input,
    select: {
      id: true,
      correlationId: true,
      status: true,
      safeSummary: true,
      failureCode: true,
      _count: { select: { steps: true, evidenceLinks: true } },
    },
  });
  if (!run) return null;
  return {
    runId: run.id,
    correlationId: run.correlationId,
    status: normalizeRunStatus(run.status),
    completedStepCount: run._count.steps,
    evidenceLinkCount: run._count.evidenceLinks,
    safeSummary: run.safeSummary ?? "Agent run is still in progress.",
    failureCode: run.failureCode,
  };
}

export async function recordAgentRunGovernance(input: {
  receipt: AgentRunReceipt;
  organizationId: string;
  actorId: string;
  agentDefinitionId: string;
  skillKey: string;
  skillVersion: number;
  promptHash: string;
  durationMs: number;
  toolCount: number;
  redactionCount: number;
  staleOutput: boolean;
}) {
  const updated = await db.agentRun.updateMany({
    where: {
      id: input.receipt.runId,
      organizationId: input.organizationId,
      actorId: input.actorId,
    },
    data: {
      agentDefinitionId: input.agentDefinitionId,
      skillKey: input.skillKey,
      skillVersion: input.skillVersion,
      promptHash: input.promptHash,
      durationMs: input.durationMs,
      toolCount: input.toolCount,
      evidenceCount: input.receipt.evidenceLinkCount,
      redactionCount: input.redactionCount,
      staleOutput: input.staleOutput,
    },
  });
  if (updated.count !== 1)
    throw new ConflictError("Agent run governance update failed.");
}
export function isAgentRunCorrelationConflict(error: unknown) {
  const prismaError = getPrismaKnownRequest(error);
  if (prismaError?.code !== "P2002") return false;
  const target = prismaError.meta?.target;
  if (Array.isArray(target))
    return target.some((field) => field === "correlationId");
  return String(target ?? "").includes("correlationId");
}

export async function reconcileAbandonedAgentRuns(input: {
  olderThan: Date;
  limit?: number;
}) {
  const candidates = await db.agentRun.findMany({
    where: { status: "RUNNING", startedAt: { lt: input.olderThan } },
    select: { id: true, organizationId: true },
    orderBy: { startedAt: "asc" },
    take: Math.min(Math.max(input.limit ?? 100, 1), 500),
  });
  if (candidates.length === 0) return 0;
  const updated = await db.agentRun.updateMany({
    where: {
      status: "RUNNING",
      OR: candidates.map((run) => ({
        id: run.id,
        organizationId: run.organizationId,
      })),
    },
    data: {
      status: "FAILED",
      failureCode: "RUN_ABANDONED",
      safeSummary:
        "Agent run stopped before completion and was reconciled safely.",
      completedAt: new Date(),
    },
  });
  return updated.count;
}

function normalizeRunStatus(value: string): AgentRunReceipt["status"] {
  if (value === "COMPLETED") return "completed";
  if (value === "BLOCKED") return "blocked";
  if (value === "FAILED" || value === "CANCELLED") return "failed";
  return "running";
}
