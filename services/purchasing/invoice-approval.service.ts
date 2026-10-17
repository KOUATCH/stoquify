import "server-only"
import { Prisma, type BusinessEvent } from "@prisma/client"
import { db } from "@/prisma/db"
import { resolveInvoiceReceiptRecognition } from "./invoice-receipt-recognition"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { approveSupplierInvoice, EXACT_THREE_WAY_MATCH_EXCEPTION_POLICY_VERSION, resolveAPCountryPackStatus, validateInvoiceApprovalSource } from "./ap-control.service"
import { invoicePostingAuthority } from "./invoice-ledger-recovery-authority"
import { invoicePreparationScopeSchema, type InvoicePreparationScope } from "./invoice-preparation-authority"
import { readInvoicePreparationEvidence } from "./invoice-preparation-evidence"
import { invoiceApprovalCommandSchema, invoiceApprovalDecisionSchema, invoiceApprovalDraftSchema, invoiceApprovalHistoryQuerySchema, invoiceApprovalQuerySchema, type InvoiceApprovalCommand, type InvoiceApprovalDraft, type InvoiceApprovalHistoryQuery, type InvoiceApprovalPreview, type InvoiceApprovalQuery } from "./invoice-approval-contracts"

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const eventKey = (key: string) => `invoice-approval:${key}`
const eventType = "purchase.supplier_invoice.approval_recorded"
const evidenceRequired = () => new BusinessRuleError("The retained invoice approval evidence needs accounting review.", "INVOICE_EVIDENCE_REQUIRED")

async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(work, { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))))
      if (!retryable) throw error
      if (attempt >= 2) throw new ConflictError("Concurrent invoice changes interrupted approval. Retry the same request.")
    }
  }
}

