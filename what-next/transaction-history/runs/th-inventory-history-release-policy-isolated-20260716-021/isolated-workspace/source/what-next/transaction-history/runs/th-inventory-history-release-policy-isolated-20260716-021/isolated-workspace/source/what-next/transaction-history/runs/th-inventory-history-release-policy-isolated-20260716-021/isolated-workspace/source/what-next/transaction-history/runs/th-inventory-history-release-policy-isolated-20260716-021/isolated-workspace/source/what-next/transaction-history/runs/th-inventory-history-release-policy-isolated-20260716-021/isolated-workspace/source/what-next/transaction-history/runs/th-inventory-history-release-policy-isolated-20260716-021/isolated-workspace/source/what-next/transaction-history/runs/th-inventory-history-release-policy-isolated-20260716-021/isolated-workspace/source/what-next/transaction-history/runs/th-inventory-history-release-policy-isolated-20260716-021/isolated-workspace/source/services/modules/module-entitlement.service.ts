import "server-only"

import type { Prisma } from "@prisma/client"

import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import {
  MODULE_CONTROL_MODE,
  type CommercialModuleSlug,
  type ModuleAccessObserveInput,
  type ModuleControlCenterData,
  type ModuleEntitlementDecision,
  type ModuleEntitlementEvaluationInput,
  type ModuleEntitlementStatus,
  type TenantModuleEntitlement,
} from "./module-control-contracts"
import {
  getModuleCatalog,
  getModuleCatalogEntry,
  normalizeRequestedModuleSlugs,
} from "./module-catalog.service"

const READ_ONLY_ALLOWED_SURFACES = new Set(["navigation", "page", "report"])

export function deriveLegacyEntitlements(input: {
  requestedModules?: readonly string[] | null
  explicitEntitlements?: readonly TenantModuleEntitlement[] | null
}): {
  entitlements: TenantModuleEntitlement[]
  normalizedRequestedModules: CommercialModuleSlug[]
  unknownRequestedModules: string[]
} {
  if (input.explicitEntitlements?.length) {
    return {
      entitlements: [...input.explicitEntitlements],
      normalizedRequestedModules: input.explicitEntitlements.map((item) => item.moduleSlug),
      unknownRequestedModules: [],
    }
  }

  const catalog = getModuleCatalog()
  const normalized = normalizeRequestedModuleSlugs(input.requestedModules)
  const requested = new Set(normalized.slugs)
  const hasRequestedModules = (input.requestedModules?.length ?? 0) > 0

  return {
    normalizedRequestedModules: normalized.slugs,
    unknownRequestedModules: normalized.unknown,
    entitlements: catalog
      .filter((entry) => entry.core || !hasRequestedModules || requested.has(entry.slug))
      .map((entry) => ({
        moduleSlug: entry.slug,
        status: entry.core ? "system_default" : hasRequestedModules ? "active" : "legacy_default",
        source: entry.core ? "system_default" : hasRequestedModules ? "requested_modules" : "legacy_default",
        startsAt: null,
        endsAt: null,
        readOnly: false,
        trial: false,
        metadata: hasRequestedModules
          ? { registrationIntent: requested.has(entry.slug) }
          : { legacyFullSuiteAccess: true },
      })),
  }
}

export function evaluateModuleEntitlement(input: ModuleEntitlementEvaluationInput): ModuleEntitlementDecision {
  const now = normalizeNow(input.now)
  const mode = input.mode ?? MODULE_CONTROL_MODE
  const accessIntent = input.accessIntent ?? "read"
  const catalogEntry = getModuleCatalogEntry(input.moduleSlug)
  const derived = deriveLegacyEntitlements({
    requestedModules: input.requestedModules,
    explicitEntitlements: input.explicitEntitlements,
  })
  const entitlements = new Map(derived.entitlements.map((item) => [item.moduleSlug, item]))
  const entitlement = entitlements.get(input.moduleSlug) ?? null
  const requiredMissingDependencies = (catalogEntry?.dependencies ?? []).filter(
    (dependency) => dependency.dependencyType === "required" && !entitlements.has(dependency.dependsOnSlug),
  )

  const status = entitlement?.status ?? "unavailable"
  const statusWouldBlock = statusBlocksAccess(status, input.surfaceType, accessIntent)
  const dependencyWouldBlock = requiredMissingDependencies.length > 0
  const wouldBlock = !catalogEntry || !entitlement || statusWouldBlock || dependencyWouldBlock
  const rbacWildcardPresent = Boolean(input.actorPermissions?.includes("*"))
  const allowed = mode === "observe" ? true : !wouldBlock
  const result = wouldBlock ? (mode === "observe" ? "would_block" : "deny") : "allow"

  return {
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    moduleSlug: input.moduleSlug,
    surfaceType: input.surfaceType,
    surface: input.surface,
    accessIntent,
    mode,
    result,
    allowed,
    wouldBlock,
    reason: decisionReason({
      catalogFound: Boolean(catalogEntry),
      entitlement,
      status,
      dependencyCount: requiredMissingDependencies.length,
      accessIntent,
    }),
    entitlement,
    missingDependencies: requiredMissingDependencies,
    rbacWildcardPresent,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: false,
    evaluatedAt: now.toISOString(),
  }
}

