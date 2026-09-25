import "server-only"

import { Prisma } from "@prisma/client"

import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import {
  MODULE_CONTROL_MODE,
  isCommercialModuleSlug,
  type CommercialModuleSlug,
  type ModuleAccessObserveInput,
  type ModuleControlCenterData,
  type ModuleEntitlementDecision,
  type ModuleEntitlementEvaluationInput,
  type TenantModuleActivationResult,
  type TenantModuleEntitlement,
} from "./module-control-contracts"
import {
  getModuleCatalog,
  getModuleCatalogEntry,
  normalizeRequestedModuleSlugs,
} from "./module-catalog.service"
/** A configuration row establishes managed-grant authority, including zero grants.
 * Failed reads must propagate; they must never restore legacy access. */
export async function getManagedModuleState(organizationId: string, client: Prisma.TransactionClient = db) {
  const [configuration, grants] = await Promise.all([
    client.tenantModuleConfiguration.findUnique({ where: { organizationId } }),
    client.tenantModuleGrant.findMany({ where: { organizationId } }),
  ])
  if (!configuration) {
    const retainedCommands = await client.tenantModuleConfigurationCommand.count({ where: { organizationId } })
    if (grants.length || retainedCommands) throw new ConflictError("Module grants and history require their retained configuration record")
    return { configuration: null, explicitEntitlements: undefined }
  }
  const explicitEntitlements: TenantModuleEntitlement[] = grants.filter((grant) => isCommercialModuleSlug(grant.moduleSlug)).map((grant) => ({
    moduleSlug: grant.moduleSlug as CommercialModuleSlug,
    status: grant.status as TenantModuleEntitlement["status"],
    source: grant.source as TenantModuleEntitlement["source"],
    startsAt: grant.startsAt?.toISOString() ?? null,
    endsAt: grant.endsAt?.toISOString() ?? null,
    readOnly: grant.readOnly,
    trial: grant.trial,
  }))
  return { configuration, explicitEntitlements }
}

export function deriveLegacyEntitlements(input: {
  requestedModules?: readonly string[] | null
  explicitEntitlements?: readonly TenantModuleEntitlement[] | null
}): {
  entitlements: TenantModuleEntitlement[]
  normalizedRequestedModules: CommercialModuleSlug[]
  unknownRequestedModules: string[]
} {
  if (input.explicitEntitlements != null) {
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
  const entitlements = new Map<CommercialModuleSlug, TenantModuleEntitlement>()
  const duplicates = new Set<CommercialModuleSlug>()
  for (const grant of derived.entitlements) {
    if (entitlements.has(grant.moduleSlug)) duplicates.add(grant.moduleSlug)
    entitlements.set(grant.moduleSlug, grant)
  }
  const entitlement = entitlements.get(input.moduleSlug) ?? null
  const supportsOperation = (slug: CommercialModuleSlug, path = new Set<CommercialModuleSlug>()): boolean => {
    if (path.has(slug) || duplicates.has(slug)) return false
    const entry = getModuleCatalogEntry(slug)
    if (!entry || entitlementBlockReason(entitlements.get(slug) ?? null, accessIntent, now)) return false
    const nextPath = new Set(path).add(slug)
    return entry.dependencies.every((dependency) => dependency.dependencyType !== "required" || supportsOperation(dependency.dependsOnSlug, nextPath))
  }
  const requiredMissingDependencies = (catalogEntry?.dependencies ?? []).filter(
    (dependency) => dependency.dependencyType === "required" && !supportsOperation(dependency.dependsOnSlug, new Set([input.moduleSlug])),
  )

  const blockReason = duplicates.has(input.moduleSlug)
    ? "Duplicate module grants are ambiguous and require reconciliation."
    : entitlementBlockReason(entitlement, accessIntent, now)
  const dependencyWouldBlock = requiredMissingDependencies.length > 0
  const wouldBlock = !catalogEntry || Boolean(blockReason) || dependencyWouldBlock
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
    reason: !catalogEntry ? "Module is not in the canonical catalog." : blockReason ??
      (dependencyWouldBlock ? "Required module dependencies are missing or unavailable for this operation." : "Tenant module entitlement is available."),
    entitlement,
    missingDependencies: requiredMissingDependencies,
    rbacWildcardPresent,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: mode === "enforce",
    evaluatedAt: now.toISOString(),
  }
}

