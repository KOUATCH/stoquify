import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { buildInvoiceLinePlans, duplicateFingerprint, expireMatchExceptionInTx, lockMatchExceptionInvoice, resolveAPCountryPackStatus } from "./ap-control.service"
import { netUninvoicedReceiptReturns } from "./receipt-invoice-capacity"
import { invoiceCorrectionAuthority } from "./invoice-correction-authority"
import { invoiceCorrectionCommandSchema, invoiceCorrectionDraftSchema, invoiceCorrectionHistorySchema, invoiceCorrectionQuerySchema, type InvoiceCorrectionCommand, type InvoiceCorrectionDraft, type InvoiceCorrectionHistory, type InvoiceCorrectionQuery } from "./invoice-correction-contracts"
import { invoicePreparationScopeSchema, type InvoicePreparationScope } from "./invoice-preparation-authority"
import { invoicePreparationDecisionSchema } from "./invoice-preparation-contracts"
import { readInvoicePreparationEvidence } from "./invoice-preparation-evidence"
import { invoicePreparationSourceHash } from "./invoice-source-evidence"
import { invoiceCorrectionSourceSchema, type InvoiceCorrectionSourceQuery } from "./invoice-correction-contracts"

const eventType = "purchase.supplier_invoice.reprepared"
const eventKey = (key: string) => `invoice-correction:${key}`
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(work, { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) {
      const retry = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code)))
      if (!retry) throw error
      if (attempt >= 2) throw new ConflictError("Concurrent invoice changes interrupted correction. Retry the same request.")
    }
  }
}

async function source(tx: Prisma.TransactionClient, invoiceId: string, scope: InvoicePreparationScope) {
  await lockMatchExceptionInvoice(tx, scope.organizationId, invoiceId)
  const invoice = await tx.supplierInvoice.findFirst({ where: { id: invoiceId, organizationId: scope.organizationId, deletedAt: null }, include: { supplier: true, lines: { orderBy: { id: "asc" } }, threeWayMatches: { orderBy: { id: "asc" } }, paymentAllocations: { select: { id: true } }, supplierCreditNotes: { select: { id: true } } } })
  if (!invoice || invoice.supplier.organizationId !== scope.organizationId) throw new NotFoundError("Supplier invoice is unavailable.")
  if (!invoice.createdById || invoice.createdById !== scope.actorId) throw new BusinessRuleError("Only the original invoice maker can correct its preparation.", "SOD_VIOLATION")
  if (!invoice.supplier.isActive || invoice.supplier.deletedAt || !["DRAFT", "MATCHED", "DISPUTED"].includes(invoice.status) || invoice.approvedById || invoice.postedAt || invoice.cancelledAt || invoice.postedBusinessEventId || invoice.ledgerPostingBatchId || !invoice.amountPaid.eq(0) || !invoice.discount.eq(0) || invoice.paymentAllocations.length || invoice.supplierCreditNotes.length) throw new BusinessRuleError("This invoice has obligations, adjustments or a lifecycle state requiring the existing accounting correction process.", "INVOICE_EVIDENCE_REQUIRED")
  if (invoice.lines.some(row => row.organizationId !== scope.organizationId) || invoice.threeWayMatches.length > 1 || invoice.threeWayMatches.some(row => row.organizationId !== scope.organizationId)) throw new BusinessRuleError("Ambiguous or cross-organization invoice source requires reconciliation.", "INVOICE_EVIDENCE_REQUIRED")
  const liability = await tx.supplierLedgerEntry.findFirst({ where: { organizationId: scope.organizationId, referenceType: "SUPPLIER_INVOICE", referenceId: invoice.id }, select: { id: true } })
  const batches = await tx.ledgerPostingBatch.findMany({ where: { organizationId: scope.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id }, select: { id: true }, take: 1 })
  const journal = await tx.journalEntry.findFirst({ where: { organizationId: scope.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id }, select: { id: true } })
  if (liability || batches.length || journal) throw new BusinessRuleError("Existing supplier or posting obligations cannot be changed through preparation.", "INVOICE_EVIDENCE_REQUIRED")
  const events = await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id }, orderBy: { id: "asc" } })
  if (events.some(event => event.postingBatchId || ["purchase.supplier_invoice.approval_recorded", "purchase.supplier_invoice.posted"].includes(event.eventType))) throw new BusinessRuleError("Invoice approval/posting history requires the accounting correction process.", "INVOICE_EVIDENCE_REQUIRED")
  const exceptions = await tx.supplierInvoiceMatchException.findMany({ where: { organizationId: scope.organizationId, supplierInvoiceId: invoice.id }, orderBy: { id: "asc" } })
  return { invoice, events, exceptions }
}

