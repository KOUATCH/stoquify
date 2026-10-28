import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export default async function FinanceProfitLossPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-profit-loss")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-profit-loss")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinanceCommandCenterDashboard initialView="profitability" layout="profit-loss" />,
  })
}