async function plan(tx: Prisma.TransactionClient, draft: InvoiceApprovalDraft, scope: InvoicePreparationScope, fresh: boolean) {
  await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN supplier_invoices i ON i."supplierId" = s.id WHERE i.id = ${draft.invoiceId} AND i."organizationId" = ${scope.organizationId} AND s."organizationId" = ${scope.organizationId} FOR UPDATE OF s`
  await tx.$queryRaw`SELECT id FROM supplier_invoices WHERE id = ${draft.invoiceId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  const invoice = await tx.supplierInvoice.findFirst({ where: { id: draft.invoiceId, organizationId: scope.organizationId, deletedAt: null }, include: { lines: { orderBy: { id: "asc" } }, threeWayMatches: { orderBy: { id: "asc" } }, supplier: true } })
  if (!invoice || invoice.supplier.organizationId !== scope.organizationId) throw new NotFoundError("Supplier invoice is unavailable.")
  if (!invoice.createdById || invoice.createdById === scope.actorId) throw new BusinessRuleError("An independent approver must review this invoice.", "SOD_VIOLATION")
  if (invoice.status !== "MATCHED" && invoice.status !== "DISPUTED") throw new ConflictError("This invoice is no longer awaiting approval. Inspect its history.")
  const blockers: InvoiceApprovalPreview["blockers"] = [], postingWarnings: InvoiceApprovalPreview["postingWarnings"] = []
  let source: Awaited<ReturnType<typeof validateInvoiceApprovalSource>> | null = null
  try { source = await validateInvoiceApprovalSource(tx, invoice, scope.organizationId) }
  catch (error) { if (!(error instanceof BusinessRuleError)) throw error; blockers.push("SOURCE_REVIEW") }
  let receiptRecognition: Awaited<ReturnType<typeof resolveInvoiceReceiptRecognition>> | null = null
  try {
    receiptRecognition = await resolveInvoiceReceiptRecognition(tx, {
      organizationId: scope.organizationId, supplierId: invoice.supplierId, invoiceId: invoice.id,
      currency: invoice.currency, subtotal: invoice.subtotal, total: invoice.total,
      taxAmount: invoice.taxAmount, lines: invoice.lines,
    })
  } catch (error) { if (!(error instanceof BusinessRuleError)) throw error; blockers.push("SOURCE_REVIEW") }
  if (!invoice.supplier.isActive || invoice.supplier.deletedAt) blockers.push("SOURCE_REVIEW")

  const { event: preparation, prepared, valid: preparationValid } = await readInvoicePreparationEvidence(tx, invoice, scope.organizationId)
  if (!preparationValid) blockers.push("PREPARATION_REVIEW")

  const exceptions = await tx.supplierInvoiceMatchException.findMany({ where: { organizationId: scope.organizationId, supplierInvoiceId: invoice.id, status: "APPROVED" }, orderBy: { id: "asc" } })
  const exception = exceptions[0], now = new Date()
  if (source?.requiresMatchException && (exceptions.length !== 1 || !exception || exception.threeWayMatchId !== source.match.id || exception.policyVersion !== EXACT_THREE_WAY_MATCH_EXCEPTION_POLICY_VERSION || exception.requestedById !== invoice.createdById || !exception.approvedById || exception.approvedById === exception.requestedById || !exception.decidedAt || exception.decidedAt > now || exception.expiresAt <= now || !exception.varianceAmount.eq(source.variance) || !exception.priceVariance.eq(source.priceVariance))) blockers.push("MATCH_EXCEPTION")
  const exceptionEvents = source?.requiresMatchException && exception ? await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, idempotencyKey: { in: [`supplier-invoice-match-exception:${exception.id}:requested`, `supplier-invoice-match-exception:${exception.id}:approved`] } }, orderBy: { id: "asc" } }) : []
  if (source?.requiresMatchException && exception) {
    const request = exceptionEvents.find(event => event.eventType === "purchase.supplier_invoice.match_exception.requested"), decision = exceptionEvents.find(event => event.eventType === "purchase.supplier_invoice.match_exception.approved")
    const common = (event: BusinessEvent | undefined) => !!event && event.eventSource === "INTERNAL" && event.schemaVersion === 1 && event.status === "APPLIED" && !!event.processedAt && event.payloadHash === hashBusinessPayload(event.payload) && record(event.payload).matchExceptionId === exception.id && record(event.payload).supplierInvoiceId === invoice.id && record(event.payload).threeWayMatchId === source!.match.id && record(event.payload).policyVersion === exception.policyVersion && record(event.payload).requesterId === exception.requestedById && record(event.payload).expiresAt === exception.expiresAt.toISOString()
    if (exceptionEvents.length !== 2 || !common(request) || !common(decision) || request!.actorId !== exception.requestedById || record(request!.payload).varianceAmount !== exception.varianceAmount.toFixed(2) || decision!.actorId !== exception.approvedById || record(decision!.payload).reviewerId !== exception.approvedById || record(decision!.payload).decision !== "APPROVE" || decision!.occurredAt.getTime() !== exception.decidedAt?.getTime()) blockers.push("MATCH_EXCEPTION")
  }

  const organization = await tx.organization.findUniqueOrThrow({ where: { id: scope.organizationId }, select: { currency: true, country: true, accountingSettings: true } })
  if (organization.currency !== invoice.currency) blockers.push("CURRENCY_REVIEW")
  const periods = await tx.accountingPeriod.findMany({ where: { organizationId: scope.organizationId, startDate: { lte: invoice.invoiceDate }, endDate: { gte: invoice.invoiceDate } }, orderBy: { id: "asc" } }), period = periods[0]
  if (periods.length !== 1 || period.status !== "OPEN") blockers.push("PERIOD_UNAVAILABLE")
  const country = await resolveAPCountryPackStatus(tx, { organizationId: scope.organizationId, documentDate: invoice.invoiceDate, taxAmount: invoice.taxAmount, purpose: "SUPPLIER_INVOICE" })
  if (country.countryPackStatus !== "RESOLVED" || country.operatorActionRequired) blockers.push("COUNTRY_SETUP")
  let rule: Awaited<ReturnType<typeof getActivePostingRule>> = null
  try { rule = await getActivePostingRule(scope.organizationId, { sourceType: "SUPPLIER_INVOICE", postingPurpose: "SUPPLIER_INVOICE", effectiveAt: invoice.invoiceDate }, tx) }
  catch (error) { if (!(error instanceof BusinessRuleError) && !(error instanceof NotFoundError)) throw error; blockers.push("RULE_INVALID") }
  if (!rule) postingWarnings.push("RULE_UNAVAILABLE")
  const journals = await tx.journal.findMany({ where: { organizationId: scope.organizationId, type: "PURCHASE", isDefault: true, isActive: true }, orderBy: { id: "asc" } })
  if (!journals.length) postingWarnings.push("JOURNAL_UNAVAILABLE")
  if (journals.length > 1) blockers.push("JOURNAL_AMBIGUOUS")
  const accounts = rule ? await tx.chartOfAccount.findMany({ where: { organizationId: scope.organizationId, OR: [{ id: { in: rule.lines.map(line => line.accountId).filter((id): id is string => !!id) } }, { mappingKey: { in: rule.lines.map(line => line.mappingKey).filter((key): key is string => !!key) } }] }, include: { _count: { select: { children: true } } }, orderBy: { id: "asc" } }) : []
  const receipts = await tx.goodsReceiptLine.findMany({ where: { id: { in: invoice.lines.map(line => line.goodsReceiptLineId).filter((id): id is string => !!id) }, goodsReceipt: { organizationId: scope.organizationId } }, include: { goodsReceipt: true, purchaseOrderLine: { include: { purchaseOrder: true } } }, orderBy: { id: "asc" } })
  const revision = hashBusinessPayload({ version: 1, invoice, preparation, exceptions, exceptionEvents, receipts, receiptRecognition, organization, periods, country, rule, journals, accounts, blockers, postingWarnings })
  const preview: InvoiceApprovalPreview = {
    organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber,
    supplierName: invoice.supplier.name, makerId: invoice.createdById, invoiceDate: invoice.invoiceDate.toISOString(), dueDate: invoice.dueDate?.toISOString() ?? null,
    total: invoice.total.toFixed(2), subtotal: invoice.subtotal.toFixed(2), tax: invoice.taxAmount.toFixed(2), currency: invoice.currency, variance: source?.variance.toFixed(2) ?? "UNVERIFIED",
    documentReference: preparationValid && prepared.success ? prepared.data.documentReference : null, preparationEventId: preparationValid ? preparation!.id : null,
    correction: preparationValid && preparation?.eventType === "purchase.supplier_invoice.reprepared" ? (() => { const payload = record(preparation.payload), before = record(payload.beforeSnapshot); return { reason: typeof payload.reason === "string" ? payload.reason : "", recordedAt: preparation.occurredAt.toISOString(), previousTotal: typeof before.total === "string" ? before.total : null, previousInvoiceDate: typeof before.invoiceDate === "string" ? before.invoiceDate : null, previousNotes: typeof before.notes === "string" ? before.notes : null, previousDocumentHash: typeof before.documentHash === "string" ? before.documentHash : null, lines: Array.isArray(before.lines) ? before.lines.map(value => { const row = record(value); return { description: String(row.description ?? ""), quantity: String(row.quantity ?? ""), unitCost: String(row.unitCost ?? ""), total: String(row.lineTotal ?? "") } }) : [] } })() : null,
    periodName: periods.length === 1 ? period.name : null, ruleCode: rule?.code ?? null, journalCode: journals.length === 1 ? journals[0].code : null,
    countryPackVersion: country.countryPackVersion, matchExceptionId: source?.requiresMatchException ? exception?.id ?? null : null,
    blockers: [...new Set(blockers)], postingWarnings, requiresFreshAuth: !fresh, revision, checkedAt: now.toISOString(),
    lines: invoice.lines.map(line => ({ id: line.id, description: line.description, receiptLineId: line.goodsReceiptLineId, quantity: line.quantity.toString(), unitCost: line.unitCost.toFixed(2), tax: line.taxAmount.toFixed(2), total: line.lineTotal.toFixed(2) })),
  }
  return { invoice, preview }
}

