// Authoring is inert. The coordinator releases the exact owned DB execution lane.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. --run requires coordinator release and reviewed source.');
} else {
  const manual = require('./manual-journal-posting-runtime.cjs');
  const recovery = require('./close-current-recovery-runtime.cjs'), d = recovery.d, h = d.h;
  const { f, db, root, helper, organizations } = h, { fs, path, crypto, assert } = f;
  const { PrismaClient, Prisma } = require('@prisma/client');
  const load = file => require(path.join(root, file));
  const { postJournalEntry } = load('services/accounting/posting.service.ts');
  const { getModuleCatalog, getModuleCatalogEntry } = load('services/modules/module-catalog.service.ts');
  const { lockModuleAdmissionPolicyInTx } = load('services/modules/module-admission.service.ts');
  const { lockCloseAssessmentOrderInTx } = load('services/accounting/close-assessment-order.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db, run = crypto.randomUUID();
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const files = [...new Set([__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])].sort();
  const sources = () => ({ ...manual.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const protectedModels = ['journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'inventoryTransaction', 'payment', 'supplierInvoice', 'supplierPayment', 'customerLedgerEntry', 'customerSettlement', 'ledgerAuditEvent', 'businessEvent', 'businessEventAudit', 'businessEventOutbox', 'closeRun', 'closeChecklistItem', 'closeEvidenceItem', 'closeAssuranceFinding', 'closePackExport'];
  const report = { run, at: new Date().toISOString(), checks: [], fixtures: [], scope: 'Actual postJournalEntry and persisted module authority on exact owned loopback PostgreSQL. No source/candidate injection, migrations, external effects or manufactured Close readiness.', limitations: [
    'Synthetic actors, permissions and grant fixtures test the internal service contract; they do not establish authenticated transport, subscription eligibility or commercial approval.',
    'Grant writers use the real module admission organization lock and persisted rows; this does not test a commercial provisioning workflow.',
    'This verifier covers module authority only. The separately retained earlier-period Close invalidation scope defect and rejected all-period candidate remain unresolved.',
    'Initial system-certified exports predate draft creation. Their immutable content is retained; no claim is made that draft creation currently invalidates all dependent Close evidence.',
    'The inherited fixture setup creates an actual balanced journal and READY/T4 assessment. Only subsequent documented synthetic manual postings are expected financial effects.',
  ] };
  function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
  async function bounded(promise, label, ms = 20000) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out; evidence is incomplete')), ms); })]); } finally { clearTimeout(timer); } }
  const outcome = promise => promise.then(value => ({ success: true, value }), error => ({ success: false, code: error.code, error: f.safe(error) }));
  async function guard(client = db) { await assertDisposableDatabaseIdentity(client, helper.database); await helper.withClient(f.target, helper.assertOwned); }
  async function client() { const value = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 45000, maxWait: 10000 } }); await guard(value); return value; }
  async function pid(tx) { const rows = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database'); assert.equal(rows[0].database, helper.database); return rows[0].pid; }
  async function blocking(waiterPid, holderPid) {
    assert.ok(waiterPid && holderPid && waiterPid !== holderPid);
    return helper.withClient(f.target, async pg => { await helper.assertOwned(pg); const until = Date.now() + 5000;
      do { const blockers = (await pg.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiterPid])).rows[0].blockers;
        if (blockers.includes(holderPid)) return { waiterPid, holderPid, blockers, observed: true };
        await new Promise(resolve => setTimeout(resolve, 35));
      } while (Date.now() < until); throw new Error('Actual PostgreSQL blocking relationship was not observed');
    });
  }
  async function outside() { const base = await recovery.outside(), extra = {};
    for (const model of [...new Set([...protectedModels, 'auditLog', 'tenantModuleConfigurationCommand'])]) extra[model] = f.hash(await db[model].findMany({ where: { organizationId: { notIn: organizations } }, orderBy: { id: 'asc' } }));
    return { hash: f.hash({ base, extra }), base, extra };
  }
  async function retained(x) {
    assert.equal(sha(fs.readFileSync(x.saved.file)), x.saved.hash);
    const current = await d.history(x);
    for (const name of ['evidence', 'checklist', 'findings']) assert.deepEqual(current[name], x.saved.history[name]);
    assert.equal(current.exports.length, x.saved.history.exports.length);
    const immutable = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['metadata', 'updatedAt'].includes(key)));
    for (const old of x.saved.history.exports) assert.deepEqual(immutable(current.exports.find(row => row.id === old.id)), immutable(old));
    return { exportId: x.saved.exportId, immutableExportHash: x.saved.hash, retainedHistoryHash: f.hash(current) };
  }
  async function fixture(label, draftCount = 1) {
    await guard(); let x = await manual.fixture('module-' + label);
    const exported = await recovery.certify(x), file = path.join(__dirname, 'manual-module-' + run + '-' + label + '-certified.json');
    fs.writeFileSync(file, exported.content, { flag: 'wx' });
    x = { ...x, saved: { exportId: exported.exportId, file, hash: sha(fs.readFileSync(file)), history: await d.history(x) } };
    const drafts = []; for (let index = 0; index < draftCount; index++) drafts.push(await manual.draft(x));
    report.fixtures.push({ label, organizationId: x.organizationId, periodId: x.periodId, initialRunId: x.closeRunId, exportId: exported.exportId, draftIds: drafts.map(value => value.draftId), actualSetup: x.info.setup });
    return { ...drafts[0], drafts };
  }
  async function installManaged(tx, x, empty = false) {
    const modules = getModuleCatalog().map(value => value.slug);
    await tx.tenantModuleConfiguration.create({ data: { organizationId: x.organizationId, manifestHash: 'owned-manual-module-' + run, selectedModules: modules, activeModules: modules } });
    if (!empty) await tx.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.organizationId, moduleSlug, status: 'active', source: 'requested_modules' })) });
  }
  async function mutate(x, work, connection = db) { assert.ok(organizations.includes(x.organizationId)); return connection.$transaction(async tx => { await lockModuleAdmissionPolicyInTx(tx, x.organizationId); return work(tx); }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }); }
  async function managed(x) { await mutate(x, tx => installManaged(tx, x)); }
  const grantKey = x => ({ organizationId_moduleSlug: { organizationId: x.organizationId, moduleSlug: 'accounting' } });
  async function setGrant(x, data) { return mutate(x, tx => tx.tenantModuleGrant.update({ where: grantKey(x), data })); }
  async function resetGrants(x) { const modules = getModuleCatalog().map(value => value.slug); await mutate(x, async tx => {
    for (const moduleSlug of modules) await tx.tenantModuleGrant.upsert({ where: { organizationId_moduleSlug: { organizationId: x.organizationId, moduleSlug } }, create: { organizationId: x.organizationId, moduleSlug, status: 'active', source: 'requested_modules' }, update: { status: 'active', readOnly: false, startsAt: null, endsAt: null } });
  }); }
  const audit = x => db.auditLog.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } });
  async function before(x) { return { protected: await manual.rows(x, protectedModels), audit: await audit(x) }; }
  async function unchanged(x, saved, expectedDenials = 1) {
    assert.deepEqual(await manual.rows(x, protectedModels), saved.protected);
    const current = await audit(x), oldIds = new Set(saved.audit.map(row => row.id));
    assert.deepEqual(current.filter(row => oldIds.has(row.id)), saved.audit);
    const added = current.filter(row => !oldIds.has(row.id)); assert.equal(added.length, expectedDenials);
    for (const row of added) { assert.equal(row.action, 'MODULE_ENTITLEMENT_ENFORCED'); assert.equal(row.changes?.moduleSlug, 'accounting'); assert.equal(row.changes?.allowed, false); assert.equal(row.changes?.rbacWildcardBypassedEntitlement, false); }
    return { noFinancialOrCloseEffects: true, protectedHash: f.hash(saved.protected), denialAuditIds: added.map(row => row.id), retained: await retained(x) };
  }
  function post(x, control = {}) { const at = new Date(); return postJournalEntry(x.organizationId, x.draftId, x.info.actorIds.checker, { actorPermissions: ['accounting.journal.post'], now: at, lastAuthAt: at, ...control }); }
  // Pause or fail actual calls; preserve their arguments/results and never supply a synthetic authority decision.
  function instrument(connection = db, options = {}) {
    const state = { events: [], grantReads: 0, organizationAttempt: deferred(), periodAttempt: deferred(), held: deferred(), release: deferred() };
    dbModule.db = new Proxy(connection, { get(target, property) {
      if (property !== '$transaction') { const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value; }
      return (work, transactionOptions) => target.$transaction(async tx => {
        assert.equal(transactionOptions?.isolationLevel, Prisma.TransactionIsolationLevel.ReadCommitted); state.pid = await pid(tx);
        const observed = new Proxy(tx, { get(clientTx, key) {
          if (key === '$queryRaw') return async (...args) => {
            const sql = args.map(arg => typeof arg === 'string' ? arg : arg?.sql || arg?.text || (Array.isArray(arg) ? arg.join('?') : '')).join(' ');
            let event;
            if (sql.includes('organizations') && sql.includes('FOR SHARE')) event = 'authority-organization';
            else if (sql.includes('tenant_module_configurations') && sql.includes('FOR SHARE')) event = 'authority-configuration';
            else if (sql.includes('tenant_module_grants') && sql.includes('FOR SHARE')) event = 'authority-grants';
            else if (sql.includes('journal_entries') && sql.includes('FOR UPDATE')) event = 'journal';
            for (const value of Array.isArray(args[0]?.values) ? args[0].values : args.slice(1)) {
              if (typeof value !== 'string') continue; try { const key = JSON.parse(value); if (key[0] === 'accounting-period-catalog') event = 'catalog'; else if (key[0] === 'close-assessment-order') event = 'period'; } catch { /* Ordinary parameter. */ }
            }
            if (event) { state.events.push({ event: event + '-attempt', at: Date.now() }); if (event === 'authority-organization') state.organizationAttempt.resolve(); if (event === 'period') state.periodAttempt.resolve(); }
            const value = await clientTx.$queryRaw(...args); if (event) state.events.push({ event: event + '-acquired', at: Date.now() }); return value;
          };
          if (key === 'tenantModuleGrant') return new Proxy(clientTx.tenantModuleGrant, { get(model, method) {
            if (method !== 'findMany') { const value = Reflect.get(model, method); return typeof value === 'function' ? value.bind(model) : value; }
            return async args => { const value = await model.findMany(args); state.grantReads++; state.events.push({ event: 'grant-read', number: state.grantReads, at: Date.now() }); if (state.grantReads === options.failGrantReadAt) throw new Error('OWNED_MODULE_READ_FAILURE_' + state.grantReads); return value; };
          } });
          if (key === 'ledgerPostingBatch') return new Proxy(clientTx.ledgerPostingBatch, { get(model, method) {
            if (method !== 'create') { const value = Reflect.get(model, method); return typeof value === 'function' ? value.bind(model) : value; }
            return async args => { if (options.holdBeforeBatch) { state.held.resolve(); await bounded(state.release.promise, 'posting held before batch'); } state.events.push({ event: 'financial-write', at: Date.now() }); return model.create(args); };
          } });
          const value = Reflect.get(clientTx, key); return typeof value === 'function' ? value.bind(clientTx) : value;
        } }); return work(observed);
      }, transactionOptions);
    } });
    return { state, restore() { dbModule.db = originalDb; } };
  }
  function initialOnly(state) { assert.equal(state.grantReads, 1); assert.equal(state.events.some(row => ['catalog-attempt', 'journal-attempt', 'financial-write'].includes(row.event)), false); }
  function fullOrder(state, writes = true) {
    const first = event => state.events.findIndex(row => row.event === event), lastRead = state.events.findLastIndex(row => row.event === 'grant-read');
    assert.ok(first('authority-organization-acquired') >= 0); assert.ok(first('authority-configuration-acquired') > first('authority-organization-acquired'));
    assert.ok(first('authority-grants-acquired') > first('authority-configuration-acquired')); assert.ok(first('catalog-attempt') > first('grant-read')); assert.ok(first('journal-attempt') > first('catalog-acquired'));
    assert.ok(lastRead > first('period-acquired')); assert.equal(state.grantReads, 2);
    if (writes) assert.ok(first('financial-write') > lastRead); else assert.equal(first('financial-write'), -1);
    return state.events;
  }
  async function observedPost(x, options = {}, control = {}, connection = db) { const observed = instrument(connection, options); try { return { result: await outcome(post(x, control)), state: observed.state }; } finally { observed.restore(); } }
  async function allow() {
    const x = await fixture('allow', 2); await managed(x); const firstBefore = await manual.rows(x), active = await observedPost(x); assert.equal(active.result.success, true, active.result.error); const activeDelta = await manual.delta(x, firstBefore); fullOrder(active.state);
    const retainedDraft = x.drafts[1]; const savedDraft = await db.journalEntry.findUniqueOrThrow({ where: { id: retainedDraft.draftId } });
    const cutoff = new Date(); assert.ok(savedDraft.createdAt <= cutoff); await mutate(x, tx => tx.tenantModuleConfiguration.update({ where: { organizationId: x.organizationId }, data: { newWorkStoppedModules: ['accounting'], newWorkStoppedAt: { accounting: cutoff.toISOString() } } }));
    const secondBefore = await manual.rows(x), stopped = await observedPost(retainedDraft); assert.equal(stopped.result.success, true, stopped.result.error); fullOrder(stopped.state);
    return { organizationId: x.organizationId, active: activeDelta, stoppedNewWorkRetainedDraft: await manual.delta(retainedDraft, secondBefore), cutoff, order: stopped.state.events, retained: await retained(x) };
  }
  async function denials() {
    const x = await fixture('denials'); await managed(x); const cases = [];
    const matrix = [
      ['missing-accounting-grant', tx => tx.tenantModuleGrant.delete({ where: grantKey(x) })],
      ['explicit-empty-grants', tx => tx.tenantModuleGrant.deleteMany({ where: { organizationId: x.organizationId } })],
      ['expired-interval', tx => tx.tenantModuleGrant.update({ where: grantKey(x), data: { endsAt: new Date(Date.now() - 1000) } })],
      ['future-interval', tx => tx.tenantModuleGrant.update({ where: grantKey(x), data: { startsAt: new Date(Date.now() + 3600000) } })],
      ['suspended', tx => tx.tenantModuleGrant.update({ where: grantKey(x), data: { status: 'suspended' } })],
      ['expired-status', tx => tx.tenantModuleGrant.update({ where: grantKey(x), data: { status: 'expired' } })],
      ['read-only-status', tx => tx.tenantModuleGrant.update({ where: grantKey(x), data: { status: 'read_only' } })],
      ['read-only-flag-with-wildcard', tx => tx.tenantModuleGrant.update({ where: grantKey(x), data: { readOnly: true } })],
    ];
    for (const [label, change] of matrix) { await resetGrants(x); await mutate(x, change); const saved = await before(x); let callbackCalled = false;
      const operation = await observedPost(x, {}, { actorPermissions: label.includes('wildcard') ? ['*', 'accounting.journal.post'] : ['accounting.journal.post'], assertCurrentAuthority: async () => { callbackCalled = true; } });
      assert.equal(operation.result.success, false); assert.equal(operation.result.code, 'FORBIDDEN'); assert.equal(callbackCalled, false); initialOnly(operation.state);
      cases.push({ label, refusal: operation.result, proof: await unchanged(x, saved), initialReadBeforeAccountingLocks: true });
    }
    await resetGrants(x); const restoredBefore = await manual.rows(x), restored = await observedPost(x);
    assert.equal(restored.result.success, true, restored.result.error); fullOrder(restored.state);
    return { organizationId: x.organizationId, cases, sameDraftAfterGrantRestoration: await manual.delta(x, restoredBefore), retained: await retained(x) };
  }
  async function readFailures() {
    const x = await fixture('read-failure'); await managed(x); const cases = [];
    for (const count of [1, 2]) { const saved = await before(x), operation = await observedPost(x, { failGrantReadAt: count }); assert.equal(operation.result.success, false); assert.match(operation.result.error, /OWNED_MODULE_READ_FAILURE/); assert.equal(operation.state.grantReads, count); if (count === 1) initialOnly(operation.state); else fullOrder(operation.state, false);
      cases.push({ failedRead: count, refusal: operation.result, proof: await unchanged(x, saved, 0) });
    }
    return { organizationId: x.organizationId, cases };
  }
  async function writerFirst(legacy = false) {
    const x = await fixture(legacy ? 'legacy-transition' : 'writer-first'); if (!legacy) await managed(x);
    else { assert.equal(await db.tenantModuleConfiguration.count({ where: { organizationId: x.organizationId } }), 0); assert.equal(await db.tenantModuleGrant.count({ where: { organizationId: x.organizationId } }), 0); }
    const saved = await before(x), writer = await client(), poster = await client(), held = deferred(), release = deferred(); let write, operation, writerPid; const route = instrument(poster);
    try { write = writer.$transaction(async tx => { writerPid = await pid(tx); await lockModuleAdmissionPolicyInTx(tx, x.organizationId); if (legacy) await installManaged(tx, x, true); else await tx.tenantModuleGrant.update({ where: grantKey(x), data: { status: 'read_only' } }); held.resolve(); await bounded(release.promise, 'module writer release'); }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
      await bounded(held.promise, 'module writer acquired authority'); operation = outcome(post(x)); await bounded(route.state.organizationAttempt.promise, 'posting authority attempt'); const wait = await blocking(route.state.pid, writerPid); assert.deepEqual(await manual.rows(x, protectedModels), saved.protected);
      release.resolve(); await write; const result = await bounded(operation, 'posting after committed module withdrawal'); assert.equal(result.success, false); assert.equal(result.code, 'FORBIDDEN'); initialOnly(route.state);
      return { organizationId: x.organizationId, wait, transition: legacy ? 'legacy-to-managed-empty' : 'active-to-read-only', refusal: result, proof: await unchanged(x, saved), order: route.state.events };
    } finally { release.resolve(); await Promise.allSettled([write, operation].filter(Boolean)); route.restore(); await Promise.all([writer.$disconnect(), poster.$disconnect()]); }
  }
  async function postingFirst() {
    const x = await fixture('posting-first', 2); await managed(x); const saved = await manual.rows(x), writer = await client(), poster = await client(), attempt = deferred(); let write, operation, writerPid; const route = instrument(poster, { holdBeforeBatch: true });
    try { operation = outcome(post(x)); await bounded(route.state.held.promise, 'posting holds authority before financial write');
      write = writer.$transaction(async tx => { writerPid = await pid(tx); attempt.resolve(); await lockModuleAdmissionPolicyInTx(tx, x.organizationId); await tx.tenantModuleGrant.update({ where: grantKey(x), data: { status: 'suspended' } }); }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
      await attempt.promise; const wait = await blocking(writerPid, route.state.pid); assert.deepEqual(await manual.rows(x), saved); route.state.release.resolve(); const result = await bounded(operation, 'posting commit before withdrawal'); assert.equal(result.success, true, result.error); await write; fullOrder(route.state); const delta = await manual.delta(x, saved); route.restore();
      const second = x.drafts[1], beforeDenied = await before(second), denied = await observedPost(second); assert.equal(denied.result.success, false); assert.equal(denied.result.code, 'FORBIDDEN'); initialOnly(denied.state);
      return { organizationId: x.organizationId, wait, postingDelta: delta, order: route.state.events, laterRefusal: denied.result, laterProof: await unchanged(second, beforeDenied) };
    } finally { route.state.release.resolve(); await Promise.allSettled([operation, write].filter(Boolean)); route.restore(); await Promise.all([writer.$disconnect(), poster.$disconnect()]); }
  }
  async function expiresWhileWaiting() {
    const x = await fixture('expiry-wait'); await managed(x); const saved = await before(x), holder = await client(), poster = await client(), ready = deferred(), release = deferred(); let holding, operation, holderPid; const route = instrument(poster);
    try { holding = holder.$transaction(async tx => { holderPid = await pid(tx); await lockCloseAssessmentOrderInTx(tx, x.organizationId, x.periodId); ready.resolve(); await bounded(release.promise, 'period holder release'); }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }); await ready.promise;
      const endsAt = new Date(Date.now() + 6000); await setGrant(x, { endsAt }); operation = outcome(post(x)); await bounded(route.state.periodAttempt.promise, 'posting waits after initial module admission'); const wait = await blocking(route.state.pid, holderPid); assert.equal(route.state.grantReads, 1); assert.ok(Date.now() < endsAt.getTime(), 'Initial module admission must precede actual expiry');
      await new Promise(resolve => setTimeout(resolve, Math.max(0, endsAt.getTime() + 50 - Date.now()))); release.resolve(); await holding; const result = await bounded(operation, 'expired module refusal'); assert.equal(result.success, false); assert.equal(result.code, 'FORBIDDEN'); fullOrder(route.state, false);
      return { organizationId: x.organizationId, wait, endsAt, refusal: result, proof: await unchanged(x, saved), order: route.state.events };
    } finally { release.resolve(); await Promise.allSettled([holding, operation].filter(Boolean)); route.restore(); await Promise.all([holder.$disconnect(), poster.$disconnect()]); }
  }
  async function expiresInCallback() {
    const x = await fixture('expiry-callback'); await managed(x); const saved = await before(x), endsAt = new Date(Date.now() + 5000); await setGrant(x, { endsAt }); let callback = null;
    const operation = await observedPost(x, {}, { assertCurrentAuthority: async () => { callback = { enteredAt: new Date().toISOString() }; assert.ok(Date.now() < endsAt.getTime()); await new Promise(resolve => setTimeout(resolve, Math.max(0, endsAt.getTime() + 50 - Date.now()))); callback.returnedAt = new Date().toISOString(); } });
    assert.ok(callback); assert.equal(operation.result.success, false); assert.equal(operation.result.code, 'FORBIDDEN'); fullOrder(operation.state, false); assert.ok(operation.state.events.findLast(row => row.event === 'grant-read').at >= Date.parse(callback.returnedAt));
    return { organizationId: x.organizationId, endsAt, callback, refusal: operation.result, proof: await unchanged(x, saved), order: operation.state.events };
  }
  async function foreignWriter() {
    const x = await fixture('tenant-a'), foreign = await fixture('tenant-b'); await managed(x); await managed(foreign);
    const saved = await manual.rows(x), foreignSaved = await before(foreign), writer = await client(), poster = await client(), held = deferred(), release = deferred(); let write, writerPid, writerCommitted = false; const route = instrument(poster);
    try { write = writer.$transaction(async tx => { writerPid = await pid(tx); await lockModuleAdmissionPolicyInTx(tx, foreign.organizationId); await tx.tenantModuleGrant.update({ where: grantKey(foreign), data: { status: 'suspended' } }); held.resolve(); await bounded(release.promise, 'foreign writer release'); }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }).then(() => { writerCommitted = true; });
      await bounded(held.promise, 'foreign authority held'); let callbackWaiters;
      const result = await bounded(outcome(post(x, { assertCurrentAuthority: async () => { assert.equal(writerCommitted, false); callbackWaiters = await helper.withClient(f.target, async pg => { await helper.assertOwned(pg); return (await pg.query('SELECT pg_blocking_pids($1::integer) AS blockers', [route.state.pid])).rows[0].blockers; }); assert.deepEqual(callbackWaiters, []); } })), 'unrelated tenant posting completes before foreign release');
      assert.equal(result.success, true, result.error); assert.equal(writerCommitted, false); assert.notEqual(route.state.pid, writerPid); fullOrder(route.state); const delta = await manual.delta(x, saved);
      release.resolve(); await write; return { organizationId: x.organizationId, foreignOrganizationId: foreign.organizationId, holderPid: writerPid, posterPid: route.state.pid, blockersDuringCallback: callbackWaiters, completedBeforeForeignRelease: true, postingDelta: delta, foreignProof: await unchanged(foreign, foreignSaved, 0), retained: await retained(x) };
    } finally { release.resolve(); await Promise.allSettled([write].filter(Boolean)); route.restore(); await Promise.all([writer.$disconnect(), poster.$disconnect()]); }
  }
  async function check(id, work) { const started = Date.now(), start = organizations.length;
    try { report.checks.push({ id, status: 'passed', elapsedMs: Date.now() - started, ...await work() }); report.checks.at(-1).elapsedMs = Date.now() - started; }
    catch (error) { report.checks.push({ id, status: 'failed', elapsedMs: Date.now() - started, error: f.safe(error), stack: f.safe(error.stack || error), failureKind: error.prerequisite ? 'prerequisite-blocked' : 'verification-failed', prerequisite: error.prerequisite }); }
    report.checks.at(-1).ownedFixtureOrganizations = organizations.slice(start); const last = report.checks.at(-1); console.log(JSON.stringify({ id: last.id, status: last.status, elapsedMs: last.elapsedMs, error: last.error }));
  }
  async function main() {
    await guard(); report.sourcesBefore = sources(); report.outsideBefore = await outside();
    const dependencies = getModuleCatalogEntry('accounting').dependencies.filter(value => value.dependencyType === 'required'); assert.deepEqual(dependencies, []);
    report.dependencyDenial = { status: 'not-applicable', reason: 'The actual accounting catalogue has no required module dependencies. No synthetic dependency was added.' };
    await check('active-and-stopped-new-work-retained-draft-allowed', allow);
    await check('missing-empty-expired-future-suspended-read-only-denied', denials);
    await check('initial-and-final-authority-read-failure-no-effects', readFailures);
    await check('module-writer-first-posting-sees-committed-withdrawal', () => writerFirst(false));
    await check('posting-first-module-writer-waits-for-commit', postingFirst);
    await check('finite-grant-expiry-during-real-period-wait', expiresWhileWaiting);
    await check('finite-grant-expiry-during-authority-callback', expiresInCallback);
    await check('legacy-to-managed-empty-publication-before-posting', () => writerFirst(true));
    await check('foreign-tenant-authority-writer-does-not-block-posting', foreignWriter);
  }
  async function runMain() { try { await main(); } catch (error) { report.error = f.safe(error); }
    finally { dbModule.db = originalDb; try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; } catch (error) { report.finalizationError = f.safe(error); }
      try { await db.$disconnect(); } catch (error) { report.disconnectError = f.safe(error); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && !report.disconnectError && report.checks.length === 9 && report.checks.every(value => value.status === 'passed') && report.sourceStable && report.outsideUnchanged;
      const file = path.join(__dirname, 'manual-posting-module-runtime-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.length, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, error: report.error })); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { sources };
  if (require.main === module) runMain();
}
