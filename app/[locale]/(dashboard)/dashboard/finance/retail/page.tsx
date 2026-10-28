import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export default async function FinanceRetailPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-retail")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-retail")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinanceCommandCenterDashboard initialView="retail" />,
  })
}
