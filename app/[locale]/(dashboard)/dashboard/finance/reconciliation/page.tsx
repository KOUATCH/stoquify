import PaymentReconciliationWorkbench from "@/components/finance/PaymentReconciliationWorkbench"

import { FinanceRouteAccess, type FinanceRouteParams } from "../FinanceRouteAccess"

export default async function FinanceReconciliationPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: ["payments.reconciliation.read"],
    resource: "PaymentReconciliationWorkbench",
    title: "Payment reconciliation",
    module: {
      moduleSlug: "payment_reconciliation",
      surface: "/dashboard/finance/reconciliation",
      accessIntent: "read",
    },
    children: <PaymentReconciliationWorkbench />,
  })
}
