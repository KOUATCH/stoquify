// Review artifact only: writes isolated candidate files, never application files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const out = path.join(root, 'candidate');
fs.mkdirSync(out, { recursive: true });
const read = file => fs.readFileSync(path.join(root, file.replaceAll('/', '__')), 'utf8');
const replace = (text, before, after) => {
  if (text.split(before).length !== 2) throw Error('Candidate edit must match exactly once: ' + before.slice(0, 100));
  return text.replace(before, after);
};
const write = (file, text) => fs.writeFileSync(path.join(out, file.replaceAll('/', '__')), text);
let ledger = read('services/purchasing/purchase-correction-ledger.service.ts').replaceAll('\r\n', '\n');
ledger = replace(ledger, 'import { BusinessRuleError, NotFoundError }', 'import { BusinessRuleError, ConflictError, NotFoundError }');
ledger = replace(ledger, 'import { recordReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"', `import { recordOrderedReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { lockJournalReversalClosePeriodsInTx } from "@/services/accounting/journal-reversal-order.service"
import { recordInventoryValuationCloseInvalidationInTx } from "@/services/inventory/inventory-close-invalidation.service"`);
const preparation = `
type PurchaseCorrectionPreparationInput = Pick<PurchaseCorrectionLedgerReversalInput,
  "organizationId" | "sourceType" | "originalSourceId" | "originalJournalEntryId" | "originalPostingBatchId"> & {
  originalSourceDate: Date
  reversalDate: Date
}

type OriginalCorrectionJournal = Prisma.JournalEntryGetPayload<{
  include: { lines: { include: { account: true } }; reversedByEntries: { select: { id: true } } }
}>

export type PreparedPurchaseCorrectionReversal = Readonly<{
  transaction: Prisma.TransactionClient
  organizationId: string
  sourceType: PurchaseCorrectionLedgerReversalInput["sourceType"]
  originalSourceId: string
  originalJournalEntryId: string | null
  originalPostingBatchId: string | null
  reversalDate: Date
  reversalPeriodId: string
  original: OriginalCorrectionJournal | null
  affectedPeriodIds: readonly string[]
}>

/** The owner holds catalog and source locks. Prepare before numbering or writes. */
export async function preparePurchaseCorrectionReversalInTx(
  tx: Prisma.TransactionClient,
  input: PurchaseCorrectionPreparationInput,
): Promise<PreparedPurchaseCorrectionReversal> {
  const postingPurpose = input.sourceType === AccountingSourceType.PURCHASE_RETURN
    ? AccountingPostingPurpose.PURCHASE_RETURN : AccountingPostingPurpose.SUPPLIER_CREDIT_NOTE
  let original: OriginalCorrectionJournal | null = null
  if (input.originalJournalEntryId) {
    await tx.$queryRaw\`SELECT id FROM journal_entries WHERE id = \$\{input.originalJournalEntryId\} AND "organizationId" = \$\{input.organizationId\} FOR UPDATE\`
    original = await tx.journalEntry.findFirst({
      where: { id: input.originalJournalEntryId, organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.originalSourceId },
      include: { lines: { include: { account: true }, orderBy: { lineNumber: "asc" } }, reversedByEntries: { select: { id: true } } },
    })
    if (!original) throw new NotFoundError("Original purchase correction journal entry was not found.")
    if (original.status !== JournalEntryStatus.POSTED || original.reversedByEntries.length > 0) {
      throw new BusinessRuleError("Purchase correction journal has already been reversed or is not posted.")
    }
    if (input.originalPostingBatchId && input.originalPostingBatchId !== original.postingBatchId) {
      throw new BusinessRuleError("The original correction posting evidence changed or is inconsistent. Review it before reversal.")
    }
  } else if (await tx.journalEntry.findFirst({
    where: { organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.originalSourceId }, select: { id: true },
  })) throw new BusinessRuleError("The original correction has journal evidence that requires review before reversal.")

  const batchId = original?.postingBatchId ?? input.originalPostingBatchId ?? null
  let batchPeriodId: string | null = null
  if (batchId) {
    await tx.$queryRaw\`SELECT id FROM ledger_posting_batches WHERE id = \$\{batchId\} AND "organizationId" = \$\{input.organizationId\} FOR UPDATE\`
    const batch = await tx.ledgerPostingBatch.findFirst({
      where: { id: batchId, organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.originalSourceId, postingPurpose },
      select: { id: true, periodId: true, status: true, journalEntries: { select: { id: true } } },
    })
    if (!batch || (!original && (![LedgerPostingBatchStatus.PENDING, LedgerPostingBatchStatus.FAILED].some(status => status === batch.status) || batch.journalEntries.length > 0))) {
      throw new BusinessRuleError("The original correction posting evidence changed or is inconsistent. Review it before reversal.")
    }
    batchPeriodId = batch.periodId
  } else if (!original && await tx.ledgerPostingBatch.findFirst({
    where: { organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.originalSourceId }, select: { id: true },
  })) throw new BusinessRuleError("The original correction has posting evidence that requires review before reversal.")

  const period = await getOpenPeriodForDate(input.organizationId, input.reversalDate, tx)
  const affectedPeriodIds = await lockJournalReversalClosePeriodsInTx(tx, input.organizationId, {
    originalPeriodId: original?.periodId ?? null, reversalPeriodId: period.id,
    originalEntryDate: original?.entryDate ?? input.originalSourceDate, reversalDate: input.reversalDate,
    additionalEvidenceDates: [input.originalSourceDate], additionalPeriodIds: batchPeriodId ? [batchPeriodId] : [],
    includeLaterPeriods: input.sourceType === AccountingSourceType.PURCHASE_RETURN || !!original?.lines.some(line => line.account.syscohadaClass?.startsWith("3")),
  })
  return { transaction: tx, organizationId: input.organizationId, sourceType: input.sourceType,
    originalSourceId: input.originalSourceId, originalJournalEntryId: input.originalJournalEntryId,
    originalPostingBatchId: input.originalPostingBatchId ?? null, reversalDate: input.reversalDate,
    reversalPeriodId: period.id, original, affectedPeriodIds }
}

function assertPrepared(tx: Prisma.TransactionClient, prepared: PreparedPurchaseCorrectionReversal) {
  if (!prepared || prepared.transaction !== tx || !prepared.affectedPeriodIds.includes(prepared.reversalPeriodId)) {
    throw new ConflictError("Purchase correction requires its prepared evidence scope in the same transaction.")
  }
}

/** Complete stock and source writes before taking Close run locks. */
export async function recordPurchaseCorrectionReversalCloseInvalidationsInTx(
  tx: Prisma.TransactionClient,
  prepared: PreparedPurchaseCorrectionReversal,
  input: { sourceId: string; documentHash: string; actorId?: string | null; posting: APPostingStatus | null },
) {
  assertPrepared(tx, prepared)
  if (prepared.original && !input.posting?.journalEntryId) throw new ConflictError("The prepared journal reversal has no completed posting evidence.")
  if (prepared.original && input.posting?.journalEntryId) {
    await recordOrderedReversedJournalCloseInvalidationsInTx(tx, prepared.organizationId, {
      originalJournalEntryId: prepared.original.id, reversalJournalEntryId: input.posting.journalEntryId,
      originalPeriodId: prepared.original.periodId, reversalPeriodId: prepared.reversalPeriodId,
      reversalDate: prepared.reversalDate, affectedPeriodIds: prepared.affectedPeriodIds, correlationId: input.posting.ledgerBatch.id,
    }, { actorId: input.actorId })
  }
  if (prepared.sourceType === AccountingSourceType.PURCHASE_RETURN) {
    await recordInventoryValuationCloseInvalidationInTx(tx, {
      organizationId: prepared.organizationId, sourceId: input.sourceId, periodId: prepared.reversalPeriodId,
      occurredAt: prepared.reversalDate, affectedPeriodIds: prepared.affectedPeriodIds,
      actorId: input.actorId, documentHash: input.documentHash,
    })
  } else if (!prepared.original) {
    await recordCloseCertificationInvalidationsForSourceInTx(tx, prepared.organizationId, {
      sourceCode: "SUPPLIER_CREDIT_NOTE_REVERSED", sourceId: input.sourceId, periodIds: prepared.affectedPeriodIds,
      newEvidenceHash: input.documentHash, staleReason: "Supplier credit reversal changed retained payable and posting evidence.",
    }, { actorId: input.actorId })
  }
}
`;
ledger = replace(ledger, '\nfunction json(', preparation + '\nfunction json(');
ledger = replace(ledger, '  input: PurchaseCorrectionLedgerReversalInput,\n):', '  input: PurchaseCorrectionLedgerReversalInput,\n  prepared: PreparedPurchaseCorrectionReversal,\n):');
ledger = replace(ledger, '  const period = await getOpenPeriodForDate(input.organizationId, input.sourceDate, tx)', `  assertPrepared(tx, prepared)
  if (prepared.organizationId !== input.organizationId || prepared.sourceType !== input.sourceType ||
    prepared.originalSourceId !== input.originalSourceId || prepared.originalJournalEntryId !== input.originalJournalEntryId ||
    prepared.originalPostingBatchId !== (input.originalPostingBatchId ?? null) || prepared.reversalDate.getTime() !== input.sourceDate.getTime()) {
    throw new ConflictError("Purchase correction differs from its prepared evidence scope.")
  }
  const period = { id: prepared.reversalPeriodId }`);
