import "server-only"
import { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { bankBalanceHash, calculateBankBalance, type BankBalanceInput } from "./bank-balance-contract"

export const BANK_BALANCE_RAILS = ["BANK_TRANSFER", "CHEQUE"] as const
const fail = (message: string): never => { throw new BusinessRuleError(message) }
/** Bank balances use debit-positive book currency, including overdrafts. No FX
 * conversion, guessed fee signs, shared GL allocation or balancing plug. */
export async function readBankBalanceSnapshot(tx: Prisma.TransactionClient, organizationId: string, input: BankBalanceInput, cutoff: Date) {
  const period = await tx.accountingPeriod.findFirst({ where: { id: input.periodId, organizationId } })
  const account = await tx.providerAccount.findFirst({ where: { id: input.providerAccountId, organizationId, createdAt: { lte: cutoff } }, include: { paymentRail: true, settlementLedgerAccount: true, settlementAccounts: true } })
  if (!period || !account) return fail("Bank account or period is unavailable for this organization.")
  if (period.endDate >= cutoff) return fail("Bank reconciliation requires a completed period.")
  if (account.paymentRail.organizationId !== organizationId || !BANK_BALANCE_RAILS.includes(account.paymentRail.type as typeof BANK_BALANCE_RAILS[number])) return fail("The provider account is not a supported bank account.")
  const ledger = account.settlementLedgerAccount
  if (!ledger || ledger.organizationId !== organizationId || ledger.type !== "ASSET" || ledger.normalBalance !== "DEBIT" || (ledger.currency && ledger.currency !== account.currencyCode)) return fail("A same-currency bank asset ledger mapping is required.")
  if (account.settlementAccounts.some(row => row.organizationId !== organizationId || (row.approvalStatus === "APPROVED" && row.effectiveFrom <= period.endDate && (!row.effectiveTo || row.effectiveTo >= period.startDate) && row.ledgerAccountId !== ledger.id))) return fail("Bank settlement mappings conflict for this period.")
  const shared = await tx.providerAccount.count({ where: { organizationId, settlementLedgerAccountId: ledger.id, id: { not: account.id }, createdAt: { lte: cutoff } } })
  const sharedSettlement = await tx.settlementAccount.count({ where: { organizationId, ledgerAccountId: ledger.id, providerAccountId: { not: account.id }, approvalStatus: "APPROVED", effectiveFrom: { lte: period.endDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.startDate } }] } })
  if (shared || sharedSettlement) return fail("A bank ledger account shared with another provider cannot establish an account-specific balance.")
  const statement = await tx.statementFile.findFirst({ where: { id: input.statementFileId, organizationId, providerAccountId: account.id, createdAt: { lte: cutoff }, importedAt: { lte: cutoff }, status: { in: ["IMPORTED", "PROCESSED"] } } })
  if (!statement || +statement.periodStart !== +period.startDate || +statement.periodEnd !== +period.endDate || (statement.fileHash.startsWith("sha256:") ? statement.fileHash : `sha256:${statement.fileHash}`) !== input.sourceDocumentHash) return fail("An imported statement with the exact period and matching document hash is required.")
  const [statementLines, ledgerLines] = await Promise.all([
    tx.statementLine.findMany({ where: { statementFileId: statement.id }, orderBy: { id: "asc" }, select: { id: true, organizationId: true, providerAccountId: true, amount: true, feeAmount: true, currencyCode: true, direction: true, occurredAt: true, rawLineHash: true, createdAt: true } }),
    tx.journalEntryLine.findMany({ where: { accountId: ledger.id, journalEntry: { entryDate: { lte: period.endDate }, status: { in: ["POSTED", "REVERSED"] } } }, orderBy: { id: "asc" },
      select: { id: true, organizationId: true, debit: true, credit: true, currency: true, createdAt: true, journalEntry: { select: { id: true, organizationId: true, currency: true, entryDate: true, postedAt: true, createdAt: true, postingBatchId: true, status: true } } } }),
  ])
  let movement = new Prisma.Decimal(0), opening = new Prisma.Decimal(0), closing = new Prisma.Decimal(0)
  for (const line of statementLines) {
    if (line.organizationId !== organizationId || line.providerAccountId !== account.id || line.currencyCode !== account.currencyCode || line.createdAt > cutoff || line.occurredAt < period.startDate || line.occurredAt > period.endDate || line.amount.lt(0) || (line.feeAmount && !line.feeAmount.eq(0)) || !["CREDIT", "DEBIT", "FEE"].includes(line.direction)) return fail("Statement lines have ambiguous currency, sign, fee or cutoff evidence.")
    movement = line.direction === "CREDIT" ? movement.plus(line.amount) : movement.minus(line.amount)
  }
  for (const line of ledgerLines) {
    const entry = line.journalEntry
    if (line.organizationId !== organizationId || entry.organizationId !== organizationId || line.currency !== account.currencyCode || entry.currency !== account.currencyCode || line.createdAt > cutoff || entry.createdAt > cutoff || !entry.postedAt || entry.postedAt > cutoff || line.debit.lt(0) || line.credit.lt(0) || (line.debit.gt(0) && line.credit.gt(0))) return fail("Ledger balance has invalid, mixed-currency or unavailable cutoff evidence.")
    const amount = line.debit.minus(line.credit)
    closing = closing.plus(amount)
    if (entry.entryDate < period.startDate) opening = opening.plus(amount)
  }
  let openingTiming = new Prisma.Decimal(0), closingTiming = new Prisma.Decimal(0)
  const seen = new Set<string>()
  const timing = []
  for (const item of input.timingItems) {
    const key = `${item.boundary}:${item.journalEntryLineId}`
    if (seen.has(key)) return fail("A timing item may appear only once at each boundary.")
    seen.add(key)
    const line = ledgerLines.find(row => row.id === item.journalEntryLineId)
    if (!line || !line.journalEntry.postingBatchId || (item.boundary === "OPENING" && line.journalEntry.entryDate >= period.startDate) || line.debit.eq(line.credit)) return fail("Timing items must identify nonzero posted bank-ledger lines before the selected boundary.")
    const boundary = item.boundary === "OPENING" ? new Date(+period.startDate - 1) : period.endDate
    const matched = await tx.matchRecord.count({ where: { organizationId, status: { notIn: ["REJECTED", "VOIDED", "CORRECTED"] },
      OR: [{ ledgerPostingBatchId: line.journalEntry.postingBatchId }, { paymentTransaction: { ledgerPostingBatchId: line.journalEntry.postingBatchId } }],
      statementLine: { occurredAt: { lte: boundary } } } })
    if (matched) return fail("A bank-matched item cannot also explain an outstanding timing difference.")
    const amount = line.debit.minus(line.credit)
    if (item.boundary === "OPENING") openingTiming = openingTiming.plus(amount); else closingTiming = closingTiming.plus(amount)
    timing.push({ ...item, amount: amount.toFixed(2), kind: amount.gt(0) ? "DEPOSIT_IN_TRANSIT" : "OUTSTANDING_PAYMENT" })
  }
  return { version: 1, organizationId, providerAccountId: account.id, ledgerAccountId: ledger.id, periodId: period.id, currency: account.currencyCode,
    periodStart: period.startDate.toISOString(), periodEnd: period.endDate.toISOString(), statementFileId: statement.id, statementHash: statement.fileHash,
    sourceHash: bankBalanceHash({ statementLines, ledgerLines,
      account: { externalAccountHash: account.externalAccountHash, providerCode: account.providerCode, paymentRailId: account.paymentRailId },
      ledger: { id: ledger.id, code: ledger.code, currency: ledger.currency, type: ledger.type, normalBalance: ledger.normalBalance },
      settlementMappings: account.settlementAccounts.filter(row => row.approvalStatus === "APPROVED" && row.effectiveFrom <= period.endDate && (!row.effectiveTo || row.effectiveTo >= period.startDate)).sort((a, b) => a.id.localeCompare(b.id)),
    }), timing,
    balances: calculateBankBalance({ openingBalance: input.openingBalance, closingBalance: input.closingBalance, statementMovement: movement.toFixed(2), ledgerOpening: opening.toFixed(2), ledgerClosing: closing.toFixed(2), openingTiming: openingTiming.toFixed(2), closingTiming: closingTiming.toFixed(2) }) }
}
