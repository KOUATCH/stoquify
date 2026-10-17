// Author-only until coordinated source freeze and explicit --run.
// All accounts, actors, amounts and approvals are synthetic owned test records.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. --run requires coordinated review and the exact owned database.');
} else {
  const recovery = require('./close-current-recovery-runtime.cjs'), d = recovery.d, h = d.h;
  const { f, db, helper, root, organizations } = h, { fs, path, crypto, assert } = f;
  const { PrismaClient, Prisma } = require('@prisma/client');
  const { AsyncLocalStorage } = require('node:async_hooks');
  const load = file => require(path.join(root, file));
  const posting = load('services/accounting/posting.service.ts');
  const { runCloseAssurance } = load('services/accounting/close-assurance.service.ts');
  const { createFiscalYearWithPeriods } = load('services/accounting/periods.service.ts');
  const { createManualJournalEntry } = load('services/accounting/journals.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db;
  const run = crypto.randomUUID(), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const report = { run, at: new Date().toISOString(), checks: [], fixtures: [], scope: 'Exact identity-guarded owned loopback database. Actual nonzero manual journal reversal, Cash/Close observations, assessments, system certification, transaction rollback and PostgreSQL ordering. No source-result substitution, READY fabrication, migration, seed, external delivery or production/customer approval.',
    limitations: ['Cumulative class-3 eligibility is covered by focused product tests; this driver uses cash/capital journals and does not claim a real inventory-adjustment journey.', 'Service controls use trusted synthetic actors and fresh timestamps; this driver is not a session or RBAC revocation proof.', 'The h.fixture setup note prohibiting subsequent financial writes applies to its original verifier; this driver explicitly authorizes and checks only the exact synthetic reversals described here.'] };
  const files = [...new Set([__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])].sort();
  const sources = () => ({ ...recovery.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const financialModels = ['journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'payment', 'supplierInvoice', 'supplierPayment', 'inventoryTransaction'];
  const effectModels = [...financialModels, 'ledgerAuditEvent', 'auditLog', 'businessEvent', 'businessEventOutbox', 'businessEventAudit', 'closeRun', 'closeChecklistItem', 'closeAssuranceFinding', 'closeEvidenceItem', 'closePackExport'];
  function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
  async function bounded(work, label, milliseconds = 30000) { let timer; try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out')), milliseconds); })]); } finally { clearTimeout(timer); } }
  const outcome = promise => promise.then(value => ({ success: true, value }), error => ({ success: false, error: f.safe(error), code: error.code }));
  async function rows(x, models = financialModels) { const result = {}; for (const model of models) result[model] = await db[model].findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }); return result; }
  async function pid(tx) { const result = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database'); assert.equal(result[0].database, helper.database); return result[0].pid; }
  async function independentClient() { const client = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 45000, maxWait: 10000 } }); await assertDisposableDatabaseIdentity(client, helper.database); return client; }
  async function blocking(waiterPid, holderPid) {
    assert.ok(waiterPid && holderPid && waiterPid !== holderPid);
    return helper.withClient(f.target, async client => {
      await helper.assertOwned(client); const until = Date.now() + 5000;
      do { const found = (await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiterPid])).rows[0].blockers;
        if (found.includes(holderPid)) return { waiterPid, holderPid, blockers: found, observed: true };
        await new Promise(resolve => setTimeout(resolve, 40));
      } while (Date.now() < until);
      throw new Error('Expected PostgreSQL blocker PID was not observed');
    });
  }
  async function fixture(label, cash = false) {
    const x = await h.fixture('manual-' + label);
    const role = await db.role.findFirstOrThrow({ where: { organizationId: x.organizationId, code: 'owned-close-verifier' } });
    await db.role.update({ where: { id: role.id }, data: { permissions: [...new Set([...role.permissions, 'accounting.journal.reverse'])] } });
    if (cash) await recovery.prepareCashActor(x);
    report.fixtures.push({ label, organizationId: x.organizationId, periodId: x.periodId, originalJournalId: x.info.setup.journalEntryId, originalRunId: x.closeRunId, actors: x.info.actorIds, financialSetup: 'Actual independently posted synthetic 100 XAF cash/capital journal' });
    return x;
  }
  async function reverse(x, originalId = x.info.setup.journalEntryId, reversalDate = new Date()) {
    const at = new Date();
    return posting.reverseJournalEntry(x.organizationId, originalId, x.certifierId, 'LOCAL SYNTHETIC TEST correction; no customer funds', reversalDate,
      { actorPermissions: ['accounting.journal.reverse'], lastAuthAt: at, now: at });
  }
  async function assess(x, label) { return runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'owned-manual-' + label + '-' + run }, { actorId: x.makerId, actorPermissions: ['accounting.close.run'], now: new Date() }); }
  async function certifiedArtifact(x, label) {
    const result = await recovery.certify(x), file = path.join(__dirname, 'journal-manual-' + run + '-' + label + '-certified.json');
    fs.writeFileSync(file, result.content, { flag: 'wx' });
    return { file, bytesHash: sha(fs.readFileSync(file)), row: await db.closePackExport.findUniqueOrThrow({ where: { id: result.exportId } }), history: await d.history(x) };
  }
  async function retained(x, artifact) {
    assert.equal(sha(fs.readFileSync(artifact.file)), artifact.bytesHash);
    const current = await d.history(x);
    for (const key of ['evidence', 'checklist', 'findings']) assert.deepEqual(current[key], artifact.history[key]);
    assert.equal(current.exports.length, artifact.history.exports.length);
    const immutable = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['metadata', 'updatedAt'].includes(key)));
    for (const saved of artifact.history.exports) {
      const value = current.exports.find(row => row.id === saved.id); assert.ok(value); assert.deepEqual(immutable(value), immutable(saved));
      if (saved.id === artifact.row.id) assert.equal(value.metadata?.staleState?.status, 'EVIDENCE_STALE');
    }
    return { exportId: artifact.row.id, file: artifact.file, bytesHash: artifact.bytesHash, contentHash: artifact.row.contentHash, retainedHistoryHash: f.hash(current) };
  }
  async function exactReversals(x, before, pairs) {
    const after = await rows(x), changedOriginals = new Set(pairs.map(pair => pair.originalId));
    const expectedLines = pairs.reduce((sum, pair) => sum + before.journalEntryLine.filter(line => line.journalEntryId === pair.originalId).length, 0);
    for (const [model, delta] of [['journalEntry', pairs.length], ['journalEntryLine', expectedLines], ['ledgerPostingBatch', pairs.length], ['accountingSourceLink', pairs.length]]) assert.equal(after[model].length, before[model].length + delta, model + ' exact delta');
    for (const model of financialModels.filter(name => name !== 'journalEntry')) {
      const oldIds = new Set(before[model].map(row => row.id)); assert.deepEqual(after[model].filter(row => oldIds.has(row.id)), before[model], model + ' existing records unchanged');
    }
    const unchanged = journal => Object.fromEntries(Object.entries(journal).filter(([key]) => !['status', 'reversedAt', 'reversedById', 'updatedAt'].includes(key)));
    for (const saved of before.journalEntry) { const current = after.journalEntry.find(row => row.id === saved.id); assert.ok(current);
      if (!changedOriginals.has(saved.id)) assert.deepEqual(current, saved);
      else { assert.deepEqual(unchanged(current), unchanged(saved)); assert.equal(current.status, 'REVERSED'); assert.equal(current.reversedById, x.certifierId); assert.ok(current.reversedAt); }
    }
    const proofs = [];
    for (const pair of pairs) {
      const old = before.journalEntry.find(row => row.id === pair.originalId), journal = after.journalEntry.find(row => row.id === pair.reversalId); assert.ok(old && journal);
      assert.equal(journal.reversalOfEntryId, old.id); assert.equal(journal.status, 'POSTED'); assert.equal(journal.sourceType, 'MANUAL'); assert.equal(journal.sourceId, old.id); assert.equal(journal.postingPurpose, 'REVERSAL'); assert.equal(journal.postedById, x.certifierId);
      const oldLines = before.journalEntryLine.filter(line => line.journalEntryId === old.id).sort((a, b) => a.lineNumber - b.lineNumber), newLines = after.journalEntryLine.filter(line => line.journalEntryId === journal.id).sort((a, b) => a.lineNumber - b.lineNumber);
      assert.equal(newLines.length, oldLines.length); let debit = new Prisma.Decimal(0), credit = new Prisma.Decimal(0), baseDebit = new Prisma.Decimal(0), baseCredit = new Prisma.Decimal(0);
      for (let index = 0; index < oldLines.length; index++) {
        const a = oldLines[index], b = newLines[index]; assert.equal(b.organizationId, x.organizationId); assert.equal(b.accountId, a.accountId);
        for (const [to, from] of [['debit', 'credit'], ['credit', 'debit'], ['baseDebit', 'baseCredit'], ['baseCredit', 'baseDebit']]) { assert.ok(a[from] !== null && b[to] !== null); assert.ok(b[to].eq(a[from]), to + ' exact mirror'); }
        for (const key of ['currency', 'locationId', 'customerId', 'supplierId', 'itemId', 'dimensions', 'metadata']) assert.deepEqual(b[key], a[key]);
        assert.ok(b.exchangeRate.eq(a.exchangeRate)); debit = debit.plus(b.debit); credit = credit.plus(b.credit); baseDebit = baseDebit.plus(b.baseDebit); baseCredit = baseCredit.plus(b.baseCredit);
      }
      assert.ok(debit.gt(0) && debit.eq(credit) && baseDebit.eq(baseCredit));
      const batch = after.ledgerPostingBatch.find(row => row.id === journal.postingBatchId); assert.ok(batch); assert.equal(batch.status, 'POSTED'); assert.equal(batch.sourceId, old.id); assert.equal(batch.postingPurpose, 'REVERSAL');
      const links = after.accountingSourceLink.filter(row => row.journalEntryId === journal.id); assert.equal(links.length, 1); assert.equal(links[0].postingBatchId, batch.id); assert.equal(links[0].sourceId, old.id);
      proofs.push({ originalJournalId: old.id, reversalJournalId: journal.id, postingBatchId: batch.id, sourceLinkId: links[0].id, debit: debit.toFixed(2), credit: credit.toFixed(2), baseDebit: baseDebit.toFixed(2), baseCredit: baseCredit.toFixed(2), lineCount: newLines.length });
    }
    for (const model of ['payment', 'supplierInvoice', 'supplierPayment', 'inventoryTransaction']) assert.deepEqual(after[model], before[model]);
    return { beforeHash: f.hash(before), afterHash: f.hash(after), expectedFinancialDelta: { journals: pairs.length, lines: expectedLines, batches: pairs.length, sourceLinks: pairs.length }, proofs, unrelatedFinancialRecordsUnchanged: true };
  }
  async function repeatedRefusal(x, originalId, reversalDate) {
    const before = await rows(x), state = await d.denialState(x); const result = await outcome(reverse(x, originalId, reversalDate));
    assert.equal(result.success, false); assert.match(result.error, /only posted journal entries can be reversed|already been reversed/i);
    assert.deepEqual(await rows(x), before); assert.deepEqual(await d.denialState(x), state);
    return { refused: true, code: result.code, reason: result.error, noAdditionalFinancialOrCloseEffects: true };
  }
  async function journey() {
    const x = await fixture('cash-recovery', true), artifact = await certifiedArtifact(x, 'cash-recovery');
    const initial = await recovery.observe(x, 'certified', { latestId: x.closeRunId, tone: 'success', explicitGrade: 'certified', noBlockers: true });
    const before = await rows(x), reversalDate = new Date(), reversal = await reverse(x, x.info.setup.journalEntryId, reversalDate);
    const delta = await exactReversals(x, before, [{ originalId: x.info.setup.journalEntryId, reversalId: reversal.id }]);
    const invalidation = await d.denialState(x); assert.equal(invalidation.run.status, 'BLOCKED'); assert.equal(invalidation.events.length, 1); assert.equal(invalidation.outbox.length, 1); assert.equal(invalidation.outbox[0].status, 'PENDING');
    assert.equal(invalidation.events[0].payload.sourceCode, 'LEDGER_JOURNAL_REVERSED'); assert.equal(invalidation.events[0].payload.sourceId, x.info.setup.journalEntryId); assert.equal(invalidation.events[0].payload.newEvidenceHash, reversal.id);
    const blocked = await recovery.observe(x, 'blocked', { latestId: x.closeRunId, tone: 'danger', explicitGrade: 'blocked', blocker: 'close-evidence-stale' });
    const history = await retained(x, artifact), repeated = await repeatedRefusal(x, x.info.setup.journalEntryId, reversalDate), recovered = await d.assessment(x, 'manual-cash-recovery');
    const operational = await recovery.observe(recovered, 'operational', { latestId: recovered.closeRunId, explicitGrade: 'operational', noBlockers: true });
    const newExport = await recovery.certify(recovered), completed = await recovery.observe(recovered, 'certified', { latestId: recovered.closeRunId, tone: 'success', explicitGrade: 'certified', noBlockers: true });
    assert.notEqual(recovered.closeRunId, x.closeRunId); assert.notEqual(newExport.exportId, artifact.row.id); assert.deepEqual(await retained(x, artifact), history); assert.equal(f.hash(await rows(x)), delta.afterHash);
    return { organizationId: x.organizationId, delta, initial, blocked, operational, completed, invalidationEventId: invalidation.events[0].id, retained: history, recoveredRunId: recovered.closeRunId, recoveredExportId: newExport.exportId, repeated };
  }
  // Wrappers observe/pause actual operations; all query results and decisions are
  // returned unchanged. AsyncLocalStorage assigns real independent connections.
  function routing(x, clients, mode) {
    const context = new AsyncLocalStorage(), state = { lanes: {}, events: [], held: deferred(), release: deferred(), attempt: deferred(), published: deferred(), collectors: deferred(), locked: {} };
    dbModule.db = new Proxy({}, { has(_object, key) { return key in (clients[context.getStore()] || db); }, get(_object, key) {
      const lane = context.getStore(), client = clients[lane] || db;
      if (key !== '$transaction' || !lane) { const value = Reflect.get(client, key); return typeof value === 'function' ? value.bind(client) : value; }
      return async (work, options) => {
        if (state.lanes[lane]?.observed || typeof work !== 'function') return client.$transaction(work, options);
        state.lanes[lane] = { observed: true }; let published;
        const result = await client.$transaction(async tx => {
          state.lanes[lane].pid = await pid(tx); assert.equal(options?.isolationLevel, 'ReadCommitted');
          const observed = new Proxy({}, { has(_tx, property) { return property in tx; }, get(_tx, property) {
            if (property === '$queryRaw') return async (...args) => {
              let lock; try { lock = JSON.parse(args[0]?.values?.[0]); } catch { /* Not an advisory key. */ }
              const periodId = lock?.[0] === 'close-assessment-order' && lock[1] === x.organizationId ? lock[2] : null;
              if (periodId) { state.events.push({ lane, event: 'period-lock-attempt', periodId }); if (state.holderLane && lane !== state.holderLane) state.attempt.resolve(); }
              const result = await tx.$queryRaw(...args);
              if (periodId) { (state.locked[lane] ??= []).push(periodId); state.events.push({ lane, event: 'period-lock-acquired', periodId }); }
              return result;
            };
            if (['ledgerPostingBatch', 'journalEntry', 'closeRun'].includes(property)) return new Proxy({}, { get(_model, method) {
              const fn = Reflect.get(tx[property], method); if (typeof fn !== 'function') return fn;
              return async (...args) => {
                const input = args[0];
                if (property === 'ledgerPostingBatch' && method === 'create' && ['producer-first', 'opposite'].includes(mode) && lane === 'producer') { state.holderLane = lane; state.held.resolve(); await bounded(state.release.promise, 'reversal write release'); }
                const value = await fn.apply(tx[property], args);
                if (property === 'journalEntry' && method === 'create' && mode === 'rollback' && lane === 'producer') { state.createdJournalId = value.id; throw new Error('Injected owned reversal-create rollback'); }
                if (property === 'closeRun' && method === 'create' && lane === 'creator' && input.data.status === 'RUNNING') {
                  published = value; state.events.push({ lane, event: 'running-inserted', runId: value.id });
                  if (mode === 'creator-first') { state.holderLane = lane; state.held.resolve(); await bounded(state.release.promise, 'publication commit release'); }
                }
                return value;
              };
            } });
            const value = Reflect.get(tx, property); return typeof value === 'function' ? value.bind(tx) : value;
          } }); return work(observed);
        }, { ...options, timeout: 45000, maxWait: 10000 });
        if (published) { state.createdRunId = published.id; state.published.resolve(published); if (mode === 'creator-first') await bounded(state.collectors.promise, 'collector release'); }
        return result;
      };
    } });
    return { state, run: (lane, work) => context.run(lane, work), restore: () => { dbModule.db = originalDb; } };
  }
  async function publicationRace(mode) {
    const x = await fixture(mode), artifact = await certifiedArtifact(x, mode), before = await rows(x), writer = await independentClient(), route = routing(x, { producer: writer }, mode), { state } = route;
    let producer, creator, proof;
    const startProducer = () => outcome(route.run('producer', () => reverse(x)));
    const startCreator = () => outcome(route.run('creator', () => assess(x, mode)));
    try {
      if (mode === 'creator-first') creator = startCreator(); else producer = startProducer();
      await bounded(state.held.promise, mode + ' first transaction hold');
      if (mode === 'creator-first') producer = startProducer(); else creator = startCreator();
      await bounded(state.attempt.promise, mode + ' second transaction lock attempt');
      proof = await blocking(state.lanes[mode === 'creator-first' ? 'producer' : 'creator'].pid, state.lanes[state.holderLane].pid);
      assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId, reversalOfEntryId: x.info.setup.journalEntryId } }), 0);
      if (mode === 'producer-first') assert.equal(state.events.some(event => event.event === 'running-inserted'), false);
      state.release.resolve();
      const reversed = await bounded(producer, mode + ' reversal commit'); assert.equal(reversed.success, true, reversed.error);
      if (mode === 'creator-first') {
        const published = await bounded(state.published.promise, 'new run published'), blocked = await db.closeRun.findUniqueOrThrow({ where: { id: published.id } });
        assert.equal(blocked.status, 'BLOCKED'); assert.equal(blocked.metadata?.staleState?.status, 'EVIDENCE_STALE'); state.collectors.resolve();
      }
      const assessed = await bounded(creator, mode + ' real collectors finish'); assert.equal(assessed.success, true, assessed.error);
      const saved = await db.closeRun.findUniqueOrThrow({ where: { id: state.createdRunId } });
      const currentState = await d.denialState({ ...x, closeRunId: saved.id });
      if (mode === 'creator-first') { assert.equal(saved.status, 'BLOCKED'); assert.equal(currentState.events.length, 1); assert.equal(await db.closeChecklistItem.count({ where: { closeRunId: saved.id } }), 0); }
      else { assert.equal(saved.status, 'READY'); assert.equal(saved.metadata.trustLevel, 'T4'); assert.equal(currentState.events.length, 0); assert.notEqual(saved.metadata?.staleState?.status, 'EVIDENCE_STALE'); }
      assert.deepEqual(state.locked.producer, [...new Set(state.locked.producer)].sort()); assert.ok(state.locked.producer.includes(x.periodId));
      const delta = await exactReversals(x, before, [{ originalId: x.info.setup.journalEntryId, reversalId: reversed.value.id }]);
      return { organizationId: x.organizationId, blocking: proof, events: state.events, lockedPeriods: state.locked.producer, newRunId: saved.id, newRunStatus: saved.status, newRunTrust: saved.metadata?.trustLevel || null, invalidations: currentState.events.length, delta, retained: await retained(x, artifact) };
    } finally { state.release.resolve(); state.collectors.resolve(); await Promise.allSettled([producer, creator].filter(Boolean)); route.restore(); await writer.$disconnect(); }
  }
  async function extraPeriod(x) {
    const current = await db.accountingPeriod.findUniqueOrThrow({ where: { id: x.periodId } }), startDate = new Date(Date.UTC(current.startDate.getUTCFullYear(), current.startDate.getUTCMonth() - 1, 1)), endDate = new Date(current.startDate.getTime() - 1);
    const year = await createFiscalYearWithPeriods(x.organizationId, { name: 'Synthetic opposite reversal period ' + run, startDate, endDate }, x.makerId), period = year.periods[0]; assert.ok(period);
    const original = await db.journalEntry.findUniqueOrThrow({ where: { id: x.info.setup.journalEntryId }, include: { lines: true } });
    const date = new Date(period.startDate.getTime() + 43200000), entry = await createManualJournalEntry(x.organizationId, { journalId: original.journalId, entryDate: date, memo: 'LOCAL SYNTHETIC opposite-period setup only', lines: original.lines.map(line => ({ accountId: line.accountId, debit: line.debit.toString(), credit: line.credit.toString(), currency: line.currency })) }, x.makerId);
    const at = new Date(); await posting.postJournalEntry(x.organizationId, entry.id, x.info.actorIds.checker, { actorPermissions: ['accounting.journal.post'], lastAuthAt: at, now: at });
    return { ...x, periodId: period.id, setupJournalId: entry.id, date };
  }
  async function oppositePeriods() {
    const x = await fixture('opposite'), earlier = await d.assessment(await extraPeriod(x), 'manual-opposite-earlier');
    const current = await d.assessment(x, 'manual-opposite-current'), artifacts = [await certifiedArtifact(current, 'opposite-current'), await certifiedArtifact(earlier, 'opposite-earlier')], before = await rows(x);
    const writer = await independentClient(), second = await independentClient(), route = routing(x, { producer: writer, second }, 'opposite'), { state } = route; let firstOperation, secondOperation;
    try {
      firstOperation = outcome(route.run('producer', () => reverse(x, x.info.setup.journalEntryId, earlier.date)));
      await bounded(state.held.promise, 'first cross-period reversal held');
      secondOperation = outcome(route.run('second', () => reverse(x, earlier.setupJournalId, new Date())));
      await bounded(state.attempt.promise, 'opposite reversal period attempt'); const proof = await blocking(state.lanes.second.pid, state.lanes.producer.pid); state.release.resolve();
      const first = await bounded(firstOperation, 'first cross-period commit'), other = await bounded(secondOperation, 'second cross-period commit'); assert.equal(first.success, true, first.error); assert.equal(other.success, true, other.error);
      const expected = [x.periodId, earlier.periodId].sort(); assert.deepEqual(state.locked.producer, expected); assert.deepEqual(state.locked.second, expected);
      const delta = await exactReversals(x, before, [{ originalId: x.info.setup.journalEntryId, reversalId: first.value.id }, { originalId: earlier.setupJournalId, reversalId: other.value.id }]);
      for (const target of [current, earlier]) { const result = await d.denialState(target); assert.equal(result.run.status, 'BLOCKED'); assert.equal(result.events.length, 2); }
      return { organizationId: x.organizationId, periodIds: expected, blocking: proof, events: state.events, delta, retained: [await retained(current, artifacts[0]), await retained(earlier, artifacts[1])] };
    } finally { state.release.resolve(); await Promise.allSettled([firstOperation, secondOperation].filter(Boolean)); route.restore(); await Promise.all([writer.$disconnect(), second.$disconnect()]); }
  }
  async function rollbackRetry() {
    const x = await fixture('rollback'), artifact = await certifiedArtifact(x, 'rollback'), before = await rows(x), allBefore = await rows(x, effectModels), writer = await independentClient(), route = routing(x, { producer: writer }, 'rollback');
    let failed;
    try { failed = await outcome(route.run('producer', () => reverse(x))); assert.equal(failed.success, false); assert.match(failed.error, /Injected owned reversal-create rollback/); assert.ok(route.state.createdJournalId); }
    finally { route.restore(); await writer.$disconnect(); }
    assert.deepEqual(await rows(x, effectModels), allBefore, 'All journal, source, audit and Close changes roll back together');
    assert.equal(await db.journalEntry.count({ where: { id: route.state.createdJournalId } }), 0);
    const retried = await reverse(x), delta = await exactReversals(x, before, [{ originalId: x.info.setup.journalEntryId, reversalId: retried.id }]);
    const invalidation = await d.denialState(x); assert.equal(invalidation.events.length, 1); assert.equal(invalidation.run.status, 'BLOCKED');
    return { organizationId: x.organizationId, rolledBackJournalId: route.state.createdJournalId, refused: failed.error, exactRollbackHash: f.hash(allBefore), independentRetryJournalId: retried.id, delta, retained: await retained(x, artifact) };
  }
  async function check(id, work) { const began = Date.now(), result = await work(); report.checks.push({ id, status: 'passed', elapsedMs: Date.now() - began, ...result }); console.log(JSON.stringify({ id, status: 'passed' })); }
  async function main() {
    await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await d.outside(); report.financialBeforeSetup = await h.financial();
    await check('actual-manual-reversal-cash-close-recovery', journey);
    await check('reversal-first-blocks-assessment-publication', () => publicationRace('producer-first'));
    await check('assessment-first-retains-invalidation-after-collectors', () => publicationRace('creator-first'));
    await check('opposite-period-reversals-share-one-sorted-boundary', oppositePeriods);
    await check('reversal-creation-rollback-and-independent-retry', rollbackRetry);
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); report.failureKind = error.prerequisite ? 'prerequisite-blocked' : 'verification-failed'; report.prerequisite = error.prerequisite; }
    finally {
      dbModule.db = originalDb;
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await d.outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfterOperations = await h.financial(); } catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.checks.length === 5 && report.checks.every(check => check.status === 'passed') && report.sourceStable && report.outsideUnchanged;
      const file = path.join(__dirname, 'journal-manual-runtime-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.length, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  if (require.main === module) runMain();
  module.exports = { h, d, sources, rows, exactReversals, fixture, routing };
}
