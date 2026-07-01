import { FinanceReceivablesSurface } from "@/components/finance/FinanceSpecializedLedgerSurfaces"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../FinanceRouteAccess"

export const metadata = {
  title: "Receivables | Stoquify",
  description: "Customer receivables, aging, collection, and ledger clearing surface.",
}

export default async function FinanceReceivablesPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("receivables"),
    resource: "FinanceReceivablesSurface",
    title: "Finance receivables",
    children: <FinanceReceivablesSurface />,
  })
}
