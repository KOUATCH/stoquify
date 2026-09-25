import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { buildInvoiceLinePlans, prepareSupplierInvoice } from "./ap-control.service"
import { invoicePreparationSourceHash } from "./invoice-source-evidence"
import { readInvoicePreparationEvidence } from "./invoice-preparation-evidence"
import type { InvoicePreparationOutcome } from "./invoice-preparation-contracts"
import { invoicePreparationAuthority, invoicePreparationScopeSchema, type InvoicePreparationScope } from "./invoice-preparation-authority"
import { invoicePreparationCommandSchema, invoicePreparationDecisionSchema, invoicePreparationDraftSchema, invoicePreparationQuerySchema, type InvoicePreparationCommand, type InvoicePreparationDraft, type InvoicePreparationPreview, type InvoicePreparationQuery, type InvoicePreparationSources } from "./invoice-preparation-contracts"

const eventKey = (key: string) => `invoice-preparation:${key}`
const eligibleOrderStatuses = ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "COMPLETED", "CANCELLED"] as const
function eligibleReceipts(organizationId: string, supplierId: string): Prisma.GoodsReceiptLineWhereInput {
  return { goodsReceipt: { organizationId, deletedAt: null, status: { in: ["RECEIVED", "COMPLETED"] } }, purchaseOrderLine: { purchaseOrder: { organizationId, supplierId, deletedAt: null, status: { in: [...eligibleOrderStatuses] } } } }
}