const originalStart = ledger.indexOf('  const original = await tx.journalEntry.findFirst({');
const originalEnd = ledger.indexOf('  if (!original)', originalStart);
if (originalStart < 0 || originalEnd < originalStart) throw Error('Original query missing');
ledger = ledger.slice(0, originalStart) + '  const original = prepared.original\n' + ledger.slice(originalEnd);
const invalidationStart = ledger.indexOf('  await recordReversedJournalCloseInvalidationsInTx(');
const invalidationEnd = ledger.indexOf('\n  return {', invalidationStart);
if (invalidationStart < 0 || invalidationEnd < invalidationStart) throw Error('Legacy invalidation missing');
ledger = ledger.slice(0, invalidationStart) + ledger.slice(invalidationEnd);
write('services/purchasing/purchase-correction-ledger.service.ts', ledger);

let owners = read('services/purchasing/purchase-return-credit.service.ts').replaceAll('\r\n', '\n');
owners = replace(owners, 'import { reversePurchaseCorrectionLedgerInTx }', 'import { preparePurchaseCorrectionReversalInTx, recordPurchaseCorrectionReversalCloseInvalidationsInTx, reversePurchaseCorrectionLedgerInTx }');
owners = replace(owners, 'import { getOpenPeriodForDate }', 'import { lockJournalReversalCatalogInTx } from "@/services/accounting/journal-reversal-order.service"\nimport { getOpenPeriodForDate }');
owners = replace(owners, '\nfunction quantity(', `
export type PurchaseCorrectionReversalControl = { assertCurrentAuthority?: () => Promise<void> }

function inReversalTransaction<T>(client: DbClient, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return hasTransaction(client)
    ? client.$transaction(work, { maxWait: 10_000, timeout: 20_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
    : work(client as Prisma.TransactionClient)
}

function quantity(`);
owners = replace(owners, 'export async function reversePurchaseReturn(input: ReversePurchaseReturnInput, client: DbClient = db) {', 'export async function reversePurchaseReturn(input: ReversePurchaseReturnInput, client: DbClient = db, control: PurchaseCorrectionReversalControl = {}) {');
owners = replace(owners, 'export async function reverseSupplierCreditNote(input: ReverseSupplierCreditNoteInput, client: DbClient = db) {', 'export async function reverseSupplierCreditNote(input: ReverseSupplierCreditNoteInput, client: DbClient = db, control: PurchaseCorrectionReversalControl = {}) {');
const returnStart = owners.indexOf('export async function reversePurchaseReturn('), returnEnd = owners.indexOf('\nasync function findCreditReplay', returnStart);
let ret = owners.slice(returnStart, returnEnd);
ret = replace(ret, 'return inTransaction(client', 'return inReversalTransaction(client');
ret = replace(ret, '    await tx.$queryRaw`SELECT s.id', '    await lockJournalReversalCatalogInTx(tx, parsed.organizationId)\n    await tx.$queryRaw`SELECT s.id');
ret = replace(ret, '    const returnNumber = await allocatePurchaseDocumentNumber', `    const prepared = await preparePurchaseCorrectionReversalInTx(tx, {
      organizationId: parsed.organizationId, sourceType: AccountingSourceType.PURCHASE_RETURN,
      originalSourceId: original.id, originalJournalEntryId: accounting.journalEntryId,
      originalPostingBatchId: original.ledgerPostingBatchId, originalSourceDate: original.occurredAt, reversalDate: occurredAt,
    })
    await control.assertCurrentAuthority?.()
    const returnNumber = await allocatePurchaseDocumentNumber`);
