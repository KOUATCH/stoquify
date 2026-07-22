import { CashPaymentHistoryWorkbench } from "@/components/finance/CashPaymentHistoryWorkbench"

import { FinanceRouteAccess, type FinanceRouteParams } from "../FinanceRouteAccess"

const cashPaymentHistoryPermissions = [
  "finance.cash-drawer.read",
  "finance.read",
  "payments.reconciliation.read",
  "finance.payments.read",
  "pos.read",
  "OPERATE_POS",
]

export const metadata = {
  title: "Cash and payment history | Stoquify",
  description: "Complete cashier, cash drawer, payment, and settlement history with server-owned filters and export controls.",
}

export default async function CashPaymentHistoryPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: cashPaymentHistoryPermissions,
    resource: "CashPaymentHistorySurface",
    title: "Cash and payment history",
    children: <CashPaymentHistoryWorkbench />,
  })
}
