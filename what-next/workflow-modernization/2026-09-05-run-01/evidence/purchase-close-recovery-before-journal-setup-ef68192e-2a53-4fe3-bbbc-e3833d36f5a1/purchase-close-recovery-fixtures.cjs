// New owned fixtures only. Importing prepares APIs; only the released runtime calls them.
const h = require('./verify-operational-receipt-recognition.cjs');
const fractional = require('./verify-fractional-receipt-valuation.cjs');
const { f, db, organizations } = h, { fs, path, crypto, assert, root, helper } = f;
const { Prisma } = require('@prisma/client');
const load = file => require(path.join(root, file));
const correction = load('services/purchasing/purchase-return-credit.service.ts');
const settings = load('services/accounting/accounting-settings.service.ts');
const accounts = load('services/accounting/accounts.service.ts');
const journals = load('services/accounting/journals.service.ts');
const rules = load('services/accounting/posting-rules.service.ts');
const { DEFAULT_POSTING_RULES } = load('services/accounting/default-posting-rules.ts');
const { getModuleCatalog } = load('services/modules/module-catalog.service.ts');
const close = load('services/accounting/close-assurance.service.ts');
const pack = load('services/accounting/close-assurance-pack.service.ts');
const { getCloseReadinessSnapshot } = load('services/snapshots/close-readiness-snapshot.service.ts');
const { getCashCommandData } = load('services/cash-command/cash-command.service.ts');
const { getProofTrail } = load('services/evidence/proof-trail.service.ts');
const { getAccountantPortalData } = load('services/accounting/data-trust.service.ts');
const { reconcileInventoryClass3 } = load('services/inventory/inventory-reconciliation.service.ts');
const { readSupplierPaymentBalances } = load('services/purchasing/supplier-payment-balance.ts');
const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const economicModels = ['purchaseReturn', 'purchaseReturnLine', 'supplierCreditNote', 'supplierCreditNoteLine', 'supplierInvoice', 'supplierInvoiceLine', 'goodsReceipt', 'purchaseOrder', 'supplierLedgerEntry', 'supplier', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'inventoryTransaction', 'inventoryLevel', 'goodsReceiptLine', 'purchaseOrderLine', 'payment', 'supplierPayment', 'supplierPaymentAllocation'];
const observedModels = [...economicModels, 'organization', 'item', 'location', 'role', 'user', 'session', 'account', 'organizationAccountingSettings', 'chartOfAccount', 'journal', 'postingRule', 'postingRuleLine', 'fiscalYear', 'accountingPeriod', 'tenantModuleConfiguration', 'tenantModuleGrant', 'closeRun', 'closeEvidenceItem', 'closeChecklistItem', 'closeAssuranceFinding', 'closePackExport', 'businessEvent', 'businessEventAudit', 'businessEventOutbox', 'ledgerAuditEvent', 'auditLog', 'documentSequence'];
function scope(model, org) {
  if (model === 'organization') return { id: org };
  if (model === 'inventoryLevel') return { item: { organizationId: org } };
  if (model === 'goodsReceiptLine') return { goodsReceipt: { organizationId: org } };
  if (model === 'purchaseOrderLine') return { purchaseOrder: { organizationId: org } };
  if (model === 'session' || model === 'account') return { user: { organizationId: org } };
  return { organizationId: org };
}
async function rows(x, models = observedModels, client = db) {
  const values = {};
  for (const model of models) values[model] = await client[model].findMany({ where: scope(model, x.organizationId), orderBy: model === 'tenantModuleConfiguration' ? { organizationId: 'asc' } : { id: 'asc' } });
  return values;
}
async function outside() {
  const models = {};
  for (const model of observedModels) {
    const value = await db[model].findMany({ where: scope(model, { notIn: organizations }), orderBy: model === 'tenantModuleConfiguration' ? { organizationId: 'asc' } : { id: 'asc' } });
    models[model] = { count: value.length, hash: f.hash(value) };
  }
  return { hash: f.hash(models), models };
}
async function guard(client = db) {
  assert.equal(f.target.pathname.slice(1), 'stoquify_local_registration_20260906_01');
  assert.ok(['127.0.0.1', 'localhost'].includes(f.target.hostname));
  await helper.withClient(f.target, helper.assertOwned);
  await assertDisposableDatabaseIdentity(client, 'stoquify_local_registration_20260906_01');
}
function safeError(error) { return { code: error.code ?? null, message: f.safe(error), ...(error.prerequisite ? { prerequisite: error.prerequisite } : {}) }; }
async function completeSetup(x) {
  const modules = getModuleCatalog().map(row => row.slug);
  await db.tenantModuleConfiguration.create({ data: { organizationId: x.organizationId, manifestHash: 'owned-purchase-close-' + crypto.randomUUID(), selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.organizationId, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticLocalFixture: true, customerActivation: false } })) });
  await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_CLOSE_SETUP', nameEn: 'Synthetic Close setup and assessment only', permissions: ['accounting.setup.manage', 'accounting.close.read', 'accounting.close.run'], users: { connect: [{ id: x.actorId }, { id: x.checkerId }] } } });
  const certifier = await db.user.create({ data: { organizationId: x.organizationId, email: 'purchase-close-' + crypto.randomUUID() + '@example.invalid', name: 'Synthetic independent Close certifier', isActive: true, isVerified: true } });
  await db.role.create({ data: { organizationId: x.organizationId, code: 'administrator', nameEn: 'Synthetic scoped Cash observer and Close certifier', permissions: ['dashboard.read', 'accounting.close.read', 'accounting.close.certify', 'accounting.close.export'], users: { connect: { id: certifier.id } } } });
  x.certifierId = certifier.id; x.makerId = x.actorId;
  await settings.ensureAccountingSettings(x.organizationId, x.actorId);
  for (const [index, mapping] of settings.REQUIRED_ACCOUNTING_MAPPINGS.entries()) {
    if (await db.chartOfAccount.findFirst({ where: { organizationId: x.organizationId, mappingKey: mapping.key } })) continue;
    await accounts.createChartAccount(x.organizationId, { code: 'SYNTHETIC-' + mapping.syscohadaClass + '-' + index, nameEn: 'Synthetic ' + mapping.label, type: mapping.type, normalBalance: mapping.normalBalance, mappingKey: mapping.key, syscohadaClass: mapping.syscohadaClass, syscohadaReference: 'LOCAL TEST ONLY; not statutory approval' }, x.actorId);
  }
  const expense = await accounts.createChartAccount(x.organizationId, { code: 'SYNTHETIC-6-EXPENSE', nameEn: 'Synthetic local expense', type: 'EXPENSE', normalBalance: 'DEBIT', syscohadaClass: '6', syscohadaReference: 'LOCAL TEST ONLY' }, x.actorId);
  await journals.ensureDefaultJournals(x.organizationId, x.actorId);
  for (const postingPurpose of settings.REQUIRED_READY_POSTING_PURPOSES) {
    const sourceType = settings.REQUIRED_READY_POSTING_SOURCES[postingPurpose];
    if (await db.postingRule.findFirst({ where: { organizationId: x.organizationId, postingPurpose, sourceType, isActive: true } })) continue;
    let template = DEFAULT_POSTING_RULES.find(row => row.postingPurpose === postingPurpose && row.sourceType === sourceType);
    if (!template && ['EXPENSE_APPROVAL', 'CASH_DRAWER_CLOSE'].includes(postingPurpose)) template = { code: 'SYNTHETIC-' + postingPurpose, nameEn: 'Synthetic local ' + postingPurpose, sourceType, postingPurpose, lines: [
      { side: 'DEBIT', accountId: expense.id, amountSource: 'SOURCE_AMOUNT' }, { side: 'CREDIT', mappingKey: postingPurpose === 'EXPENSE_APPROVAL' ? 'ACCOUNTS_PAYABLE' : 'CASH_ON_HAND', amountSource: 'SOURCE_AMOUNT' },
    ] };
    assert.ok(template, 'Missing genuine setup recipe for ' + postingPurpose);
    await rules.createPostingRule(x.organizationId, template, x.actorId);
  }
  const issues = await settings.collectAccountingSetupReadinessIssues(x.organizationId);
  if (issues.length) { const error = Error('Actual accounting setup remains incomplete'); error.prerequisite = { issues }; throw error; }
  const at = new Date(); await settings.markAccountingSetupReady(x.organizationId, x.checkerId, { actorPermissions: ['accounting.setup.manage'], lastAuthAt: at, now: at });
}
async function fixture(label, withCredit = true) {
  await guard(); const x = await h.fixture('pc-' + label, { currency: 'XAF' });
  assert.ok(organizations.includes(x.organizationId)); await completeSetup(x); await fractional.creditRule(x);
  const { receipt } = await h.receive(x, 10), prepared = await h.prepare(x, receipt, 10); await h.approve(x, prepared.invoiceId);
  const invoice = await db.supplierInvoice.findUniqueOrThrow({ where: { id: prepared.invoiceId }, include: { lines: true } });
  const returned = await h.returnGoods(x, receipt, 3);
  assert.ok(returned.purchaseReturn.journalEntryId);
  const credit = withCredit ? await correction.postSupplierCreditNote(fractional.creditCommand(x, invoice, { result: returned }, label), db) : null;
  if (credit) assert.ok(credit.supplierCreditNote.journalEntryId);
  const now = new Date(), period = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, startDate: { lte: now }, endDate: { gte: now } } });
  return { ...x, periodId: period.id, receiptId: receipt.id, invoiceId: invoice.id, returned: returned.purchaseReturn, credit: credit?.supplierCreditNote ?? null };
}
async function assessment(x, label, requireReady = true) {
  const result = await close.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'owned-purchase-close-' + label + '-' + crypto.randomUUID() }, { actorId: x.makerId, actorPermissions: ['accounting.close.run'], now: new Date() });
  const run = await db.closeRun.findUniqueOrThrow({ where: { id: result.run.id } });
  if (requireReady) {
    const portal = await getAccountantPortalData({ organizationId: x.organizationId, periodId: x.periodId }, db, new Date());
    if (run.status !== 'READY' || run.metadata?.trustLevel !== 'T4' || portal.certificate.level !== 'T4') {
      const error = Error('Actual purchase assessment did not reach READY/T4; no positive certification proof established');
      error.prerequisite = { runId: run.id, status: run.status, trustLevel: run.metadata?.trustLevel, portalTrust: portal.certificate.level, blockers: portal.blockers.map(row => ({ gate: row.gate, severity: row.severity })), critical: run.criticalBlockerCount, high: run.highBlockerCount };
      throw error;
    }
  }
  return { ...x, closeRunId: run.id, observedStatus: run.status };
}
async function certify(x, label) {
  const at = new Date(), result = await pack.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'CERTIFIED', correlationId: 'owned-purchase-export-' + crypto.randomUUID() }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: at, now: at });
  assert.equal(result.isCertified, true);
  const file = path.join(__dirname, 'purchase-close-pack-' + label + '-' + crypto.randomUUID() + '.json'); fs.writeFileSync(file, result.content, { flag: 'wx' });
  const retained = await db.closePackExport.findUniqueOrThrow({ where: { id: result.exportId } }); assert.equal(retained.contentHash, result.contentHash);
  return { row: retained, file, bytesHash: sha(fs.readFileSync(file)), contentHash: result.contentHash, exportId: result.exportId };
}
async function retained(x) {
  const where = { organizationId: x.organizationId, closeRunId: x.closeRunId }, result = {};
  for (const name of ['closeEvidenceItem', 'closeChecklistItem', 'closeAssuranceFinding', 'closePackExport']) result[name] = await db[name].findMany({ where, orderBy: { id: 'asc' } });
  return result;
}
async function unchangedHistory(x, prior, artifact, stale) {
  const current = await retained(x);
  for (const name of ['closeEvidenceItem', 'closeChecklistItem', 'closeAssuranceFinding']) assert.deepEqual(current[name], prior[name], name);
  assert.equal(current.closePackExport.length, prior.closePackExport.length);
  const immutable = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['metadata', 'updatedAt'].includes(key)));
  for (const row of current.closePackExport) {
    const old = prior.closePackExport.find(value => value.id === row.id); assert.ok(old); assert.deepEqual(immutable(row), immutable(old));
    const withoutStale = metadata => Object.fromEntries(Object.entries(metadata ?? {}).filter(([key]) => key !== 'staleState'));
    assert.deepEqual(withoutStale(row.metadata), withoutStale(old.metadata));
  }
  const row = current.closePackExport.find(value => value.id === artifact.exportId); assert.ok(row); assert.equal(row.contentHash, artifact.contentHash); assert.equal(sha(fs.readFileSync(artifact.file)), artifact.bytesHash);
  if (stale) assert.equal(row.metadata?.staleState?.status, 'EVIDENCE_STALE');
  return { exportId: row.id, contentHash: row.contentHash, bytesHash: artifact.bytesHash, immutableHistoryHash: f.hash(prior), stale: row.metadata?.staleState?.status === 'EVIDENCE_STALE' };
}
async function observe(x, grade) {
  const before = f.hash(await rows(x, economicModels)), period = await db.accountingPeriod.findUniqueOrThrow({ where: { id: x.periodId } });
  const input = { organizationId: x.organizationId, periodStart: period.startDate, periodEnd: period.endDate, now: new Date() };
  const snapshot = await getCloseReadinessSnapshot(input), cash = await getCashCommandData({ ...input, actorId: x.certifierId, actorPermissions: ['dashboard.read', 'accounting.close.read'], actorRoleCodes: ['administrator'] });
  const dashboard = await close.getCloseAssuranceDashboard(x.organizationId, x.periodId, x.closeRunId), current = await close.getCloseAssuranceDashboard(x.organizationId, x.periodId), proof = await getProofTrail({ organizationId: x.organizationId, subjectType: 'close.run', subjectId: x.closeRunId }, db);
  const trust = cash.trustSignals.find(row => row.id === 'close_readiness'); assert.ok(trust);
  assert.equal(current.run.id, x.closeRunId); assert.equal(cash.proofSubjects.find(row => row.available && row.subjectType === 'close.run')?.subjectId, x.closeRunId);
  assert.equal(snapshot.evidenceGrade, grade); assert.equal(trust.evidenceGrade, grade); assert.equal(dashboard.currentProof.grade, grade); assert.equal(proof.evidenceGrade, grade);
  assert.equal(f.hash(await rows(x, economicModels)), before, 'Cash/Close reads preserve all financial/source rows');
  return { grade, runId: x.closeRunId, trust: { grade: trust.evidenceGrade, tone: trust.tone }, blockers: snapshot.blockers.map(row => ({ id: row.id, severity: row.severity })), metrics: snapshot.metrics, financialUnchanged: true };
}
const returnCommand = x => ({ organizationId: x.organizationId, purchaseReturnId: x.returned.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), reason: 'Owned purchase Close recovery correction', occurredAt: new Date() });
const creditCommand = x => ({ organizationId: x.organizationId, supplierCreditNoteId: x.credit.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), reason: 'Owned purchase Close recovery credit correction', creditNoteNumber: 'OWNED-CLOSE-REV-' + crypto.randomUUID(), creditDate: new Date(), documentHash: sha(crypto.randomUUID()) });
async function payable(x) { const invoice = await db.supplierInvoice.findUniqueOrThrow({ where: { id: x.invoiceId } }); return (await readSupplierPaymentBalances(db, x.organizationId, [invoice], x.currency)).get(invoice.id).toString(); }
function conserve(before, after, targets, type) {
  const ignore = (row, keys) => Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
  for (const name of economicModels) for (const old of before[name]) {
    const row = after[name].find(value => value.id === old.id); assert.ok(row, 'Retained ' + name + ' row missing');
    let allowed = [];
    if (name === 'journalEntry' && targets.journalId === old.id) allowed = ['status', 'reversedAt', 'reversedById', 'updatedAt'];
    if (name === 'ledgerPostingBatch' && targets.batchId === old.id) allowed = ['status', 'reversedAt', 'updatedAt'];
    if (type === 'credit' && name === 'supplier') allowed = ['currentBalance', 'updatedAt'];
    if (type === 'credit' && name === 'supplierInvoice') allowed = ['status', 'updatedAt'];
    if (type === 'return' && name === 'inventoryLevel') allowed = ['quantityOnHand', 'quantityAvailable', 'totalValue', 'averageCost', 'version', 'lastTransactionAt', 'updatedAt'];
    assert.deepEqual(ignore(row, allowed), ignore(old, allowed), 'Unexpected retained ' + name + ' change');
  }
}
async function reversalProof(x, before, source, result, type, payableBefore) {
  const after = await rows(x, economicModels), reversed = type === 'credit' ? result.supplierCreditNote : result.purchaseReturn;
  assert.equal(result.replayed, false); assert.ok(reversed.journalEntryId);
  const original = await db.journalEntry.findUniqueOrThrow({ where: { id: source.journalEntryId }, include: { lines: { orderBy: { lineNumber: 'asc' } } } });
  const mirror = await db.journalEntry.findUniqueOrThrow({ where: { id: reversed.journalEntryId }, include: { lines: { orderBy: { lineNumber: 'asc' } } } });
  assert.equal(original.status, 'REVERSED'); assert.equal(mirror.reversalOfEntryId, original.id); assert.equal(mirror.postedById, x.actorId); assert.equal(mirror.status, 'POSTED'); assert.equal(mirror.lines.length, original.lines.length);
  original.lines.forEach((line, index) => { const target = mirror.lines[index]; for (const key of ['accountId', 'currency', 'exchangeRate', 'locationId', 'customerId', 'supplierId', 'itemId', 'dimensions']) assert.deepEqual(target[key], line[key], key); assert.equal(target.debit.toString(), line.credit.toString()); assert.equal(target.credit.toString(), line.debit.toString()); assert.equal(target.baseDebit.toString(), (line.baseCredit ?? line.credit).toString()); assert.equal(target.baseCredit.toString(), (line.baseDebit ?? line.debit).toString()); });
  for (const name of ['journalEntry', 'ledgerPostingBatch', 'accountingSourceLink']) assert.equal(after[name].length - before[name].length, 1, name);
  conserve(before, after, { journalId: original.id, batchId: source.ledgerPostingBatchId }, type);
  const beforeSupplier = before.supplier.find(row => row.id === x.supplierId), afterSupplier = after.supplier.find(row => row.id === x.supplierId);
  assert.equal(afterSupplier.currentBalance.toString(), type === 'credit' ? beforeSupplier.currentBalance.plus(source.total).toString() : beforeSupplier.currentBalance.toString());
  assert.equal(await payable(x), type === 'credit' ? new Prisma.Decimal(payableBefore).plus(source.total).toString() : payableBefore);
  const additions = after.supplierLedgerEntry.filter(row => !before.supplierLedgerEntry.some(old => old.id === row.id)); assert.equal(additions.length, type === 'credit' ? 1 : 0);
  if (type === 'credit') { assert.equal(additions[0].debit.toString(), source.total.toString()); assert.equal(additions[0].credit.toString(), '0'); assert.equal(additions[0].balanceAfter.toString(), afterSupplier.currentBalance.toString()); assert.deepEqual(after.inventoryLevel, before.inventoryLevel); assert.deepEqual(after.inventoryTransaction, before.inventoryTransaction); }
  else {
    const movements = before.inventoryTransaction.filter(row => source.lines.some(line => line.inventoryTransactionId === row.id)); assert.equal(movements.length, source.lines.length);
    const newMoves = after.inventoryTransaction.filter(row => !before.inventoryTransaction.some(old => old.id === row.id)); assert.equal(newMoves.length, movements.length);
    for (const level of before.inventoryLevel) {
      const oldMoves = movements.filter(row => row.itemId === level.itemId && row.locationId === level.locationId), current = after.inventoryLevel.find(row => row.id === level.id);
      const quantity = oldMoves.reduce((sum, row) => sum.plus(row.quantity.abs()), new Prisma.Decimal(0)), value = oldMoves.reduce((sum, row) => sum.plus(row.totalCost.abs()), new Prisma.Decimal(0));
      assert.equal(current.quantityOnHand.toString(), level.quantityOnHand.plus(quantity).toString()); assert.equal(current.quantityAvailable.toString(), level.quantityAvailable.plus(quantity).toString()); assert.equal(current.totalValue.toString(), level.totalValue.plus(value).toString());
      assert.equal(current.averageCost.toString(), current.quantityOnHand.gt(0) ? current.totalValue.div(current.quantityOnHand).toDecimalPlaces(2).toString() : level.averageCost.toString()); assert.equal(current.version, level.version + oldMoves.length);
    }
  }
  return { reversalSourceId: reversed.id, journalId: mirror.id, exactMirror: true, originalRowsConserved: true, payableBefore, payableAfter: await payable(x), sourceEffectsHash: f.hash(after) };
}
const files = [...new Set([__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])].sort();
const sources = () => ({ ...fractional.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
module.exports = { h, f, db, root, helper, organizations, Prisma, correction, close, pack, sha, sources, guard, safeError, outside, rows, economicModels, fixture, assessment, certify, retained, unchangedHistory, observe, returnCommand, creditCommand, payable, reversalProof, reconcileInventoryClass3 };
