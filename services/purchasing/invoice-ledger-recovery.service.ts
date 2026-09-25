import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { createAPLedgerPosting, resolveAPCountryPackStatus } from "./ap-control.service"
import { invoiceLedgerRecoveryAuthority, invoiceLedgerRecoveryScopeSchema, type InvoiceLedgerRecoveryScope } from "./invoice-ledger-recovery-authority"
import { invoiceLedgerRecoveryCommandSchema, invoiceLedgerRecoveryDecisionSchema, invoiceLedgerRecoveryDraftSchema, invoiceLedgerRecoveryQuerySchema, invoiceLedgerRecoveryHistoryQuerySchema, type InvoiceLedgerRecoveryCommand, type InvoiceLedgerRecoveryDraft, type InvoiceLedgerRecoveryPreview, type InvoiceLedgerRecoveryQuery, type InvoiceLedgerRecoveryHistoryQuery } from "./invoice-ledger-recovery-contracts"

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const eventKey = (key: string) => `invoice-ledger-recovery:${key}`
const evidenceRequired = () => new BusinessRuleError("The invoice approval, liability or posting evidence needs accounting review.", "INVOICE_EVIDENCE_REQUIRED")
const eligible = ["POSTED", "PAYMENT_PENDING", "PAID"] as const

async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  // Concurrent configuration/source changes must not commit an unreviewed plan.
  // PostgreSQL serialization failures roll back all effects before an exact retry.
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(work, { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))))
      if (!retryable) throw error
      if (attempt >= 2) throw new ConflictError("Concurrent invoice or configuration changes interrupted recovery. Retry the same request.")
    }
  }
}

