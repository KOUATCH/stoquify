import "server-only";

import { createHash } from "node:crypto";

import { db } from "@/prisma/db";
import {
  ApplicationError,
  BusinessRuleError,
} from "@/services/_shared/action-errors";

import type {
  AgentEvidenceRecord,
  AgentExecutionContext,
  AgentRunReceipt,
  AgentToolExecutionResult,
  AgentToolInvocation,
} from "./agent-contracts";
import { agentExecutionFailureCode } from "./agent-execution-control.service";
import { isAgentPolicyError } from "./agent-policy.service";
import {
  AgentToolRegistry,
  agentToolRegistry,
} from "./agent-tool-registry.service";

type StoredRun = { id: string };
type StoredStep = { id: string };
export type AgentRunProvenance = {
  agentDefinitionId: string;
  skillKey: string;
  skillVersion: number;
  promptHash: string;
};

export type AgentRunStore = {
  createRun(input: {
    organizationId: string;
    actorId: string;
    agentKey: string;
    sourceRoute: string;
    locale: string;
    currency: string;
    periodStart: Date | null;
    periodEnd: Date | null;
    correlationId: string;
    startedAt: Date;
    provenance: AgentRunProvenance;
  }): Promise<StoredRun>;
  createStep(input: {
    runId: string;
    stepNumber: number;
    kind: "CONTEXT" | "TOOL" | "POLICY";
    toolKey: string | null;
    status: "RUNNING" | "COMPLETED" | "BLOCKED";
    inputHash: string | null;
    safeSummary: string | null;
    startedAt: Date;
    completedAt?: Date | null;
  }): Promise<StoredStep>;
  completeStep(input: {
    stepId: string;
    status: "COMPLETED" | "FAILED" | "BLOCKED";
    outputHash: string | null;
    safeSummary: string;
    errorCode: string | null;
    completedAt: Date;
  }): Promise<void>;
  createEvidence(input: {
    runId: string;
    stepId: string;
    evidence: readonly AgentEvidenceRecord[];
  }): Promise<number>;
  createPolicyIncident(input: {
    runId: string;
    organizationId: string;
    actorId: string;
    incidentType: string;
    policyKey: string;
    blockedToolKey: string;
    safeSummary: string;
  }): Promise<void>;
  completeRun(input: {
    runId: string;
    status: "COMPLETED" | "FAILED" | "BLOCKED";
    safeSummary: string;
    failureCode: string | null;
    completedAt: Date;
  }): Promise<void>;
};

export type RunDeterministicAgentInput = {
  context: AgentExecutionContext;
  correlationId: string;
  provenance: AgentRunProvenance;
  invocations: readonly AgentToolInvocation[];
  executeTool: (input: {
    toolKey: string;
    toolInput: Record<string, unknown>;
    context: AgentExecutionContext;
  }) => Promise<AgentToolExecutionResult>;
};

type RunnerDependencies = {
  registry: AgentToolRegistry;
  store: AgentRunStore;
  now: () => Date;
};

export const prismaAgentRunStore: AgentRunStore = {
  createRun: (input) =>
    db.agentRun.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        agentKey: input.agentKey,
        status: "RUNNING",
        sourceRoute: input.sourceRoute,
        locale: input.locale,
        currency: input.currency,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        correlationId: input.correlationId,
        startedAt: input.startedAt,
        agentDefinitionId: input.provenance.agentDefinitionId,
        skillKey: input.provenance.skillKey,
        skillVersion: input.provenance.skillVersion,
        promptHash: input.provenance.promptHash,
      },
      select: { id: true },
    }),
  createStep: (input) =>
    db.agentStep.create({
      data: {
        runId: input.runId,
        stepNumber: input.stepNumber,
        kind: input.kind,
        toolKey: input.toolKey,
        status: input.status,
        inputHash: input.inputHash,
        safeSummary: input.safeSummary,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
      },
      select: { id: true },
    }),
  completeStep: async (input) => {
    await db.agentStep.update({
      where: { id: input.stepId },
      data: {
        status: input.status,
        outputHash: input.outputHash,
        safeSummary: input.safeSummary,
        errorCode: input.errorCode,
        completedAt: input.completedAt,
      },
    });
  },
  createEvidence: async (input) => {
    if (input.evidence.length === 0) return 0;
    const result = await db.agentEvidenceLink.createMany({
      data: input.evidence.map((item) => ({
        runId: input.runId,
        stepId: input.stepId,
        subjectType: item.subjectType,
        subjectId: item.subjectId,
        sourceModule: item.sourceModule,
        sourceTable: item.sourceTable,
        sourceHash: item.sourceHash,
        evidenceGrade: item.evidenceGrade,
        freshness: item.freshness.toUpperCase() as Uppercase<
          typeof item.freshness
        >,
        available: item.available,
        blockerCount: item.blockerCount,
        redactionCount: item.redactionCount,
      })),
    });
    return result.count;
  },
  createPolicyIncident: async (input) => {
    await db.agentPolicyIncident.create({
      data: {
        runId: input.runId,
        organizationId: input.organizationId,
        actorId: input.actorId,
        incidentType: input.incidentType,
        severity: "HIGH",
        policyKey: input.policyKey,
        blockedToolKey: input.blockedToolKey,
        safeSummary: input.safeSummary,
        status: "OPEN",
      },
    });
  },
  completeRun: async (input) => {
    await db.agentRun.update({
      where: { id: input.runId },
      data: {
        status: input.status,
        safeSummary: input.safeSummary,
        failureCode: input.failureCode,
        completedAt: input.completedAt,
      },
    });
  },
};

