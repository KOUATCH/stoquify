import "server-only"
import type { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { createCloseControlScope, type CloseControlScope } from "./close-control-scope"
import { balanceSheetHash, balanceSheetInputSchema } from "./balance-sheet-contract"
import { readBalanceSheetPopulation, readBalanceSheetSnapshot } from "./balance-sheet-sources.service"

export async function readBalanceSheetClose(tx: Prisma.TransactionClient, scope: CloseControlScope) {
  const cutoff = new Date(scope.recordedThrough)
  const period = await tx.accountingPeriod.findFirst({ where: { id: scope.periodId, organizationId: scope.organizationId } })
  if (!period || createCloseControlScope(scope.organizationId, period, cutoff).scopeHash !== scope.scopeHash) throw new BusinessRuleError("Balance-sheet scope is invalid or changed.")
  const population = await readBalanceSheetPopulation(tx, scope.organizationId, period, cutoff)
  const results = []
  for (const account of population) {
    const rows = await tx.balanceSheetEvidence.findMany({ where: { organizationId: scope.organizationId, ledgerAccountId: account.ledgerAccountId, currency: account.currency, periodId: scope.periodId, createdAt: { lte: cutoff } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2 })
    const row = rows[0]
    let reason: string | null = !row ? "Balance-sheet supporting evidence is missing." : row.status !== "APPROVED" || !row.approvedAt || row.approvedAt > cutoff || !row.approvedById || row.approvedById === row.proposedById
      ? "The latest balance-sheet evidence lacks current independent approval." : rows[1] && +rows[1].createdAt === +row.createdAt ? "Latest balance-sheet evidence is ambiguous." : null
    let snapshot: Awaited<ReturnType<typeof readBalanceSheetSnapshot>> | null = null
    if (!reason) {
      const parsed = balanceSheetInputSchema.safeParse(row.input)
      if (!parsed.success || parsed.data.ledgerAccountId !== account.ledgerAccountId || parsed.data.periodId !== scope.periodId || parsed.data.currency !== account.currency || parsed.data.idempotencyKey !== row.idempotencyKey || balanceSheetHash({ organizationId: row.organizationId, proposedById: row.proposedById, input: row.input, snapshot: row.snapshot }) !== row.evidenceHash) reason = "Balance-sheet evidence integrity is invalid."
      else {
        try { snapshot = await readBalanceSheetSnapshot(tx, scope.organizationId, parsed.data, cutoff) }
        catch (error) { if (error instanceof BusinessRuleError) reason = error.message; else throw error }
        if (snapshot && (balanceSheetHash(snapshot) !== balanceSheetHash(row.snapshot) || !snapshot.balances.balanced)) reason = "The schedule differs from the ledger or reviewed sources have changed."
      }
    }
    results.push({ ...account, status: reason ? "BLOCKED" as const : "RECONCILED" as const, reason,
      evidenceId: row?.id ?? null, evidenceHash: row?.evidenceHash ?? null, approvedById: row?.approvedById ?? null,
      approvedAt: row?.approvedAt?.toISOString() ?? null, snapshot })
  }
  return { version: 1 as const, scopeHash: scope.scopeHash, accounts: results, requiredAccountCount: results.length,
    blockedAccountCount: results.filter(row => row.status === "BLOCKED").length, reconciledAccountCount: results.filter(row => row.status === "RECONCILED").length }
}
