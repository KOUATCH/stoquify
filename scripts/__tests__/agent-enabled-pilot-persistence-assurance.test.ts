jest.mock("@/prisma/db", () => ({
  db: {
    agentRun: { count: jest.fn() },
    agentStep: { count: jest.fn() },
    agentEvidenceLink: { count: jest.fn() },
    agentFeedback: { count: jest.fn() },
    agentCostLedger: { count: jest.fn() },
    agentPolicyIncident: { count: jest.fn() },
  },
}));

import { db } from "@/prisma/db";

import {
  certifyAgentAllowedPersistence,
  countAgentAllowedPersistence,
  type AgentAllowedPersistenceCounts,
} from "../agent-enabled-pilot-persistence-assurance";

const mockDb = db as unknown as {
  agentRun: { count: jest.Mock };
  agentStep: { count: jest.Mock };
  agentEvidenceLink: { count: jest.Mock };
  agentFeedback: { count: jest.Mock };
  agentCostLedger: { count: jest.Mock };
  agentPolicyIncident: { count: jest.Mock };
};

describe("enabled-pilot allowed persistence assurance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts only tenant-scoped agent persistence surfaces", async () => {
    mockDb.agentRun.count.mockResolvedValue(10);
    mockDb.agentStep.count.mockResolvedValue(20);
    mockDb.agentEvidenceLink.count.mockResolvedValue(30);
    mockDb.agentFeedback.count.mockResolvedValue(8);
    mockDb.agentCostLedger.count.mockResolvedValue(0);
    mockDb.agentPolicyIncident.count.mockResolvedValue(1);

    await expect(countAgentAllowedPersistence("org-1")).resolves.toEqual({
      runs: 10,
      steps: 20,
      evidenceLinks: 30,
      feedback: 8,
      costs: 0,
      policyIncidents: 1,
    });
    expect(mockDb.agentRun.count).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
    });
    expect(mockDb.agentStep.count).toHaveBeenCalledWith({
      where: { run: { organizationId: "org-1" } },
    });
  });

  it("certifies two runs and feedback records without replay duplication", () => {
    const before = counts({
      runs: 10,
      steps: 20,
      evidenceLinks: 30,
      feedback: 8,
    });
    const after = counts({
      runs: 12,
      steps: 22,
      evidenceLinks: 32,
      feedback: 10,
    });

    expect(certifyAgentAllowedPersistence(before, after)).toEqual(
      expect.objectContaining({
        withinPolicy: true,
        expectedCommandExecutions: 2,
        delta: {
          runs: 2,
          steps: 2,
          evidenceLinks: 2,
          feedback: 2,
          costs: 0,
          policyIncidents: 0,
        },
      }),
    );
  });

  it("fails for duplicate runs or unexpected cost and policy persistence", () => {
    const before = counts({});
    expect(() =>
      certifyAgentAllowedPersistence(
        before,
        counts({
          runs: 3,
          steps: 3,
          evidenceLinks: 3,
          feedback: 2,
        }),
      ),
    ).toThrow("one run and one feedback record per browser project");

    expect(() =>
      certifyAgentAllowedPersistence(
        before,
        counts({
          runs: 2,
          steps: 2,
          evidenceLinks: 2,
          feedback: 2,
          costs: 1,
          policyIncidents: 1,
        }),
      ),
    ).toThrow("unexpected cost or policy-incident records");
  });
});

function counts(
  input: Partial<AgentAllowedPersistenceCounts>,
): AgentAllowedPersistenceCounts {
  return {
    runs: input.runs ?? 0,
    steps: input.steps ?? 0,
    evidenceLinks: input.evidenceLinks ?? 0,
    feedback: input.feedback ?? 0,
    costs: input.costs ?? 0,
    policyIncidents: input.policyIncidents ?? 0,
  };
}
