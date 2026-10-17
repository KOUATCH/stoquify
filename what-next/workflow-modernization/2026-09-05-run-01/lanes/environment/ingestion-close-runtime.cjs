'use strict';
if (!['--baseline', '--acceptance'].includes(process.argv[2])) { console.log('Inert; explicit owned-database mode required.'); process.exit(0); }
const h = require('./sign-close-fixtures.cjs'), { p, f, db, root } = h, { fs, path, crypto, assert } = f;
const payments = require('./purchase-close-payment-prerequisites.cjs');
const { AsyncLocalStorage } = require('node:async_hooks'), context = new AsyncLocalStorage();
const dbModule = require(path.join(root, 'prisma/db.ts')), originalDb = dbModule.db;
const { captureProviderEvent } = require(path.join(root, 'services/payments/provider-event.service.ts'));
const { importProviderStatement } = require(path.join(root, 'services/payments/statement-import.service.ts'));
const { MobileMoneyHmacAdapter } = require(path.join(root, 'services/payments/adapters/mobile-money-hmac.adapter.ts'));
const periods = require(path.join(root, 'services/accounting/periods.service.ts'));
const acceptance = process.argv[2] === '--acceptance', report = { at: new Date().toISOString(), acceptance, checks: [] };
const sources = () => ({ ...h.sources(), ...Object.fromEntries(Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file)).map(file => [path.relative(root, file).split(path.sep).join('/'), p.sha(fs.readFileSync(file))])) });
function latch() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: () => resolve() }; }
async function bounded(promise) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Owned ingestion publication barrier timed out')), 30000); })]); } finally { clearTimeout(timer); } }
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
    if (snapshotFirst) { assert.ok(result.value, JSON.stringify(result)); assert.equal(attempts, 1); }
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


