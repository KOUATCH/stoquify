import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "./FinanceRouteAccess"

export default async function FinanceDashboardPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("overview"),
    resource: "FinanceDashboard",
    title: "Finance dashboard",
    children: <FinanceCommandCenterDashboard initialView="overview" />,
  })
}
