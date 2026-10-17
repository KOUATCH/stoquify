'use strict';
if (!['--baseline', '--acceptance'].includes(process.argv[2])) { console.log('Inert; explicit owned database mode required.'); process.exit(0); }
const h = require('./sign-close-fixtures.cjs'), { p, f, db, root } = h, { fs, path, crypto, assert } = f;
const { AsyncLocalStorage } = require('node:async_hooks'), context = new AsyncLocalStorage();
const dbModule = require(path.join(root, 'prisma/db.ts')), originalDb = dbModule.db;
const resolution = require(path.join(root, 'services/reconciliation/payment-suspense-resolution.service.ts'));
const fixtures = require('./suspense-resolution-close-fixtures.cjs');
const periods = require(path.join(root, 'services/accounting/periods.service.ts'));
const acceptance = process.argv[2] === '--acceptance', report = { at: new Date().toISOString(), acceptance, checks: [] };
const sources = () => ({ ...h.sources(), ...Object.fromEntries(Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file)).map(file => [path.relative(root, file).replaceAll('\\\\', '/'), p.sha(fs.readFileSync(file))])) });
const control = fixtures.context;
function latch() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: () => resolve() }; }
async function bounded(promise) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Owned suspense publication barrier timed out')), 30000); })]); } finally { clearTimeout(timer); } }
const observe = promise => promise.then(value => ({ value }), error => ({ error: p.safeError(error) }));
async function publication(x, name, mutate, snapshotFirst = false) {
  const financialBefore = f.hash(await p.rows(x, p.economicModels));
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
    assert.equal(f.hash(await p.rows(x, p.economicModels)), financialBefore);
    return { closeRunId: publicationId, periodId: x.periodId, stale: acceptance, attempts, obsoleteEvidenceCount: count, financialUnchanged: true, result };
  } finally { release.resolve(); releaseSource.resolve(); await Promise.allSettled([pending, mutation].filter(Boolean)); dbModule.db = originalDb; }
}

async function publicationRace(x, first, command, actorId) {
  const state = { creator: { attempt: latch(), held: latch() }, producer: { attempt: latch(), held: latch() }, release: latch(), collected: latch(), finalize: latch() };
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
    const startProducer = () => observe(context.run('producer', () => resolution.decideSuspenseResolution(command, control(x, actorId))));
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
    const evidence = await db.closeEvidenceItem.findFirst({ where: { closeRunId: row.id, evidenceType: 'SUSPENSE_ITEM', sourceTable: 'suspense_items', sourceId: x.itemId } });
    if (first === 'creator') { assert.equal(row.metadata?.staleState?.sourceCode, 'PAYMENT_SUSPENSE_POSTING'); assert.equal(evidence, null); }
    else { assert.equal(row.metadata?.staleState, undefined); assert.equal(evidence, null); }
    return { blocking, order: first + '-first', closeRunId: row.id, stale: row.metadata?.staleState?.status ?? null, sourceLabel: evidence?.sourceLabel ?? null };
  } finally { state.release.resolve(); state.finalize.resolve(); await Promise.allSettled([producer, creator].filter(Boolean)); dbModule.db = originalDb; }
}

