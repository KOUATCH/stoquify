jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    agentRun: { findFirst: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const mockedDb = jest.requireMock("@/prisma/db").db as {
  agentRun: { findFirst: jest.Mock; updateMany: jest.Mock };
  $transaction: jest.Mock;
};
const mockRunFindFirst = mockedDb.agentRun.findFirst;
const mockRunUpdateMany = mockedDb.agentRun.updateMany;
const mockFeedbackUpsert = jest.fn();

import {
  AgentFeedbackError,
  recordCommandAgentFeedback,
} from "../agent-feedback.service";
import {
  findScopedAgentRunReceipt,
  isAgentRunCorrelationConflict,
  recordAgentRunGovernance,
} from "../agent-run-governance.service";

describe("agent run tenant and actor governance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          agentRun: { findFirst: mockRunFindFirst },
          agentFeedback: { upsert: mockFeedbackUpsert },
        }),
    );
  });

  it("uses organization, actor, agent, and request key for replay lookup", async () => {
    mockRunFindFirst.mockResolvedValue({
      id: "run-1",
      correlationId: "request-1",
      status: "COMPLETED",
      safeSummary: "Completed safely.",
      failureCode: null,
      _count: { steps: 2, evidenceLinks: 1 },
    });

    await expect(
      findScopedAgentRunReceipt({
        organizationId: "org-1",
        actorId: "user-1",
        agentKey: "command-agent",
        correlationId: "request-1",
      }),
    ).resolves.toMatchObject({ runId: "run-1", status: "completed" });
    expect(mockRunFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          actorId: "user-1",
          agentKey: "command-agent",
          correlationId: "request-1",
        },
      }),
    );
  });

  it("recognizes only the correlation-id unique conflict as a replay race", () => {
    expect(
      isAgentRunCorrelationConflict({
        code: "P2002",
        meta: { target: ["correlationId"] },
      }),
    ).toBe(true);
    expect(
      isAgentRunCorrelationConflict({
        code: "P2002",
        meta: { target: ["otherUniqueField"] },
      }),
    ).toBe(false);
    expect(isAgentRunCorrelationConflict({ code: "P2034" })).toBe(false);
  });

  it("persists provenance and operational metrics inside the trusted run scope", async () => {
    mockRunUpdateMany.mockResolvedValue({ count: 1 });

    await recordAgentRunGovernance({
      receipt: {
        runId: "run-1",
        correlationId: "request-1",
        status: "completed",
        completedStepCount: 2,
        evidenceLinkCount: 1,
        safeSummary: "Completed safely.",
        failureCode: null,
      },
      organizationId: "org-1",
      actorId: "user-1",
      agentDefinitionId: "definition-1",
      skillKey: "role-daily-brief",
      skillVersion: 1,
      promptHash: "sha256:prompt",
      durationMs: 25,
      toolCount: 1,
      redactionCount: 2,
      staleOutput: true,
    });

    expect(mockRunUpdateMany).toHaveBeenCalledWith({
      where: { id: "run-1", organizationId: "org-1", actorId: "user-1" },
      data: expect.objectContaining({
        agentDefinitionId: "definition-1",
        evidenceCount: 1,
        redactionCount: 2,
        staleOutput: true,
      }),
    });
  });

  it("rejects feedback when the run is outside the trusted tenant and actor scope", async () => {
    mockRunFindFirst.mockResolvedValue(null);

    await expect(
      recordCommandAgentFeedback({
        runId: "cm00000000000000000000001",
        organizationId: "org-other",
        actorId: "user-other",
        kind: "helpful",
      }),
    ).rejects.toBeInstanceOf(AgentFeedbackError);
    expect(mockFeedbackUpsert).not.toHaveBeenCalled();
  });

  it("upserts one bounded feedback classification per actor and run", async () => {
    mockRunFindFirst.mockResolvedValue({ id: "run-1" });
    mockFeedbackUpsert.mockResolvedValue({
      id: "feedback-1",
      createdAt: new Date("2026-07-22T12:00:00.000Z"),
    });

    await expect(
      recordCommandAgentFeedback({
        runId: "cm00000000000000000000001",
        organizationId: "org-1",
        actorId: "user-1",
        kind: "wrong",
      }),
    ).resolves.toEqual({
      feedbackId: "feedback-1",
      recordedAt: "2026-07-22T12:00:00.000Z",
    });
    expect(mockFeedbackUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          runId_actorId: {
            runId: "cm00000000000000000000001",
            actorId: "user-1",
          },
        },
        update: expect.objectContaining({
          wrongAnswer: true,
          correctionText: null,
        }),
      }),
    );
  });
});
