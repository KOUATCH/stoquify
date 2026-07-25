jest.mock("server-only", () => ({}));
jest.mock("@/prisma/db", () => ({ db: {} }));
jest.mock(
  "@/services/assurance/assurance-registry-persistence.service",
  () => ({ persistWorkflowAssuranceDefinitionExecution: jest.fn() }),
);
jest.mock("@/services/assurance/assurance-incident.service", () => ({
  resolveWorkflowAssuranceIncident: jest.fn(),
}));
jest.mock("@/services/assurance/assurance-alert-delivery.service", () => ({
  queueWorkflowAssuranceWebhookDelivery: jest.fn(),
  resolveAssuranceAlertTransportReadiness: jest.fn(),
}));

import {
  agentDefinitionRegistryMatches,
  shouldSuspendAgentRuntimeRelease,
} from "../agent-control-plane-reconciliation.service";
import { COMMAND_AGENT_CODE_MANIFEST } from "../agent-definition.service";

describe("agent runtime control-plane reconciliation", () => {
  it("treats active shadow definitions as a global code registry", () => {
    expect(agentDefinitionRegistryMatches(definitionFixture())).toBe(true);
  });

  it("rejects tenant rollout state projected into the global registry", () => {
    expect(
      agentDefinitionRegistryMatches(
        definitionFixture({ agentRolloutMode: "INTERNAL" }),
      ),
    ).toBe(false);
    expect(
      agentDefinitionRegistryMatches(
        definitionFixture({ agentStatus: "PAUSED" }),
      ),
    ).toBe(false);
  });

  it("suspends only active tenant releases with blocking drift", () => {
    expect(
      shouldSuspendAgentRuntimeRelease("ACTIVE_INTERNAL", [
        "RELEASE_APPROVALS_INCOMPLETE",
      ]),
    ).toBe(true);
    expect(shouldSuspendAgentRuntimeRelease("ACTIVE_INTERNAL", [])).toBe(false);
    expect(
      shouldSuspendAgentRuntimeRelease("PILOT_CERTIFIED", [
        "RELEASE_APPROVALS_INCOMPLETE",
      ]),
    ).toBe(false);
    expect(
      shouldSuspendAgentRuntimeRelease("SUSPENDED", [
        "RELEASE_MANIFEST_MISMATCH",
      ]),
    ).toBe(false);
  });
});

function definitionFixture(input?: {
  agentStatus?: string;
  agentRolloutMode?: string;
}) {
  const manifest = COMMAND_AGENT_CODE_MANIFEST;
  return {
    agent: {
      status: input?.agentStatus ?? "ACTIVE",
      rolloutMode: input?.agentRolloutMode ?? "SHADOW",
      riskLevel: manifest.riskLevel,
      allowedToolKeys: [manifest.tool.key],
      allowedSkillKeys: [manifest.skill.key],
    } as never,
    skill: {
      status: "ACTIVE",
      promptHash: manifest.skill.promptHash,
    } as never,
    tool: {
      status: "ACTIVE",
      requiredPermission: manifest.tool.requiredPermission,
      inputSchemaHash: manifest.tool.inputSchemaHash,
      outputSchemaHash: manifest.tool.outputSchemaHash,
    } as never,
  };
}