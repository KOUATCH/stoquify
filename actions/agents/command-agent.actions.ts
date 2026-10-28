"use server";

import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
} from "@/services/_shared/action-errors";
import { protect } from "@/services/_shared/protect";
import { recordBusinessEvent } from "@/services/events/business-event.service";
import { AgentDefinitionError } from "@/services/agents/agent-definition.service";
import { recordCommandAgentFeedback } from "@/services/agents/agent-feedback.service";
import { AgentReleaseControlError } from "@/services/agents/agent-release-control.service";
import {
  CommandAgentExecutionError,
  runCommandAgent,
} from "@/services/agents/command-agent.service";
import {
  commandAgentFeedbackSchema,
  commandAgentRequestSchema,
  type CommandAgentRunResult,
} from "@/services/agents/command-agent-contracts";

const commandAgentAction = protect<unknown, CommandAgentRunResult>(
  {
    permission: "dashboard.read",
    auditResource: "StoquifyCommandAgent",
    auditAllowed: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "dashboard",
      surface: "agent:command-agent:daily-digest",
      surfaceType: "report",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = commandAgentRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Command Agent request is invalid.",
        400,
      );
    }
    try {
      const result = await runCommandAgent(parsed.data);
      await recordBusinessEvent({
        organizationId: ctx.orgId,
        eventType: "AI_ANALYSIS_REQUESTED",
        eventSource: "INTERNAL",
        idempotencyKey: `ai-analysis-requested:${parsed.data.requestId}`,
        actorId: ctx.userId,
        sourceType: "AgentRun",
        sourceId: result.receipt.runId,
        payload: {
          requestId: parsed.data.requestId,
          digestId: parsed.data.digestId,
          periodStart: parsed.data.periodStart ?? null,
          periodEnd: parsed.data.periodEnd ?? null,
          executionAuthority: "READ_ONLY",
        },
        outboxMessages: [],
      });
      return result;
    } catch (error) {
      if (
        error instanceof CommandAgentExecutionError &&
        error.code === "ROLLOUT_DENIED"
      ) {
        throw new ForbiddenError(
          "Command Agent is not enabled for this organization and role.",
        );
      }
      if (
        error instanceof CommandAgentExecutionError &&
        error.code === "IDEMPOTENCY_CONFLICT"
      ) {
        throw new ConflictError(
          "Command Agent request ID conflicts with another trusted scope.",
        );
      }
      if (error instanceof AgentDefinitionError) {
        throw new BusinessRuleError(
          "Command Agent governance definitions are not ready.",
        );
      }
      if (error instanceof AgentReleaseControlError) {
        if (error.code === "RELEASE_SCOPE_DENIED") {
          throw new ForbiddenError(
            "Command Agent is outside the approved release scope.",
          );
        }
        throw new BusinessRuleError(
          "Command Agent release controls are not ready.",
        );
      }
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Command Agent execution failed safely.",
        500,
        false,
      );
    }
  },
);

const commandAgentFeedbackAction = protect<
  unknown,
  { feedbackId: string; recordedAt: string }
>(
  {
    permission: "dashboard.read",
    auditResource: "StoquifyCommandAgentFeedback",
    auditAllowed: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "dashboard",
      surface: "agent:command-agent:feedback",
      surfaceType: "report",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = commandAgentFeedbackSchema.safeParse(input);
    if (!parsed.success) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Command Agent feedback is invalid.",
        400,
      );
    }
    return recordCommandAgentFeedback({
      ...parsed.data,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    });
  },
);

export async function runCommandAgentAction(input: unknown) {
  return commandAgentAction(input);
}

export async function submitCommandAgentFeedbackAction(input: unknown) {
  return commandAgentFeedbackAction(input);
}