async function plan(tx: Prisma.TransactionClient, draft: InvoiceCorrectionDraft, scope: InvoicePreparationScope, fresh: boolean) {
  const current = await source(tx, draft.invoiceId, scope), { invoice, exceptions } = current, p = draft.preparation, now = new Date()
  if (p.supplierId !== invoice.supplierId || p.invoiceNumber !== invoice.invoiceNumber || p.currency !== invoice.currency) throw new BusinessRuleError("Correction preserves the supplier, supplier invoice number and currency.")
  if (exceptions.some(row => (row.status === "OPEN" || row.status === "APPROVED") && row.expiresAt > now)) throw new BusinessRuleError("Resolve the current exception request before correcting its source. An unexpired approved exception cannot be silently revoked.")
  const organization = await tx.organization.findUniqueOrThrow({ where: { id: scope.organizationId }, select: { currency: true } })
  if (organization.currency !== p.currency) throw new BusinessRuleError("A supported currency-conversion workflow is required.")
  const receipts = await tx.goodsReceiptLine.findMany({ where: { id: { in: p.lines.map(row => row.goodsReceiptLineId) }, goodsReceipt: { organizationId: scope.organizationId }, purchaseOrderLine: { purchaseOrder: { organizationId: scope.organizationId, supplierId: invoice.supplierId } } }, include: { goodsReceipt: true, purchaseOrderLine: { include: { purchaseOrder: true } } }, orderBy: { id: "asc" } })
  for (const id of [...new Set(receipts.map(row => row.purchaseOrderLine.purchaseOrder.id))].sort()) await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${id} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  const lines = await buildInvoiceLinePlans(tx, { organizationId: scope.organizationId, supplierId: invoice.supplierId, purchaseOrderId: invoice.purchaseOrderId ?? undefined, excludeSupplierInvoiceId: invoice.id, lines: p.lines })
  const sum = (get: (line: typeof lines[number]) => Prisma.Decimal) => lines.reduce((total, line) => total.plus(get(line)), new Prisma.Decimal(0)).toDecimalPlaces(2)
  const subtotal = sum(row => row.lineSubtotal), tax = sum(row => row.taxAmount), total = subtotal.plus(tax), variance = sum(row => row.priceVariance.abs()), priceVariance = sum(row => row.priceVariance)
  if (total.lte(0)) throw new BusinessRuleError("Invoice total must be greater than zero.")
  const duplicate = await tx.supplierInvoice.findFirst({ where: { organizationId: scope.organizationId, id: { not: invoice.id }, duplicateFingerprint: duplicateFingerprint({ organizationId: scope.organizationId, supplierId: invoice.supplierId, invoiceNumber: invoice.invoiceNumber, currency: invoice.currency, total }) }, select: { id: true } })
  if (duplicate) throw new ConflictError("The corrected invoice conflicts with an existing supplier document. Reconcile the duplicate first.")
  const date = new Date(p.invoiceDate + "T00:00:00Z"), periods = []
  for (const value of [invoice.invoiceDate, date]) { const period = await getOpenPeriodForDate(scope.organizationId, value, tx); await tx.$queryRaw`SELECT id FROM accounting_periods WHERE id = ${period.id} AND "organizationId" = ${scope.organizationId} FOR SHARE`; periods.push(await getOpenPeriodForDate(scope.organizationId, value, tx)) }
  const country = await resolveAPCountryPackStatus(tx, { organizationId: scope.organizationId, documentDate: date, taxAmount: tax, purpose: "SUPPLIER_INVOICE" })
  const proof = await readInvoicePreparationEvidence(tx, invoice, scope.organizationId)
  const revision = hashBusinessPayload({ version: 1, draft, current, receipts, periods, organization, country, previousPreparation: proof.event, lines })
  return { ...current, lines, subtotal, tax, total, variance, priceVariance, country, previousPreparation: proof.event, preview: { organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, supplierName: invoice.supplier.name, draft, before: { invoiceDate: invoice.invoiceDate.toISOString().slice(0,10), dueDate: invoice.dueDate?.toISOString().slice(0,10) ?? null, notes: invoice.notes, documentReference: proof.valid && proof.prepared.success ? proof.prepared.data.documentReference : null, documentSha256: invoice.documentHash, lines: invoice.lines.map(row => ({ description: row.description, quantity: row.quantity.toString(), unitCost: row.unitCost.toFixed(2), taxRate: row.taxRate.toString(), total: row.lineTotal.toFixed(2) })) }, countrySetupRequired: country.countryPackStatus !== "RESOLVED" || country.operatorActionRequired, previousTotal: invoice.total.toFixed(2), total: total.toFixed(2), tax: tax.toFixed(2), currency: invoice.currency, variance: variance.toFixed(2), previousEvidenceVerified: proof.valid, previousPreparationEventId: proof.event?.id ?? null, requiresNewException: variance.gt(0), requiresFreshAuth: !fresh, revision, checkedAt: now.toISOString(), expiredRequests: exceptions.filter(row => (row.status === "OPEN" || row.status === "APPROVED") && row.expiresAt <= now).map(row => row.id), lines: lines.map(row => ({ receiptLineId: row.goodsReceiptLineId, quantity: row.quantity.toString(), unitCost: row.unitCost.toFixed(2), total: row.lineTotal.toFixed(2) })) } }
}
export type InvoiceCorrectionPreview = Awaited<ReturnType<typeof plan>>["preview"]

