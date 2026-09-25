import "server-only"

import { Prisma } from "@prisma/client"
import { ApplicationError, BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getModuleCatalogEntry } from "./module-catalog.service"
import { isCommercialModuleSlug, type CommercialModuleSlug } from "./module-control-contracts"
import { getModuleOperationalDependencies } from "./module-operational-dependencies"

type Client = Prisma.TransactionClient
type AdmissionInput = { organizationId: string; moduleSlug: CommercialModuleSlug; operation: string }

export class ModuleNewWorkStoppedError extends ApplicationError {
  constructor(input: AdmissionInput, blockedBy: CommercialModuleSlug[]) {
    super("FORBIDDEN", "This capability is not accepting new work. Existing records and permitted completion workflows remain available.", 403, true,
      { moduleSlug: input.moduleSlug, operation: input.operation, blockedBy, reason: "MODULE_NEW_WORK_STOPPED" })
    this.name = "ModuleNewWorkStoppedError"
  }
}

/** Configuration writers take the exclusive version of the same organization
 * lock used by new-work admission. This also serializes the first configuration
 * against business creation when no configuration row exists yet. */
export async function lockModuleAdmissionPolicyInTx(tx: Client, organizationId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "organizations"
    WHERE "id" = ${organizationId} AND "isActive" = true AND "deletedAt" IS NULL
    FOR UPDATE`)
  if (rows.length !== 1) throw new NotFoundError("Active organization not found")
}

/** Selection and commercial grants remain separate. Only an explicitly reviewed
 * stop policy affects admission; an omitted workspace shortcut changes no right. */
export function moduleNewWorkBlockers(moduleSlug: CommercialModuleSlug, stopped: readonly string[]): CommercialModuleSlug[] {
  if (!isCommercialModuleSlug(moduleSlug)) throw new BusinessRuleError("Unknown capability")
  if (stopped.some(slug => !isCommercialModuleSlug(slug) || getModuleCatalogEntry(slug)?.core)) {
    throw new ConflictError("The stored operation policy requires reconciliation")
  }
  const blocked = new Set<CommercialModuleSlug>()
  const visited = new Set<CommercialModuleSlug>()
  const visit = (slug: CommercialModuleSlug, ancestry: Set<CommercialModuleSlug>) => {
    if (ancestry.has(slug)) throw new ConflictError("Capability dependencies require reconciliation")
    if (visited.has(slug)) return
    visited.add(slug)
    if (stopped.includes(slug)) blocked.add(slug)
    const entry = getModuleCatalogEntry(slug)
    if (!entry) throw new ConflictError("Capability dependencies require reconciliation")
    const next = new Set(ancestry).add(slug)
    for (const dependency of getModuleOperationalDependencies()) {
      if (dependency.moduleSlug === slug) visit(dependency.dependsOnSlug, next)
    }
  }
  visit(moduleSlug, new Set())
  return [...blocked].sort()
}

/** Call inside the transaction that admits a NEW business aggregate, after
 * resolving an existing idempotent result and before the first new effect.
 * Do not call for settlement, correction, mandatory ledger posting or previously
 * captured offline replay: those retain their existing scoped domain controls.
 * This is an additional admission constraint, never authentication or a grant. */
export async function getModuleAdmissionInTx(tx: Client, input: AdmissionInput): Promise<{
  allowed: boolean; blockedBy: CommercialModuleSlug[]; stoppedAt: Record<string, string | null>
}> {
  if (!input.organizationId || !input.operation.trim()) throw new BusinessRuleError("Operation context is required")
  const organizations = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "organizations"
    WHERE "id" = ${input.organizationId} AND "isActive" = true AND "deletedAt" IS NULL
    FOR SHARE`)
  if (organizations.length !== 1) throw new NotFoundError("Active organization not found")
  const policies = await tx.$queryRaw<Array<{ newWorkStoppedModules: string[]; newWorkStoppedAt: Prisma.JsonValue }>>(Prisma.sql`
    SELECT "newWorkStoppedModules", "newWorkStoppedAt" FROM "tenant_module_configurations"
    WHERE "organizationId" = ${input.organizationId} FOR SHARE`)
  if (policies.length > 1) throw new ConflictError("Operation policy is ambiguous")
  const blockedBy = moduleNewWorkBlockers(input.moduleSlug, policies[0]?.newWorkStoppedModules ?? [])
  const dates = policies[0]?.newWorkStoppedAt
  const stoppedAt = Object.fromEntries(blockedBy.map(slug => {
    const value = dates && typeof dates === "object" && !Array.isArray(dates) ? dates[slug] : null
    return [slug, typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null]
  }))
  return { allowed: blockedBy.length === 0, blockedBy, stoppedAt }
}

export async function assertModuleNewWorkInTx(tx: Client, input: AdmissionInput): Promise<void> {
  const { blockedBy } = await getModuleAdmissionInTx(tx, input)
  if (blockedBy.length) throw new ModuleNewWorkStoppedError(input, blockedBy)
}
