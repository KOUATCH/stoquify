import { FinancePayablesSurface } from "@/components/finance/FinanceSpecializedLedgerSurfaces"

export const metadata = {
  title: "Payables | AqStoqFlow",
  description: "Supplier payables, AP aging, disbursement, and ledger posting surface.",
}

export default function FinancePayablesPage() {
  return <FinancePayablesSurface />
}
