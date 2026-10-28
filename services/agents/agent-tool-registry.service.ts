import "server-only"

import type { AgentExecutionContext, AgentToolDefinition } from "./agent-contracts"
import {
  AgentPolicyError,
  assertAgentToolAllowed,
  assertAgentToolDefinitionSafe,
} from "./agent-policy.service"
import { MVP_AGENT_TOOL_DEFINITIONS } from "./tools/command-tools"

export class AgentToolRegistry {
  private readonly tools: ReadonlyMap<string, AgentToolDefinition>

  constructor(definitions: readonly AgentToolDefinition[] = MVP_AGENT_TOOL_DEFINITIONS) {
    const entries = definitions.map((tool) => {
      assertAgentToolDefinitionSafe(tool)
      return [tool.key, Object.freeze({ ...tool })] as const
    })
    const keys = new Set(entries.map(([key]) => key))
    if (keys.size !== entries.length) {
      throw new AgentPolicyError("PROHIBITED_TOOL", "Agent tool keys must be unique.")
    }
    this.tools = new Map(entries)
  }

  listDefinitions() {
    return Array.from(this.tools.values())
  }

  getDefinition(toolKey: string) {
    const tool = this.tools.get(toolKey)
    if (!tool) {
      throw new AgentPolicyError("UNKNOWN_TOOL", `Unknown agent tool ${toolKey}.`)
    }
    return tool
  }

  authorize(context: AgentExecutionContext, toolKey: string) {
    return assertAgentToolAllowed(context, this.getDefinition(toolKey))
  }

  listAllowed(context: AgentExecutionContext) {
    return this.listDefinitions().filter((tool) => {
      try {
        assertAgentToolAllowed(context, tool)
        return true
      } catch {
        return false
      }
    })
  }
}

export const agentToolRegistry = new AgentToolRegistry()
