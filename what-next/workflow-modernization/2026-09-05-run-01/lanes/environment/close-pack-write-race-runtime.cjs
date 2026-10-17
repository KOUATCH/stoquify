// Author-only until the parent releases this exact source for the owned local DB.
// Every actor, account and journal below is explicitly synthetic test evidence.
// READY/T4 and certified artifacts must come from actual services; never patch
// those results or imply a real customer's approval / statutory certification.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run after coordinated review and source freeze.');
} else {
  const f = require('./statement-recipient-fixtures.cjs');
  const { db, fs, path, crypto, assert, root, helper } = f;
  const { PrismaClient } = require('@prisma/client');
  const fromRoot = file => require(path.join(root, file));
  const { assertDisposableDatabaseIdentity } = fromRoot('scripts/disposable-fixture-guard.js');
  const settingsApi = fromRoot('services/accounting/accounting-settings.service.ts');
  const { createChartAccount } = fromRoot('services/accounting/accounts.service.ts');
  const { ensureDefaultJournals, createManualJournalEntry } = fromRoot('services/accounting/journals.service.ts');
  const { createFiscalYearWithPeriods } = fromRoot('services/accounting/periods.service.ts');
  const { createPostingRule } = fromRoot('services/accounting/posting-rules.service.ts');
  const { DEFAULT_POSTING_RULES } = fromRoot('services/accounting/default-posting-rules.ts');
  const { postJournalEntry } = fromRoot('services/accounting/posting.service.ts');
  const { runCloseAssurance } = fromRoot('services/accounting/close-assurance.service.ts');
  const { getAccountantPortalData } = fromRoot('services/accounting/data-trust.service.ts');
  const packApi = fromRoot('services/accounting/close-assurance-pack.service.ts');
  const dbModule = fromRoot('prisma/db.ts'), originalDb = dbModule.db;
  const baselineRequested = process.argv.includes('--baseline');
  const baselineReceiptFile = path.join(root, 'what-next/workflow-modernization/2026-09-05-run-01/evidence/close-write-serialization-before-7559e47e-39f8-40eb-94c8-7ecca920a6ef.json');
  const stamp = crypto.randomUUID(), organizations = [], now = new Date();
  const report = {
    run: stamp, at: now.toISOString(), checks: [], fixtures: [],
    scope: 'Owned loopback disposable database only. Synthetic accounting setup and one posted balanced test journal per new organization; real assessment, pack export and source invalidation services. No manufactured READY/T4, real customer approval, statutory certification, migration, seeds, delivery worker or external effects. Concurrency receipts measure system behavior only.',
  };
  const financialModels = ['payment', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'supplierInvoice', 'supplierPayment', 'inventoryTransaction'];
  const observedModels = [...financialModels, 'organizationAccountingSettings', 'chartOfAccount', 'journal', 'postingRule', 'postingRuleLine', 'fiscalYear', 'accountingPeriod', 'closeRun', 'closeChecklistItem', 'closeAssuranceFinding', 'closeEvidenceItem', 'closePackExport', 'user', 'role', 'tenantModuleConfiguration', 'tenantModuleGrant', 'ledgerAuditEvent', 'businessEvent', 'businessEventOutbox', 'businessEventAudit'];
  const sourceFiles = [...new Set([
    __filename, path.join(__dirname, 'statement-recipient-fixtures.cjs'), path.join(__dirname, 'registration-local.cjs'), path.join(root, 'prisma/schema.prisma'),
    ...(baselineRequested ? [baselineReceiptFile] : []),
    ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && /\.(ts|js|cjs|json)$/.test(file) && !file.includes(path.sep + '.auth' + path.sep)),
  ])].sort();
  const sources = () => Object.fromEntries(sourceFiles.map(file => [path.relative(root, file).replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
  async function modelSnapshot(models, where) {
    const records = {};
    for (const model of models) {
      const rows = await db[model].findMany({ ...(where ? { where } : {}), orderBy: model === 'tenantModuleConfiguration' ? { organizationId: 'asc' } : { id: 'asc' } });
      records[model] = { count: rows.length, hash: f.hash(rows) };
    }
    return { hash: f.hash(records), models: records };
  }
  async function outside() {
    const children = await modelSnapshot(observedModels, { organizationId: { notIn: organizations } });
    const parents = await db.organization.findMany({ where: { id: { notIn: organizations } }, orderBy: { id: 'asc' } });
    return { hash: f.hash({ children, organizations: parents }), children, organizationCount: parents.length };
  }
  const financial = () => modelSnapshot(financialModels);
  function blocker(message, details) { const error = new Error(message); error.prerequisite = details; return error; }
  async function fixture(name) {
    const id = 'workflow_close_write_' + name + '_' + stamp; organizations.push(id);
    const scope = { organizationId: id };
    await db.organization.create({ data: { id, name: helper.prefix + 'Close write ' + name + ' ' + stamp, slug: 'close-write-' + name + '-' + stamp, currency: 'XAF' } });
    const actors = {};
    for (const purpose of ['maker', 'checker', 'certifier']) {
      actors[purpose] = await db.user.create({ data: { ...scope, name: 'Synthetic close-write ' + purpose, email: name + '-' + purpose + '-' + stamp + '@example.invalid', isActive: true, isVerified: true } });
    }
    const permissions = ['accounting.setup.manage', 'accounting.journal.post', 'accounting.close.read', 'accounting.close.run', 'accounting.close.export', 'accounting.close.certify'];
    await db.role.create({ data: { ...scope, code: 'owned-close-verifier', nameEn: 'Synthetic local close verifier only', permissions, users: { connect: Object.values(actors).map(actor => ({ id: actor.id })) } } });
    const info = { organizationId: id, actorIds: Object.fromEntries(Object.entries(actors).map(([key, value]) => [key, value.id])), synthetic: true, setup: {} };
    report.fixtures.push(info);
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1);
    const year = await createFiscalYearWithPeriods(id, { name: 'Synthetic local verification month', startDate, endDate }, actors.maker.id);
    const period = year.periods.find(row => row.startDate <= now && row.endDate >= now); assert.ok(period);
    info.periodId = period.id;
    await settingsApi.ensureAccountingSettings(id, actors.maker.id);
    const accounts = {};
    for (const [index, mapping] of settingsApi.REQUIRED_ACCOUNTING_MAPPINGS.entries()) {
      accounts[mapping.key] = await createChartAccount(id, {
        code: 'SYNTHETIC-' + mapping.syscohadaClass + '-' + (index + 1), nameEn: 'Synthetic ' + mapping.label,
        type: mapping.type, normalBalance: mapping.normalBalance, mappingKey: mapping.key,
        syscohadaClass: mapping.syscohadaClass, syscohadaReference: 'LOCAL SYNTHETIC VERIFICATION ONLY; no statutory approval',
      }, actors.maker.id);
    }
    const expense = await createChartAccount(id, { code: 'SYNTHETIC-6-EXPENSE', nameEn: 'Synthetic local operating expense', type: 'EXPENSE', normalBalance: 'DEBIT', syscohadaClass: '6', syscohadaReference: 'LOCAL SYNTHETIC VERIFICATION ONLY' }, actors.maker.id);
    const capital = await createChartAccount(id, { code: 'SYNTHETIC-1-CAPITAL', nameEn: 'Synthetic local contributed capital', type: 'EQUITY', normalBalance: 'CREDIT', syscohadaClass: '1', syscohadaReference: 'LOCAL SYNTHETIC VERIFICATION ONLY' }, actors.maker.id);
    const journals = await ensureDefaultJournals(id, actors.maker.id);
    const ruleIds = [];
    for (const postingPurpose of settingsApi.REQUIRED_READY_POSTING_PURPOSES) {
      const sourceType = settingsApi.REQUIRED_READY_POSTING_SOURCES[postingPurpose];
      let template = DEFAULT_POSTING_RULES.find(rule => rule.postingPurpose === postingPurpose && rule.sourceType === sourceType);
      if (!template && postingPurpose === 'EXPENSE_APPROVAL') {
        // Actual configurable fixture rule, not a default accounting policy.
        template = { code: 'SYNTHETIC-EXPENSE-APPROVAL', nameEn: 'Synthetic local expense approval rule', sourceType, postingPurpose, lines: [
          { side: 'DEBIT', accountId: expense.id, amountSource: 'SOURCE_AMOUNT' },
          { side: 'CREDIT', mappingKey: 'ACCOUNTS_PAYABLE', amountSource: 'SOURCE_AMOUNT' },
        ] };
      }
      if (!template && postingPurpose === 'GOODS_RECEIPT') template = {
        code: 'SYNTHETIC-GOODS-RECEIPT', nameEn: 'Synthetic local receipt rule', sourceType, postingPurpose, lines: [
          { side: 'DEBIT', mappingKey: 'INVENTORY', amountSource: 'SOURCE_AMOUNT' },
          { side: 'CREDIT', mappingKey: 'GRNI', amountSource: 'SOURCE_AMOUNT' },
        ],
      };
      if (!template && postingPurpose === 'CASH_DRAWER_CLOSE') template = {
        code: 'SYNTHETIC-CASH-SHORTAGE', nameEn: 'Synthetic local cash-shortage rule', sourceType, postingPurpose, lines: [
          { side: 'DEBIT', accountId: expense.id, amountSource: 'SOURCE_AMOUNT' },
          { side: 'CREDIT', mappingKey: 'CASH_ON_HAND', amountSource: 'SOURCE_AMOUNT' },
        ],
      };
      if (!template) throw blocker('No supported fixture posting recipe for ' + postingPurpose, { postingPurpose, sourceType });
      ruleIds.push((await createPostingRule(id, template, actors.maker.id)).id);
    }
    const issues = await settingsApi.collectAccountingSetupReadinessIssues(id);
    info.setup.readinessIssues = issues;
    if (issues.length) throw blocker('Actual accounting setup prerequisites remain incomplete', { issues });
    const authAt = new Date();
    await settingsApi.markAccountingSetupReady(id, actors.checker.id, { actorPermissions: ['accounting.setup.manage'], lastAuthAt: authAt, now: authAt });
    const journal = journals.find(row => row.type === 'GENERAL'); assert.ok(journal);
    const entry = await createManualJournalEntry(id, {
      journalId: journal.id, entryDate: now, memo: 'LOCAL SYNTHETIC TEST capital contribution; no actual cash or customer transaction',
      lines: [{ accountId: accounts.CASH_ON_HAND.id, debit: '100', currency: 'XAF' }, { accountId: capital.id, credit: '100', currency: 'XAF' }],
    }, actors.maker.id);
    const postAt = new Date();
    await postJournalEntry(id, entry.id, actors.checker.id, { actorPermissions: ['accounting.journal.post'], lastAuthAt: postAt, now: postAt });
    info.setup = { ...info.setup, journalEntryId: entry.id, fixtureJournalCount: 1, debit: '100', credit: '100', currency: 'XAF', ruleIds, note: 'Setup effects only; no financial writes permitted after this fixture returns.' };
    const portal = await getAccountantPortalData({ ...scope, periodId: period.id }, db, now);
    await runCloseAssurance(id, { periodId: period.id, correlationId: 'owned-write-race-' + name + '-' + stamp }, { actorId: actors.maker.id, actorPermissions: ['accounting.close.run'], now });
    const close = await db.closeRun.findFirstOrThrow({ where: scope, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    const evidence = await db.closeEvidenceItem.findMany({ where: { ...scope, closeRunId: close.id }, orderBy: { id: 'asc' } });
    info.closeRunId = close.id;
    info.assessment = { status: close.status, trustLevel: close.metadata?.trustLevel, portalTrustLevel: portal.certificate.level, blockers: portal.blockers.map(row => ({ gate: row.gate, severity: row.severity })), criticalBlockerCount: close.criticalBlockerCount, highBlockerCount: close.highBlockerCount, inventoryValuationAnnex: close.metadata?.inventoryValuationAnnex, evidence: evidence.map(row => ({ id: row.id, sourceType: row.sourceType, available: row.available, sourceHash: row.sourceHash, provenance: row.provenance })) };
    if (close.status !== 'READY' || close.metadata?.trustLevel !== 'T4' || portal.certificate.level !== 'T4') throw blocker('Actual assessment did not reach READY/T4; concurrency verification is not established', info.assessment);
    assert.equal(await db.payrollPeriod.count({ where: scope }), 0);
    assert.equal(await db.payment.count({ where: scope }), 0);
    assert.equal(await db.journalEntry.count({ where: scope }), 1);
    return { organizationId: id, periodId: period.id, closeRunId: close.id, makerId: actors.maker.id, certifierId: actors.certifier.id, evidenceHash: close.metadata.inventoryValuationAnnex.sourceHash, info };
  }
  const certify = x => { const at = new Date(); return packApi.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'CERTIFIED', correlationId: 'owned-certify-' + stamp }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: at, now: at }); };
  function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
  async function bounded(promise, label, ms = 12000) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out; race unverified')), ms); })]); } finally { clearTimeout(timer); } }
  function observeTx(tx, x, lane, state, pauseAfterRead) {
    let lockTaken = false;
    return new Proxy(tx, { get(target, property) {
      if (property === '$queryRaw') return async (...args) => {
        const sql = args.map(value => typeof value === 'string' ? value : value?.sql || value?.text || value?.strings?.join('?') || '').join(' ');
        const isRunLock = sql.includes('close_runs') && sql.includes('FOR NO KEY UPDATE');
        if (isRunLock) { state.events.push({ lane, event: 'lock-attempt', at: Date.now() }); state[lane].attempt.resolve(); }
        const rows = await target.$queryRaw(...args);
        if (isRunLock) { lockTaken = true; state.events.push({ lane, event: 'lock-acquired', at: Date.now() }); }
        return rows;
      };
      if (property === 'closeRun') return new Proxy(target.closeRun, { get(model, method) {
        if (method !== 'findFirst') return Reflect.get(model, method);
        return async args => {
          const value = await model.findFirst(args);
          if (args.where?.id === x.closeRunId && args.where?.organizationId === x.organizationId) {
            assert.ok(lockTaken, lane + ' must take the shared run lock before reading evidence');
            state.events.push({ lane, event: 'locked-run-read', status: value?.status, at: Date.now() });
            if (pauseAfterRead) { state[lane].held.resolve(); await bounded(state.release.promise, lane + ' held read', 16000); }
          }
          return value;
        };
      } });
      return Reflect.get(target, property);
    } });
  }
  async function identity(tx) { const rows = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database'); assert.equal(rows[0].database, helper.database); return rows[0].pid; }
  async function confirmedBlocking(waiterPid, holderPid) {
    return helper.withClient(f.target, async client => {
      await helper.assertOwned(client);
      const until = Date.now() + 4000;
      do {
        const result = await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [waiterPid]);
        if (result.rows[0].blockers.includes(holderPid)) return { waiterPid, holderPid, blockers: result.rows[0].blockers, observed: true };
        await new Promise(resolve => setTimeout(resolve, 40));
      } while (Date.now() < until);
      throw new Error('PostgreSQL did not show the expected real two-connection lock conflict');
    });
  }
  async function race(x, first) {
    const writer = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 22000, maxWait: 10000 } });
    await assertDisposableDatabaseIdentity(writer, helper.database); await helper.withClient(f.target, helper.assertOwned);
    const state = { events: [], release: deferred(), certifier: { attempt: deferred(), held: deferred() }, invalidator: { attempt: deferred(), held: deferred() } };
    let certification, invalidation;
    dbModule.db = new Proxy(db, { get(target, property) {
      if (property !== '$transaction') return Reflect.get(target, property);
      return (work, options) => target.$transaction(async tx => {
        state.certifier.pid = await identity(tx);
        return work(observeTx(tx, x, 'certifier', state, first === 'certifier'));
      }, { ...options, timeout: 22000 });
    } });
    const startCertifier = () => certify(x).then(value => ({ success: true, value }), error => ({ success: false, error: f.safe(error) }));
    const startInvalidator = () => writer.$transaction(async tx => {
      state.invalidator.pid = await identity(tx);
      const result = await packApi.recordCloseCertificationInvalidationsForSourceInTx(observeTx(tx, x, 'invalidator', state, first === 'invalidator'), x.organizationId, {
        sourceCode: 'INVENTORY_VALUATION_ANNEX', periodId: x.periodId, sourceId: x.periodId,
        staleReason: 'LOCAL SYNTHETIC TEST independent evidence invalidation; no source financial mutation',
        previousEvidenceHash: x.evidenceHash, newEvidenceHash: 'sha256:' + crypto.createHash('sha256').update(stamp + first).digest('hex'), correlationId: 'owned-invalidate-' + first + '-' + stamp,
      }, { actorId: x.makerId, now: new Date() });
      assert.equal(result.invalidatedCount, 1); return result;
    });
    try {
      if (first === 'certifier') certification = startCertifier(); else { invalidation = startInvalidator(); invalidation.catch(() => {}); }
      await bounded(state[first].held.promise, first + ' locked real read');
      if (first === 'certifier') { invalidation = startInvalidator(); invalidation.catch(() => {}); } else certification = startCertifier();
      const second = first === 'certifier' ? 'invalidator' : 'certifier';
      await bounded(state[second].attempt.promise, second + ' lock attempt');
      assert.notEqual(state.certifier.pid, state.invalidator.pid);
      const blocking = await confirmedBlocking(state[second].pid, state[first].pid);
      assert.equal(state.events.some(row => row.lane === second && row.event === 'locked-run-read'), false);
      state.release.resolve();
      const [certified, invalidated] = await bounded(Promise.all([certification, invalidation]), 'both transactions complete');
      const read = state.events.find(row => row.lane === second && row.event === 'locked-run-read'); assert.ok(read);
      assert.equal(read.status, first === 'certifier' ? 'CERTIFIED' : 'BLOCKED');
      if (first === 'certifier') { assert.equal(certified.success, true, certified.error); assert.equal(certified.value.isCertified, true); }
      else { assert.equal(certified.success, false); assert.match(certified.error, /blocked|stale/i); }
      return { blocking, events: state.events, certified, invalidated };
    } finally {
      state.release.resolve(); await Promise.allSettled([certification, invalidation].filter(Boolean)); dbModule.db = originalDb; await writer.$disconnect();
    }
  }
  async function verifyOrdering(first) {
    const x = await fixture(first);
    const before = await financial(); x.info.financialAfterFixtureSetup = before;
    let retainedDraft;
    if (first === 'invalidator') retainedDraft = await packApi.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'DRAFT_NOT_CERTIFIED' }, { actorId: x.certifierId, actorPermissions: ['accounting.close.export'], now: new Date() });
    const draftBefore = retainedDraft ? await db.closePackExport.findUniqueOrThrow({ where: { id: retainedDraft.exportId } }) : null;
    const result = await race(x, first);
    const current = await db.closeRun.findUniqueOrThrow({ where: { id: x.closeRunId } });
    const exports = await db.closePackExport.findMany({ where: { organizationId: x.organizationId, closeRunId: x.closeRunId }, orderBy: { id: 'asc' } });
    assert.equal(current.status, 'BLOCKED'); assert.equal(current.metadata.staleState.status, 'EVIDENCE_STALE');
    assert.equal(exports.length, 1);
    if (first === 'certifier') {
      const retained = exports[0];
      assert.equal(retained.id, result.certified.value.exportId); assert.equal(retained.isCertified, true);
      assert.equal(retained.contentHash, result.certified.value.contentHash); assert.equal(retained.metadata.staleState.status, 'EVIDENCE_STALE');
      const payload = JSON.parse(result.certified.value.content);
      assert.equal(retained.metadata.pilotCycleCertification.applicability, 'NO_RECORDED_PAYROLL_PERIOD');
      assert.equal(retained.metadata.inventoryAnnexFreshness.status, 'FRESH');
      assert.ok(payload.export); assert.ok(result.certified.value.certificationLimitations.length > 0);
    } else assert.deepEqual(exports[0], draftBefore, 'The preexisting draft artifact must remain byte-for-byte unchanged');
    const events = await db.businessEvent.findMany({ where: { organizationId: x.organizationId, eventType: 'close.certification.invalidated' }, orderBy: { id: 'asc' } });
    assert.equal(events.length, 1);
    assert.equal(events[0].payload.closePackExportId, first === 'certifier' ? exports[0].id : null);
    const after = await financial(); assert.equal(after.hash, before.hash, 'Certification and invalidation must not change financial records');
    return { organizationId: x.organizationId, closeRunId: x.closeRunId, ordering: first + '-first', blocking: result.blocking, events: result.events,
      certification: result.certified.success ? { success: true, exportId: result.certified.value.exportId, contentHash: result.certified.value.contentHash } : result.certified,
      invalidation: result.invalidated, finalStatus: current.status, exportId: exports[0].id, artifactRetained: true, staleExport: exports[0].metadata?.staleState?.status || null, financialBefore: before, financialAfter: after, noFinancialEffectsDuringOperation: true };
  }
  function loadPredecessor() {
    const receipt = JSON.parse(fs.readFileSync(baselineReceiptFile, 'utf8'));
    const saved = receipt.files.find(row => row.path.replaceAll('\\', '/').endsWith('services/accounting/close-assurance-pack.service.ts')); assert.ok(saved);
    const bytes = Buffer.from(saved.bytesBase64, 'base64'), sourceHash = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(sourceHash, saved.sha256); assert.equal(sourceHash, '394edd99c8ac8eace202d13a858bd04199861eaba0f619508af0d9a56b9c2f6e');
    const ts = require('typescript'), Module = require('node:module');
    const filename = path.join(root, 'services/accounting/close-assurance-pack.service.ts');
    const compiled = ts.transpileModule(bytes.toString('utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
    const isolated = new Module(filename, module); isolated.filename = filename; isolated.paths = Module._nodeModulePaths(path.dirname(filename));
    // Compile retained bytes in memory only. Do not replace source or require.cache.
    isolated._compile(compiled.outputText, filename);
    return { api: isolated.exports, sourceHash };
  }
  async function baseline() {
    const corrected = report.checks.find(row => row.id === 'certifier-first' && row.status === 'passed');
    if (!corrected) throw blocker('Baseline needs the actual successful positive fixture', {});
    const info = report.fixtures.find(row => row.organizationId === corrected.organizationId);
    const scope = { organizationId: info.organizationId }, observedBefore = await financial();
    // Reuse the real configured test organization; obtain a new assessment from
    // current services instead of reusing or editing its invalidated run.
    await runCloseAssurance(info.organizationId, { periodId: info.periodId }, { actorId: info.actorIds.maker, actorPermissions: ['accounting.close.run'], now: new Date() });
    const close = await db.closeRun.findFirstOrThrow({ where: scope, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    if (close.status !== 'READY' || close.metadata?.trustLevel !== 'T4') throw blocker('New actual baseline assessment did not reach READY/T4', { status: close.status, trustLevel: close.metadata?.trustLevel });
    const x = { organizationId: info.organizationId, closeRunId: close.id, periodId: info.periodId, certifierId: info.actorIds.certifier }, old = loadPredecessor();
    const held = deferred(), release = deferred(); let readerPid, certification;
    const writer = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 22000, maxWait: 10000 } });
    await assertDisposableDatabaseIdentity(writer, helper.database); await helper.withClient(f.target, helper.assertOwned);
    dbModule.db = new Proxy(db, { get(target, property) {
      if (property !== '$transaction') return Reflect.get(target, property);
      return work => target.$transaction(async tx => {
        readerPid = await identity(tx);
        return work(new Proxy(tx, { get(inner, key) {
          if (key !== 'closeRun') return Reflect.get(inner, key);
          return new Proxy(inner.closeRun, { get(model, method) {
            if (method !== 'findFirst') return Reflect.get(model, method);
            return async args => { const value = await model.findFirst(args); if (args.where?.id === x.closeRunId) { held.resolve(); await bounded(release.promise, 'baseline actual run read', 16000); } return value; };
          } });
        } }));
      }, { timeout: 22000 });
    } });
    try {
      const at = new Date();
      certification = old.api.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'CERTIFIED' }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: at, now: at });
      certification.catch(() => {});
      await bounded(held.promise, 'baseline certifier read');
      const mutation = await writer.$transaction(async tx => ({ pid: await identity(tx), result: await old.api.recordCloseCertificationInvalidationsForSourceInTx(tx, x.organizationId, {
        sourceCode: 'INVENTORY_VALUATION_ANNEX', closeRunId: x.closeRunId, sourceId: x.periodId, staleReason: 'LOCAL SYNTHETIC predecessor race reproduction', previousEvidenceHash: close.metadata.inventoryValuationAnnex.sourceHash,
        newEvidenceHash: 'sha256:' + crypto.createHash('sha256').update(stamp + 'predecessor').digest('hex'),
      }, { actorId: info.actorIds.maker }) }));
      assert.notEqual(readerPid, mutation.pid); assert.equal(mutation.result.invalidatedCount, 1);
      const committed = await writer.closeRun.findUniqueOrThrow({ where: { id: close.id } }); assert.equal(committed.status, 'BLOCKED'); assert.equal(committed.metadata.staleState.status, 'EVIDENCE_STALE');
      release.resolve(); const exported = await certification;
      const overwritten = await writer.closeRun.findUniqueOrThrow({ where: { id: close.id } });
      assert.equal(exported.isCertified, true); assert.equal(overwritten.status, 'CERTIFIED'); assert.equal(overwritten.metadata.staleState, undefined);
      const after = await financial(); assert.equal(after.hash, observedBefore.hash);
      return { sourceHash: old.sourceHash, sourceLoadedInMemoryOnly: true, organizationId: x.organizationId, closeRunId: x.closeRunId, readerPid, writerPid: mutation.pid, committedInvalidation: { status: committed.status, staleState: committed.metadata.staleState.status }, overwrittenResult: { status: overwritten.status, staleState: null, exportId: exported.exportId }, reproduced: true, noFinancialEffectsDuringOperation: true };
    } finally { release.resolve(); if (certification) await certification.catch(() => {}); dbModule.db = originalDb; await writer.$disconnect(); }
  }
  async function main() {
    await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await outside(); report.financialBeforeFixtureSetup = await financial();
    for (const first of ['certifier', 'invalidator']) {
      const began = Date.now();
      try { report.checks.push({ id: first + '-first', status: 'passed', ...await verifyOrdering(first), elapsedMs: Date.now() - began }); }
      catch (error) { report.checks.push({ id: first + '-first', status: error.prerequisite ? 'blocked' : 'failed', error: f.safe(error), prerequisite: error.prerequisite, stack: f.safe(error.stack || error), elapsedMs: Date.now() - began }); }
      console.log(JSON.stringify({ id: report.checks.at(-1).id, status: report.checks.at(-1).status, error: report.checks.at(-1).error }));
    }
    if (baselineRequested) {
      try { report.predecessorComparison = { status: 'passed', ...await baseline() }; }
      catch (error) { report.predecessorComparison = { status: error.prerequisite ? 'blocked' : 'failed', error: f.safe(error), prerequisite: error.prerequisite }; }
    }
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); }
    finally {
      dbModule.db = originalDb;
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfterAllFixtures = await financial(); }
      catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...organizations];
      report.primaryPassed = !report.error && !report.finalizationError && report.checks.length === 2 && report.checks.every(row => row.status === 'passed' && row.noFinancialEffectsDuringOperation) && report.sourceStable && report.outsideUnchanged;
      report.passed = report.primaryPassed && (!baselineRequested || report.predecessorComparison?.status === 'passed');
      const file = path.join(__dirname, 'close-pack-write-race-runtime-' + stamp + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, fixtureOrganizations: organizations }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { f, db, helper, root, organizations, sources, outside, financial, fixture, race, verifyOrdering };
  if (require.main === module) runMain();
}
