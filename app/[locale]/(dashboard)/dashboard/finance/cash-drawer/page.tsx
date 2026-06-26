import CashDrawerManagementDashboard from "@/components/pos/CashDrawerManagementDashboard"

import { FinanceRouteAccess, type FinanceRouteParams } from "../FinanceRouteAccess"

export default async function FinanceCashDrawerPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: ["finance.cash-drawer.read", "finance.read"],
    resource: "FinanceCashDrawer",
    title: "Finance cash drawer",
    children: <CashDrawerManagementDashboard />,
  })
}
