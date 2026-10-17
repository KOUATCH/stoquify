// Prepared only until the coordinator releases this source and owned DB lane.
// Actual services create every business state; manual class-3 orphan evidence
// remains BLOCKED. Synthetic accounts/actors are not statutory approvals.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. --run requires coordinator source freeze and guarded DB lane release.');
} else {
  const h = require('./close-pack-write-race-runtime.cjs');
  const { f, db, root, helper, organizations } = h, { fs, path, crypto, assert } = f;
  const { Prisma } = require('@prisma/client');
  const load = file => require(path.join(root, file));
  const posting = load('services/accounting/posting.service.ts');
  const { createManualJournalEntry } = load('services/accounting/journals.service.ts');
  const { createFiscalYearWithPeriods } = load('services/accounting/periods.service.ts');
  const { runCloseAssurance } = load('services/accounting/close-assurance.service.ts');
  const { exportClosePack } = load('services/accounting/close-assurance-pack.service.ts');
  const { reconcileInventoryClass3 } = load('services/inventory/inventory-reconciliation.service.ts');
  const order = load('services/accounting/journal-reversal-order.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db, stamp = crypto.randomUUID();
  const baselineFile = path.join(root, 'what-next/workflow-modernization/2026-09-05-run-01/evidence/journal-reversal-before-3b5c0d5c-43a7-4b51-aeef-0f18aae3cec1.json');
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const files = [...new Set([__filename, baselineFile, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])].sort();
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run: stamp, at: new Date().toISOString(), checks: [], fixtures: [],
    scope: 'Exact owned disposable loopback database. Actual fiscal creation, journal creation/posting/reversal, Close assessment, inventory annex and retained export services. Private hash-verified predecessor modules compare omission of later-period reversal invalidation. No source file/cache replacement, fabricated READY, migrations, seeds, provider effects or external delivery.',
    limitations: ['Direct-service synthetic authority is not authenticated action/session proof or professional approval.',
      'Two offsetting manual class-3 journals deliberately produce real ORPHAN_CLASS3_POSTING blockers. Later retained READY/T4 export was legitimately created before those source writes; no subsequent readiness is manufactured.',
      'Posting those manual sources already changes the later annex. This verifier proves reversal fingerprint/invalidation participation and complete period-lock scope; it does not establish safe ordering for every posting producer.',
      'The class-3 fingerprint and key coverage scenario is sequential observation, not a concurrent transaction wait proof. Other journal verifiers own contention cases.'] };
  const financialModels = ['journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'payment', 'supplierInvoice', 'supplierPayment', 'inventoryTransaction'];
  async function guard() { await assertDisposableDatabaseIdentity(db, helper.database); await helper.withClient(f.target, helper.assertOwned); }
  async function financial(x) {
    const rows = {};
    for (const model of financialModels) rows[model] = await db[model].findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } });
    return { hash: f.hash(rows), rows, models: Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, { count: value.length, hash: f.hash(value) }])) };
  }
  async function outside() {
    const inherited = await h.outside(), extra = {};
    for (const model of ['auditLog', 'customerLedgerEntry', 'customerSettlement']) extra[model] = f.hash(await db[model].findMany({ where: { organizationId: { notIn: organizations } }, orderBy: { id: 'asc' } }));
    return { hash: f.hash({ inherited, extra }), inherited, extra };
  }
  function oldApi() {
    const receipt = JSON.parse(fs.readFileSync(baselineFile, 'utf8')), ts = require('typescript'), Module = require('node:module');
    const hashes = {
      'services/accounting/posting.service.ts': '458ba5848af4fde0f0fc2731261a54bf20f10302b44dc201a2b529f81e2014e2',
      'services/accounting/journal-close-invalidation.service.ts': '8ee2bfe698fdab25e6d557c113023b64051ab59d9b487b86ece4925fb64899a8',
    };
    function compile(relative, dependency) {
      const row = receipt.files.find(file => file.path === relative); assert.ok(row);
      const bytes = Buffer.from(row.base64, 'base64'); assert.equal(row.sha256, hashes[relative]); assert.equal(sha(bytes), row.sha256);
      const filename = path.join(root, relative), privateModule = new Module(filename, module);
      privateModule.filename = filename; privateModule.paths = Module._nodeModulePaths(path.dirname(filename));
      const normalRequire = privateModule.require.bind(privateModule);
      privateModule.require = request => dependency && request === './journal-close-invalidation.service' ? dependency : normalRequire(request);
      privateModule._compile(ts.transpileModule(bytes.toString('utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
      return privateModule.exports;
    }
    const helperApi = compile('services/accounting/journal-close-invalidation.service.ts');
    return { api: compile('services/accounting/posting.service.ts', helperApi), sourceHashes: hashes };
  }
  async function addPeriod(x, offset, postReadinessJournal = false) {
    const current = await db.accountingPeriod.findUniqueOrThrow({ where: { id: x.periodId } });
    const startDate = new Date(Date.UTC(current.startDate.getUTCFullYear(), current.startDate.getUTCMonth() + offset, 1));
    const endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1) - 1);
    const year = await createFiscalYearWithPeriods(x.organizationId, { name: 'Synthetic class3 period ' + offset + ' ' + stamp, startDate, endDate }, x.makerId);
    const period = year.periods[0]; assert.equal(year.periods.length, 1);
    if (postReadinessJournal) {
      const original = await db.journalEntry.findUniqueOrThrow({ where: { id: x.info.setup.journalEntryId }, include: { lines: true } });
      const entry = await createManualJournalEntry(x.organizationId, { journalId: original.journalId, entryDate: new Date(startDate.getTime() + 43200000), memo: 'Synthetic class3 later readiness setup; no actual funds', lines: original.lines.map(line => ({ accountId: line.accountId, debit: line.debit.toString(), credit: line.credit.toString(), currency: line.currency })) }, x.makerId);
      const at = new Date(); await posting.postJournalEntry(x.organizationId, entry.id, x.info.actorIds.checker, { actorPermissions: ['accounting.journal.post'], lastAuthAt: at, now: at });
    }
    return { ...x, periodId: period.id, period };
  }
  async function assess(x, label) {
    await runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'class3-' + label + '-' + stamp }, { actorId: x.makerId, actorPermissions: ['accounting.close.run'], now: new Date() });
    const row = await db.closeRun.findFirstOrThrow({ where: { organizationId: x.organizationId, periodId: x.periodId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return { ...x, closeRunId: row.id, observedStatus: row.status, trustLevel: row.metadata?.trustLevel };
  }
  const annex = x => reconcileInventoryClass3({ organizationId: x.organizationId, periodId: x.periodId, currency: 'XAF' }, db);
  async function saveExport(x, label) {
    assert.equal(x.observedStatus, 'READY'); assert.equal(x.trustLevel, 'T4');
    const at = new Date(); const result = await exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'CERTIFIED' }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: at, now: at });
    assert.equal(result.isCertified, true);
    const file = path.join(__dirname, 'journal-class3-' + stamp + '-' + label + '-certified.json'); fs.writeFileSync(file, result.content, { flag: 'wx' });
    return { file, bytesHash: sha(fs.readFileSync(file)), row: await db.closePackExport.findUniqueOrThrow({ where: { id: result.exportId } }) };
  }
  async function fixture(label) {
    await guard(); const x = await h.fixture('class3-' + label);
    const sourcePeriod = await addPeriod(x, -1, true), earlier = await addPeriod(x, -2, true);
    const later = await assess(await addPeriod(x, 1, true), label + '-later'), noRun = await addPeriod(x, 2);
    const artifact = await saveExport(later, label), earlierBefore = await annex(earlier);
    const original = await db.journalEntry.findUniqueOrThrow({ where: { id: x.info.setup.journalEntryId }, include: { lines: true } });
    const inventory = await db.chartOfAccount.findFirstOrThrow({ where: { organizationId: x.organizationId, mappingKey: 'INVENTORY', isActive: true } });
    const offsetAccount = original.lines.find(line => line.credit.gt(0)); assert.ok(offsetAccount);
    const entries = [], originalEntryDate = new Date(sourcePeriod.period.startDate.getTime() + 43200000);
    for (const polarity of ['debit', 'credit']) {
      const entry = await createManualJournalEntry(x.organizationId, { journalId: original.journalId, entryDate: originalEntryDate, memo: 'Synthetic offsetting manual class3 journal; actual orphan blocker expected', lines: [
        { accountId: inventory.id, debit: polarity === 'debit' ? '10' : '0', credit: polarity === 'credit' ? '10' : '0', currency: 'XAF' },
        { accountId: offsetAccount.accountId, debit: polarity === 'credit' ? '10' : '0', credit: polarity === 'debit' ? '10' : '0', currency: 'XAF' },
      ] }, x.makerId);
      const at = new Date(); await posting.postJournalEntry(x.organizationId, entry.id, x.info.actorIds.checker, { actorPermissions: ['accounting.journal.post'], lastAuthAt: at, now: at }); entries.push(entry);
    }
    // Real creation, after source posting: two current-date overlapping periods
    // must be included even though neither has ever published an assessment.
    const overlaps = [];
    for (let index = 0; index < 2; index++) {
      const startDate = new Date(Date.now() - 1000 + index), endDate = new Date(Date.now() + 86400000);
      const year = await createFiscalYearWithPeriods(x.organizationId, { name: 'Synthetic class3 overlap ' + index + ' ' + stamp, startDate, endDate }, x.makerId);
      overlaps.push(...year.periods);
    }
    // Period creation rounds endDate to the end of its day. The source is in a
    // real prior month, so this overlap contains only the original entry date
    // and cannot accidentally contain the current reversal date.
    const originalOverlapYear = await createFiscalYearWithPeriods(x.organizationId, {
      name: 'Synthetic original-date-only overlap ' + stamp,
      startDate: new Date(originalEntryDate.getTime() - 1000), endDate: new Date(originalEntryDate.getTime() + 1000),
    }, x.makerId);
    const originalOverlap = originalOverlapYear.periods[0]; assert.equal(originalOverlapYear.periods.length, 1);
    const reversalDate = new Date(), originalEntry = await db.journalEntry.findUniqueOrThrow({ where: { id: entries[0].id }, include: { lines: { orderBy: { lineNumber: 'asc' } } } });
    assert.equal(originalEntry.periodId, sourcePeriod.periodId);
    assert.ok(originalOverlap.startDate <= originalEntry.entryDate && originalOverlap.endDate >= originalEntry.entryDate && originalOverlap.endDate < reversalDate);
    const periods = await db.accountingPeriod.findMany({ where: { organizationId: x.organizationId, endDate: { gte: originalEntry.entryDate < reversalDate ? originalEntry.entryDate : reversalDate } }, select: { id: true }, orderBy: { id: 'asc' } });
    const beforeAnnex = await annex(later); assert.equal(beforeAnnex.status, 'BLOCKED'); assert.equal(beforeAnnex.ledgerClass3Value, '0.00');
    assert.ok(beforeAnnex.failures.some(row => row.type === 'ORPHAN_CLASS3_POSTING'));
    assert.equal(await db.closeRun.count({ where: { organizationId: x.organizationId, periodId: { in: [noRun.periodId, originalOverlap.id, ...overlaps.map(row => row.id)] } } }), 0);
    const laterRow = await db.closeRun.findUniqueOrThrow({ where: { id: later.closeRunId } });
    const info = { label, organizationId: x.organizationId, currentPeriodId: x.periodId, originalPeriodId: sourcePeriod.periodId, laterPeriodId: later.periodId, noRunPeriodId: noRun.periodId, earlierPeriodId: earlier.periodId, overlapPeriodIds: overlaps.map(row => row.id), originalDateOnlyOverlapPeriodId: originalOverlap.id, originalJournalId: entries[0].id, offsetJournalId: entries[1].id, expectedPeriodIds: periods.map(row => row.id), laterActualAnnexBefore: beforeAnnex, retainedRunStatusBeforeReversal: laterRow.status };
    report.fixtures.push(info);
    return { x, earlier, later, noRun, overlaps, originalOverlap, originalEntry, reversalDate, periods, artifact, earlierBefore, beforeAnnex, laterRow, info };
  }
  function observeTransaction(x) {
    const state = { acquiredPeriods: [], events: [], financialWrites: [] };
    dbModule.db = new Proxy({}, { has(_target, key) { return key in db; }, get(_target, key) {
      if (key !== '$transaction') { const value = Reflect.get(db, key); return typeof value === 'function' ? value.bind(db) : value; }
      return (work, options) => db.$transaction(async tx => {
        const observed = new Proxy({}, { has(_targetTx, property) { return property in tx; }, get(_targetTx, property) {
          if (property === '$queryRaw') return async (...args) => {
            const sql = args.map(arg => typeof arg === 'string' ? arg : arg?.sql || arg?.text || arg?.strings?.join('?') || '').join(' ');
            let key; for (const value of Array.isArray(args[0]?.values) ? args[0].values : []) { try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) key = parsed; } catch { /* Ordinary SQL value or tagged-template array. */ } }
            const rows = await tx.$queryRaw(...args);
            if (key?.[0] === 'close-assessment-order' && key[1] === x.organizationId) { state.acquiredPeriods.push(key[2]); state.events.push({ event: 'assessment-period-acquired', periodId: key[2] }); }
            if (key?.[0] === 'accounting-period-catalog') state.events.push({ event: 'catalog-acquired', organizationId: key[1] });
            if (sql.includes('close_runs') && sql.includes('FOR NO KEY UPDATE')) state.events.push({ event: 'run-row-lock' });
            return rows;
          };
          if (['journalEntry', 'ledgerPostingBatch', 'accountingSourceLink'].includes(property)) return new Proxy({}, { get(_model, method) {
            if (['create', 'update', 'updateMany'].includes(method)) return async args => { state.financialWrites.push({ model: property, method, acquiredPeriods: [...state.acquiredPeriods] }); state.events.push({ event: 'financial-write', model: property }); return tx[property][method](args); };
            const value = Reflect.get(tx[property], method); return typeof value === 'function' ? value.bind(tx[property]) : value;
          } });
          const value = Reflect.get(tx, property); return typeof value === 'function' ? value.bind(tx) : value;
        } }); return work(observed);
      }, { ...options, timeout: 30000 });
    } });
    return { state, restore: () => { dbModule.db = originalDb; } };
  }
  async function verifyCompensation(data, reversal, before) {
    const { x, originalEntry } = data, after = await financial(x);
    assert.equal(after.rows.journalEntry.length - before.rows.journalEntry.length, 1);
    assert.equal(after.rows.journalEntryLine.length - before.rows.journalEntryLine.length, originalEntry.lines.length);
    for (const model of ['ledgerPostingBatch', 'accountingSourceLink']) assert.equal(after.rows[model].length - before.rows[model].length, 1);
    for (const model of ['payment', 'supplierInvoice', 'supplierPayment', 'inventoryTransaction']) assert.equal(after.models[model].hash, before.models[model].hash);
    const source = await db.journalEntry.findUniqueOrThrow({ where: { id: originalEntry.id } }), result = await db.journalEntry.findUniqueOrThrow({ where: { id: reversal.id }, include: { lines: { orderBy: { lineNumber: 'asc' } } } });
    assert.equal(source.status, 'REVERSED'); assert.equal(result.status, 'POSTED'); assert.equal(result.reversalOfEntryId, originalEntry.id);
    for (let index = 0; index < result.lines.length; index++) {
      const old = originalEntry.lines[index], line = result.lines[index]; assert.equal(line.accountId, old.accountId); assert.equal(line.currency, old.currency);
      assert.ok(line.debit.eq(old.credit)); assert.ok(line.credit.eq(old.debit)); assert.ok(line.baseDebit.eq(old.baseCredit)); assert.ok(line.baseCredit.eq(old.baseDebit));
    }
    assert.equal(result.lines.reduce((value, line) => value.plus(line.debit).minus(line.credit), new Prisma.Decimal(0)).toFixed(2), '0.00');
    return { before: { hash: before.hash, models: before.models }, after: { hash: after.hash, models: after.models }, reversalJournalId: reversal.id };
  }
  async function verifyArtifact(data, expectedStale) {
    const { artifact } = data; assert.equal(sha(fs.readFileSync(artifact.file)), artifact.bytesHash);
    const row = await db.closePackExport.findUniqueOrThrow({ where: { id: artifact.row.id } });
    if (expectedStale) {
      const stable = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['metadata', 'updatedAt'].includes(key)));
      assert.deepEqual(stable(row), stable(artifact.row)); assert.equal(row.metadata?.staleState?.status, 'EVIDENCE_STALE');
    } else assert.deepEqual(row, artifact.row);
    return { file: artifact.file, bytesHash: artifact.bytesHash, exportId: row.id, expectedStale };
  }
  async function runScenario(fixed) {
    const data = await fixture(fixed ? 'fixed' : 'historical'), { x } = data, old = fixed ? null : oldApi();
    const api = old?.api || posting, before = await financial(x), observed = observeTransaction(x); let reversal;
    try { const at = new Date(); reversal = await api.reverseJournalEntry(x.organizationId, data.originalEntry.id, x.certifierId, 'Synthetic class3 reversal', data.reversalDate, { actorPermissions: ['accounting.journal.reverse'], lastAuthAt: at, now: at }); }
    finally { observed.restore(); }
    const delta = await verifyCompensation(data, reversal, before), laterAfter = await annex(data.later), earlierAfter = await annex(data.earlier);
    assert.equal(laterAfter.status, 'BLOCKED'); assert.notEqual(laterAfter.evidenceHash, data.beforeAnnex.evidenceHash);
    assert.equal(earlierAfter.evidenceHash, data.earlierBefore.evidenceHash);
    const laterRun = await db.closeRun.findUniqueOrThrow({ where: { id: data.later.closeRunId } });
    if (fixed) {
      const expected = data.periods.map(row => row.id); assert.deepEqual(observed.state.acquiredPeriods, expected);
      assert.ok(observed.state.financialWrites.length > 0);
      for (const write of observed.state.financialWrites) assert.deepEqual(write.acquiredPeriods, expected, 'Complete period set must precede every financial write');
      assert.equal(observed.state.events[0]?.event, 'catalog-acquired');
      assert.equal(laterRun.status, 'BLOCKED'); assert.equal(laterRun.metadata?.staleState?.status, 'EVIDENCE_STALE');
      const durable = await financial(x), at = new Date();
      await assert.rejects(() => posting.reverseJournalEntry(x.organizationId, data.originalEntry.id, x.certifierId, 'Synthetic duplicate reversal', data.reversalDate, { actorPermissions: ['accounting.journal.reverse'], lastAuthAt: at, now: at }), /Only posted journal entries can be reversed|already been reversed/);
      assert.equal((await financial(x)).hash, durable.hash);
    } else {
      assert.equal(observed.state.acquiredPeriods.length, 0); assert.deepEqual(laterRun, data.laterRow);
    }
    const retainedArtifact = await verifyArtifact(data, fixed);
    return { organizationId: x.organizationId, sourceHashes: old?.sourceHashes, lockedPeriodIds: observed.state.acquiredPeriods, expectedPeriodIds: data.periods.map(row => row.id), noRunPeriodId: data.noRun.periodId, overlapPeriodIds: data.overlaps.map(row => row.id), originalDateOnlyOverlapPeriodId: data.originalOverlap.id, earlierFingerprintUnchanged: true, laterBefore: data.beforeAnnex, laterAfter, laterRunStatus: laterRun.status, duplicateReversalFinanciallyInert: fixed, retainedArtifacts: [retainedArtifact], financialDelta: delta, events: observed.state.events };
  }
  async function foreignPeriod() {
    await guard(); const x = await h.fixture('class3-foreign-period');
    const foreignId = 'workflow_class3_foreign_' + stamp; organizations.push(foreignId);
    await db.organization.create({ data: { id: foreignId, name: helper.prefix + 'Synthetic class3 foreign period', slug: foreignId, currency: 'XAF' } });
    const now = new Date(), year = await createFiscalYearWithPeriods(foreignId, { name: 'Synthetic foreign period ' + stamp, startDate: new Date(now.getTime() - 1000), endDate: new Date(now.getTime() + 86400000) });
    const before = await financial(x);
    await assert.rejects(() => db.$transaction(async tx => {
      await order.lockJournalReversalCatalogInTx(tx, x.organizationId);
      await order.lockJournalReversalClosePeriodsInTx(tx, x.organizationId, { originalPeriodId: year.periods[0].id, reversalPeriodId: x.periodId, originalEntryDate: now, reversalDate: now, includeLaterPeriods: true });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }), error => error.code === 'NOT_FOUND');
    assert.equal((await financial(x)).hash, before.hash);
    return { organizationId: x.organizationId, foreignOrganizationId: foreignId, rejectedForeignPeriodId: year.periods[0].id, financialUnchanged: true };
  }
  async function main() {
    await guard(); report.sourcesBefore = sources(); report.outsideBefore = await outside();
    for (const [id, run] of [['historical-later-class3-invalidation-omission', () => runScenario(false)], ['class3-cumulative-overlap-and-no-run-scope', () => runScenario(true)], ['foreign-explicit-period-refused', foreignPeriod]]) {
      const started = Date.now();
      try { report.checks.push({ id, status: 'passed', ...await run(), elapsedMs: Date.now() - started }); }
      catch (error) { report.checks.push({ id, status: 'failed', error: f.safe(error), stack: f.safe(error.stack || error), elapsedMs: Date.now() - started }); }
      console.log(JSON.stringify({ id, status: report.checks.at(-1).status, error: report.checks.at(-1).error }));
    }
  }
  module.exports = { fixture, sources, outside, runScenario, foreignPeriod };
  if (require.main === module) main().catch(error => { report.error = f.safe(error); }).finally(async () => {
    dbModule.db = originalDb;
    try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; }
    catch (error) { report.finalizationError = f.safe(error); }
    report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.sourceStable && report.outsideUnchanged && report.checks.length === 3 && report.checks.every(row => row.status === 'passed');
    const file = path.join(__dirname, 'journal-class3-runtime-' + stamp + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.length, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged }));
    await db.$disconnect(); if (!report.passed) process.exitCode = 1;
  });
}
