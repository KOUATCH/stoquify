import "server-only"
import { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { BALANCE_SHEET_TYPES, balanceSheetHash, calculateBalanceSheet, type BalanceSheetInput } from "./balance-sheet-contract"
const fail = (message: string): never => { throw new BusinessRuleError(message) }
const posted = ["POSTED", "REVERSED"] as const

/** Evidence decisions invalidate close but must not invalidate one another's
 * schedules. All other registered financial source changes require re-review,
 * including subledger changes that have not yet produced a journal posting. */
async function supportingSourceRevision(tx: Prisma.TransactionClient, organizationId: string) {
  const row = await tx.closeSourceChange.findFirst({ where: { organizationId,
    sourceTable: { notIn: ["balance_sheet_evidence", "bank_balance_evidence", "reconciliation_no_activity_evidence"] } },
    orderBy: { revision: "desc" }, select: { revision: true } })
  return row ? String(row.revision) : "0"
}

export async function readBalanceSheetPopulation(tx: Prisma.TransactionClient, organizationId: string, period: { id: string; endDate: Date }, cutoff: Date) {
  const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { currency: true } })
  if (!organization) return fail("Balance-sheet organization is unavailable.")
  const accounts = await tx.chartOfAccount.findMany({ where: { organizationId, createdAt: { lte: cutoff }, type: { in: [...BALANCE_SHEET_TYPES] }, OR: [
    { isActive: true, deletedAt: null, children: { none: {} } },
    { journalLines: { some: { journalEntry: { entryDate: { lte: period.endDate }, status: { in: [...posted] } } } } },
    { balanceSheetEvidence: { some: { periodId: period.id, createdAt: { lte: cutoff } } } },
  ] }, orderBy: { id: "asc" }, select: { id: true, code: true, nameEn: true, currency: true,
    journalLines: { where: { journalEntry: { entryDate: { lte: period.endDate }, status: { in: [...posted] } } }, select: { currency: true } } } })
  return accounts.flatMap(account => {
    const currencies = [...new Set([...account.journalLines.map(row => row.currency), ...(account.currency ? [account.currency] : [])])]
    if (!currencies.length) currencies.push(organization.currency)
    return currencies.sort().map(currency => ({ ledgerAccountId: account.id, accountCode: account.code, accountName: account.nameEn, currency }))
  })
}

export async function readBalanceSheetSnapshot(tx: Prisma.TransactionClient, organizationId: string, input: BalanceSheetInput, cutoff: Date) {
  const period = await tx.accountingPeriod.findFirst({ where: { id: input.periodId, organizationId } })
  const account = await tx.chartOfAccount.findFirst({ where: { id: input.ledgerAccountId, organizationId, createdAt: { lte: cutoff } } })
  const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { currency: true } })
  if (!period || !account || !organization || !BALANCE_SHEET_TYPES.includes(account.type as typeof BALANCE_SHEET_TYPES[number])) return fail("Balance-sheet account or period is unavailable for this organization.")
  if (period.endDate >= cutoff) return fail("Balance-sheet reconciliation requires a completed period.")
  const lines = await tx.journalEntryLine.findMany({ where: { accountId: account.id, journalEntry: { entryDate: { lte: period.endDate }, status: { in: [...posted] } } }, orderBy: { id: "asc" },
    select: { id: true, organizationId: true, currency: true, debit: true, credit: true, createdAt: true,
      journalEntry: { select: { id: true, organizationId: true, currency: true, entryDate: true, createdAt: true, postedAt: true, status: true, postingBatchId: true } } } })
  if ((account.currency && account.currency !== input.currency) || (!lines.some(line => line.currency === input.currency) && input.currency !== (account.currency ?? organization.currency))) return fail("Schedule currency is not supported by this ledger account.")
  let opening = new Prisma.Decimal(0), additions = new Prisma.Decimal(0), reductions = new Prisma.Decimal(0)
  let periodLineCount = 0
  for (const line of lines) {
    const entry = line.journalEntry
    if (line.organizationId !== organizationId || entry.organizationId !== organizationId || line.currency !== entry.currency ||
      (account.currency && line.currency !== account.currency) || line.createdAt > cutoff || entry.createdAt > cutoff || !entry.postedAt || entry.postedAt > cutoff ||
      line.debit.lt(0) || line.credit.lt(0) || (line.debit.gt(0) && line.credit.gt(0))) return fail("Balance-sheet ledger evidence has invalid tenant, currency, posting or recording-cutoff data.")
    if (line.currency !== input.currency) continue
    const increase = account.normalBalance === "DEBIT" ? line.debit : line.credit
    const decrease = account.normalBalance === "DEBIT" ? line.credit : line.debit
    if (entry.entryDate < period.startDate) opening = opening.plus(increase).minus(decrease)
    else { additions = additions.plus(increase); reductions = reductions.plus(decrease); periodLineCount++ }
  }
  if (input.basis === "ZERO_ACTIVITY" && (!opening.eq(0) || periodLineCount > 0)) return fail("Zero-activity evidence requires no opening balance and no posted period lines.")
  const balances = calculateBalanceSheet(input, { openingBalance: opening.toFixed(2), additions: additions.toFixed(2), reductions: reductions.toFixed(2), closingBalance: opening.plus(additions).minus(reductions).toFixed(2) })
  return { version: 1, organizationId, ledgerAccountId: account.id, accountCode: account.code, periodId: period.id, currency: input.currency,
    normalBalance: account.normalBalance, accountType: account.type, periodStart: period.startDate.toISOString(), periodEnd: period.endDate.toISOString(),
    sourceRevision: await supportingSourceRevision(tx, organizationId),
    sourceHash: balanceSheetHash({ lines, account: { code: account.code, type: account.type, normalBalance: account.normalBalance, mappingKey: account.mappingKey, currency: account.currency } }),
    balances }
}
