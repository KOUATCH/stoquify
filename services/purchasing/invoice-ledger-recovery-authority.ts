import "server-only"
import { Prisma } from "@prisma/client"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import { invoicePreparationScopeSchema, type InvoicePreparationScope } from "./invoice-preparation-authority"

export { invoicePreparationScopeSchema as invoiceLedgerRecoveryScopeSchema }
export type InvoiceLedgerRecoveryScope = InvoicePreparationScope

export async function invoiceLedgerRecoveryAuthority(tx: Prisma.TransactionClient, scope: InvoiceLedgerRecoveryScope, operation: "load" | "review" | "submit") {
  return invoicePostingAuthority(tx, scope, operation, "recovery")
}

export async function invoicePostingAuthority(tx: Prisma.TransactionClient, scope: InvoiceLedgerRecoveryScope, operation: "load" | "review" | "submit", workflow: "recovery" | "approval") {
  const surface = workflow === "recovery" ? `actions/purchasing/invoice-ledger-recovery.actions.ts:${operation}InvoiceLedgerRecovery` : `actions/purchasing/invoice-approval.actions.ts:${operation}InvoiceApproval`
  const access = await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "purchasing", surfaceType: "action", surface, accessIntent: operation === "submit" ? "write" : "read", mode: "enforce" })
  if (!access.allowed) throw new ForbiddenError("Current purchasing access is required.")
  await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" membership ON membership."A" = r.id WHERE membership."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, membership`
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const now = new Date(), permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(permissions, "purchasing.ap.invoice.post")) throw new ForbiddenError("Current invoice posting authority is required.")
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId} AND "userId" = ${scope.actorId} FOR SHARE`
  const session = await tx.session.findFirst({ where: { id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId, expiresAt: { gt: now } }, select: { assuranceOrganizationId: true, assuranceVerifiedAt: true, assuranceLevel: true, assuranceMethod: true, assuranceLockedUntil: true } })
  if (!session) throw new ForbiddenError("Your session expired or was revoked. Sign in again.")
  const fresh = session.assuranceOrganizationId === scope.organizationId && session.assuranceMethod === "password" && session.assuranceLevel >= 1 && session.assuranceVerifiedAt != null && session.assuranceVerifiedAt <= now && now.getTime() - session.assuranceVerifiedAt.getTime() <= 300000 && (!session.assuranceLockedUntil || session.assuranceLockedUntil <= now)
  if (operation === "submit" && !fresh) throw new BusinessRuleError("Verify your password before confirming this invoice operation.", "FRESH_AUTH_REQUIRED")
  return { fresh }
}
