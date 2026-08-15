import CashDrawerManagementDashboard from "@/components/pos/CashDrawerManagementDashboard"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export default async function FinanceCashDrawerPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-cash-drawer")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-cash-drawer")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <CashDrawerManagementDashboard />,
  })
}
