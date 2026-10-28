jest.mock("server-only", () => ({}))

import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"

import type { AgentExecutionContext, AgentToolDefinition } from "../agent-contracts"
import { AgentPolicyError } from "../agent-policy.service"
import { AgentToolRegistry } from "../agent-tool-registry.service"

const SAFE_TOOL: AgentToolDefinition = {
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
}

describe("agent tool registry", () => {
  it("returns only tools allowed by permission and entitlement", () => {
    const registry = new AgentToolRegistry([SAFE_TOOL])
    expect(registry.listAllowed(context())).toEqual([expect.objectContaining({ key: SAFE_TOOL.key })])
    expect(registry.listAllowed(context({ permissions: [] }))).toEqual([])
  })

  it("does not let wildcard RBAC bypass a blocked module", () => {
    const registry = new AgentToolRegistry([SAFE_TOOL])
    const blocked = context({ permissions: ["*"], moduleAllowed: false })

    expect(() => registry.authorize(blocked, SAFE_TOOL.key)).toThrow(AgentPolicyError)
    expect(registry.listAllowed(blocked)).toEqual([])
  })

  it("rejects write-capable and prohibited tool definitions", () => {
    expect(
      () =>
        new AgentToolRegistry([
          { ...SAFE_TOOL, key: "postLedgerEntry", toolType: "action", riskLevel: "sensitive" },
        ]),
    ).toThrow(/prohibited|read-only/i)
  })

  it("rejects unknown tool keys", () => {
    const registry = new AgentToolRegistry([SAFE_TOOL])
    expect(() => registry.authorize(context(), "unknownTool")).toThrow(/unknown agent tool/i)
  })
})

function context(input?: { permissions?: string[]; moduleAllowed?: boolean }): AgentExecutionContext {
  const allowed = input?.moduleAllowed ?? true
  return {
    organizationId: "org-1",
    organizationName: "Stoquify Pilot",
    actorId: "user-1",
    roleCodes: ["manager"],
    permissions: input?.permissions ?? ["dashboard.read"],
    isSuperUser: false,
    requestedAgentKey: "command-agent",
    sourceRoute: "/dashboard",
    locale: "en",
    currency: "XAF",
    periodStart: null,
    periodEnd: null,
    resolvedAt: "2026-07-22T12:00:00.000Z",
    moduleDecisions: {
      dashboard: decision("dashboard", allowed, input?.permissions?.includes("*") ?? false),
    },
  }
}

function decision(moduleSlug: CommercialModuleSlug, allowed: boolean, wildcard: boolean) {
  return {
    organizationId: "org-1",
    userId: "user-1",
    moduleSlug,
    surfaceType: "report" as const,
    surface: "agent:command-agent",
    accessIntent: "read" as const,
    mode: "enforce" as const,
    result: allowed ? ("allow" as const) : ("deny" as const),
    allowed,
    wouldBlock: !allowed,
    reason: allowed ? "available" : "unavailable",
    entitlement: null,
    missingDependencies: [],
    rbacWildcardPresent: wildcard,
    rbacWildcardBypassedEntitlement: false as const,
    hardEnforcementEnabled: false,
    evaluatedAt: "2026-07-22T12:00:00.000Z",
  }
}

