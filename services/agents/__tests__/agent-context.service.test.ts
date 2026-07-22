jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { organization: { findFirst: jest.fn() } } }))
jest.mock("@/lib/security/rbac", () => ({ requireRbacContext: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

import type { RbacContext } from "@/lib/security/rbac"

import {
  AgentContextError,
  resolveAgentExecutionContext,
} from "../agent-context.service"

describe("agent trusted context resolver", () => {
  it("resolves tenant, actor, settings, and enforce-mode module decisions", async () => {
    const evaluateModule = jest.fn(async (input) => moduleDecision(input.moduleSlug, true))

    const context = await resolveAgentExecutionContext(
      {
        requestedAgentKey: "command-agent",
        sourceRoute: "/dashboard/daily-digest",
        requestedModules: ["dashboard", "inventory"],
        periodStart: "2026-07-01T00:00:00.000Z",
        periodEnd: "2026-07-22T23:59:59.999Z",
      },
      {
        requireContext: async () => rbacContext(),
        loadOrganizationSettings: async () => ({ currency: "XOF", defaultLocale: "FR" }),
        evaluateModule,
        now: () => new Date("2026-07-22T12:00:00.000Z"),
      },
    )

    expect(context).toMatchObject({
      organizationId: "org-1",
      actorId: "user-1",
      locale: "fr",
      currency: "XOF",
      resolvedAt: "2026-07-22T12:00:00.000Z",
    })
    expect(evaluateModule).toHaveBeenCalledTimes(2)
    expect(evaluateModule).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "enforce", accessIntent: "read", surfaceType: "report" }),
    )
  })

  it("fails closed when trusted tenant context is absent", async () => {
    await expect(
      resolveAgentExecutionContext(
        {
          requestedAgentKey: "command-agent",
          sourceRoute: "/dashboard",
          requestedModules: ["dashboard"],
        },
        {
          requireContext: async () => ({ ...rbacContext(), orgId: "" }),
          loadOrganizationSettings: async () => ({ currency: "XAF", defaultLocale: "EN" }),
          evaluateModule: jest.fn(),
          now: () => new Date(),
        },
      ),
    ).rejects.toBeInstanceOf(AgentContextError)
  })

  it("rejects an inverted reporting period", async () => {
    await expect(
      resolveAgentExecutionContext(
        {
          requestedAgentKey: "command-agent",
          sourceRoute: "/dashboard",
          requestedModules: ["dashboard"],
          periodStart: "2026-07-22",
          periodEnd: "2026-07-01",
        },
        {
          requireContext: async () => rbacContext(),
          loadOrganizationSettings: async () => ({ currency: "XAF", defaultLocale: "EN" }),
          evaluateModule: jest.fn(),
          now: () => new Date(),
        },
      ),
    ).rejects.toThrow(/period end/i)
  })
})

function rbacContext(): RbacContext {
  return {
    user: {
      id: "user-1",
      firstName: "Ada",
      lastName: "Manager",
      phone: "",
      roles: [],
      permissions: ["dashboard.read", "inventory.levels.read"],
      organizationId: "org-1",
      organizationName: "Stoquify Pilot",
    },
    userId: "user-1",
    orgId: "org-1",
    organizationName: "Stoquify Pilot",
    roles: [],
    permissions: ["dashboard.read", "inventory.levels.read"],
    isSuperUser: false,
    source: "better-auth",
    fetchedAt: 0,
  }
}

function moduleDecision(moduleSlug: "dashboard" | "inventory", allowed: boolean) {
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
    rbacWildcardPresent: false,
    rbacWildcardBypassedEntitlement: false as const,
    hardEnforcementEnabled: false,
    evaluatedAt: "2026-07-22T12:00:00.000Z",
  }
}

