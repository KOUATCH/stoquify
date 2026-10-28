import { AROpenItemsHistoryWorkbench } from "@/components/finance/AROpenItemsHistoryWorkbench"

import { routeByKey, withFinanceSurfaceAccess } from "../../finance-route-access"

export const metadata = {
  title: "Customer AR history | Stoquify",
  description: "Customer receivable open-item, allocation, aging, and settlement history.",
}

export default async function FinanceReceivablesHistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-receivables-history")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-receivables-history")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <AROpenItemsHistoryWorkbench />,
  })
}