// Current editable values come from invoice rows. Document references are offered
// only when their retained preparation proof still matches those rows.
export async function loadInvoiceCorrectionSource(input: InvoiceCorrectionSourceQuery, scopeInput: InvoicePreparationScope) {
  const query = invoiceCorrectionSourceSchema.parse(input), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoiceCorrectionAuthority(tx, scope, "load")
    const { invoice, exceptions } = await source(tx, query.invoiceId, scope)
    const proof = await readInvoicePreparationEvidence(tx, invoice, scope.organizationId)
    const receipts = await tx.goodsReceiptLine.findMany({ where: {
      goodsReceipt: { organizationId: scope.organizationId, deletedAt: null, status: { in: ["RECEIVED", "COMPLETED"] } },
      purchaseOrderLine: { purchaseOrder: { organizationId: scope.organizationId, supplierId: invoice.supplierId, deletedAt: null, status: { in: ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "COMPLETED", "CANCELLED"] } }, ...(invoice.purchaseOrderId ? { purchaseOrderId: invoice.purchaseOrderId } : {}) },
      ...(query.receiptAfter ? { id: { gt: query.receiptAfter } } : {}),
    }, include: { goodsReceipt: { select: { receiptNumber: true } }, purchaseOrderLine: { select: { purchaseOrder: { select: { orderNumber: true } } } }, item: { select: { nameEn: true, nameFr: true } } }, orderBy: { id: "asc" }, take: 51 })
    const reservations = await tx.supplierInvoiceLine.groupBy({ by: ["goodsReceiptLineId"], where: { organizationId: scope.organizationId, supplierInvoiceId: { not: invoice.id }, goodsReceiptLineId: { in: receipts.map(row => row.id) }, supplierInvoice: { organizationId: scope.organizationId, deletedAt: null, status: { not: "CANCELLED" } } }, _sum: { quantity: true } })
    const returned = await netUninvoicedReceiptReturns(tx, { organizationId: scope.organizationId, supplierId: invoice.supplierId, lines: receipts })
    const used = new Map(reservations.map(row => [row.goodsReceiptLineId, row._sum.quantity ?? new Prisma.Decimal(0)]))
    return {
      organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: invoice.id, supplierName: invoice.supplier.name, checkedAt: new Date().toISOString(), previousEvidenceVerified: proof.valid,
      activeException: exceptions.some(row => ["OPEN", "APPROVED"].includes(row.status) && row.expiresAt > new Date()),
      preparation: { supplierId: invoice.supplierId, invoiceNumber: invoice.invoiceNumber, currency: invoice.currency, invoiceDate: invoice.invoiceDate.toISOString().slice(0,10), dueDate: invoice.dueDate?.toISOString().slice(0,10) ?? "", notes: invoice.notes ?? "", documentReference: proof.valid && proof.prepared.success ? proof.prepared.data.documentReference : "", documentSha256: proof.valid && proof.prepared.success ? proof.prepared.data.documentSha256 : "", lines: invoice.lines.map(row => ({ goodsReceiptLineId: row.goodsReceiptLineId ?? "", description: row.description, quantity: row.quantity.toString(), unitCost: row.unitCost.toFixed(2), taxRate: row.taxRate.toString() })) },
      receipts: receipts.slice(0,50).map(row => ({ id: row.id, receiptNumber: row.goodsReceipt.receiptNumber, orderNumber: row.purchaseOrderLine.purchaseOrder.orderNumber, description: row.item.nameEn, descriptionFr: row.item.nameFr || row.item.nameEn, available: Prisma.Decimal.max(0, row.receivedQuantity.minus(used.get(row.id) ?? 0).minus(returned.get(row.id) ?? 0)).toString(), unitCost: row.unitCost.toFixed(2) })), receiptNext: receipts.length > 50 ? receipts[49].id : null,
    }
  })
}

