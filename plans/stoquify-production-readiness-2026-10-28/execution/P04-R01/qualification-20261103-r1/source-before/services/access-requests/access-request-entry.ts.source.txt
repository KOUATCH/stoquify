import "server-only"
import { requireRbacContext, hasAllRbacPermissions } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { accessTargets } from "./access-request-contracts"

// A denied route calls this only for its registered item-read task. No protected
// record ID or arbitrary callback is included in the request handoff.
export async function getItemAccessRequestDenial(): Promise<{ moduleBlocked: boolean; requestHref: string | null } | null> {
  try {
    const ctx = await requireRbacContext()
    if (hasAllRbacPermissions(ctx.permissions, [...accessTargets.items.permissions])) return null
    const decision = await observeModuleAccess({ organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions,
      moduleSlug: "inventory", surfaceType: "page", surface: "access-request:items:denial", accessIntent: "read", mode: "enforce", audit: false })
    if (!decision.allowed) return { moduleBlocked: true, requestHref: null }
    return { moduleBlocked: false, requestHref: process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED === "true" ? "/dashboard/access-requests?target=items" : null }
  } catch { return null }
}
