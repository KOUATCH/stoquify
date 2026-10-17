// NEW isolated verifier. Historical runners and receipts are immutable evidence.
// Actual services produce READY/T4 and artifacts. Adversarial timestamp/void
// changes below are explicitly imported-state test faults, never approvals.
if (require.main === module && process.argv[2] !== '--run') console.log('Prepared only; --run requires coordinator source freeze and lane release.');
else {
  const d = require('./close-denial-recovery-runtime.cjs'), h = d.h;
  const { f, db, root, helper, organizations } = h, { fs, path, crypto, assert } = f;
  const { PrismaClient } = require('@prisma/client'), { AsyncLocalStorage } = require('node:async_hooks');
  const load = file => require(path.join(root, file));
  const service = load('services/accounting/close-assurance.service.ts'), pack = load('services/accounting/close-assurance-pack.service.ts');
  const order = load('services/accounting/close-assessment-order.service.ts');
  const { getProofTrail } = load('services/evidence/proof-trail.service.ts');
  const { createFiscalYearWithPeriods } = load('services/accounting/periods.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db;
  const stamp = crypto.randomUUID(), baselineFile = path.join(__dirname, 'close-unique-current-readonly-333cca19-74f1-421e-86d0-39b38c693c15.json');
  const report = { run: stamp, at: new Date().toISOString(), checks: [], fixtures: [], scope: 'Owned loopback disposable database only. Actual accounting setup and separately approved synthetic balanced journal; actual assessment publication, collectors, independent system certification and retained draft export. Two backend PIDs and pg_blocking_pids prove publication/certification ordering. Synthetic timestamp and void faults only test adverse persisted state. No customer or statutory approval, migration, seed, delivery or external effects.' };
  const files = [...new Set([__filename, baselineFile, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])].sort();
  const sources = () => ({ ...d.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])) });
  const outside = d.outside, financial = h.financial;
  const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; };
  async function bounded(promise, label, ms = 16000) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out; boundary unverified')), ms); })]); } finally { clearTimeout(timer); } }
  async function identity(tx) { const rows = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database'); assert.equal(rows[0].database, helper.database); return rows[0].pid; }
  async function writerClient() { const client = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 25000, maxWait: 10000 } }); await assertDisposableDatabaseIdentity(client, helper.database); return client; }
  async function blocking(waiterPid, holderPid) {
    assert.notEqual(waiterPid, holderPid);
    return helper.withClient(f.target, async client => {
      await helper.assertOwned(client); const until = Date.now() + 4000;
      do { const result = await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiterPid]); if (result.rows[0].blockers.includes(holderPid)) return { waiterPid, holderPid, blockers: result.rows[0].blockers, observed: true }; await new Promise(done => setTimeout(done, 40)); } while (Date.now() < until);
      throw new Error('Expected PostgreSQL two-connection blocking was not observed');
    });
  }
  const certify = x => { const now = new Date(); return pack.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'CERTIFIED', correlationId: 'unique-current-certify-' + crypto.randomUUID() }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: now, now }); };
  const draft = x => pack.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'DRAFT_NOT_CERTIFIED' }, { actorId: x.certifierId, actorPermissions: ['accounting.close.export'] });
  const createAssessment = (x, label) => service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'unique-current-' + label + '-' + stamp }, { actorId: x.makerId, actorPermissions: ['accounting.close.run'], now: new Date() });
  async function deny(work, code = 'CONFLICT') { let error; try { await work(); } catch (value) { error = value; } assert.ok(error, 'Expected an authoritative denial'); assert.equal(error.code, code); return { code: error.code, message: f.safe(error) }; }
  async function ownFixture(name) { const x = await h.fixture('unique-' + name); report.fixtures.push(x.info); return x; }
  async function history(x) { return { run: await db.closeRun.findFirstOrThrow({ where: { organizationId: x.organizationId, id: x.closeRunId } }), ...await d.history(x) }; }
  async function readonlyHistoricalOffer() {
    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8')), organizationId = baseline.organizationId;
    assert.ok(!organizations.includes(organizationId)); const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId } }); assert.ok(org.name.startsWith(helper.prefix));
    const actor = await db.user.findFirstOrThrow({ where: { id: baseline.actorId, organizationId, isActive: true }, include: { roles: { select: { permissions: true } } } }); assert.ok(actor.roles.some(row => row.permissions.includes('accounting.close.read')));
    const old = { organizationId, periodId: baseline.observations.periodId, closeRunId: baseline.observations.old.id }, before = f.hash(await history(old));
    const explicit = await service.getCloseAssuranceDashboard(organizationId, old.periodId, old.closeRunId), current = await service.getCloseAssuranceDashboard(organizationId, old.periodId);
    const proof = await getProofTrail({ organizationId, subjectType: 'close.run', subjectId: old.closeRunId }, db); assert.ok(proof.blockers.some(item => item.id === 'close-assessment-not-current'));
    assert.equal(explicit.run.id, old.closeRunId); assert.equal(current.run.id, baseline.expectedLatestId); assert.equal(explicit.controls.certificationAvailable, false); assert.equal(explicit.controls.packExportAvailable, true); assert.equal(current.controls.certificationAvailable, true); assert.equal(f.hash(await history(old)), before);
    return { readonly: true, organizationId, oldRunId: old.closeRunId, currentRunId: current.run.id, priorCertificationAvailable: baseline.observations.old.controls.certificationAvailable, currentOldCertificationAvailable: explicit.controls.certificationAvailable, disabledReason: explicit.controls.certificationDisabledReason, oldDraftAvailable: explicit.controls.packExportAvailable, proofGrade: proof.evidenceGrade, proofBlockers: proof.blockers.map(item => item.id), retainedHash: before, noAuthorityChanges: true };
  }
  // Route real service calls by async context, without replacing service logic.
  // The creator's transaction result is held AFTER COMMIT to expose its genuine
  // RUNNING row while the real evidence collectors have not yet started.
  function routing(x, writer, first) {
    const context = new AsyncLocalStorage(), state = { events: [], release: deferred(), collectors: deferred(), published: deferred(), creator: { attempt: deferred(), held: deferred() }, certifier: { attempt: deferred(), held: deferred() } };
    // An empty facade avoids violating the extended Prisma client's immutable
    // internal descriptors when routing to a different underlying client.
    dbModule.db = new Proxy({}, { get(_target, key) {
      const lane = context.getStore(), target = lane === 'creator' ? writer : db;
      if (key !== '$transaction' || !lane) { const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; }
      return async (work, options) => {
        // Only publication/certification are observation boundaries. Preserve
        // collector transactions and every Prisma transaction overload intact.
        if (state[lane].transactionObserved || typeof work !== 'function') return target.$transaction(work, options);
        state[lane].transactionObserved = true;
        let published = null;
        const value = await target.$transaction(async tx => {
          state[lane].pid = await identity(tx); let advisory = false, runLock = false, held = false;
          const observed = new Proxy(tx, { get(inner, property) {
            if (property === '$queryRaw') return async (...args) => {
              const sql = args.map(value => typeof value === 'string' ? value : value?.sql || value?.text || value?.strings?.join('?') || '').join(' ');
              const isOrder = sql.includes('pg_advisory_xact_lock'), isRun = sql.includes('close_runs') && sql.includes('FOR NO KEY UPDATE');
              if (isOrder) { assert.equal(options?.isolationLevel, 'ReadCommitted'); state.events.push({ lane, event: 'order-lock-attempt', at: Date.now() }); state[lane].attempt.resolve(); }
              const rows = await inner.$queryRaw(...args);
              if (isOrder) { advisory = true; state[lane].orderPid = state[lane].pid; state.events.push({ lane, event: 'order-lock-acquired', at: Date.now() }); }
              if (isRun) { assert.ok(advisory, 'Order lock must precede row lock'); runLock = true; }
              return rows;
            };
            if (property === 'closeRun') return new Proxy(inner.closeRun, { get(model, method) {
              if (method === 'create') return async args => {
                const value = await model.create(args);
                if (lane === 'creator' && args.data.organizationId === x.organizationId && args.data.periodId === x.periodId && args.data.status === 'RUNNING') {
                  assert.ok(advisory); published = value; state.events.push({ lane, event: 'running-inserted', id: value.id, at: Date.now() }); state.creator.held.resolve(value);
                  if (first === 'creator') await bounded(state.release.promise, 'creator publication held', 20000);
                }
                return value;
              };
              if (['findFirst', 'findFirstOrThrow'].includes(method)) return async args => {
                const value = await model[method](args);
                if (lane === 'certifier' && runLock && !held && args.where?.organizationId === x.organizationId && args.where?.id === x.closeRunId) {
                  held = true; state.events.push({ lane, event: 'locked-run-read', status: value?.status, at: Date.now() }); state.certifier.held.resolve(value);
                  if (first === 'certifier') await bounded(state.release.promise, 'certifier locked read held', 20000);
                }
                return value;
              };
              return Reflect.get(model, method);
            } });
            return Reflect.get(inner, property);
          } });
          return work(observed);
        }, { ...options, timeout: 25000 });
        if (published) { state.events.push({ lane, event: 'running-committed', id: published.id, at: Date.now() }); state.published.resolve(published); await bounded(state.collectors.promise, 'collectors after publication', 20000); }
        return value;
      };
    } });
    return { state, run: (lane, work) => context.run(lane, work), restore: () => { dbModule.db = originalDb; } };
  }
  async function publicationRace(x, first) {
    const before = await financial(), retainedDraft = await draft(x), retainedDraftRow = await db.closePackExport.findUniqueOrThrow({ where: { id: retainedDraft.exportId } });
    const writer = await writerClient(), route = routing(x, writer, first), { state } = route;
    let creation, certification, result;
    const startCreator = () => route.run('creator', () => createAssessment(x, first)).then(value => ({ success: true, value }), error => ({ success: false, code: error.code, error: f.safe(error) }));
    const startCertifier = () => route.run('certifier', () => certify(x)).then(value => ({ success: true, value }), error => ({ success: false, code: error.code, error: f.safe(error) }));
    try {
      if (first === 'creator') creation = startCreator(); else certification = startCertifier();
      await bounded(state[first].held.promise, first + ' actual locked boundary');
      if (first === 'creator') certification = startCertifier(); else creation = startCreator();
      const second = first === 'creator' ? 'certifier' : 'creator'; await bounded(state[second].attempt.promise, second + ' order lock attempt');
      const blocked = await blocking(state[second].pid, state[first].pid); assert.equal(state.events.some(row => row.lane === second && row.event === 'order-lock-acquired'), false);
      state.release.resolve(); const published = await bounded(state.published.promise, 'actual RUNNING publication committed');
      const certified = await bounded(certification, 'certifier completion');
      const visible = await db.closeRun.findFirstOrThrow({ where: { organizationId: x.organizationId, id: published.id } }); assert.equal(visible.status, 'RUNNING');
      const current = await service.getCloseAssuranceDashboard(x.organizationId, x.periodId), previous = await service.getCloseAssuranceDashboard(x.organizationId, x.periodId, x.closeRunId);
      assert.equal(current.run.id, published.id); assert.equal(current.run.status, 'RUNNING'); assert.equal(previous.controls.certificationAvailable, false); assert.equal(previous.controls.packExportAvailable, true);
      if (first === 'creator') { assert.equal(certified.success, false); assert.equal(certified.code, 'CONFLICT'); assert.equal(await db.closePackExport.count({ where: { organizationId: x.organizationId, closeRunId: x.closeRunId, isCertified: true } }), 0); }
      else { assert.equal(certified.success, true, certified.error); assert.equal(certified.value.isCertified, true); const artifact = await db.closePackExport.findUniqueOrThrow({ where: { id: certified.value.exportId } }); assert.equal(artifact.contentHash, certified.value.contentHash); assert.equal(artifact.isCertified, true); assert.notEqual(artifact.metadata?.staleState?.status, 'EVIDENCE_STALE'); }
      assert.deepEqual(await db.closePackExport.findUniqueOrThrow({ where: { id: retainedDraft.exportId } }), retainedDraftRow);
      const historyBeforeCollectors = await history(x);
      state.collectors.resolve(); const created = await bounded(creation, 'actual collectors complete'); assert.equal(created.success, true, created.error); assert.equal(created.value.run.id, published.id); assert.equal(created.value.run.status, 'READY'); assert.equal(created.value.source.trustLevel, 'T4');
      assert.deepEqual(await history(x), historyBeforeCollectors); assert.equal((await financial()).hash, before.hash);
      result = { ordering: first + '-first', organizationId: x.organizationId, previousRunId: x.closeRunId, newRunId: published.id, blocking: blocked, events: state.events, committedCurrentStatusObserved: visible.status, completedNewStatus: created.value.run.status, completedTrustLevel: created.value.source.trustLevel, previousCertification: certified.success ? { success: true, exportId: certified.value.exportId, contentHash: certified.value.contentHash } : certified, retainedDraftId: retainedDraft.exportId, retainedPriorHistory: true, noFinancialEffects: true };
    } finally { state.release.resolve(); state.collectors.resolve(); await Promise.allSettled([creation, certification].filter(Boolean)); route.restore(); await writer.$disconnect(); }
    return result;
  }
  async function adverseStates(x) {
    const before = await financial(), oldDraft = await draft(x), oldHistory = await history(x);
    const toVoid = await d.assessment(x, 'unique-current-adverse');
    const superseded = await deny(() => certify(x)); assert.equal((await service.getCloseAssuranceDashboard(x.organizationId, x.periodId, x.closeRunId)).controls.packExportAvailable, true);
    await db.closeRun.update({ where: { id: toVoid.closeRunId }, data: { status: 'VOIDED', voidedAt: new Date() } });
    const voided = await deny(() => certify(toVoid), 'INVALID_TRANSITION'), oldAfterVoid = await deny(() => certify(x));
    const visibleVoided = await service.getCloseAssuranceDashboard(x.organizationId, x.periodId); assert.equal(visibleVoided.run.id, toVoid.closeRunId); assert.equal(visibleVoided.controls.certificationAvailable, false);
    // Keep the adverse run retained. Recovery must be a new actual assessment.
    const latest = await d.assessment(x, 'unique-current-after-void'), latestRow = await db.closeRun.findUniqueOrThrow({ where: { id: latest.closeRunId } });
    const older = await db.closeRun.findUniqueOrThrow({ where: { id: x.closeRunId } });
    await db.closeRun.update({ where: { id: x.closeRunId }, data: { createdAt: latestRow.createdAt } });
    const tiedNew = await deny(() => certify(latest)), tiedOld = await deny(() => certify(x));
    const tieRecovery = await d.assessment(x, 'unique-current-after-tie'), recoveredRow = await db.closeRun.findUniqueOrThrow({ where: { id: tieRecovery.closeRunId } });
    assert.ok(recoveredRow.createdAt > latestRow.createdAt, 'Actual post-lock DB timestamp resolves prior ambiguity');
    await db.closeRun.update({ where: { id: x.closeRunId }, data: { createdAt: older.createdAt, updatedAt: older.updatedAt } });
    const future = new Date(Date.now() + 3600000);
    const countBeforeClockCreate = await db.closeRun.count({ where: { organizationId: x.organizationId, periodId: x.periodId } });
    await db.closeRun.update({ where: { id: tieRecovery.closeRunId }, data: { createdAt: future } });
    const clockDenial = await deny(() => createAssessment(x, 'clock-denial'));
    assert.equal(await db.closeRun.count({ where: { organizationId: x.organizationId, periodId: x.periodId } }), countBeforeClockCreate);
    await db.closeRun.update({ where: { id: tieRecovery.closeRunId }, data: { createdAt: recoveredRow.createdAt, updatedAt: recoveredRow.updatedAt } });
    assert.deepEqual(await history(x), oldHistory); assert.equal((await financial()).hash, before.hash);
    return { organizationId: x.organizationId, previousRunId: x.closeRunId, voidedRunId: toVoid.closeRunId, tiedLatestRunId: latest.closeRunId, currentRunId: tieRecovery.closeRunId, fixtureFaults: 'Direct tenant-local imported-state timestamp/void mutations; timestamps restored and VOIDED run retained; recovery is a new actual assessment. No manufactured approval or positive status transition.', superseded, voided, oldAfterVoid, tiedNew, tiedOld, tieRecovery: { id: tieRecovery.closeRunId, status: recoveredRow.status, priorTimestamp: latestRow.createdAt, newDatabaseTimestamp: recoveredRow.createdAt }, clockDenial, retainedDraftId: oldDraft.exportId, priorHistoryUnchanged: true, noFinancialEffects: true };
  }
  // Derivative of the retained h.race observer: the new certification contract
  // permits a periodId-only discovery read before locking, but never evidence.
  async function invalidationRace(x, first) {
    const writer = await writerClient(), state = { events: [], release: deferred(), certifier: { attempt: deferred(), held: deferred() }, invalidator: { attempt: deferred(), held: deferred() } };
    let certification, invalidation;
    function observe(tx, lane) {
      let locked = false, held = false;
      return new Proxy(tx, { get(target, property) {
        if (property === '$queryRaw') return async (...args) => {
          const sql = args.map(value => typeof value === 'string' ? value : value?.sql || value?.text || value?.strings?.join('?') || '').join(' ');
          const isRunLock = sql.includes('close_runs') && sql.includes('FOR NO KEY UPDATE');
          if (isRunLock) { state.events.push({ lane, event: 'run-lock-attempt', at: Date.now() }); state[lane].attempt.resolve(); }
          const rows = await target.$queryRaw(...args); if (isRunLock) { locked = true; state.events.push({ lane, event: 'run-lock-acquired', at: Date.now() }); } return rows;
        };
        if (property === 'closeRun') return new Proxy(target.closeRun, { get(model, method) {
          if (method !== 'findFirst') return Reflect.get(model, method);
          return async args => {
            const value = await model.findFirst(args);
            if (args.where?.id === x.closeRunId && args.where?.organizationId === x.organizationId) {
              const discoveryOnly = args.select?.periodId === true && Object.keys(args.select).length === 1;
              if (!locked && discoveryOnly) state.events.push({ lane, event: 'scoped-period-discovery-only', at: Date.now() });
              else { assert.ok(locked, 'Full evidence read must follow run lock'); state.events.push({ lane, event: 'locked-run-read', status: value?.status, at: Date.now() }); if (!held && lane === first) { held = true; state[lane].held.resolve(); await bounded(state.release.promise, lane + ' invalidation regression hold', 20000); } }
            }
            return value;
          };
        } });
        return Reflect.get(target, property);
      } });
    }
    dbModule.db = new Proxy(db, { get(target, property) { if (property !== '$transaction') return Reflect.get(target, property); return (work, options) => target.$transaction(async tx => { state.certifier.pid = await identity(tx); return work(observe(tx, 'certifier')); }, { ...options, timeout: 25000 }); } });
    const startCertifier = () => certify(x).then(value => ({ success: true, value }), error => ({ success: false, code: error.code, error: f.safe(error) }));
    const startInvalidator = () => writer.$transaction(async tx => { state.invalidator.pid = await identity(tx); const result = await pack.recordCloseCertificationInvalidationsForSourceInTx(observe(tx, 'invalidator'), x.organizationId, { sourceCode: 'INVENTORY_VALUATION_ANNEX', periodId: x.periodId, sourceId: x.periodId, staleReason: 'LOCAL SYNTHETIC TEST retained invalidation race; no financial source mutation', previousEvidenceHash: x.evidenceHash, newEvidenceHash: 'sha256:' + crypto.createHash('sha256').update(stamp + first).digest('hex'), correlationId: 'unique-current-invalidation-' + first + '-' + stamp }, { actorId: x.makerId, now: new Date() }); assert.equal(result.invalidatedCount, 1); return result; });
    try {
      if (first === 'certifier') certification = startCertifier(); else { invalidation = startInvalidator(); invalidation.catch(() => {}); }
      await bounded(state[first].held.promise, first + ' locked evidence read');
      if (first === 'certifier') { invalidation = startInvalidator(); invalidation.catch(() => {}); } else certification = startCertifier();
      const second = first === 'certifier' ? 'invalidator' : 'certifier'; await bounded(state[second].attempt.promise, second + ' run lock attempt');
      const proof = await blocking(state[second].pid, state[first].pid); assert.equal(state.events.some(row => row.lane === second && row.event === 'locked-run-read'), false);
      state.release.resolve(); const [certified, invalidated] = await bounded(Promise.all([certification, invalidation]), 'invalidation race completion');
      assert.equal(state.events.find(row => row.lane === second && row.event === 'locked-run-read')?.status, first === 'certifier' ? 'CERTIFIED' : 'BLOCKED');
      assert.equal(certified.success, first === 'certifier', certified.error); if (!certified.success) assert.match(certified.error, /blocked|stale|invalidated/i);
      return { blocking: proof, events: state.events, certified, invalidated };
    } finally { state.release.resolve(); await Promise.allSettled([certification, invalidation].filter(Boolean)); dbModule.db = originalDb; await writer.$disconnect(); }
  }
  async function sourceInvalidationRegression(x, first) {
    const before = await financial(), savedDraft = first === 'invalidator' ? await draft(x) : null;
    const prior = savedDraft ? await db.closePackExport.findUniqueOrThrow({ where: { id: savedDraft.exportId } }) : null;
    const result = await invalidationRace(x, first), current = await db.closeRun.findUniqueOrThrow({ where: { id: x.closeRunId } });
    assert.equal(current.status, 'BLOCKED'); assert.equal(current.metadata.staleState.status, 'EVIDENCE_STALE');
    const artifacts = await db.closePackExport.findMany({ where: { organizationId: x.organizationId, closeRunId: x.closeRunId }, orderBy: { id: 'asc' } }); assert.equal(artifacts.length, 1);
    if (first === 'certifier') { assert.equal(artifacts[0].id, result.certified.value.exportId); assert.equal(artifacts[0].contentHash, result.certified.value.contentHash); assert.equal(artifacts[0].isCertified, true); assert.equal(artifacts[0].metadata.staleState.status, 'EVIDENCE_STALE'); }
    else assert.deepEqual(artifacts[0], prior);
    assert.equal((await financial()).hash, before.hash);
    return { organizationId: x.organizationId, closeRunId: x.closeRunId, ordering: first + '-first', blocking: result.blocking, events: result.events, artifactId: artifacts[0].id, contentHash: artifacts[0].contentHash, certificationSucceeded: result.certified.success, invalidation: result.invalidated, noFinancialEffects: true };
  }
  async function independentPublication(holder, target) {
    const writer = await writerClient(), route = routing(target, writer, null), held = deferred(), release = deferred(); let holderPid, creation, holding;
    try {
      holding = db.$transaction(async tx => { holderPid = await identity(tx); await order.lockCloseAssessmentOrderInTx(tx, holder.organizationId, holder.periodId); held.resolve(); await bounded(release.promise, 'independence holder', 20000); }, { isolationLevel: 'ReadCommitted', timeout: 25000 }); holding.catch(() => {});
      await bounded(held.promise, 'independence lock acquired'); creation = route.run('creator', () => createAssessment(target, 'independence')).then(value => ({ success: true, value }), error => ({ success: false, error: f.safe(error) }));
      const published = await bounded(route.state.published.promise, 'unrelated scope publishes while holder remains locked', 10000);
      assert.notEqual(route.state.creator.pid, holderPid); assert.equal((await db.closeRun.findUniqueOrThrow({ where: { id: published.id } })).status, 'RUNNING');
      const observation = await helper.withClient(f.target, async client => { await helper.assertOwned(client); return (await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [route.state.creator.pid])).rows[0].blockers; }); assert.ok(!observation.includes(holderPid));
      release.resolve(); await holding; route.state.collectors.resolve(); const completed = await bounded(creation, 'independent assessment collectors finish'); assert.equal(completed.success, true, completed.error);
      return { holderOrganizationId: holder.organizationId, holderPeriodId: holder.periodId, targetOrganizationId: target.organizationId, targetPeriodId: target.periodId, holderPid, creatorPid: route.state.creator.orderPid, publishedRunId: published.id, statusAfterActualCollectors: completed.value.run.status, publicationCommittedWhileOtherScopeHeld: true };
    } finally { release.resolve(); route.state.collectors.resolve(); await Promise.allSettled([holding, creation].filter(Boolean)); route.restore(); await writer.$disconnect(); }
  }
  async function main() {
    await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await outside(); report.financialBeforeSetup = await financial();
    const creator = await ownFixture('creator-first'), certifier = await ownFixture('certifier-first'), adverse = await ownFixture('adverse');
    const invalidationAfter = await ownFixture('source-certifier-first'), invalidationBefore = await ownFixture('source-invalidator-first');
    const originalPeriod = await db.accountingPeriod.findUniqueOrThrow({ where: { id: adverse.periodId } });
    const start = new Date(Date.UTC(originalPeriod.startDate.getUTCFullYear(), originalPeriod.startDate.getUTCMonth() + 1, 1)), end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1) - 1);
    const laterYear = await createFiscalYearWithPeriods(adverse.organizationId, { name: 'Synthetic independent future period', startDate: start, endDate: end }, adverse.makerId);
    const otherPeriod = { ...adverse, periodId: laterYear.periods[0].id };
    report.financialAfterSetup = await financial();
    const check = async (id, work) => { const started = Date.now(); const result = await work(); report.checks.push({ id, status: 'passed', elapsedMs: Date.now() - started, ...result }); console.log(JSON.stringify({ id, status: 'passed' })); return result; };
    await check('existing-historical-offer-readonly', readonlyHistoricalOffer);
    await check('creator-publication-first', () => publicationRace(creator, 'creator'));
    await check('certifier-first', () => publicationRace(certifier, 'certifier'));
    await check('adverse-latest-tied-voided-clock', () => adverseStates(adverse));
    await check('tenant-independence', () => independentPublication(adverse, creator));
    await check('period-independence', () => independentPublication(adverse, otherPeriod));
    await check('source-invalidation-certifier-first-regression', () => sourceInvalidationRegression(invalidationAfter, 'certifier'));
    await check('source-invalidation-writer-first-regression', () => sourceInvalidationRegression(invalidationBefore, 'invalidator'));
    const beforeForeign = f.hash(await history(creator)); const crossTenant = await deny(() => certify({ ...creator, organizationId: adverse.organizationId, certifierId: adverse.certifierId }), 'NOT_FOUND'); assert.equal(f.hash(await history(creator)), beforeForeign);
    await check('cross-tenant-run-denial', async () => ({ denial: crossTenant, noForeignMutation: true }));
    await check('foreign-period-import-denial', async () => {
      const original = await history(adverse), foreignBefore = f.hash(await history(creator));
      let certifiedDenial, draftDenial;
      try {
        await db.closeRun.update({ where: { id: adverse.closeRunId }, data: { periodId: creator.periodId } });
        certifiedDenial = await deny(() => certify(adverse), 'NOT_FOUND'); draftDenial = await deny(() => draft(adverse), 'NOT_FOUND');
      } finally { await db.closeRun.update({ where: { id: adverse.closeRunId }, data: { periodId: original.run.periodId, updatedAt: original.run.updatedAt } }); }
      assert.deepEqual(await history(adverse), original); assert.equal(f.hash(await history(creator)), foreignBefore);
      return { organizationId: adverse.organizationId, runId: adverse.closeRunId, injectedForeignPeriodId: creator.periodId, fixtureFault: 'Synthetic imported inconsistent tenant-period reference; original fields restored exactly, not a production repair.', certifiedDenial, draftDenial, bothHistoriesUnchanged: true };
    });
    report.financialAfterOperations = await financial(); assert.equal(report.financialAfterOperations.hash, report.financialAfterSetup.hash);
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); report.stack = f.safe(error.stack || error); report.prerequisite = error.prerequisite; }
    finally {
      dbModule.db = originalDb;
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; if (report.financialAfterSetup) { report.financialAfterOperations = await financial(); report.noOperationFinancialEffects = report.financialAfterSetup.hash === report.financialAfterOperations.hash; } }
      catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.checks.length === 10 && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-unique-current-runtime-' + stamp + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects })); await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { sources, outside, routing, publicationRace, adverseStates, independentPublication };
  if (require.main === module) runMain();
}
