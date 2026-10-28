import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { routeByKey, withFinanceSurfaceAccess } from "./finance-route-access"

export default async function FinanceDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-dashboard")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-dashboard")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinanceCommandCenterDashboard initialView="overview" />,
  })
}
