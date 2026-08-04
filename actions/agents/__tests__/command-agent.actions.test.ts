jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __commandAgentProtectOptions?: Array<Record<string, unknown>>;
    };
    store.__commandAgentProtectOptions =
      store.__commandAgentProtectOptions ?? [];
    store.__commandAgentProtectOptions.push(options);

    return async (input: unknown) =>
      handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["dashboard.read"],
        isSuperUser: false,
      });
  }),
}));

jest.mock("@/services/agents/command-agent.service", () => ({
  CommandAgentExecutionError: class CommandAgentExecutionError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "CommandAgentExecutionError";
    }
  },
  runCommandAgent: jest.fn(),
}));

jest.mock("@/services/agents/agent-feedback.service", () => ({
  recordCommandAgentFeedback: jest.fn(),
}));

jest.mock("@/services/events/business-event.service", () => ({
  recordBusinessEvent: jest.fn(),
}));

jest.mock("@/services/agents/agent-definition.service", () => ({
  AgentDefinitionError: class AgentDefinitionError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "AgentDefinitionError";
    }
  },
}));

jest.mock("@/services/agents/agent-release-control.service", () => ({
  AgentReleaseControlError: class AgentReleaseControlError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "AgentReleaseControlError";
    }
  },
}));

import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
} from "@/services/_shared/action-errors";
import { AgentDefinitionError } from "@/services/agents/agent-definition.service";
import { recordCommandAgentFeedback } from "@/services/agents/agent-feedback.service";
import { AgentReleaseControlError } from "@/services/agents/agent-release-control.service";
import { recordBusinessEvent } from "@/services/events/business-event.service";
import {
  CommandAgentExecutionError,
  runCommandAgent,
} from "@/services/agents/command-agent.service";

import {
  runCommandAgentAction,
  submitCommandAgentFeedbackAction,
} from "../command-agent.actions";

const mockRunCommandAgent = runCommandAgent as jest.Mock;
const mockRecordFeedback = recordCommandAgentFeedback as jest.Mock;
const mockRecordBusinessEvent = recordBusinessEvent as jest.Mock;

const validRequest = {
  requestId: "11111111-1111-4111-8111-111111111111",
  digestId: "daily-digest",
};

describe("Command Agent actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers execution and feedback behind enforced dashboard read controls", () => {
    const store = globalThis as typeof globalThis & {
      __commandAgentProtectOptions?: Array<Record<string, unknown>>;
    };

    expect(store.__commandAgentProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "dashboard.read",
          auditResource: "StoquifyCommandAgent",
          auditAllowed: true,
          tenantGuard: "handler-derived",
          module: expect.objectContaining({
            moduleSlug: "dashboard",
            surface: "agent:command-agent:daily-digest",
            accessIntent: "read",
            mode: "enforce",
          }),
        }),
        expect.objectContaining({
          permission: "dashboard.read",
          auditResource: "StoquifyCommandAgentFeedback",
          auditAllowed: true,
          tenantGuard: "handler-derived",
          module: expect.objectContaining({
            moduleSlug: "dashboard",
            surface: "agent:command-agent:feedback",
            accessIntent: "read",
            mode: "enforce",
          }),
        }),
      ]),
    );
  });

  it("records a tenant-scoped analysis request event after a governed run", async () => {
    mockRunCommandAgent.mockResolvedValueOnce({
      receipt: { runId: "cm00000000000000000000001" },
    });

    await runCommandAgentAction(validRequest);

    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        actorId: "user-session",
        eventType: "AI_ANALYSIS_REQUESTED",
        sourceId: "cm00000000000000000000001",
      }),
    );
  });

  it("fails closed on invalid execution input before invoking the runtime", async () => {
    await expect(
      runCommandAgentAction({
        requestId: "not-a-uuid",
        digestId: "daily-digest",
      }),
    ).rejects.toEqual(
      expect.objectContaining<ApplicationError>({
        code: "VALIDATION_ERROR",
        status: 400,
      }),
    );
    expect(mockRunCommandAgent).not.toHaveBeenCalled();
  });

  it.each([
    [
      new CommandAgentExecutionError("ROLLOUT_DENIED", "denied"),
      ForbiddenError,
      "FORBIDDEN",
    ],
    [
      new CommandAgentExecutionError("IDEMPOTENCY_CONFLICT", "conflict"),
      ConflictError,
      "CONFLICT",
    ],
    [
      new AgentDefinitionError("DEFINITION_NOT_ACTIVE", "draft"),
      BusinessRuleError,
      "BUSINESS_RULE_VIOLATION",
    ],
    [
      new AgentReleaseControlError("RELEASE_SCOPE_DENIED", "scope"),
      ForbiddenError,
      "FORBIDDEN",
    ],
    [
      new AgentReleaseControlError(
        "RELEASE_RECONCILIATION_STALE",
        "stale",
      ),
      BusinessRuleError,
      "BUSINESS_RULE_VIOLATION",
    ],
  ])(
    "maps governed runtime failures to safe action errors",
    async (runtimeError, expectedClass, expectedCode) => {
      mockRunCommandAgent.mockRejectedValueOnce(runtimeError);

      await expect(runCommandAgentAction(validRequest)).rejects.toEqual(
        expect.objectContaining({
          name: expectedClass.name,
          code: expectedCode,
        }),
      );
    },
  );

  it("does not expose unexpected runtime failure details", async () => {
    mockRunCommandAgent.mockRejectedValueOnce(
      new Error("database-secret-must-not-cross-the-action-boundary"),
    );

    await expect(runCommandAgentAction(validRequest)).rejects.toEqual(
      expect.objectContaining<ApplicationError>({
        code: "INTERNAL_ERROR",
        status: 500,
        expose: false,
        message: "Command Agent execution failed safely.",
      }),
    );
  });

  it("derives feedback tenant and actor from the protected session", async () => {
    mockRecordFeedback.mockResolvedValue({
      feedbackId: "feedback-1",
      recordedAt: "2026-07-24T10:00:00.000Z",
    });

    await submitCommandAgentFeedbackAction({
      runId: "cm00000000000000000000001",
      kind: "helpful",
    });

    expect(mockRecordFeedback).toHaveBeenCalledWith({
      runId: "cm00000000000000000000001",
      kind: "helpful",
      organizationId: "org-session",
      actorId: "user-session",
    });
  });
});
