import { canUsePermission, requireAnyPermission } from "@/lib/security/rbac"
import { ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

const managerPermissions = ["finance.cash-drawer.read", "finance.read", "payments.reconciliation.read", "finance.payments.read"]
const activityPermissions = ["OPERATE_POS", "pos.use", "pos.read"]

export async function requirePOSActivity(surface: string) {
  const ctx = await requireAnyPermission(activityPermissions, { resource: "POSActivity" })
  const decision = await observeModuleAccess({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    moduleSlug: "pos",
    surfaceType: "action",
    surface,
    mode: "enforce",
    accessIntent: "read",
    audit: false,
  })
  if (!decision.allowed) throw new ForbiddenError("Point of sale is unavailable.")
  return ctx
}

export function isPOSActivityManager(ctx: { permissions: readonly string[] }) {
  return ctx.permissions.includes("*") || managerPermissions.some((permission) => ctx.permissions.includes(permission))
}

export function activityActor(ctx: Awaited<ReturnType<typeof requirePOSActivity>>) {
  return {
    organizationId: ctx.orgId,
    userId: ctx.userId,
    canPrint: canUsePermission(ctx, "pos.receipts.print"),
    canReprint: canUsePermission(ctx, "pos.receipts.reprint"),
    canUseWhatsApp: canUsePermission(ctx, "pos.use"),
    manager: isPOSActivityManager(ctx),
  }
}

export function activityFailure(error: unknown) {
  const safe = toSafeActionError(error)
  return { success: false as const, data: null, error: safe.error, status: safe.status }
}