export async function observeModuleAccess(input: ModuleAccessObserveInput): Promise<ModuleEntitlementDecision> {
  const organization = await db.organization.findFirst({
    where: { id: input.organizationId, isActive: true, deletedAt: null },
    select: { id: true, requestedModules: true },
  })
  if (!organization) throw new NotFoundError("Organization not found")
  const managed = await getManagedModuleState(organization.id)
  const decision = evaluateModuleEntitlement({
    ...input,
    explicitEntitlements: managed.explicitEntitlements ?? input.explicitEntitlements,
    requestedModules: input.requestedModules ?? organization.requestedModules,
    mode: input.mode ?? MODULE_CONTROL_MODE,
  })

  if (input.audit !== false && decision.wouldBlock) {
    await recordModuleEntitlementDecision(decision)
  }

  return decision
}

/** Evaluate persisted authority inside the caller's write transaction. The
 * organization lock uses the same order as composition changes, including the
 * first transition from legacy intent to managed grants. Audit/denial handling
 * belongs to the caller so a denial can be committed without business effects. */
export async function evaluateModuleAccessInTx(
  tx: Prisma.TransactionClient,
  input: Omit<ModuleEntitlementEvaluationInput, "requestedModules" | "explicitEntitlements" | "now">,
): Promise<ModuleEntitlementDecision> {
  const organizations = await tx.$queryRaw<Array<{ id: string; requestedModules: string[] }>>(Prisma.sql`
    SELECT "id", "requestedModules" FROM "organizations"
    WHERE "id" = ${input.organizationId} AND "isActive" = true AND "deletedAt" IS NULL
    FOR SHARE`)
  if (organizations.length !== 1) throw new NotFoundError("Organization not found")
  // Lock stored authority too: Serializable snapshots established while waiting
  // on the organization lock must retry if a grant changed in the meantime.
  await tx.$queryRaw(Prisma.sql`SELECT "organizationId" FROM "tenant_module_configurations"
    WHERE "organizationId" = ${input.organizationId} FOR SHARE`)
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "tenant_module_grants"
    WHERE "organizationId" = ${input.organizationId} ORDER BY "moduleSlug", "id" FOR SHARE`)
  const managed = await getManagedModuleState(input.organizationId, tx)
  return evaluateModuleEntitlement({
    ...input,
    requestedModules: organizations[0].requestedModules,
    explicitEntitlements: managed.explicitEntitlements,
    now: new Date(),
  })
}

export async function getModuleControlCenterData(input: {
  organizationId: string
  actorId?: string | null
  actorPermissions?: readonly string[] | null
  now?: Date | string | null
}): Promise<ModuleControlCenterData> {
  const now = normalizeNow(input.now)
  const organization = await db.organization.findFirst({
    where: { id: input.organizationId, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      requestedModules: true,
    },
  })
  if (!organization) throw new NotFoundError("Organization not found")
  const requestedModules = organization.requestedModules
  const managed = await getManagedModuleState(organization.id)
  const derived = deriveLegacyEntitlements({ requestedModules, explicitEntitlements: managed.explicitEntitlements })
  const items = getModuleCatalog().map((module) => {
    const decision = evaluateModuleEntitlement({
      organizationId: input.organizationId,
      userId: input.actorId,
      actorPermissions: input.actorPermissions,
      moduleSlug: module.slug,
      requestedModules,
      explicitEntitlements: managed.explicitEntitlements,
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

export async function activateTenantModule(input: {
  organizationId: string
  actorId: string
  moduleSlug: CommercialModuleSlug
}): Promise<TenantModuleActivationResult> {
  const catalogEntry = getModuleCatalogEntry(input.moduleSlug)

  if (!catalogEntry || !["available", "beta"].includes(catalogEntry.status)) {
    throw new BusinessRuleError("This module cannot be activated for a tenant")
  }

  const activatedAt = new Date()

  return db.$transaction(
    async (tx) => {
      const organization = await tx.organization.findFirst({
        where: { id: input.organizationId, isActive: true, deletedAt: null },
        select: { id: true, requestedModules: true },
      })

      if (!organization) {
        throw new NotFoundError("Organization not found")
      }

      const managed = await getManagedModuleState(organization.id, tx)
      if (managed.configuration) {
        throw new BusinessRuleError("Use the module workspace review to change a managed configuration")
      }

      // Empty legacy intent means the full suite. Provisioning one capability must
      // never turn that into a restrictive list of only its dependencies.
      const normalized = new Set(deriveLegacyEntitlements({ requestedModules: organization.requestedModules }).entitlements.map((grant) => grant.moduleSlug))
      const activationOrder = requiredModuleActivationOrder(input.moduleSlug)
      const addedModules = activationOrder.filter((moduleSlug) => !normalized.has(moduleSlug))
      const requestedModules = [...organization.requestedModules, ...addedModules]

      if (addedModules.length > 0) {
        await tx.organization.update({
          where: { id: organization.id },
          data: { requestedModules: { set: requestedModules } },
        })
      }

      await tx.auditLog.create({
        data: {
          entityType: "OrganizationModuleEntitlement",
          entityId: `${organization.id}:${input.moduleSlug}`,
          action: addedModules.length > 0 ? "MODULE_ENTITLEMENT_ACTIVATED" : "MODULE_ENTITLEMENT_ALREADY_ACTIVE",
          organizationId: organization.id,
          userId: input.actorId,
          changes: {
            moduleSlug: input.moduleSlug,
            addedModules,
            beforeRequestedModules: organization.requestedModules,
            afterRequestedModules: requestedModules,
            requiredDependencies: activationOrder.filter((moduleSlug) => moduleSlug !== input.moduleSlug),
            activatedAt: activatedAt.toISOString(),
          } satisfies Prisma.InputJsonObject,
        },
      })

      return {
        organizationId: organization.id,
        moduleSlug: input.moduleSlug,
        addedModules,
        requestedModules,
        alreadyActive: addedModules.length === 0,
        activatedAt: activatedAt.toISOString(),
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

export async function recordModuleEntitlementDecision(decision: ModuleEntitlementDecision) {
  try {
    await db.auditLog.create({
      data: {
        entityType: "ModuleEntitlementDecision",
        entityId: `${decision.moduleSlug}:${decision.surfaceType}:${decision.surface}`,
        action: decision.mode === "enforce" ? "MODULE_ENTITLEMENT_ENFORCED" : "MODULE_ENTITLEMENT_OBSERVED",
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

function entitlementBlockReason(entitlement: TenantModuleEntitlement | null, intent: ModuleEntitlementEvaluationInput["accessIntent"], now: Date): string | null {
  if (!entitlement) return "Tenant is not entitled to this module."
  const start = entitlement.startsAt === null ? null : Date.parse(entitlement.startsAt)
  const end = entitlement.endsAt === null ? null : Date.parse(entitlement.endsAt)
  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end)) ||
    (start !== null && end !== null && start >= end)) return "Tenant module grant has an invalid validity interval."
  if (start !== null && now.getTime() < start) return "Tenant module grant is not yet effective."
  if (end !== null && now.getTime() >= end) return "Tenant module grant has expired."
  if (!["active", "trial", "read_only", "legacy_default", "system_default"].includes(entitlement.status)) {
    return `Tenant module entitlement is ${entitlement.status}.`
  }
  // Read-only is an operation restriction, independent of page/API/action transport.
  // Export and background jobs require their own authority and are not plain reads.
  if ((entitlement.status === "read_only" || entitlement.readOnly) && intent !== "read") {
    return "Tenant module entitlement is read-only for this operation."
  }
  return null
}

function normalizeNow(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function requiredModuleActivationOrder(moduleSlug: CommercialModuleSlug) {
  const ordered: CommercialModuleSlug[] = []
  const visited = new Set<CommercialModuleSlug>()
  const visiting = new Set<CommercialModuleSlug>()

  function visit(current: CommercialModuleSlug) {
    if (visiting.has(current)) throw new BusinessRuleError("Module dependency cycle requires reconciliation")
    if (visited.has(current)) return
    visiting.add(current)

    for (const dependency of getModuleCatalogEntry(current)?.dependencies ?? []) {
      if (dependency.dependencyType === "required") visit(dependency.dependsOnSlug)
    }

    visiting.delete(current)
    visited.add(current)
    ordered.push(current)
  }

  visit(moduleSlug)
  return ordered
}
