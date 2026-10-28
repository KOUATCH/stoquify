jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {} }))

import {
  AgentDefinitionError,
  resolveActiveCommandAgentDefinition,
} from "../agent-definition.service"
import { COMMAND_AGENT_CODE_MANIFEST } from "../agent-definition.service"

describe("Command Agent governed definitions", () => {
  it("accepts only active records matching the code manifest", async () => {
    await expect(resolveActiveCommandAgentDefinition("internal", dependencies())).resolves.toMatchObject({
      agentDefinitionId: "definition-1",
      skillKey: "role-daily-brief",
      skillVersion: 1,
    })
  })

  it("keeps global definitions shadow-only while tenant release controls internal rollout", async () => {
    const globallyInternal = dependencies();
    globallyInternal.loadAgent = async () => ({
      ...(await dependencies().loadAgent("command-agent"))!,
      rolloutMode: "INTERNAL",
    });
    await expect(
      resolveActiveCommandAgentDefinition("internal", globallyInternal),
    ).rejects.toMatchObject({ code: "DEFINITION_MANIFEST_MISMATCH" });
  });
  it("rejects database drift from the security manifest", async () => {
    const drifted = dependencies()
    drifted.loadTool = async () => ({ ...(await dependencies().loadTool("readRoleDailyDigest"))!, toolType: "ACTION" })
    await expect(resolveActiveCommandAgentDefinition("internal", drifted)).rejects.toBeInstanceOf(
      AgentDefinitionError,
    )
  })
})

function dependencies() {
  const manifest = COMMAND_AGENT_CODE_MANIFEST
  return {
    loadAgent: async () => ({
      id: "definition-1",
      status: "ACTIVE",
      rolloutMode: "SHADOW",
      riskLevel: "READ_ONLY",
      allowedToolKeys: [manifest.tool.key],
      allowedSkillKeys: [manifest.skill.key],
    }),
    loadSkill: async () => ({
      status: "ACTIVE",
      promptHash: manifest.skill.promptHash,
      requiredPermissions: [manifest.tool.requiredPermission],
    }),
    loadTool: async () => ({
      status: "ACTIVE",
      ownerService: manifest.tool.ownerService,
      moduleSlug: manifest.tool.moduleSlug,
      requiredPermission: manifest.tool.requiredPermission,
      riskLevel: "READ_ONLY",
      toolType: "READ_ONLY",
      inputSchemaHash: manifest.tool.inputSchemaHash,
      outputSchemaHash: manifest.tool.outputSchemaHash,
    }),
  }
}
