import "server-only"
import { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { approvedOpeningSourceInTx, openingJson, openingMoney, retainOpeningOperationInTx } from "@/services/onboarding/opening-domain-source"
import { assertEntryAccountsPostable, createLedgerPostingBatch, linkAccountingSource } from "./posting.service"
import { assertBalancedJournalEntry, assertSameOrganizationAccounts } from "./invariants"
import { recordPostedJournalCloseInvalidationInTx } from "./journal-close-invalidation.service"

/** One opening journal owns GL for all domains; adapters never post a second journal. */
export async function postControlledOpeningLedgerInTx(tx: Prisma.TransactionClient, organizationId: string, executionId: string, affectedPeriodIds: string[]) {
  const { execution, source, target, at } = await approvedOpeningSourceInTx(tx, organizationId, executionId)
  const accounts = await tx.chartOfAccount.findMany({ where: { organizationId, id: { in: source.ledger.map(row => target("accounts", row.account)) }, isActive: true, deletedAt: null } })
  assertSameOrganizationAccounts(organizationId, accounts)
  await assertEntryAccountsPostable(organizationId, source.ledger.map(row => target("accounts", row.account)), tx)
  const lines = source.ledger.map((row, index) => {
    const accountId = target("accounts", row.account), account = accounts.find(item => item.id === accountId)
    if (!account || (account.currency && account.currency !== source.currency)) throw new BusinessRuleError("Opening accounts must be active, postable and use XAF.")
    const amount = openingMoney(row.amount), debit = row.side === "DEBIT" ? amount : new Prisma.Decimal(0), credit = row.side === "CREDIT" ? amount : new Prisma.Decimal(0)
    return { organizationId, accountId, lineNumber: index + 1, debit, credit, baseDebit: debit, baseCredit: credit,
      currency: source.currency, exchangeRate: 1, description: `Opening ${row.domain}: ${row.sourceId}`, metadata: openingJson({ sourceId: row.sourceId, covers: row.covers }) }
  })
  assertBalancedJournalEntry(lines)
  const journal = await tx.journal.findFirst({ where: { organizationId, code: "AN", type: "OPENING", isActive: true } })
  if (!journal) throw new BusinessRuleError("Configure the existing AN opening journal before cutover.")
  const batch = await createLedgerPostingBatch({ organizationId, periodId: execution.periodId, sourceType: "OPENING_BALANCE",
    sourceId: execution.id, sourceVersion: execution.revision.revision, postingPurpose: "OPENING_BALANCE",
    idempotencyKey: `opening:${execution.id}:ledger`, metadata: openingJson({ manifestDigest: execution.manifestDigest }) }, tx)
  const entry = await tx.journalEntry.create({ data: {
    organizationId, journalId: journal.id, periodId: execution.periodId, postingBatchId: batch.id,
    entryNumber: `AN-${execution.id}`, entryDate: at, status: "POSTED", currency: source.currency,
    sourceType: "OPENING_BALANCE", sourceId: execution.id, postingPurpose: "OPENING_BALANCE",
    createdById: execution.revision.createdById, postedById: execution.approvedById, postedAt: new Date(),
    memo: `Controlled opening ${execution.manifestDigest}`, lines: { create: lines },
  } })
  await tx.ledgerPostingBatch.update({ where: { id: batch.id }, data: { status: "POSTED", postedAt: new Date() } })
  await linkAccountingSource({ organizationId, postingBatchId: batch.id, journalEntryId: entry.id,
    sourceType: "OPENING_BALANCE", sourceId: execution.id, sourceDate: at, sourceNumber: entry.entryNumber,
    metadata: openingJson({ revisionId: execution.revisionId, manifestDigest: execution.manifestDigest }) }, tx)
  await tx.ledgerAuditEvent.create({ data: { organizationId, postingBatchId: batch.id, journalEntryId: entry.id,
    action: "OPENING_LEDGER_POSTED", resourceType: "FinancialOpeningExecution", resourceId: executionId, actorId: execution.approvedById, metadata: openingJson({ manifestDigest: execution.manifestDigest }) } })
  await recordPostedJournalCloseInvalidationInTx(tx, organizationId, { journalEntryId: entry.id, periodId: execution.periodId,
    affectedPeriodIds, entryDate: at, correlationId: batch.id }, { actorId: execution.approvedById, now: new Date() })
  await retainOpeningOperationInTx(tx, { organizationId, executionId, domain: "LEDGER", sourceId: execution.revisionId,
    source: source.ledger, receipt: { journalEntryId: entry.id, postingBatchId: batch.id, manifestDigest: execution.manifestDigest } })
  return { journalEntryId: entry.id, postingBatchId: batch.id }
}
