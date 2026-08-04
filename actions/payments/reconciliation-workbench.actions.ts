"use server"

import { protect } from "@/services/_shared/protect"
import {
  getPaymentReconciliationWorkbench,
  type PaymentReconciliationWorkbenchData,
} from "@/services/payments/payment-reconciliation-workbench.service"
import { paymentReconciliationWorkbenchInputSchema } from "@/services/payments/payment-reconciliation-workbench.schemas"

export type { PaymentReconciliationWorkbenchData }

const getWorkbench = protect<unknown, PaymentReconciliationWorkbenchData>(
  {
    permission: "payments.reconciliation.read",
    auditResource: "PaymentReconciliation",
    auditAllowed: false,
    module: {
      moduleSlug: "payment_reconciliation",
      surface: "actions/payments/reconciliation-workbench.actions.ts:getPaymentReconciliationWorkbenchAction",
      surfaceType: "action",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = paymentReconciliationWorkbenchInputSchema.parse(input)
    return getPaymentReconciliationWorkbench({
      ...parsed,
      organizationId: ctx.orgId,
    })
  },
)

export async function getPaymentReconciliationWorkbenchAction(input: unknown = {}) {
  return getWorkbench(input)
}