export async function loadInvoicePreparationSources(queryInput: InvoicePreparationQuery, scopeInput: InvoicePreparationScope): Promise<InvoicePreparationSources> {
  const query = invoicePreparationQuerySchema.parse(queryInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return db.$transaction(async tx => {
    await invoicePreparationAuthority(tx, scope, "load")
    const organization = await tx.organization.findUniqueOrThrow({ where: { id: scope.organizationId }, select: { currency: true } })
    const suppliers = await tx.supplier.findMany({ where: { organizationId: scope.organizationId, deletedAt: null, isActive: true, name: { contains: query.supplierSearch, mode: "insensitive" }, ...(query.supplierAfter ? { id: { gt: query.supplierAfter } } : {}) }, select: { id: true, name: true }, orderBy: { id: "asc" }, take: 26 })
    if (query.supplierId && !await tx.supplier.findFirst({ where: { id: query.supplierId, organizationId: scope.organizationId, deletedAt: null, isActive: true }, select: { id: true } })) throw new NotFoundError("Supplier is unavailable.")
    const rows = query.supplierId ? await tx.goodsReceiptLine.findMany({ where: { ...eligibleReceipts(scope.organizationId, query.supplierId), ...(query.receiptAfter ? { id: { gt: query.receiptAfter } } : {}) }, include: { goodsReceipt: { select: { receiptNumber: true } }, purchaseOrderLine: { select: { purchaseOrder: { select: { orderNumber: true } } } }, item: { select: { nameEn: true, nameFr: true } } }, orderBy: { id: "asc" }, take: 51 }) : []
    const invoiced = rows.length ? await tx.supplierInvoiceLine.groupBy({ by: ["goodsReceiptLineId"], where: { organizationId: scope.organizationId, goodsReceiptLineId: { in: rows.map(row => row.id) }, supplierInvoice: { organizationId: scope.organizationId, deletedAt: null, status: { not: "CANCELLED" } } }, _sum: { quantity: true } }) : []
    const used = new Map(invoiced.map(row => [row.goodsReceiptLineId, row._sum.quantity ?? new Prisma.Decimal(0)]))
    return { organizationId: scope.organizationId, actorId: scope.actorId, currency: organization.currency, checkedAt: new Date().toISOString(), suppliers: suppliers.slice(0, 25), supplierNext: suppliers.length > 25 ? suppliers[24].id : null, receipts: rows.slice(0, 50).map(row => ({ id: row.id, receiptNumber: row.goodsReceipt.receiptNumber, orderNumber: row.purchaseOrderLine.purchaseOrder.orderNumber, description: row.item.nameEn, descriptionFr: row.item.nameFr || row.item.nameEn, available: row.receivedQuantity.minus(used.get(row.id) ?? 0).toString(), unitCost: row.unitCost.toFixed(2) })), receiptNext: rows.length > 50 ? rows[49].id : null }
  }, { timeout: 15000 })
}

async function plan(tx: Prisma.TransactionClient, draft: InvoicePreparationDraft, scope: InvoicePreparationScope): Promise<InvoicePreparationPreview> {
  await tx.$queryRaw`SELECT id FROM suppliers WHERE id = ${draft.supplierId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  const supplier = await tx.supplier.findFirst({ where: { id: draft.supplierId, organizationId: scope.organizationId, isActive: true, deletedAt: null }, select: { name: true } })
  if (!supplier) throw new NotFoundError("Supplier is unavailable.")
  const organization = await tx.organization.findUniqueOrThrow({ where: { id: scope.organizationId }, select: { currency: true } })
  if (organization.currency !== draft.currency) throw new BusinessRuleError("Invoice currency needs an established conversion workflow before preparation.")
  // Lock all source orders in stable order, including a multi-order invoice.
  const refs = await tx.goodsReceiptLine.findMany({ where: { ...eligibleReceipts(scope.organizationId, draft.supplierId), id: { in: draft.lines.map(line => line.goodsReceiptLineId) } }, select: { purchaseOrderLine: { select: { purchaseOrderId: true } } } })
  for (const orderId of [...new Set(refs.map(row => row.purchaseOrderLine.purchaseOrderId))].sort()) await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${orderId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  const lines = await buildInvoiceLinePlans(tx, { organizationId: scope.organizationId, supplierId: draft.supplierId, lines: draft.lines })
  const documentDate = new Date(draft.invoiceDate + "T00:00:00Z")
  const periodBeforeLock = await getOpenPeriodForDate(scope.organizationId, documentDate, tx)
  await tx.$queryRaw`SELECT id FROM accounting_periods WHERE id = ${periodBeforeLock.id} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  const period = await getOpenPeriodForDate(scope.organizationId, documentDate, tx)
  const subtotal = lines.reduce((sum, line) => sum.plus(line.lineSubtotal), new Prisma.Decimal(0)), tax = lines.reduce((sum, line) => sum.plus(line.taxAmount), new Prisma.Decimal(0))
  const total = subtotal.plus(tax), variance = lines.reduce((sum, line) => sum.plus(line.priceVariance.abs()), new Prisma.Decimal(0))
  if (total.lte(0)) throw new BusinessRuleError("Supplier invoice total must be greater than zero.")
  const rows = lines.map(line => ({ id: line.goodsReceiptLineId, available: line.availableQuantity.toString(), quantity: line.quantity.toString(), total: line.lineTotal.toFixed(2), variance: line.priceVariance.toFixed(2) }))
  const revision = hashBusinessPayload({ version: 1, draft, rows, supplierName: supplier.name, currency: organization.currency, periodId: period.id, subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), total: total.toFixed(2) })
  return { organizationId: scope.organizationId, actorId: scope.actorId, draft, revision, checkedAt: new Date().toISOString(), supplierName: supplier.name, subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), total: total.toFixed(2), variance: variance.toFixed(2), lines: rows }
}

