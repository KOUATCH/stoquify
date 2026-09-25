import "server-only"

import type { Prisma } from "@prisma/client"
import { ApplicationError } from "@/services/_shared/action-errors"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"

/** New shift admission only. Existing shift closure and financial completion
 * keep their own authorization and domain rules. No tenant grants are changed. */
export const POS_SHIFT_OPEN_ACCESS_POLICY = Object.freeze({
  id: "pos.shift.open",
  version: "2026-09-13.1",
  moduleSlug: "pos",
  surfaceType: "action",
  surface: "actions/pos/session.actions.ts:openPOSShiftAction",
  accessIntent: "write",
  mode: "enforce",
} as const)

export class POSShiftOpeningAccessError extends ApplicationError {
  constructor() {
    super("FORBIDDEN", "A writable POS entitlement and its required dependencies are needed to open a shift.", 403, true,
      { reason: "POS_SHIFT_ENTITLEMENT_UNAVAILABLE", policyId: POS_SHIFT_OPEN_ACCESS_POLICY.id, policyVersion: POS_SHIFT_OPEN_ACCESS_POLICY.version })
    this.name = "POSShiftOpeningAccessError"
  }
}

export async function assertPOSShiftOpeningAccessInTx(tx: Prisma.TransactionClient, scope: { organizationId: string; userId: string }) {
  const decision = await evaluateModuleAccessInTx(tx, { ...scope, ...POS_SHIFT_OPEN_ACCESS_POLICY })
  if (!decision.allowed) throw new POSShiftOpeningAccessError()
}