async function source(tx: Prisma.TransactionClient, invoiceId: string, scope: InvoiceLedgerRecoveryScope) {
  await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN supplier_invoices i ON i."supplierId" = s.id WHERE i.id = ${invoiceId} AND i."organizationId" = ${scope.organizationId} AND s."organizationId" = ${scope.organizationId} FOR UPDATE OF s`
  await tx.$queryRaw`SELECT id FROM supplier_invoices WHERE id = ${invoiceId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  const invoice = await tx.supplierInvoice.findFirst({ where: { id: invoiceId, organizationId: scope.organizationId, deletedAt: null }, include: { lines: { orderBy: { id: "asc" } }, supplier: true, threeWayMatches: true } })
  if (!invoice || invoice.supplier.organizationId !== scope.organizationId) throw new NotFoundError("Supplier invoice is unavailable.")
  if (!eligible.some(status => status === invoice.status) || !invoice.createdById || !invoice.approvedById || invoice.createdById === invoice.approvedById || !invoice.postedAt || !invoice.postedBusinessEventId || !invoice.ledgerPostingBatchId) throw evidenceRequired()
  if (invoice.createdById === scope.actorId) throw new BusinessRuleError("Invoice posting recovery requires an operator other than the invoice maker.", "SOD_VIOLATION")
  const approval = await tx.businessEvent.findFirst({ where: { id: invoice.postedBusinessEventId, organizationId: scope.organizationId } })
  const payload = record(approval?.payload)
  if (!approval || approval.eventType !== "purchase.supplier_invoice.posted" || approval.eventSource !== "INTERNAL" || approval.schemaVersion !== 1 || approval.status !== "APPLIED" || !approval.processedAt || approval.payloadHash !== hashBusinessPayload(approval.payload) || approval.sourceType !== "SUPPLIER_INVOICE" || approval.sourceId !== invoice.id || approval.actorId !== invoice.approvedById || approval.postingBatchId !== invoice.ledgerPostingBatchId || approval.occurredAt.getTime() !== invoice.postedAt.getTime() || payload.invoiceId !== invoice.id || payload.supplierId !== invoice.supplierId || payload.invoiceNumber !== invoice.invoiceNumber || payload.total !== invoice.total.toFixed(2) || payload.currency !== invoice.currency || payload.makerId !== invoice.createdById || payload.approverId !== invoice.approvedById || payload.ledgerPostingBatchId !== invoice.ledgerPostingBatchId || record(approval.metadata).makerCheckerVerified !== true) throw evidenceRequired()
  const documentHash = invoice.documentHash ?? `sha256:${hashBusinessPayload({ invoiceId: invoice.id, supplierId: invoice.supplierId, invoiceNumber: invoice.invoiceNumber, total: invoice.total.toFixed(2), currency: invoice.currency })}`
  if (approval.documentHash !== documentHash) throw evidenceRequired()
  const match = invoice.threeWayMatches.find(row => row.id === payload.threeWayMatchId && row.organizationId === scope.organizationId && row.status === payload.matchStatus)
  if (!match || !["MATCHED", "APPROVED_EXCEPTION"].includes(match.status)) throw evidenceRequired()
  if (match.status === "APPROVED_EXCEPTION") {
    const exception = await tx.supplierInvoiceMatchException.findFirst({ where: { id: typeof payload.matchExceptionId === "string" ? payload.matchExceptionId : "", organizationId: scope.organizationId, supplierInvoiceId: invoice.id, threeWayMatchId: match.id, status: "RESOLVED", resolvedById: invoice.approvedById }, select: { id: true, resolvedAt: true } })
    if (!exception?.resolvedAt || exception.resolvedAt.getTime() !== invoice.postedAt.getTime()) throw evidenceRequired()
  }
  const liabilities = await tx.supplierLedgerEntry.findMany({ where: { organizationId: scope.organizationId, referenceType: "SUPPLIER_INVOICE", referenceId: invoice.id } })
  const liability = liabilities[0]
  if (liabilities.length !== 1 || !liability || liability.supplierId !== invoice.supplierId || liability.type !== "PURCHASE" || !liability.debit.eq(invoice.total) || !liability.credit.eq(0) || liability.entryDate.getTime() !== invoice.invoiceDate.getTime()) throw evidenceRequired()
  const subtotal = invoice.lines.reduce((sum, line) => sum.plus(line.quantity.times(line.unitCost).toDecimalPlaces(2)), new Prisma.Decimal(0))
  const tax = invoice.lines.reduce((sum, line) => sum.plus(line.taxAmount), new Prisma.Decimal(0))
  if (!invoice.lines.length || invoice.lines.some(line => line.organizationId !== scope.organizationId) || !subtotal.eq(invoice.subtotal) || !tax.eq(invoice.taxAmount) || !subtotal.plus(tax).minus(invoice.discount).eq(invoice.total) || invoice.discount.gt(0)) throw evidenceRequired()
  return { invoice, approval, liability, documentHash, match }
}

async function plan(tx: Prisma.TransactionClient, draft: InvoiceLedgerRecoveryDraft, scope: InvoiceLedgerRecoveryScope, fresh: boolean) {
  const current = await source(tx, draft.invoiceId, scope), { invoice } = current
  const batch = await tx.ledgerPostingBatch.findFirst({ where: { id: invoice.ledgerPostingBatchId!, organizationId: scope.organizationId }, include: { journalEntries: { include: { lines: true } }, sourceLinks: true } })
  if (!batch || batch.sourceType !== "SUPPLIER_INVOICE" || batch.sourceId !== invoice.id || batch.postingPurpose !== "SUPPLIER_INVOICE") throw evidenceRequired()
  const organization = await tx.organization.findUniqueOrThrow({ where: { id: scope.organizationId }, select: { currency: true, country: true, accountingSettings: true } })
  if (organization.currency !== invoice.currency) throw evidenceRequired()
  const blockers: InvoiceLedgerRecoveryPreview["blockers"] = []
  if (batch.status === "POSTED") blockers.push("ALREADY_POSTED")
  else if (batch.status !== "FAILED" || batch.journalEntries.length || batch.sourceLinks.length || batch.postedAt || batch.reversedAt || typeof record(batch.metadata).apPostingRequestHash !== "string") blockers.push("BATCH_REVIEW")
  const period = await tx.accountingPeriod.findFirst({ where: { organizationId: scope.organizationId, startDate: { lte: invoice.invoiceDate }, endDate: { gte: invoice.invoiceDate } }, orderBy: { startDate: "desc" } })
  if (!period || period.status !== "OPEN" || (batch.periodId && period.id !== batch.periodId)) blockers.push("PERIOD_UNAVAILABLE")
  const country = await resolveAPCountryPackStatus(tx, { organizationId: scope.organizationId, documentDate: invoice.invoiceDate, taxAmount: invoice.taxAmount, purpose: "SUPPLIER_INVOICE" })
  if (country.countryPackStatus !== "RESOLVED" || country.operatorActionRequired) blockers.push("COUNTRY_SETUP")
  let rule: Awaited<ReturnType<typeof getActivePostingRule>> = null
  try { rule = await getActivePostingRule(scope.organizationId, { sourceType: "SUPPLIER_INVOICE", postingPurpose: "SUPPLIER_INVOICE", effectiveAt: invoice.invoiceDate }, tx) }
  catch (error) { if (!(error instanceof BusinessRuleError) && !(error instanceof NotFoundError)) throw error }
  if (!rule) blockers.push("RULE_UNAVAILABLE")
  const journals = await tx.journal.findMany({ where: { organizationId: scope.organizationId, type: "PURCHASE", isDefault: true, isActive: true }, orderBy: { id: "asc" } })
  if (journals.length !== 1) blockers.push("JOURNAL_UNAVAILABLE")
  const accounts = rule ? await tx.chartOfAccount.findMany({ where: { organizationId: scope.organizationId, OR: [{ id: { in: rule.lines.map(line => line.accountId).filter((id): id is string => !!id) } }, { mappingKey: { in: rule.lines.map(line => line.mappingKey).filter((key): key is string => !!key) } }] }, include: { _count: { select: { children: true } } }, orderBy: { id: "asc" } }) : []
  const revision = hashBusinessPayload({ version: 1, invoice, approval: current.approval, liability: current.liability, batch, organization, country, period, rule, journals, accounts })
  const preview: InvoiceLedgerRecoveryPreview = { organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, supplierName: invoice.supplier.name, total: invoice.total.toFixed(2), currency: invoice.currency, invoiceDate: invoice.invoiceDate.toISOString(), approvalAt: invoice.postedAt!.toISOString(), approvalEventId: current.approval.id, supplierLiabilityId: current.liability.id, periodName: period?.name ?? null, ruleCode: rule?.code ?? null, journalCode: journals.length === 1 ? journals[0].code : null, countryPackVersion: country.countryPackVersion, blockers, requiresFreshAuth: !fresh, revision, checkedAt: new Date().toISOString() }
  return { current, batch, period, country, preview }
}

export async function previewInvoiceLedgerRecovery(draftInput: InvoiceLedgerRecoveryDraft, scopeInput: InvoiceLedgerRecoveryScope) {
  const draft = invoiceLedgerRecoveryDraftSchema.parse(draftInput), scope = invoiceLedgerRecoveryScopeSchema.parse(scopeInput)
  return transaction(async tx => { const authority = await invoiceLedgerRecoveryAuthority(tx, scope, "review"); return (await plan(tx, draft, scope, authority.fresh)).preview })
}

export async function confirmInvoiceLedgerRecovery(commandInput: InvoiceLedgerRecoveryCommand, scopeInput: InvoiceLedgerRecoveryScope) {
  const command = invoiceLedgerRecoveryCommandSchema.parse(commandInput), scope = invoiceLedgerRecoveryScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoiceLedgerRecoveryAuthority(tx, scope, "submit")
    const lockKey = JSON.stringify(["invoice-ledger-recovery", scope.organizationId, command.idempotencyKey])
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text`
    const commandHash = hashBusinessPayload(command)
    const event = await tx.businessEvent.findFirst({ where: { organizationId: scope.organizationId, eventSource: "INTERNAL", idempotencyKey: eventKey(command.idempotencyKey) } })
    if (event) {
      const payload = record(event.payload)
      if (event.actorId !== scope.actorId || payload.commandHash !== commandHash) throw new IdempotencyConflictError()
      const result = invoiceLedgerRecoveryDecisionSchema.safeParse(payload.result)
      if (!result.success || event.eventType !== "purchase.supplier_invoice.ledger_recovery_recorded" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || event.sourceType !== "SUPPLIER_INVOICE" || event.sourceId !== command.invoiceId || result.data.invoiceId !== command.invoiceId || result.data.organizationId !== scope.organizationId || result.data.actorId !== scope.actorId || result.data.requestReference !== command.idempotencyKey || result.data.reviewedRevision !== command.expectedRevision || result.data.recordedAt !== event.occurredAt.toISOString() || result.data.postingBatchId !== event.postingBatchId) throw evidenceRequired()
      return { ...result.data, replayed: true }
    }
    const p = await plan(tx, command, scope, true), { invoice, approval, liability, documentHash } = p.current
    if (p.preview.revision !== command.expectedRevision) throw new ConflictError("Invoice or accounting configuration changed. Review a new preview.")
    if (p.preview.blockers.length || !p.period) throw new BusinessRuleError("Resolve the displayed accounting conditions before recovery.")
    const posting = await createAPLedgerPosting(tx, { organizationId: scope.organizationId, periodId: p.period.id, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, sourceNumber: invoice.invoiceNumber, sourceDate: invoice.invoiceDate, postingPurpose: "SUPPLIER_INVOICE", journalType: "PURCHASE", journalPrefix: "APINV", actorId: scope.actorId, supplierId: invoice.supplierId, currency: invoice.currency, memo: `Supplier invoice ${invoice.invoiceNumber}`, documentHash, amounts: { sourceAmount: invoice.total, netAmount: invoice.subtotal, grossAmount: invoice.total, taxAmount: invoice.taxAmount, costAmount: invoice.subtotal }, blockerCode: "AP_POSTING_RULE_REVIEW", blockerMessage: "Supplier invoice AP posting requires configured SYSCOHADA purchase/input VAT/AP rules.", metadata: { ...p.country, approvalEventId: approval.id, supplierLiabilityId: liability.id } })
    const result = invoiceLedgerRecoveryDecisionSchema.parse({ organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, recordedAt: new Date().toISOString(), approvalEventId: approval.id, supplierLiabilityId: liability.id, postingBatchId: posting.ledgerBatch.id, ledgerStatus: posting.ledgerStatus, journalEntryId: posting.journalEntryId ?? null, accountingSourceLinkId: posting.accountingSourceLinkId ?? null, blockerCode: posting.blockerCode ?? null, total: invoice.total.toFixed(2), currency: invoice.currency })
    const recorded = await recordBusinessEventInTx(tx, { organizationId: scope.organizationId, eventType: "purchase.supplier_invoice.ledger_recovery_recorded", eventSource: "INTERNAL", schemaVersion: 1, idempotencyKey: eventKey(command.idempotencyKey), actorId: scope.actorId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, postingBatchId: posting.ledgerBatch.id, documentHash, occurredAt: new Date(result.recordedAt), payload: { commandHash, result } })
    await markBusinessEventAppliedInTx(tx, scope.organizationId, recorded.event.id)
    await tx.supplierInvoice.update({ where: { id: invoice.id }, data: { metadata: { ...record(invoice.metadata), ...p.country, ledgerStatus: posting.ledgerStatus, ledgerBlockerCode: posting.blockerCode ?? null, ledgerBlockerMessage: posting.blockerMessage ?? null, journalEntryId: posting.journalEntryId ?? null, accountingSourceLinkId: posting.accountingSourceLinkId ?? null, ledgerRecoveryEventId: recorded.event.id } as Prisma.InputJsonValue } })
    return { ...result, replayed: false }
  })
}

export async function loadInvoiceLedgerRecoverySources(queryInput: InvoiceLedgerRecoveryQuery, scopeInput: InvoiceLedgerRecoveryScope) {
  const query = invoiceLedgerRecoveryQuerySchema.parse(queryInput), scope = invoiceLedgerRecoveryScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoiceLedgerRecoveryAuthority(tx, scope, "load")
    const invoices = await tx.supplierInvoice.findMany({ where: { organizationId: scope.organizationId, deletedAt: null, status: { in: [...eligible] }, invoiceNumber: { contains: query.search, mode: "insensitive" }, ...(query.after ? { id: { gt: query.after } } : {}) }, select: { id: true, invoiceNumber: true, invoiceDate: true, total: true, currency: true, supplier: { select: { name: true, organizationId: true } }, ledgerPostingBatchId: true }, orderBy: { id: "asc" }, take: 26 })
    const batches = await tx.ledgerPostingBatch.findMany({ where: { organizationId: scope.organizationId, id: { in: invoices.map(invoice => invoice.ledgerPostingBatchId).filter((id): id is string => !!id) }, sourceType: "SUPPLIER_INVOICE", postingPurpose: "SUPPLIER_INVOICE" }, select: { id: true, sourceId: true, status: true } })
    return { organizationId: scope.organizationId, actorId: scope.actorId, checkedAt: new Date().toISOString(), next: invoices.length > 25 ? invoices[24].id : null, invoices: invoices.slice(0, 25).map(invoice => ({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, invoiceDate: invoice.invoiceDate.toISOString(), total: invoice.total.toFixed(2), currency: invoice.currency, supplierName: invoice.supplier.organizationId === scope.organizationId ? invoice.supplier.name : "", batchStatus: batches.find(batch => batch.id === invoice.ledgerPostingBatchId && batch.sourceId === invoice.id)?.status ?? "UNVERIFIED" })) }
  })
}

export async function loadInvoiceLedgerRecoveryHistory(queryInput: InvoiceLedgerRecoveryHistoryQuery, scopeInput: InvoiceLedgerRecoveryScope) {
  const query = invoiceLedgerRecoveryHistoryQuerySchema.parse(queryInput), scope = invoiceLedgerRecoveryScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoiceLedgerRecoveryAuthority(tx, scope, "load")
    if (!await tx.supplierInvoice.findFirst({ where: { id: query.invoiceId, organizationId: scope.organizationId }, select: { id: true } })) throw new NotFoundError("Supplier invoice is unavailable.")
    const events = await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, sourceId: query.invoiceId, sourceType: "SUPPLIER_INVOICE", eventType: "purchase.supplier_invoice.ledger_recovery_recorded", ...(query.before ? { id: { lt: query.before } } : {}) }, orderBy: { id: "desc" }, take: 26 })
    const records = await Promise.all(events.slice(0, 25).map(async event => {
      const payload = record(event.payload), parsed = invoiceLedgerRecoveryDecisionSchema.safeParse(payload.result)
      if (!parsed.success) return { recordId: event.id, recordedAt: event.occurredAt.toISOString(), verified: false as const, decision: null, observedJournalStatus: null }
      const decision = parsed.data, command = { invoiceId: decision.invoiceId, expectedRevision: decision.reviewedRevision, idempotencyKey: decision.requestReference }
      const valid = event.eventSource === "INTERNAL" && event.schemaVersion === 1 && event.status === "APPLIED" && !!event.processedAt && event.payloadHash === hashBusinessPayload(event.payload) && payload.commandHash === hashBusinessPayload(command) && event.idempotencyKey === eventKey(decision.requestReference) && decision.invoiceId === query.invoiceId && decision.organizationId === scope.organizationId && decision.actorId === event.actorId && decision.recordedAt === event.occurredAt.toISOString() && decision.postingBatchId === event.postingBatchId
      if (!valid) return { recordId: event.id, recordedAt: event.occurredAt.toISOString(), verified: false as const, decision: null, observedJournalStatus: null }
      const journal = decision.journalEntryId ? await tx.journalEntry.findFirst({ where: { id: decision.journalEntryId, organizationId: scope.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: query.invoiceId, postingBatchId: decision.postingBatchId }, select: { status: true } }) : null
      return { recordId: event.id, recordedAt: event.occurredAt.toISOString(), verified: true as const, decision, observedJournalStatus: journal?.status ?? null }
    }))
    return { organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: query.invoiceId, checkedAt: new Date().toISOString(), next: events.length > 25 ? events[24].id : null, records }
  })
}
