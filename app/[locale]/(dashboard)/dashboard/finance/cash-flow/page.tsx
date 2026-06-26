import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../FinanceRouteAccess"

export default async function FinanceCashFlowPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("cash-flow"),
    resource: "FinanceCashFlowDashboard",
    title: "Finance cash flow dashboard",
    children: <FinanceCommandCenterDashboard initialView="cash-flow" />,
  })
}
