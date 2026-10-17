import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { readReceiptRecognitionEvidence, readReceiptRecognitionSource, receiptRecognitionReviewRequired } from "./receipt-recognition-source"
import { postReceiptRecognitionInTx } from "./receipt-recognition.service"
import { listReceiptReturnRecoverySources } from "@/services/purchasing/receipt-return-recognition"
import { recoverPurchaseReturnAccountingInTx } from "@/services/purchasing/purchase-return-credit.service"
import { receiptLedgerRecoveryAuthority, receiptLedgerRecoveryScopeSchema, type ReceiptLedgerRecoveryScope } from "./receipt-ledger-recovery-authority"
import { receiptLedgerRecoveryCommandSchema, receiptLedgerRecoveryDecisionSchema, receiptLedgerRecoveryDraftSchema, type ReceiptLedgerRecoveryCommand, type ReceiptLedgerRecoveryDraft, type ReceiptLedgerRecoveryPreview } from "./receipt-ledger-recovery-contracts"

const eventKey = (key: string) => `receipt-ledger-recovery:${key}`
const eventType = "purchase.goods_receipt.ledger_recovery_recorded"
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(work, { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code)))
      if (!retryable) throw error
      if (attempt >= 2) throw new ConflictError("Concurrent receipt or accounting changes interrupted recovery. Retry the same request.")
    }
  }
}

