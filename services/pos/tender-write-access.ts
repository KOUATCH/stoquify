import "server-only"

import type { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { ApplicationError, ForbiddenError } from "@/services/_shared/action-errors"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"

export const POS_TENDER_WRITE_POLICY_VERSION = "2026-09-13.1"
export type POSTenderWriteScope = {
  organizationId: string
  userId: string
  salesOrderId: string
  operation: "commit" | "refund" | "void"
}

/** Supplied by the authenticated action, never parsed from a tender payload.
 * Offline replay has its own retained-device admission contract. */
export type POSInteractiveAuthority = { sessionId: string; sessionToken: string }

export async function assertPOSInteractiveAuthorityInTx(
  tx: Prisma.TransactionClient, scope: POSTenderWriteScope, authority: POSInteractiveAuthority,
) {
  // Follow the purchasing authority lock order. Revocations either precede
  // this decision or wait for its financial transaction to finish.
  await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId} AND "isActive" = true AND "deletedAt" IS NULL FOR SHARE`
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.userId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" membership ON membership."A" = r.id WHERE membership."B" = ${scope.userId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, membership`
  const actor = await tx.user.findFirst({ where: { id: scope.userId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const now = new Date(), permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  const permission = scope.operation === "commit" ? "pos.use" : `pos.transactions.${scope.operation}`
  if (!actor || !isUsableAccount(actor, now) || !hasRbacPermission(permissions, permission)) throw new ForbiddenError("Current POS authority is required.")
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${authority.sessionId} AND "userId" = ${scope.userId} FOR SHARE`
  const checkedAt = new Date()
  const session = await tx.session.findFirst({ where: { id: authority.sessionId, token: authority.sessionToken, userId: scope.userId, expiresAt: { gt: checkedAt } }, select: { assuranceOrganizationId: true, assuranceVerifiedAt: true, assuranceLevel: true, assuranceMethod: true, assuranceLockedUntil: true } })
  if (!session) throw new ForbiddenError("Your session expired or was revoked. Sign in again.")
  if (scope.operation !== "commit" && !(session.assuranceOrganizationId === scope.organizationId && session.assuranceMethod === "password" && session.assuranceLevel >= 1 && session.assuranceVerifiedAt && session.assuranceVerifiedAt <= checkedAt && checkedAt.getTime() - session.assuranceVerifiedAt.getTime() <= 300000 && (!session.assuranceLockedUntil || session.assuranceLockedUntil <= checkedAt))) throw new ForbiddenError("Fresh authentication is required to correct this sale.")
}

export class POSTenderWriteAccessError extends ApplicationError {
  constructor(operation: POSTenderWriteScope["operation"]) {
    super("FORBIDDEN", "Writable POS access and its required dependencies are needed for this operation.", 403, true, {
      reason: "POS_TENDER_WRITE_UNAVAILABLE", policyId: `pos.tender.${operation}`, policyVersion: POS_TENDER_WRITE_POLICY_VERSION,
    })
    this.name = "POSTenderWriteAccessError"
  }
}

/** Recheck the existing action policy in the financial transaction. Exact
 * committed-result retrieval is handled before new-sale admission. */
export async function assertPOSTenderWriteAccessInTx(tx: Prisma.TransactionClient, scope: POSTenderWriteScope) {
  const decision = await evaluateModuleAccessInTx(tx, {
    organizationId: scope.organizationId, userId: scope.userId,
    moduleSlug: "pos", surfaceType: "action",
    surface: `actions/pos/tender.actions.ts:${scope.operation}POSSaleAction`,
    accessIntent: "write", mode: "enforce",
  })
  if (!decision.allowed) throw new POSTenderWriteAccessError(scope.operation)
}

/** Persist denial only after rollback; never turn an audit failure into success. */
export async function auditPOSTenderWriteDenial(error: unknown, scope: POSTenderWriteScope) {
  if (!(error instanceof POSTenderWriteAccessError)) return
  await db.auditLog.create({ data: {
    organizationId: scope.organizationId, userId: scope.userId,
    entityType: "SalesOrder", entityId: scope.salesOrderId,
    action: "POS_TENDER_WRITE_ENTITLEMENT_DENIED",
    changes: { policyId: `pos.tender.${scope.operation}`, policyVersion: POS_TENDER_WRITE_POLICY_VERSION, reason: "POS_TENDER_WRITE_UNAVAILABLE" },
  } })
}
