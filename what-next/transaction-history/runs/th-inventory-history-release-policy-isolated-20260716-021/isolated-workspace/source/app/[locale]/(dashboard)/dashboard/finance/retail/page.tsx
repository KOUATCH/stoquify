import FinanceCommandCenterDashboard from "@/components/finance/FinanceCommandCenterDashboard"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../FinanceRouteAccess"

export default async function FinanceRetailPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("retail"),
    resource: "FinanceRetailDashboard",
    title: "Retail finance dashboard",
    children: <FinanceCommandCenterDashboard initialView="retail" />,
  })
}
