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
async function publication(x, name, mutate, snapshotFirst = false) {
  const entered = latch(), release = latch(), snapshot = latch(), releaseSource = latch(); let publicationId, pending, mutation, held = false, attempts = 0;
  dbModule.db = new Proxy(db, { get(target, key) {
    if (key !== '$transaction') return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
    return (work, options) => {
      if (context.getStore() !== 'close') {
        if (!snapshotFirst) return target.$transaction(work, options);
        attempts++;
        return target.$transaction(tx => work(new Proxy(tx, { get(inner, key) {
          if (key === 'accountingPeriod') return new Proxy(inner.accountingPeriod, { get(model, method) {
            if (method === 'findMany') return async args => { const result = await model.findMany(args); if (!held) { held = true; snapshot.resolve(); await bounded(releaseSource.promise); } return result; };
            return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
          } });
          return typeof inner[key] === 'function' ? inner[key].bind(inner) : inner[key];
        } })), { ...options, timeout: 45000 });
      }
      return target.$transaction(tx => work(new Proxy(tx, { get(inner, key) {
      if (key === 'closeRun') return new Proxy(inner.closeRun, { get(model, method) {
        if (method === 'create') return async args => { const row = await model.create(args); if (args.data.status === 'RUNNING') publicationId = row.id; return row; };
        if (method === 'updateMany') return async args => { if (args.where.id === publicationId && args.where.status === 'RUNNING') { entered.resolve(); await bounded(release.promise); } return model.updateMany(args); };
        return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
      } });
      return typeof inner[key] === 'function' ? inner[key].bind(inner) : inner[key];
    } })), { ...options, timeout: 45000 }); };
  } });
  try {
    if (snapshotFirst) { mutation = mutate().then(value => ({ value }), error => ({ error: p.safeError(error) })); await bounded(snapshot.promise); }
    pending = context.run('close', () => p.assessment(x, name, false)).then(value => ({ value }), error => ({ error: p.safeError(error) }));
    await bounded(entered.promise);
    releaseSource.resolve();
    const result = snapshotFirst ? await bounded(mutation) : await mutate();
    if (snapshotFirst) { assert.ok(result.value, JSON.stringify(result)); assert.equal(attempts, 2); }
    const row = await db.closeRun.findUniqueOrThrow({ where: { id: publicationId } });
    assert.equal(row.metadata?.staleState?.status, acceptance ? 'EVIDENCE_STALE' : undefined);
    assert.equal(row.status, acceptance ? 'BLOCKED' : 'RUNNING');
    release.resolve(); const final = await bounded(pending); assert.ok(final.value, JSON.stringify(final));
    const count = await db.closeEvidenceItem.count({ where: { closeRunId: publicationId } });
    if (acceptance) assert.equal(count, 0, 'Obsolete collectors must not publish rows'); else assert.ok(count > 0);
    return { closeRunId: publicationId, periodId: x.periodId, stale: acceptance, attempts, obsoleteEvidenceCount: count, result };
  } finally { release.resolve(); releaseSource.resolve(); await Promise.allSettled([pending, mutation].filter(Boolean)); dbModule.db = originalDb; }
}
const observe = promise => promise.then(value => ({ value }), error => ({ error: p.safeError(error) }));
async function prepareCommand(x) {
  const preview = await preparation.previewReconciliationPreparation({ runId: x.reconciliationRunId }, control(x)); assert.equal(preview.canPrepare, true);
  return { runId: x.reconciliationRunId, expectedRevision: preview.revision, reason: 'Review producer ordering against actual Close publication', idempotencyKey: crypto.randomUUID() };
}
async function publicationRace(x, first) {
  const command = await prepareCommand(x), state = { creator: { attempt: latch(), held: latch() }, producer: { attempt: latch(), held: latch() }, release: latch(), collected: latch(), finalize: latch() };
  let producer, creator, publicationId, held = false;
  dbModule.db = new Proxy(db, { get(target, key) {
    if (key !== '$transaction') return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
    return (work, options) => {
      const lane = context.getStore(); if (!['creator', 'producer'].includes(lane)) return target.$transaction(work, options);
      return target.$transaction(tx => work(new Proxy(tx, { get(inner, key) {
        if (key === '$queryRaw') return async (...args) => {
          const values = Array.isArray(args[0]?.values) ? args[0].values : args.slice(1), isOrder = values.includes(JSON.stringify(['close-assessment-order', x.organizationId, x.periodId]));
          if (isOrder) { state[lane].pid = (await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid'))[0].pid; state[lane].attempt.resolve(); }
          const result = await inner.$queryRaw(...args);
          if (isOrder && !held && lane === first) { held = true; state[lane].held.resolve(); await bounded(state.release.promise); }
          return result;
        };
        if (key === 'closeRun' && lane === 'creator') return new Proxy(inner.closeRun, { get(model, method) {
          if (method === 'create') return async args => { const value = await model.create(args); if (args.data.status === 'RUNNING') publicationId = value.id; return value; };
          if (method === 'updateMany') return async args => { if (args.where.id === publicationId && args.where.status === 'RUNNING') { state.collected.resolve(); await bounded(state.finalize.promise); } return model.updateMany(args); };
          return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
        } });
        return typeof inner[key] === 'function' ? inner[key].bind(inner) : inner[key];
      } })), { ...options, timeout: 45000 });
    };
  } });
  try {
    const startProducer = () => observe(context.run('producer', () => preparation.prepareReconciliationRun(command, control(x))));
    const startCreator = () => observe(context.run('creator', () => p.assessment(x, 'producer-race', false)));
    if (first === 'creator') { creator = startCreator(); await bounded(state.creator.held.promise); producer = startProducer(); await bounded(state.producer.attempt.promise); }
    else { producer = startProducer(); await bounded(state.producer.held.promise); creator = startCreator(); await bounded(state.creator.attempt.promise); }
    const waiter = state[first === 'creator' ? 'producer' : 'creator'].pid, holder = state[first].pid;
    const blocking = await f.helper.withClient(f.target, async client => {
      await f.helper.assertOwned(client); const until = Date.now() + 5000;
      do { const blockers = (await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiter])).rows[0].blockers; if (blockers.includes(holder)) return { waiter, holder, observed: true }; await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < until);
      throw Error('Expected PostgreSQL publication blocking not observed');
    });
    state.release.resolve(); const outcome = await bounded(producer); assert.ok(outcome.value, JSON.stringify(outcome));
    await bounded(state.collected.promise); state.finalize.resolve(); const assessment = await bounded(creator); assert.ok(assessment.value, JSON.stringify(assessment));
    const row = await db.closeRun.findUniqueOrThrow({ where: { id: publicationId } });
    const evidence = await db.closeEvidenceItem.findFirst({ where: { closeRunId: row.id, evidenceType: 'RECONCILIATION_CERTIFICATE', sourceTable: 'reconciliation_runs', sourceId: x.reconciliationRunId } });
    if (first === 'creator') { assert.equal(row.metadata?.staleState?.sourceCode, 'PAYMENT_RECONCILIATION_PREPARED'); assert.equal(evidence, null); }
    else { assert.equal(row.metadata?.staleState, undefined); assert.ok(evidence?.sourceLabel.includes('READY_FOR_SIGNOFF')); }
    return { blocking, order: first + '-first', closeRunId: row.id, stale: row.metadata?.staleState?.status ?? null, sourceLabel: evidence?.sourceLabel ?? null };
  } finally { state.release.resolve(); state.finalize.resolve(); await Promise.allSettled([producer, creator].filter(Boolean)); dbModule.db = originalDb; }
}
async function check(name, work) { const row = { name }, start = Date.now(); report.checks.push(row); try { row.result = await work(); row.passed = true; } catch (error) { row.passed = false; row.error = p.safeError(error); } row.elapsedMs = Date.now() - start; console.log(JSON.stringify(row)); }
async function main() {
  await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await h.outside();
  let x, retained, artifact, certified;
  await check('creation-retained-certified-history', async () => {
    const runService = require(path.join(root, 'services/reconciliation/payment-reconciliation-run.service.ts')), originalRun = runService.runPaymentReconciliation;
    let base, creation;
    runService.runPaymentReconciliation = async input => { creation = await publication(base, 'creation', () => originalRun(input)); return creation.result; };
    try { x = await h.fixture('producer', async fixture => {
      certified = await p.assessment(fixture, 'before-producer'); artifact = await p.certify(certified, 'before-producer'); retained = await p.retained(certified);
      if (acceptance) {
        await require(path.join(root, 'services/accounting/periods.service.ts')).createFiscalYearWithPeriods(fixture.organizationId, { name: 'Owned earlier reconciliation collector', startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31T23:59:59.999Z') }, fixture.actorId);
        fixture.periodId = (await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: fixture.organizationId, endDate: { lt: new Date('2026-01-01') } } })).id;
      }
      base = fixture;
    }); }
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
  if (acceptance) {
    await check('older-snapshot-restarts-for-new-publication', async () => {
      await add(x); const preview = await additional.previewAdditionalReconciliationSources({ runId: x.reconciliationRunId }, control(x));
      const input = { runId: x.reconciliationRunId, expectedRevision: preview.revision, reason: 'Review additional evidence after concurrent assessment publication', idempotencyKey: crypto.randomUUID() };
      return publication(x, 'old-snapshot', () => additional.incorporateAdditionalReconciliationSources(input, control(x)), true);
    });
    for (const first of ['creator', 'producer']) await check(first + '-first-postgresql-lock-order', () => publicationRace(x, first));
    await check('signed-refresh-late-rollback-retry-retained-signature', async () => {
      x.review = await h.certification.previewReconciliationSignOff({ organizationId: x.organizationId, runId: x.reconciliationRunId, actorId: x.certifierId, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.sign'] });
      assert.equal(x.review.canSign, true); const signed = await h.certification.signReconciliationRun(h.command(x));
      await add(x); const preview = await additional.previewAdditionalReconciliationSources({ runId: x.reconciliationRunId }, control(x)); assert.ok(preview.signedCertificate);
      const input = { runId: x.reconciliationRunId, expectedRevision: preview.revision, reason: 'Review later evidence while retaining the actual prior signature', idempotencyKey: crypto.randomUUID() };
      const snapshot = async () => ({ core: await p.rows(x), source: await h.extraRows(x.organizationId) }), before = await snapshot(); let observed;
      dbModule.db = new Proxy(db, { get(target, key) {
        if (key !== '$transaction') return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
        return (work, options) => target.$transaction(async tx => {
          const result = await work(tx);
          const run = await tx.reconciliationRun.findUniqueOrThrow({ where: { id: x.reconciliationRunId } }); assert.equal(run.status, 'NEEDS_REVIEW'); assert.equal(run.certificateHash, null);
          const stale = await tx.closeRun.findUniqueOrThrow({ where: { id: certified.closeRunId } }); assert.equal(stale.metadata?.staleState?.sourceCode, 'PAYMENT_RECONCILIATION_SOURCE_REPAIRED');
          const receipt = await tx.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { id: result.receiptId } }); assert.equal(receipt.payloadSummary.beforeRun.certificateHash, signed.certificateHash);
          observed = { receiptId: result.receiptId, retainedSignatureHash: signed.certificateHash }; throw Error('OWNED_LATE_PRODUCER_FAILURE');
        }, options);
      } });
      try { await assert.rejects(additional.incorporateAdditionalReconciliationSources(input, control(x)), /OWNED_LATE_PRODUCER_FAILURE/); assert.ok(observed); } finally { dbModule.db = originalDb; }
      assert.deepEqual(await snapshot(), before);
      const result = await additional.incorporateAdditionalReconciliationSources(input, control(x)); assert.equal(result.replayed, false);
      const after = f.hash(await snapshot()); assert.equal((await additional.incorporateAdditionalReconciliationSources(input, control(x))).replayed, true); assert.equal(f.hash(await snapshot()), after);
      await p.unchangedHistory(certified, retained, artifact, true);
      return { observed, allObservedEffectsRolledBack: true, retryCommitted: true, exactReplayUnchanged: true, certifiedBytesUnchanged: true };
    });
    await check('authority-revision-and-foreign-denials-without-effects', async () => {
      const input = await prepareCommand(x), before = f.hash({ core: await p.rows(x), source: await h.extraRows(x.organizationId) });
      for (const actor of [{ ...control(x), actorPermissions: [] }, { ...control(x), actorId: crypto.randomUUID() }, { ...control(x), organizationId: crypto.randomUUID() }, { ...control(x), lastAuthAt: new Date(0) }]) await assert.rejects(preparation.prepareReconciliationRun(input, actor));
      await assert.rejects(preparation.prepareReconciliationRun({ ...input, expectedRevision: 'sha256:' + '0'.repeat(64) }, control(x)), /reviewed evidence changed/);
      assert.equal(f.hash({ core: await p.rows(x), source: await h.extraRows(x.organizationId) }), before);
      return { deniedWithoutEffects: true };
    });
  }
}
main().catch(error => { report.error = p.safeError(error); }).finally(async () => {
  dbModule.db = originalDb;
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await h.outside(); report.outsideUnchanged = f.hash(report.outsideBefore) === f.hash(report.outsideAfter); } catch (error) { report.finalizationError = p.safeError(error); }
  await db.$disconnect(); report.passed = !report.error && !report.finalizationError && report.checks.length === (acceptance ? 9 : 4) && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged;
  const file = path.join(__dirname, 'reconciliation-producer-close-' + (acceptance ? 'acceptance-' : 'baseline-') + crypto.randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); process.exit(report.passed ? 0 : 1);
});
