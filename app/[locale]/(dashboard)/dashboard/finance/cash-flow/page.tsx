import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export default async function FinanceCashFlowPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-cash-flow")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-cash-flow")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinanceCommandCenterDashboard initialView="cash-flow" />,
  })
}