function retainedDecision(event: BusinessEvent, command: InvoiceApprovalCommand, organizationId: string) {
  const payload = record(event.payload), result = invoiceApprovalDecisionSchema.safeParse(payload.result)
  if (!result.success || event.eventType !== eventType || event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || event.idempotencyKey !== eventKey(command.idempotencyKey) || payload.commandHash !== hashBusinessPayload(command) || event.sourceType !== "SUPPLIER_INVOICE" || event.sourceId !== command.invoiceId || result.data.organizationId !== organizationId || result.data.actorId !== event.actorId || result.data.invoiceId !== command.invoiceId || result.data.requestReference !== command.idempotencyKey || result.data.reviewedRevision !== command.expectedRevision || result.data.recordedAt !== event.occurredAt.toISOString() || result.data.postingBatchId !== event.postingBatchId) throw evidenceRequired()
  return result.data
}

export async function previewInvoiceApproval(draftInput: InvoiceApprovalDraft, scopeInput: InvoicePreparationScope) {
  const draft = invoiceApprovalDraftSchema.parse(draftInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => { const authority = await invoicePostingAuthority(tx, scope, "review", "approval"); return (await plan(tx, draft, scope, authority.fresh)).preview })
}

export async function confirmInvoiceApproval(commandInput: InvoiceApprovalCommand, scopeInput: InvoicePreparationScope) {
  const command = invoiceApprovalCommandSchema.parse(commandInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoicePostingAuthority(tx, scope, "submit", "approval")
    const key = JSON.stringify(["invoice-approval", scope.organizationId, command.idempotencyKey])
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`
    const event = await tx.businessEvent.findFirst({ where: { organizationId: scope.organizationId, eventSource: "INTERNAL", idempotencyKey: eventKey(command.idempotencyKey) } })
    if (event) {
      if (event.actorId !== scope.actorId || record(event.payload).commandHash !== hashBusinessPayload(command)) throw new IdempotencyConflictError()
      return { ...retainedDecision(event, command, scope.organizationId), replayed: true }
    }
    const p = await plan(tx, command, scope, true)
    if (p.preview.revision !== command.expectedRevision) throw new ConflictError("Invoice or accounting evidence changed. Review a new preview.")
    if (p.preview.blockers.length) throw new BusinessRuleError("Resolve the displayed source and setup conditions before approval.")
    const approved = await approveSupplierInvoice({ organizationId: scope.organizationId, supplierInvoiceId: command.invoiceId, approvedById: scope.actorId }, tx)
    const liabilities = await tx.supplierLedgerEntry.findMany({ where: { organizationId: scope.organizationId, referenceType: "SUPPLIER_INVOICE", referenceId: command.invoiceId } })
    if (liabilities.length !== 1 || !liabilities[0].debit.eq(p.invoice.total) || !liabilities[0].credit.eq(0) || liabilities[0].supplierId !== p.invoice.supplierId) throw evidenceRequired()
    const metadata = record(approved.supplierInvoice.metadata)
    const result = invoiceApprovalDecisionSchema.parse({ organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: command.invoiceId, invoiceNumber: p.invoice.invoiceNumber, requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, recordedAt: new Date().toISOString(), approvalEventId: approved.businessEventId, supplierLiabilityId: liabilities[0].id, postingBatchId: approved.postingBatchId, ledgerStatus: approved.ledgerStatus, journalEntryId: metadata.journalEntryId ?? null, accountingSourceLinkId: metadata.accountingSourceLinkId ?? null, blockerCode: metadata.ledgerBlockerCode ?? null, total: p.invoice.total.toFixed(2), currency: p.invoice.currency })
    const recorded = await recordBusinessEventInTx(tx, { organizationId: scope.organizationId, eventType, eventSource: "INTERNAL", schemaVersion: 1, idempotencyKey: eventKey(command.idempotencyKey), actorId: scope.actorId, sourceType: "SUPPLIER_INVOICE", sourceId: command.invoiceId, postingBatchId: result.postingBatchId, documentHash: p.invoice.documentHash ?? undefined, occurredAt: new Date(result.recordedAt), payload: { commandHash: hashBusinessPayload(command), preparationEventId: p.preview.preparationEventId, result } })
    await markBusinessEventAppliedInTx(tx, scope.organizationId, recorded.event.id)
    return { ...result, replayed: false }
  })
}

export async function loadInvoiceApprovalSources(queryInput: InvoiceApprovalQuery, scopeInput: InvoicePreparationScope) {
  const query = invoiceApprovalQuerySchema.parse(queryInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoicePostingAuthority(tx, scope, "load", "approval")
    const invoices = await tx.supplierInvoice.findMany({ where: { organizationId: scope.organizationId, deletedAt: null, status: { in: ["MATCHED", "DISPUTED"] }, invoiceNumber: { contains: query.search, mode: "insensitive" }, ...(query.after ? { id: { gt: query.after } } : {}) }, select: { id: true, invoiceNumber: true, invoiceDate: true, total: true, currency: true, status: true, createdById: true, supplier: { select: { name: true, organizationId: true } } }, orderBy: { id: "asc" }, take: 26 })
    return { organizationId: scope.organizationId, actorId: scope.actorId, checkedAt: new Date().toISOString(), next: invoices.length > 25 ? invoices[24].id : null, invoices: invoices.slice(0, 25).map(invoice => ({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, invoiceDate: invoice.invoiceDate.toISOString(), total: invoice.total.toFixed(2), currency: invoice.currency, status: invoice.status, independentApproverRequired: invoice.createdById === scope.actorId, supplierName: invoice.supplier.organizationId === scope.organizationId ? invoice.supplier.name : "" })) }
  })
}

export async function loadInvoiceApprovalHistory(queryInput: InvoiceApprovalHistoryQuery, scopeInput: InvoicePreparationScope) {
  const query = invoiceApprovalHistoryQuerySchema.parse(queryInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoicePostingAuthority(tx, scope, "load", "approval")
    if (!await tx.supplierInvoice.findFirst({ where: { id: query.invoiceId, organizationId: scope.organizationId }, select: { id: true } })) throw new NotFoundError("Supplier invoice is unavailable.")
    const events = await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: query.invoiceId, eventType, ...(query.before ? { id: { lt: query.before } } : {}) }, orderBy: { id: "desc" }, take: 26 })
    const records = await Promise.all(events.slice(0, 25).map(async event => {
      const parsed = invoiceApprovalDecisionSchema.safeParse(record(event.payload).result)
      const invalid = { recordId: event.id, recordedAt: event.occurredAt.toISOString(), verified: false as const, decision: null, observedJournalStatus: null }
      if (!parsed.success) return invalid
      let decision
      try { decision = retainedDecision(event, { invoiceId: query.invoiceId, expectedRevision: parsed.data.reviewedRevision, idempotencyKey: parsed.data.requestReference }, scope.organizationId) }
      catch (error) { if (!(error instanceof BusinessRuleError)) throw error; return invalid }
      const journal = decision.journalEntryId ? await tx.journalEntry.findFirst({ where: { id: decision.journalEntryId, organizationId: scope.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: query.invoiceId, postingBatchId: decision.postingBatchId }, select: { status: true } }) : null
      return { recordId: event.id, recordedAt: event.occurredAt.toISOString(), verified: true as const, decision, observedJournalStatus: journal?.status ?? null }
    }))
    return { organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: query.invoiceId, checkedAt: new Date().toISOString(), next: events.length > 25 ? events[24].id : null, records }
  })
}