ret = replace(ret, '      await getOpenPeriodForDate(parsed.organizationId, occurredAt, tx)\n', '');
ret = replace(ret, '    })\n    const stock = await postPurchaseReturnStock', '    }, prepared)\n    const stock = await postPurchaseReturnStock');
ret = replace(ret, '    }, tx)\n    if (!stock.eventId', '    }, tx, { transaction: tx, organizationId: parsed.organizationId, affectedPeriodIds: prepared.affectedPeriodIds, deferCloseInvalidation: true })\n    if (!stock.eventId');
ret = replace(ret, '    return { purchaseReturn: created, replayed: false }', `    await recordPurchaseCorrectionReversalCloseInvalidationsInTx(tx, prepared, {
      sourceId: created.id, documentHash, actorId: parsed.postedById, posting,
    })
    return { purchaseReturn: created, replayed: false }`);
owners = owners.slice(0, returnStart) + ret + owners.slice(returnEnd);
const creditStart = owners.indexOf('export async function reverseSupplierCreditNote(');
let credit = owners.slice(creditStart);
credit = replace(credit, 'return inTransaction(client', 'return inReversalTransaction(client');
credit = replace(credit, '    await tx.$queryRaw`SELECT s.id', '    await lockJournalReversalCatalogInTx(tx, parsed.organizationId)\n    await tx.$queryRaw`SELECT s.id');
credit = replace(credit, '    const supplierCreditNoteId = randomUUID()', `    const prepared = await preparePurchaseCorrectionReversalInTx(tx, {
      organizationId: parsed.organizationId, sourceType: AccountingSourceType.SUPPLIER_CREDIT_NOTE,
      originalSourceId: original.id, originalJournalEntryId: original.journalEntryId,
      originalPostingBatchId: original.ledgerPostingBatchId, originalSourceDate: original.creditDate, reversalDate: creditDate,
    })
    await control.assertCurrentAuthority?.()
    const supplierCreditNoteId = randomUUID()`);