const DEFAULT_DEPENDENCIES: RunnerDependencies = {
  registry: agentToolRegistry,
  store: prismaAgentRunStore,
  now: () => new Date(),
};

export async function runDeterministicAgent(
  input: RunDeterministicAgentInput,
  dependencies: RunnerDependencies = DEFAULT_DEPENDENCIES,
): Promise<AgentRunReceipt> {
  const correlationId = input.correlationId.trim();
  if (!correlationId) {
    throw new BusinessRuleError("Agent correlation ID is required.");
  }

  const startedAt = dependencies.now();
  const run = await dependencies.store.createRun({
    organizationId: input.context.organizationId,
    actorId: input.context.actorId,
    agentKey: input.context.requestedAgentKey,
    sourceRoute: input.context.sourceRoute,
    locale: input.context.locale,
    currency: input.context.currency,
    periodStart: input.context.periodStart,
    periodEnd: input.context.periodEnd,
    correlationId,
    startedAt,
    provenance: input.provenance,
  });

  const contextCompletedAt = dependencies.now();
  await dependencies.store.createStep({
    runId: run.id,
    stepNumber: 0,
    kind: "CONTEXT",
    toolKey: null,
    status: "COMPLETED",
    inputHash: hashAgentPayload({
      organizationId: input.context.organizationId,
      actorId: input.context.actorId,
      permissions: input.context.permissions,
      modules: Object.keys(input.context.moduleDecisions),
    }),
    safeSummary: `Trusted context resolved for ${Object.keys(input.context.moduleDecisions).length} module(s).`,
    startedAt,
    completedAt: contextCompletedAt,
  });

  let completedStepCount = 1;
  let evidenceLinkCount = 0;
  const summaries: string[] = [];

  for (const [index, invocation] of input.invocations.entries()) {
    const stepNumber = index + 1;
    const stepStartedAt = dependencies.now();

    try {
      dependencies.registry.authorize(input.context, invocation.toolKey);
    } catch (error) {
      if (!isAgentPolicyError(error)) {
        if (error instanceof ApplicationError) throw error;
        throw new ApplicationError(
          "INTERNAL_ERROR",
          "Agent tool authorization failed safely.",
          500,
          false,
        );
      }

      const safeSummary = `Agent policy blocked tool ${invocation.toolKey}.`;
      await dependencies.store.createStep({
        runId: run.id,
        stepNumber,
        kind: "POLICY",
        toolKey: invocation.toolKey,
        status: "BLOCKED",
        inputHash: hashAgentPayload(invocation.input),
        safeSummary,
        startedAt: stepStartedAt,
        completedAt: dependencies.now(),
      });
      await dependencies.store.createPolicyIncident({
        runId: run.id,
        organizationId: input.context.organizationId,
        actorId: input.context.actorId,
        incidentType: "TOOL_POLICY_DENIAL",
        policyKey: error.code,
        blockedToolKey: invocation.toolKey,
        safeSummary,
      });
      await dependencies.store.completeRun({
        runId: run.id,
        status: "BLOCKED",
        safeSummary,
        failureCode: error.code,
        completedAt: dependencies.now(),
      });
      return {
        runId: run.id,
        correlationId,
        status: "blocked",
        completedStepCount,
        evidenceLinkCount,
        safeSummary,
        failureCode: error.code,
      };
    }

    const step = await dependencies.store.createStep({
      runId: run.id,
      stepNumber,
      kind: "TOOL",
      toolKey: invocation.toolKey,
      status: "RUNNING",
      inputHash: hashAgentPayload(invocation.input),
      safeSummary: null,
      startedAt: stepStartedAt,
    });

    try {
      const result = await input.executeTool({
        toolKey: invocation.toolKey,
        toolInput: invocation.input,
        context: input.context,
      });
      const safeSummary = normalizeSafeSummary(result.safeSummary);
      await dependencies.store.completeStep({
        stepId: step.id,
        status: "COMPLETED",
        outputHash: hashAgentPayload(result.output),
        safeSummary,
        errorCode: null,
        completedAt: dependencies.now(),
      });
      evidenceLinkCount += await dependencies.store.createEvidence({
        runId: run.id,
        stepId: step.id,
        evidence: result.evidence,
      });
      summaries.push(safeSummary);
      completedStepCount += 1;
    } catch (error) {
      const failureCode =
        agentExecutionFailureCode(error) ?? "TOOL_EXECUTION_FAILED";
      const safeSummary = `Agent tool ${invocation.toolKey} failed safely.`;
      await dependencies.store.completeStep({
        stepId: step.id,
        status: "FAILED",
        outputHash: null,
        safeSummary,
        errorCode: failureCode,
        completedAt: dependencies.now(),
      });
      await dependencies.store.completeRun({
        runId: run.id,
        status: "FAILED",
        safeSummary,
        failureCode,
        completedAt: dependencies.now(),
      });
      return {
        runId: run.id,
        correlationId,
        status: "failed",
        completedStepCount,
        evidenceLinkCount,
        safeSummary,
        failureCode,
      };
    }
  }

  const safeSummary = summaries.length
    ? normalizeSafeSummary(summaries.join(" "))
    : "Deterministic agent run completed without tool invocations.";
  await dependencies.store.completeRun({
    runId: run.id,
    status: "COMPLETED",
    safeSummary,
    failureCode: null,
    completedAt: dependencies.now(),
  });

  return {
    runId: run.id,
    correlationId,
    status: "completed",
    completedStepCount,
    evidenceLinkCount,
    safeSummary,
    failureCode: null,
  };
}

export function hashAgentPayload(value: unknown) {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function normalizeSafeSummary(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "Agent step completed without a displayable summary.";
  return normalized.slice(0, 500);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
