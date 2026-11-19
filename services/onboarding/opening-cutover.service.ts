import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { lockOpeningApplyAuthorityInTx, lockWorkpaperAuthorityInTx } from "@/services/accounting/close-evidence-acceptance-authority.service"
import { readCloseAssessmentPublicationTimeInTx } from "@/services/accounting/close-assessment-order.service"
import { lockJournalPostingCatalogInTx, lockJournalPostingClosePeriodsInTx } from "@/services/accounting/journal-posting-order.service"
import { assertEntryAccountsPostable } from "@/services/accounting/posting.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { postControlledOpeningLedgerInTx } from "@/services/accounting/opening-ledger.service"
import { postControlledOpeningReceivableInTx } from "@/services/accounting/opening-receivable.service"
import { postControlledOpeningPayableInTx } from "@/services/purchasing/opening-payable.service"
import { postControlledOpeningStockInTx } from "@/services/inventory/inventory-stock-event.service"
import { recordBusinessEventInTx, markBusinessEventAppliedInTx } from "@/services/events/business-event.service"
import type { WorkpaperActor } from "@/services/accounting/review-workpaper.service"
import { catalogInTx, lockCutover, retainedPreview } from "./opening-position.service"
import { openingMappingsSchema, openingScopeSchema } from "./opening-position.contract"
import { approveOpeningSchema, applyOpeningSchema, cancelOpeningSchema, type OpeningCutoverWorkspace } from "./opening-cutover.contract"
import { approvedOpeningSourceInTx, openingDate, openingJson, openingMoney } from "./opening-domain-source"
import { hashStablePayload } from "./master-data-csv"

