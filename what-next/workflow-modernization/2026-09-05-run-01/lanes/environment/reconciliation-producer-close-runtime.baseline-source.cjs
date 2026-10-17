'use strict';
if (!['--baseline', '--acceptance'].includes(process.argv[2])) { console.log('Inert; requires explicit owned-database verification mode.'); process.exit(0); }
const h = require('./sign-close-fixtures.cjs'), { p, f, db, root } = h, { fs, path, crypto, assert } = f;
const { AsyncLocalStorage } = require('node:async_hooks'), context = new AsyncLocalStorage();
const dbModule = require(path.join(root, 'prisma/db.ts')), originalDb = dbModule.db;
const additional = require(path.join(root, 'services/reconciliation/reconciliation-additional-sources.service.ts'));
const preparation = require(path.join(root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const { captureProviderEvent } = require(path.join(root, 'services/payments/provider-event.service.ts'));
const { MobileMoneyHmacAdapter } = require(path.join(root, 'services/payments/adapters/mobile-money-hmac.adapter.ts'));
const acceptance = process.argv[2] === '--acceptance', report = { at: new Date().toISOString(), acceptance, checks: [] };
const sources = () => ({ ...h.sources(), ...Object.fromEntries(Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file)).map(file => [path.relative(root, file).replaceAll('\\', '/'), p.sha(fs.readFileSync(file))])) });
function control(x) { const now = new Date(); return { organizationId: x.organizationId, actorId: x.actorId, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.run', 'accounting.journal.read'], now, lastAuthAt: now }; }
function latch() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: () => resolve() }; }
async function bounded(promise) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Owned publication barrier timed out')), 30000); })]); } finally { clearTimeout(timer); } }
async function add(x) {
  const run = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.reconciliationRunId } }), provider = await db.providerAccount.findUniqueOrThrow({ where: { id: run.providerAccountId } });
  const adapter = new MobileMoneyHmacAdapter(provider.providerCode), now = new Date(), reference = crypto.randomUUID();
  await db.paymentTransaction.create({ data: { organizationId: x.organizationId, providerAccountId: provider.id, amount: '25.00', currencyCode: 'XAF', direction: 'INBOUND', state: 'CONFIRMED', occurredAt: now, confirmedAt: now, providerTransactionId: reference, providerReference: reference, sourceType: 'SYNTHETIC_WORKFLOW_VERIFICATION' } });
  const rawBody = JSON.stringify({ eventId: 'extra-' + reference, transactionId: reference, reference, eventType: 'PAYMENT_CONFIRMED', direction: 'INBOUND', amount: '25.00', currency: 'XAF', occurredAt: now.toISOString() });
  const secret = crypto.randomBytes(32).toString('hex'), timestamp = String(now.getTime()), signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest('hex');
  await captureProviderEvent({ organizationId: x.organizationId, providerAccountId: provider.id, adapter, rawBody, headers: { 'x-provider-timestamp': timestamp, 'x-provider-signature': signature }, secret, now, receivedAt: now });
}
async function publication(x, name, mutate) {
  const entered = latch(), release = latch(); let publicationId, pending;
  dbModule.db = new Proxy(db, { get(target, key) {
    if (key !== '$transaction') return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
    return (work, options) => context.getStore() !== 'close' ? target.$transaction(work, options) : target.$transaction(tx => work(new Proxy(tx, { get(inner, key) {
      if (key === 'closeRun') return new Proxy(inner.closeRun, { get(model, method) {
        if (method === 'create') return async args => { const row = await model.create(args); if (args.data.status === 'RUNNING') publicationId = row.id; return row; };
        if (method === 'updateMany') return async args => { if (args.where.id === publicationId && args.where.status === 'RUNNING') { entered.resolve(); await bounded(release.promise); } return model.updateMany(args); };
        return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
      } });
      return typeof inner[key] === 'function' ? inner[key].bind(inner) : inner[key];
    } })), { ...options, timeout: 45000 });
  } });
  try {
    pending = context.run('close', () => p.assessment(x, name, false)).then(value => ({ value }), error => ({ error: p.safeError(error) }));
    await bounded(entered.promise);
    const result = await mutate();
    const row = await db.closeRun.findUniqueOrThrow({ where: { id: publicationId } });
    assert.equal(row.metadata?.staleState?.status, acceptance ? 'EVIDENCE_STALE' : undefined);
    assert.equal(row.status, acceptance ? 'BLOCKED' : 'RUNNING');
    release.resolve(); const final = await bounded(pending); assert.ok(final.value, JSON.stringify(final));
    const count = await db.closeEvidenceItem.count({ where: { closeRunId: publicationId } });
    if (acceptance) assert.equal(count, 0, 'Obsolete collectors must not publish rows'); else assert.ok(count > 0);
    return { closeRunId: publicationId, stale: acceptance, obsoleteEvidenceCount: count, result };
  } finally { release.resolve(); if (pending) await pending; dbModule.db = originalDb; }
}
async function check(name, work) { const row = { name }, start = Date.now(); report.checks.push(row); try { row.result = await work(); row.passed = true; } catch (error) { row.passed = false; row.error = p.safeError(error); } row.elapsedMs = Date.now() - start; console.log(JSON.stringify(row)); }
async function main() {
  await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await h.outside();
  let x, retained, artifact, certified;
  await check('creation-retained-certified-history', async () => {
    const runService = require(path.join(root, 'services/reconciliation/payment-reconciliation-run.service.ts')), originalRun = runService.runPaymentReconciliation;
    let base, creation;
    runService.runPaymentReconciliation = async input => { creation = await publication(base, 'creation', () => originalRun(input)); return creation.result; };
    try { x = await h.fixture('producer', async fixture => { base = fixture; certified = await p.assessment(fixture, 'before-producer'); artifact = await p.certify(certified, 'before-producer'); retained = await p.retained(certified); }); }
    finally { runService.runPaymentReconciliation = originalRun; }
    const row = await db.closeRun.findUniqueOrThrow({ where: { id: certified.closeRunId } });
    assert.equal(row.metadata?.staleState?.status, 'EVIDENCE_STALE', 'Earlier provider setup already invalidates this certificate');
    await p.unchangedHistory(certified, retained, artifact, true);
    return { organizationId: x.organizationId, runId: x.reconciliationRunId, closeRunId: certified.closeRunId, creation, certifiedBytesPreserved: true };
  });
  assert.ok(x, 'Actual reconciliation fixture unavailable');
  await add(x);
  const review = await additional.previewAdditionalReconciliationSources({ runId: x.reconciliationRunId }, control(x));
  const command = { runId: x.reconciliationRunId, expectedRevision: review.revision, reason: 'Review actual additional evidence before new independent signing', idempotencyKey: crypto.randomUUID() };
  await check('unsigned-refresh-in-flight-publication', () => publication(x, 'refresh', () => additional.incorporateAdditionalReconciliationSources(command, control(x))));
  const preview = await preparation.previewReconciliationPreparation({ runId: x.reconciliationRunId }, control(x)); assert.equal(preview.canPrepare, true);
  const prepare = { runId: x.reconciliationRunId, expectedRevision: preview.revision, reason: 'Prepare reviewed source evidence for independent signing', idempotencyKey: crypto.randomUUID() };
  await check('preparation-in-flight-publication', () => publication(x, 'prepare', () => preparation.prepareReconciliationRun(prepare, control(x))));
  await check('retained-exact-replays', async () => {
    const before = f.hash(await h.extraRows(x.organizationId));
    assert.equal((await additional.incorporateAdditionalReconciliationSources(command, control(x))).replayed, true);
    assert.equal((await preparation.prepareReconciliationRun(prepare, control(x))).replayed, true);
    assert.equal(f.hash(await h.extraRows(x.organizationId)), before);
    return { sourceEffectsRepeated: false };
  });
}
main().catch(error => { report.error = p.safeError(error); }).finally(async () => {
  dbModule.db = originalDb;
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await h.outside(); report.outsideUnchanged = f.hash(report.outsideBefore) === f.hash(report.outsideAfter); } catch (error) { report.finalizationError = p.safeError(error); }
  await db.$disconnect(); report.passed = !report.error && !report.finalizationError && report.checks.length === 4 && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged;
  const file = path.join(__dirname, 'reconciliation-producer-close-' + (acceptance ? 'acceptance-' : 'baseline-') + crypto.randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); process.exit(report.passed ? 0 : 1);
});
