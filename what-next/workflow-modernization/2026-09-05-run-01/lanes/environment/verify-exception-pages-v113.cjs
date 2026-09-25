const f = require('./exception-closure-fixtures.cjs'), sourceFixtures = require('./exception-link-repair-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const service = require(path.join(f.root, 'services/reconciliation/payment-exception-closure.service.ts'));
const organizations = [], run = crypto.randomUUID().slice(0, 12);
const files = ['services/reconciliation/payment-exception-closure.service.ts', 'services/reconciliation/payment-exception-closure.contracts.ts', 'services/reconciliation/payment-exception-closure-evidence.service.ts'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const report = { at: new Date().toISOString(), sourcesBefore: sources(), checks: [], observationsMs: {} };
const snapshot = where => Promise.all(['paymentException', 'suspenseItem', 'reconciliationRun', 'paymentReconciliationInboxItem', 'ledgerAuditEvent'].map(model => db[model].findMany({ where, orderBy: { id: 'asc' } }))).then(f.hash);
async function collect(load) { let cursor = null; const items = [], totals = []; do { const page = await load(cursor); assert.ok(page.items.length <= 20); items.push(...page.items); totals.push(page.total); cursor = page.nextCursor; assert.ok(totals.length < 10); } while (cursor); assert.equal(new Set(items.map(i => i.id)).size, items.length); return { items, totals }; }
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await snapshot({});
  const many = await sourceFixtures.fixture('pages-' + run, organizations, 25), x = await f.fixture('history-pages-' + run, organizations);
  const start = Date.now(), cases = await collect(cursor => service.listExceptionClosureCases({ cursor }, f.context(many))); report.observationsMs.cases = Date.now() - start;
  assert.equal(cases.items.length, 25); assert.deepEqual(cases.totals, [25, 25]); assert.ok(cases.items.every(i => i.closurePath === 'FINANCIAL_REVIEW')); assert.deepEqual(new Set(cases.items.map(i => i.id)), new Set(many.exceptions.map(i => i.id)));
  const foreignCursor = { id: cases.items[19].id, createdAt: cases.items[19].createdAt };
  const foreignPage = await service.listExceptionClosureCases({ cursor: foreignCursor, view: 'ALL' }, f.context(x)); assert.ok(foreignPage.items.every(i => i.id === x.exceptionId));
  await assert.rejects(() => service.readExceptionClosureHistory({ exceptionId: many.exceptions[0].id }, f.context(x)), e => e.code === 'NOT_FOUND');
  assert.equal((await service.listExceptionClosureCases({ suspenseItemId: many.exceptions[0].suspenseItem.id }, f.context(x))).total, 0);
  report.checks.push('Twenty-five genuine producer cases paginate as 20+5 with complete scoped totals, no duplicates and no foreign-object/cursor disclosure.');
  const proposalIds = [], commands = [];
  for (let i = 0; i < 23; i++) { const preview = await service.previewExceptionClosure({ exceptionId: x.exceptionId }, f.context(x)); const command = { exceptionId: x.exceptionId, expectedRevision: preview.revision, reason: 'Owned retained pagination proposal ' + i, idempotencyKey: crypto.randomUUID() }; const p = await service.proposeExceptionClosure(command, f.context(x)); proposalIds.push(p.proposalId); commands.push(command); }
  const historyStart = Date.now(), history = await collect(cursor => service.readExceptionClosureHistory({ exceptionId: x.exceptionId, cursor }, f.context(x))); report.observationsMs.history = Date.now() - historyStart;
  assert.equal(history.items.length, 23); assert.deepEqual(history.totals, [23, 23]); assert.deepEqual(new Set(history.items.map(i => i.id)), new Set(proposalIds)); assert.ok(history.items.every(i => i.requiresCurrentReview)); assert.ok(!JSON.stringify(history).includes('beforeException'));
  const oldest = proposalIds[0], command = commands[0];
  const approved = await service.decideExceptionClosure({ exceptionId: x.exceptionId, proposalId: oldest, expectedRevision: command.expectedRevision, decision: 'APPROVE', reason: 'Owned independent approval from a later history page' }, f.context(x, x.checkerId));
  const closed = await collect(cursor => service.readExceptionClosureHistory({ exceptionId: x.exceptionId, cursor }, f.context(x))); assert.equal(closed.items.length, 24); assert.ok(closed.items.every(i => !i.requiresCurrentReview)); assert.equal(closed.items.find(i => i.id === oldest).decisionId, approved.receiptId);
  assert.equal((await service.listExceptionClosureCases({}, f.context(x))).total, 0); assert.equal((await service.listExceptionClosureCases({ view: 'ALL' }, f.context(x))).total, 1);
  report.checks.push('Twenty-three real service proposals paginate with verified audits; approving a proposal on the later page preserves all 24 records and complete open/all counts.');
  const ownBefore = await snapshot({ organizationId: { in: organizations } }), originalTransaction = db.$transaction.bind(db);
  db.$transaction = (work, options) => originalTransaction(tx => work(new Proxy(tx, { get(target, property) { if (property === 'paymentException') return new Proxy(target.paymentException, { get(model, method) { if (method === 'count') return () => { throw new Error('OWNED_CASE_COUNT_UNAVAILABLE'); }; return model[method]; } }); return target[property]; } })), options);
  try { await assert.rejects(() => service.listExceptionClosureCases({}, f.context(many)), /OWNED_CASE_COUNT_UNAVAILABLE/); } finally { db.$transaction = originalTransaction; }
  assert.equal(ownBefore, await snapshot({ organizationId: { in: organizations } }));
  report.checks.push('A failed authoritative count propagates as failure with no writes; it cannot appear as a successful empty case view.');
})().catch(error => { report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 5); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await snapshot({ organizationId: { notIn: organizations } }); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); await db.$disconnect();
  const file = 'exception-pages-v113-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ file, checks: report.checks, error: report.error, stack: report.stack, originalUnchanged: report.originalUnchanged, sourceStable: report.sourceStable, observationsMs: report.observationsMs })); process.exit(!report.error && report.sourceStable && report.originalUnchanged && report.checks.length === 3 ? 0 : 1);
});
