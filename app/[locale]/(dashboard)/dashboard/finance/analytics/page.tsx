import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export default async function FinanceAnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-analytics")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-analytics")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinanceCommandCenterDashboard initialView="analytics" />,
  })
}