export async function previewInvoiceCorrection(input: InvoiceCorrectionDraft, scopeInput: InvoicePreparationScope) {
  const draft = invoiceCorrectionDraftSchema.parse(input), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => { const authority = await invoiceCorrectionAuthority(tx, scope, "review"); return (await plan(tx, draft, scope, authority.fresh)).preview })
}

function retained(event: Prisma.BusinessEventGetPayload<{}>, command: InvoiceCorrectionCommand, scope: InvoicePreparationScope) {
  const payload = record(event.payload), result = invoicePreparationDecisionSchema.safeParse(payload.result)
  if (!result.success || event.organizationId !== scope.organizationId || event.actorId !== scope.actorId || event.eventType !== eventType || event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || payload.commandHash !== hashBusinessPayload(command) || payload.operation !== "correction" || event.idempotencyKey !== eventKey(command.idempotencyKey) || event.sourceType !== "SUPPLIER_INVOICE" || event.sourceId !== command.draft.invoiceId || result.data.organizationId !== scope.organizationId || result.data.actorId !== scope.actorId || result.data.invoiceId !== command.draft.invoiceId || result.data.requestReference !== command.idempotencyKey || result.data.reviewedRevision !== command.expectedRevision || result.data.recordedAt !== event.occurredAt.toISOString()) throw new BusinessRuleError("The retained correction evidence requires review.", "INVOICE_EVIDENCE_REQUIRED")
  return result.data
}

