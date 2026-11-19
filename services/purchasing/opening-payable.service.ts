import "server-only"
import { Prisma } from "@prisma/client"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"
import { approvedOpeningSourceInTx, openingDate, openingJson, openingMoney, retainOpeningOperationInTx } from "@/services/onboarding/opening-domain-source"
import { hashBusinessPayload, recordBusinessEventInTx, markBusinessEventAppliedInTx } from "@/services/events/business-event.service"

/** Domain-owned opening obligation: existing AP aging/payment entities, no fabricated purchase or tax claim. */
export async function postControlledOpeningPayableInTx(tx: Prisma.TransactionClient, organizationId: string, executionId: string, sourceId: string, postingBatchId: string) {
  const { execution, source, target, at } = await approvedOpeningSourceInTx(tx, organizationId, executionId)
  const row = source.openItems.find(item => item.sourceId === sourceId && item.kind === "AP")
  if (!row) throw new BusinessRuleError("The approved payable source is unavailable.")
  const supplierId = target("suppliers", row.counterparty)
  await tx.$queryRaw`SELECT id FROM suppliers WHERE id = ${supplierId} AND "organizationId" = ${organizationId} FOR UPDATE`
  const supplier = await tx.supplier.findFirstOrThrow({ where: { organizationId, id: supplierId, isActive: true, deletedAt: null } })
  const total = openingMoney(row.original), amountPaid = openingMoney(row.settled), outstanding = openingMoney(row.outstanding)
  if (!total.minus(amountPaid).eq(outstanding) || outstanding.lte(0)) throw new BusinessRuleError("Opening payables must retain a positive conserved outstanding amount.")
  const documentHash = hashBusinessPayload({ row, manifestDigest: execution.manifestDigest })
  const invoice = await tx.supplierInvoice.create({ data: {
    organizationId, supplierId, openingRevisionId: execution.revisionId, openingSourceId: sourceId,
    invoiceNumber: row.document, invoiceDate: openingDate(row.sourceDate), dueDate: openingDate(row.dueDate),
    status: "POSTED", subtotal: total, taxAmount: 0, total, amountPaid, currency: source.currency,
    duplicateFingerprint: `opening:${execution.revisionId}:${sourceId}`, idempotencyKey: `opening:${executionId}:ap:${sourceId}`,
    documentHash, evidenceHash: documentHash, ledgerPostingBatchId: postingBatchId,
    createdById: execution.revision.createdById, approvedById: execution.approvedById, postedAt: at,
    notes: "Imported opening obligation; tax and historical purchases are not reposted.",
    metadata: openingJson({ origin: "OPENING_BALANCE", executionId, manifestDigest: execution.manifestDigest, source: row, accountId: target("accounts", row.account) }),
  } })
  const balanceAfter = supplier.currentBalance.plus(outstanding).toDecimalPlaces(2)
  const claimed = await tx.supplier.updateMany({ where: { id: supplierId, organizationId, currentBalance: supplier.currentBalance }, data: { currentBalance: balanceAfter } })
  if (claimed.count !== 1) throw new ConflictError("The supplier balance changed during opening posting.")
  const ledger = await tx.supplierLedgerEntry.create({ data: { organizationId, supplierId, type: "OPENING_BALANCE",
    entryDate: at, debit: outstanding, credit: 0, balanceAfter, description: `Opening payable ${row.document}`,
    referenceType: "SUPPLIER_INVOICE", referenceId: invoice.id } })
  const event = await recordBusinessEventInTx(tx, { organizationId, eventType: "supplier.opening_payable.posted",
    eventSource: "INTERNAL", idempotencyKey: `opening:${executionId}:ap:${sourceId}`, actorId: execution.approvedById,
    occurredAt: at, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, postingBatchId, documentHash,
    payload: { invoiceId: invoice.id, sourceId, revisionId: execution.revisionId, outstanding: outstanding.toFixed(2), ledgerEntryId: ledger.id }, outboxMessages: [] })
  await tx.supplierInvoice.update({ where: { id: invoice.id }, data: { postedBusinessEventId: event.event.id } })
  await markBusinessEventAppliedInTx(tx, organizationId, event.event.id)
  const receipt = { invoiceId: invoice.id, ledgerEntryId: ledger.id, eventId: event.event.id, documentHash }
  await retainOpeningOperationInTx(tx, { organizationId, executionId, domain: "AP", sourceId, source: row, receipt })
  return receipt
}
