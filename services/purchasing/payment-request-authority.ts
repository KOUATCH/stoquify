import "server-only"
import { Prisma } from "@prisma/client"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import type { PaymentRequestScope } from "./payment-request-contracts"

export async function paymentRequestAuthority(tx: Prisma.TransactionClient, scope: PaymentRequestScope, kind: "request" | "approve" | "release", commit: boolean) {
  const access = await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "purchasing", surfaceType: "action", surface: `actions/purchasing/payment-${kind === "release" ? "release" : "request"}.actions.ts:${kind}`, accessIntent: commit ? "write" : "read", mode: "enforce" })
  if (!access.allowed) throw new ForbiddenError("Current purchasing access is required.")
  await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" m ON m."A" = r.id WHERE m."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, m`
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const now = new Date(), permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(permissions, `purchasing.ap.payment.${kind}`)) throw new ForbiddenError("Current payment operation authority is required.")
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId} AND "userId" = ${scope.actorId} FOR SHARE`
  const session = await tx.session.findFirst({ where: { id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId, expiresAt: { gt: now } }, select: { assuranceOrganizationId: true, assuranceVerifiedAt: true, assuranceLevel: true, assuranceMethod: true, assuranceLockedUntil: true } })
  if (!session) throw new ForbiddenError("Your session expired or was revoked. Sign in again.")
  const fresh = session.assuranceOrganizationId === scope.organizationId && session.assuranceMethod === "password" && session.assuranceLevel >= 1 && session.assuranceVerifiedAt != null && session.assuranceVerifiedAt <= now && now.getTime() - session.assuranceVerifiedAt.getTime() <= 300000 && (!session.assuranceLockedUntil || session.assuranceLockedUntil <= now)
  if (commit && !fresh) throw new BusinessRuleError("Verify your password before confirming this payment operation.", "FRESH_AUTH_REQUIRED")
  return { fresh, permissions, lastAuthAt: session.assuranceVerifiedAt?.getTime() ?? 0 }
}
