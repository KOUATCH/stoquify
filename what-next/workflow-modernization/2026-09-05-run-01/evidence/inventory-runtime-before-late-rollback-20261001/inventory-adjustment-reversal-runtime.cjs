// Prepared only: coordinator reviews source and releases the exact owned DB lane.
// Synthetic service actors are not authenticated approvals or statutory certification.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. --run requires coordinated source freeze and owned database release.');
} else {
  const recovery = require('./close-current-recovery-runtime.cjs'), d = recovery.d, h = d.h;
  const { f, db, root, helper, organizations } = h, { fs, path, crypto, assert } = f;
  const { PrismaClient, Prisma } = require('@prisma/client');
  const { AsyncLocalStorage } = require('node:async_hooks');
  const load = file => require(path.join(root, file));
  const adjustment = load('services/inventory/inventory-adjustment.service.ts');
  const { reverseStockAdjustment } = load('services/inventory/inventory-adjustment-reversal.service.ts');
  const { reconcileInventoryClass3 } = load('services/inventory/inventory-reconciliation.service.ts');
  const { runCloseAssurance } = load('services/accounting/close-assurance.service.ts');
  const { createFiscalYearWithPeriods } = load('services/accounting/periods.service.ts');
  const { createManualJournalEntry } = load('services/accounting/journals.service.ts');
  const { postJournalEntry } = load('services/accounting/posting.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db, stamp = crypto.randomUUID();
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const predecessor = path.join(root, 'what-next/workflow-modernization/2026-09-05-run-01/evidence/source-reversal-before-inventory-7626709c-c422-4302-a71c-5a2224db92d8');
  const report = { run: stamp, at: new Date().toISOString(), checks: [], fixtures: [],
    scope: 'Exact owned loopback database. Actual manual stock request/submission, independent adjustment posting, stock/journal compensation, Close assessment/certification, Cash read models and PostgreSQL lock waits. No fabricated business states, customer approvals, migrations, seeds or external delivery.',
    limitations: ['The internal reversal service accepts distinct asserted actor IDs; this is not session, persisted permission or fresh-auth verification.',
      'Exact replay is tested for identical inputs only; existing changed-payload replay semantics are outside this change.',
      'Synthetic master records are setup only. Actual stock and ledger effects are explicitly measured; the original h.fixture no-further-financial-writes note does not describe this separate verifier.',
      'No other stock producer is claimed to join the new reversal ordering boundary.'] };
  const files = [...new Set([__filename, ...['metadata.json', 'inventory-adjustment-reversal.service.ts', 'inventory-adjustment-reversal.service.test.ts'].map(file => path.join(predecessor, file)),
    ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])].sort();
  const sources = () => ({ ...recovery.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const financialModels = ['journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'inventoryTransaction', 'inventoryLevel', 'stockAdjustment', 'stockAdjustmentLine', 'payment', 'supplierInvoice', 'supplierPayment', 'customerLedgerEntry', 'customerSettlement'];
  const effectModels = [...financialModels, 'ledgerAuditEvent', 'auditLog', 'businessEvent', 'businessEventOutbox', 'businessEventAudit', 'closeRun', 'closeChecklistItem', 'closeAssuranceFinding', 'closeEvidenceItem', 'closePackExport'];
  const where = (model, scope) => model === 'inventoryLevel' ? { item: { organizationId: scope } } : model === 'stockAdjustmentLine' ? { adjustment: { organizationId: scope } } : { organizationId: scope };
  async function rows(x, models = financialModels) { const result = {}; for (const model of models) result[model] = await db[model].findMany({ where: where(model, x.organizationId), orderBy: { id: 'asc' } }); return result; }
  async function outside() { const inherited = await recovery.outside(), extra = {}; for (const model of [...new Set([...financialModels, 'item', 'location', 'auditLog'])]) extra[model] = f.hash(await db[model].findMany({ where: where(model, { notIn: organizations }), orderBy: { id: 'asc' } })); return { hash: f.hash({ inherited, extra }), inherited, extra }; }
  async function guard() { await assertDisposableDatabaseIdentity(db, helper.database); await helper.withClient(f.target, helper.assertOwned); }
  function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
  async function bounded(work, label, ms = 35000) { let timer; try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out')), ms); })]); } finally { clearTimeout(timer); } }
  const outcome = work => work.then(value => ({ success: true, value }), error => ({ success: false, error: f.safe(error), code: error.code }));
  const annex = x => reconcileInventoryClass3({ organizationId: x.organizationId, periodId: x.periodId, currency: 'XAF' }, db);
  const command = x => ({ organizationId: x.organizationId, originalAdjustmentId: x.adjustmentId, requestedById: x.makerId, approvedById: x.info.actorIds.checker,
    reason: 'LOCAL SYNTHETIC exact stock compensation; no customer approval', effectiveAt: x.reversalDate, idempotencyKey: 'owned-inventory-reversal-' + x.adjustmentId, correlationId: 'owned-inventory-reversal-' + stamp });
  const reverse = (x, client) => client ? reverseStockAdjustment(command(x), client) : reverseStockAdjustment(command(x));
  async function fixture(label, cash = false) {
    await guard(); let x = await h.fixture('inventory-reversal-' + label); const sourceDate = new Date();
    const item = await db.item.create({ data: { organizationId: x.organizationId, sku: 'OWNED-REVERSAL', slug: 'owned-reversal-' + stamp, nameEn: 'Synthetic reversal stock', nameFr: 'Stock de contrepassation synthétique', costPrice: '100', sellingPrice: '120', trackInventory: true, imageUrls: [] } });
    const location = await db.location.create({ data: { organizationId: x.organizationId, code: 'OWNED-REVERSAL', name: 'Synthetic empty inventory location', isDefault: true } });
    const request = await adjustment.requestManualItemStockAdjustment({ organizationId: x.organizationId, itemId: item.id, locationId: location.id, actorId: x.makerId, quantityChange: '2', mode: 'delta', unitCost: '100', occurredAt: sourceDate, reason: 'LOCAL SYNTHETIC stock gain setup' }, db);
    assert.equal(request.adjustment.status, 'SUBMITTED'); assert.equal(request.quantityDelta, '2.000'); assert.equal(request.requiresApproval, true);
    const posted = await adjustment.postStockAdjustment({ organizationId: x.organizationId, adjustmentId: request.adjustment.id, approvedById: x.info.actorIds.checker, occurredAt: sourceDate }, db);
    assert.equal(posted.ledger.status, 'POSTED'); assert.equal(posted.adjustment.status, 'COMPLETED'); assert.equal(posted.movementTransactionIds.length, 1);
    const level = await db.inventoryLevel.findUniqueOrThrow({ where: { itemId_locationId: { itemId: item.id, locationId: location.id } } }); assert.ok(level.quantityOnHand.eq(2) && level.totalValue.eq(200));
    x = { ...x, itemId: item.id, locationId: location.id, levelId: level.id, adjustmentId: posted.adjustment.id, originalJournalId: posted.ledger.journalEntryId, originalMovementIds: posted.movementTransactionIds, sourceDate, reversalDate: new Date() };
    const observed = await annex(x); assert.equal(observed.status, 'PASSED');
    x = await d.assessment(x, 'inventory-before-' + label); if (cash) await recovery.prepareCashActor(x);
    report.fixtures.push({ label, organizationId: x.organizationId, periodId: x.periodId, closeRunId: x.closeRunId, itemId: item.id, locationId: location.id, adjustmentId: x.adjustmentId, journalId: x.originalJournalId, movementIds: x.originalMovementIds, sourceDate, reversalDate: x.reversalDate, quantity: '2.000', value: '200.00', annexHash: observed.evidenceHash, actors: x.info.actorIds });
    return x;
  }
  async function artifact(x, label) { const result = await recovery.certify(x), file = path.join(__dirname, 'inventory-reversal-' + stamp + '-' + label + '-certified.json'); fs.writeFileSync(file, result.content, { flag: 'wx' }); return { file, bytesHash: sha(fs.readFileSync(file)), row: await db.closePackExport.findUniqueOrThrow({ where: { id: result.exportId } }), history: await d.history(x) }; }
  async function retained(x, saved) {
    assert.equal(sha(fs.readFileSync(saved.file)), saved.bytesHash); const current = await d.history(x);
    for (const key of ['evidence', 'checklist', 'findings']) assert.deepEqual(current[key], saved.history[key]);
    assert.equal(current.exports.length, saved.history.exports.length);
    const immutable = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['metadata', 'updatedAt'].includes(key)));
    for (const old of saved.history.exports) { const value = current.exports.find(row => row.id === old.id); assert.ok(value); assert.deepEqual(immutable(value), immutable(old)); if (old.id === saved.row.id) assert.equal(value.metadata?.staleState?.status, 'EVIDENCE_STALE'); }
    return { exportId: saved.row.id, file: saved.file, bytesHash: saved.bytesHash, contentHash: saved.row.contentHash, retainedHistoryHash: f.hash(current) };
  }
  async function assertReversal(x, before, result) {
    const after = await rows(x), originalLines = before.journalEntryLine.filter(row => row.journalEntryId === x.originalJournalId).sort((a, b) => a.lineNumber - b.lineNumber);
    const changes = { journalEntry: 1, journalEntryLine: originalLines.length, ledgerPostingBatch: 1, accountingSourceLink: 1, inventoryTransaction: x.originalMovementIds.length, inventoryLevel: 0, stockAdjustment: 1, stockAdjustmentLine: 1 };
    for (const model of financialModels) {
      assert.equal(after[model].length, before[model].length + (changes[model] || 0), model + ' exact delta');
      for (const old of before[model]) {
        const current = after[model].find(row => row.id === old.id); assert.ok(current);
        if (model === 'journalEntry' && old.id === x.originalJournalId) {
          const allowed = ['status', 'reversedAt', 'reversedById', 'updatedAt']; const strip = row => Object.fromEntries(Object.entries(row).filter(([key]) => !allowed.includes(key)));
          assert.deepEqual(strip(current), strip(old)); assert.equal(current.status, 'REVERSED'); assert.equal(current.reversedById, command(x).approvedById); assert.ok(current.reversedAt);
        } else if (model === 'inventoryLevel' && old.id === x.levelId) {
          const allowed = ['quantityOnHand', 'quantityAvailable', 'totalValue', 'averageCost', 'lastTransactionAt', 'updatedAt', 'version']; const strip = row => Object.fromEntries(Object.entries(row).filter(([key]) => !allowed.includes(key)));
          assert.deepEqual(strip(current), strip(old)); for (const field of ['quantityOnHand', 'quantityAvailable', 'totalValue', 'averageCost']) assert.ok(current[field].eq(0), field + ' exact empty projection'); assert.equal(current.version, old.version + 1);
        } else assert.deepEqual(current, old, model + ' pre-existing row unchanged');
      }
    }
    assert.equal(result.replayed, false); const correction = after.stockAdjustment.find(row => row.id === result.correctionAdjustmentId); assert.ok(correction); assert.equal(correction.reversalOfAdjustmentId, x.adjustmentId); assert.equal(correction.status, 'COMPLETED'); assert.equal(correction.correctionKind, 'REVERSAL');
    const reversalJournal = after.journalEntry.find(row => row.id === result.journalEntryId); assert.ok(reversalJournal); assert.equal(reversalJournal.reversalOfEntryId, x.originalJournalId); assert.equal(reversalJournal.postingPurpose, 'REVERSAL'); assert.equal(reversalJournal.status, 'POSTED'); assert.equal(reversalJournal.sourceId, correction.id);
    const lines = after.journalEntryLine.filter(row => row.journalEntryId === reversalJournal.id).sort((a, b) => a.lineNumber - b.lineNumber); let debit = new Prisma.Decimal(0), credit = new Prisma.Decimal(0);
    for (let index = 0; index < originalLines.length; index++) { const old = originalLines[index], current = lines[index]; assert.equal(current.accountId, old.accountId); for (const [to, from] of [['debit', 'credit'], ['credit', 'debit'], ['baseDebit', 'baseCredit'], ['baseCredit', 'baseDebit']]) assert.ok(current[to].eq(old[from])); for (const key of ['currency', 'locationId', 'customerId', 'supplierId', 'itemId', 'dimensions']) assert.deepEqual(current[key], old[key]); assert.ok(current.exchangeRate.eq(old.exchangeRate)); debit = debit.plus(current.debit); credit = credit.plus(current.credit); }
    assert.ok(debit.eq(200) && credit.eq(200));
    for (const movementId of x.originalMovementIds) { const old = before.inventoryTransaction.find(row => row.id === movementId), current = after.inventoryTransaction.find(row => row.reversalOfTransactionId === movementId); assert.ok(current); assert.ok(current.quantity.eq(old.quantity.negated())); assert.ok(current.unitCost.eq(old.unitCost) && current.totalCost.eq(old.totalCost)); assert.equal(current.referenceId, correction.id); assert.equal(current.effectiveAt.toISOString(), x.reversalDate.toISOString()); }
    const batch = after.ledgerPostingBatch.find(row => row.id === result.postingBatchId), links = after.accountingSourceLink.filter(row => row.journalEntryId === reversalJournal.id); assert.equal(batch.status, 'POSTED'); assert.equal(batch.sourceId, correction.id); assert.equal(links.length, 1); assert.equal(links[0].postingBatchId, batch.id); assert.equal(links[0].sourceId, correction.id);
    const event = await db.businessEvent.findUniqueOrThrow({ where: { id: result.eventId } }); assert.equal(event.status, 'APPLIED'); assert.equal(event.eventType, 'stock.adjustment.reversed'); assert.equal(event.sourceId, correction.id); assert.equal(event.documentHash, result.documentHash);
    return { beforeHash: f.hash(before), afterHash: f.hash(after), exactDelta: changes, reversalJournalId: reversalJournal.id, correctionId: correction.id, debit: debit.toFixed(2), credit: credit.toFixed(2), eventId: event.id, unrelatedExistingRowsUnchanged: true };
  }
  async function replay(x, first) { const before = await rows(x, effectModels), value = await reverse(x); assert.equal(value.replayed, true); for (const key of ['correctionAdjustmentId', 'eventId', 'postingBatchId', 'journalEntryId', 'documentHash']) assert.equal(value[key], first[key]); assert.deepEqual(await rows(x, effectModels), before); return { exactReplay: true, completeEffectsHash: f.hash(before) }; }
  async function invalidated(x, result, expected = 2) { const state = await d.denialState(x); assert.equal(state.run.status, 'BLOCKED'); assert.equal(state.run.metadata?.staleState?.status, 'EVIDENCE_STALE'); assert.equal(state.events.length, expected); assert.equal(state.outbox.length, expected); const inventory = state.events.find(row => row.payload.sourceCode === 'INVENTORY_VALUATION_WRITE'); assert.ok(inventory); assert.equal(inventory.payload.sourceId, result.correctionAdjustmentId); assert.equal(inventory.payload.newEvidenceHash, result.documentHash); if (expected === 2) { const journal = state.events.find(row => row.payload.sourceCode === 'LEDGER_JOURNAL_REVERSED'); assert.ok(journal); assert.equal(journal.payload.sourceId, x.originalJournalId); assert.equal(journal.payload.newEvidenceHash, result.journalEntryId); } return { runId: state.run.id, eventIds: state.events.map(row => row.id), sourceCodes: state.events.map(row => row.payload.sourceCode) }; }
  async function journey() {
    const x = await fixture('journey', true), saved = await artifact(x, 'journey'), before = await rows(x), initial = await recovery.observe(x, 'certified', { latestId: x.closeRunId, explicitGrade: 'certified', noBlockers: true });
    const originalAnnex = await annex(x), result = await reverse(x), delta = await assertReversal(x, before, result), stale = await invalidated(x, result), retainedHistory = await retained(x, saved), repeated = await replay(x, result);
    const currentAnnex = await annex(x); assert.equal(currentAnnex.status, 'PASSED'); assert.notEqual(currentAnnex.evidenceHash, originalAnnex.evidenceHash);
    const blocked = await recovery.observe(x, 'blocked', { latestId: x.closeRunId, explicitGrade: 'blocked', blocker: 'close-evidence-stale' }), recovered = await d.assessment(x, 'inventory-recovered');
    const certified = await recovery.certify(recovered), completed = await recovery.observe(recovered, 'certified', { latestId: recovered.closeRunId, explicitGrade: 'certified', noBlockers: true }); assert.notEqual(certified.exportId, saved.row.id); assert.equal(f.hash(await rows(x)), delta.afterHash); assert.deepEqual(await retained(x, saved), retainedHistory);
    return { organizationId: x.organizationId, delta, initial, blocked, completed, invalidation: stale, retained: retainedHistory, repeated, recoveredRunId: recovered.closeRunId, recoveredExportId: certified.exportId, annexBefore: originalAnnex.evidenceHash, annexAfter: currentAnnex.evidenceHash };
  }
  async function independentClient() { const client = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 45000, maxWait: 10000 } }); await assertDisposableDatabaseIdentity(client, helper.database); return client; }
  async function pid(tx) { const value = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database'); assert.equal(value[0].database, helper.database); return value[0].pid; }
  async function blocking(waiterPid, holderPid) { assert.ok(waiterPid && holderPid && waiterPid !== holderPid); return helper.withClient(f.target, async client => { await helper.assertOwned(client); const until = Date.now() + 5000; do { const found = (await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiterPid])).rows[0].blockers; if (found.includes(holderPid)) return { waiterPid, holderPid, blockers: found, observed: true }; await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < until); throw new Error('Actual PostgreSQL lock wait was not observed'); }); }
  // Pauses actual service operations only; never replaces query responses.
  function routing(x, writer, mode) {
    const storage = new AsyncLocalStorage(), state = { lanes: {}, events: [], locked: {}, held: deferred(), release: deferred(), attempt: deferred(), published: deferred(), collectors: deferred() };
    dbModule.db = new Proxy({}, { has(_obj, key) { return key in (storage.getStore() === 'producer' ? writer : db); }, get(_obj, key) { const lane = storage.getStore(), client = lane === 'producer' ? writer : db;
      if (key !== '$transaction' || !lane) { const value = Reflect.get(client, key); return typeof value === 'function' ? value.bind(client) : value; }
      return async (work, options) => { if (state.lanes[lane]?.observed || typeof work !== 'function') return client.$transaction(work, options); state.lanes[lane] = { observed: true }; let published;
        const value = await client.$transaction(async tx => { state.lanes[lane].pid = await pid(tx); assert.equal(options?.isolationLevel, 'ReadCommitted');
          const observed = new Proxy({}, { has(_tx, key) { return key in tx; }, get(_tx, key) {
            if (key === '$queryRaw') return async (...args) => { let lock; try { lock = JSON.parse(args[0]?.values?.[0]); } catch { /* Not a lock-key query. */ } const periodId = lock?.[0] === 'close-assessment-order' && lock[1] === x.organizationId ? lock[2] : null;
              if (periodId) { state.events.push({ lane, event: 'period-attempt', periodId }); if (state.holder && state.holder !== lane) state.attempt.resolve(); } const result = await tx.$queryRaw(...args); if (periodId) { (state.locked[lane] ??= []).push(periodId); state.events.push({ lane, event: 'period-acquired', periodId }); } return result; };
            if (['stockAdjustment', 'inventoryTransaction', 'closeRun'].includes(key)) return new Proxy({}, { get(_model, method) { const fn = Reflect.get(tx[key], method); if (typeof fn !== 'function') return fn; return async (...args) => {
              if (key === 'stockAdjustment' && method === 'create' && mode === 'producer-first' && lane === 'producer') { state.holder = lane; state.held.resolve(); await bounded(state.release.promise, 'producer source-write release'); }
              const result = await fn.apply(tx[key], args);
              if (key === 'inventoryTransaction' && method === 'create' && mode === 'rollback' && lane === 'producer') { state.rolledBackMovementId = result.id; throw new Error('Injected owned inventory reversal rollback'); }
              if (key === 'closeRun' && method === 'create' && args[0].data.status === 'RUNNING' && lane === 'creator') { published = result; state.events.push({ lane, event: 'running-inserted', runId: result.id }); if (mode === 'creator-first') { state.holder = lane; state.held.resolve(); await bounded(state.release.promise, 'creator commit release'); } } return result;
            }; } }); const value = Reflect.get(tx, key); return typeof value === 'function' ? value.bind(tx) : value;
          } }); return work(observed);
        }, { ...options, timeout: 45000, maxWait: 10000 }); if (published) { state.createdRunId = published.id; state.published.resolve(published); if (mode === 'creator-first') await bounded(state.collectors.promise, 'creator collector release'); } return value;
      };
    } }); return { state, run: (lane, work) => storage.run(lane, work), restore: () => { dbModule.db = originalDb; } };
  }
  async function publicationRace(mode) {
    const x = await fixture(mode), saved = await artifact(x, mode), before = await rows(x), writer = await independentClient(), route = routing(x, writer, mode), { state } = route; let producer, creator;
    const startProducer = () => outcome(route.run('producer', () => reverse(x)));
    const startCreator = () => outcome(route.run('creator', () => runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'owned-inventory-publication-' + mode + '-' + stamp }, { actorId: x.makerId, actorPermissions: ['accounting.close.run'], now: new Date() })));
    try { if (mode === 'producer-first') producer = startProducer(); else creator = startCreator(); await bounded(state.held.promise, mode + ' first real transaction hold');
      if (mode === 'producer-first') creator = startCreator(); else producer = startProducer(); await bounded(state.attempt.promise, mode + ' second period attempt'); const wait = await blocking(state.lanes[mode === 'producer-first' ? 'creator' : 'producer'].pid, state.lanes[state.holder].pid);
      assert.equal(await db.stockAdjustment.count({ where: { organizationId: x.organizationId, reversalOfAdjustmentId: x.adjustmentId } }), 0); if (mode === 'producer-first') assert.equal(state.events.some(row => row.event === 'running-inserted'), false);
      state.release.resolve(); const reversed = await bounded(producer, 'reversal commit'); assert.equal(reversed.success, true, reversed.error);
      if (mode === 'creator-first') { const published = await bounded(state.published.promise, 'new assessment publication'); await invalidated({ ...x, closeRunId: published.id }, reversed.value, 1); state.collectors.resolve(); }
      const assessed = await bounded(creator, 'actual collectors complete'); assert.equal(assessed.success, true, assessed.error); const current = await db.closeRun.findUniqueOrThrow({ where: { id: state.createdRunId } });
      if (mode === 'creator-first') { assert.equal(current.status, 'BLOCKED'); assert.equal(current.metadata?.staleState?.status, 'EVIDENCE_STALE'); assert.equal(await db.closeChecklistItem.count({ where: { closeRunId: current.id } }), 0); }
      else { assert.equal(current.status, 'READY'); assert.equal(current.metadata?.trustLevel, 'T4'); assert.equal((await d.denialState({ ...x, closeRunId: current.id })).events.length, 0); }
      assert.deepEqual(state.locked.producer, [...new Set(state.locked.producer)].sort()); assert.ok(state.locked.producer.includes(x.periodId));
      return { organizationId: x.organizationId, blocking: wait, events: state.events, periodLocks: state.locked.producer, newRunId: current.id, newRunStatus: current.status, delta: await assertReversal(x, before, reversed.value), invalidation: await invalidated(x, reversed.value), retained: await retained(x, saved) };
    } finally { state.release.resolve(); state.collectors.resolve(); await Promise.allSettled([producer, creator].filter(Boolean)); route.restore(); await writer.$disconnect(); }
  }
  async function rollback() {
    const x = await fixture('rollback'), saved = await artifact(x, 'rollback'), before = await rows(x), beforeAll = await rows(x, effectModels), writer = await independentClient(), route = routing(x, writer, 'rollback'); let refused;
    try { refused = await outcome(route.run('producer', () => reverse(x))); assert.equal(refused.success, false); assert.match(refused.error, /Stock adjustment reversal could not be completed/); assert.ok(route.state.rolledBackMovementId); }
    finally { route.restore(); await writer.$disconnect(); }
    assert.deepEqual(await rows(x, effectModels), beforeAll); assert.equal(await db.inventoryTransaction.count({ where: { id: route.state.rolledBackMovementId } }), 0);
    const result = await reverse(x); return { organizationId: x.organizationId, refused, rolledBackMovementId: route.state.rolledBackMovementId, completeRollbackHash: f.hash(beforeAll), delta: await assertReversal(x, before, result), retained: await retained(x, saved), repeated: await replay(x, result) };
  }
  async function inheritedIsolation() {
    const x = await fixture('isolation'), before = await rows(x, effectModels), refusals = [];
    for (const isolationLevel of [Prisma.TransactionIsolationLevel.RepeatableRead, Prisma.TransactionIsolationLevel.Serializable]) {
      const result = await outcome(db.$transaction(tx => reverse(x, tx), { isolationLevel })); assert.equal(result.success, false); assert.equal(result.code, 'CONFLICT'); assert.match(result.error, /Read Committed/); assert.deepEqual(await rows(x, effectModels), before); refusals.push({ isolationLevel, code: result.code, noEffects: true });
    }
    return { organizationId: x.organizationId, refusals, completeUnchangedHash: f.hash(before) };
  }
  async function laterPeriod(x, offset, withJournal) {
    const source = await db.accountingPeriod.findUniqueOrThrow({ where: { id: x.periodId } }), startDate = new Date(Date.UTC(source.startDate.getUTCFullYear(), source.startDate.getUTCMonth() + offset, 1)), endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1) - 1);
    const year = await createFiscalYearWithPeriods(x.organizationId, { name: 'Synthetic inventory later period ' + offset + ' ' + stamp, startDate, endDate }, x.makerId), period = year.periods[0]; assert.equal(year.periods.length, 1);
    if (withJournal) { const base = await db.journalEntry.findUniqueOrThrow({ where: { id: x.info.setup.journalEntryId }, include: { lines: true } }); const draft = await createManualJournalEntry(x.organizationId, { journalId: base.journalId, entryDate: new Date(startDate.getTime() + 43200000), memo: 'LOCAL SYNTHETIC later-period readiness only', lines: base.lines.map(line => ({ accountId: line.accountId, debit: line.debit.toString(), credit: line.credit.toString(), currency: line.currency })) }, x.makerId); const at = new Date(); await postJournalEntry(x.organizationId, draft.id, x.info.actorIds.checker, { actorPermissions: ['accounting.journal.post'], lastAuthAt: at, now: at }); }
    return { ...x, periodId: period.id };
  }
  async function cumulativeScope() {
    const x = await fixture('cumulative'), later = await d.assessment(await laterPeriod(x, 1, true), 'inventory-later'), empty = await laterPeriod(x, 2, false), earlier = await laterPeriod(x, -1, false);
    const saved = await artifact(later, 'cumulative-later'), before = await rows(x), earlierBefore = await annex(earlier), laterBefore = await annex(later), writer = await independentClient(), route = routing(x, writer, 'observe'); let result;
    try { result = await route.run('producer', () => reverse(x)); } finally { route.restore(); await writer.$disconnect(); }
    assert.deepEqual(route.state.locked.producer, [x.periodId, later.periodId, empty.periodId].sort()); assert.equal(await db.closeRun.count({ where: { organizationId: x.organizationId, periodId: empty.periodId } }), 0);
    const laterAfter = await annex(later); assert.equal(laterAfter.status, 'PASSED'); assert.notEqual(laterAfter.evidenceHash, laterBefore.evidenceHash); assert.equal((await annex(earlier)).evidenceHash, earlierBefore.evidenceHash);
    return { organizationId: x.organizationId, scope: route.state.locked.producer, excludedEarlierPeriodId: earlier.periodId, emptyLaterPeriodId: empty.periodId, delta: await assertReversal(x, before, result), invalidatedLater: await invalidated(later, result), retained: await retained(later, saved), earlierFingerprintUnchanged: true, laterBefore: laterBefore.evidenceHash, laterAfter: laterAfter.evidenceHash };
  }
  async function check(id, work) { const started = Date.now(); const result = await work(); report.checks.push({ id, status: 'passed', elapsedMs: Date.now() - started, ...result }); console.log(JSON.stringify({ id, status: 'passed' })); }
  async function main() {
    const captured = JSON.parse(fs.readFileSync(path.join(predecessor, 'metadata.json'), 'utf8'));
    const originalSource = captured.files.find(row => row.path === 'services/inventory/inventory-adjustment-reversal.service.ts');
    assert.equal(originalSource.sha256, '087d1cb80e27bfa231fffdb7f9d7c089c6f27e3054dbbeb8bc004fdedc08a689');
    for (const row of captured.files) assert.equal(sha(fs.readFileSync(path.join(predecessor, path.basename(row.path)))), row.sha256);
    report.predecessor = { metadataHash: sha(fs.readFileSync(path.join(predecessor, 'metadata.json'))), originalSourceHash: originalSource.sha256 };
    await guard(); report.sourcesBefore = sources(); report.outsideBefore = await outside();
    await check('actual-inventory-compensation-replay-cash-close-recovery', journey);
    await check('inventory-reversal-first-blocks-assessment-publication', () => publicationRace('producer-first'));
    await check('assessment-first-retains-inventory-invalidation', () => publicationRace('creator-first'));
    await check('stock-movement-rollback-and-independent-retry', rollback);
    await check('unsupported-inherited-isolation-refuses-without-effects', inheritedIsolation);
    await check('cumulative-later-and-empty-period-boundary', cumulativeScope);
  }
  async function runMain() { try { await main(); } catch (error) { report.error = f.safe(error); report.failureKind = error.prerequisite ? 'prerequisite-blocked' : 'verification-failed'; report.prerequisite = error.prerequisite; }
    finally { dbModule.db = originalDb; try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; } catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.checks.length === 6 && report.checks.every(row => row.status === 'passed') && report.sourceStable && report.outsideUnchanged;
      const file = path.join(__dirname, 'inventory-adjustment-reversal-runtime-' + stamp + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.length, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { sources, fixture, rows, outside, assertReversal, routing };
  if (require.main === module) runMain();
}
