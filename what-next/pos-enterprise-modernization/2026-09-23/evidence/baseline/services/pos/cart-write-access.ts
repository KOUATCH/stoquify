import "server-only"

import type { Prisma } from "@prisma/client"
import { ApplicationError } from "@/services/_shared/action-errors"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"

export const POS_CART_WRITE_POLICY_VERSION = "2026-09-13.1"
export type POSCartWriteScope = { organizationId: string; userId: string; resourceId: string; operation: "add" | "update" | "remove" }
const surfaces = { add: "addPOSCartLineAction", update: "updatePOSCartLineAction", remove: "removePOSCartLineAction" } as const

export class POSCartWriteAccessError extends ApplicationError {
  constructor(operation: POSCartWriteScope["operation"]) {
    super("FORBIDDEN", "Writable POS access and its required dependencies are needed to change this cart.", 403, true,
      { reason: "POS_CART_WRITE_UNAVAILABLE", policyId: `pos.cart.${operation}`, policyVersion: POS_CART_WRITE_POLICY_VERSION })
    this.name = "POSCartWriteAccessError"
  }
}

/** Draft writes only. Reading retained carts and closing existing shifts keep
 * their own scoped rules. This does not authorize a sale or change any grant. */
export async function assertPOSCartWriteAccessInTx(tx: Prisma.TransactionClient, scope: POSCartWriteScope) {
  const decision = await evaluateModuleAccessInTx(tx, {
    organizationId: scope.organizationId, userId: scope.userId,
    moduleSlug: "pos", surfaceType: "action", surface: `actions/pos/cart.actions.ts:${surfaces[scope.operation]}`,
    accessIntent: "write", mode: "enforce",
  })
  if (!decision.allowed) throw new POSCartWriteAccessError(scope.operation)
}