const options = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 30000, maxWait: 10000 }
const cutoverDate = "2026-10-01"
const scopeOf = (actor: WorkpaperActor, input: { clientOrganizationId?: string }) => input.clientOrganizationId ?? actor.homeOrganizationId
async function audit(tx: Prisma.TransactionClient, organizationId: string, actorId: string, executionId: string, action: string, changes: unknown = {}) {
  await tx.auditLog.create({ data: { organizationId, userId: actorId, entityType: "FinancialOpeningExecution", entityId: executionId, action, changes: openingJson(changes) } })
}
async function evidence(tx: Prisma.TransactionClient, organizationId: string, revisionId: string, digest: string) {
  const row = await tx.financialOpeningRevision.findFirst({ where: { id: revisionId, organizationId, cutoverDate } })
  if (!row) throw new NotFoundError("Opening source revision is unavailable.")
  const latest = await tx.financialOpeningRevision.findFirst({ where: { organizationId, cutoverDate }, orderBy: { revision: "desc" }, select: { id: true } })
  if (latest?.id !== row.id || row.status !== "REVIEWED" || row.reviewDigest !== digest || row.manifestDigest !== digest) throw new ConflictError("The latest source must have a matching independent preview review.")
  const mappings = openingMappingsSchema.parse(row.mappings)
  const current = retainedPreview(row, await catalogInTx(tx, organizationId, mappings))
  if (!current.preview.canReview || current.preview.digest !== digest || row.reviewedById === row.createdById) throw new ConflictError("Source, controls or mapped masters changed; stage and review a fresh revision.")
  return { row, ...current }
}
async function periodInTx(tx: Prisma.TransactionClient, organizationId: string) {
  await lockJournalPostingCatalogInTx(tx, organizationId)
  const at = openingDate(cutoverDate)
  const candidate = await tx.accountingPeriod.findFirst({ where: { organizationId, startDate: { lte: at }, endDate: { gte: at } }, orderBy: { startDate: "desc" } })
  if (!candidate) throw new BusinessRuleError("An open accounting period must contain the cutover instant.")
  const affectedPeriodIds = await lockJournalPostingClosePeriodsInTx(tx, organizationId, { periodId: candidate.id, entryDate: at, includeLaterPeriods: true })
  return { period: await getOpenPeriodForDate(organizationId, at, tx), affectedPeriodIds }
}
/** This bounded release initializes a financially empty client, not a merge into live balances. */
async function emptyFinancialClient(tx: Prisma.TransactionClient, organizationId: string) {
  for (const table of ["customers", "suppliers", "items", "locations"] as const) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM ${Prisma.raw(table)} WHERE "organizationId" = ${organizationId} ORDER BY id FOR UPDATE`)
  }
  const counts = await Promise.all([
    tx.journalEntry.count({ where: { organizationId } }), tx.ledgerPostingBatch.count({ where: { organizationId } }),
    tx.inventoryTransaction.count({ where: { organizationId } }), tx.customerReceivableDocument.count({ where: { organizationId } }),
    tx.supplierInvoice.count({ where: { organizationId } }), tx.customerLedgerEntry.count({ where: { organizationId } }),
    tx.supplierLedgerEntry.count({ where: { organizationId } }), tx.customer.count({ where: { organizationId, currentBalance: { not: 0 } } }),
    tx.supplier.count({ where: { organizationId, currentBalance: { not: 0 } } }),
    tx.inventoryLevel.count({ where: { item: { organizationId }, OR: [
      { quantityOnHand: { not: 0 } }, { quantityReserved: { not: 0 } }, { quantityAvailable: { not: 0 } },
      { quantityInTransit: { not: 0 } }, { quantityOnOrder: { not: 0 } }, { totalValue: { not: 0 } },
    ] } }),
  ])
  if (counts.some(count => count > 0)) throw new BusinessRuleError("This opening pilot requires an empty financial client: no journals, posting batches, stock movements, open documents, balances or pending stock quantities.")
}
async function qualification(tx: Prisma.TransactionClient, organizationId: string, current: Awaited<ReturnType<typeof evidence>>) {
  if (current.source.openItems.some(row => openingMoney(row.outstanding).lte(0)) ||
    current.source.stock.some(row => new Prisma.Decimal(row.quantity).lte(0) || openingMoney(row.value).lte(0))) {
    throw new BusinessRuleError("This apply pilot requires positive stock and outstanding open-item rows; remove settled or zero rows and review again.")
  }
  const pairs = current.source.stock.map(row => {
    const item = current.mappings.items.find(mapping => mapping.source === row.item)!.targetId
    const location = current.mappings.locations.find(mapping => mapping.source === row.location)!.targetId
    return `${item}:${location}`
  })
  if (new Set(pairs).size !== pairs.length) throw new BusinessRuleError("The pilot accepts one opening stock row per mapped item and location.")
  await assertEntryAccountsPostable(organizationId, current.mappings.accounts.map(row => row.targetId), tx)
  const items = await tx.item.findMany({ where: { organizationId, id: { in: current.mappings.items.map(row => row.targetId) } } })
  if (items.some(row => !row.trackInventory || row.isDiscontinued)) throw new BusinessRuleError("Mapped opening stock must be tracked and available.")
  if (!await tx.journal.findFirst({ where: { organizationId, code: "AN", type: "OPENING", isActive: true } })) throw new BusinessRuleError("Configure the existing AN opening journal before approval.")
}
export async function approveOpeningCutover(actor: WorkpaperActor, raw: unknown) {
  const input = approveOpeningSchema.parse(raw), organizationId = scopeOf(actor, input)
  return db.$transaction(async tx => {
    const authority = await lockOpeningApplyAuthorityInTx(tx, { ...actor, organizationId })
    await lockCutover(tx, organizationId)
    const hash = hashStablePayload({ actorId: actor.actorId, input })
    const replay = await tx.financialOpeningExecution.findUnique({ where: { organizationId_approvalKey: { organizationId, approvalKey: input.idempotencyKey } } })
    if (replay) {
      if (replay.approvalHash !== hash) throw new IdempotencyConflictError()
      await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
      return { id: replay.id, status: replay.status, replayed: true }
    }
    const { period } = await periodInTx(tx, organizationId)
    const current = await evidence(tx, organizationId, input.revisionId, input.expectedDigest)
    if (current.row.createdById === actor.actorId) throw new BusinessRuleError("The source preparer cannot approve financial apply.", "SOD_VIOLATION")
    if (await tx.financialOpeningExecution.findUnique({ where: { activeScopeKey: `${organizationId}:${cutoverDate}` } })) throw new ConflictError("An approval or active cutover already exists. Recover it or cancel the unapplied approval first.")
    await qualification(tx, organizationId, current)
    await emptyFinancialClient(tx, organizationId)
    const at = await readCloseAssessmentPublicationTimeInTx(tx)
    await authority.revalidate(at)
    const execution = await tx.financialOpeningExecution.create({ data: {
      organizationId, revisionId: input.revisionId, cutoverDate, activeScopeKey: `${organizationId}:${cutoverDate}`,
      manifestDigest: input.expectedDigest, periodId: period.id, periodVersion: period.controlVersion,
      approvedById: actor.actorId, approvedAt: at, expiresAt: new Date(at.getTime() + 30 * 60000),
      approvalKey: input.idempotencyKey, approvalHash: hash, conclusion: input.conclusion,
    } })
    await audit(tx, organizationId, actor.actorId, execution.id, "OPENING_CUTOVER_APPROVED", { digest: input.expectedDigest, periodId: period.id, periodVersion: period.controlVersion })
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { id: execution.id, status: execution.status, replayed: false }
  }, options)
}

/** Compare persisted rows and balances, not adapter success counts or client totals. */
async function reconcile(tx: Prisma.TransactionClient, organizationId: string, executionId: string, journalEntryId: string) {
  const { execution, source, target, at } = await approvedOpeningSourceInTx(tx, organizationId, executionId)
  const entry = await tx.journalEntry.findFirstOrThrow({ where: { id: journalEntryId, organizationId }, include: { lines: { orderBy: { lineNumber: "asc" } }, postingBatch: true } })
  const fail = () => { throw new ConflictError("Persisted opening detail does not reconcile. The entire apply has been rolled back.") }
  if (entry.status !== "POSTED" || entry.sourceId !== executionId || entry.periodId !== execution.periodId ||
    entry.entryDate.getTime() !== at.getTime() || entry.postingBatch?.status !== "POSTED" || entry.lines.length !== source.ledger.length) fail()
  const lines = source.ledger.map((row, index) => {
    const actual = entry.lines[index], debit = row.side === "DEBIT" ? openingMoney(row.amount) : openingMoney("0"), credit = row.side === "CREDIT" ? openingMoney(row.amount) : openingMoney("0")
    if (actual.accountId !== target("accounts", row.account) || !actual.debit.eq(debit) || !actual.credit.eq(credit) ||
      !actual.baseDebit?.eq(debit) || !actual.baseCredit?.eq(credit) || actual.currency !== source.currency || !actual.exchangeRate.eq(1)) fail()
    return { sourceId: row.sourceId, accountId: actual.accountId, debit: actual.debit.toFixed(2), credit: actual.credit.toFixed(2), difference: "0.00" }
  })
  const details: Array<Record<string, string>> = []
  for (const row of source.openItems) {
    const expected = openingMoney(row.outstanding)
    if (row.kind === "AR") {
      const doc = await tx.customerReceivableDocument.findFirstOrThrow({ where: { organizationId, openingRevisionId: execution.revisionId, openingSourceId: row.sourceId }, include: { lifecycleStates: true } })
      const ledger = await tx.customerLedgerEntry.findMany({ where: { organizationId, referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT", referenceId: doc.id } })
      if (doc.customerId !== target("customers", row.counterparty) || doc.sourceSalesOrderId !== null || doc.currency !== source.currency ||
        !doc.totalAmount.eq(openingMoney(row.original)) || !doc.initialPaidAmount.eq(openingMoney(row.settled)) || !doc.initialUnpaidAmount.eq(expected) ||
        doc.invoiceDate.getTime() !== openingDate(row.sourceDate).getTime() || doc.dueDate.getTime() !== openingDate(row.dueDate).getTime() ||
        doc.lifecycleStates.length !== 1 || !doc.lifecycleStates[0].unpaidAmount.eq(expected) || !doc.lifecycleStates[0].paidAmount.eq(openingMoney(row.settled)) ||
        ledger.length !== 1 || ledger[0].customerId !== doc.customerId || ledger[0].type !== "OPENING_BALANCE" || !ledger[0].debit.eq(expected) || !ledger[0].credit.eq(0)) fail()
      details.push({ sourceId: row.sourceId, domain: "AR", documentId: doc.id, outstanding: doc.initialUnpaidAmount.toFixed(2), difference: "0.00" })
    } else {
      const doc = await tx.supplierInvoice.findFirstOrThrow({ where: { organizationId, openingRevisionId: execution.revisionId, openingSourceId: row.sourceId } })
      const ledger = await tx.supplierLedgerEntry.findMany({ where: { organizationId, referenceType: "SUPPLIER_INVOICE", referenceId: doc.id } })
      if (doc.supplierId !== target("suppliers", row.counterparty) || doc.status !== "POSTED" || doc.currency !== source.currency ||
        !doc.total.eq(openingMoney(row.original)) || !doc.amountPaid.eq(openingMoney(row.settled)) || !doc.total.minus(doc.amountPaid).eq(expected) ||
        doc.invoiceDate.getTime() !== openingDate(row.sourceDate).getTime() || doc.dueDate?.getTime() !== openingDate(row.dueDate).getTime() ||
        ledger.length !== 1 || ledger[0].supplierId !== doc.supplierId || ledger[0].type !== "OPENING_BALANCE" || !ledger[0].debit.eq(expected) || !ledger[0].credit.eq(0)) fail()
      details.push({ sourceId: row.sourceId, domain: "AP", documentId: doc.id, outstanding: doc.total.minus(doc.amountPaid).toFixed(2), difference: "0.00" })
    }
  }
  for (const row of source.stock) {
    const itemId = target("items", row.item), locationId = target("locations", row.location)
    const level = await tx.inventoryLevel.findUniqueOrThrow({ where: { itemId_locationId: { itemId, locationId } } })
    const moves = await tx.inventoryTransaction.findMany({ where: { organizationId, referenceId: `${executionId}:${row.sourceId}` } })
    if (!level.quantityOnHand.eq(row.quantity) || !level.quantityAvailable.eq(row.quantity) || !level.quantityReserved.eq(0) || !level.totalValue.eq(row.value) ||
      moves.length !== 1 || moves[0].itemId !== itemId || moves[0].locationId !== locationId || !moves[0].quantity.eq(row.quantity) ||
      !moves[0].unitCost.eq(row.unitCost) || !moves[0].totalCost.eq(row.value) || moves[0].type !== "INITIAL_STOCK") fail()
    details.push({ sourceId: row.sourceId, domain: "STOCK", itemId, locationId, quantity: level.quantityOnHand.toFixed(3), value: level.totalValue.toFixed(2), difference: "0.00" })
  }
  for (const kind of ["AR", "AP"] as const) {
    const group = kind === "AR" ? "customers" : "suppliers"
    const ids = [...new Set(source.openItems.filter(row => row.kind === kind).map(row => target(group, row.counterparty)))]
    for (const id of ids) {
      const expected = source.openItems.filter(row => row.kind === kind && target(group, row.counterparty) === id).reduce((sum, row) => sum.plus(row.outstanding), new Prisma.Decimal(0))
      const entity = kind === "AR" ? await tx.customer.findUniqueOrThrow({ where: { id } }) : await tx.supplier.findUniqueOrThrow({ where: { id } })
      if (!entity.currentBalance.eq(expected)) fail()
    }
  }
  const operations = await tx.financialOpeningOperation.findMany({ where: { organizationId, executionId }, orderBy: [{ domain: "asc" }, { sourceId: "asc" }] })
  if (operations.length !== 1 + source.openItems.length + source.stock.length ||
    operations.some(row => hashStablePayload(row.receipt) !== row.receiptHash)) fail()
  return { version: "opening-reconciliation-v1", executionId, revisionId: execution.revisionId, manifestDigest: execution.manifestDigest,
    journalEntryId, currency: source.currency, cutoverAt: at.toISOString(),
    debit: entry.lines.reduce((sum, row) => sum.plus(row.debit), new Prisma.Decimal(0)).toFixed(2),
    credit: entry.lines.reduce((sum, row) => sum.plus(row.credit), new Prisma.Decimal(0)).toFixed(2),
    lines, details, operations: operations.map(row => ({ domain: row.domain, sourceId: row.sourceId, receiptHash: row.receiptHash })), reconciled: true }
}
export async function applyOpeningCutover(actor: WorkpaperActor, raw: unknown) {
  const input = applyOpeningSchema.parse(raw), organizationId = scopeOf(actor, input)
  return db.$transaction(async tx => {
    const authority = await lockOpeningApplyAuthorityInTx(tx, { ...actor, organizationId })
    await lockCutover(tx, organizationId)
    const execution = await tx.financialOpeningExecution.findFirst({ where: { id: input.executionId, organizationId } })
    if (!execution) throw new NotFoundError("Opening execution is unavailable.")
    if (execution.approvedById !== actor.actorId) throw new ForbiddenError("Only the current approving client operator may apply this approval.")
    const hash = hashStablePayload({ actorId: actor.actorId, input })
    if (execution.status === "ACTIVE") {
      if (execution.applyKey !== input.idempotencyKey || execution.applyHash !== hash) throw new IdempotencyConflictError()
      if (!execution.reconciliation || hashStablePayload(execution.reconciliation) !== execution.reconciliationHash) throw new ConflictError("The retained reconciliation is invalid.")
      await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
      return { id: execution.id, status: execution.status, reconciliation: execution.reconciliation, replayed: true }
    }
    if (execution.status !== "APPROVED") throw new ConflictError("This approval was cancelled; no apply is permitted.")
    const { period, affectedPeriodIds } = await periodInTx(tx, organizationId)
    if (execution.periodId !== period.id || execution.periodVersion !== period.controlVersion) throw new ConflictError("The accounting period changed. Cancel and approve again.")
    const current = await evidence(tx, organizationId, execution.revisionId, execution.manifestDigest)
    if (current.row.createdById === actor.actorId) throw new BusinessRuleError("Source preparers cannot apply their own opening.", "SOD_VIOLATION")
    await qualification(tx, organizationId, current)
    await emptyFinancialClient(tx, organizationId)
    const revalidate = async () => {
      const at = await readCloseAssessmentPublicationTimeInTx(tx)
      await authority.revalidate(at)
      if (execution.expiresAt <= at) throw new ConflictError("Financial approval expired. Cancel and approve the current source again.")
    }
    await revalidate()
    await audit(tx, organizationId, actor.actorId, execution.id, "OPENING_APPLY_BEFORE_LEDGER")
    const ledger = await postControlledOpeningLedgerInTx(tx, organizationId, execution.id, affectedPeriodIds)
    await audit(tx, organizationId, actor.actorId, execution.id, "OPENING_APPLY_AFTER_LEDGER")
    for (const kind of ["AR", "AP"] as const) {
      await audit(tx, organizationId, actor.actorId, execution.id, `OPENING_APPLY_BEFORE_${kind}`)
      for (const row of current.source.openItems.filter(item => item.kind === kind)) {
        if (kind === "AR") await postControlledOpeningReceivableInTx(tx, organizationId, execution.id, row.sourceId)
        else await postControlledOpeningPayableInTx(tx, organizationId, execution.id, row.sourceId, ledger.postingBatchId)
      }
      await audit(tx, organizationId, actor.actorId, execution.id, `OPENING_APPLY_AFTER_${kind}`)
    }
    await audit(tx, organizationId, actor.actorId, execution.id, "OPENING_APPLY_BEFORE_STOCK")
    for (const row of current.source.stock) await postControlledOpeningStockInTx(tx, organizationId, execution.id, row.sourceId, ledger.postingBatchId)
    await audit(tx, organizationId, actor.actorId, execution.id, "OPENING_APPLY_AFTER_STOCK")
    const reconciliation = await reconcile(tx, organizationId, execution.id, ledger.journalEntryId)
    await revalidate()
    const event = await recordBusinessEventInTx(tx, { organizationId, eventType: "financial.opening.activated", eventSource: "INTERNAL",
      idempotencyKey: `opening:${execution.id}:activated`, actorId: actor.actorId, sourceType: "OPENING_BALANCE", sourceId: execution.id,
      postingBatchId: ledger.postingBatchId, payload: reconciliation, outboxMessages: [{ channel: "NOTIFICATION", eventName: "financial.opening.activated",
        payload: { executionId: execution.id, reconciliationHash: hashStablePayload(reconciliation) } }] })
    await markBusinessEventAppliedInTx(tx, organizationId, event.event.id)
    await tx.financialOpeningExecution.update({ where: { id: execution.id }, data: {
      status: "ACTIVE", appliedById: actor.actorId, appliedAt: await readCloseAssessmentPublicationTimeInTx(tx),
      applyKey: input.idempotencyKey, applyHash: hash, reconciliation: openingJson(reconciliation), reconciliationHash: hashStablePayload(reconciliation),
    } })
    await audit(tx, organizationId, actor.actorId, execution.id, "OPENING_CUTOVER_ACTIVATED", { reconciliationHash: hashStablePayload(reconciliation) })
    await revalidate()
    return { id: execution.id, status: "ACTIVE", reconciliation: openingJson(reconciliation), replayed: false }
  }, options)
}
export async function cancelOpeningCutover(actor: WorkpaperActor, raw: unknown) {
  const input = cancelOpeningSchema.parse(raw), organizationId = scopeOf(actor, input)
  return db.$transaction(async tx => {
    const authority = await lockOpeningApplyAuthorityInTx(tx, { ...actor, organizationId })
    await lockCutover(tx, organizationId)
    const execution = await tx.financialOpeningExecution.findFirst({ where: { id: input.executionId, organizationId } })
    if (!execution) throw new NotFoundError("Opening execution is unavailable.")
    if (execution.status === "ACTIVE") throw new ConflictError("Applied financial history cannot be cancelled. Use controlled domain corrections.")
    if (execution.status === "CANCELLED") {
      if (execution.cancelledById !== actor.actorId || execution.cancellationReason !== input.reason) throw new IdempotencyConflictError()
    } else {
      await tx.financialOpeningExecution.update({ where: { id: execution.id }, data: { status: "CANCELLED", activeScopeKey: null,
        cancelledById: actor.actorId, cancelledAt: await readCloseAssessmentPublicationTimeInTx(tx), cancellationReason: input.reason } })
      await audit(tx, organizationId, actor.actorId, execution.id, "OPENING_CUTOVER_CANCELLED", { reason: input.reason })
    }
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { id: execution.id, status: "CANCELLED" }
  }, options)
}
export async function getOpeningCutoverWorkspace(actor: WorkpaperActor, raw: unknown): Promise<OpeningCutoverWorkspace> {
  const input = openingScopeSchema.parse(raw), organizationId = scopeOf(actor, input)
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, "workpaper-read")
    const rows = await tx.financialOpeningExecution.findMany({ where: { organizationId, cutoverDate }, orderBy: { approvedAt: "desc" }, take: 100,
      include: { operations: { orderBy: [{ domain: "asc" }, { sourceId: "asc" }], select: { domain: true, sourceId: true, receiptHash: true } } } })
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { organizationId, clientOperator: actor.homeOrganizationId === organizationId,
      executions: rows.map(row => ({ id: row.id, revisionId: row.revisionId, status: row.status, manifestDigest: row.manifestDigest,
        approvedById: row.approvedById, approvedAt: row.approvedAt.toISOString(), expiresAt: row.expiresAt.toISOString(),
        appliedAt: row.appliedAt?.toISOString() ?? null, periodId: row.periodId, periodVersion: row.periodVersion,
        reconciliation: row.reconciliation, reconciliationHash: row.reconciliationHash, cancellationReason: row.cancellationReason, operations: row.operations })) }
  }, options)
}