async function publicationRace(x, first, sourceCode, mutate) {
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
    const startProducer = () => observe(context.run('producer', () => mutate()));
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
    if (first === 'creator') assert.equal(row.metadata?.staleState?.sourceCode, sourceCode);
    else { assert.equal(row.metadata?.staleState, undefined); assert.ok(await db.closeEvidenceItem.count({ where: { closeRunId: row.id } }) > 0); }
    return { blocking, order: first + '-first', closeRunId: row.id, stale: row.metadata?.staleState?.status ?? null };

  } finally { state.release.resolve(); state.finalize.resolve(); await Promise.allSettled([producer, creator].filter(Boolean)); dbModule.db = originalDb; }
}
async function fixture(label) {
  const x = await p.fixture('ig-' + label + '-' + crypto.randomUUID().slice(0, 8), false);
  await payments.settlePayable(x, 'ingestion-prerequisite');
  const certified = await p.assessment(x, 'before-ingestion'), artifact = await p.certify(certified, 'before-ingestion'), retained = await p.retained(certified);
  const bank = await db.chartOfAccount.findFirstOrThrow({ where: { organizationId: x.organizationId, mappingKey: 'BANK' } });
  const suspense = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-ING-SUSPENSE', nameEn: 'Owned ingestion suspense', type: 'ASSET', normalBalance: 'DEBIT' } });
  const rail = await db.paymentRail.create({ data: { organizationId: x.organizationId, code: 'OWNED-ING', name: 'Owned synthetic ingestion rail', type: 'MOBILE_MONEY' } });
  const provider = await db.providerAccount.create({ data: { organizationId: x.organizationId, paymentRailId: rail.id, providerCode: 'OWNED-ING', displayName: 'Owned ingestion publication', status: 'ACTIVE', externalAccountHash: crypto.randomUUID(), currencyCode: 'XAF', settlementLedgerAccountId: bank.id, suspenseLedgerAccountId: suspense.id } });
  await db.settlementAccount.create({ data: { organizationId: x.organizationId, providerAccountId: provider.id, ledgerAccountId: bank.id, approvalStatus: 'APPROVED', requestedById: x.actorId, approvedById: x.certifierId, approvedAt: new Date(), effectiveFrom: new Date('2026-01-01'), metadata: { synthetic: true, noLiveAuthority: true } } });
  await periods.createFiscalYearWithPeriods(x.organizationId, { name: 'Owned prior ingestion observation', startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31T23:59:59.999Z') }, x.actorId);
  const prior = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, endDate: { lt: new Date('2026-01-01') } } });
  return { ...x, periodId: prior.id, provider, certified, artifact, retained };
}
function event(x, overrides = {}, valid = true) {
  const adapter = new MobileMoneyHmacAdapter('OWNED-ING'), now = new Date(), reference = crypto.randomUUID();
  const rawBody = JSON.stringify({ eventId: 'ig-' + reference, transactionId: reference, reference, eventType: 'PAYMENT_CONFIRMED', direction: 'INBOUND', amount: '12.25', currency: 'XAF', occurredAt: now.toISOString(), ...overrides });
  const secret = crypto.randomBytes(32).toString('hex'), timestamp = String(now.getTime());
  const signature = crypto.createHmac('sha256', valid ? secret : 'owned-wrong-secret').update(timestamp + '.' + adapter.canonicalPayload(rawBody)).digest('hex');
  return { organizationId: x.organizationId, providerAccountId: x.provider.id, adapter, rawBody, headers: { 'x-provider-timestamp': timestamp, 'x-provider-signature': signature }, secret, now, receivedAt: now };
}
function statement(x) {
  const reference = crypto.randomUUID();
  return { organizationId: x.organizationId, providerAccountId: x.provider.id, adapter: new MobileMoneyHmacAdapter('OWNED-ING'), importedById: x.actorId, fileName: 'owned-ingestion.json', rawContent: JSON.stringify([{ providerTransactionId: reference, providerReference: reference, direction: 'CREDIT', amount: '12.25', currencyCode: 'XAF', occurredAt: new Date().toISOString(), description: 'Owned provider statement evidence' }]) };
}
async function extra(org) {
  const value = await h.extraRows(org);
  for (const model of ['statementFile', 'statementLine', 'paymentReconciliationInboxItem']) value[model] = await db[model].findMany({ where: { organizationId: org }, orderBy: { id: 'asc' } });
  return value;
}
const outside = async () => ({ base: await h.outside(), extra: f.hash(await extra({ notIn: h.organizations })) });
const snapshot = async x => ({ core: await p.rows(x), source: await extra(x.organizationId) });
async function check(name, work) { const row = { name }, started = Date.now(); report.checks.push(row); try { row.result = await work(); row.passed = true; } catch(error) { row.error = p.safeError(error); row.passed = false; } row.elapsedMs = Date.now() - started; console.log(JSON.stringify(row)); }
async function main() {
  await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await outside();
  const x = await fixture('scope'), captured = event(x), imported = statement(x);
  await check('capture-prior-period-publication', () => publication(x, 'capture', () => captureProviderEvent(captured)));
  await check('statement-prior-period-publication', () => publication(x, 'statement', () => importProviderStatement(imported)));
  await check('signature-rejection-prior-period-publication', () => publication(x, 'signature', () => captureProviderEvent(event(x, {}, false))));
  await check('altered-event-prior-period-publication', () => publication(x, 'tamper', () => captureProviderEvent(event(x, { ...JSON.parse(captured.rawBody), amount: '99.00' }))));
  if (!acceptance) return;
  await check('read-committed-observes-new-assessment-after-wait', async () => { const input = event(x); return publication(x, 'ingestion-fresh-read', () => captureProviderEvent(input), true); });
  await check('capture-creator-first-actual-postgresql-locks', async () => { const input = event(x); return publicationRace(x, 'creator', 'PAYMENT_PROVIDER_EVENT_CAPTURED', () => captureProviderEvent(input)); });
  await check('statement-producer-first-actual-postgresql-locks', async () => { const input = statement(x); return publicationRace(x, 'producer', 'PAYMENT_STATEMENT_IMPORT', () => importProviderStatement(input)); });
  await check('late-source-event-outbox-close-rollback-and-retry', async () => {
    const cases = [];
    for (const kind of ['event', 'statement']) {
      const input = kind === 'event' ? event(x) : statement(x), mutate = () => kind === 'event' ? captureProviderEvent(input) : importProviderStatement(input);
      let observed;
      const result = await publication(x, 'late-' + kind, async () => {
        const before = await snapshot(x), publicationDb = dbModule.db;
        dbModule.db = new Proxy(publicationDb, { get(target, key) {
          if (key !== '$transaction') return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
          return (work, options) => target.$transaction(async tx => { const value = await work(tx);
            const sourceId = value.providerEventRecordId ?? value.statementFileId;
            const eventRow = await tx.businessEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceId, eventType: kind === 'event' ? 'payment.provider_event.captured' : 'payment.statement.imported' }, include: { outboxMessages: true } }); assert.ok(eventRow.outboxMessages.length > 0);
            const close = await tx.closeRun.findFirstOrThrow({ where: { organizationId: x.organizationId, periodId: x.periodId, metadata: { path: ['staleState', 'correlationId'], equals: value.correlationId } } });
            observed = { sourceId, eventId: eventRow.id, closeRunId: close.id, outboxCount: eventRow.outboxMessages.length }; throw Error('OWNED_LATE_INGESTION_FAILURE'); }, options);
        } });
        try { await assert.rejects(mutate(), /OWNED_LATE_INGESTION_FAILURE/); assert.ok(observed); } finally { dbModule.db = publicationDb; }
        assert.deepEqual(await snapshot(x), before);
        return mutate();
      });
      cases.push({ kind, observed, ...result, allObservedRowsRolledBack: true });
    }
    return { cases };
  });
  await check('simultaneous-events-and-statements-retain-one-source', async () => {
    const before = f.hash(await p.rows(x, p.economicModels)), input = event(x), file = statement(x);
    const events = await Promise.all([captureProviderEvent(input), captureProviderEvent(input)]); assert.deepEqual(events.map(row => row.status).sort(), ['CAPTURED', 'DUPLICATE']);
    assert.equal(await db.providerEvent.count({ where: { organizationId: x.organizationId, providerEventId: events[0].providerEventId } }), 1);
    const files = await Promise.all([importProviderStatement(file), importProviderStatement(file)]); assert.deepEqual(files.map(row => row.status).sort(), ['DUPLICATE_FILE', 'IMPORTED']);
    assert.equal(await db.statementFile.count({ where: { organizationId: x.organizationId, fileHash: files[0].fileHash } }), 1);
    assert.equal(await db.statementLine.count({ where: { organizationId: x.organizationId, statementFileId: files.find(row => row.status === 'IMPORTED').statementFileId } }), 1);
    assert.equal(f.hash(await p.rows(x, p.economicModels)), before); return { eventStatuses: events.map(row => row.status), statementStatuses: files.map(row => row.status), oneSourceEach: true, financialUnchanged: true };
  });
  await check('stopped-new-work-retained-duplicates-and-provider-denials', async () => {
    const sourceBefore = await extra(x.organizationId), financial = f.hash(await p.rows(x, p.economicModels));
    await db.tenantModuleConfiguration.update({ where: { organizationId: x.organizationId }, data: { newWorkStoppedModules: ['payment_reconciliation'] } });
    try {
      assert.equal((await importProviderStatement(imported)).status, 'DUPLICATE_FILE');
      await assert.rejects(importProviderStatement(statement(x)), error => error.code === 'FORBIDDEN');
    } finally { await db.tenantModuleConfiguration.update({ where: { organizationId: x.organizationId }, data: { newWorkStoppedModules: [] } }); }
    await assert.rejects(captureProviderEvent({ ...event(x), organizationId: crypto.randomUUID() }));
    await assert.rejects(importProviderStatement({ ...statement(x), providerAccountId: crypto.randomUUID() }));
    await assert.rejects(importProviderStatement({ ...statement(x), rawContent: '[]' }));
    await db.providerAccount.update({ where: { id: x.provider.id }, data: { status: 'SUSPENDED' } });
    try { await assert.rejects(captureProviderEvent(event(x))); await assert.rejects(importProviderStatement(statement(x))); }
    finally { await db.providerAccount.update({ where: { id: x.provider.id }, data: { status: 'ACTIVE' } }); }
    const after = await extra(x.organizationId);
    // Replay increments its ingestion-attempt metadata; controlled policy and
    // provider restoration update their own timestamps. Financial/source rows do not grow.
    for (const key of ['providerEvent', 'statementFile', 'statementLine', 'paymentException', 'matchRecord']) assert.deepEqual(after[key], sourceBefore[key]);
    assert.equal(f.hash(await p.rows(x, p.economicModels)), financial); return { retainedDuplicateAllowed: true, newImportDenied: true, providerScopeAndStatusDenied: true, sourceAndFinancialUnchanged: true };
  });
  await check('retained-certified-export-and-current-rejection-truth', async () => {
    await p.unchangedHistory(x.certified, x.retained, x.artifact, true);
    const current = await p.assessment(x, 'after-critical-rejection', false);
    const run = await db.closeRun.findUniqueOrThrow({ where: { id: current.closeRunId } }); assert.equal(run.status, 'BLOCKED');
    const invalid = await db.providerEvent.findMany({ where: { organizationId: x.organizationId, signatureValid: false } }); assert.ok(invalid.length > 0); assert.ok(invalid.every(row => row.status !== 'VERIFIED'));
    assert.ok(await db.paymentException.count({ where: { organizationId: x.organizationId, severity: 'CRITICAL', status: 'OPEN' } }) >= 2);
    return { originalCertifiedBytesRetained: true, currentCloseBlocked: true, rejectedEventsNotVerified: true };
  });
}
main().catch(error => { report.error = p.safeError(error); }).finally(async () => {
  dbModule.db = originalDb;
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = f.hash(report.outsideBefore) === f.hash(report.outsideAfter); } catch(error) { report.finalizationError = p.safeError(error); }
  await db.$disconnect(); report.passed = !report.error && !report.finalizationError && report.checks.length === (acceptance ? 11 : 4) && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged;
  const file = path.join(__dirname, 'ingestion-close-' + (acceptance ? 'acceptance-' : 'baseline-') + crypto.randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); process.exit(report.passed ? 0 : 1);
});

