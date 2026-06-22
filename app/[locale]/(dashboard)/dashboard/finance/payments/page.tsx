import { FinancePaymentsSurface } from "@/components/finance/FinanceSpecializedLedgerSurfaces"

export const metadata = {
  title: "Payments | AqStoqFlow",
  description: "Payment ledger, tender mix, reconciliation, and cash clearing surface.",
}

export default function FinancePaymentsPage() {
  return <FinancePaymentsSurface />
}
