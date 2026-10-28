jest.mock("server-only", () => ({}));
jest.mock("@/prisma/db", () => ({ db: {} }));

import type {
  AgentExecutionContext,
  AgentToolDefinition,
} from "../agent-contracts";
import { AgentExecutionControlError } from "../agent-execution-control.service";
import {
  hashAgentPayload,
  runDeterministicAgent,
  type AgentRunStore,
} from "../agent-runner.service";
import { AgentToolRegistry } from "../agent-tool-registry.service";

const TOOL: AgentToolDefinition = {
  key: "readTenantOperatingSnapshot",
  description: "Read tenant snapshot.",
  ownerService: "services/snapshots",
  moduleSlug: "dashboard",
  requiredPermission: "dashboard.read",
  riskLevel: "read_only",
  toolType: "read_only",
  inputSchemaHash: "input:v1",
  outputSchemaHash: "output:v1",
  evidenceBehavior: "preserve evidence",
};

const PROVENANCE = {
  agentDefinitionId: "definition-1",
  skillKey: "role-daily-brief",
  skillVersion: 1,
  promptHash: "sha256:prompt",
} as const;

describe("deterministic agent runner", () => {
  it("records context, authorized tool steps, evidence, and a completed run without a model", async () => {
    const store = createStore();
    const receipt = await runDeterministicAgent(
      {
        context: context(),
        correlationId: "agent-run-1",
        provenance: PROVENANCE,
        invocations: [{ toolKey: TOOL.key, input: { period: "today" } }],
        executeTool: async () => ({
          output: { status: "fresh", total: 3 },
          safeSummary: "Three trusted operating signals are available.",
          evidence: [
            {
              subjectType: "snapshot.tenant.operating",
              subjectId: "snapshot-1",
              sourceModule: "dashboard",
              sourceTable: null,
              sourceHash: "sha256:evidence",
              evidenceGrade: "operational",
              freshness: "fresh",
              available: true,
              blockerCount: 0,
              redactionCount: 0,
            },
          ],
        }),
      },
      {
        registry: new AgentToolRegistry([TOOL]),
        store,
        now: () => new Date("2026-07-22T12:00:00.000Z"),
      },
    );

    expect(receipt).toMatchObject({
      runId: "run-1",
      status: "completed",
      completedStepCount: 2,
      evidenceLinkCount: 1,
      failureCode: null,
    });
    expect(store.createStep).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ kind: "CONTEXT", status: "COMPLETED" }),
    );
    expect(store.completeStep).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "COMPLETED",
        outputHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      }),
    );
    expect(store.createRun).toHaveBeenCalledWith(
      expect.objectContaining({ provenance: PROVENANCE }),
    );
    expect(store.createPolicyIncident).not.toHaveBeenCalled();
  });

  it("blocks an unknown tool and records a policy incident without executing it", async () => {
    const store = createStore();
    const executeTool = jest.fn();

    const receipt = await runDeterministicAgent(
      {
        context: context(),
        correlationId: "agent-run-2",
        provenance: PROVENANCE,
        invocations: [
          { toolKey: "postLedgerEntry", input: { amount: 50_000 } },
        ],
        executeTool,
      },
      {
        registry: new AgentToolRegistry([TOOL]),
        store,
        now: () => new Date("2026-07-22T12:00:00.000Z"),
      },
    );

    expect(receipt).toMatchObject({
      status: "blocked",
      failureCode: "UNKNOWN_TOOL",
    });
    expect(executeTool).not.toHaveBeenCalled();
    expect(store.createPolicyIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        blockedToolKey: "postLedgerEntry",
        policyKey: "UNKNOWN_TOOL",
      }),
    );
  });

  it("persists an explicit timeout failure code without leaking the tool error", async () => {
    const store = createStore();
    const receipt = await runDeterministicAgent(
      {
        context: context(),
        correlationId: "agent-run-timeout",
        provenance: PROVENANCE,
        invocations: [{ toolKey: TOOL.key, input: {} }],
        executeTool: async () => {
          throw new AgentExecutionControlError(
            "AGENT_TIMEOUT",
            "private timeout detail",
          );
        },
      },
      {
        registry: new AgentToolRegistry([TOOL]),
        store,
        now: () => new Date("2026-07-22T12:00:00.000Z"),
      },
    );

    expect(receipt).toMatchObject({
      status: "failed",
      failureCode: "AGENT_TIMEOUT",
    });
    expect(receipt.safeSummary).not.toContain("private timeout detail");
    expect(store.completeStep).toHaveBeenCalledWith(
      expect.objectContaining({ status: "FAILED", errorCode: "AGENT_TIMEOUT" }),
    );
  });

  it("hashes equivalent object payloads deterministically", () => {
    expect(hashAgentPayload({ b: 2, a: 1 })).toBe(
      hashAgentPayload({ a: 1, b: 2 }),
    );
  });
});

function createStore(): jest.Mocked<AgentRunStore> {
  return {
    createRun: jest.fn(async () => ({ id: "run-1" })),
    createStep: jest.fn(async (input) => ({ id: `step-${input.stepNumber}` })),
    completeStep: jest.fn(async () => undefined),
    createEvidence: jest.fn(async ({ evidence }) => evidence.length),
    createPolicyIncident: jest.fn(async () => undefined),
    completeRun: jest.fn(async () => undefined),
  };
}

function context(): AgentExecutionContext {
  return {
    organizationId: "org-1",
    organizationName: "Stoquify Pilot",
    actorId: "user-1",
    roleCodes: ["manager"],
    permissions: ["dashboard.read"],
    isSuperUser: false,
    requestedAgentKey: "command-agent",
    sourceRoute: "/dashboard/daily-digest",
    locale: "en",
    currency: "XAF",
    periodStart: null,
    periodEnd: null,
    resolvedAt: "2026-07-22T12:00:00.000Z",
    moduleDecisions: {
      dashboard: {
        organizationId: "org-1",
        userId: "user-1",
        moduleSlug: "dashboard",
        surfaceType: "report",
        surface: "agent:command-agent",
        accessIntent: "read",
        mode: "enforce",
        result: "allow",
        allowed: true,
        wouldBlock: false,
        reason: "available",
        entitlement: null,
        missingDependencies: [],
        rbacWildcardPresent: false,
        rbacWildcardBypassedEntitlement: false,
        hardEnforcementEnabled: false,
        evaluatedAt: "2026-07-22T12:00:00.000Z",
      },
    },
  };
}
