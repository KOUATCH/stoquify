import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export default async function FinanceCostsPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-costs")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-costs")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinanceCommandCenterDashboard initialView="costs" layout="costs" />,
  })
}
