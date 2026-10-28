import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../FinanceRouteAccess"

export default async function FinanceProfitLossPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("profitability"),
    resource: "FinanceProfitLossDashboard",
    title: "Finance profit and loss dashboard",
    children: <FinanceCommandCenterDashboard initialView="profitability" />,
  })
}
