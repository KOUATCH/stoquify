import { FinancePayablesSurface } from "@/components/finance/FinanceSpecializedLedgerSurfaces"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export const metadata = {
  title: "Payables | Stoquify",
  description: "Supplier payables, AP aging, disbursement, and ledger posting surface.",
}

export default async function FinancePayablesPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-payables")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-payables")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinancePayablesSurface />,
  })
}
