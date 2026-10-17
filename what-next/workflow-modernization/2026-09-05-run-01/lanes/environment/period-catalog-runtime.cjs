// Owned disposable database only; no migration, seed, provider or UI simulation.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. --run requires coordinated source freeze and owned database.');
} else {
  const c = require('./count-publication-runtime.cjs'), d = require('./close-denial-recovery-runtime.cjs'), h = d.h;
  const { f, db, root, helper, organizations } = h, { fs, path, crypto, assert } = f;
  const { PrismaClient } = require('@prisma/client'), { AsyncLocalStorage } = require('node:async_hooks');
  const load = file => require(path.join(root, file));
  const count = load('services/inventory/inventory-count.service.ts'), periods = load('services/accounting/periods.service.ts');
  const close = load('services/accounting/close-assurance.service.ts');
  const { reconcileInventoryClass3 } = load('services/inventory/inventory-reconciliation.service.ts');
  const { lockAccountingPeriodCatalogInTx } = load('services/accounting/accounting-period-catalog.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db, run = crypto.randomUUID();
  const baselineFile = path.join(root, 'what-next/workflow-modernization/2026-09-05-run-01/evidence/period-catalog-before-ba70a26d-61b4-4771-90aa-744a43178e1e.json');
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const files = [__filename, baselineFile, ...['services/accounting/accounting-period-catalog.service.ts', 'services/accounting/periods.service.ts', 'services/inventory/inventory-count.service.ts', 'services/inventory/inventory-close-invalidation.service.ts'].map(file => path.join(root, file))];
  const sources = () => ({ ...c.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), checks: [], fixtures: [], scope: 'Actual synthetic fiscal creation/count posting/Close assessment operations in the identity-guarded owned loopback database. New-period grades are recorded honestly; no ledger activity is invented to make them READY.', limitations: ['Direct seeds/fixtures are offline exclusions from online membership locking.', 'Inherited caller lock order, date editing/deletion, other producers and production contention are not certified.', 'No UI or external delivery proof. Exact saved predecessor is private verifier code, never written over product source.'] };
  const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; };
  async function bounded(work, label, milliseconds = 25000) { let timer; try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out')), milliseconds); })]); } finally { clearTimeout(timer); } }
  const outcome = promise => promise.then(value => ({ success: true, value }), error => ({ success: false, code: error.code, error: f.safe(error) }));
  async function pid(tx) { const rows = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database'); assert.equal(rows[0].database, helper.database); return rows[0].pid; }
  async function blockers(waiterPid, holderPid) {
    assert.notEqual(waiterPid, holderPid);
    return helper.withClient(f.target, async client => { await helper.assertOwned(client); const end = Date.now() + 5000;
      do { const found = (await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiterPid])).rows[0].blockers;
        if (found.includes(holderPid)) return { waiterPid, holderPid, blockers: found };
        await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < end);
      throw new Error('Expected database wait was not observed'); });
  }
  async function client() { const value = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 40000, maxWait: 10000 } }); await assertDisposableDatabaseIdentity(value, helper.database); return value; }
  const postInput = x => ({ organizationId: x.organizationId, countSessionId: x.countSetup.countSessionId, approvedById: x.countSetup.approvedById, countSheetHash: x.countSetup.countSheetHash, idempotencyKey: 'catalog-count-' + x.countSetup.countSessionId, correlationId: 'catalog-' + run });
  const assess = (x, periodId, label) => close.runCloseAssurance(x.organizationId, { periodId, correlationId: 'catalog-assess-' + label + '-' + run }, { actorId: x.makerId, actorPermissions: ['accounting.close.run'] });
  const annex = (x, periodId) => reconcileInventoryClass3({ organizationId: x.organizationId, periodId, currency: 'XAF' }, db);
  function oldCount() {
    const saved = JSON.parse(fs.readFileSync(baselineFile, 'utf8')).files.find(row => row.path === 'services/inventory/inventory-count.service.ts');
    const bytes = Buffer.from(saved.base64, 'base64'); assert.equal(sha(bytes), saved.sha256); assert.equal(saved.sha256, 'ed1d9052bf34eb95849b5a47199dc38d3d116a017760311dc4df8a958dd76d34');
    const ts = require('typescript'), Module = require('node:module'), filename = path.join(root, saved.path);
    const compiled = ts.transpileModule(bytes.toString('utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
    const isolated = new Module(filename, module); isolated.filename = filename; isolated.paths = Module._nodeModulePaths(path.dirname(filename)); isolated._compile(compiled.outputText, filename);
    return { api: isolated.exports, sourceHash: saved.sha256 };
  }
  async function calendarInput(x, label, createMonthlyPeriods = true) {
    const current = await db.accountingPeriod.findUniqueOrThrow({ where: { id: x.periodId } });
    const startDate = new Date(Date.UTC(current.startDate.getUTCFullYear(), current.startDate.getUTCMonth() + 2, 1));
    return { name: 'LOCAL SYNTHETIC catalog ' + label + ' ' + run, startDate, endDate: new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1) - 1), createMonthlyPeriods };
  }
  async function effects(x) {
    const where = { organizationId: x.organizationId }, rows = {};
    for (const model of ['fiscalYear', 'accountingPeriod', 'stockCountSession', 'businessEvent', 'businessEventOutbox', 'businessEventAudit', 'ledgerAuditEvent', 'auditLog', 'closeRun', 'closePackExport']) rows[model] = f.hash(await db[model].findMany({ where, orderBy: { id: 'asc' } }));
    return rows;
  }
  async function retained(fixture, invalidated) {
    for (const artifact of fixture.artifacts) {
      assert.equal(sha(fs.readFileSync(artifact.file)), artifact.bytesHash);
      const actual = await db.closePackExport.findUniqueOrThrow({ where: { id: artifact.row.id } });
      if (artifact.kind === 'draft' || !invalidated) assert.deepEqual(actual, artifact.row);
      else { const stable = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['metadata', 'updatedAt'].includes(key))); assert.deepEqual(stable(actual), stable(artifact.row)); assert.equal(actual.metadata?.staleState?.status, 'EVIDENCE_STALE'); }
    }
    return fixture.artifacts.map(artifact => ({ file: path.basename(artifact.file), bytesHash: artifact.bytesHash, id: artifact.row.id, kind: artifact.kind }));
  }
  async function replay(x, eventId) { const before = await effects(x); const result = await count.postStockCount({ ...postInput(x), correlationId: 'catalog-retry-' + run }); assert.equal(result.replayed, true); assert.equal(result.eventId, eventId); assert.deepEqual(await effects(x), before); return { eventId, noDuplicateEffects: true }; }
  // Observers pause actual calls, never replace database results or decisions.
  function route(x, writer, mode) {
    const context = new AsyncLocalStorage(), state = { held: deferred(), release: deferred(), attempt: deferred(), scopeHeld: deferred(), scopeRelease: deferred(), lanes: {}, events: [], scope: [], locked: [] };
    dbModule.db = new Proxy({}, { has(_obj, key) { return key in db; }, get(_obj, key) {
      const lane = context.getStore(), active = lane === 'count' ? writer : db;
      if (key !== '$transaction' || !lane) { const value = Reflect.get(active, key); return typeof value === 'function' ? value.bind(active) : value; }
      return (work, options) => active.$transaction(async tx => {
        state.lanes[lane] = { pid: await pid(tx) };
        const observed = new Proxy({}, { has(_tx, prop) { return prop in tx; }, get(_tx, prop) {
          if (prop === '$queryRaw') return async (...args) => {
            const text = args.map(value => value?.sql || value?.text || (Array.isArray(value) ? value.join('?') : '')).join(' ');
            let key; try { key = JSON.parse(args[0]?.values?.[0]); } catch { /* Unrelated raw query. */ }
            const catalog = key?.[0] === 'accounting-period-catalog' && key[1] === x.organizationId;
            if (catalog) { state.events.push({ lane, event: 'catalog-attempt' }); state.attempt.resolve(); }
            if (text.includes('FOR SHARE')) state.events.push({ lane, event: 'posting-row-attempt' });
            if (text.includes('FOR UPDATE') && text.includes('accounting_periods')) { state.events.push({ lane, event: 'close-row-attempt' }); state.attempt.resolve(); }
            const result = await tx.$queryRaw(...args);
            if (catalog) state.events.push({ lane, event: 'catalog-acquired' });
            if (key?.[0] === 'close-assessment-order' && lane === 'count') state.locked.push(key[2]);
            return result;
          };
          if (['accountingPeriod', 'businessEvent', 'closeRun', 'ledgerAuditEvent'].includes(prop)) return new Proxy({}, { get(_model, method) {
            return async (...args) => {
              const input = args[0];
              if (prop === 'businessEvent' && method === 'create' && lane === 'count' && input.data.eventType === 'inventory.physical_count.validated' && ['count-first', 'count-first-close'].includes(mode)) { state.held.resolve(); await bounded(state.release.promise, 'count source release'); }
              const value = await tx[prop][method](...args);
              if (prop === 'accountingPeriod' && method === 'findMany' && lane === 'count' && input.select?.id && input.where?.OR) {
                state.scope = value.map(row => row.id);
                if (mode === 'create-first') { state.scopeHeld.resolve(); await bounded(state.scopeRelease.promise, 'post-wait scope release'); }
              }
              if (prop === 'closeRun' && method === 'findMany' && lane === 'count' && input.select?.id && Object.keys(input.select).length === 1 && mode === 'baseline') { state.discovered = value.map(row => row.id); state.held.resolve(); await bounded(state.release.promise, 'baseline discovery release'); }
              if (prop === 'accountingPeriod' && method === 'createMany' && lane === 'create' && mode === 'create-first') { state.held.resolve(); await bounded(state.release.promise, 'creation commit release'); }
              if (prop === 'accountingPeriod' && method === 'update' && lane === 'close' && mode === 'close-first') { state.held.resolve(); await bounded(state.release.promise, 'close commit release'); }
              return value;
            };
          } });
          const value = Reflect.get(tx, prop); return typeof value === 'function' ? value.bind(tx) : value;
        } }); return work(observed);
      }, { ...options, timeout: 40000, maxWait: 10000 });
    } });
    return { state, run: (lane, work) => context.run(lane, work), restore: () => { dbModule.db = originalDb; } };
  }
  async function race(fixture, mode, old) {
    const { x } = fixture, writer = await client(), input = await calendarInput(x, mode), financial = await h.financial();
    const routed = route(x, writer, mode), { state } = routed; let posting, creating, assessment, before, proof, fiscal;
    const startPost = () => outcome(routed.run('count', () => (old?.api || count).postStockCount(postInput(x))));
    const startCreate = () => outcome(routed.run('create', () => periods.createFiscalYearWithPeriods(x.organizationId, input, x.makerId)));
    try {
      if (mode === 'create-first') creating = startCreate(); else posting = startPost();
      await bounded(state.held.promise, mode + ' first operation held');
      // The contender's attempt must be observed separately from the holder's.
      state.attempt = deferred();
      if (mode === 'create-first') posting = startPost(); else creating = startCreate();
      if (mode === 'baseline') {
        const result = await bounded(creating, 'baseline new period'); assert.equal(result.success, true, result.error); fiscal = result.value;
        before = await annex(x, fiscal.periods[0].id); assessment = await assess(x, fiscal.periods[0].id, mode);
        assert.ok(!state.discovered.includes(assessment.run.id)); state.release.resolve();
      } else {
        await bounded(state.attempt.promise, 'contender catalog attempt');
        proof = await blockers(state.lanes[mode === 'create-first' ? 'count' : 'create'].pid, state.lanes[mode === 'create-first' ? 'create' : 'count'].pid);
        if (mode === 'create-first') assert.equal(state.events.some(event => event.lane === 'count' && event.event === 'posting-row-attempt'), false);
        else assert.equal(await db.fiscalYear.count({ where: { organizationId: x.organizationId, name: input.name } }), 0);
        state.release.resolve();
        const result = await bounded(creating, 'new period creation commit'); assert.equal(result.success, true, result.error); fiscal = result.value;
        if (mode === 'create-first') { await bounded(state.scopeHeld.promise, 'post-wait period scope'); assert.ok(state.scope.includes(fiscal.periods[0].id)); before = await annex(x, fiscal.periods[0].id); assessment = await assess(x, fiscal.periods[0].id, mode); state.scopeRelease.resolve(); }
      }
      const posted = await bounded(posting, mode + ' count commit'); assert.equal(posted.success, true, posted.error); assert.equal(posted.value.countSession.status, 'POSTED'); assert.equal(posted.value.totalVarianceValue, '0.00'); assert.equal(posted.value.generatedAdjustmentId, undefined);
      if (!assessment) assessment = await assess(x, fiscal.periods[0].id, mode);
      const after = await annex(x, fiscal.periods[0].id), saved = await db.closeRun.findUniqueOrThrow({ where: { id: assessment.run.id } });
      const invalidations = (await db.businessEvent.findMany({ where: { organizationId: x.organizationId, eventType: 'close.certification.invalidated' } })).filter(event => event.payload?.closeRunId === saved.id);
      if (mode === 'baseline') { assert.notEqual(before.evidenceHash, after.evidenceHash); assert.equal(saved.metadata.inventoryValuationAnnex.sourceHash, before.evidenceHash); assert.notEqual(saved.metadata?.staleState?.status, 'EVIDENCE_STALE'); assert.equal(invalidations.length, 0); }
      if (mode === 'count-first') { assert.equal(saved.metadata.inventoryValuationAnnex.sourceHash, after.evidenceHash); assert.equal(invalidations.length, 0); }
      if (mode === 'create-first') { assert.ok(state.locked.includes(fiscal.periods[0].id)); assert.equal(saved.metadata?.staleState?.status, 'EVIDENCE_STALE'); assert.equal(invalidations.length, 1); }
      assert.equal((await h.financial()).hash, financial.hash);
      return { id: mode + '-catalog-period-discovery', status: 'passed', baselineSourceHash: old?.sourceHash || null, organizationId: x.organizationId, newPeriodId: fiscal.periods[0].id, assessmentStatus: saved.status, assessmentTrust: saved.metadata.trustLevel, storedHash: saved.metadata.inventoryValuationAnnex.sourceHash, currentHash: after.evidenceHash, invalidationCount: invalidations.length, blocking: proof || null, events: state.events, periodScope: state.scope, lockedPeriods: state.locked, retainedArtifacts: await retained(fixture, true), replay: await replay(x, posted.value.eventId), noFinancialEffects: true };
    } finally { state.release.resolve(); state.scopeRelease.resolve(); await Promise.allSettled([posting, creating].filter(Boolean)); routed.restore(); await writer.$disconnect(); }
  }
  async function creationRollback(fixture) {
    const { x } = fixture, before = await effects(x), input = await calendarInput(x, 'rollback'), fault = new Error('EXPLICIT VERIFIER FAULT after fiscal and monthly period writes'); let observed;
    dbModule.db = new Proxy({}, { has(_obj, key) { return key in db; }, get(_obj, key) {
      if (key !== '$transaction') { const value = Reflect.get(db, key); return typeof value === 'function' ? value.bind(db) : value; }
      return (work, options) => db.$transaction(async tx => work(new Proxy({}, { has(_tx, prop) { return prop in tx; }, get(_tx, prop) {
        if (prop === 'ledgerAuditEvent') return { ...tx.ledgerAuditEvent, create: async args => {
          assert.equal(args.data.action, 'FISCAL_YEAR_CREATE'); const year = await tx.fiscalYear.findUniqueOrThrow({ where: { id: args.data.resourceId }, include: { periods: true } }); assert.equal(year.periods.length, 1); observed = { pid: await pid(tx), yearId: year.id, periodId: year.periods[0].id }; throw fault;
        } };
        const value = Reflect.get(tx, prop); return typeof value === 'function' ? value.bind(tx) : value;
      } })), options);
    } });
    let failure; try { failure = await outcome(periods.createFiscalYearWithPeriods(x.organizationId, input, x.makerId)); } finally { dbModule.db = originalDb; }
    assert.equal(failure.success, false); assert.equal(failure.error, fault.message); assert.ok(observed); assert.deepEqual(await effects(x), before);
    const retry = await client(); let retryPid, year;
    dbModule.db = new Proxy({}, { has(_obj, key) { return key in retry; }, get(_obj, key) {
      if (key === '$transaction') return (work, options) => retry.$transaction(async tx => { retryPid = await pid(tx); assert.notEqual(retryPid, observed.pid); return work(tx); }, options);
      const value = Reflect.get(retry, key); return typeof value === 'function' ? value.bind(retry) : value;
    } });
    try { year = await bounded(periods.createFiscalYearWithPeriods(x.organizationId, input, x.makerId), 'creation retry'); } finally { dbModule.db = originalDb; await retry.$disconnect(); }
    assert.equal(year.periods.length, 1); assert.notEqual(year.id, observed.yearId); assert.equal(await db.fiscalYear.count({ where: { organizationId: x.organizationId, name: input.name } }), 1);
    assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.organizationId, action: 'FISCAL_YEAR_CREATE', resourceId: year.id } }), 1);
    return { id: 'creation-rollback-independent-retry', status: 'passed', observed, retryPid, fiscalYearId: year.id, noPartialEffects: true, retainedArtifacts: await retained(fixture, false) };
  }
  async function compatibleReaders(x, other) {
    const first = await client(), second = await client(), held = deferred(), release = deferred(), started = deferred(); let holderPid, contenderPid, holding, creating;
    try {
      holding = outcome(first.$transaction(async tx => { holderPid = await pid(tx); await lockAccountingPeriodCatalogInTx(tx, x.organizationId, 'shared'); held.resolve(); await bounded(release.promise, 'shared holder'); }));
      await bounded(held.promise, 'shared acquired');
      await bounded(second.$transaction(async tx => { await lockAccountingPeriodCatalogInTx(tx, x.organizationId, 'shared'); }), 'compatible shared reader');
      const otherYear = await bounded(periods.createFiscalYearWithPeriods(other.organizationId, await calendarInput(other, 'other-tenant'), other.makerId), 'other tenant creation'); assert.equal(otherYear.periods.length, 1);
      const input = await calendarInput(x, 'no-monthly', false);
      dbModule.db = new Proxy({}, { has(_obj, key) { return key in second; }, get(_obj, key) {
        if (key === '$transaction') return (work, options) => second.$transaction(async tx => { contenderPid = await pid(tx); started.resolve(); return work(tx); }, { ...options, timeout: 40000 });
        const value = Reflect.get(second, key); return typeof value === 'function' ? value.bind(second) : value;
      } });
      creating = outcome(periods.createFiscalYearWithPeriods(x.organizationId, input, x.makerId)); await bounded(started.promise, 'no-monthly started'); const proof = await blockers(contenderPid, holderPid);
      assert.equal(await db.fiscalYear.count({ where: { organizationId: x.organizationId, name: input.name } }), 0); release.resolve();
      const result = await bounded(creating, 'no-monthly completed'); assert.equal(result.success, true, result.error); assert.equal(result.value.periods.length, 0); assert.equal((await holding).success, true);
      return { id: 'shared-readers-tenant-independence-no-monthly', status: 'passed', compatibleReaders: true, otherTenantCreated: otherYear.id, noMonthlyYear: result.value.id, blocking: proof };
    } finally { release.resolve(); await Promise.allSettled([holding, creating].filter(Boolean)); dbModule.db = originalDb; await first.$disconnect(); await second.$disconnect(); }
  }
  async function closeContention(fixture, mode) {
    const { x } = fixture, writer = await client(), routed = route(x, writer, mode), { state } = routed; let posting, closing;
    const post = () => outcome(routed.run('count', () => count.postStockCount(postInput(x))));
    const closePeriod = () => outcome(routed.run('close', () => periods.closeAccountingPeriod(x.organizationId, x.periodId, x.info.actorIds.checker, { actorPermissions: ['accounting.period.close'], lastAuthAt: new Date() })));
    try {
      if (mode === 'close-first') closing = closePeriod(); else posting = post(); await bounded(state.held.promise, mode + ' hold'); state.attempt = deferred();
      if (mode === 'close-first') posting = post(); else closing = closePeriod(); await bounded(state.attempt.promise, mode + ' contender');
      const proof = await blockers(state.lanes[mode === 'close-first' ? 'count' : 'close'].pid, state.lanes[mode === 'close-first' ? 'close' : 'count'].pid); state.release.resolve();
      const posted = await bounded(posting, 'count settles'), closed = await bounded(closing, 'close settles');
      if (mode === 'close-first') { assert.equal(closed.success, true, closed.error); assert.equal(posted.success, false); assert.match(posted.error, /not open/i); assert.equal((await db.stockCountSession.findUniqueOrThrow({ where: { id: x.countSetup.countSessionId } })).status, 'SUBMITTED'); }
      else { assert.equal(posted.success, true, posted.error); assert.equal(closed.success, false); assert.match(closed.error, /current close assurance/); assert.equal((await db.accountingPeriod.findUniqueOrThrow({ where: { id: x.periodId } })).status, 'OPEN'); }
      return { id: mode + '-period-close-contention', status: 'passed', blocking: proof, countSucceeded: posted.success, periodCloseSucceeded: closed.success, refusal: posted.error || closed.error, retainedArtifacts: await retained(fixture, mode !== 'close-first') };
    } finally { state.release.resolve(); state.scopeRelease.resolve(); await Promise.allSettled([posting, closing].filter(Boolean)); routed.restore(); await writer.$disconnect(); }
  }
  async function main() {
    await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await d.outside();
    const fixtures = {}; for (const name of ['baseline', 'count-first', 'create-first', 'rollback', 'close-first', 'count-first-close', 'readers', 'other']) { fixtures[name] = await c.fixture('catalog-' + name); report.fixtures.push({ label: name, organizationId: fixtures[name].x.organizationId, periodId: fixtures[name].x.periodId, countSessionId: fixtures[name].x.countSetup.countSessionId }); }
    report.financialAfterSetup = await h.financial();
    report.checks.push(await race(fixtures.baseline, 'baseline', oldCount())); report.checks.push(await race(fixtures['count-first'], 'count-first')); report.checks.push(await race(fixtures['create-first'], 'create-first'));
    report.checks.push(await creationRollback(fixtures.rollback)); report.checks.push(await compatibleReaders(fixtures.readers.x, fixtures.other.x));
    report.checks.push(await closeContention(fixtures['close-first'], 'close-first')); report.checks.push(await closeContention(fixtures['count-first-close'], 'count-first-close'));
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); report.stack = f.safe(error.stack || error); }
    finally {
      dbModule.db = originalDb;
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await d.outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfter = await h.financial(); report.noOperationFinancialEffects = report.financialAfterSetup?.hash === report.financialAfter.hash; } catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.checks.length === 7 && report.checks.every(check => check.status === 'passed') && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'period-catalog-runtime-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.length, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects })); await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  if (require.main === module) runMain();
}
