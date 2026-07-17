import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../FinanceRouteAccess"

export default async function FinanceAnalyticsPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("analytics"),
    resource: "FinanceAnalytics",
    title: "Finance analytics",
    children: <FinanceCommandCenterDashboard initialView="analytics" />,
  })
}
