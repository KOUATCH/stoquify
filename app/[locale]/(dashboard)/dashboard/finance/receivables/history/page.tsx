import { AROpenItemsHistoryWorkbench } from "@/components/finance/AROpenItemsHistoryWorkbench"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../../FinanceRouteAccess"

export const metadata = {
  title: "Customer AR history | Stoquify",
  description: "Customer receivable open-item, allocation, aging, and settlement history.",
}

export default async function FinanceReceivablesHistoryPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("receivables"),
    resource: "AROpenItemsHistorySurface",
    title: "Customer AR history",
    children: <AROpenItemsHistoryWorkbench />,
  })
}