export async function observeModuleAccess(input: ModuleAccessObserveInput): Promise<ModuleEntitlementDecision> {
  const organization = await db.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null },
    select: { id: true, requestedModules: true },
  })
  const decision = evaluateModuleEntitlement({
    ...input,
    requestedModules: input.requestedModules ?? organization?.requestedModules ?? [],
    mode: input.mode ?? MODULE_CONTROL_MODE,
  })

  if (input.audit !== false && decision.wouldBlock) {
    await recordModuleEntitlementDecision(decision)
  }

  return decision
}

export async function getModuleControlCenterData(input: {
  organizationId: string
  actorId?: string | null
  actorPermissions?: readonly string[] | null
  now?: Date | string | null
}): Promise<ModuleControlCenterData> {
  const now = normalizeNow(input.now)
  const organization = await db.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null },
    select: {
      id: true,
      name: true,
      requestedModules: true,
    },
  })
  const requestedModules = organization?.requestedModules ?? []
  const derived = deriveLegacyEntitlements({ requestedModules })
  const items = getModuleCatalog().map((module) => {
    const decision = evaluateModuleEntitlement({
      organizationId: input.organizationId,
      userId: input.actorId,
      actorPermissions: input.actorPermissions,
      moduleSlug: module.slug,
      requestedModules,
      surfaceType: "navigation",
      surface: module.routePrefixes[0] ?? module.slug,
      accessIntent: "read",
      now,
    })

    return {
      module,
      entitlement: decision.entitlement,
      decision,
    }
  })

  return {
    organizationId: input.organizationId,
    organizationName: organization?.name ?? null,
    mode: MODULE_CONTROL_MODE,
    hardEnforcementEnabled: false,
    requestedModules,
    normalizedRequestedModules: derived.normalizedRequestedModules,
    unknownRequestedModules: derived.unknownRequestedModules,
    generatedAt: now.toISOString(),
    summary: {
      catalogCount: items.length,
      entitledCount: items.filter((item) => item.entitlement).length,
      trialCount: items.filter((item) => item.entitlement?.trial).length,
      readOnlyCount: items.filter((item) => item.entitlement?.readOnly || item.entitlement?.status === "read_only").length,
      suspendedCount: items.filter((item) => item.entitlement?.status === "suspended").length,
      wouldBlockCount: items.filter((item) => item.decision.wouldBlock).length,
      dependencyGapCount: items.reduce((count, item) => count + item.decision.missingDependencies.length, 0),
    },
    items,
  }
}

export async function recordModuleEntitlementDecision(decision: ModuleEntitlementDecision) {
  try {
    await db.auditLog.create({
      data: {
        entityType: "ModuleEntitlementDecision",
        entityId: `${decision.moduleSlug}:${decision.surfaceType}:${decision.surface}`,
        action: "MODULE_ENTITLEMENT_OBSERVED",
        organizationId: decision.organizationId,
        userId: decision.userId ?? undefined,
        changes: {
          moduleSlug: decision.moduleSlug,
          surfaceType: decision.surfaceType,
          surface: decision.surface,
          accessIntent: decision.accessIntent,
          mode: decision.mode,
          result: decision.result,
          allowed: decision.allowed,
          wouldBlock: decision.wouldBlock,
          reason: decision.reason,
          entitlementStatus: decision.entitlement?.status ?? null,
          missingDependencies: decision.missingDependencies.map((item) => item.dependsOnSlug),
          rbacWildcardPresent: decision.rbacWildcardPresent,
          rbacWildcardBypassedEntitlement: decision.rbacWildcardBypassedEntitlement,
        } satisfies Prisma.InputJsonObject,
      },
    })
  } catch (error) {
    logger.error("module entitlement observe log failed", {
      err: error,
      organizationId: decision.organizationId,
      moduleSlug: decision.moduleSlug,
      surface: decision.surface,
    })
  }
}

function statusBlocksAccess(
  status: ModuleEntitlementStatus,
  surfaceType: ModuleEntitlementEvaluationInput["surfaceType"],
  accessIntent: ModuleEntitlementEvaluationInput["accessIntent"],
) {
  if (status === "suspended" || status === "expired" || status === "unavailable") return true
  if (status === "read_only" && (accessIntent !== "read" || !READ_ONLY_ALLOWED_SURFACES.has(surfaceType))) {
    return true
  }
  return false
}

function decisionReason(input: {
  catalogFound: boolean
  entitlement: TenantModuleEntitlement | null
  status: ModuleEntitlementStatus
  dependencyCount: number
  accessIntent: ModuleEntitlementEvaluationInput["accessIntent"]
}) {
  if (!input.catalogFound) return "Module is not in the canonical catalog."
  if (!input.entitlement) return "Tenant is not entitled to this module in observe mode."
  if (input.status === "suspended") return "Tenant module entitlement is suspended."
  if (input.status === "expired") return "Tenant module entitlement is expired."
  if (input.status === "read_only" && input.accessIntent !== "read") {
    return "Tenant module entitlement is read-only for this operation."
  }
  if (input.dependencyCount > 0) return "Required module dependencies are missing."
  return "Tenant module entitlement is available."
}

function normalizeNow(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