credit = replace(credit, '      await getOpenPeriodForDate(parsed.organizationId, creditDate, tx)\n', '');
credit = replace(credit, '    })\n    const balanceAfter = money(supplier.currentBalance)', '    }, prepared)\n    const balanceAfter = money(supplier.currentBalance)');
credit = replace(credit, '    return { supplierCreditNote: created, replayed: false, ledgerStatus:', `    await recordPurchaseCorrectionReversalCloseInvalidationsInTx(tx, prepared, {
      sourceId: created.id, documentHash: parsed.documentHash, actorId: parsed.postedById, posting,
    })
    return { supplierCreditNote: created, replayed: false, ledgerStatus:`);
owners = owners.slice(0, creditStart) + credit;
write('services/purchasing/purchase-return-credit.service.ts', owners);

let stock = read('services/inventory/inventory-stock-event.service.ts').replaceAll('\r\n', '\n');
stock = replace(stock, '\ntype StockEventInput = {', `
/** Internal handoff from a source owner that retains the prepared period locks. */
export type PurchaseReturnStockControl = {
  transaction: Prisma.TransactionClient
  organizationId: string
  affectedPeriodIds: readonly string[]
  deferCloseInvalidation?: boolean
}

type StockEventInput = {`);
stock = replace(stock, '  requiresOpenPeriod?: boolean', '  requiresOpenPeriod?: boolean\n  closeInvalidationControl?: PurchaseReturnStockControl');
stock = replace(stock, '      : await assertOpenInventoryPeriod(tx, input.organizationId, occurredAt)', `      : await assertOpenInventoryPeriod(tx, input.organizationId, occurredAt)
    if (input.closeInvalidationControl && (!period || !input.closeInvalidationControl.affectedPeriodIds.includes(period.id))) {
      throw new BusinessRuleError("Purchase return stock evidence scope does not include its posting period.")
    }`);
