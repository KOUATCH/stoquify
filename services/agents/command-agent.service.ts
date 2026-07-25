import "server-only";

import { ApplicationError } from "@/services/_shared/action-errors";

import type {
  AgentRunReceipt,
  AgentToolExecutionResult,
} from "./agent-contracts";
import { resolveAgentExecutionContext } from "./agent-context.service";
import { resolveActiveCommandAgentDefinition } from "./agent-definition.service";
import {
  resolveCommandAgentTimeoutMs,
  withAgentExecutionTimeout,
} from "./agent-execution-control.service";
import { recordAgentRunMetric } from "./agent-metrics.service";
import { authorizeCommandAgentRelease } from "./agent-release-control.service";
import {
  findScopedAgentRunReceipt,
  isAgentRunCorrelationConflict,
  recordAgentRunGovernance,
} from "./agent-run-governance.service";
import {
  prismaAgentRunStore,
  runDeterministicAgent,
} from "./agent-runner.service";
import { resolveCommandAgentRollout } from "./agent-rollout.service";
import { AgentToolRegistry } from "./agent-tool-registry.service";
import {
  COMMAND_AGENT_KEY,
  READ_ROLE_DAILY_DIGEST_TOOL_KEY,
  ROLE_DAILY_BRIEF_PROMPT_HASH,
  ROLE_DAILY_BRIEF_SKILL_KEY,
  ROLE_DAILY_BRIEF_SKILL_VERSION,
  commandAgentRequestSchema,
  type CommandAgentRequest,
  type CommandAgentRunResult,
  type CommandDailyBrief,
} from "./command-agent-contracts";
import { buildRoleDailyBrief } from "./skills/role-daily-brief.skill";
import {
  COMMAND_AGENT_TOOL_DEFINITIONS,
  readRoleDailyDigest,
} from "./tools/command-tool-adapters";

const commandAgentRegistry = new AgentToolRegistry(
  COMMAND_AGENT_TOOL_DEFINITIONS,
);

export class CommandAgentExecutionError extends Error {
  constructor(
    public readonly code:
      | "ROLLOUT_DENIED"
      | "UNSUPPORTED_TOOL"
      | "IDEMPOTENCY_CONFLICT"
      | "RUN_COMPLETED_WITHOUT_BRIEF",
    message: string,
  ) {
    super(message);
    this.name = "CommandAgentExecutionError";
  }
}

