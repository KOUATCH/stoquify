import PaymentReconciliationWorkbench from "@/components/finance/PaymentReconciliationWorkbench"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export default async function FinanceReconciliationPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-reconciliation")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-reconciliation")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <PaymentReconciliationWorkbench />,
  })
}
