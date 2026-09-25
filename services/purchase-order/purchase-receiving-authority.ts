import "server-only"
import { Prisma } from "@prisma/client"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { purchaseApprovalScopeSchema, type PurchaseApprovalScope } from "./purchase-order-approval"

export { purchaseApprovalScopeSchema as purchaseReceivingScopeSchema }
export type PurchaseReceivingScope = PurchaseApprovalScope

export async function purchaseReceivingAuthority(tx: Prisma.TransactionClient, scope: PurchaseReceivingScope, operation: "receive" | "resolve" | "read") {
  const access = await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "purchasing", surfaceType: "action", surface: `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:${operation === "resolve" ? "resolveGoodsReceiptInspection" : operation === "read" ? "getGoodsReceiptsForPurchaseOrder" : "receiveItems"}`, accessIntent: operation === "read" ? "read" : "write", mode: "enforce" })
  if (!access.allowed) throw new ForbiddenError("Current purchasing access is required.")
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" membership ON membership."A" = r.id WHERE membership."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, membership`
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const now = new Date(), permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(permissions, "purchases.orders.read") || (operation !== "read" && !hasRbacPermission(permissions, "purchases.orders.receive"))) throw new ForbiddenError("Current receiving authority is required.")
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId} AND "userId" = ${scope.actorId} FOR SHARE`
  const session = await tx.session.findFirst({ where: { id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId, expiresAt: { gt: now } }, select: { assuranceOrganizationId: true, assuranceVerifiedAt: true, assuranceLevel: true, assuranceMethod: true, assuranceLockedUntil: true } })
  if (!session) throw new ForbiddenError("Your session expired or was revoked. Sign in again.")
  const fresh = session.assuranceOrganizationId === scope.organizationId && session.assuranceMethod === "password" && session.assuranceLevel >= 1 && session.assuranceVerifiedAt != null && session.assuranceVerifiedAt <= now && now.getTime() - session.assuranceVerifiedAt.getTime() <= 300000 && (!session.assuranceLockedUntil || session.assuranceLockedUntil <= now)
  return { fresh, canReceive: hasRbacPermission(permissions, "purchases.orders.receive") }
}
