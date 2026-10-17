// Inert by default. The coordinator alone releases the exact owned DB lane.
if (require.main === module && process.argv[2] !== '--run') console.log('Prepared only; --run requires coordinator release after review.');
else {
  const p = require('./purchase-close-recovery-fixtures.cjs');
  const { f, db, root, helper, organizations, Prisma, correction, close, sha } = p, { fs, path, crypto, assert } = f;
  const { PrismaClient } = require('@prisma/client'), { AsyncLocalStorage } = require('node:async_hooks');
  const dbModule = require(path.join(root, 'prisma/db.ts')), originalDb = dbModule.db;
  const run = crypto.randomUUID();
  const report = { run, at: new Date().toISOString(), checks: [], scope: 'Exact owned localhost registration DB; genuine receipt/invoice/return/credit services, actual Close assessment/certification and Cash read models. No migrated schema, seed, external delivery, live customer approval or simulated positive source state.', limitations: [
    'Synthetic fixture sessions, accounting rules and master data are not customer, professional or statutory approval. The inherited synthetic preapproved PO is setup only; receiving and independent invoice approval use actual services.',
    'Current-period purchase recovery and two no-prior-run publication orderings only. No all-period helper edit or claim that earlier-period global forecast dependencies are resolved.',
    'Internal source-service actors and isolated database races do not prove authenticated purchase browser transport or delivery-worker recovery.',
    'Genuine setup/readiness blockers are retained as failed prerequisites, never waived or relabelled for certification.',
  ] };
  const sources = () => ({ ...p.sources(), [path.relative(root, __filename).replaceAll('\\', '/')]: sha(fs.readFileSync(__filename)) });
  const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve }; };
  async function bounded(work, label, ms = 30000) { let timer; try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label + ' timed out')), ms); })]); } finally { clearTimeout(timer); } }
  async function identity(tx) { const rows = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database'); assert.equal(rows[0].database, helper.database); return rows[0].pid; }
  function queryParts(args) { const first = args[0]; return { sql: typeof first === 'string' ? first : first?.sql || first?.text || (Array.isArray(first) ? first.join('?') : first?.strings?.join('?')) || '', values: Array.isArray(first?.values) ? first.values : args.slice(1) }; }
  function orderKey(args, x) { return queryParts(args).values.some(value => typeof value === 'string' && value === JSON.stringify(['close-assessment-order', x.organizationId, x.periodId])); }
  async function blocking(waiterPid, holderPid) {
    assert.notEqual(waiterPid, holderPid);
    return helper.withClient(f.target, async client => {
      await helper.assertOwned(client); const until = Date.now() + 5000;
      do { const result = await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiterPid]); if (result.rows[0].blockers.includes(holderPid)) return { waiterPid, holderPid, blockers: result.rows[0].blockers, observed: true }; await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < until);
      throw Error('Actual PostgreSQL publication/reversal conflict was not observed');
    });
  }
  async function stale(x) {
    const row = await db.closeRun.findUniqueOrThrow({ where: { id: x.closeRunId } }); assert.equal(row.organizationId, x.organizationId); assert.equal(row.status, 'BLOCKED'); assert.equal(row.metadata?.staleState?.status, 'EVIDENCE_STALE');
    const events = await db.businessEvent.findMany({ where: { organizationId: x.organizationId, eventType: 'close.certification.invalidated', sourceId: x.closeRunId }, orderBy: { id: 'asc' } }); assert.ok(events.length > 0);
    const outbox = await db.businessEventOutbox.findMany({ where: { organizationId: x.organizationId, businessEventId: { in: events.map(event => event.id) } }, orderBy: { id: 'asc' } });
    assert.equal(outbox.length, events.length); for (const row of outbox) { assert.equal(row.status, 'PENDING'); assert.equal(row.eventName, 'close.certification.invalidated'); }
    return { runId: row.id, status: row.status, sourceCode: row.metadata.staleState.sourceCode, sourceId: row.metadata.staleState.sourceId, eventIds: events.map(event => event.id), outboxIds: outbox.map(row => row.id) };
  }
  async function exactReplay(x, command, type) {
    const before = f.hash(await p.rows(x)); const result = await correction[type === 'credit' ? 'reverseSupplierCreditNote' : 'reversePurchaseReturn'](command, db); assert.equal(result.replayed, true); assert.equal(f.hash(await p.rows(x)), before);
    return { replayed: true, completeObservedStateUnchanged: true };
  }
  async function recoveryJourney(observations) {
    const x = await p.fixture('journey'); observations.organizationId = x.organizationId;
    let current = await p.assessment(x, 'before-corrections'), artifact = await p.certify(current, 'before-credit'), history = await p.retained(current);
    observations.before = await p.observe(current, 'certified'); const retained = [], stages = [];
    for (const type of ['credit', 'return']) {
      const source = type === 'credit' ? x.credit : x.returned, command = type === 'credit' ? p.creditCommand(x) : p.returnCommand(x);
      const before = await p.rows(x, p.economicModels), balance = await p.payable(x);
      const result = await correction[type === 'credit' ? 'reverseSupplierCreditNote' : 'reversePurchaseReturn'](command, db);
      const proof = await p.reversalProof(x, before, source, result, type, balance), invalidation = await stale(current);
      const historical = await p.unchangedHistory(current, history, artifact, true), blocked = await p.observe(current, 'blocked');
      retained.push({ x: current, history, artifact });
      const replay = await exactReplay(x, command, type); observations[type] = { proof, invalidation, historical, blocked, replay, recoveryPending: true };
      const economicAfterSource = f.hash(await p.rows(x, p.economicModels));
      current = await p.assessment(x, 'after-' + type); const operational = await p.observe(current, 'operational'); artifact = await p.certify(current, 'after-' + type); history = await p.retained(current);
      const completed = await p.observe(current, 'certified'); assert.equal(f.hash(await p.rows(x, p.economicModels)), economicAfterSource);
      for (const old of retained) await p.unchangedHistory(old.x, old.history, old.artifact, true);
      observations[type] = { ...observations[type], recoveryPending: false, recoveredRunId: current.closeRunId, recoveredExportId: artifact.exportId, operational, completed };
      stages.push(observations[type]);
    }
    const inventory = await p.reconcileInventoryClass3({ organizationId: x.organizationId, periodId: x.periodId, currency: x.currency }, db); assert.equal(inventory.status, 'PASSED');
    return { organizationId: x.organizationId, stages, inventory: { status: inventory.status, inventoryValue: inventory.inventoryValue, ledgerClass3Value: inventory.ledgerClass3Value }, retainedHistoryVerified: true };
  }
  async function publicationRace(first, observations) {
    const x = await p.fixture('race-' + first, false); observations.organizationId = x.organizationId;
    assert.equal(await db.closeRun.count({ where: { organizationId: x.organizationId, periodId: x.periodId } }), 0, 'The raced period genuinely starts without an assessment');
    const before = await p.rows(x, p.economicModels), balance = await p.payable(x), command = p.returnCommand(x);
    const writer = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 45000, maxWait: 10000 } }); await p.guard(writer);
    const context = new AsyncLocalStorage(), state = { events: [], release: deferred(), collectors: deferred(), published: deferred(), creator: { attempt: deferred(), held: deferred() }, reversal: { attempt: deferred(), held: deferred() } };
    const observeTx = (tx, lane) => new Proxy(tx, { get(target, key) {
      if (key === '$queryRaw') return async (...args) => {
        const targetOrder = orderKey(args, x); if (targetOrder) { state.events.push({ lane, event: 'period-attempt' }); state[lane].attempt.resolve(); }
        const value = await target.$queryRaw(...args); if (targetOrder) state.events.push({ lane, event: 'period-acquired' }); return value;
      };
      if (key === 'closeRun') return new Proxy(target.closeRun, { get(model, method) {
        if (method !== 'create' || lane !== 'creator') return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
        return async args => { const value = await model.create(args); if (args.data.organizationId === x.organizationId && args.data.periodId === x.periodId && args.data.status === 'RUNNING') {
          assert.ok(state.events.some(row => row.lane === lane && row.event === 'period-acquired')); state.created = value; state.events.push({ lane, event: 'actual-running-insert', id: value.id }); state.creator.held.resolve(); if (first === 'creator') await bounded(state.release.promise, 'creator publication hold');
        } return value; };
      } });
      const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
    } });
    dbModule.db = new Proxy(db, { get(target, key) {
      if (key !== '$transaction' || context.getStore() !== 'creator') { const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; }
      return async (work, options) => {
        let publication = false;
        const result = await writer.$transaction(async tx => { state.creator.pid = await identity(tx); const count = state.events.length; const value = await work(observeTx(tx, 'creator')); publication = state.events.slice(count).some(event => event.event === 'actual-running-insert'); if (publication) assert.equal(options?.isolationLevel, 'ReadCommitted'); return value; }, { ...options, timeout: 45000 });
        if (publication) { state.events.push({ lane: 'creator', event: 'running-committed' }); state.published.resolve(state.created); await bounded(state.collectors.promise, 'collectors held after genuine publication'); }
        return result;
      };
    } });
    const reversalClient = new Proxy(db, { get(target, key) {
      if (key === '$transaction') return (work, options) => { assert.equal(options?.isolationLevel, 'ReadCommitted'); return target.$transaction(async tx => { state.reversal.pid = await identity(tx); return work(observeTx(tx, 'reversal')); }, { ...options, timeout: 45000 }); };
      const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
    } });
    const startCreator = () => context.run('creator', () => p.assessment(x, 'race-' + first, false));
    const startReversal = () => correction.reversePurchaseReturn(command, reversalClient, { assertCurrentAuthority: async () => {
      assert.ok(state.events.some(row => row.lane === 'reversal' && row.event === 'period-acquired')); state.reversal.held.resolve(); if (first === 'reversal') await bounded(state.release.promise, 'prepared reversal hold');
    } });
    let creation, reversal;
    try {
      if (first === 'creator') creation = startCreator(); else reversal = startReversal(); (creation || reversal).catch(() => {});
      await bounded(state[first].held.promise, first + ' acquired genuine boundary');
      if (first === 'creator') reversal = startReversal(); else creation = startCreator(); (first === 'creator' ? reversal : creation).catch(() => {});
      const second = first === 'creator' ? 'reversal' : 'creator'; await bounded(state[second].attempt.promise, second + ' period attempt');
      const wait = await blocking(state[second].pid, state[first].pid); assert.equal(state.events.some(row => row.lane === second && row.event === 'period-acquired'), false); observations.blocking = wait;
      state.release.resolve(); const published = await bounded(state.published.promise, 'committed publication'), reversed = await bounded(reversal, 'reversal completion');
      const proof = await p.reversalProof(x, before, x.returned, reversed, 'return', balance); observations.sourceProof = proof;
      const visible = await db.closeRun.findUniqueOrThrow({ where: { id: published.id } });
      if (first === 'creator') { assert.equal(visible.status, 'BLOCKED'); await stale({ ...x, closeRunId: published.id }); } else assert.equal(visible.status, 'RUNNING');
      observations.beforeCollectors = { runId: visible.id, status: visible.status }; state.collectors.resolve(); const completed = await bounded(creation, 'actual assessment collectors'); assert.equal(completed.closeRunId, published.id);
      if (first === 'creator') { assert.equal(completed.observedStatus, 'BLOCKED'); await stale(completed); }
      else { assert.equal(completed.observedStatus, 'READY'); const actual = await db.closeRun.findUniqueOrThrow({ where: { id: published.id } }); assert.equal(actual.metadata.trustLevel, 'T4'); await p.observe(completed, 'operational'); }
      const replay = await exactReplay(x, command, 'return');
      return { organizationId: x.organizationId, order: first + '-first', noPriorAssessment: true, blocking: wait, events: state.events, publicationId: published.id, collectorResult: completed.observedStatus, proof, replay };
    } finally { state.release.resolve(); state.collectors.resolve(); await Promise.allSettled([creation, reversal].filter(Boolean)); dbModule.db = originalDb; await writer.$disconnect(); }
  }
  async function lateRollback(observations) {
    const x = await p.fixture('late', false), current = await p.assessment(x, 'before-late'), artifact = await p.certify(current, 'before-late'), history = await p.retained(current); observations.organizationId = x.organizationId;
    const command = p.returnCommand(x), before = await p.rows(x), economic = await p.rows(x, p.economicModels), balance = await p.payable(x); let faultObserved;
    const client = new Proxy(db, { get(target, key) {
      if (key !== '$transaction') { const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; }
      return (work, options) => target.$transaction(tx => work(new Proxy(tx, { get(inner, name) {
        if (name !== 'closeRun') { const value = inner[name]; return typeof value === 'function' ? value.bind(inner) : value; }
        return new Proxy(inner.closeRun, { get(model, method) {
          if (method !== 'update') return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
          return async args => {
            const value = await model.update(args);
            if (args.where.id === current.closeRunId && value.metadata?.staleState?.status === 'EVIDENCE_STALE') {
              const eventId = value.metadata.staleState.businessEventId, event = await tx.businessEvent.findUniqueOrThrow({ where: { id: eventId } }), outbox = await tx.businessEventOutbox.findMany({ where: { organizationId: x.organizationId, businessEventId: eventId } });
              assert.equal(event.eventType, 'close.certification.invalidated'); assert.equal(outbox.length, 1); assert.equal(outbox[0].eventName, 'close.certification.invalidated');
              const source = await tx.purchaseReturn.findFirstOrThrow({ where: { organizationId: x.organizationId, reversalOfPurchaseReturnId: x.returned.id } }); assert.ok(source.journalEntryId);
              assert.ok(await tx.inventoryTransaction.count({ where: { organizationId: x.organizationId, referenceId: source.id } }));
              faultObserved = { eventId, outboxId: outbox[0].id, sourceId: source.id, journalId: source.journalEntryId, runStatus: value.status }; observations.injectedAfterActualEffects = faultObserved;
              throw Error('OWNED_FAILURE_AFTER_ACTUAL_PURCHASE_CLOSE_INVALIDATION');
            }
            return value;
          };
        } });
      } })), options);
    } });
    await assert.rejects(correction.reversePurchaseReturn(command, client), /OWNED_FAILURE_AFTER_ACTUAL_PURCHASE_CLOSE_INVALIDATION/); assert.ok(faultObserved);
    assert.deepEqual(await p.rows(x), before, 'Entire actual source/financial/event/Close/export transaction must roll back'); await p.unchangedHistory(current, history, artifact, false); await p.observe(current, 'certified');
    const result = await correction.reversePurchaseReturn(command, db), proof = await p.reversalProof(x, economic, x.returned, result, 'return', balance); await stale(current); await p.unchangedHistory(current, history, artifact, true);
    const replay = await exactReplay(x, command, 'return'); const recovered = await p.assessment(x, 'after-late-retry'); await p.certify(recovered, 'after-late-retry'); const completed = await p.observe(recovered, 'certified');
    return { organizationId: x.organizationId, injectedAfterActualEffects: faultObserved, allObservedRowsRolledBack: true, independentRetry: proof, replay, recovered: completed };
  }
  async function check(name, work) {
    const entry = { name, status: 'running', observations: {} }, started = Date.now(); report.checks.push(entry);
    try { entry.result = await work(entry.observations); entry.status = 'passed'; } catch (error) { entry.status = 'failed'; entry.error = p.safeError(error); }
    entry.elapsedMs = Date.now() - started; console.log(JSON.stringify({ name, status: entry.status, elapsedMs: entry.elapsedMs, error: entry.error }));
  }
  async function main() {
    await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await p.outside();
    await check('Credit then return invalidate retained Close and recover genuine Cash certification', recoveryJourney);
    for (const first of ['creator', 'reversal']) await check('No-run period actual publication race: ' + first + ' first', observations => publicationRace(first, observations));
    await check('Late real invalidation rollback, independent retry and exact replay', lateRollback);
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = p.safeError(error); }
    finally {
      dbModule.db = originalDb;
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await p.outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; } catch (error) { report.finalizationError = p.safeError(error); }
      try { await db.$disconnect(); } catch (error) { report.disconnectError = p.safeError(error); }
      report.organizations = [...organizations]; report.passed = !report.error && !report.finalizationError && !report.disconnectError && report.checks.length === 4 && report.checks.every(row => row.status === 'passed') && report.sourceStable && report.outsideUnchanged;
      const file = path.join(__dirname, 'purchase-close-recovery-runtime-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.map(row => ({ name: row.name, status: row.status })), sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { sources, recoveryJourney, publicationRace, lateRollback };
  if (require.main === module) runMain()
    .then(() => process.exit(process.exitCode || 0))
    .catch(error => { console.error(p.safeError(error)); process.exit(1); });
}
