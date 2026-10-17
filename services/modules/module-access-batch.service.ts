import "server-only"

import { db } from "@/prisma/db"
import { NotFoundError } from "@/services/_shared/action-errors"
import type { CommercialModuleSlug, ModuleAccessObserveInput, ModuleEntitlementDecision } from "./module-control-contracts"
import { evaluateModuleEntitlement, getManagedModuleState, recordModuleEntitlementDecision } from "./module-entitlement.service"

type ModuleReadBatchInput = Pick<ModuleAccessObserveInput,
  "organizationId" | "userId" | "actorPermissions" | "surfaceType" | "surface" | "now" | "audit"
> & { moduleSlugs: readonly CommercialModuleSlug[] }

/** Read admission only: the caller establishes RBAC first. Authority is loaded
 * once per call and never cached across requests or reused for business writes. */
export async function observeModuleReadAccessBatch(input: ModuleReadBatchInput): Promise<Map<CommercialModuleSlug, ModuleEntitlementDecision>> {
  const slugs = [...new Set(input.moduleSlugs)]
  if (slugs.length === 0) return new Map()
  const organization = await db.organization.findFirst({
    where: { id: input.organizationId, isActive: true, deletedAt: null },
    select: { id: true, requestedModules: true },
  })
  if (!organization) throw new NotFoundError("Organization not found")
  const managed = await getManagedModuleState(organization.id)
  const decisions = await Promise.all(slugs.map(async (moduleSlug) => {
    const decision = evaluateModuleEntitlement({
      ...input, moduleSlug, requestedModules: organization.requestedModules,
      explicitEntitlements: managed.explicitEntitlements, accessIntent: "read", mode: "enforce",
    })
    if (input.audit !== false && decision.wouldBlock) await recordModuleEntitlementDecision(decision)
    return [moduleSlug, decision] as const
  }))
  return new Map(decisions)
}
