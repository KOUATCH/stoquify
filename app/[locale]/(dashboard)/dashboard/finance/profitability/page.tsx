import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export default async function FinanceProfitabilityPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-profitability")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-profitability")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinanceCommandCenterDashboard initialView="profitability" />,
  })
}
