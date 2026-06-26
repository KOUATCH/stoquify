import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../FinanceRouteAccess"

export default async function FinanceProfitabilityPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("profitability"),
    resource: "FinanceProfitabilityDashboard",
    title: "Finance profitability dashboard",
    children: <FinanceCommandCenterDashboard initialView="profitability" />,
  })
}
