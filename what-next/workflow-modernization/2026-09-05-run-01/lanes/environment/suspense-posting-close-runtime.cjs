'use strict';
if (!['--baseline', '--acceptance'].includes(process.argv[2])) { console.log('Inert; explicit owned database mode required.'); process.exit(0); }
const h = require('./sign-close-fixtures.cjs'), { p, f, db, root } = h, { fs, path, crypto, assert } = f;
const { AsyncLocalStorage } = require('node:async_hooks'), context = new AsyncLocalStorage();
const dbModule = require(path.join(root, 'prisma/db.ts')), originalDb = dbModule.db;
const resolution = require(path.join(root, 'services/reconciliation/payment-suspense-workflow.service.ts'));
const fixtures = require('./suspense-posting-close-fixtures.cjs');
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
    const item = await db.suspenseItem.findUniqueOrThrow({ where: { id: x.itemId } });
    assert.equal(item.status, 'POSTED_TO_SUSPENSE');
    assert.ok(item.ledgerPostingBatchId);
    const journal = await db.journalEntry.findFirstOrThrow({ where: { postingBatchId: item.ledgerPostingBatchId }, include: { lines: true } });
    assert.equal(journal.lines.reduce((sum, line) => sum.add(line.debit).sub(line.credit), new (require('@prisma/client').Prisma.Decimal)(0)).toFixed(2), '0.00');
    const staleItem = await db.closeEvidenceItem.findFirst({ where: { closeRunId: publicationId, sourceTable: 'suspense_items', sourceId: x.itemId } });
    if (!acceptance) assert.ok(staleItem?.sourceLabel.endsWith('RESOLUTION_PROPOSED'), JSON.stringify(staleItem));
    return { closeRunId: publicationId, periodId: x.periodId, stale: acceptance, attempts, obsoleteEvidenceCount: count, balancedPosting: true, result };
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
    const startProducer = () => observe(context.run('producer', () => resolution.approveSuspensePosting({ ...command, control: control(x, actorId) })));
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
    else { assert.equal(row.metadata?.staleState, undefined); assert.ok(evidence?.sourceLabel.endsWith('POSTED_TO_SUSPENSE'), JSON.stringify(evidence)); }
    return { blocking, order: first + '-first', closeRunId: row.id, stale: row.metadata?.staleState?.status ?? null, sourceLabel: evidence?.sourceLabel ?? null };
  } finally { state.release.resolve(); state.finalize.resolve(); await Promise.allSettled([producer, creator].filter(Boolean)); dbModule.db = originalDb; }
}
async function fixture(label) {
  const x = await fixtures.fixture('close-' + label + '-' + crypto.randomUUID().slice(0, 12), h.organizations);
  await periods.createFiscalYearWithPeriods(x.organizationId, { name: 'Owned earlier suspense collector', startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31T23:59:59.999Z') }, x.actorId);
  const period = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, endDate: { lt: new Date('2026-01-01') } } });
  return { ...x, periodId: period.id, makerId: x.actorId, reconciliationRunId: x.runId };
}
const snapshot = async x => ({ core: await p.rows(x), source: await h.extraRows(x.organizationId), inbox: await db.paymentReconciliationInboxItem.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }) });
async function check(name, work) { const row = { name }, started = Date.now(); report.checks.push(row); try { row.result = await work(); row.passed = true; } catch(error) { row.error = p.safeError(error); row.passed = false; } row.elapsedMs = Date.now() - started; console.log(JSON.stringify(row)); }
async function main() {
  await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await h.outside();
  const x = await fixture('scope');
  await check('posting-prior-period-inflight-publication', () => publication(x, 'suspense-posting', () => resolution.approveSuspensePosting({ ...x.command, control: control(x, x.checkerId) })));
  if (!acceptance) return;
  await check('snapshot-retry-refreshes-close-membership', async () => {
    const current = await fixture('snapshot');
    return publication(current, 'snapshot', () => resolution.approveSuspensePosting({ ...current.command, control: control(current, current.checkerId) }), true);
  });
  for (const first of ['creator', 'producer']) await check(first + '-first-posting-publication-locks', async () => {
    const current = await fixture(first); return publicationRace(current, first, current.command, current.checkerId);
  });
  await check('duplicate-and-closed-period-retained-replay', async () => {
    const current = await fixture('duplicate'), request = { ...current.command, control: control(current, current.checkerId) };
    const outcomes = await Promise.all([observe(resolution.approveSuspensePosting(request)), observe(resolution.approveSuspensePosting(request))]);
    assert.ok(outcomes.some(row => row.value && !row.value.replayed), JSON.stringify(outcomes));
    for (const row of outcomes) if (row.error) assert.equal(row.error.code, 'CONFLICT');
    const item = await db.suspenseItem.findUniqueOrThrow({ where: { id: current.itemId } });
    const journal = await db.journalEntry.findFirstOrThrow({ where: { postingBatchId: item.ledgerPostingBatchId } });
    assert.equal(await db.journalEntry.count({ where: { organizationId: current.organizationId, sourceId: item.id, sourceType: 'PAYMENT_SUSPENSE' } }), 1);
    // Owned synthetic closed-period precondition; this does not certify period closure.
    await db.accountingPeriod.update({ where: { id: journal.periodId }, data: { status: 'CLOSED' } });
    const before = f.hash(await snapshot(current));
    const replay = await resolution.approveSuspensePosting({ ...current.command, control: control(current, current.checkerId) });
    assert.equal(replay.replayed, true); assert.equal(f.hash(await snapshot(current)), before);
    return { outcomes, replayedAfterClosure: true, retainedRowsUnchanged: true, oneJournal: true };
  });
  await check('late-financial-close-rollback-and-fresh-retry', async () => {
    const current = await fixture('rollback');
    return publication(current, 'rollback', async () => {
      const beforeRows = await snapshot(current), before = f.hash(beforeRows), live = dbModule.db; let observed = false;
      dbModule.db = new Proxy(live, { get(target, key) {
        if (key !== '$transaction') return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
        return (work, options) => target.$transaction(tx => work(new Proxy(tx, { get(inner, key) {
          if (key === 'closeRun') return new Proxy(inner.closeRun, { get(model, method) {
            if (method === 'update') return async args => {
              const result = await model.update(args);
              if (args.data.metadata?.staleState?.sourceCode === 'PAYMENT_SUSPENSE_POSTING') {
                const item = await tx.suspenseItem.findUniqueOrThrow({ where: { id: current.itemId } });
                assert.equal(item.status, 'POSTED_TO_SUSPENSE'); assert.ok(item.ledgerPostingBatchId);
                assert.ok(await tx.businessEventOutbox.count({ where: { organizationId: current.organizationId } }) > beforeRows.core.businessEventOutbox.length);
                assert.equal(result.metadata.staleState.status, 'EVIDENCE_STALE'); observed = true; throw Error('Owned late posting rollback');
              } return result;
            };
            return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
          } });
          return typeof inner[key] === 'function' ? inner[key].bind(inner) : inner[key];
        } })), options);
      } });
      try { const failed = await observe(resolution.approveSuspensePosting({ ...current.command, control: control(current, current.checkerId) })); assert.ok(failed.error?.message.includes('Owned late posting rollback'), JSON.stringify(failed)); }
      finally { dbModule.db = live; }
      assert.equal(observed, true); assert.equal(f.hash(await snapshot(current)), before, 'Financial, receipt, source, event/outbox and Close writes must all roll back');
      return resolution.approveSuspensePosting({ ...current.command, control: control(current, current.checkerId) });
    });
  });
  await check('denied-and-stale-posting-has-no-financial-effects', async () => {
    const current = await fixture('denials'), financial = f.hash(await p.rows(current, p.economicModels));
    const cases = [
      { ...current.command, approvedById: current.actorId, control: control(current) },
      { ...current.command, control: { ...control(current, current.checkerId), actorPermissions: [] } },
      { ...current.command, control: { ...control(current, current.checkerId), lastAuthAt: new Date(0) } },
      { ...current.command, expectedEvidenceRevision: 'sha256:' + '0'.repeat(64), control: control(current, current.checkerId) },
      { ...current.command, organizationId: x.organizationId, control: control(x, x.checkerId) },
    ];
    const denied = [];
    for (const command of cases) { const outcome = await observe(resolution.approveSuspensePosting(command)); assert.ok(outcome.error, JSON.stringify(outcome)); denied.push(outcome.error); }
    assert.equal(f.hash(await p.rows(current, p.economicModels)), financial);
    assert.equal((await db.suspenseItem.findUniqueOrThrow({ where: { id: current.itemId } })).status, 'RESOLUTION_PROPOSED');
    return { denied, financialUnchanged: true };
  });
}
main().catch(error => { report.error = p.safeError(error); }).finally(async () => {
  dbModule.db = originalDb;
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await h.outside(); report.outsideUnchanged = f.hash(report.outsideBefore) === f.hash(report.outsideAfter); } catch(error) { report.finalizationError = p.safeError(error); }
  await db.$disconnect(); report.passed = !report.error && !report.finalizationError && report.checks.length === (acceptance ? 7 : 1) && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged;
  const file = path.join(__dirname, 'suspense-posting-close-' + (acceptance ? 'acceptance-' : 'baseline-') + crypto.randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); process.exit(report.passed ? 0 : 1);
});


