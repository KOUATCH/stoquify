import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../FinanceRouteAccess"

export default async function FinanceCostsPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("costs"),
    resource: "FinanceCostsDashboard",
    title: "Finance cost analysis",
    children: <FinanceCommandCenterDashboard initialView="costs" />,
  })
}
