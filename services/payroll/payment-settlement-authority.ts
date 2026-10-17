import "server-only"
import { Prisma } from "@prisma/client"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"

export type PayrollSettlementAuthorityScope = {
  organizationId: string
  actorId?: string | null
  sessionId?: string
  sessionToken?: string
}

// Called inside EVERY Serializable attempt, including before replay disclosure.
// Locks order authority changes before or after settlement admission. Revocations
// committed before a conflicting lock is acquired cause denial or a fresh retry.
export async function payrollSettlementAuthority(tx: Prisma.TransactionClient, scope: PayrollSettlementAuthorityScope, write: boolean) {
  if (!scope.actorId || !scope.sessionId || !scope.sessionToken) throw new ForbiddenError("A current verified session is required for payroll settlement.")
  const isolation = await tx.$queryRaw<Array<{ isolation: string }>>`SELECT current_setting('transaction_isolation') AS isolation`
  if (isolation[0]?.isolation !== "serializable") throw new BusinessRuleError("Payroll settlement requires a Serializable transaction.")
  const accessInput = { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "payroll" as const,
    surfaceType: "action" as const, surface: "payroll.payments.reconcile", accessIntent: write ? "write" as const : "read" as const, mode: "enforce" as const }
  await evaluateModuleAccessInTx(tx, accessInput) // Acquires organization/configuration/grant locks first.
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" m ON m."A" = r.id WHERE m."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, m`
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId} AND "userId" = ${scope.actorId} FOR SHARE`
  // Recompute both entitlement time and session/assurance time AFTER lock waits.
  const access = await evaluateModuleAccessInTx(tx, accessInput)
  if (!access.allowed) throw new ForbiddenError("Current payroll module access is required.")
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } },
    select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true,
      roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const session = await tx.session.findFirst({ where: { id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId },
    select: { expiresAt: true, assuranceOrganizationId: true, assuranceVerifiedAt: true, assuranceLevel: true, assuranceMethod: true, assuranceLockedUntil: true } })
  const now = new Date(), permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(permissions, "payroll.payments.reconcile")) throw new ForbiddenError("Current payroll settlement permission is required.")
  if (!session || session.expiresAt <= now) throw new ForbiddenError("Your session expired or was revoked. Sign in again.")
  const fresh = session.assuranceOrganizationId === scope.organizationId && session.assuranceMethod === "password" && session.assuranceLevel >= 1
    && session.assuranceVerifiedAt != null && session.assuranceVerifiedAt <= now && now.getTime() - session.assuranceVerifiedAt.getTime() <= 300000
    && (!session.assuranceLockedUntil || session.assuranceLockedUntil <= now)
  if (write && !fresh) throw new BusinessRuleError("Verify your password before recording payroll settlement.", "FRESH_AUTH_REQUIRED")
  return { permissions, now, lastAuthAt: session.assuranceVerifiedAt ?? undefined }
}