export async function confirmInvoiceCorrection(input: InvoiceCorrectionCommand, scopeInput: InvoicePreparationScope) {
  const command = invoiceCorrectionCommandSchema.parse(input), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoiceCorrectionAuthority(tx, scope, "submit")
    const key = JSON.stringify(["invoice-correction", scope.organizationId, command.idempotencyKey]); await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`
    const existing = await tx.businessEvent.findFirst({ where: { organizationId: scope.organizationId, eventSource: "INTERNAL", idempotencyKey: eventKey(command.idempotencyKey) } })
    if (existing) { if (existing.actorId !== scope.actorId || record(existing.payload).commandHash !== hashBusinessPayload(command)) throw new IdempotencyConflictError(); const retainedResult = retained(existing, command, scope); const currentInvoice = await tx.supplierInvoice.findFirst({ where: { id: command.draft.invoiceId, organizationId: scope.organizationId, createdById: scope.actorId }, select: { status: true, metadata: true } }); if (!currentInvoice) throw new NotFoundError("Invoice history is unavailable."); return { ...retainedResult, sourceEventId: existing.id, replayed: true, isCurrentPreparation: record(currentInvoice.metadata).currentPreparationEventId === existing.id, observedInvoiceStatus: currentInvoice.status } }
    const p = await plan(tx, command.draft, scope, true)
    if (p.preview.revision !== command.expectedRevision) throw new ConflictError("Invoice, receipts or preparation evidence changed. Review correction again.")
    const { invoice } = p, draft = command.draft.preparation, now = new Date(), beforeSourceHash = invoicePreparationSourceHash(invoice)
    const { supplier: _supplier, paymentAllocations: _allocations, supplierCreditNotes: _credits, ...beforeSnapshot } = invoice
    for (const row of p.exceptions) if ((row.status === "OPEN" || row.status === "APPROVED") && row.expiresAt <= now) await expireMatchExceptionInTx(tx, row, scope.actorId, now)
    await tx.supplierInvoiceLine.deleteMany({ where: { organizationId: scope.organizationId, supplierInvoiceId: invoice.id } })
    const updated = await tx.supplierInvoice.update({ where: { id: invoice.id }, data: { invoiceDate: new Date(draft.invoiceDate + "T00:00:00Z"), dueDate: draft.dueDate ? new Date(draft.dueDate + "T00:00:00Z") : null, subtotal: p.subtotal, taxAmount: p.tax, total: p.total, status: p.variance.gt(0) ? "DISPUTED" : "MATCHED", notes: draft.notes ?? null, documentHash: `sha256:${draft.documentSha256}`, evidenceHash: `sha256:${hashBusinessPayload({ draft, total: p.total.toFixed(2) })}`, duplicateFingerprint: duplicateFingerprint({ organizationId: scope.organizationId, supplierId: invoice.supplierId, invoiceNumber: invoice.invoiceNumber, currency: invoice.currency, total: p.total }), lines: { create: p.lines.map(row => ({ organizationId: scope.organizationId, purchaseOrderLineId: row.purchaseOrderLineId, goodsReceiptLineId: row.goodsReceiptLineId, itemId: row.itemId, description: row.description, quantity: row.quantity, unitCost: row.unitCost, taxRate: row.taxRate, taxAmount: row.taxAmount, lineTotal: row.lineTotal, matchStatus: row.priceVariance.eq(0) ? "MATCHED" : "EXCEPTION" })) } }, include: { lines: true } })
    const receiptIds = [...new Set(p.lines.map(row => row.goodsReceiptId))], matchData = { status: p.variance.gt(0) ? "EXCEPTION" as const : "MATCHED" as const, purchaseOrderId: invoice.purchaseOrderId, goodsReceiptId: receiptIds.length === 1 ? receiptIds[0] : null, matchedAt: now, matchedById: scope.actorId, toleranceAmount: new Prisma.Decimal(0), varianceAmount: p.variance, quantityVariance: new Prisma.Decimal(0), priceVariance: p.priceVariance, evidenceHash: `sha256:${hashBusinessPayload({ invoiceId: invoice.id, lineIds: updated.lines.map(row => row.id), variance: p.variance.toFixed(2) })}` }
    if (invoice.threeWayMatches[0]) await tx.threeWayMatch.update({ where: { id: invoice.threeWayMatches[0].id }, data: matchData })
    else await tx.threeWayMatch.create({ data: { ...matchData, organizationId: scope.organizationId, supplierInvoiceId: invoice.id } })
    const corrected = await tx.supplierInvoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lines: true, threeWayMatches: true } })
    const result = invoicePreparationDecisionSchema.parse({ organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, recordedAt: now.toISOString(), requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, preparationStatus: corrected.status, total: p.total.toFixed(2), currency: invoice.currency, documentReference: draft.documentReference, documentSha256: draft.documentSha256 })
    const event = await recordBusinessEventInTx(tx, { organizationId: scope.organizationId, eventType, eventSource: "INTERNAL", schemaVersion: 1, idempotencyKey: eventKey(command.idempotencyKey), actorId: scope.actorId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, occurredAt: now, payload: { operation: "correction", command, commandHash: hashBusinessPayload(command), result, reason: command.draft.reason, previousPreparationEventId: p.previousPreparation?.id ?? null, beforeSourceHash, beforeSnapshot: json(beforeSnapshot), sourceHash: invoicePreparationSourceHash(corrected), documentEvidence: "maker_supplied_reference_and_file_hash" } })
    await markBusinessEventAppliedInTx(tx, scope.organizationId, event.event.id)
    await tx.supplierInvoice.update({ where: { id: invoice.id }, data: { metadata: json({ ...record(invoice.metadata), currentPreparationEventId: event.event.id, countryPackStatus: p.country.countryPackStatus, countryCode: p.country.countryCode, countryPackVersion: p.country.countryPackVersion, countryPackResolutionHash: p.country.countryPackResolutionHash, taxTreatmentStatus: p.country.taxTreatmentStatus, withholdingTreatmentStatus: p.country.withholdingTreatmentStatus, countryPackErrorCode: p.country.errorCode ?? null, countryPackErrorMessage: p.country.errorMessage ?? null, operatorActionRequired: p.country.operatorActionRequired }) } })
    await tx.auditLog.create({ data: { organizationId: scope.organizationId, userId: scope.actorId, entityType: "SupplierInvoice", entityId: invoice.id, action: "SUPPLIER_INVOICE_REPREPARED", changes: json({ reason: command.draft.reason, previousPreparationEventId: p.previousPreparation?.id ?? null, preparationEventId: event.event.id, beforeSourceHash, afterSourceHash: invoicePreparationSourceHash(corrected) }) } })
    return { ...result, sourceEventId: event.event.id, replayed: false, isCurrentPreparation: true, observedInvoiceStatus: corrected.status }
  })
}

export async function loadInvoiceCorrectionSources(input: InvoiceCorrectionQuery, scopeInput: InvoicePreparationScope) {
  const query = invoiceCorrectionQuerySchema.parse(input), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => { await invoiceCorrectionAuthority(tx, scope, "load"); const rows = await tx.supplierInvoice.findMany({ where: { organizationId: scope.organizationId, createdById: scope.actorId, invoiceNumber: { contains: query.search, mode: "insensitive" }, ...(query.after ? { id: { gt: query.after } } : {}) }, select: { id: true, invoiceNumber: true, total: true, currency: true, status: true, deletedAt: true }, orderBy: { id: "asc" }, take: 26 }); return { organizationId: scope.organizationId, actorId: scope.actorId, invoices: rows.slice(0,25).map(row => ({ id: row.id, invoiceNumber: row.invoiceNumber, total: row.total.toFixed(2), currency: row.currency, canCorrect: !row.deletedAt && ["DRAFT", "MATCHED", "DISPUTED"].includes(row.status) })), next: rows.length > 25 ? rows[24].id : null } })
}

export async function loadInvoiceCorrectionHistory(input: InvoiceCorrectionHistory, scopeInput: InvoicePreparationScope) {
  const query = invoiceCorrectionHistorySchema.parse(input), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoiceCorrectionAuthority(tx, scope, "load")
    const invoice = await tx.supplierInvoice.findFirst({ where: { id: query.invoiceId, organizationId: scope.organizationId, createdById: scope.actorId }, select: { status: true, metadata: true } }); if (!invoice) throw new NotFoundError("Supplier invoice history is unavailable.")
    const events = await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: query.invoiceId, eventType, ...(query.before ? { id: { lt: query.before } } : {}) }, orderBy: { id: "desc" }, take: 26 })
    const records = events.slice(0,25).map(event => { const command = invoiceCorrectionCommandSchema.safeParse(record(event.payload).command); let result = null; if (command.success) try { result = retained(event, command.data, scope) } catch (error) { if (!(error instanceof BusinessRuleError)) throw error } return { recordId: event.id, recordedAt: event.occurredAt.toISOString(), verified: !!result, result, reason: result ? record(event.payload).reason : null, isCurrentPreparation: record(invoice.metadata).currentPreparationEventId === event.id, observedInvoiceStatus: invoice.status } })
    return { organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: query.invoiceId, records, next: events.length > 25 ? events[24].id : null }
  })
}