async function fixture(label) {
  const x = await fixtures.fixture('close-' + label + '-' + crypto.randomUUID(), h.organizations);
  await periods.createFiscalYearWithPeriods(x.organizationId, { name: 'Owned earlier suspense collector', startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31T23:59:59.999Z') }, x.actorId);
  const period = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, endDate: { lt: new Date('2026-01-01') } } });
  return { ...x, periodId: period.id, makerId: x.actorId, reconciliationRunId: x.runId };
}
const snapshot = async x => ({ core: await p.rows(x), source: await h.extraRows(x.organizationId), inbox: await db.paymentReconciliationInboxItem.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }) });
async function check(name, work) { const row = { name }, started = Date.now(); report.checks.push(row); try { row.result = await work(); row.passed = true; } catch(error) { row.error = p.safeError(error); row.passed = false; } row.elapsedMs = Date.now() - started; console.log(JSON.stringify(row)); }
async function main() {
  await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await h.outside();
  const x = await fixture('scope');
  await check('resolution-prior-period-inflight-publication', () => publication(x, 'suspense-resolution', () => resolution.decideSuspenseResolution(x.command, control(x, x.checkerId))));
  if (!acceptance) return;
  const protectedRows = async owned => ({ economic: await p.rows(owned, p.economicModels), source: await h.extraRows(owned.organizationId), inbox: await db.paymentReconciliationInboxItem.findMany({ where: { organizationId: owned.organizationId }, orderBy: { id: 'asc' } }) });
  await check('exact-replay-retained-allocation-and-conflicting-command', async () => {
    const before = await protectedRows(x), result = await resolution.decideSuspenseResolution(x.command, control(x, x.checkerId));
    assert.equal(result.replayed, true); assert.deepEqual(await protectedRows(x), before);
    await assert.rejects(resolution.decideSuspenseResolution({ ...x.command, decision: 'REJECT' }, control(x, x.checkerId)));
    assert.deepEqual(await protectedRows(x), before);
    const fresh = await p.assessment(x, 'after-resolution', false);
    const item = await db.closeEvidenceItem.findFirst({ where: { closeRunId: fresh.closeRunId, evidenceType: 'SUSPENSE_ITEM', sourceTable: 'suspense_items', sourceId: x.itemId } });
    assert.equal(item, null);
    return { exactReplay: true, retainedAllocationUnchanged: true, conflictingDecisionRefused: true, freshCloseOmitsResolvedSuspense: true };
  });
  await check('rejected-resolution-preserves-open-source', async () => {
    const owned = await fixture('reject'), before = await db.suspenseItem.findUniqueOrThrow({ where: { id: owned.itemId } }), financial = f.hash(await p.rows(owned, p.economicModels));
    const assessment = await p.assessment(owned, 'before-reject', false), closeBefore = await db.closeRun.findUniqueOrThrow({ where: { id: assessment.closeRunId } });
    const result = await resolution.decideSuspenseResolution({ ...owned.command, decision: 'REJECT' }, control(owned, owned.checkerId)); assert.equal(result.outcome, 'REJECTED');
    const after = await db.suspenseItem.findUniqueOrThrow({ where: { id: owned.itemId } }); assert.equal(after.status, before.status); assert.equal(after.resolvedAt, null);
    assert.deepEqual(await db.closeRun.findUniqueOrThrow({ where: { id: assessment.closeRunId } }), closeBefore);
    assert.equal(f.hash(await p.rows(owned, p.economicModels)), financial); return { openStateRetained: true, closeUnchanged: true, financialUnchanged: true };
  });
  await check('old-snapshot-new-publication-restarts', async () => {
    const owned = await fixture('snapshot'); return publication(owned, 'resolution-snapshot', () => resolution.decideSuspenseResolution(owned.command, control(owned, owned.checkerId)), true);
  });
  await check('creator-first-actual-postgresql-blocking', async () => { const owned = await fixture('creator'); return publicationRace(owned, 'creator', owned.command, owned.checkerId); });
  await check('producer-first-actual-postgresql-blocking', async () => { const owned = await fixture('producer'); return publicationRace(owned, 'producer', owned.command, owned.checkerId); });
  const owned = await fixture('recovery');
  await check('denied-actor-tenant-revision-and-expired-authentication', async () => {
    const before = await protectedRows(owned);
    for (const actor of [control(owned), { ...control(owned, owned.checkerId), organizationId: crypto.randomUUID() }, { ...control(owned, owned.checkerId), actorPermissions: [] }, { ...control(owned, owned.checkerId), lastAuthAt: new Date(0) }]) await assert.rejects(resolution.decideSuspenseResolution(owned.command, actor));
    await assert.rejects(resolution.decideSuspenseResolution({ ...owned.command, expectedRevision: 'sha256:' + '0'.repeat(64) }, control(owned, owned.checkerId)));
    assert.deepEqual(await protectedRows(owned), before); return { noFinancialAllocationOrSourceEffects: true, controlAuditRetained: true };
  });
  await check('late-resolution-close-rollback-and-new-transaction-retry', async () => {
    let observed;
    const result = await publication(owned, 'late-resolution-close', async () => {
      const before = await snapshot(owned), publicationDb = dbModule.db;
      dbModule.db = new Proxy(publicationDb, { get(target, key) {
        if (key !== '$transaction') return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
        return (work, options) => target.$transaction(async tx => { const value = await work(tx);
          const item = await tx.suspenseItem.findUniqueOrThrow({ where: { id: owned.itemId } }); assert.equal(item.status, 'RESOLVED');
          const stale = await tx.closeRun.findFirstOrThrow({ where: { organizationId: owned.organizationId, periodId: owned.periodId, metadata: { path: ['staleState', 'sourceCode'], equals: 'PAYMENT_SUSPENSE_POSTING' } } });
          const receipt = await tx.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { id: value.receiptId } });
          observed = { receiptId: receipt.id, closeRunId: stale.id, allocationId: item.metadata.resolutionReceiptId };
          throw Error('OWNED_LATE_SUSPENSE_RESOLUTION_FAILURE'); }, options);
      } });
      try { await assert.rejects(resolution.decideSuspenseResolution(owned.command, control(owned, owned.checkerId)), /OWNED_LATE_SUSPENSE_RESOLUTION_FAILURE/); assert.ok(observed); } finally { dbModule.db = publicationDb; }
      assert.deepEqual(await snapshot(owned), before);
      return resolution.decideSuspenseResolution(owned.command, control(owned, owned.checkerId));
    });
    const retained = await protectedRows(owned); assert.equal((await resolution.decideSuspenseResolution(owned.command, control(owned, owned.checkerId))).replayed, true); assert.deepEqual(await protectedRows(owned), retained);
    return { ...result, observed, sourceAndCloseRolledBack: true, newTransactionCommitted: true, exactReplayNoNewAllocation: true };
  });
  await check('simultaneous-identical-decision-single-allocation', async () => {
    const duplicate = await fixture('duplicate'), financial = f.hash(await p.rows(duplicate, p.economicModels)), requestControl = control(duplicate, duplicate.checkerId);
    const results = await Promise.all([observe(resolution.decideSuspenseResolution(duplicate.command, requestControl)), observe(resolution.decideSuspenseResolution(duplicate.command, requestControl))]);
    assert.ok(results.some(result => result.value && !result.value.replayed), JSON.stringify(results));
    for (const result of results) if (result.error) assert.equal(result.error.code, 'CONFLICT');
    const replay = await resolution.decideSuspenseResolution(duplicate.command, control(duplicate, duplicate.checkerId)); assert.equal(replay.replayed, true);
    const receipts = await db.paymentReconciliationInboxItem.findMany({ where: { organizationId: duplicate.organizationId, idempotencyKey: 'suspense-resolution-decision:' + duplicate.command.proposalId } }); assert.equal(receipts.length, 1);
    assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: duplicate.organizationId, idempotencyKey: 'suspense-resolution-clearing:' + duplicate.clearingId } }), 1);
    assert.equal(f.hash(await p.rows(duplicate, p.economicModels)), financial);
    return { results, oneDecision: true, oneAllocation: true, financialUnchanged: true };
  });
}
main().catch(error => { report.error = p.safeError(error); }).finally(async () => {
  dbModule.db = originalDb;
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await h.outside(); report.outsideUnchanged = f.hash(report.outsideBefore) === f.hash(report.outsideAfter); } catch(error) { report.finalizationError = p.safeError(error); }
  await db.$disconnect(); report.passed = !report.error && !report.finalizationError && report.checks.length === (acceptance ? 9 : 1) && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged;
  const file = path.join(__dirname, 'suspense-resolution-close-' + (acceptance ? 'acceptance-' : 'baseline-') + crypto.randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); process.exit(report.passed ? 0 : 1);
});

