"use server"

import { protect } from "@/services/_shared/protect"
import {
  getPaymentReconciliationWorkbench,
  type PaymentReconciliationWorkbenchData as WorkbenchServiceData,
} from "@/services/payments/payment-reconciliation-workbench.service"
import { paymentReconciliationWorkbenchInputSchema } from "@/services/payments/payment-reconciliation-workbench.schemas"

export type PaymentReconciliationWorkbenchData = WorkbenchServiceData & { scope: { organizationId: string; actorId: string } }

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
    const data = await getPaymentReconciliationWorkbench({
      ...parsed,
      organizationId: ctx.orgId,
    })
    return { ...data, scope: { organizationId: ctx.orgId, actorId: ctx.userId } }
  },
)

export async function getPaymentReconciliationWorkbenchAction(input: unknown = {}) {
  return getWorkbench(input)
}
