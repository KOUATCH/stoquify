'use strict';
if (!['--baseline', '--acceptance'].includes(process.argv[2])) { console.log('Inert; requires explicit owned-database verification mode.'); process.exit(0); }
const h = require('./sign-close-fixtures.cjs'), { p, f, db, root } = h, { fs, path, crypto, assert } = f;
const { AsyncLocalStorage } = require('node:async_hooks'), context = new AsyncLocalStorage();
const dbModule = require(path.join(root, 'prisma/db.ts')), originalDb = dbModule.db;
const additional = require(path.join(root, 'services/reconciliation/reconciliation-additional-sources.service.ts'));
const preparation = require(path.join(root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const { captureProviderEvent } = require(path.join(root, 'services/payments/provider-event.service.ts'));
const { MobileMoneyHmacAdapter } = require(path.join(root, 'services/payments/adapters/mobile-money-hmac.adapter.ts'));
const closure = require(path.join(root, 'services/reconciliation/payment-exception-closure.service.ts'));
const financialFixture = require('./exception-closure-fixtures.cjs');
const acceptance = process.argv[2] === '--acceptance', report = { at: new Date().toISOString(), acceptance, checks: [] };
const sources = () => ({ ...h.sources(), ...Object.fromEntries(Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file)).map(file => [path.relative(root, file).replaceAll('\\', '/'), p.sha(fs.readFileSync(file))])) });
function control(x, actorId = x.actorId) { const now = new Date(); return { organizationId: x.organizationId, actorId, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.exception.resolve', 'accounting.journal.read'], now, lastAuthAt: now }; }
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
const observe = promise => promise.then(value => ({ value }), error => ({ error: p.safeError(error) }));
async function prepareCommand(x) {
  const preview = await preparation.previewReconciliationPreparation({ runId: x.reconciliationRunId }, control(x)); assert.equal(preview.canPrepare, true);
  return { runId: x.reconciliationRunId, expectedRevision: preview.revision, reason: 'Review producer ordering against actual Close publication', idempotencyKey: crypto.randomUUID() };
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
    const startProducer = () => observe(context.run('producer', () => closure.decideExceptionClosure(command, control(x, actorId))));
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
    if (first === 'creator') { assert.equal(row.metadata?.staleState?.sourceCode, 'PAYMENT_RECONCILIATION_EXCEPTION_DECIDED'); assert.equal(evidence, null); }
    else { assert.equal(row.metadata?.staleState, undefined); assert.ok(evidence?.sourceLabel.includes('NEEDS_REVIEW')); }
    return { blocking, order: first + '-first', closeRunId: row.id, stale: row.metadata?.staleState?.status ?? null, sourceLabel: evidence?.sourceLabel ?? null };
  } finally { state.release.resolve(); state.finalize.resolve(); await Promise.allSettled([producer, creator].filter(Boolean)); dbModule.db = originalDb; }
}
async function check(name, work) { const row = { name }, start = Date.now(); report.checks.push(row); try { row.result = await work(); row.passed = true; } catch (error) { row.passed = false; row.error = p.safeError(error); } row.elapsedMs = Date.now() - start; console.log(JSON.stringify(row)); }

async function fixture(label) {
  let certified, artifact, retained;
  const x = await h.fixture('exception-' + label, async base => { certified = await p.assessment(base, 'before-exception'); artifact = await p.certify(certified, 'before-exception'); retained = await p.retained(certified); });
  await require(path.join(root, 'services/accounting/periods.service.ts')).createFiscalYearWithPeriods(x.organizationId, { name: 'Owned earlier exception collector', startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31T23:59:59.999Z') }, x.actorId);
  x.periodId = (await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, endDate: { lt: new Date('2026-01-01') } } })).id;
  const run = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.reconciliationRunId } });
  const match = await db.matchRecord.findFirstOrThrow({ where: { organizationId: x.organizationId, reconciliationRunId: run.id, status: 'AUTO_MATCHED' } });
  const payment = await db.paymentTransaction.findFirstOrThrow({ where: { organizationId: x.organizationId, providerAccountId: run.providerAccountId, id: match.paymentTransactionId } });
  const provider = await db.providerAccount.findUniqueOrThrow({ where: { id: run.providerAccountId } }), adapter = new MobileMoneyHmacAdapter(provider.providerCode), now = new Date();
  const rawBody = JSON.stringify({ eventId: 'late-corroboration-' + crypto.randomUUID(), transactionId: payment.providerTransactionId, reference: payment.providerReference, eventType: 'PAYMENT_CONFIRMED', direction: payment.direction, amount: payment.amount.toFixed(2), currency: payment.currencyCode, occurredAt: payment.occurredAt.toISOString() });
  const secret = crypto.randomBytes(32).toString('hex'), timestamp = String(now.getTime()), signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest('hex');
  await captureProviderEvent({ organizationId: x.organizationId, providerAccountId: provider.id, adapter, rawBody, headers: { 'x-provider-timestamp': timestamp, 'x-provider-signature': signature }, secret, now, receivedAt: now });
  const preview = await additional.previewAdditionalReconciliationSources({ runId: x.reconciliationRunId }, control(x));
  await additional.incorporateAdditionalReconciliationSources({ runId: x.reconciliationRunId, expectedRevision: preview.revision, reason: 'Investigate actual late corroborating source without another allocation', idempotencyKey: crypto.randomUUID() }, control(x));
  const exception = await db.paymentException.findFirstOrThrow({ where: { organizationId: x.organizationId, reconciliationRunId: x.reconciliationRunId } }); assert.equal(exception.type, 'MANUAL_REVIEW_REQUIRED');
  const reviewer = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned independent withdrawal reviewer', email: crypto.randomUUID() + '@example.invalid', isActive: true } });
  return { ...x, exceptionId: exception.id, reviewerId: reviewer.id, certified, artifact, retained };
}
async function decision(x, purpose) {
  const input = { exceptionId: x.exceptionId, ...(purpose ? { purpose } : {}) };
  const review = await closure.previewExceptionClosure(input, control(x));
  const proposed = await closure.proposeExceptionClosure({ ...input, expectedRevision: review.revision, reason: purpose ? 'Withdraw the earlier source interpretation for renewed investigation' : 'Review corroboration of the original retained allocation', idempotencyKey: crypto.randomUUID() }, control(x));
  return { exceptionId: x.exceptionId, proposalId: proposed.proposalId, expectedRevision: review.revision, decision: 'APPROVE', reason: 'Independent review of the source decision and retained evidence' };
}
async function sign(x) {
  await preparation.prepareReconciliationRun(await prepareCommand(x), control(x));
  x.review = await h.certification.previewReconciliationSignOff({ organizationId: x.organizationId, runId: x.reconciliationRunId, actorId: x.certifierId, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.sign'] });
  assert.equal(x.review.canSign, true); return h.certification.signReconciliationRun(h.command(x));
}
const snapshot = async x => ({ core: await p.rows(x), source: await h.extraRows(x.organizationId), inbox: await db.paymentReconciliationInboxItem.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }) });
async function main() {
  await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await h.outside();
  const x = await fixture('scope'), financial = f.hash(await p.rows(x, p.economicModels)), matches = await db.matchRecord.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } });
  const approve = await decision(x);
  await check('approval-prior-period-publication', () => publication(x, 'exception-approval', () => closure.decideExceptionClosure(approve, control(x, x.certifierId))));
  const signed = await sign(x), withdraw = await decision(x, 'REOPEN_SOURCE');
  await check('signed-withdrawal-prior-period-publication', () => publication(x, 'exception-withdrawal', () => closure.decideExceptionClosure(withdraw, control(x, x.reviewerId))));
  if (acceptance) {
    await check('withdrawal-retained-signature-history-and-exact-replay', async () => {
      const before = f.hash(await snapshot(x)), result = await closure.decideExceptionClosure(withdraw, control(x, x.reviewerId)); assert.equal(result.replayed, true); assert.equal(f.hash(await snapshot(x)), before);
      const saved = await db.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { id: result.receiptId } });
      assert.equal(saved.payloadSummary.priorRunCertificate.certificateHash, signed.certificateHash); assert.equal(h.certification.certificatePayloadHash(saved.payloadSummary.priorRunCertificate.certificatePayload), signed.certificateHash);
      assert.equal((await db.paymentException.findUniqueOrThrow({ where: { id: x.exceptionId } })).status, 'REOPENED');
      await p.unchangedHistory(x.certified, x.retained, x.artifact, true); return { exactReplayUnchanged: true, retainedSignatureHash: signed.certificateHash, certifiedBytesRetained: true };
    });
    await check('old-snapshot-new-publication-restarts', async () => {
      const input = await decision(x); return publication(x, 'exception-snapshot', () => closure.decideExceptionClosure(input, control(x, x.certifierId)), true);
    });
    await sign(x);
    await check('withdrawal-rejection-preserves-signature', async () => {
      const input = await decision(x, 'REOPEN_SOURCE'), before = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.reconciliationRunId } });
      const result = await closure.decideExceptionClosure({ ...input, decision: 'REJECT' }, control(x, x.reviewerId)); assert.equal(result.outcome, 'REJECTED');
      assert.deepEqual(await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.reconciliationRunId } }), before); return { certificateHash: before.certificateHash, unchangedSource: true };
    });
    await check('creator-first-actual-postgresql-blocking', async () => publicationRace(x, 'creator', await decision(x, 'REOPEN_SOURCE'), x.reviewerId));
    await check('producer-first-actual-postgresql-blocking', async () => publicationRace(x, 'producer', await decision(x), x.certifierId));
    await sign(x);
    const input = await decision(x, 'REOPEN_SOURCE');
    await check('denied-reviewers-tenant-revision-and-authentication', async () => {
      const before = f.hash(await snapshot(x));
      for (const actor of [control(x), control(x, x.certifierId), { ...control(x, x.reviewerId), actorPermissions: [] }, { ...control(x, x.reviewerId), organizationId: crypto.randomUUID() }, { ...control(x, x.reviewerId), lastAuthAt: new Date(0) }]) await assert.rejects(closure.decideExceptionClosure(input, actor));
      await assert.rejects(closure.decideExceptionClosure({ ...input, expectedRevision: 'sha256:' + '0'.repeat(64) }, control(x, x.reviewerId)));
      assert.equal(f.hash(await snapshot(x)), before); return { deniedWithoutEffects: true };
    });
    await check('late-decision-close-rollback-retry', async () => {
      const before = await snapshot(x); let observed;
      dbModule.db = new Proxy(db, { get(target, key) {
        if (key !== '$transaction') return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
        return (work, options) => target.$transaction(async tx => { const result = await work(tx);
          const exception = await tx.paymentException.findUniqueOrThrow({ where: { id: x.exceptionId } }), run = await tx.reconciliationRun.findUniqueOrThrow({ where: { id: x.reconciliationRunId } });
          assert.equal(exception.status, 'REOPENED'); assert.equal(run.status, 'NEEDS_REVIEW'); assert.equal(run.certificateHash, null);
          const stale = await tx.closeRun.findUniqueOrThrow({ where: { id: x.certified.closeRunId } }); assert.equal(stale.metadata?.staleState?.sourceCode, 'PAYMENT_RECONCILIATION_EXCEPTION_DECIDED');
          observed = { receiptId: result.receiptId, closeRunId: stale.id }; throw Error('OWNED_LATE_EXCEPTION_CLOSE_FAILURE'); }, options);
      } });
      try { await assert.rejects(closure.decideExceptionClosure(input, control(x, x.reviewerId)), /OWNED_LATE_EXCEPTION_CLOSE_FAILURE/); assert.ok(observed); } finally { dbModule.db = originalDb; }
      assert.deepEqual(await snapshot(x), before); const result = await closure.decideExceptionClosure(input, control(x, x.reviewerId)); assert.equal(result.replayed, false);
      const after = f.hash(await snapshot(x)); assert.equal((await closure.decideExceptionClosure(input, control(x, x.reviewerId))).replayed, true); assert.equal(f.hash(await snapshot(x)), after);
      await p.unchangedHistory(x.certified, x.retained, x.artifact, true); return { observed, allObservedRowsRolledBack: true, retryCommitted: true, exactReplayUnchanged: true };
    });
    await check('financial-treatment-approval-publication', async () => {
      const financialSource = await financialFixture.fixture('close-publication', h.organizations);
      const period = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: financialSource.organizationId }, orderBy: { startDate: 'asc' } });
      const owned = { ...financialSource, periodId: period.id, makerId: financialSource.actorId, reconciliationRunId: financialSource.runId };
      const before = f.hash(await p.rows(owned, p.economicModels)), approve = await decision(owned);
      const result = await publication(owned, 'financial-exception', () => closure.decideExceptionClosure(approve, control(owned, owned.checkerId)));
      assert.equal(f.hash(await p.rows(owned, p.economicModels)), before); return { ...result, financialTreatmentUnchanged: true };
    });
  }
  assert.equal(f.hash(await p.rows(x, p.economicModels)), financial); assert.deepEqual(await db.matchRecord.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }), matches);
  report.financialAndAllocationsUnchanged = true;
}
main().catch(error => { report.error = p.safeError(error); }).finally(async () => {
  dbModule.db = originalDb;
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await h.outside(); report.outsideUnchanged = f.hash(report.outsideBefore) === f.hash(report.outsideAfter); } catch (error) { report.finalizationError = p.safeError(error); }
  await db.$disconnect(); report.passed = !report.error && !report.finalizationError && report.checks.length === (acceptance ? 10 : 2) && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialAndAllocationsUnchanged;
  const file = path.join(__dirname, 'exception-close-' + (acceptance ? 'acceptance-' : 'baseline-') + crypto.randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); process.exit(report.passed ? 0 : 1);
});
