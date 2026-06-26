import { FinancePayablesSurface } from "@/components/finance/FinanceSpecializedLedgerSurfaces"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../FinanceRouteAccess"

export const metadata = {
  title: "Payables | AqStoqFlow",
  description: "Supplier payables, AP aging, disbursement, and ledger posting surface.",
}

export default async function FinancePayablesPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("payables"),
    resource: "FinancePayablesSurface",
    title: "Finance payables",
    children: <FinancePayablesSurface />,
  })
}
