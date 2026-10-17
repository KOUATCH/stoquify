// Prepared verifier only. --check is syntax-only; --run requires coordinator
// release and the existing guarded disposable loopback database.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only; --run requires frozen sources and an exclusive verifier lane.');
} else {
  const h = require('./close-pack-write-race-runtime.cjs');
  const { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const { PrismaClient } = require('@prisma/client');
  const { AsyncLocalStorage } = require('node:async_hooks');
  const load = file => require(path.join(root, file));
  const service = load('services/accounting/close-assurance.service.ts');
  const replacement = load('services/accounting/close-evidence-replacement.service.ts');
  const payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts');
  const pack = load('services/accounting/close-assurance-pack.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db;
  let activeWriter = null;
  const stamp = crypto.randomUUID();
  const report = {
    run: stamp, at: new Date().toISOString(), checks: [],
    scope: 'One actual creator-first publication versus replacement acceptance on the owned disposable loopback database. Actual synthetic accounting setup, missing-evidence workflow and assessments. No financial writes after fixture setup. Payment collector failure is explicit test fault injection. No customer approval, statutory certification, migration, deployment or external delivery.',
    authorityScope: 'Valid actor, supplied server review permission and recent actor/tenant-bound authentication; service authority checks execute normally. This race verifies current collection selection and post-lock acceptance time. Concurrent membership, RBAC, delegated-grant revocation and authentication expiry are outside this verifier.',
  };
  const files = [...new Set([__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) &&
    !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])) });
  async function outside() {
    const base = await h.outside();
    const comments = await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } });
    return { hash: f.hash({ base, comments }), base, commentCount: comments.length };
  }
  const preview = (x, findingId) => db.$transaction(tx => replacement.getCloseEvidenceReplacementInTx(tx, x.organizationId, findingId), { isolationLevel: 'RepeatableRead' });
  const authority = x => ({ actorId: x.certifierId, actorPermissions: ['accounting.close.accountant.review'], freshAuth: { actorId: x.certifierId, organizationId: x.organizationId, lastAuthAt: new Date() } });
  function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
  async function bounded(work, label, milliseconds = 20000) {
    let timer;
    try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out; race is unverified')), milliseconds); })]); }
    finally { clearTimeout(timer); }
  }
  const outcome = promise => promise.then(value => ({ success: true, value }), error => ({ success: false, code: error.code, error: f.safe(error) }));
  async function rejected(work) { const result = await outcome(work()); assert.equal(result.success, false); assert.equal(result.code, 'CONFLICT'); return result; }
  async function identity(tx) {
    const rows = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database');
    assert.equal(rows[0].database, helper.database);
    return rows[0].pid;
  }
  async function confirmedBlocking(waiterPid, holderPid) {
    assert.notEqual(waiterPid, holderPid, 'The race requires distinct actual PostgreSQL backends');
    return helper.withClient(f.target, async client => {
      await helper.assertOwned(client);
      const until = Date.now() + 4000;
      do {
        const result = await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiterPid]);
        if (result.rows[0].blockers.includes(holderPid)) return { waiterPid, holderPid, blockers: result.rows[0].blockers, observed: true };
        await new Promise(resolve => setTimeout(resolve, 40));
      } while (Date.now() < until);
      throw new Error('PostgreSQL did not show the expected actual period-lock conflict');
    });
  }
  async function retained(x) {
    return {
      run: await db.closeRun.findUniqueOrThrow({ where: { id: x.oldRunId } }),
      checklist: await db.closeChecklistItem.findMany({ where: { closeRunId: x.oldRunId }, orderBy: { id: 'asc' } }),
      evidence: await db.closeEvidenceItem.findMany({ where: { closeRunId: x.oldRunId }, orderBy: { id: 'asc' } }),
      exports: await db.closePackExport.findMany({ where: { closeRunId: x.oldRunId }, orderBy: { id: 'asc' } }),
    };
  }
  async function acceptanceEffects(x, findingId) {
    const scope = { organizationId: x.organizationId };
    const eventScope = { ...scope, eventType: 'close.assurance.missing_evidence.response_accepted' };
    return {
      finding: await db.closeAssuranceFinding.findUniqueOrThrow({ where: { id: findingId } }),
      comments: await db.accountantComment.findMany({ where: { ...scope, visibility: 'ACCOUNTANT_RESPONSE_ACCEPTED' }, orderBy: { id: 'asc' } }),
      audits: await db.ledgerAuditEvent.findMany({ where: { ...scope, action: 'CLOSE_MISSING_EVIDENCE_RESPONSE_ACCEPTED' }, orderBy: { id: 'asc' } }),
      events: await db.businessEvent.findMany({ where: eventScope, orderBy: { id: 'asc' } }),
      outbox: await db.businessEventOutbox.findMany({ where: { ...scope, businessEvent: eventScope }, orderBy: { id: 'asc' } }),
      eventAudits: await db.businessEventAudit.findMany({ where: { ...scope, businessEvent: eventScope }, orderBy: { id: 'asc' } }),
    };
  }

  function routeTransactions(x, writer) {
    const context = new AsyncLocalStorage();
    const state = { events: [], releasePublication: deferred(), releaseCollectors: deferred(), inserted: deferred(), published: deferred(), acceptanceAttempt: deferred(), creator: {}, acceptor: {} };
    dbModule.db = new Proxy({}, { get(_facade, key) {
      const lane = context.getStore(), target = lane === 'creator' ? writer : db;
      if (key !== '$transaction' || !lane) { const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; }
      return async (work, options) => {
        if (state[lane].observed || typeof work !== 'function') return target.$transaction(work, options);
        state[lane].observed = true;
        let inserted = null;
        const value = await target.$transaction(async tx => {
          state[lane].pid = await identity(tx);
          assert.equal(options?.isolationLevel, 'ReadCommitted');
          let periodLocked = false, runLocked = false, correlationLocked = false;
          const observed = new Proxy({}, { get(_txFacade, property) {
            if (property === '$queryRaw') return async (...args) => {
              const sql = args.map(arg => typeof arg === 'string' ? arg : arg?.sql || arg?.text || arg?.strings?.join('?') || '').join(' ');
              const values = args[0]?.values || [];
              let lockKey = null;
              if (sql.includes('pg_advisory_xact_lock') && typeof values[0] === 'string') { try { lockKey = JSON.parse(values[0]); } catch { /* Not a recognized product lock. */ } }
              const isPeriod = Array.isArray(lockKey) && lockKey[0] === 'close-assessment-order' && lockKey[1] === x.organizationId && lockKey[2] === x.periodId;
              const isCorrelation = Array.isArray(lockKey) && lockKey[0] === 'close-evidence-acceptance' && lockKey[1] === x.organizationId;
              const isRun = sql.includes('close_runs') && sql.includes('FOR NO KEY UPDATE');
              if (isPeriod) {
                if (lane === 'acceptor') { assert.ok(correlationLocked); state.acceptanceAttempt.resolve(); }
                state.events.push({ lane, event: 'period-lock-attempt', at: Date.now() });
              }
              if (isRun) { assert.ok(periodLocked, 'Period lock must precede the replacement run lock'); state.events.push({ lane, event: 'run-lock-attempt', at: Date.now() }); }
              const result = await tx.$queryRaw(...args);
              if (isCorrelation) { correlationLocked = true; state.events.push({ lane, event: 'correlation-lock-acquired', at: Date.now() }); }
              if (isPeriod) { periodLocked = true; state.events.push({ lane, event: 'period-lock-acquired', at: Date.now() }); }
              if (isRun) { assert.equal(result.length, 1); runLocked = true; state.events.push({ lane, event: 'run-lock-acquired', runId: result[0].id, at: Date.now() }); }
              return result;
            };
            if (property === 'closeRun') return new Proxy({}, { get(_modelFacade, method) {
              if (method === 'create') return async args => {
                const row = await tx.closeRun.create(args);
                if (lane === 'creator' && args.data.organizationId === x.organizationId && args.data.periodId === x.periodId && args.data.status === 'RUNNING') {
                  assert.ok(periodLocked); inserted = row;
                  state.events.push({ lane, event: 'running-inserted', runId: row.id, at: Date.now() });
                  state.inserted.resolve(row);
                  await bounded(state.releasePublication.promise, 'publication barrier');
                }
                return row;
              };
              if (method === 'findMany') return async args => {
                assert.ok(periodLocked, 'Assessment order must be read under the period lock');
                const rows = await tx.closeRun.findMany(args);
                state.events.push({ lane, event: 'locked-order-read', latestId: rows[0]?.id, latestStatus: rows[0]?.status, at: Date.now() });
                return rows;
              };
              const value = Reflect.get(tx.closeRun, method); return typeof value === 'function' ? value.bind(tx.closeRun) : value;
            } });
            if (property === 'closeChecklistItem') return new Proxy({}, { get(_modelFacade, method) {
              if (method === 'findFirst') return async args => {
                assert.ok(periodLocked && runLocked, 'Authoritative replacement collection read must follow both locks');
                const row = await tx.closeChecklistItem.findFirst(args);
                state.events.push({ lane, event: 'locked-collection-read', requestedRunId: args.where.closeRunId, found: !!row, at: Date.now() });
                return row;
              };
              const value = Reflect.get(tx.closeChecklistItem, method); return typeof value === 'function' ? value.bind(tx.closeChecklistItem) : value;
            } });
            const value = Reflect.get(tx, property); return typeof value === 'function' ? value.bind(tx) : value;
          } });
          return work(observed);
        }, { ...options, timeout: 25000 });
        if (inserted) {
          state.events.push({ lane, event: 'running-committed', runId: inserted.id, at: Date.now() });
          state.published.resolve(inserted);
          await bounded(state.releaseCollectors.promise, 'collector-start barrier');
        }
        return value;
      };
    } });
    return { state, run: (lane, work) => context.run(lane, work), restore: () => { dbModule.db = originalDb; } };
  }

  async function main() {
    report.sourceBefore = sources(); report.outsideBefore = await outside();
    const x = await h.fixture('replacement-order'); report.fixture = x.info;
    report.financialBefore = await h.financial();
    const actualPaymentCollector = payment.getPaymentReconciliationDashboardData;
    try {
      payment.getPaymentReconciliationDashboardData = async () => { throw new Error('Explicit owned-test payment collector unavailable'); };
      const old = await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'order-missing-' + stamp }, { actorId: x.makerId });
      x.oldRunId = old.run.id;
    } finally { payment.getPaymentReconciliationDashboardData = actualPaymentCollector; }
    const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { organizationId: x.organizationId, closeRunId: x.oldRunId, checklistItem: { key: 'payment-reconciliation' } } });
    await pack.exportClosePack(x.organizationId, { closeRunId: x.oldRunId, mode: 'DRAFT_NOT_CERTIFIED' }, { actorId: x.certifierId, actorPermissions: ['accounting.close.export'] });
    const request = await service.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: x.makerId, requestText: 'Synthetic race: restore the payment collector and review the current assessment.', dueAt: new Date(Date.now() + 86400000), correlationId: 'order-request-' + stamp }, { actorId: x.certifierId });
    const response = await service.respondToMissingCloseEvidence(x.organizationId, { requestId: request.id, responseText: 'Synthetic collector restored; review the new collected observation.', correlationId: 'order-response-' + stamp }, { actorId: x.makerId });
    await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'order-initial-recovery-' + stamp }, { actorId: x.makerId });
    const initial = await preview(x, finding.id); assert.equal(initial.status, 'AVAILABLE');
    const input = { requestId: request.id, responseId: response.id, resolutionNotes: 'Synthetic reviewer inspected the current replacement observation.', replacement: initial.selection, correlationId: 'order-acceptance-' + stamp };
    const effectsBefore = await acceptanceEffects(x, finding.id), retainedHash = f.hash(await retained(x));
    assert.equal(effectsBefore.finding.status, 'IN_REVIEW'); assert.equal(effectsBefore.comments.length, 0);

    const writer = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 25000, maxWait: 10000 } });
    activeWriter = writer;
    await assertDisposableDatabaseIdentity(writer, helper.database); await helper.withClient(f.target, helper.assertOwned);
    const route = routeTransactions(x, writer), { state } = route;
    let creation, acceptance, published;
    try {
      creation = outcome(route.run('creator', () => service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'order-racing-publication-' + stamp }, { actorId: x.makerId })));
      await bounded(state.inserted.promise, 'actual RUNNING insertion');
      acceptance = outcome(route.run('acceptor', () => service.acceptMissingCloseEvidenceResponse(x.organizationId, input, authority(x))));
      await bounded(state.acceptanceAttempt.promise, 'acceptor period-lock attempt');
      const blocking = await confirmedBlocking(state.acceptor.pid, state.creator.pid);
      assert.equal(state.events.some(event => event.lane === 'acceptor' && event.event === 'period-lock-acquired'), false);
      state.releasePublication.resolve();
      published = await bounded(state.published.promise, 'committed RUNNING publication');
      const denial = await bounded(acceptance, 'stale selection rejection');
      assert.equal(denial.success, false); assert.equal(denial.code, 'CONFLICT');
      assert.equal((await db.closeRun.findUniqueOrThrow({ where: { id: published.id } })).status, 'RUNNING');
      assert.ok(state.events.some(event => event.lane === 'acceptor' && event.event === 'locked-order-read' && event.latestId === published.id && event.latestStatus === 'RUNNING'));
      assert.ok(state.events.some(event => event.lane === 'acceptor' && event.event === 'locked-collection-read' && event.requestedRunId === published.id && event.found === false));
      assert.deepEqual(await acceptanceEffects(x, finding.id), effectsBefore);
      assert.equal(f.hash(await retained(x)), retainedHash);
      report.checks.push({ id: 'creator-first-published-running-refuses-stale-acceptance', status: 'passed', blocking, events: state.events, denial, publishedRunId: published.id, previousCandidateRunId: initial.binding.replacementRunId, noAcceptanceEffects: true, historicalRecordsUnchanged: true });
      state.releaseCollectors.resolve();
      const completed = await bounded(creation, 'actual assessment collectors');
      assert.equal(completed.success, true, completed.error); assert.equal(completed.value.run.id, published.id);
    } finally {
      state.releasePublication.resolve(); state.releaseCollectors.resolve();
      await Promise.allSettled([creation, acceptance].filter(Boolean));
      route.restore(); await writer.$disconnect(); activeWriter = null;
    }

    const current = await preview(x, finding.id); assert.equal(current.status, 'AVAILABLE');
    assert.equal(current.binding.replacementRunId, published.id); assert.notDeepEqual(current.selection, initial.selection);
    const staleAfterCompletion = await rejected(() => service.acceptMissingCloseEvidenceResponse(x.organizationId, input, authority(x)));
    assert.deepEqual(await acceptanceEffects(x, finding.id), effectsBefore);
    const accepted = await service.acceptMissingCloseEvidenceResponse(x.organizationId, { ...input, replacement: current.selection }, authority(x));
    assert.deepEqual(accepted.replacement, current.selection);
    const effectsAfter = await acceptanceEffects(x, finding.id);
    assert.equal(effectsAfter.finding.status, 'RESOLVED'); assert.equal(effectsAfter.comments.length, 1);
    assert.equal(effectsAfter.audits.length, 1); assert.equal(effectsAfter.events.length, 1);
    assert.equal(effectsAfter.comments[0].metadata.replacementBinding.replacementRunId, published.id);
    assert.ok(effectsAfter.comments[0].createdAt >= new Date(current.observedAt));
    assert.equal(effectsAfter.comments[0].createdAt.getTime(), effectsAfter.finding.resolvedAt.getTime());
    assert.equal(f.hash(await retained(x)), retainedHash);
    report.checks.push({ id: 'explicit-refreshed-selection-accepts-new-observation', status: 'passed', staleAfterCompletion, acceptedId: accepted.id, replacementRunId: published.id, replacementSelection: current.selection, observedAt: current.observedAt, acceptedAt: effectsAfter.comments[0].createdAt, retainedHash, acceptanceCount: 1, auditCount: 1, eventCount: 1 });
  }
  async function run() {
    try { await main(); } catch (error) { report.error = f.safe(error); report.stack = f.safe(error.stack || error); }
    finally {
      dbModule.db = originalDb;
      if (activeWriter) { await activeWriter.$disconnect(); activeWriter = null; }
      try {
        report.sourceAfter = sources(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
        report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash;
        report.financialAfter = await h.financial(); report.noOperationFinancialEffects = report.financialBefore?.hash === report.financialAfter.hash;
      } catch (error) { report.finalizationError = f.safe(error); }
      report.passed = !report.error && !report.finalizationError && report.checks.length === 2 && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-replacement-order-runtime-' + stamp + '.json');
      fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, error: report.error, checks: report.checks.length, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects }));
      await db.$disconnect(); process.exitCode = report.passed ? 0 : 1;
    }
  }
  if (require.main === module) run();
}
