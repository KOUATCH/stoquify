import "server-only"

import { db } from "@/prisma/db"

import {
  COMMAND_AGENT_KEY,
  READ_ROLE_DAILY_DIGEST_TOOL_KEY,
  ROLE_DAILY_BRIEF_PROMPT_HASH,
  ROLE_DAILY_BRIEF_SKILL_KEY,
  ROLE_DAILY_BRIEF_SKILL_VERSION,
} from "./command-agent-contracts"
import { COMMAND_AGENT_TOOL_DEFINITIONS } from "./tools/command-tool-adapters"

export const COMMAND_AGENT_CODE_MANIFEST = Object.freeze({
  agentKey: COMMAND_AGENT_KEY,
  riskLevel: "READ_ONLY" as const,
  tool: COMMAND_AGENT_TOOL_DEFINITIONS[0],
  skill: {
    key: ROLE_DAILY_BRIEF_SKILL_KEY,
    version: ROLE_DAILY_BRIEF_SKILL_VERSION,
    promptHash: ROLE_DAILY_BRIEF_PROMPT_HASH,
  },
})

type DefinitionDependencies = {
  loadAgent: (key: string) => Promise<{
    id: string
    status: string
    rolloutMode: string
    riskLevel: string
    allowedToolKeys: string[]
    allowedSkillKeys: string[]
  } | null>
  loadSkill: (key: string, version: number) => Promise<{
    status: string
    promptHash: string
    requiredPermissions: string[]
  } | null>
  loadTool: (key: string) => Promise<{
    status: string
    ownerService: string
    moduleSlug: string
    requiredPermission: string
    riskLevel: string
    toolType: string
    inputSchemaHash: string
    outputSchemaHash: string
  } | null>
}

const DEFAULT_DEPENDENCIES: DefinitionDependencies = {
  loadAgent: (key) =>
    db.agentDefinition.findUnique({
      where: { key },
      select: {
        id: true,
        status: true,
        rolloutMode: true,
        riskLevel: true,
        allowedToolKeys: true,
        allowedSkillKeys: true,
      },
    }),
  loadSkill: (key, version) =>
    db.agentSkillDefinition.findUnique({
      where: { key_version: { key, version } },
      select: { status: true, promptHash: true, requiredPermissions: true },
    }),
  loadTool: (key) =>
    db.agentToolDefinition.findUnique({
      where: { key },
      select: {
        status: true,
        ownerService: true,
        moduleSlug: true,
        requiredPermission: true,
        riskLevel: true,
        toolType: true,
        inputSchemaHash: true,
        outputSchemaHash: true,
      },
    }),
}

export class AgentDefinitionError extends Error {
  constructor(
    public readonly code: "DEFINITION_NOT_ACTIVE" | "DEFINITION_MANIFEST_MISMATCH",
    message: string,
  ) {
    super(message)
    this.name = "AgentDefinitionError"
  }
}

export async function resolveActiveCommandAgentDefinition(
  _rolloutMode: "shadow" | "internal",
  dependencies: DefinitionDependencies = DEFAULT_DEPENDENCIES,
) {
  const manifest = COMMAND_AGENT_CODE_MANIFEST
  const [agent, skill, tool] = await Promise.all([
    dependencies.loadAgent(manifest.agentKey),
    dependencies.loadSkill(manifest.skill.key, manifest.skill.version),
    dependencies.loadTool(manifest.tool.key),
  ])
  if (!agent || !skill || !tool || agent.status !== "ACTIVE" || skill.status !== "ACTIVE" || tool.status !== "ACTIVE") {
    throw new AgentDefinitionError(
      "DEFINITION_NOT_ACTIVE",
      "Command Agent governance definitions are not active.",
    )
  }

  const matches =
    agent.rolloutMode === "SHADOW" &&
    agent.riskLevel === manifest.riskLevel &&
    sameValues(agent.allowedToolKeys, [manifest.tool.key]) &&
    sameValues(agent.allowedSkillKeys, [manifest.skill.key]) &&
    skill.promptHash === manifest.skill.promptHash &&
    sameValues(skill.requiredPermissions, [manifest.tool.requiredPermission]) &&
    tool.ownerService === manifest.tool.ownerService &&
    tool.moduleSlug === manifest.tool.moduleSlug &&
    tool.requiredPermission === manifest.tool.requiredPermission &&
    tool.riskLevel === "READ_ONLY" &&
    tool.toolType === "READ_ONLY" &&
    tool.inputSchemaHash === manifest.tool.inputSchemaHash &&
    tool.outputSchemaHash === manifest.tool.outputSchemaHash

  if (!matches) {
    throw new AgentDefinitionError(
      "DEFINITION_MANIFEST_MISMATCH",
      "Command Agent governance definitions do not match the code manifest.",
    )
  }

  return {
    agentDefinitionId: agent.id,
    agentKey: manifest.agentKey,
    skillKey: manifest.skill.key,
    skillVersion: manifest.skill.version,
    promptHash: manifest.skill.promptHash,
  }
}

function sameValues(actual: readonly string[], expected: readonly string[]) {
  return actual.length === expected.length && expected.every((value) => actual.includes(value))
}
