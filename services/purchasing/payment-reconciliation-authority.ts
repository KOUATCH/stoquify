import "server-only"
import { Prisma } from "@prisma/client"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import type { PaymentRequestScope } from "./payment-request-contracts"

export type PaymentReconciliationOperation = "read" | "propose" | "decide" | "reopen" | "finalize"
export async function paymentReconciliationAuthority(tx: Prisma.TransactionClient, scope: PaymentRequestScope, operation: PaymentReconciliationOperation, commit: boolean) {
  // Module admission owns organization/configuration locks before identity or source rows.
  for (const moduleSlug of ["payment_reconciliation", "purchasing"] as const) {
    const access = await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug,
      surfaceType: "action", surface: `actions/purchasing/payment-reconciliation.actions.ts:${operation}`,
      accessIntent: commit && moduleSlug === "payment_reconciliation" ? "write" : "read", mode: "enforce" })
    if (!access.allowed) throw new ForbiddenError("Current reconciliation and purchasing access is required.")
  }
  await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" m ON m."A" = r.id WHERE m."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, m`
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } },
    select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const now = new Date(), permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  const required = ["payments.reconciliation.read", "accounting.journal.read",
    ...(operation !== "read" ? ["payments.reconciliation.exception.resolve"] : []),
    ...(["decide", "finalize"].includes(operation) ? ["payments.reconciliation.sign"] : [])]
  if (!actor || !isUsableAccount(actor, now) || required.some(permission => !hasRbacPermission(permissions, permission))) throw new ForbiddenError("Current payment evidence authority is required.")
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId} AND "userId" = ${scope.actorId} FOR SHARE`
  // Read the advancing clock after the final session-row wait.
  const checkedAt = new Date()
  const session = await tx.session.findFirst({ where: { id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId, expiresAt: { gt: checkedAt } },
    select: { assuranceOrganizationId: true, assuranceVerifiedAt: true, assuranceLevel: true, assuranceMethod: true, assuranceLockedUntil: true } })
  if (!session) throw new ForbiddenError("Your session expired or was revoked. Sign in again.")
  const fresh = session.assuranceOrganizationId === scope.organizationId && session.assuranceMethod === "password" && session.assuranceLevel >= 1
    && session.assuranceVerifiedAt != null && session.assuranceVerifiedAt <= checkedAt && checkedAt.getTime() - session.assuranceVerifiedAt.getTime() <= 300000
    && (!session.assuranceLockedUntil || session.assuranceLockedUntil <= checkedAt)
  if (commit && !fresh) throw new BusinessRuleError("Verify your password before confirming payment evidence.", "FRESH_AUTH_REQUIRED")
  return { fresh, permissions }
}
