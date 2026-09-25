import "server-only"

import type { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { ApplicationError } from "@/services/_shared/action-errors"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"

export const POS_TENDER_WRITE_POLICY_VERSION = "2026-09-13.1"
export type POSTenderWriteScope = {
  organizationId: string
  userId: string
  salesOrderId: string
  operation: "commit" | "refund" | "void"
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
