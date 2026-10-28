import { FinancePaymentsSurface } from "@/components/finance/FinanceSpecializedLedgerSurfaces"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export const metadata = {
  title: "Payments | Stoquify",
  description: "Payment ledger, tender mix, reconciliation, and cash clearing surface.",
}

export default async function FinancePaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-payments")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-payments")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinancePaymentsSurface />,
  })
}
