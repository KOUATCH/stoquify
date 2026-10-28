import "server-only"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"

import type { AgentExecutionContext } from "./agent-contracts"
import type { CommandAgentSurfaceAccess } from "./command-agent-contracts"

const DEFAULT_PILOT_ROLES = new Set<string>()

export type CommandAgentRolloutInput = Pick<
  AgentExecutionContext,
  "organizationId" | "roleCodes" | "permissions"
>

export function resolveCommandAgentRollout(
  input: CommandAgentRolloutInput,
  environment: NodeJS.ProcessEnv = process.env,
): CommandAgentSurfaceAccess {
  if (environment.STOQUIFY_COMMAND_AGENT_KILL_SWITCH === "1") {
    return denied("off", "kill_switch")
  }

  const mode = normalizeMode(environment.STOQUIFY_COMMAND_AGENT_ROLLOUT)
  if (mode === "off") return denied(mode, "disabled")
  if (!hasRbacPermission(input.permissions, "dashboard.read")) {
    return denied(mode, "permission_denied")
  }

  const organizations = csvExactSet(environment.STOQUIFY_COMMAND_AGENT_PILOT_ORG_IDS)
  if (!organizations.has(input.organizationId.trim())) {
    return denied(mode, "organization_not_allowed")
  }

  const roles = csvSet(environment.STOQUIFY_COMMAND_AGENT_PILOT_ROLE_CODES, DEFAULT_PILOT_ROLES)
  if (!input.roleCodes.some((role) => roles.has(normalizeRole(role)))) {
    return denied(mode, "role_not_allowed")
  }

  if (mode === "shadow") {
    return { mode, canRun: true, canRender: false, reason: "shadow" }
  }
  return { mode, canRun: true, canRender: true, reason: "available" }
}

function denied(
  mode: CommandAgentSurfaceAccess["mode"],
  reason: Exclude<CommandAgentSurfaceAccess["reason"], "available" | "shadow">,
): CommandAgentSurfaceAccess {
  return { mode, canRun: false, canRender: false, reason }
}

function normalizeMode(value: string | undefined): CommandAgentSurfaceAccess["mode"] {
  return value === "shadow" || value === "internal" ? value : "off"
}

function csvSet(value: string | undefined, fallback = new Set<string>()) {
  if (!value?.trim()) return fallback
  return new Set(value.split(",").map(normalizeRole).filter(Boolean))
}
function csvExactSet(value: string | undefined) {
  if (!value?.trim()) return new Set<string>()
  return new Set(value.split(",").map((item) => item.trim()).filter(Boolean))
}


function normalizeRole(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}