export async function previewInvoicePreparation(draftInput: InvoicePreparationDraft, scopeInput: InvoicePreparationScope) {
  const draft = invoicePreparationDraftSchema.parse(draftInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return db.$transaction(async tx => { await invoicePreparationAuthority(tx, scope, "review"); return plan(tx, draft, scope) }, { timeout: 15000 })
}

async function observePreparation(tx: Prisma.TransactionClient, invoiceId: string, eventId: string, scope: InvoicePreparationScope) {
  await tx.$queryRaw`SELECT id FROM supplier_invoices WHERE id = ${invoiceId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  const invoice = await tx.supplierInvoice.findFirst({ where: { id: invoiceId, organizationId: scope.organizationId, createdById: scope.actorId }, include: { lines: true, threeWayMatches: true } })
  if (!invoice) throw new NotFoundError("The retained invoice is unavailable to this maker.")
  const proof = await readInvoicePreparationEvidence(tx, invoice, scope.organizationId)
  const currentPreparationState: InvoicePreparationOutcome["currentPreparationState"] = !proof.valid ? "UNVERIFIED" : proof.event?.id === eventId ? "CURRENT" : "SUPERSEDED"
  return { currentPreparationState, observedInvoiceStatus: invoice.status, observedTotal: invoice.total.toFixed(2), observedAt: new Date().toISOString(), archived: !!invoice.deletedAt }
}

export async function confirmInvoicePreparation(commandInput: InvoicePreparationCommand, scopeInput: InvoicePreparationScope): Promise<InvoicePreparationOutcome> {
  const command = invoicePreparationCommandSchema.parse(commandInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return db.$transaction(async tx => {
    await invoicePreparationAuthority(tx, scope, "submit")
    await tx.$queryRaw`SELECT id FROM suppliers WHERE id = ${command.draft.supplierId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
    const commandHash = hashBusinessPayload(command)
    const event = await tx.businessEvent.findFirst({ where: { organizationId: scope.organizationId, idempotencyKey: eventKey(command.idempotencyKey) } })
    if (event) {
      const payload = event.payload as Record<string, unknown> | null
      if (event.eventType !== "purchase.supplier_invoice.prepared" || event.actorId !== scope.actorId || payload?.commandHash !== commandHash) throw new IdempotencyConflictError()
      const result = invoicePreparationDecisionSchema.safeParse(payload.result)
      if (!result.success || event.schemaVersion !== 1 || event.sourceType !== "SUPPLIER_INVOICE" || event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || result.data.invoiceId !== event.sourceId || result.data.organizationId !== scope.organizationId || result.data.actorId !== scope.actorId || result.data.requestReference !== command.idempotencyKey || result.data.reviewedRevision !== command.expectedRevision || result.data.recordedAt !== event.occurredAt.toISOString()) throw new BusinessRuleError("The retained invoice preparation evidence needs review.", "INVOICE_EVIDENCE_REQUIRED")
      if (event.eventSource !== "INTERNAL") throw new BusinessRuleError("The retained preparation source requires review.", "INVOICE_EVIDENCE_REQUIRED")
      return { ...result.data, replayed: true, sourceEventId: event.id, ...await observePreparation(tx, result.data.invoiceId, event.id, scope) }
    }
    const preview = await plan(tx, command.draft, scope)
    if (preview.revision !== command.expectedRevision) throw new ConflictError("Receipt or invoice evidence changed. Review a new preview.")
    const prepared = await prepareSupplierInvoice({ ...command.draft, organizationId: scope.organizationId, createdById: scope.actorId, documentHash: `sha256:${command.draft.documentSha256}`, idempotencyKey: eventKey(command.idempotencyKey) }, tx)
    // Never invent decision evidence for an old/uncertain preparation record.
    if (prepared.ledgerStatus === "IDEMPOTENT_REPLAY") throw new BusinessRuleError("The retained invoice preparation evidence needs review.", "INVOICE_EVIDENCE_REQUIRED")
    if (prepared.supplierInvoice.total.toFixed(2) !== preview.total) throw new ConflictError("The prepared total differs from the reviewed total.")
    const result = invoicePreparationDecisionSchema.parse({ organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: prepared.supplierInvoice.id, invoiceNumber: prepared.supplierInvoice.invoiceNumber, recordedAt: new Date().toISOString(), requestReference: command.idempotencyKey, reviewedRevision: preview.revision, preparationStatus: prepared.supplierInvoice.status, total: preview.total, currency: command.draft.currency, documentReference: command.draft.documentReference, documentSha256: command.draft.documentSha256 })
    const source = await tx.supplierInvoice.findUniqueOrThrow({ where: { id: result.invoiceId }, include: { lines: true, threeWayMatches: true } })
    const recorded = await recordBusinessEventInTx(tx, { organizationId: scope.organizationId, eventType: "purchase.supplier_invoice.prepared", eventSource: "INTERNAL", schemaVersion: 1, idempotencyKey: eventKey(command.idempotencyKey), actorId: scope.actorId, sourceType: "SUPPLIER_INVOICE", sourceId: result.invoiceId, occurredAt: new Date(result.recordedAt), payload: { entityType: "SupplierInvoice", commandHash, result, sourceHash: invoicePreparationSourceHash(source), documentEvidence: "maker_supplied_reference_and_file_hash" } })
    await markBusinessEventAppliedInTx(tx, scope.organizationId, recorded.event.id)
    return { ...result, replayed: false, sourceEventId: recorded.event.id, ...await observePreparation(tx, result.invoiceId, recorded.event.id, scope) }
  }, { timeout: 15000 })
}