export async function runCommandAgent(
  rawRequest: CommandAgentRequest,
): Promise<CommandAgentRunResult> {
  const request = commandAgentRequestSchema.parse(rawRequest);
  const context = await resolveAgentExecutionContext({
    requestedAgentKey: COMMAND_AGENT_KEY,
    sourceRoute: "/dashboard/daily-digest",
    requestedModules: ["dashboard"],
    periodStart: request.periodStart,
    periodEnd: request.periodEnd,
  });
  const access = resolveCommandAgentRollout(context);
  if (!access.canRun || access.mode === "off") {
    throw new CommandAgentExecutionError(
      "ROLLOUT_DENIED",
      "Command Agent is not enabled for this organization and role.",
    );
  }

  const releaseAuthorization = await authorizeCommandAgentRelease({
    organizationId: context.organizationId,
    roleCodes: context.roleCodes,
    rolloutMode: access.mode,
  });
  const definition = await resolveActiveCommandAgentDefinition(
    releaseAuthorization.definitionRolloutMode,
  );
  const existing = await findScopedAgentRunReceipt({
    organizationId: context.organizationId,
    actorId: context.actorId,
    agentKey: COMMAND_AGENT_KEY,
    correlationId: request.requestId,
  });
  if (existing) {
    recordAgentRunMetric({
      organizationId: context.organizationId,
      actorId: context.actorId,
      runId: existing.runId,
      agentKey: COMMAND_AGENT_KEY,
      status: existing.status,
      durationMs: 0,
      toolCount: 0,
      evidenceCount: existing.evidenceLinkCount,
      redactionCount: 0,
      denialCode: existing.failureCode,
      stale: false,
      replayed: true,
    });
    return {
      access,
      receipt: existing,
      brief: null,
      skill: skillIdentity(),
    };
  }

  const startedAt = Date.now();
  const timeoutMs = resolveCommandAgentTimeoutMs();
  const preparedBrief: { value: CommandDailyBrief | null } = { value: null };
  let redactionCount = 0;
  let receipt: AgentRunReceipt;
  try {
    receipt = await runDeterministicAgent(
      {
        context,
        correlationId: request.requestId,
        provenance: {
          agentDefinitionId: definition.agentDefinitionId,
          skillKey: definition.skillKey,
          skillVersion: definition.skillVersion,
          promptHash: definition.promptHash,
        },
        invocations: [
          {
            toolKey: READ_ROLE_DAILY_DIGEST_TOOL_KEY,
            input: { digestId: request.digestId },
          },
        ],
        executeTool: ({ toolKey, toolInput }) =>
          withAgentExecutionTimeout(async () => {
            if (toolKey !== READ_ROLE_DAILY_DIGEST_TOOL_KEY) {
              throw new CommandAgentExecutionError(
                "UNSUPPORTED_TOOL",
                "Command Agent tool is unavailable.",
              );
            }
            const result = await readRoleDailyDigest(toolInput, context);
            const built = buildRoleDailyBrief({
              projection: result.output,
              context,
            });
            redactionCount =
              (result.redactionCount ?? 0) + built.redactionCount;
            preparedBrief.value = built.brief;
            return {
              ...result,
              output: built.brief,
              redactionCount,
            } satisfies AgentToolExecutionResult;
          }, timeoutMs),
      },
      {
        registry: commandAgentRegistry,
        store: prismaAgentRunStore,
        now: () => new Date(),
      },
    );
  } catch (error) {
    if (!isAgentRunCorrelationConflict(error)) {
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Command Agent runtime failed safely.",
        500,
        false,
      );
    }
    const replay = await findScopedAgentRunReceipt({
      organizationId: context.organizationId,
      actorId: context.actorId,
      agentKey: COMMAND_AGENT_KEY,
      correlationId: request.requestId,
    });
    if (!replay) {
      throw new CommandAgentExecutionError(
        "IDEMPOTENCY_CONFLICT",
        "Command Agent request ID is already owned by another trusted scope.",
      );
    }
    recordAgentRunMetric({
      organizationId: context.organizationId,
      actorId: context.actorId,
      runId: replay.runId,
      agentKey: COMMAND_AGENT_KEY,
      status: replay.status,
      durationMs: 0,
      toolCount: 0,
      evidenceCount: replay.evidenceLinkCount,
      redactionCount: 0,
      denialCode: replay.failureCode,
      stale: false,
      replayed: true,
    });
    return {
      access,
      receipt: replay,
      brief: null,
      skill: skillIdentity(),
    };
  }
  const durationMs = Math.max(0, Date.now() - startedAt);

  await recordAgentRunGovernance({
    receipt,
    organizationId: context.organizationId,
    actorId: context.actorId,
    agentDefinitionId: definition.agentDefinitionId,
    skillKey: definition.skillKey,
    skillVersion: definition.skillVersion,
    promptHash: definition.promptHash,
    durationMs,
    toolCount: 1,
    redactionCount,
    staleOutput: preparedBrief.value?.freshness === "stale",
  });

  recordAgentRunMetric({
    organizationId: context.organizationId,
    actorId: context.actorId,
    runId: receipt.runId,
    agentKey: COMMAND_AGENT_KEY,
    status: receipt.status,
    durationMs,
    toolCount: 1,
    evidenceCount: receipt.evidenceLinkCount,
    redactionCount,
    denialCode: receipt.failureCode,
    stale: preparedBrief.value?.freshness === "stale",
    replayed: false,
  });

  if (receipt.status === "completed" && !preparedBrief.value) {
    throw new CommandAgentExecutionError(
      "RUN_COMPLETED_WITHOUT_BRIEF",
      "Command Agent completed without a validated brief.",
    );
  }
  const brief = preparedBrief.value
    ? { ...preparedBrief.value, runId: receipt.runId }
    : null;
  return {
    access,
    receipt,
    brief: access.canRender ? brief : null,
    skill: skillIdentity(),
  };
}

function skillIdentity() {
  return {
    key: ROLE_DAILY_BRIEF_SKILL_KEY,
    version: ROLE_DAILY_BRIEF_SKILL_VERSION,
    promptHash: ROLE_DAILY_BRIEF_PROMPT_HASH,
  } as const;
}