async function plan(tx: Prisma.TransactionClient, draft: ReceiptLedgerRecoveryDraft, scope: ReceiptLedgerRecoveryScope, fresh: boolean) {
  await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN purchase_orders p ON p."supplierId" = s.id JOIN goods_receipts r ON r."purchaseOrderId" = p.id WHERE r.id = ${draft.receiptId} AND r."organizationId" = ${scope.organizationId} AND p."organizationId" = ${scope.organizationId} AND s."organizationId" = ${scope.organizationId} FOR UPDATE OF s`
  await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${draft.orderId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  await tx.$queryRaw`SELECT id FROM goods_receipts WHERE id = ${draft.receiptId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  const receipt = await tx.goodsReceipt.findFirst({ where: { id: draft.receiptId, purchaseOrderId: draft.orderId, organizationId: scope.organizationId, deletedAt: null, purchaseOrder: { organizationId: scope.organizationId, deletedAt: null } }, include: { purchaseOrder: { include: { supplier: true } }, organization: { select: { currency: true, accountingSettings: true } } } })
  if (!receipt || receipt.purchaseOrder.supplier.organizationId !== scope.organizationId) throw new NotFoundError("Goods receipt is unavailable.")
  const blockers: ReceiptLedgerRecoveryPreview["blockers"] = []
  let source: Awaited<ReturnType<typeof readReceiptRecognitionSource>> = null
  let evidence: Awaited<ReturnType<typeof readReceiptRecognitionEvidence>> | null = null
  try {
    source = await readReceiptRecognitionSource(tx, scope.organizationId, receipt.id)
    if (!source) blockers.push("LEGACY_SOURCE")
    else {
      evidence = await readReceiptRecognitionEvidence(tx, source)
      if (!evidence.stockVerified) blockers.push("STOCK_UNVERIFIED")
      if (evidence.accountingStatus === "POSTED") blockers.push("ALREADY_POSTED")
      else if (evidence.accountingStatus === "NOT_REQUIRED") blockers.push("NOT_REQUIRED")
      else if (evidence.accountingStatus !== "BLOCKED") blockers.push("BATCH_REVIEW")
    }
  } catch (error) { if (!(error instanceof BusinessRuleError)) throw error; blockers.push("SOURCE_UNVERIFIED") }
  const batches = await tx.ledgerPostingBatch.findMany({ where: { organizationId: scope.organizationId, sourceType: "GOODS_RECEIPT", sourceId: receipt.id, postingPurpose: "GOODS_RECEIPT" }, include: { journalEntries: { include: { lines: true } }, sourceLinks: true }, orderBy: { id: "asc" } })
  const effectiveAt = source ? new Date(source.manifest.effectiveAt) : null
  const periods = effectiveAt ? await tx.accountingPeriod.findMany({ where: { organizationId: scope.organizationId, startDate: { lte: effectiveAt }, endDate: { gte: effectiveAt } }, orderBy: { id: "asc" } }) : []
  const period = periods.length === 1 ? periods[0] : null
  const needsReceiptPosting = evidence?.accountingStatus !== "POSTED" && evidence?.accountingStatus !== "NOT_REQUIRED"
  if (source && needsReceiptPosting && (!period || period.status !== "OPEN" || batches.some(batch => batch.periodId && batch.periodId !== period.id))) blockers.push("PERIOD_UNAVAILABLE")
  let rule: Awaited<ReturnType<typeof getActivePostingRule>> = null
  if (effectiveAt) {
    try { rule = await getActivePostingRule(scope.organizationId, { sourceType: "GOODS_RECEIPT", postingPurpose: "GOODS_RECEIPT", effectiveAt }, tx) }
    catch (error) { if (!(error instanceof BusinessRuleError) && !(error instanceof NotFoundError)) throw error }
    if (!rule && needsReceiptPosting) blockers.push("RULE_UNAVAILABLE")
  }
  const journals = await tx.journal.findMany({ where: { organizationId: scope.organizationId, type: "INVENTORY", isDefault: true, isActive: true }, orderBy: { id: "asc" } })
  if (source && needsReceiptPosting && journals.length !== 1) blockers.push("JOURNAL_UNAVAILABLE")
  const accounts = rule ? await tx.chartOfAccount.findMany({ where: { organizationId: scope.organizationId, OR: [{ id: { in: rule.lines.map(line => line.accountId).filter((id): id is string => !!id) } }, { mappingKey: { in: rule.lines.map(line => line.mappingKey).filter((key): key is string => !!key) } }] }, include: { _count: { select: { children: true } } }, orderBy: { id: "asc" } }) : []
  const receiptLineIds = source?.manifest.lines.map(line => line.receiptLineId) ?? []
  const priorInvoices = receiptLineIds.length ? await tx.supplierInvoice.findMany({ where: { organizationId: scope.organizationId, lines: { some: { goodsReceiptLineId: { in: receiptLineIds } } }, OR: [{ approvedById: { not: null } }, { postedAt: { not: null } }, { ledgerPostingBatchId: { not: null } }, { status: { in: ["POSTED", "PAYMENT_PENDING", "PAID"] } }] }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }) : []
  let returnSources: Awaited<ReturnType<typeof listReceiptReturnRecoverySources>> = []
  if (source) {
    try { returnSources = await listReceiptReturnRecoverySources(tx, source) }
    catch (error) { if (!(error instanceof BusinessRuleError)) throw error; blockers.push("SOURCE_UNVERIFIED") }
  }
  if (priorInvoices.length && needsReceiptPosting) blockers.push("SOURCE_UNVERIFIED")
  const returns: ReceiptLedgerRecoveryPreview["returns"] = [], returnBindings = []
  for (const retained of returnSources) {
    const returnBlockers: ReceiptLedgerRecoveryPreview["returns"][number]["blockers"] = []
    if (retained.accountingRequired === false) {
      if (retained.inventoryAmount !== "0.00") throw receiptRecognitionReviewRequired()
      returnBindings.push({ retained })
      returns.push({ returnId: retained.returnId, effectiveAt: retained.sourceDate.toISOString(), value: retained.inventoryAmount, currency: retained.currency, accountingRequired: false, periodName: null, ruleCode: null, journalCode: null, blockers: [] })
      continue
    }
    const returnPeriods = await tx.accountingPeriod.findMany({ where: { organizationId: scope.organizationId, startDate: { lte: retained.sourceDate }, endDate: { gte: retained.sourceDate } }, orderBy: { id: "asc" } })
    if (returnPeriods.length !== 1 || returnPeriods[0].status !== "OPEN") returnBlockers.push("PERIOD_UNAVAILABLE")
    let returnRule: Awaited<ReturnType<typeof getActivePostingRule>> = null
    try { returnRule = await getActivePostingRule(scope.organizationId, { sourceType: "PURCHASE_RETURN", postingPurpose: "PURCHASE_RETURN", effectiveAt: retained.sourceDate }, tx) }
    catch (error) { if (!(error instanceof BusinessRuleError) && !(error instanceof NotFoundError)) throw error }
    if (!returnRule) returnBlockers.push("RULE_UNAVAILABLE")
    const returnJournals = await tx.journal.findMany({ where: { organizationId: scope.organizationId, type: "PURCHASE", isDefault: true, isActive: true }, orderBy: { id: "asc" } })
    if (returnJournals.length !== 1) returnBlockers.push("JOURNAL_UNAVAILABLE")
    const returnAccounts = returnRule ? await tx.chartOfAccount.findMany({ where: { organizationId: scope.organizationId, OR: [{ id: { in: returnRule.lines.map(line => line.accountId).filter((id): id is string => !!id) } }, { mappingKey: { in: returnRule.lines.map(line => line.mappingKey).filter((key): key is string => !!key) } }] }, include: { _count: { select: { children: true } } }, orderBy: { id: "asc" } }) : []
    returnBindings.push({ retained, periods: returnPeriods, rule: returnRule, journals: returnJournals, accounts: returnAccounts })
    returns.push({ returnId: retained.returnId, effectiveAt: retained.sourceDate.toISOString(), value: retained.inventoryAmount, currency: retained.currency, accountingRequired: true, periodName: returnPeriods.length === 1 ? returnPeriods[0].name : null, ruleCode: returnRule?.code ?? null, journalCode: returnJournals.length === 1 ? returnJournals[0].code : null, blockers: returnBlockers })
    if (returnBlockers.length) blockers.push("RETURN_UNAVAILABLE")
  }
  if (returnSources.length && evidence?.accountingStatus === "POSTED") { const index = blockers.indexOf("ALREADY_POSTED"); if (index >= 0) blockers.splice(index, 1) }
  const revision = hashBusinessPayload({ version: 1, receipt, source, evidence, batches, periods, rule, journals, accounts, priorInvoices, returnBindings })
  const preview: ReceiptLedgerRecoveryPreview = { organizationId: scope.organizationId, actorId: scope.actorId, orderId: receipt.purchaseOrderId, receiptId: receipt.id, receiptNumber: receipt.receiptNumber, supplierName: receipt.purchaseOrder.supplier.name, value: source?.inventoryValue.toFixed(2) ?? "0.00", currency: source?.manifest.currency ?? receipt.organization.currency, effectiveAt: source?.manifest.effectiveAt ?? null, sourceEventId: source?.eventId ?? null, sourceHash: source?.sourceHash ?? null, periodName: period?.name ?? null, ruleCode: rule?.code ?? null, journalCode: journals.length === 1 ? journals[0].code : null, blockers: [...new Set(blockers)], requiresFreshAuth: !fresh, revision, checkedAt: new Date().toISOString(), returns }
  return { source, preview, returnSources }
}

export async function previewReceiptLedgerRecovery(draftInput: ReceiptLedgerRecoveryDraft, scopeInput: ReceiptLedgerRecoveryScope) {
  const draft = receiptLedgerRecoveryDraftSchema.parse(draftInput), scope = receiptLedgerRecoveryScopeSchema.parse(scopeInput)
  return transaction(async tx => { const authority = await receiptLedgerRecoveryAuthority(tx, scope, "review"); return (await plan(tx, draft, scope, authority.fresh)).preview })
}

export async function confirmReceiptLedgerRecovery(commandInput: ReceiptLedgerRecoveryCommand, scopeInput: ReceiptLedgerRecoveryScope) {
  const command = receiptLedgerRecoveryCommandSchema.parse(commandInput), scope = receiptLedgerRecoveryScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await receiptLedgerRecoveryAuthority(tx, scope, "submit")
    const lockKey = JSON.stringify(["receipt-ledger-recovery", scope.organizationId, command.idempotencyKey])
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text`
    const commandHash = hashBusinessPayload(command)
    const event = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: scope.organizationId, eventSource: "INTERNAL", idempotencyKey: eventKey(command.idempotencyKey) } } })
    if (event) {
      const payload = record(event.payload)
      if (event.actorId !== scope.actorId || payload.commandHash !== commandHash) throw new IdempotencyConflictError()
      const result = receiptLedgerRecoveryDecisionSchema.safeParse(payload.result)
      if (!result.success || event.eventType !== eventType || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || event.sourceType !== "GOODS_RECEIPT" || event.sourceId !== command.receiptId || result.data.receiptId !== command.receiptId || result.data.orderId !== command.orderId || result.data.organizationId !== scope.organizationId || result.data.actorId !== scope.actorId || result.data.requestReference !== command.idempotencyKey || result.data.reviewedRevision !== command.expectedRevision || result.data.recordedAt !== event.occurredAt.toISOString() || result.data.postingBatchId !== event.postingBatchId || result.data.sourceHash !== event.documentHash) throw receiptRecognitionReviewRequired()
      return { ...result.data, replayed: true }
    }
    const p = await plan(tx, command, scope, true)
    if (p.preview.revision !== command.expectedRevision) throw new ConflictError("Receipt evidence or accounting configuration changed. Review a new preview.")
    if (p.preview.blockers.length || !p.source) throw new BusinessRuleError("Resolve the displayed receipt accounting conditions before recovery.")
    const posting = await postReceiptRecognitionInTx(tx, { organizationId: scope.organizationId, receiptId: command.receiptId, actorId: scope.actorId })
    if (posting.ledgerStatus === "NOT_REQUIRED") throw receiptRecognitionReviewRequired()
    const returnOutcomes = []
    if (p.returnSources.length && posting.ledgerStatus !== "POSTED") throw receiptRecognitionReviewRequired()
    for (const retained of p.returnSources) {
      const returned = await recoverPurchaseReturnAccountingInTx(tx, { organizationId: scope.organizationId, purchaseReturnId: retained.returnId, actorId: scope.actorId })
      if (returned.ledgerStatus === "NOT_REQUIRED") {
        if (retained.accountingRequired !== false || retained.inventoryAmount !== "0.00" || returned.ledgerBatch !== null || returned.journalEntryId !== null || returned.accountingSourceLinkId !== null) throw receiptRecognitionReviewRequired()
        returnOutcomes.push({ returnId: retained.returnId, effectiveAt: retained.sourceDate.toISOString(), sourceHash: retained.sourceHash, ledgerStatus: "NOT_REQUIRED", postingBatchId: null, journalEntryId: null, accountingSourceLinkId: null })
        continue
      }
      if (returned.ledgerStatus !== "POSTED" || !returned.journalEntryId || !returned.accountingSourceLinkId) throw receiptRecognitionReviewRequired()
      returnOutcomes.push({ returnId: retained.returnId, effectiveAt: retained.sourceDate.toISOString(), sourceHash: retained.sourceHash, ledgerStatus: "POSTED", postingBatchId: returned.ledgerBatch.id, journalEntryId: returned.journalEntryId, accountingSourceLinkId: returned.accountingSourceLinkId })
    }
    const result = receiptLedgerRecoveryDecisionSchema.parse({ organizationId: scope.organizationId, actorId: scope.actorId, orderId: command.orderId, receiptId: command.receiptId, receiptNumber: p.preview.receiptNumber, sourceEventId: p.source.eventId, sourceHash: p.source.sourceHash, effectiveAt: p.source.manifest.effectiveAt, requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, recordedAt: new Date().toISOString(), postingBatchId: posting.ledgerBatch.id, ledgerStatus: posting.ledgerStatus, journalEntryId: posting.journalEntryId ?? null, accountingSourceLinkId: posting.accountingSourceLinkId ?? null, blockerCode: posting.blockerCode ?? null, value: p.source.inventoryValue.toFixed(2), currency: p.source.manifest.currency, returnOutcomes })
    const recorded = await recordBusinessEventInTx(tx, { organizationId: scope.organizationId, eventType, eventSource: "INTERNAL", schemaVersion: 1, idempotencyKey: eventKey(command.idempotencyKey), actorId: scope.actorId, sourceType: "GOODS_RECEIPT", sourceId: command.receiptId, postingBatchId: posting.ledgerBatch.id, documentHash: p.source.sourceHash, occurredAt: new Date(result.recordedAt), payload: { commandHash, result } })
    await markBusinessEventAppliedInTx(tx, scope.organizationId, recorded.event.id)
    return { ...result, replayed: false }
  })
}
