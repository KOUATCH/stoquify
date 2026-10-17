"use strict";
if (require.main === module && process.argv[2] !== '--run') { console.log('Inert; --run exercises newly owned local fixtures only.'); process.exit(0); }
const h = require('./sign-close-fixtures.cjs'), { p, f, db, root, certification } = h, { fs, path, crypto, assert } = f;
const { AsyncLocalStorage } = require('node:async_hooks'), context = new AsyncLocalStorage();
const dbModule = require(path.join(root, 'prisma/db.ts')), originalDb = dbModule.db;
const report = { at: new Date().toISOString(), checks: [], scope: 'Verify corrected signing/Close publication, all-period consumer scope, retained exports, replay and rollback on newly owned synthetic fixtures. No live provider, statutory, production or full-workflow certification.' };
const sources = () => ({ ...h.sources(), [path.relative(root, __filename).replaceAll('\\', '/')]: p.sha(fs.readFileSync(__filename)) });
function latch() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
async function bounded(promise, label) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label + ' timed out')), 30000); })]); } finally { clearTimeout(timer); } }
const observe = promise => promise.then(value => ({ value }), error => ({ error: p.safeError(error) }));
async function reproduce(label, snapshotFirst) {
  const x = await h.fixture(label);
  if (!snapshotFirst) {
    const { createFiscalYearWithPeriods } = require(path.join(root, 'services/accounting/periods.service.ts'));
    await createFiscalYearWithPeriods(x.organizationId, { name: 'Owned prior-year scope', startDate: new Date('2025-01-01T00:00:00Z'), endDate: new Date('2025-01-31T23:59:59.999Z') }, x.actorId);
    x.periodId = (await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, endDate: { lt: new Date('2026-01-01') } }, orderBy: { startDate: 'asc' } })).id;
  }
  const financialBefore = f.hash(await p.rows(x, p.economicModels)), entered = latch(), releaseSign = latch(), collected = latch(), releaseClose = latch();
  let signPending, closePending, publication, readyRead, held = false, attempts = 0;
  dbModule.db = new Proxy(db, { get(target, key) {
    if (key !== '$transaction') { const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; }
    return async (work, options) => {
      const lane = context.getStore();
      if (lane === 'close') {
        return target.$transaction(tx => work(new Proxy(tx, { get(inner, name) {
          if (name === 'closeRun') return new Proxy(inner.closeRun, { get(model, method) {
            if (method === 'create') return async args => { const value = await model.create(args); if (args.data.status === 'RUNNING') publication = value; return value; };
            if (method === 'updateMany') return async args => { if (publication && args.where.id === publication.id && args.where.status === 'RUNNING') { collected.resolve(); await bounded(releaseClose.promise, 'Close finalization release'); } return model.updateMany(args); };
            return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
          } });
          const value = inner[name]; return typeof value === 'function' ? value.bind(inner) : value;
        } })), { ...options, timeout: 45000 });
      }
      if (lane === 'sign') attempts += 1;
      if (lane !== 'sign' || !snapshotFirst) return target.$transaction(work, options);
      return target.$transaction(tx => work(new Proxy(tx, { get(inner, name) {
        if (name === 'reconciliationRun') return new Proxy(inner.reconciliationRun, { get(model, method) {
          if (method !== 'findFirst') return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
          return async args => { const value = await model.findFirst(args); if (!held && args.include?.providerAccount) { held = true; assert.equal(value.status, 'READY_FOR_SIGNOFF'); readyRead = value.id; entered.resolve(); await bounded(releaseSign.promise, 'Signing snapshot release'); } return value; };
        } });
        const value = inner[name]; return typeof value === 'function' ? value.bind(inner) : value;
      } })), { ...options, timeout: 45000 });
    };
  } });
  try {
    if (snapshotFirst) { signPending = observe(context.run('sign', () => certification.signReconciliationRun(h.command(x)))); await bounded(entered.promise, 'Actual Serializable source read'); }
    closePending = observe(context.run('close', () => p.assessment(x, label, false))); await bounded(collected.promise, 'Actual collected unsigned evidence');
    assert.ok(publication?.id); assert.equal((await db.closeRun.findUniqueOrThrow({ where: { id: publication.id } })).status, 'RUNNING');
    if (snapshotFirst) releaseSign.resolve(); else signPending = observe(context.run('sign', () => certification.signReconciliationRun(h.command(x))));
    const signed = await bounded(signPending, 'Actual signature commit'); assert.ok(signed.value, JSON.stringify(signed));
    const afterSign = await db.closeRun.findUniqueOrThrow({ where: { id: publication.id } });
    assert.equal(afterSign.status, 'BLOCKED'); assert.equal(afterSign.metadata?.staleState?.sourceCode, 'PAYMENT_RECONCILIATION_SIGNED');
    if (snapshotFirst) assert.equal(attempts, 2, 'Stale snapshot must restart before signing');
    releaseClose.resolve(); const completed = await bounded(closePending, 'Actual Close finalization'); assert.ok(completed.value, JSON.stringify(completed));
    const row = await db.closeRun.findUniqueOrThrow({ where: { id: publication.id } });
    const discardedRows = await db.closeEvidenceItem.count({ where: { closeRunId: row.id, organizationId: x.organizationId } });
    assert.equal(discardedRows, 0, 'Invalidated in-flight collectors must not persist obsolete observations'); assert.equal(row.metadata?.staleState?.status, 'EVIDENCE_STALE');
    const retainedSigned = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.reconciliationRunId } }); assert.equal(retainedSigned.status, 'SIGNED'); assert.equal(retainedSigned.certificateHash, signed.value.certificateHash);
    assert.equal(f.hash(await p.rows(x, p.economicModels)), financialBefore);
    const recovered = await p.assessment(x, 'sign-recovery', false), currentEvidence = await db.closeEvidenceItem.findFirstOrThrow({ where: { organizationId: x.organizationId, closeRunId: recovered.closeRunId, sourceType: 'ReconciliationRun', sourceId: x.reconciliationRunId } });
    assert.equal(currentEvidence.sourceHash, retainedSigned.certificateHash); assert.equal(currentEvidence.provenance, 'POSTED');
    return { organizationId: x.organizationId, attempts, recovered: { runId: recovered.closeRunId, status: recovered.observedStatus, sourceHash: currentEvidence.sourceHash }, closeRunId: row.id, periodId: x.periodId, signingPeriodId: retainedSigned.accountingPeriodId, snapshotReadRunId: readyRead, status: row.status, invalidationPreserved: true, obsoleteCollectorRowsDiscarded: discardedRows === 0, actualCertificateHash: retainedSigned.certificateHash, financialUnchanged: true, verified: true };
  } finally { releaseSign.resolve(); releaseClose.resolve(); await Promise.allSettled([signPending, closePending].filter(Boolean)); dbModule.db = originalDb; }
}
function keyOf(args) { const first = args[0]; return Array.isArray(first?.values) ? first.values : args.slice(1); }
async function backend(tx) { return (await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid'))[0].pid; }
async function blocking(waiter, holder) {
  assert.notEqual(waiter, holder);
  return f.helper.withClient(f.target, async client => {
    await f.helper.assertOwned(client); const until = Date.now() + 5000;
    do { const blockers = (await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiter])).rows[0].blockers; if (blockers.includes(holder)) return { waiter, holder, blockers, observed: true }; await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < until);
    throw Error('Actual PostgreSQL signing/publication blocking was not observed');
  });
}
async function publicationRace(first) {
  const x = await h.fixture('race-' + first), financialBefore = f.hash(await p.rows(x, p.economicModels));
  const state = { creator: { attempt: latch(), held: latch() }, sign: { attempt: latch(), held: latch() }, release: latch(), collected: latch(), finalize: latch(), events: [] };
  let signPending, closePending, publication, held = false;
  dbModule.db = new Proxy(db, { get(target, key) {
    if (key !== '$transaction') { const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; }
    return (work, options) => {
      const lane = context.getStore(); if (!['sign', 'creator'].includes(lane)) return target.$transaction(work, options);
      return target.$transaction(tx => work(new Proxy(tx, { get(inner, name) {
        if (name === '$queryRaw') return async (...args) => {
          const order = keyOf(args).includes(JSON.stringify(['close-assessment-order', x.organizationId, x.periodId]));
          if (order) { state[lane].pid = await backend(tx); state.events.push({ lane, event: 'attempt' }); state[lane].attempt.resolve(); }
          const value = await inner.$queryRaw(...args);
          if (order) { state.events.push({ lane, event: 'acquired' }); if (!held && lane === first) { held = true; state[lane].held.resolve(); await bounded(state.release.promise, 'Publication holder release'); } }
          return value;
        };
        if (name === 'closeRun' && lane === 'creator') return new Proxy(inner.closeRun, { get(model, method) {
          if (method === 'create') return async args => { const value = await model.create(args); if (args.data.status === 'RUNNING') publication = value; return value; };
          if (method === 'updateMany') return async args => { if (publication && args.where.id === publication.id && args.where.status === 'RUNNING') { state.collected.resolve(); await bounded(state.finalize.promise, 'Race collector finalization'); } return model.updateMany(args); };
          return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
        } });
        const value = inner[name]; return typeof value === 'function' ? value.bind(inner) : value;
      } })), { ...options, timeout: 45000 });
    };
  } });
  try {
    const startSign = () => observe(context.run('sign', () => certification.signReconciliationRun(h.command(x))));
    const startClose = () => observe(context.run('creator', () => p.assessment(x, 'race', false)));
    if (first === 'creator') { closePending = startClose(); await bounded(state.creator.held.promise, 'Creator actual lock'); signPending = startSign(); await bounded(state.sign.attempt.promise, 'Signer actual wait'); }
    else { signPending = startSign(); await bounded(state.sign.held.promise, 'Signer actual lock'); closePending = startClose(); await bounded(state.creator.attempt.promise, 'Creator actual wait'); }
    const conflict = await blocking(state[first === 'creator' ? 'sign' : 'creator'].pid, state[first].pid); state.release.resolve();
    const signed = await bounded(signPending, 'Raced signature'); assert.ok(signed.value, JSON.stringify(signed));
    await bounded(state.collected.promise, 'Raced collected evidence'); state.finalize.resolve();
    const completed = await bounded(closePending, 'Raced assessment'); assert.ok(completed.value, JSON.stringify(completed));
    const row = await db.closeRun.findUniqueOrThrow({ where: { id: publication.id } }), evidence = await db.closeEvidenceItem.findFirst({ where: { organizationId: x.organizationId, closeRunId: row.id, sourceType: 'ReconciliationRun', sourceId: x.reconciliationRunId } });
    if (first === 'creator') { assert.equal(row.status, 'BLOCKED'); assert.equal(row.metadata?.staleState?.sourceCode, 'PAYMENT_RECONCILIATION_SIGNED'); assert.equal(evidence, null); assert.equal(await db.closeEvidenceItem.count({ where: { closeRunId: row.id } }), 0); }
    else { assert.equal(row.metadata?.staleState, undefined); assert.ok(evidence); assert.equal(evidence.sourceHash, signed.value.certificateHash); assert.equal(evidence.provenance, 'POSTED'); }
    assert.equal(f.hash(await p.rows(x, p.economicModels)), financialBefore);
    return { organizationId: x.organizationId, order: first + '-first', blocking: conflict, events: state.events, runId: row.id, status: row.status, stale: row.metadata?.staleState?.status ?? null, recordedSourceHash: evidence?.sourceHash ?? null, signatureHash: signed.value.certificateHash, financialUnchanged: true };
  } finally { state.release.resolve(); state.finalize.resolve(); await Promise.allSettled([signPending, closePending].filter(Boolean)); dbModule.db = originalDb; }
}
async function lateRollback() {
  let retainedRun, artifact, history;
  const x = await h.fixture('late', async base => { retainedRun = await p.assessment(base, 'before-sign-source'); artifact = await p.certify(retainedRun, 'before-sign-source'); history = await p.retained(retainedRun); });
  const snapshot = async () => ({ core: await p.rows(x), source: await h.extraRows(x.organizationId) }), before = await snapshot(), financialBefore = f.hash(await p.rows(x, p.economicModels));
  let faultObserved;
  dbModule.db = new Proxy(db, { get(target, key) {
    if (key !== '$transaction') { const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; }
    return (work, options) => target.$transaction(tx => work(new Proxy(tx, { get(inner, name) {
      if (name === 'closeRun') return new Proxy(inner.closeRun, { get(model, method) {
        if (method !== 'update') return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
        return async args => { const value = await model.update(args); if (value.id === retainedRun.closeRunId && value.metadata?.staleState?.sourceCode === 'PAYMENT_RECONCILIATION_SIGNED') {
          const signed = await tx.reconciliationRun.findUniqueOrThrow({ where: { id: x.reconciliationRunId } }); assert.equal(signed.status, 'SIGNED');
          const event = await tx.businessEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, eventType: 'payment.reconciliation.signed', sourceId: x.reconciliationRunId } });
          const invalidation = await tx.businessEvent.findUniqueOrThrow({ where: { id: value.metadata.staleState.businessEventId } }); assert.equal(invalidation.eventType, 'close.certification.invalidated');
          assert.equal(await tx.businessEventOutbox.count({ where: { organizationId: x.organizationId, businessEventId: { in: [event.id, invalidation.id] } } }), 2);
          faultObserved = { signatureHash: signed.certificateHash, signedEventId: event.id, invalidationId: invalidation.id }; throw Error('OWNED_LATE_SIGNATURE_INVALIDATION_FAILURE');
        } return value; };
      } });
      const value = inner[name]; return typeof value === 'function' ? value.bind(inner) : value;
    } })), options);
  } });
  try { await assert.rejects(certification.signReconciliationRun(h.command(x)), /could not be completed safely/); assert.ok(faultObserved); }
  finally { dbModule.db = originalDb; }
  assert.deepEqual(await snapshot(), before); await p.unchangedHistory(retainedRun, history, artifact, false);
  const command = h.command(x), signed = await certification.signReconciliationRun(command);
  const historical = await p.unchangedHistory(retainedRun, history, artifact, true), afterSign = f.hash(await snapshot());
  const replay = await certification.signReconciliationRun(command); assert.equal(replay.replayed, true); assert.equal(replay.certificateHash, signed.certificateHash); assert.equal(f.hash(await snapshot()), afterSign);
  const recovered = await p.assessment(x, 'after-sign-retry', false), evidence = await db.closeEvidenceItem.findFirstOrThrow({ where: { organizationId: x.organizationId, closeRunId: recovered.closeRunId, sourceType: 'ReconciliationRun', sourceId: x.reconciliationRunId } }); assert.equal(evidence.sourceHash, signed.certificateHash);
  assert.equal(f.hash(await p.rows(x, p.economicModels)), financialBefore);
  return { organizationId: x.organizationId, faultObserved, allObservedRowsRolledBack: true, retainedExport: historical, exactReplayUnchanged: true, recovered: { runId: recovered.closeRunId, status: recovered.observedStatus, sourceHash: evidence.sourceHash }, financialUnchanged: true };
}
async function main() {
  await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await h.outside();
  for (const [name, snapshotFirst] of [['snapshot-before-publication', true], ['earlier-period-organization-wide-evidence', false]]) {
    const row = { name }, start = Date.now(); report.checks.push(row);
    try { row.result = await reproduce(name === 'snapshot-before-publication' ? 'snap' : 'old', snapshotFirst); row.passed = true; } catch (error) { row.passed = false; row.error = p.safeError(error); }
    row.elapsedMs = Date.now() - start; console.log(JSON.stringify({ name, passed: row.passed, error: row.error }));
  }
  for (const [name, work] of [['creator-first-actual-blocking', () => publicationRace('creator')], ['signer-first-actual-blocking', () => publicationRace('sign')], ['late-invalidation-retained-export-rollback-retry', lateRollback]]) {
    const row = { name }, start = Date.now(); report.checks.push(row);
    try { row.result = await work(); row.passed = true; } catch (error) { row.passed = false; row.error = p.safeError(error); }
    row.elapsedMs = Date.now() - start; console.log(JSON.stringify({ name, passed: row.passed, error: row.error }));
  }
}
if (require.main === module) main().catch(error => { report.error = p.safeError(error); }).finally(async () => {
  dbModule.db = originalDb;
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await h.outside(); report.outsideUnchanged = f.hash(report.outsideBefore) === f.hash(report.outsideAfter); } catch (error) { report.finalizationError = p.safeError(error); }
  await db.$disconnect(); report.passed = !report.error && !report.finalizationError && report.checks.length === 5 && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged;
  const file = path.join(__dirname, 'sign-close-acceptance-' + crypto.randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.map(({ name, passed }) => ({ name, passed })), sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); process.exit(report.passed ? 0 : 1);
});
