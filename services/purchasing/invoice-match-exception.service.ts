import "server-only"
import { Prisma, type BusinessEvent } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { lockMatchExceptionInvoice, requestSupplierInvoiceMatchException, reviewSupplierInvoiceMatchException, validateInvoiceApprovalSource, validateMatchExceptionReviewSource } from "./ap-control.service"
import { invoiceMatchExceptionAuthority } from "./invoice-match-exception-authority"
import { invoicePreparationScopeSchema, type InvoicePreparationScope } from "./invoice-preparation-authority"
import { invoicePreparationSourceHash } from "./invoice-source-evidence"
import { invoiceMatchExceptionCommandSchema, invoiceMatchExceptionDecisionSchema, invoiceMatchExceptionDraftSchema, invoiceMatchExceptionHistoryQuerySchema, invoiceMatchExceptionQuerySchema, type InvoiceMatchExceptionCommand, type InvoiceMatchExceptionDraft, type InvoiceMatchExceptionHistoryQuery, type InvoiceMatchExceptionQuery } from "./invoice-match-exception-contracts"

const eventType = "purchase.supplier_invoice.match_exception.operation_recorded"
const eventKey = (key: string) => `invoice-match-exception:${key}`
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const evidenceError = () => new BusinessRuleError("The retained exception evidence needs review.", "INVOICE_EVIDENCE_REQUIRED")
async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(work, { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) {
      const retry = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code)))
      if (!retry) throw error
      if (attempt >= 2) throw new ConflictError("Concurrent exception changes interrupted this operation. Retry the same request.")
    }
  }
}

async function plan(tx: Prisma.TransactionClient, draft: InvoiceMatchExceptionDraft, scope: InvoicePreparationScope, fresh: boolean) {
  await lockMatchExceptionInvoice(tx, scope.organizationId, draft.invoiceId)
  const invoice = await tx.supplierInvoice.findFirst({ where: { id: draft.invoiceId, organizationId: scope.organizationId, ...(draft.kind === "request" ? { deletedAt: null } : {}) }, include: { lines: true, threeWayMatches: true, supplier: true } })
  if (!invoice || invoice.supplier.organizationId !== scope.organizationId) throw new NotFoundError("Supplier invoice is unavailable.")
  if (draft.kind === "request" && invoice.createdById !== scope.actorId) throw new BusinessRuleError("Only the invoice maker can request its exception.", "SOD_VIOLATION")
  const exceptions = await tx.supplierInvoiceMatchException.findMany({ where: { organizationId: scope.organizationId, supplierInvoiceId: invoice.id }, orderBy: { id: "asc" } })
  const exception = draft.kind === "review" ? exceptions.find(row => row.id === draft.exceptionId) : null
  if (draft.kind === "review" && !exception) throw new NotFoundError("Match exception is unavailable for this invoice.")
  if (exception?.requestedById === scope.actorId) throw new BusinessRuleError("Match exceptions require an independent reviewer.", "SOD_VIOLATION")
  const now = new Date(), blockers: Array<"SOURCE_REVIEW" | "ACTIVE_REQUEST" | "EXPIRED" | "NO_LONGER_OPEN"> = []
  let source: Awaited<ReturnType<typeof validateInvoiceApprovalSource>> | null = null
  let sourceVerified = true
  try { source = await validateInvoiceApprovalSource(tx, invoice, scope.organizationId); if (!source.requiresMatchException) blockers.push("SOURCE_REVIEW") }
  catch (error) { if (!(error instanceof BusinessRuleError) && !(error instanceof NotFoundError)) throw error; blockers.push("SOURCE_REVIEW") }
  if (draft.kind === "request") {
    if (new Date(draft.expiresAt) <= now) blockers.push("EXPIRED")
    if (exceptions.some(row => ["OPEN", "APPROVED"].includes(row.status) && row.expiresAt > now)) blockers.push("ACTIVE_REQUEST")
  } else if (exception) {
    if (exception.status !== "OPEN") blockers.push("NO_LONGER_OPEN")
    if (exception.expiresAt <= now) blockers.push("EXPIRED")
    try { await validateMatchExceptionReviewSource(tx, exception, scope.organizationId) }
    catch (error) { if (!(error instanceof BusinessRuleError) && !(error instanceof NotFoundError)) throw error; sourceVerified = false; blockers.push("SOURCE_REVIEW") }
    if (draft.decision === "REJECT") {
      // Missing proof blocks approval, while an independent refusal remains possible.
      for (let i = blockers.length - 1; i >= 0; i--) if (blockers[i] === "SOURCE_REVIEW") blockers.splice(i, 1)
    }
  }
  const events = await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, eventType: { in: ["purchase.supplier_invoice.prepared", "purchase.supplier_invoice.match_exception.requested", "purchase.supplier_invoice.match_exception.approved", "purchase.supplier_invoice.match_exception.rejected"] } }, orderBy: { id: "asc" } })
  const receipts = await tx.goodsReceiptLine.findMany({ where: { id: { in: invoice.lines.map(line => line.goodsReceiptLineId).filter((id): id is string => !!id) }, goodsReceipt: { organizationId: scope.organizationId } }, include: { goodsReceipt: true, purchaseOrderLine: { include: { purchaseOrder: true } } }, orderBy: { id: "asc" } })
  const previousRequests = draft.kind === "request" ? exceptions.map(row => ({ id: row.id, reason: row.reason, status: (row.status === "OPEN" || row.status === "APPROVED") && row.expiresAt <= now ? "EXPIRED" : row.status, expiresAt: row.expiresAt.toISOString() })) : []
  const revision = hashBusinessPayload({ version: 3, previousRequests, draft, sourceHash: invoicePreparationSourceHash(invoice), invoiceStatus: invoice.status, deletedAt: invoice.deletedAt, sourceVerified, exceptions, events, receipts, blockers: [...new Set(blockers)] })
  return { invoice, preview: { organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, supplierName: invoice.supplier.name, kind: draft.kind, exceptionId: exception?.id ?? null, total: invoice.total.toFixed(2), currency: invoice.currency, variance: source?.variance.toFixed(2) ?? null, reason: draft.kind === "request" ? draft.reason : exception!.reason, evidenceReference: draft.kind === "request" ? draft.evidenceReference : exception!.evidenceReference, expiresAt: draft.kind === "request" ? new Date(draft.expiresAt).toISOString() : exception!.expiresAt.toISOString(), blockers: [...new Set(blockers)], previousRequests, sourceVerified, archivedSource: !!invoice.deletedAt, requiresFreshAuth: !fresh, revision, checkedAt: now.toISOString(), lines: invoice.lines.map(line => ({ id: line.id, description: line.description, quantity: line.quantity.toString(), unitCost: line.unitCost.toFixed(2), total: line.lineTotal.toFixed(2) })) } }
}
export type InvoiceMatchExceptionPreview = Awaited<ReturnType<typeof plan>>["preview"]

