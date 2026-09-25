import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { ForbiddenError } from "@/services/_shared/action-errors"

export const supplierPoBuyerScopeSchema = z.object({ organizationId: z.string().min(1).max(191), actorId: z.string().min(1).max(191), sessionId: z.string().min(1).max(191).optional() }).strict()
export type SupplierPoBuyerScope = z.infer<typeof supplierPoBuyerScopeSchema>

export async function supplierPoBuyerAuthority(tx: Prisma.TransactionClient, scope: SupplierPoBuyerScope, write: boolean) {
  const access = await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "purchasing", surfaceType: "action", surface: "actions/purchaseOrderWorkflow/supplier-po-acknowledgement.actions.ts:" + (write ? "write" : "read"), accessIntent: write ? "write" : "read", mode: "enforce" })
  if (!access.allowed) throw new ForbiddenError("Current purchasing access is required")
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" membership ON membership."A" = r.id WHERE membership."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, membership`
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } },
    select: { id: true, isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const now = new Date(), permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(permissions, "purchases.orders.read") || (write && !hasRbacPermission(permissions, "purchases.orders.update"))) throw new ForbiddenError("Current purchase-order authority is required")
  if (write) {
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId ?? ""} AND "userId" = ${scope.actorId} FOR SHARE`
    const checkedAt = new Date()
    const session = scope.sessionId ? await tx.session.findFirst({ where: { id: scope.sessionId, userId: scope.actorId, expiresAt: { gt: checkedAt }, assuranceOrganizationId: scope.organizationId,
      assuranceVerifiedAt: { gte: new Date(checkedAt.getTime() - 300000), lte: checkedAt }, assuranceLevel: { gte: 1 }, assuranceMethod: "password", OR: [{ assuranceLockedUntil: null }, { assuranceLockedUntil: { lte: checkedAt } }] }, select: { id: true } }) : null
    if (!session) throw new ForbiddenError("Verify your current password before changing supplier acknowledgement records")
  }
  const writeAccess = write ? access : await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "purchasing", surfaceType: "action", surface: "actions/purchaseOrderWorkflow/supplier-po-acknowledgement.actions.ts:write", accessIntent: "write", mode: "enforce" })
  return { id: actor.id, canManage: hasRbacPermission(permissions, "purchases.orders.update") && writeAccess.allowed }
}
