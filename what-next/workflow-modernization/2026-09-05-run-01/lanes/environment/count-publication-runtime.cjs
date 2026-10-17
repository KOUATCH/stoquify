// Prepared only. The coordinator releases this exact source and owned DB lane.
// Historical source is loaded in a private module; source files/cache stay intact.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only; --run requires source freeze and the guarded owned database.');
} else {
  const d = require('./close-denial-recovery-runtime.cjs'), h = d.h;
  const { f, db, root, helper, organizations } = h, { fs, path, crypto, assert } = f;
  const { PrismaClient } = require('@prisma/client'), { AsyncLocalStorage } = require('node:async_hooks');
  const load = file => require(path.join(root, file));
  const count = load('services/inventory/inventory-count.service.ts'), close = load('services/accounting/close-assurance.service.ts');
  const pack = load('services/accounting/close-assurance-pack.service.ts');
  const { reconcileInventoryClass3 } = load('services/inventory/inventory-reconciliation.service.ts');
  const { createFiscalYearWithPeriods } = load('services/accounting/periods.service.ts');
  const { createManualJournalEntry } = load('services/accounting/journals.service.ts');
  const { postJournalEntry } = load('services/accounting/posting.service.ts');
  const { getAccountantPortalData } = load('services/accounting/data-trust.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db, run = crypto.randomUUID();
  const baselineFile = path.join(root, 'what-next/workflow-modernization/2026-09-05-run-01/evidence/count-publication-before-95fa0a2e-ff74-4daa-9aa0-c36306088bdf.json');
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const files = [__filename, baselineFile, ...[
    'services/inventory/inventory-count.service.ts', 'services/inventory/inventory-close-invalidation.service.ts',
    'services/inventory/inventory-reconciliation.service.ts', 'services/accounting/close-assessment-order.service.ts',
    'services/accounting/close-assurance.service.ts', 'services/accounting/close-assurance-pack.service.ts',
    'services/accounting/periods.service.ts', 'services/events/business-event.service.ts',
  ].map(file => path.join(root, file))];
  const sources = () => ({ ...d.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), checks: [], fixtures: [],
    scope: 'Owned disposable loopback PostgreSQL. Actual zero-variance count submission/posting, actual Close collectors and period publication. A hash-verified historical count implementation reproduces the discovery gap in memory; current collaborators remain unchanged. Fixed races require actual backend blocker proof. Retained exports, retry, inherited isolation refusal and cumulative later/no-run period coverage are observed. An explicit test-only discovery failure after actual POSTED/APPLIED writes verifies transaction rollback and independent-connection retry.',
    limitations: ['Synthetic count sheets and independent test actors exercise real controls; they are not customer or statutory approvals.',
      'Balanced synthetic journals and fiscal-period creation are fixture setup only; operation financial fingerprints start afterwards.',
      'The fence covers existing affected accounting periods. Concurrent creation of a previously nonexistent accounting period is outside this verifier and the selected fix.',
      'Only zero-variance physical-count publication participates in this new fence. No assertion about every inventory producer or every source writer is made.',
      'No migrations, seed commands, notification workers, browser response mocks, external delivery or production effects.'] };
  function baseline() {
    const receipt = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    const row = receipt.files.find(file => file.path === 'services/inventory/inventory-count.service.ts'); assert.ok(row);
    const bytes = Buffer.from(row.base64, 'base64'); assert.equal(sha(bytes), row.sha256);
    assert.equal(row.sha256, 'da16c2c3ad3e24b79d817488df2e6fa4c43a32234ab3ddff40ad4a8bfe500279');
    const ts = require('typescript'), Module = require('node:module'), filename = path.join(root, row.path);
    const compiled = ts.transpileModule(bytes.toString('utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
    const isolated = new Module(filename, module); isolated.filename = filename; isolated.paths = Module._nodeModulePaths(path.dirname(filename));
    isolated._compile(compiled.outputText, filename);
    return { api: isolated.exports, sourceHash: row.sha256 };
  }
  const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; };
  async function bounded(work, label, milliseconds = 25000) { let timer; try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out; race unverified')), milliseconds); })]); } finally { clearTimeout(timer); } }
  const outcome = promise => promise.then(value => ({ success: true, value }), error => ({ success: false, code: error.code, error: f.safe(error) }));
  async function pid(tx) { const rows = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database'); assert.equal(rows[0].database, helper.database); return rows[0].pid; }
  async function blockers(waiterPid, holderPid, expected) {
    assert.notEqual(waiterPid, holderPid);
    return helper.withClient(f.target, async client => { await helper.assertOwned(client); const until = Date.now() + 5000;
      do { const value = (await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiterPid])).rows[0].blockers;
        if (value.includes(holderPid) === expected) return { waiterPid, holderPid, blockers: value, expectedBlocked: expected, observed: true };
        await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < until);
      throw new Error('PostgreSQL did not show the expected publication ordering'); });
  }
  const create = (x, label) => close.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'count-publication-' + label + '-' + run }, { actorId: x.makerId, actorPermissions: ['accounting.close.run'] });
  const annex = x => reconcileInventoryClass3({ organizationId: x.organizationId, periodId: x.periodId, currency: 'XAF' }, db);
  const postInput = x => ({ organizationId: x.organizationId, countSessionId: x.countSetup.countSessionId,
    approvedById: x.countSetup.approvedById, countSheetHash: x.countSetup.countSheetHash, idempotencyKey: 'count-publication-' + x.countSetup.countSessionId,
    correlationId: 'count-publication-' + run, ...(x.occurredAt ? { occurredAt: x.occurredAt } : {}) });
  async function history(x) {
    const where = { organizationId: x.organizationId, closeRunId: x.closeRunId }, rows = {};
    for (const model of ['closeEvidenceItem', 'closeChecklistItem', 'closeAssuranceFinding']) rows[model] = f.hash(await db[model].findMany({ where, orderBy: { id: 'asc' } }));
    return f.hash(rows);
  }
  async function effects(x) {
    const where = { organizationId: x.organizationId }, rows = {};
    for (const model of ['stockCountSession', 'closeRun', 'closePackExport', 'closeEvidenceItem', 'closeChecklistItem', 'closeAssuranceFinding', 'businessEvent', 'businessEventOutbox', 'businessEventAudit', 'ledgerAuditEvent', 'auditLog'])
      rows[model] = f.hash(await db[model].findMany({ where, orderBy: { id: 'asc' } }));
    rows.lines = f.hash(await db.stockCountLine.findMany({ where: { stockCountSession: where }, orderBy: { id: 'asc' } }));
    return { hash: f.hash(rows), rows };
  }
  async function exportsFor(x, label) {
    const draft = await pack.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'DRAFT_NOT_CERTIFIED' }, { actorId: x.certifierId, actorPermissions: ['accounting.close.export'] });
    const at = new Date(), certified = await pack.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'CERTIFIED' }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: at, now: at });
    assert.equal(certified.isCertified, true);
    const artifacts = [];
    for (const [kind, result] of [['draft', draft], ['certified', certified]]) {
      const file = path.join(__dirname, 'count-publication-' + run + '-' + label + '-' + kind + '.json');
      fs.writeFileSync(file, result.content, { flag: 'wx' });
      artifacts.push({ kind, file, bytesHash: sha(fs.readFileSync(file)), row: await db.closePackExport.findUniqueOrThrow({ where: { id: result.exportId } }) });
    }
    return artifacts;
  }
  async function verifyExports(artifacts, invalidated) {
    for (const artifact of artifacts) {
      assert.equal(sha(fs.readFileSync(artifact.file)), artifact.bytesHash);
      const row = await db.closePackExport.findUniqueOrThrow({ where: { id: artifact.row.id } });
      if (artifact.kind === 'draft' || !invalidated) assert.deepEqual(row, artifact.row);
      else {
        const stable = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['metadata', 'updatedAt'].includes(key)));
        assert.deepEqual(stable(row), stable(artifact.row));
        assert.equal(row.metadata?.staleState?.status, 'EVIDENCE_STALE');
      }
    }
  }
  async function extraPeriod(x, offset) {
    const current = await db.accountingPeriod.findUniqueOrThrow({ where: { id: x.periodId } });
    const start = new Date(Date.UTC(current.startDate.getUTCFullYear(), current.startDate.getUTCMonth() + offset, 1)), end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1) - 1);
    const year = await createFiscalYearWithPeriods(x.organizationId, { name: 'Synthetic count publication period ' + offset, startDate: start, endDate: end }, x.makerId);
    const period = year.periods[0], original = await db.journalEntry.findUniqueOrThrow({ where: { id: x.info.setup.journalEntryId }, include: { lines: true } });
    const entry = await createManualJournalEntry(x.organizationId, { journalId: original.journalId, entryDate: new Date(start.getTime() + 43200000), memo: 'LOCAL SYNTHETIC period readiness setup only; no customer funds',
      lines: original.lines.map(line => ({ accountId: line.accountId, debit: line.debit.toString(), credit: line.credit.toString(), currency: line.currency })) }, x.makerId);
    const at = new Date(); await postJournalEntry(x.organizationId, entry.id, x.info.actorIds.checker, { actorPermissions: ['accounting.journal.post'], lastAuthAt: at, now: at });
    const portal = await getAccountantPortalData({ organizationId: x.organizationId, periodId: period.id }, db, new Date()); assert.equal(portal.certificate.level, 'T4', 'Actual additional period trust is required');
    return { ...x, periodId: period.id, period, setupJournalId: entry.id };
  }
  async function fixture(label, cumulative = false) {
    let x = await d.prepareFixture('count-publication-' + label); const result = { label, x };
    if (cumulative) {
      result.earlier = await extraPeriod(x, -1); result.later = await extraPeriod(x, 1); result.noRun = await extraPeriod(x, 2);
      result.earlier = await d.assessment(result.earlier, label + '-earlier'); result.later = await d.assessment(result.later, label + '-later');
      x = await d.assessment(x, label + '-current'); result.x = x;
      assert.equal(await db.closeRun.count({ where: { organizationId: x.organizationId, periodId: result.noRun.periodId } }), 0);
      result.later.artifacts = await exportsFor(result.later, label + '-later'); result.later.history = await history(result.later);
      result.earlier.before = await db.closeRun.findUniqueOrThrow({ where: { id: result.earlier.closeRunId } }); result.earlier.history = await history(result.earlier);
      // Deliberately separate source countDate from its validated event date.
      // Both are real service inputs; the earliest date must cover both scopes.
      x.occurredAt = new Date(result.later.period.startDate.getTime() + 43200000);
    }
    result.artifacts = await exportsFor(x, label + '-current'); result.history = await history(x);
    report.fixtures.push({ label, organizationId: x.organizationId, countSessionId: x.countSetup.countSessionId, originalRunId: x.closeRunId,
      currentPeriodId: x.periodId, laterPeriodId: result.later?.periodId, firstAssessmentPeriodId: result.noRun?.periodId,
      excludedEarlierPeriodId: result.earlier?.periodId, grantOrApproval: 'Independent synthetic actors only',
      setupJournalIds: [x.info.setup.journalEntryId, result.earlier?.setupJournalId, result.later?.setupJournalId, result.noRun?.setupJournalId].filter(Boolean) });
    return result;
  }
  // These observers only pause real operations. They never replace read results,
  // statuses, timestamps, service decisions or database isolation semantics.
  function routing(x, target, writer, mode) {
    const context = new AsyncLocalStorage(), state = { events: [], lockedPeriods: [], release: deferred(), collectors: deferred(), held: deferred(), attempt: deferred(), published: deferred(), producer: {}, creator: {} };
    dbModule.db = new Proxy({}, {
      has(_facade, property) { return property in (context.getStore() === 'producer' ? writer : db); },
      get(_facade, property) {
        const lane = context.getStore(), client = lane === 'producer' ? writer : db;
        if (property !== '$transaction' || !lane) { const value = Reflect.get(client, property); return typeof value === 'function' ? value.bind(client) : value; }
        return async (work, options) => {
          if (state[lane].observed || typeof work !== 'function') return client.$transaction(work, options);
          state[lane].observed = true; let published;
          const result = await client.$transaction(async tx => {
            state[lane].pid = await pid(tx); if (mode !== 'baseline' || lane === 'creator') assert.equal(options?.isolationLevel, 'ReadCommitted');
            const observed = new Proxy({}, { has(_txFacade, key) { return key in tx; }, get(_txFacade, key) {
              if (key === '$queryRaw') return async (...args) => {
                const sql = args.map(value => typeof value === 'string' ? value : value?.sql || value?.text || value?.strings?.join('?') || '').join(' ');
                let parsed; if (sql.includes('pg_advisory_xact_lock')) { try { parsed = JSON.parse(args[0]?.values?.[0]); } catch { /* Other lock families are unchanged. */ } }
                const periodId = Array.isArray(parsed) && parsed[0] === 'close-assessment-order' && parsed[1] === x.organizationId ? parsed[2] : null;
                if (periodId) { state.events.push({ lane, event: 'period-lock-attempt', periodId, at: Date.now() });
                  if (periodId === target.periodId && (mode === 'producer-first' ? lane === 'creator' : mode === 'creator-first' && lane === 'producer')) state.attempt.resolve(); }
                const rows = await tx.$queryRaw(...args);
                if (periodId) { state.events.push({ lane, event: 'period-lock-acquired', periodId, at: Date.now() }); if (lane === 'producer') state.lockedPeriods.push(periodId); }
                return rows;
              };
              if (key === 'closeRun') return new Proxy({}, { get(_model, method) {
                if (method === 'create') return async args => {
                  const row = await tx.closeRun.create(args);
                  if (lane === 'creator' && args.data.status === 'RUNNING' && args.data.organizationId === x.organizationId && args.data.periodId === target.periodId) {
                    published = row; state.events.push({ lane, event: 'running-inserted', runId: row.id, at: Date.now() });
                    if (mode === 'creator-first') { state.held.resolve(); await bounded(state.release.promise, 'creator publication release'); }
                  } return row;
                };
                if (method === 'findMany') return async args => {
                  const rows = await tx.closeRun.findMany(args);
                  if (lane === 'producer' && args.where?.organizationId === x.organizationId && args.select?.id === true && Object.keys(args.select).length === 1) {
                    state.discoveredRunIds = rows.map(row => row.id); state.events.push({ lane, event: 'target-discovery', ids: state.discoveredRunIds, at: Date.now() });
                    if (mode === 'baseline') { state.held.resolve(); await bounded(state.release.promise, 'historical target discovery release'); }
                  } return rows;
                };
                const value = Reflect.get(tx.closeRun, method); return typeof value === 'function' ? value.bind(tx.closeRun) : value;
              } });
              if (key === 'businessEvent') return new Proxy({}, { get(_model, method) {
                if (method === 'create') return async args => {
                  if (lane === 'producer' && args.data.eventType === 'inventory.physical_count.validated') {
                    state.events.push({ lane, event: 'first-count-source-write-attempt', at: Date.now() });
                    if (mode === 'producer-first') { state.held.resolve(); await bounded(state.release.promise, 'producer source-write release'); }
                  } return tx.businessEvent.create(args);
                };
                const value = Reflect.get(tx.businessEvent, method); return typeof value === 'function' ? value.bind(tx.businessEvent) : value;
              } });
              const value = Reflect.get(tx, key); return typeof value === 'function' ? value.bind(tx) : value;
            } }); return work(observed);
          }, { ...options, timeout: 40000, maxWait: 10000 });
          if (published) { state.events.push({ lane, event: 'running-committed', runId: published.id, at: Date.now() }); state.published.resolve(published);
            if (mode === 'creator-first') await bounded(state.collectors.promise, 'creator collector release'); }
          return result;
        };
      },
    });
    return { state, run: (lane, work) => context.run(lane, work), restore: () => { dbModule.db = originalDb; } };
  }
  async function retries(x, eventId) {
    const before = await effects(x), financial = await h.financial();
    const result = await count.postStockCount({ ...postInput(x), correlationId: 'count-publication-retry-' + run });
    assert.equal(result.replayed, true); assert.equal(result.eventId, eventId); assert.equal(result.varianceLineCount, 0);
    assert.deepEqual(await effects(x), before); assert.equal((await h.financial()).hash, financial.hash);
    return { sameEventId: eventId, noDuplicateEffects: true, changedRetryCorrelation: true };
  }
  async function executeRace(fixture, mode, old) {
    const { x } = fixture, target = fixture.noRun || x;
    const before = await annex(target), financial = await h.financial(); assert.equal(before.status, 'PASSED');
    const writer = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 40000, maxWait: 10000 } });
    await assertDisposableDatabaseIdentity(writer, helper.database);
    const route = routing(x, target, writer, mode), { state } = route; let producer, creator, waitProof;
    const startProducer = () => outcome(route.run('producer', () => (old?.api || count).postStockCount(postInput(x))));
    const startCreator = () => outcome(route.run('creator', () => create(target, mode)));
    try {
      if (mode === 'creator-first') creator = startCreator(); else producer = startProducer();
      await bounded(state.held.promise, mode + ' actual hold');
      if (mode === 'creator-first') producer = startProducer(); else creator = startCreator();
      if (mode === 'baseline') {
        const completed = await bounded(creator, 'historical-gap creator completion'); assert.equal(completed.success, true, completed.error);
        assert.equal(completed.value.run.status, 'READY'); assert.equal(completed.value.source.trustLevel, 'T4');
        state.created = completed.value; assert.ok(!state.discoveredRunIds.includes(completed.value.run.id));
        const persisted = await db.closeRun.findUniqueOrThrow({ where: { id: completed.value.run.id } });
        assert.equal(persisted.metadata.inventoryValuationAnnex.sourceHash, before.evidenceHash);
        waitProof = await blockers(state.creator.pid, state.producer.pid, false);
        state.release.resolve();
      } else {
        await bounded(state.attempt.promise, mode + ' contender attempts common period lock');
        waitProof = await blockers(mode === 'producer-first' ? state.creator.pid : state.producer.pid, mode === 'producer-first' ? state.producer.pid : state.creator.pid, true);
        if (mode === 'producer-first') {
          assert.ok(state.lockedPeriods.includes(target.periodId), 'The fence includes a period with no prior Close run');
          assert.equal(state.events.some(event => event.event === 'running-inserted'), false);
          assert.equal(await db.businessEvent.count({ where: { organizationId: x.organizationId, sourceId: x.countSetup.countSessionId, eventType: 'inventory.physical_count.validated' } }), 0);
          assert.equal((await db.stockCountSession.findUniqueOrThrow({ where: { id: x.countSetup.countSessionId } })).status, 'SUBMITTED');
        }
        state.release.resolve();
      }
      const posted = await bounded(producer, mode + ' count commit'); assert.equal(posted.success, true, posted.error);
      assert.equal(posted.value.countSession.status, 'POSTED'); assert.equal(posted.value.varianceLineCount, 0); assert.equal(posted.value.totalVarianceValue, '0.00'); assert.equal(posted.value.generatedAdjustmentId, undefined);
      assert.equal((await db.businessEvent.findUniqueOrThrow({ where: { id: posted.value.eventId } })).status, 'APPLIED');
      if (mode === 'creator-first') {
        const published = await bounded(state.published.promise, 'creator publication committed'); assert.ok(state.discoveredRunIds.includes(published.id));
        const blocked = await db.closeRun.findUniqueOrThrow({ where: { id: published.id } }); assert.equal(blocked.status, 'BLOCKED'); assert.equal(blocked.metadata?.staleState?.status, 'EVIDENCE_STALE');
        state.collectors.resolve();
      }
      const created = state.created ? { success: true, value: state.created } : await bounded(creator, mode + ' actual collectors finish');
      assert.equal(created.success, true, created.error); const selected = await db.closeRun.findUniqueOrThrow({ where: { id: created.value.run.id } });
      const after = await annex(target); assert.equal(after.status, 'PASSED'); assert.notEqual(after.evidenceHash, before.evidenceHash);
      assert.equal(after.inventoryValue, before.inventoryValue); assert.equal(after.ledgerClass3Value, before.ledgerClass3Value);
      const selectedInvalidations = (await db.businessEvent.findMany({ where: { organizationId: x.organizationId, eventType: 'close.certification.invalidated' } }))
        .filter(event => event.payload?.closeRunId === selected.id);
      if (mode === 'baseline') {
        assert.equal(selected.status, 'READY'); assert.notEqual(selected.metadata?.staleState?.status, 'EVIDENCE_STALE');
        assert.notEqual(selected.metadata.inventoryValuationAnnex.sourceHash, after.evidenceHash); assert.equal(selectedInvalidations.length, 0);
      } else if (mode === 'producer-first') {
        assert.equal(selected.status, 'READY'); assert.equal(selected.metadata.trustLevel, 'T4'); assert.equal(selected.metadata.inventoryValuationAnnex.sourceHash, after.evidenceHash);
        assert.equal(selectedInvalidations.length, 0); assert.deepEqual(state.lockedPeriods, [...new Set(state.lockedPeriods)].sort());
      } else {
        assert.equal(selected.status, 'BLOCKED'); assert.equal(selected.metadata?.staleState?.status, 'EVIDENCE_STALE'); assert.equal(selectedInvalidations.length, 1);
        assert.equal(await db.closeChecklistItem.count({ where: { closeRunId: selected.id } }), 0, 'Late collector completion cannot overwrite invalidation');
      }
      const original = await db.closeRun.findUniqueOrThrow({ where: { id: x.closeRunId } });
      assert.equal(original.status, 'BLOCKED'); assert.equal(original.metadata?.staleState?.status, 'EVIDENCE_STALE');
      assert.equal(original.metadata.staleState.sourceId, x.countSetup.countSessionId);
      await verifyExports(fixture.artifacts, true); assert.equal(await history(x), fixture.history);
      if (fixture.later) {
        assert.ok(state.lockedPeriods.includes(x.periodId) && state.lockedPeriods.includes(fixture.later.periodId) && state.lockedPeriods.includes(fixture.noRun.periodId));
        assert.ok(!state.lockedPeriods.includes(fixture.earlier.periodId));
        const later = await db.closeRun.findUniqueOrThrow({ where: { id: fixture.later.closeRunId } }); assert.equal(later.status, 'BLOCKED'); assert.equal(later.metadata?.staleState?.status, 'EVIDENCE_STALE');
        await verifyExports(fixture.later.artifacts, true); assert.equal(await history(fixture.later), fixture.later.history);
        assert.deepEqual(await db.closeRun.findUniqueOrThrow({ where: { id: fixture.earlier.closeRunId } }), fixture.earlier.before); assert.equal(await history(fixture.earlier), fixture.earlier.history);
      }
      const replay = await retries(x, posted.value.eventId);
      let recovery = null;
      if (mode === 'creator-first') {
        const recovered = await d.assessment(target, 'count-publication-recovery'); assert.notEqual(recovered.closeRunId, selected.id); assert.equal(recovered.evidenceHash, after.evidenceHash);
        const dashboard = await close.getCloseAssuranceDashboard(target.organizationId, target.periodId); assert.equal(dashboard.run.id, recovered.closeRunId); assert.equal(dashboard.controls.certificationAvailable, true);
        assert.equal((await db.closeRun.findUniqueOrThrow({ where: { id: selected.id } })).status, 'BLOCKED');
        recovery = { runId: recovered.closeRunId, status: 'READY', trustLevel: 'T4', currentCertificationAvailable: true };
      }
      assert.equal((await h.financial()).hash, financial.hash);
      return { id: mode === 'baseline' ? 'historical-count-discovery-gap-reproduced' : mode + '-count-publication-fenced', status: 'passed',
        baselineCountSourceHash: old?.sourceHash || null, privateHistoricalModuleOnly: !!old, organizationId: x.organizationId, targetPeriodId: target.periodId,
        firstAssessmentOfTargetPeriod: !!fixture.noRun, selectedRunId: selected.id, selectedStatus: selected.status, selectedInvalidationEvents: selectedInvalidations.length,
        countEventId: posted.value.eventId, sourceBefore: before.evidenceHash, sourceAfter: after.evidenceHash, blocking: waitProof,
        discoveredRunIds: state.discoveredRunIds, lockedPeriodIds: state.lockedPeriods, events: state.events,
        retainedArtifacts: [...fixture.artifacts, ...(fixture.later?.artifacts || [])].map(artifact => ({ id: artifact.row.id, kind: artifact.kind, file: path.basename(artifact.file), bytesHash: artifact.bytesHash, contentHash: artifact.row.contentHash })),
        excludedEarlierPeriodUnchanged: !!fixture.earlier, cumulativeLaterEvidenceInvalidated: !!fixture.later, replay, recovery, noFinancialEffects: true };
    } finally { state.release.resolve(); state.collectors.resolve(); await Promise.allSettled([producer, creator].filter(Boolean)); route.restore(); await writer.$disconnect(); }
  }
  async function unsupportedIsolation(x) {
    const before = await effects(x), financial = await h.financial();
    const result = await outcome(db.$transaction(tx => count.postStockCount(postInput(x), tx), { isolationLevel: 'RepeatableRead', timeout: 30000 }));
    assert.equal(result.success, false); assert.equal(result.code, 'CONFLICT'); assert.match(result.error, /Read Committed/);
    assert.deepEqual(await effects(x), before); assert.equal((await h.financial()).hash, financial.hash);
    return { id: 'inherited-repeatable-read-refused-before-source-writes', status: 'passed', code: result.code, noEffects: true };
  }
  async function rollbackAfterSourceWrites(fixture) {
    const { x } = fixture, before = await effects(x), beforeHistory = await history(x), financial = await h.financial();
    const injection = new Error('EXPLICIT OWNED VERIFIER FAULT: count target discovery failed after source writes');
    let observation = null, injected = false;
    // Test-only failure at the real invalidation discovery boundary. All source
    // writes before this point are actual PostgreSQL writes inside the count's
    // transaction; no stored result, status or database response is fabricated.
    dbModule.db = new Proxy({}, { has(_facade, key) { return key in db; }, get(_facade, key) {
      if (key !== '$transaction') { const value = Reflect.get(db, key); return typeof value === 'function' ? value.bind(db) : value; }
      return (work, options) => db.$transaction(async tx => {
        assert.equal(options?.isolationLevel, 'ReadCommitted');
        const transactionPid = await pid(tx);
        const observed = new Proxy({}, { has(_txFacade, key) { return key in tx; }, get(_txFacade, key) {
          if (key === 'closeRun') return new Proxy({}, { get(_model, method) {
            if (method === 'findMany') return async args => {
              const rows = await tx.closeRun.findMany(args);
              if (!injected && args.where?.organizationId === x.organizationId && args.select?.id === true && Object.keys(args.select).length === 1) {
                const session = await tx.stockCountSession.findUniqueOrThrow({ where: { id: x.countSetup.countSessionId } });
                const event = await tx.businessEvent.findUniqueOrThrow({ where: { id: session.postedBusinessEventId } });
                assert.equal(session.status, 'POSTED'); assert.equal(session.postedAdjustmentId, null);
                assert.equal(event.status, 'APPLIED'); assert.equal(event.eventType, 'inventory.physical_count.validated');
                assert.equal(event.sourceId, session.id); assert.equal(event.organizationId, x.organizationId);
                assert.ok(rows.some(row => row.id === x.closeRunId));
                observation = { transactionPid, sessionStatusInsideTransaction: session.status, eventStatusInsideTransaction: event.status,
                  uncommittedEventId: event.id, targetRunIds: rows.map(row => row.id), sourceRowsObservedInActualTransaction: true };
                injected = true; throw injection;
              }
              return rows;
            };
            const value = Reflect.get(tx.closeRun, method); return typeof value === 'function' ? value.bind(tx.closeRun) : value;
          } });
          const value = Reflect.get(tx, key); return typeof value === 'function' ? value.bind(tx) : value;
        } }); return work(observed);
      }, { ...options, timeout: 30000 });
    } });
    let refusal;
    try { refusal = await outcome(count.postStockCount(postInput(x))); }
    finally { dbModule.db = originalDb; }
    assert.equal(injected, true, 'Actual POSTED/APPLIED source writes must precede the injected failure');
    assert.equal(refusal.success, false); assert.equal(refusal.error, injection.message);
    assert.deepEqual(await effects(x), before); assert.equal(await history(x), beforeHistory);
    assert.equal(await db.businessEvent.count({ where: { id: observation.uncommittedEventId } }), 0);
    await verifyExports(fixture.artifacts, false); assert.equal((await h.financial()).hash, financial.hash);
    const retryWriter = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 30000, maxWait: 10000 } });
    let posted, retryPid;
    try {
      await assertDisposableDatabaseIdentity(retryWriter, helper.database);
      // Independent connection makes a leaked publication lock observable as a
      // blocked retry. Preserve the service-owned explicit RC transaction path.
      const client = new Proxy({}, { has(_facade, key) { return key in retryWriter; }, get(_facade, key) {
        if (key !== '$transaction') { const value = Reflect.get(retryWriter, key); return typeof value === 'function' ? value.bind(retryWriter) : value; }
        return (work, options) => retryWriter.$transaction(async tx => { retryPid = await pid(tx); assert.notEqual(retryPid, observation.transactionPid); return work(tx); }, options);
      } });
      posted = await bounded(count.postStockCount(postInput(x), client), 'real retry after rollback releases period locks');
    } finally { await retryWriter.$disconnect(); }
    assert.equal(posted.replayed, false); assert.equal(posted.countSession.status, 'POSTED'); assert.equal(posted.varianceLineCount, 0);
    assert.equal(posted.totalVarianceValue, '0.00'); assert.equal(posted.generatedAdjustmentId, undefined);
    assert.notEqual(posted.eventId, observation.uncommittedEventId);
    const events = await db.businessEvent.findMany({ where: { organizationId: x.organizationId, eventType: 'inventory.physical_count.validated', sourceId: x.countSetup.countSessionId } });
    assert.equal(events.length, 1); assert.equal(events[0].id, posted.eventId); assert.equal(events[0].status, 'APPLIED');
    const invalidations = (await db.businessEvent.findMany({ where: { organizationId: x.organizationId, eventType: 'close.certification.invalidated' } }))
      .filter(event => event.payload?.sourceId === x.countSetup.countSessionId);
    assert.equal(invalidations.length, observation.targetRunIds.length);
    for (const id of observation.targetRunIds) {
      assert.equal(invalidations.filter(event => event.payload?.closeRunId === id).length, 1);
      const row = await db.closeRun.findUniqueOrThrow({ where: { id } }); assert.equal(row.status, 'BLOCKED'); assert.equal(row.metadata?.staleState?.status, 'EVIDENCE_STALE');
    }
    await verifyExports(fixture.artifacts, true); assert.equal(await history(x), beforeHistory);
    const replay = await retries(x, posted.eventId); assert.equal((await h.financial()).hash, financial.hash);
    return { id: 'source-writes-rollback-on-discovery-failure-and-real-retry', status: 'passed', organizationId: x.organizationId,
      explicitTestFaultOnly: true, injectedAt: 'close target discovery after actual POSTED/APPLIED writes', observation,
      refusal: { success: false, error: refusal.error }, allObservedEffectsRolledBack: true, retainedExportsUnchangedAfterRollback: true,
      retryPid, retryCountEventId: posted.eventId, retryInvalidationCount: invalidations.length, oneInvalidationPerTarget: true,
      independentConnectionRetryCompleted: true, publicationLocksReleased: true, replay, noFinancialEffects: true };
  }
  async function main() {
    await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await d.outside();
    const old = baseline(), before = await fixture('baseline'), producer = await fixture('producer-first', true), creator = await fixture('creator-first', true), rollback = await fixture('rollback');
    report.financialAfterSetup = await h.financial();
    report.checks.push(await unsupportedIsolation(producer.x));
    report.checks.push(await executeRace(before, 'baseline', old));
    report.checks.push(await executeRace(producer, 'producer-first')); report.checks.push(await executeRace(creator, 'creator-first'));
    report.checks.push(await rollbackAfterSourceWrites(rollback));
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); report.stack = f.safe(error.stack || error); report.prerequisite = error.prerequisite; }
    finally {
      dbModule.db = originalDb;
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
        report.outsideAfter = await d.outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash;
        report.financialAfter = await h.financial(); report.noOperationFinancialEffects = report.financialAfterSetup?.hash === report.financialAfter.hash;
      } catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.checks.length === 5 && report.checks.every(check => check.status === 'passed') && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'count-publication-runtime-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.length, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { sources, fixture, executeRace };
  if (require.main === module) runMain();
}