function retainedDecision(event: BusinessEvent, command: InvoiceMatchExceptionCommand, organizationId: string) {
  const payload = record(event.payload), parsed = invoiceMatchExceptionDecisionSchema.safeParse(payload.result)
  if (!parsed.success || event.organizationId !== organizationId || event.eventType !== eventType || event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || event.idempotencyKey !== eventKey(command.idempotencyKey) || payload.commandHash !== hashBusinessPayload(command) || event.sourceType !== "SUPPLIER_INVOICE" || event.sourceId !== command.draft.invoiceId || parsed.data.organizationId !== organizationId || parsed.data.actorId !== event.actorId || parsed.data.invoiceId !== command.draft.invoiceId || parsed.data.kind !== command.draft.kind || parsed.data.requestReference !== command.idempotencyKey || parsed.data.reviewedRevision !== command.expectedRevision || parsed.data.recordedAt !== event.occurredAt.toISOString() || command.draft.kind === "review" && (parsed.data.exceptionId !== command.draft.exceptionId || parsed.data.status !== (command.draft.decision === "APPROVE" ? "APPROVED" : "REJECTED"))) throw evidenceError()
  return parsed.data
}

export async function previewInvoiceMatchException(draftInput: InvoiceMatchExceptionDraft, scopeInput: InvoicePreparationScope) {
  const draft = invoiceMatchExceptionDraftSchema.parse(draftInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => { const authority = await invoiceMatchExceptionAuthority(tx, scope, "review", draft.kind); return (await plan(tx, draft, scope, authority.fresh)).preview })
}
export async function confirmInvoiceMatchException(commandInput: InvoiceMatchExceptionCommand, scopeInput: InvoicePreparationScope) {
  const command = invoiceMatchExceptionCommandSchema.parse(commandInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoiceMatchExceptionAuthority(tx, scope, "submit", command.draft.kind)
    const key = JSON.stringify(["invoice-match-exception", scope.organizationId, command.idempotencyKey])
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`
    const event = await tx.businessEvent.findFirst({ where: { organizationId: scope.organizationId, eventSource: "INTERNAL", idempotencyKey: eventKey(command.idempotencyKey) } })
    if (event) { if (event.actorId !== scope.actorId || record(event.payload).commandHash !== hashBusinessPayload(command)) throw new IdempotencyConflictError(); return { ...retainedDecision(event, command, scope.organizationId), replayed: true } }
    const p = await plan(tx, command.draft, scope, true)
    if (p.preview.revision !== command.expectedRevision) throw new ConflictError("Exception source or decision changed. Review a new preview.")
    if (p.preview.blockers.length) throw new BusinessRuleError("Resolve the displayed exception conditions before submitting.")
    const draft = command.draft
    const changed = draft.kind === "request" ? await requestSupplierInvoiceMatchException({ organizationId: scope.organizationId, supplierInvoiceId: draft.invoiceId, requestedById: scope.actorId, reason: draft.reason, evidenceReference: draft.evidenceReference, expiresAt: draft.expiresAt }, tx) : await reviewSupplierInvoiceMatchException({ organizationId: scope.organizationId, matchExceptionId: draft.exceptionId, reviewedById: scope.actorId, decision: draft.decision, decisionReason: draft.decisionReason }, tx)
    const result = invoiceMatchExceptionDecisionSchema.parse({ organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: draft.invoiceId, invoiceNumber: p.invoice.invoiceNumber, exceptionId: changed.matchException.id, kind: draft.kind, status: changed.matchException.status, requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, recordedAt: new Date().toISOString(), sourceEventId: changed.businessEventId, expiresAt: changed.matchException.expiresAt.toISOString(), variance: changed.matchException.varianceAmount.toFixed(2), currency: p.invoice.currency, ...(draft.kind === "review" ? { sourceVerification: p.preview.sourceVerified ? "VERIFIED" : "UNVERIFIED" } : {}) })
    const recorded = await recordBusinessEventInTx(tx, { organizationId: scope.organizationId, eventType, eventSource: "INTERNAL", schemaVersion: 1, idempotencyKey: eventKey(command.idempotencyKey), actorId: scope.actorId, sourceType: "SUPPLIER_INVOICE", sourceId: draft.invoiceId, occurredAt: new Date(result.recordedAt), payload: { command, commandHash: hashBusinessPayload(command), result } })
    await markBusinessEventAppliedInTx(tx, scope.organizationId, recorded.event.id)
    return { ...result, replayed: false }
  })
}

export async function loadInvoiceMatchExceptionSources(queryInput: InvoiceMatchExceptionQuery, scopeInput: InvoicePreparationScope) {
  const query = invoiceMatchExceptionQuerySchema.parse(queryInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoiceMatchExceptionAuthority(tx, scope, "load", query.kind)
    const invoices = await tx.supplierInvoice.findMany({ where: { organizationId: scope.organizationId, ...(query.kind === "request" ? { deletedAt: null, status: "DISPUTED", createdById: scope.actorId } : { OR: [{ deletedAt: null, status: "DISPUTED" }, { matchExceptions: { some: { organizationId: scope.organizationId, status: "OPEN" } } }] }), invoiceNumber: { contains: query.search, mode: "insensitive" }, ...(query.after ? { id: { gt: query.after } } : {}) }, select: { id: true, deletedAt: true, invoiceNumber: true, total: true, currency: true, createdById: true, matchExceptions: { where: { organizationId: scope.organizationId, status: "OPEN" }, select: { id: true, status: true, reason: true, evidenceReference: true, expiresAt: true, requestedById: true }, orderBy: { id: "asc" } } }, orderBy: { id: "asc" }, take: 26 })
    return { organizationId: scope.organizationId, actorId: scope.actorId, checkedAt: new Date().toISOString(), next: invoices.length > 25 ? invoices[24].id : null, invoices: invoices.slice(0,25).map(invoice => ({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, total: invoice.total.toFixed(2), currency: invoice.currency, archivedSource: !!invoice.deletedAt, independentReviewerRequired: invoice.createdById === scope.actorId, exceptions: invoice.matchExceptions.map(row => ({ ...row, status: row.expiresAt <= new Date() ? "EXPIRED" : row.status, expiresAt: row.expiresAt.toISOString() })) })) }
  })
}
export async function loadInvoiceMatchExceptionHistory(queryInput: InvoiceMatchExceptionHistoryQuery, scopeInput: InvoicePreparationScope) {
  const query = invoiceMatchExceptionHistoryQuerySchema.parse(queryInput), scope = invoicePreparationScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await invoiceMatchExceptionAuthority(tx, scope, "load", query.kind)
    if (!await tx.supplierInvoice.findFirst({ where: { id: query.invoiceId, organizationId: scope.organizationId, ...(query.kind === "request" ? { createdById: scope.actorId } : {}) }, select: { id: true } })) throw new NotFoundError("Supplier invoice is unavailable.")
    const events = await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: query.invoiceId, eventType, ...(query.before ? { id: { lt: query.before } } : {}) }, orderBy: { id: "desc" }, take: 26 })
    const records = await Promise.all(events.slice(0,25).map(async event => {
      const command = invoiceMatchExceptionCommandSchema.safeParse(record(event.payload).command), invalid = { recordId: event.id, recordedAt: event.occurredAt.toISOString(), verified: false as const, decision: null, observedStatus: null }
      if (!command.success) return invalid
      let decision; try { decision = retainedDecision(event, command.data, scope.organizationId) } catch (error) { if (!(error instanceof BusinessRuleError)) throw error; return invalid }
      const exception = await tx.supplierInvoiceMatchException.findFirst({ where: { id: decision.exceptionId, organizationId: scope.organizationId, supplierInvoiceId: query.invoiceId }, select: { status: true, expiresAt: true } })
      return { recordId: event.id, recordedAt: event.occurredAt.toISOString(), verified: true as const, decision, observedStatus: exception ? ["OPEN","APPROVED"].includes(exception.status) && exception.expiresAt <= new Date() ? "EXPIRED" : exception.status : null }
    }))
    return { organizationId: scope.organizationId, actorId: scope.actorId, invoiceId: query.invoiceId, checkedAt: new Date().toISOString(), next: events.length > 25 ? events[24].id : null, records }
  })
}
