import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../FinanceRouteAccess"

export default async function FinanceSalesPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("sales"),
    resource: "FinanceSales",
    title: "Finance sales dashboard",
    children: <FinanceCommandCenterDashboard initialView="sales" />,
  })
}
