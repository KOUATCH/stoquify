import { Prisma } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"

type AmountRow = { amount: Prisma.Decimal | null; currencyCode: string }
type MatchRow = { amountMatched: Prisma.Decimal | null; currencyCode: string; status: string }
type SuspenseRow = AmountRow & { status: string }
export const reconciliationAmountKeys = ["payments", "providerEvents", "statementLines", "matched", "unresolvedSuspense"] as const
type AmountKey = typeof reconciliationAmountKeys[number]
export type ReconciliationAmountSummary = {
  version: 1
  basis: "GROSS_SOURCE_AMOUNTS_BY_CURRENCY"
  currencies: Array<{ currencyCode: string; amounts: Record<AmountKey, string | null> }>
}

// Evidence categories can describe the same payment. Never add categories or
// currencies together, or treat their gross amounts as a net ledger balance.
export function reconciliationAmountSummary(input: {
  paymentTransactions: AmountRow[]; providerEvents: AmountRow[]; statementLines: AmountRow[];
  matchRecords: MatchRow[]; suspenseItems: SuspenseRow[];
}): ReconciliationAmountSummary {
  const currencies = new Map<string, Record<AmountKey, Prisma.Decimal | null>>()
  const add = (key: AmountKey, row: AmountRow) => {
    if (!/^[A-Z]{3}$/.test(row.currencyCode)) throw new ConflictError("Reconciliation source currency requires review.")
    let amounts = currencies.get(row.currencyCode)
    if (!amounts) {
      amounts = { payments: new Prisma.Decimal(0), providerEvents: new Prisma.Decimal(0), statementLines: new Prisma.Decimal(0), matched: new Prisma.Decimal(0), unresolvedSuspense: new Prisma.Decimal(0) }
      currencies.set(row.currencyCode, amounts)
    }
    if (row.amount === null) { amounts[key] = null; return }
    if (!row.amount.isFinite() || row.amount.isNegative()) throw new ConflictError("Reconciliation source amount requires review.")
    if (amounts[key] !== null) amounts[key] = amounts[key]!.plus(row.amount)
  }
  for (const row of input.paymentTransactions) add("payments", row)
  for (const row of input.providerEvents) add("providerEvents", row)
  for (const row of input.statementLines) add("statementLines", row)
  for (const row of input.matchRecords) if (["AUTO_MATCHED", "APPROVED", "CORRECTED"].includes(row.status)) add("matched", { ...row, amount: row.amountMatched })
  for (const row of input.suspenseItems) {
    if (["OPEN", "ASSIGNED", "IN_REVIEW", "POSTED_TO_SUSPENSE", "RESOLUTION_PROPOSED", "REOPENED"].includes(row.status)) add("unresolvedSuspense", row)
    else if (!["RESOLVED", "WRITTEN_OFF"].includes(row.status)) throw new ConflictError("Reconciliation suspense status requires review.")
  }
  return { version: 1, basis: "GROSS_SOURCE_AMOUNTS_BY_CURRENCY", currencies: [...currencies].sort(([a], [b]) => a.localeCompare(b)).map(([currencyCode, values]) => ({
    currencyCode, amounts: Object.fromEntries(reconciliationAmountKeys.map(key => [key, values[key]?.toFixed(2) ?? null])) as Record<AmountKey, string | null>,
  })) }
}