stock = replace(stock, '    if (input.eventType !== "stock.reservation.posted") {', '    if (input.eventType !== "stock.reservation.posted" && !input.closeInvalidationControl?.deferCloseInvalidation) {');
stock = replace(stock, '        correlationId: typeof input.metadata?.correlationId', '        affectedPeriodIds: input.closeInvalidationControl?.affectedPeriodIds,\n        correlationId: typeof input.metadata?.correlationId');
stock = replace(stock, 'export function postPurchaseReturnStock(input: PurchaseReturnStockInput, client: DbClient = db) {', `export function postPurchaseReturnStock(input: PurchaseReturnStockInput, client: DbClient = db, control?: PurchaseReturnStockControl) {
  if (control && (control.transaction !== client || hasTransaction(client) || control.organizationId !== input.organizationId || !control.affectedPeriodIds.length || input.direction !== PurchaseCorrectionDirection.REVERSAL)) {
    throw new BusinessRuleError("Purchase return stock requires its prepared evidence scope in the same transaction.")
  }`);
stock = replace(stock, '      accountingPostingBatchId: input.accountingPostingBatchId,', '      accountingPostingBatchId: input.accountingPostingBatchId,\n      closeInvalidationControl: control,');
write('services/inventory/inventory-stock-event.service.ts', stock);

let registry = read('services/accounting/close-assurance-pack.service.ts').replaceAll('\r\n', '\n');
registry = replace(registry, '  | "LEDGER_JOURNAL_REVERSED"', '  | "LEDGER_JOURNAL_REVERSED"\n  | "SUPPLIER_CREDIT_NOTE_REVERSED"');
registry = replace(registry, '  PAYROLL_RUN_APPROVED: {', `  SUPPLIER_CREDIT_NOTE_REVERSED: {
    sourceCode: "SUPPLIER_CREDIT_NOTE_REVERSED",
    ring: "FIRST_RING",
    domain: "ledger",
    sourceModel: "SupplierCreditNote",
    sourceTable: "supplier_credit_notes",
    sourceEventName: "purchase.supplier_credit.reversed",
    closeImpact: "CERTIFIED_CLOSE_EVIDENCE_STALE",
  },
  PAYROLL_RUN_APPROVED: {`);
write('services/accounting/close-assurance-pack.service.ts', registry);
const files = fs.readdirSync(out).sort().map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(out, file))).digest('hex') }));
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ status: 'ISOLATED_CANDIDATE_NOT_APPLIED', files }, null, 2) + '\n');
console.log(JSON.stringify({ directory: out, count: files.length, applicationFilesChanged: false }));
