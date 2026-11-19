import "server-only"
import { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { approvedOpeningSourceInTx, openingDate, openingJson, openingMoney, retainOpeningOperationInTx } from "@/services/onboarding/opening-domain-source"
import { hashBusinessPayload, recordBusinessEventInTx, markBusinessEventAppliedInTx } from "@/services/events/business-event.service"
import { createCustomerLedgerEntry } from "./customer-ledger.service"
import { CUSTOMER_RECEIVABLE_REFERENCE_TYPE } from "./customer-receivable-document.service"

/** Retains an external receivable, never fabricates a sale or reposts its historical settlement. */
export async function postControlledOpeningReceivableInTx(tx: Prisma.TransactionClient, organizationId: string, executionId: string, sourceId: string) {
  const { execution, source, target, at } = await approvedOpeningSourceInTx(tx, organizationId, executionId)
  const row = source.openItems.find(item => item.sourceId === sourceId && item.kind === "AR")
  if (!row) throw new BusinessRuleError("The approved receivable source is unavailable.")
  const customerId = target("customers", row.counterparty)
  const customer = await tx.customer.findFirstOrThrow({ where: { organizationId, id: customerId, isActive: true, deletedAt: null } })
  const organization = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { id: true, name: true, currency: true } })
  const totalAmount = openingMoney(row.original), paidAmount = openingMoney(row.settled), unpaidAmount = openingMoney(row.outstanding)
  if (!totalAmount.minus(paidAmount).eq(unpaidAmount) || unpaidAmount.lte(0)) throw new BusinessRuleError("Opening receivables must retain a positive conserved outstanding amount.")
  const sourceSnapshot = { ...row, revisionId: execution.revisionId, manifestDigest: execution.manifestDigest }
  const organizationSnapshot = organization, customerSnapshot = { id: customer.id, name: customer.name }
  const metadata = { origin: "OPENING_BALANCE", executionId, accountId: target("accounts", row.account) }
  const sourceEvidenceHash = hashBusinessPayload(sourceSnapshot), metadataHash = hashBusinessPayload(metadata)
  const documentHash = hashBusinessPayload({ organizationSnapshot, customerSnapshot, sourceSnapshot, metadataHash })
  const document = await tx.customerReceivableDocument.create({ data: {
    organizationId, customerId, openingRevisionId: execution.revisionId, openingSourceId: sourceId,
    documentNumber: `OPEN-${execution.revision.revision}-${hashBusinessPayload(sourceId).slice(0, 24)}`, sourceVersion: 1, version: 1,
    issuedAt: at, invoiceDate: openingDate(row.sourceDate), dueDate: openingDate(row.dueDate),
    paymentTermsDays: Math.round((openingDate(row.dueDate).getTime() - openingDate(row.sourceDate).getTime()) / 86400000),
    currency: source.currency, currencyPrecision: 2, subtotal: totalAmount, taxAmount: 0,
    totalAmount, initialPaidAmount: paidAmount, initialUnpaidAmount: unpaidAmount,
    organizationSnapshot: openingJson(organizationSnapshot), customerSnapshot: openingJson(customerSnapshot),
    sourceSnapshot: openingJson(sourceSnapshot), metadata: openingJson(metadata), documentHash, sourceEvidenceHash, metadataHash,
    issuedById: execution.approvedById,
  } })
  const status = paidAmount.gt(0) ? "PARTIALLY_PAID" : "ISSUED"
  const stateHash = hashBusinessPayload({ organizationId, documentId: document.id, status, version: 1,
    paidAmount: paidAmount.toFixed(2), unpaidAmount: unpaidAmount.toFixed(2), effectiveAt: at.toISOString(), previousStateHash: null, documentHash })
  const event = await recordBusinessEventInTx(tx, { organizationId, eventType: "customer.opening_receivable.posted",
    eventSource: "INTERNAL", idempotencyKey: `opening:${executionId}:ar:${sourceId}`, actorId: execution.approvedById,
    occurredAt: at, sourceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE, sourceId: document.id, documentHash,
    payload: { documentId: document.id, sourceId, revisionId: execution.revisionId, unpaidAmount: unpaidAmount.toFixed(2), stateHash }, outboxMessages: [] })
  const state = await tx.customerReceivableDocumentState.create({ data: { organizationId, documentId: document.id,
    version: 1, status, paidAmount, unpaidAmount, effectiveAt: at, actorId: execution.approvedById,
    sourceType: "OPENING_BALANCE", sourceId: executionId, stateHash, businessEventId: event.event.id, evidenceHash: sourceEvidenceHash } })
  const ledger = await createCustomerLedgerEntry(tx, { organizationId, customerId, type: "OPENING_BALANCE",
    debit: unpaidAmount, entryDate: at, description: `Opening receivable ${row.document}`,
    referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE, referenceId: document.id })
  await markBusinessEventAppliedInTx(tx, organizationId, event.event.id)
  const receipt = { documentId: document.id, stateId: state.id, ledgerEntryId: ledger.id, eventId: event.event.id, documentHash }
  await retainOpeningOperationInTx(tx, { organizationId, executionId, domain: "AR", sourceId, source: row, receipt })
  return receipt
}
