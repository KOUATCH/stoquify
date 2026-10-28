import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export default async function FinanceSalesPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-sales")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-sales")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinanceCommandCenterDashboard initialView="sales" />,
  })
}
