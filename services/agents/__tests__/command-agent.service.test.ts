jest.mock("server-only", () => ({}));

const mockResolveContext = jest.fn();
const mockResolveDefinition = jest.fn();
const mockFindReceipt = jest.fn();
const mockRecordGovernance = jest.fn();
const mockRunAgent = jest.fn();
const mockAuthorizeRelease = jest.fn();

jest.mock("../agent-context.service", () => ({
  resolveAgentExecutionContext: (...args: unknown[]) =>
    mockResolveContext(...args),
}));
jest.mock("../agent-definition.service", () => ({
  resolveActiveCommandAgentDefinition: (...args: unknown[]) =>
    mockResolveDefinition(...args),
}));
jest.mock("../agent-metrics.service", () => ({
  recordAgentRunMetric: jest.fn(),
}));
jest.mock("../agent-run-governance.service", () => ({
  findScopedAgentRunReceipt: (...args: unknown[]) => mockFindReceipt(...args),
  isAgentRunCorrelationConflict: (error: {
    code?: string;
    meta?: { target?: string[] };
  }) =>
    error?.code === "P2002" &&
    error.meta?.target?.includes("correlationId") === true,
  recordAgentRunGovernance: (...args: unknown[]) =>
    mockRecordGovernance(...args),
}));
jest.mock("../agent-runner.service", () => ({
  prismaAgentRunStore: {},
  runDeterministicAgent: (...args: unknown[]) => mockRunAgent(...args),
}));
jest.mock("../agent-release-control.service", () => ({
  authorizeCommandAgentRelease: (...args: unknown[]) =>
    mockAuthorizeRelease(...args),
}));jest.mock("../agent-rollout.service", () => ({
  resolveCommandAgentRollout: () => ({
    mode: "internal",
    canRun: true,
    canRender: true,
    reason: "available",
  }),
}));
jest.mock("../tools/command-tool-adapters", () => ({
  COMMAND_AGENT_TOOL_DEFINITIONS: [],
  readRoleDailyDigest: jest.fn(),
}));

import {
  CommandAgentExecutionError,
  runCommandAgent,
} from "../command-agent.service";

const REQUEST = {
  requestId: "2dbd2aa0-1021-4f39-99c2-b32a35943538",
  digestId: "daily-2026-07-22",
};

const REPLAY = {
  runId: "run-1",
  correlationId: REQUEST.requestId,
  status: "running" as const,
  completedStepCount: 0,
  evidenceLinkCount: 0,
  safeSummary: "Agent run is still in progress.",
  failureCode: null,
};

describe("Command Agent idempotency recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveContext.mockResolvedValue({
      organizationId: "org-1",
      actorId: "user-1",
      requestedAgentKey: "command-agent",
      roleCodes: ["manager"],
      permissions: ["dashboard.read"],
    });
    mockAuthorizeRelease.mockResolvedValue({
      packageId: "release-1",
      manifestHash: "sha256:manifest",
      definitionRolloutMode: "internal",
      certificationSession: false,
    });
    mockResolveDefinition.mockResolvedValue({
      agentDefinitionId: "definition-1",
      skillKey: "role-daily-brief",
      skillVersion: 1,
      promptHash: "sha256:prompt",
    });
  });

  it("returns the same scoped receipt after a concurrent correlation race", async () => {
    mockFindReceipt.mockResolvedValueOnce(null).mockResolvedValueOnce(REPLAY);
    mockRunAgent.mockRejectedValue({
      code: "P2002",
      meta: { target: ["correlationId"] },
    });

    await expect(runCommandAgent(REQUEST)).resolves.toMatchObject({
      receipt: REPLAY,
      brief: null,
    });
    expect(mockAuthorizeRelease).toHaveBeenCalledWith({
      organizationId: "org-1",
      roleCodes: ["manager"],
      rolloutMode: "internal",
    });
    expect(mockResolveDefinition).toHaveBeenCalledWith("internal");
    expect(mockFindReceipt).toHaveBeenNthCalledWith(2, {
      organizationId: "org-1",
      actorId: "user-1",
      agentKey: "command-agent",
      correlationId: REQUEST.requestId,
    });
  });

  it("does not expose a correlation owned by another trusted scope", async () => {
    mockFindReceipt.mockResolvedValue(null);
    mockRunAgent.mockRejectedValue({
      code: "P2002",
      meta: { target: ["correlationId"] },
    });

    await expect(runCommandAgent(REQUEST)).rejects.toMatchObject<
      Partial<CommandAgentExecutionError>
    >({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });
});
