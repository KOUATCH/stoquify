import { CashPaymentHistoryWorkbench } from "@/components/finance/CashPaymentHistoryWorkbench"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

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

export default async function CashPaymentHistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-cash-payment-history")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-cash-payment-history")
  }

  return withFinanceSurfaceAccess({
    params,
    surface: {
      ...surface,
      permissions: cashPaymentHistoryPermissions,
    },
    onAllowed: () => <CashPaymentHistoryWorkbench />,
  })
}
