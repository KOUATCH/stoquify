import { FinanceReceivablesSurface } from "@/components/finance/FinanceSpecializedLedgerSurfaces"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export const metadata = {
  title: "Receivables | Stoquify",
  description: "Customer receivables, aging, collection, and ledger clearing surface.",
}

export default async function FinanceReceivablesPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-receivables")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-receivables")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <FinanceReceivablesSurface />,
  })
}
