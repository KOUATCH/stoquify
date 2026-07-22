import "server-only"

import type { RbacContext } from "@/lib/security/rbac"
import { requireRbacContext } from "@/lib/security/rbac"
import { db } from "@/prisma/db"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import type { AgentExecutionContext } from "./agent-contracts"

export type ResolveAgentContextInput = {
  requestedAgentKey: string
  sourceRoute: string
  requestedModules: readonly CommercialModuleSlug[]
  periodStart?: Date | string | null
  periodEnd?: Date | string | null
}

type AgentContextDependencies = {
  requireContext: () => Promise<RbacContext>
  loadOrganizationSettings: (organizationId: string) => Promise<{
    currency: string
    defaultLocale: string
  } | null>
  evaluateModule: typeof observeModuleAccess
  now: () => Date
}

const DEFAULT_DEPENDENCIES: AgentContextDependencies = {
  requireContext: requireRbacContext,
  loadOrganizationSettings: (organizationId) =>
    db.organization.findFirst({
      where: { id: organizationId, isActive: true, deletedAt: null },
      select: { currency: true, defaultLocale: true },
    }),
  evaluateModule: observeModuleAccess,
  now: () => new Date(),
}

export class AgentContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AgentContextError"
  }
}

export async function resolveAgentExecutionContext(
  input: ResolveAgentContextInput,
  dependencies: AgentContextDependencies = DEFAULT_DEPENDENCIES,
): Promise<AgentExecutionContext> {
  const requestedAgentKey = input.requestedAgentKey.trim()
  const sourceRoute = input.sourceRoute.trim()
  if (!requestedAgentKey) throw new AgentContextError("Requested agent key is required.")
  if (!sourceRoute) throw new AgentContextError("Agent source route is required.")

  const rbac = await dependencies.requireContext()
  if (!rbac.orgId || !rbac.userId) {
    throw new AgentContextError("Trusted tenant and actor context are required.")
  }

  const settings = await dependencies.loadOrganizationSettings(rbac.orgId)
  if (!settings) {
    throw new AgentContextError("Active organization settings are required.")
  }

  const periodStart = normalizeOptionalDate(input.periodStart)
  const periodEnd = normalizeOptionalDate(input.periodEnd)
  if (periodStart && periodEnd && periodEnd < periodStart) {
    throw new AgentContextError("Agent period end must be on or after period start.")
  }

  const requestedModules = Array.from(new Set(input.requestedModules))
  const moduleDecisions = Object.fromEntries(
    await Promise.all(
      requestedModules.map(async (moduleSlug) => [
        moduleSlug,
        await dependencies.evaluateModule({
          organizationId: rbac.orgId,
          userId: rbac.userId,
          actorPermissions: rbac.permissions,
          moduleSlug,
          surfaceType: "report",
          surface: `agent:${requestedAgentKey}:${sourceRoute}`,
          accessIntent: "read",
          mode: "enforce",
        }),
      ]),
    ),
  ) as AgentExecutionContext["moduleDecisions"]

  return {
    organizationId: rbac.orgId,
    organizationName: rbac.organizationName,
    actorId: rbac.userId,
    roleCodes: rbac.roles.map((role) => role.code),
    permissions: [...rbac.permissions],
    isSuperUser: rbac.isSuperUser,
    requestedAgentKey,
    sourceRoute,
    locale: normalizeLocale(settings.defaultLocale),
    currency: settings.currency || "XAF",
    periodStart,
    periodEnd,
    resolvedAt: dependencies.now().toISOString(),
    moduleDecisions,
  }
}

function normalizeOptionalDate(value: Date | string | null | undefined) {
  if (value === null || value === undefined) return null
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new AgentContextError("Agent period contains an invalid date.")
  }
  return parsed
}

function normalizeLocale(value: string): "en" | "fr" {
  return value.toLowerCase() === "fr" ? "fr" : "en"
}

