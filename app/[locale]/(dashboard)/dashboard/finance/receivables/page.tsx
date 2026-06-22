import { FinanceReceivablesSurface } from "@/components/finance/FinanceSpecializedLedgerSurfaces"

export const metadata = {
  title: "Receivables | AqStoqFlow",
  description: "Customer receivables, aging, collection, and ledger clearing surface.",
}

export default function FinanceReceivablesPage() {
  return <FinanceReceivablesSurface />
}
