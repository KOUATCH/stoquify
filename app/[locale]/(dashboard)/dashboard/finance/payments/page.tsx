import { FinancePaymentsSurface } from "@/components/finance/FinanceSpecializedLedgerSurfaces"

import { FinanceRouteAccess, financeViewPermissions, type FinanceRouteParams } from "../FinanceRouteAccess"

export const metadata = {
  title: "Payments | AqStoqFlow",
  description: "Payment ledger, tender mix, reconciliation, and cash clearing surface.",
}

export default async function FinancePaymentsPage({ params }: { params: FinanceRouteParams }) {
  return FinanceRouteAccess({
    params,
    permissions: financeViewPermissions("payments"),
    resource: "FinancePaymentsSurface",
    title: "Finance payments",
    children: <FinancePaymentsSurface />,
  })
}
