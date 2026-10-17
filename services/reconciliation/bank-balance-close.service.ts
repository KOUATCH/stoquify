import "server-only"
import type { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { createCloseControlScope, type CloseControlScope } from "@/services/accounting/close-control-scope"
import { bankBalanceHash, bankBalanceInputSchema } from "./bank-balance-contract"
import { BANK_BALANCE_RAILS, readBankBalanceSnapshot } from "./bank-balance-sources.service"

export async function readBankBalanceClose(tx: Prisma.TransactionClient, scope: CloseControlScope) {
  const cutoff = new Date(scope.recordedThrough)
  const period = await tx.accountingPeriod.findFirst({ where: { id: scope.periodId, organizationId: scope.organizationId } })
  if (!period || createCloseControlScope(scope.organizationId, period, cutoff).scopeHash !== scope.scopeHash) throw new BusinessRuleError("Bank reconciliation scope is invalid or changed.")
  const accounts = await tx.providerAccount.findMany({ where: { organizationId: scope.organizationId, createdAt: { lte: cutoff }, paymentRail: { type: { in: [...BANK_BALANCE_RAILS] } } }, orderBy: { id: "asc" }, select: { id: true, displayName: true, currencyCode: true } })
  const results = []
  for (const account of accounts) {
    const rows = await tx.bankBalanceEvidence.findMany({ where: { organizationId: scope.organizationId, providerAccountId: account.id, periodId: scope.periodId, createdAt: { lte: cutoff } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2 })
    const row = rows[0]
    let reason: string | null = !row ? "Bank balance evidence is missing." : row.status !== "APPROVED" || !row.approvedAt || row.approvedAt > cutoff || !row.approvedById || row.approvedById === row.proposedById
      ? "The latest bank balance evidence lacks current independent approval." : rows[1] && +rows[1].createdAt === +row.createdAt ? "Latest bank balance evidence is ambiguous." : null
    let snapshot: Awaited<ReturnType<typeof readBankBalanceSnapshot>> | null = null
    if (!reason) {
      const parsed = bankBalanceInputSchema.safeParse(row.input)
      if (!parsed.success || parsed.data.providerAccountId !== account.id || parsed.data.periodId !== scope.periodId || parsed.data.statementFileId !== row.statementFileId || parsed.data.idempotencyKey !== row.idempotencyKey || bankBalanceHash({ organizationId: row.organizationId, proposedById: row.proposedById, input: row.input, snapshot: row.snapshot }) !== row.evidenceHash) reason = "Bank balance evidence integrity is invalid."
      else {
        try { snapshot = await readBankBalanceSnapshot(tx, scope.organizationId, parsed.data, cutoff) }
        catch (error) { if (error instanceof BusinessRuleError) reason = error.message; else throw error }
        if (snapshot && (bankBalanceHash(snapshot) !== bankBalanceHash(row.snapshot) || !snapshot.balances.balanced)) reason = "Bank balances differ or the reviewed source evidence has changed."
      }
    }
    results.push({ providerAccountId: account.id, accountName: account.displayName, currency: account.currencyCode,
      status: reason ? "BLOCKED" as const : "RECONCILED" as const, reason,
      evidenceId: row?.id ?? null, evidenceHash: row?.evidenceHash ?? null, approvedById: row?.approvedById ?? null,
      approvedAt: row?.approvedAt?.toISOString() ?? null, snapshot })
  }
  return { version: 1 as const, scopeHash: scope.scopeHash, accounts: results, requiredAccountCount: accounts.length,
    blockedAccountCount: results.filter(row => row.status === "BLOCKED").length, reconciledAccountCount: results.filter(row => row.status === "RECONCILED").length }
}
