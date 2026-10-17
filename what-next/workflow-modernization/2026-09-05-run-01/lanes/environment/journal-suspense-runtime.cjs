// Author-only. The coordinator must release this exact source and owned DB lane.
// All source transitions use the real services; no READY or certification writes.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. --run requires coordinator review and owned local DB release.');
} else {
  const h = require('./close-pack-write-race-runtime.cjs');
  const { f, db, root, helper, organizations } = h, { fs, path, crypto, assert } = f;
  const { PrismaClient } = require('@prisma/client');
  const load = file => require(path.join(root, file));
  const workflow = load('services/reconciliation/payment-suspense-workflow.service.ts');
  const evidence = load('services/reconciliation/payment-suspense-evidence.ts');
  const correction = load('services/reconciliation/payment-suspense-correction.service.ts');
  const recovery = load('services/reconciliation/payment-suspense-resolution-recovery.service.ts');
  const resolution = load('services/reconciliation/payment-suspense-resolution.service.ts');
  const resolutionEvidence = load('services/reconciliation/payment-suspense-resolution-evidence.service.ts');
  const { createChartAccount } = load('services/accounting/accounts.service.ts');
  const { createPostingRule } = load('services/accounting/posting-rules.service.ts');
  const { createFiscalYearWithPeriods } = load('services/accounting/periods.service.ts');
  const { createManualJournalEntry } = load('services/accounting/journals.service.ts');
  const { postJournalEntry } = load('services/accounting/posting.service.ts');
  const { runCloseAssurance } = load('services/accounting/close-assurance.service.ts');
  const { exportClosePack } = load('services/accounting/close-assurance-pack.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db, stamp = crypto.randomUUID();
  const permissions = ['payments.reconciliation.read', 'payments.reconciliation.suspense.propose', 'payments.reconciliation.suspense.post', 'accounting.journal.read', 'accounting.journal.create', 'accounting.journal.post', 'accounting.journal.reverse'];
  const files = [...new Set([__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])].sort();
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run: stamp, at: new Date().toISOString(), checks: [], fixtures: [],
    scope: 'Exact owned disposable loopback database. Actual suspense posting, correction/reposting, manual clearing, final resolution and recovery, fiscal creation, Close assessment and export services. Source snapshots and financial deltas retained. No fabricated readiness/certification, live funds, migrations, seeds or external delivery.',
    limitations: ['Synthetic persisted roles and direct-service controls do not establish authenticated action/session evidence or professional approval.',
      'Initial READY/T4 certified export precedes suspense source setup. All subsequent Close grades and blockers come from actual assessment; unresolved sources and manual class3 clearing may block readiness.',
      'The real catalog race proves snapshot retry. New eligible Close publication races are covered by shared-boundary tests; this fixture never manufactures an eligible assessment.'] };
  const financialModels = ['journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'inventoryTransaction', 'payment', 'supplierPayment', 'customerSettlement'];
  const sourceModels = ['suspenseItem', 'paymentException', 'reconciliationRun', 'paymentReconciliationInboxItem'];
  const rollbackEvidenceModels = ['auditLog', 'ledgerAuditEvent', 'businessEvent', 'businessEventOutbox', 'closeRun', 'closePackExport'];
  async function guard() { await assertDisposableDatabaseIdentity(db, helper.database); await helper.withClient(f.target, helper.assertOwned); }
  async function snapshot(models, where) { const rows = {}; for (const model of models) rows[model] = await db[model].findMany({ where, orderBy: { id: 'asc' } }); return { hash: f.hash(rows), rows }; }
  const financial = x => snapshot(financialModels, { organizationId: x.organizationId });
  const retained = x => snapshot(sourceModels, { organizationId: x.organizationId });
  async function outside() { const inherited = await h.outside(), extra = await snapshot([...sourceModels, 'auditLog', 'customerSettlement'], { organizationId: { notIn: organizations } }); return { hash: f.hash({ inherited, extra }), inherited, extra: { hash: extra.hash } }; }
  function context(x, actorId = x.certifierId) { const at = new Date(); return { organizationId: x.organizationId, actorId, actorPermissions: permissions, lastAuthAt: at, now: at }; }
  function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
  async function bounded(promise, label, ms = 25000) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out; unverified')), ms); })]); } finally { clearTimeout(timer); } }
  async function addMonth(x, offset, label) {
    const period = await db.accountingPeriod.findUniqueOrThrow({ where: { id: x.periodId } });
    const startDate = new Date(Date.UTC(period.startDate.getUTCFullYear(), period.startDate.getUTCMonth() + offset, 1));
    const endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1) - 1);
    const fiscal = await createFiscalYearWithPeriods(x.organizationId, { name: 'Synthetic suspense ' + label + ' ' + stamp, startDate, endDate }, x.makerId);
    assert.equal(fiscal.periods.length, 1); return fiscal.periods[0];
  }
  async function post(x) {
    const at = new Date(), item = await db.suspenseItem.findUniqueOrThrow({ where: { id: x.itemId }, include: { providerAccount: true, reconciliationRun: true } });
    const proposed = await workflow.proposeSuspenseReclassification({ organizationId: x.organizationId, suspenseItemId: x.itemId, proposedById: x.makerId, targetType: 'UNKNOWN_CREDIT',
      reason: 'Synthetic independently reviewed source classification', suspenseLedgerAccountId: x.suspenseAccountId, expectedEvidenceRevision: evidence.suspenseEvidenceRevision(item, at), idempotencyKey: crypto.randomUUID(), control: context(x, x.makerId) });
    return workflow.approveSuspensePosting({ organizationId: x.organizationId, suspenseItemId: x.itemId, approvedById: x.checkerId, expectedEvidenceRevision: proposed.evidenceRevision, control: context(x, x.checkerId) });
  }
  async function prepare(x) {
    const draft = { suspenseItemId: x.itemId, reversalDate: new Date().toISOString().slice(0, 10), reason: 'Synthetic independent source correction' };
    const api = x.kind === 'correction' ? correction : recovery;
    const preview = await api[x.kind === 'correction' ? 'previewSuspenseCorrection' : 'previewSuspenseResolutionRecovery'](draft, context(x, x.makerId));
    const proposed = await api[x.kind === 'correction' ? 'proposeSuspenseCorrection' : 'proposeSuspenseResolutionRecovery']({ ...draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, context(x, x.makerId));
    const review = await api[x.kind === 'correction' ? 'reviewSuspenseCorrection' : 'reviewSuspenseResolutionRecovery'](x.itemId, proposed.proposalId, context(x));
    return { suspenseItemId: x.itemId, proposalId: proposed.proposalId, expectedRevision: review.revision, decision: 'APPROVE', reason: 'Synthetic independent reversal decision' };
  }
  const decide = (x, command, control = context(x)) => (x.kind === 'correction' ? correction.decideSuspenseCorrection : recovery.decideSuspenseResolutionRecovery)(command, control);
  async function assessment(x, label) {
    await runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: 'suspense-' + label + '-' + stamp }, { actorId: x.makerId, actorPermissions: ['accounting.close.run'], now: new Date() });
    const run = await db.closeRun.findFirstOrThrow({ where: { organizationId: x.organizationId, periodId: x.periodId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return { id: run.id, status: run.status, trustLevel: run.metadata?.trustLevel, criticalBlockerCount: run.criticalBlockerCount, highBlockerCount: run.highBlockerCount };
  }
  async function fixture(kind) {
    await guard(); const x = { ...await h.fixture('suspense-' + kind), kind }; x.checkerId = x.info.actorIds.checker;
    await db.role.create({ data: { organizationId: x.organizationId, code: 'owned-suspense-verifier', nameEn: 'Synthetic local suspense verifier only', permissions, users: { connect: [x.makerId, x.checkerId, x.certifierId].map(id => ({ id })) } } });
    const at = new Date(); x.artifact = await exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'CERTIFIED' }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: at, now: at });
    assert.equal(x.artifact.isCertified, true);
    const artifactPath = path.join(__dirname, 'journal-suspense-' + stamp + '-' + kind + '-initial-certified.json');
    fs.writeFileSync(artifactPath, x.artifact.content, { flag: 'wx' }); x.artifactHash = sha(fs.readFileSync(artifactPath)); x.artifactPath = artifactPath;
    const earlier = await addMonth(x, -2, 'earlier-retained-close');
    const opening = await db.journalEntry.findUniqueOrThrow({ where: { id: x.info.setup.journalEntryId }, include: { lines: true } });
    const earlierEntry = await createManualJournalEntry(x.organizationId, { journalId: opening.journalId, entryDate: new Date(earlier.startDate.getTime() + 43200000), memo: 'Synthetic earlier period readiness evidence before suspense exists',
      lines: opening.lines.map(line => ({ accountId: line.accountId, debit: line.debit.toString(), credit: line.credit.toString(), currency: line.currency })) }, x.makerId);
    await postJournalEntry(x.organizationId, earlierEntry.id, x.checkerId, context(x, x.checkerId));
    x.earlier = await assessment({ ...x, periodId: earlier.id }, kind + '-earlier-before-source');
    assert.equal(x.earlier.status, 'READY'); assert.equal(x.earlier.trustLevel, 'T4');
    const earlierAt = new Date(); x.earlierArtifact = await exportClosePack(x.organizationId, { closeRunId: x.earlier.id, mode: 'CERTIFIED' }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: earlierAt, now: earlierAt });
    assert.equal(x.earlierArtifact.isCertified, true); x.earlierPeriodId = earlier.id;
    x.earlierArtifactPath = path.join(__dirname, 'journal-suspense-' + stamp + '-' + kind + '-earlier-certified.json');
    fs.writeFileSync(x.earlierArtifactPath, x.earlierArtifact.content, { flag: 'wx' }); x.earlierArtifactHash = sha(fs.readFileSync(x.earlierArtifactPath));
    const prior = await addMonth(x, -1, 'linked-business-date'); x.businessDate = new Date(prior.startDate.getTime() + 43200000);
    x.noRun = await addMonth(x, 2, 'future-no-run');
    const account = await createChartAccount(x.organizationId, { code: 'SYNTHETIC-SUSPENSE-471', nameEn: 'Synthetic suspense source', type: 'ASSET', normalBalance: 'DEBIT', syscohadaClass: '4', syscohadaReference: 'LOCAL VERIFICATION ONLY' }, x.makerId);
    const counter = await createChartAccount(x.organizationId, { code: 'SYNTHETIC-SUSPENSE-585', nameEn: 'Synthetic source counterpart', type: 'LIABILITY', normalBalance: 'CREDIT', syscohadaClass: '5', syscohadaReference: 'LOCAL VERIFICATION ONLY' }, x.makerId);
    x.suspenseAccountId = account.id;
    await createPostingRule(x.organizationId, { code: 'SYNTHETIC-SUSPENSE', nameEn: 'Synthetic local suspense rule', sourceType: 'PAYMENT_SUSPENSE', postingPurpose: 'SUSPENSE_RECLASSIFICATION', lines: [
      { side: 'DEBIT', accountId: account.id, amountSource: 'SOURCE_AMOUNT' }, { side: 'CREDIT', accountId: counter.id, amountSource: 'SOURCE_AMOUNT' },
    ] }, x.makerId);
    const rail = await db.paymentRail.create({ data: { organizationId: x.organizationId, type: 'BANK_TRANSFER', code: 'OWNED-SUSPENSE', name: 'Synthetic source rail' } });
    const provider = await db.providerAccount.create({ data: { organizationId: x.organizationId, paymentRailId: rail.id, providerCode: 'OWNED-SUSPENSE', displayName: 'Synthetic local provider', externalAccountHash: crypto.randomUUID(), status: 'ACTIVE', suspenseLedgerAccountId: account.id } });
    const run = await db.reconciliationRun.create({ data: { organizationId: x.organizationId, paymentRailId: rail.id, providerAccountId: provider.id, businessDate: x.businessDate, periodStart: x.businessDate, periodEnd: new Date(x.businessDate.getTime() + 86400000), status: 'NEEDS_REVIEW', runById: x.makerId } });
    x.runId = run.id;
    const item = await db.suspenseItem.create({ data: { organizationId: x.organizationId, suspenseLedgerAccountId: account.id, type: 'UNKNOWN_CREDIT', status: 'OPEN', amount: '100.25', currencyCode: 'XAF', providerAccountId: provider.id, reconciliationRunId: run.id } }); x.itemId = item.id;
    await post(x);
    if (kind === 'correction') {
      // Genuine first-cycle reversal and repost make original journal date differ
      // from linked businessDate. The second correction must cover both periods.
      await decide(x, await prepare(x)); await post(x);
      const posted = await db.suspenseItem.findUniqueOrThrow({ where: { id: x.itemId } });
      x.source = await db.journalEntry.findFirstOrThrow({ where: { organizationId: x.organizationId, postingBatchId: posted.ledgerPostingBatchId, postingPurpose: 'SUSPENSE_RECLASSIFICATION' }, include: { lines: { include: { account: true } } } });
    } else {
      const journal = await db.journal.findFirstOrThrow({ where: { organizationId: x.organizationId, type: 'GENERAL' } });
      const inventory = await db.chartOfAccount.findFirstOrThrow({ where: { organizationId: x.organizationId, mappingKey: 'INVENTORY', isActive: true } });
      const entry = await createManualJournalEntry(x.organizationId, { journalId: journal.id, entryDate: new Date(), reference: 'Synthetic retained clearing source ' + stamp, memo: 'Synthetic inventory destination; actual class3 orphan blockers retained', lines: [
        { accountId: account.id, credit: '100.25', currency: 'XAF' }, { accountId: inventory.id, debit: '100.25', currency: 'XAF' },
      ] }, x.makerId);
      await postJournalEntry(x.organizationId, entry.id, x.checkerId, context(x, x.checkerId));
      const draft = { suspenseItemId: x.itemId, clearingJournalId: entry.id, outcome: 'RESOLVED', reason: 'Synthetic full clearing independently reviewed' };
      const preview = await resolutionEvidence.previewSuspenseResolution(draft, context(x, x.makerId));
      const proposed = await resolution.proposeSuspenseResolution({ ...draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, context(x, x.makerId));
      const review = await resolution.reviewSuspenseResolution(x.itemId, proposed.proposalId, context(x));
      await resolution.decideSuspenseResolution({ suspenseItemId: x.itemId, proposalId: proposed.proposalId, expectedRevision: review.revision, decision: 'APPROVE', reason: 'Synthetic independent full resolution' }, context(x));
      x.source = await db.journalEntry.findUniqueOrThrow({ where: { id: entry.id }, include: { lines: { include: { account: true } } } });
    }
    // A same-tenant business-date-only overlap is deliberately absent from the
    // original/current journal period IDs. Creation uses the actual fiscal API.
    x.businessOverlap = await addMonth(x, -1, 'business-date-overlap');
    x.command = await prepare(x); x.assessmentBefore = await assessment(x, kind + '-before');
    report.fixtures.push({ kind, organizationId: x.organizationId, itemId: x.itemId, runId: x.runId, sourceJournalId: x.source.id, sourceDate: x.source.entryDate, businessDate: x.businessDate,
      initialClose: { id: x.closeRunId, status: 'READY', trustLevel: 'T4', exportId: x.artifact.exportId, artifactPath, artifactHash: x.artifactHash }, actualAssessmentAfterSource: x.assessmentBefore,
      earlierRetainedClose: { ...x.earlier, periodId: x.earlierPeriodId, exportId: x.earlierArtifact.exportId, artifactPath: x.earlierArtifactPath, artifactHash: x.earlierArtifactHash },
      noRunPeriodId: x.noRun.id, businessDateOverlapId: x.businessOverlap.id, actorIds: x.info.actorIds });
    return x;
  }
  async function writerClient() { const client = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 45000, maxWait: 10000 } }); await assertDisposableDatabaseIdentity(client, helper.database); return client; }
  function observer(writer, mode, waitKey) {
    const state = { attempts: [], held: deferred(), release: deferred(), waiting: deferred(), injected: false };
    const client = new Proxy({}, { get(_target, property) {
      if (property !== '$transaction') { const value = Reflect.get(db, property); return typeof value === 'function' ? value.bind(db) : value; }
      return async (work, options) => {
        assert.equal(options.isolationLevel, 'Serializable');
        const attempt = { number: state.attempts.length + 1, keys: [], events: [], financialWrites: [] }; state.attempts.push(attempt);
        try {
          const result = await writer.$transaction(async tx => {
            const identity = (await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database, txid_current_snapshot()::text AS snapshot'))[0];
            assert.equal(identity.database, helper.database); Object.assign(attempt, identity);
            if (mode === 'catalog' && attempt.number === 1) { state.held.resolve(attempt); await bounded(state.release.promise, 'catalog snapshot release', 35000); }
            return work(new Proxy(tx, { get(target, modelName) {
              if (modelName === '$queryRaw') return async (...args) => {
                const values = [...(Array.isArray(args[0]?.values) ? args[0].values : []), ...args.slice(1)];
                const key = values.find(value => typeof value === 'string' && (value.startsWith('["accounting-period-catalog"') || value.startsWith('["close-assessment-order"')));
                const text = args.map(value => typeof value === 'string' ? value : value?.sql || value?.text || (Array.isArray(value) ? value.join('?') : '')).join(' ');
                if (key) { attempt.events.push({ kind: 'key-attempt', key }); if (key === waitKey) state.waiting.resolve(attempt); }
                if (text.includes('FOR UPDATE') || text.includes('FOR SHARE')) attempt.events.push({ kind: 'row-lock' });
                const value = await target.$queryRaw(...args);
                if (key) { attempt.keys.push(key); attempt.events.push({ kind: 'key-acquired', key }); }
                return value;
              };
              if (['ledgerPostingBatch', 'journalEntry', 'journalEntryLine', 'accountingSourceLink'].includes(modelName)) return new Proxy(target[modelName], { get(model, method) {
                if (method !== 'create') return Reflect.get(model, method);
                return async args => {
                  attempt.events.push({ kind: 'financial-write', model: modelName });
                  const value = await model.create(args); attempt.financialWrites.push({ model: modelName, id: value.id });
                  if (mode === 'rollback' && modelName === 'journalEntry' && !state.injected) { state.injected = true; throw new Error('OWNED_SUSPENSE_REVERSAL_INSERT_ROLLBACK'); }
                  return value;
                };
              } });
              return Reflect.get(target, modelName);
            } }));
          }, { ...options, timeout: 45000 });
          attempt.status = 'committed'; return result;
        } catch (error) { attempt.status = 'rolled-back'; attempt.errorName = error.name; attempt.errorCode = error.code || null; throw error; }
      };
    } });
    return { client, state };
  }
  async function expectedScope(x) {
    const periods = await db.accountingPeriod.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } });
    // Close consumes the organization's full payment suspense/run dashboard.
    return periods.map(row => row.id).sort();
  }
  async function rollback(x, writer) {
    const before = await financial(x), prior = await retained(x), evidenceBefore = await snapshot(rollbackEvidenceModels, { organizationId: x.organizationId }), observed = observer(writer, 'rollback'); dbModule.db = observed.client;
    try { await assert.rejects(() => decide(x, x.command), /OWNED_SUSPENSE_REVERSAL_INSERT_ROLLBACK/); } finally { dbModule.db = originalDb; }
    assert.equal((await financial(x)).hash, before.hash); assert.equal((await retained(x)).hash, prior.hash);
    assert.equal((await snapshot(rollbackEvidenceModels, { organizationId: x.organizationId })).hash, evidenceBefore.hash);
    assert.equal(observed.state.attempts.length, 1); assert.equal(observed.state.attempts[0].status, 'rolled-back');
    assert.ok(observed.state.attempts[0].financialWrites.some(row => row.model === 'journalEntry'));
    return { attempts: observed.state.attempts, financialUnchanged: true, sourceUnchanged: true, auditEventsOutboxAndCloseUnchanged: true };
  }
  async function expiredWait(x, writer) {
    const periodIds = await expectedScope(x), key = JSON.stringify(['close-assessment-order', x.organizationId, periodIds[0]]);
    const before = await financial(x), prior = await retained(x), held = deferred(), release = deferred();
    const holding = helper.withClient(f.target, async client => {
      await helper.assertOwned(client); await client.query('BEGIN');
      try { await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key]); held.resolve((await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid); await bounded(release.promise, 'expiry holder release', 35000); await client.query('COMMIT'); }
      catch (error) { await client.query('ROLLBACK'); throw error; }
    });
    const holderPid = await bounded(held.promise, 'expiry holder'); const observed = observer(writer, 'expiry', key); dbModule.db = observed.client;
    const control = context(x); control.lastAuthAt = new Date(control.now.getTime() - 298500);
    const pending = decide(x, x.command, control).then(value => ({ value }), error => ({ error }));
    let blocking, waitError;
    try {
      const attempt = await bounded(observed.state.waiting.promise, 'expiry waiter');
      blocking = await helper.withClient(f.target, async client => {
        await helper.assertOwned(client); const until = Date.now() + 4000;
        do { const row = (await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [attempt.pid])).rows[0]; if (row.blockers.includes(holderPid)) return { holderPid, waiterPid: attempt.pid, blockers: row.blockers }; await new Promise(done => setTimeout(done, 30)); } while (Date.now() < until);
        throw new Error('Expected actual PostgreSQL scope contention not observed');
      });
      await new Promise(done => setTimeout(done, 2200));
    } catch (error) { waitError = error; }
    finally { release.resolve(); try { await holding; } catch (error) { waitError ||= error; } }
    let result; try { result = await bounded(pending, 'expired reversal'); } finally { dbModule.db = originalDb; }
    if (waitError) throw waitError;
    assert.equal(result.error?.code, 'FRESH_AUTH_REQUIRED'); assert.equal((await financial(x)).hash, before.hash); assert.equal((await retained(x)).hash, prior.hash);
    return { blocking, attempts: observed.state.attempts, deniedAfterRealWait: true, financialUnchanged: true, sourceUnchanged: true };
  }
  async function catalogRetry(x, writer) {
    const before = await financial(x), prior = await retained(x), observed = observer(writer, 'catalog'); dbModule.db = observed.client;
    const pending = decide(x, x.command).then(value => ({ value }), error => ({ error }));
    let added, setupError;
    try { await bounded(observed.state.held.promise, 'old Serializable snapshot'); dbModule.db = originalDb; added = await addMonth(x, 3, 'concurrent-catalog'); }
    catch (error) { setupError = error; }
    finally { dbModule.db = observed.client; observed.state.release.resolve(); }
    let result; try { result = await bounded(pending, 'catalog retry'); } finally { dbModule.db = originalDb; }
    if (setupError) throw setupError;
    if (result.error) throw result.error;
    assert.equal(result.value.replayed, false); assert.equal(result.value.outcome, x.kind === 'correction' ? 'REOPENED' : 'POSTED_TO_SUSPENSE');
    assert.equal(observed.state.attempts.length, 2); const [failed, committed] = observed.state.attempts;
    assert.equal(failed.errorName, 'JournalReversalSnapshotChangedError'); assert.equal(failed.financialWrites.length, 0); assert.equal(committed.status, 'committed'); assert.notEqual(failed.snapshot, committed.snapshot);
    const ids = await expectedScope(x), firstWrite = committed.events.findIndex(event => event.kind === 'financial-write');
    const beforeWriteKeys = committed.events.slice(0, firstWrite).filter(event => event.kind === 'key-acquired').map(event => event.key);
    assert.equal(beforeWriteKeys[0], JSON.stringify(['accounting-period-catalog', x.organizationId]));
    assert.deepEqual(beforeWriteKeys.slice(1), ids.map(id => JSON.stringify(['close-assessment-order', x.organizationId, id])));
    const firstRow = committed.events.findIndex(event => event.kind === 'row-lock'); assert.ok(committed.events.findIndex(event => event.kind === 'key-acquired') < firstRow);
    assert.ok(ids.includes(x.businessOverlap.id)); assert.ok(ids.includes(x.earlierPeriodId)); assert.ok(ids.includes(x.noRun.id)); assert.ok(ids.includes(added.id));
    assert.equal(await db.closeRun.count({ where: { organizationId: x.organizationId, periodId: x.noRun.id } }), 0);
    const after = await financial(x), newJournals = after.rows.journalEntry.filter(row => !before.rows.journalEntry.some(saved => saved.id === row.id)); assert.equal(newJournals.length, 1);
    const reversal = newJournals[0]; assert.equal(reversal.reversalOfEntryId, x.source.id); assert.equal(after.rows.journalEntry.find(row => row.id === x.source.id).status, 'REVERSED');
    const without = (row, keys) => Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
    for (const saved of before.rows.journalEntry) {
      const current = after.rows.journalEntry.find(row => row.id === saved.id);
      const allowed = saved.id === x.source.id ? ['status', 'reversedAt', 'reversedById', 'updatedAt'] : [];
      assert.deepEqual(without(current, allowed), without(saved, allowed));
    }
    for (const saved of before.rows.ledgerPostingBatch) {
      const current = after.rows.ledgerPostingBatch.find(row => row.id === saved.id);
      const allowed = saved.id === x.source.postingBatchId ? ['status', 'reversedAt', 'updatedAt'] : [];
      assert.deepEqual(without(current, allowed), without(saved, allowed));
    }
    for (const model of ['journalEntryLine', 'accountingSourceLink']) for (const saved of before.rows[model]) assert.deepEqual(after.rows[model].find(row => row.id === saved.id), saved);
    const lines = after.rows.journalEntryLine.filter(row => row.journalEntryId === reversal.id).sort((a,b) => a.lineNumber-b.lineNumber);
    assert.equal(after.rows.journalEntryLine.length - before.rows.journalEntryLine.length, x.source.lines.length);
    assert.equal(lines.length, x.source.lines.length);
    for (const original of x.source.lines) {
      const reversed = lines.find(row => row.lineNumber === original.lineNumber); assert.ok(reversed);
      assert.equal(String(reversed.debit), String(original.credit)); assert.equal(String(reversed.credit), String(original.debit));
      assert.equal(String(reversed.baseDebit), String(original.baseCredit)); assert.equal(String(reversed.baseCredit), String(original.baseDebit));
      for (const field of ['accountId', 'currency', 'locationId', 'customerId', 'supplierId', 'itemId', 'dimensions']) assert.deepEqual(reversed[field], original[field]);
      assert.equal(String(reversed.exchangeRate), String(original.exchangeRate));
    }
    assert.equal(after.rows.ledgerPostingBatch.length - before.rows.ledgerPostingBatch.length, 1); assert.equal(after.rows.accountingSourceLink.length - before.rows.accountingSourceLink.length, 1);
    for (const model of ['inventoryTransaction','payment','supplierPayment','customerSettlement']) assert.equal(f.hash(after.rows[model]), f.hash(before.rows[model]));
    const currentReceipts = (await retained(x)).rows.paymentReconciliationInboxItem;
    for (const row of prior.rows.paymentReconciliationInboxItem) assert.deepEqual(currentReceipts.find(saved => saved.id === row.id), row);
    const replayBefore = await financial(x), replaySource = await retained(x); const replay = await decide(x, x.command); assert.equal(replay.replayed, true); assert.equal(replay.receiptId, result.value.receiptId);
    assert.equal((await financial(x)).hash, replayBefore.hash); assert.equal((await retained(x)).hash, replaySource.hash);
    assert.equal(sha(fs.readFileSync(x.artifactPath)), x.artifactHash);
    const initialClose = await db.closeRun.findUniqueOrThrow({ where: { id: x.closeRunId } }); assert.equal(initialClose.status, 'BLOCKED');
    const earlierClose = await db.closeRun.findUniqueOrThrow({ where: { id: x.earlier.id } });
    const earlierExport = await db.closePackExport.findUniqueOrThrow({ where: { id: x.earlierArtifact.exportId } });
    assert.equal(earlierClose.status, 'BLOCKED'); assert.equal(earlierClose.metadata.staleState.newEvidenceHash, reversal.id);
    assert.equal(earlierExport.metadata.staleState.newEvidenceHash, reversal.id); assert.equal(sha(fs.readFileSync(x.earlierArtifactPath)), x.earlierArtifactHash);
    const assessmentAfter = await assessment(x, x.kind + '-after');
    return { result: result.value, addedPeriodId: added.id, expectedPeriodIds: ids, attempts: observed.state.attempts, reversalJournalId: reversal.id, realFinancialDelta: { journalEntries: 1, batches: 1, sourceLinks: 1 }, exactReplay: true, retainedSourceReceiptsUnchanged: true, initialExportBytesUnchanged: true, earlierRetainedExportInvalidatedByThisReversal: true, assessmentAfter };
  }
  async function runMain() {
    await guard(); report.sourcesBefore = sources(); report.outsideBefore = await outside();
    for (const kind of ['correction', 'recovery']) {
      let writer; const check = { kind };
      try { const x = await fixture(kind); writer = await writerClient(); check.rollback = await rollback(x, writer); if (kind === 'correction') check.freshAuthWait = await expiredWait(x, writer); check.catalogRetryAndReplay = await catalogRetry(x, writer); check.passed = true; }
      catch (error) { check.passed = false; check.error = f.safe(error, []); check.location = String(error.stack).split('\n').filter(line => line.includes('journal-suspense-runtime')); }
      finally { dbModule.db = originalDb; if (writer) await writer.$disconnect(); report.checks.push(check); }
    }
    report.passed = report.checks.length === 2 && report.checks.every(check => check.passed);
  }
  if (require.main === module) runMain().catch(error => { report.passed = false; report.error = f.safe(error, []); }).finally(async () => {
    dbModule.db = originalDb;
    try { report.outsideAfter = await outside(); report.outsideUnchanged = !!report.outsideBefore && report.outsideBefore.hash === report.outsideAfter.hash; report.sourcesAfter = sources(); report.sourceStable = !!report.sourcesBefore && f.hash(report.sourcesBefore) === f.hash(report.sourcesAfter); }
    catch (error) { report.finalizationError = f.safe(error, []); }
    try { await db.$disconnect(); } catch (error) { report.disconnectError = f.safe(error, []); }
    report.passed = report.passed === true && report.sourceStable === true && report.outsideUnchanged === true && !report.error && !report.finalizationError && !report.disconnectError;
    const filename = 'journal-suspense-runtime-' + stamp + '.json';
    try { fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(report, null, 2), { flag: 'wx' }); }
    catch (error) { report.passed = false; report.receiptWriteError = f.safe(error, []); }
    console.log(JSON.stringify({ filename, passed: report.passed, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, checks: report.checks.map(row => ({ kind: row.kind, passed: row.passed, error: row.error })), error: report.error, finalizationError: report.finalizationError, disconnectError: report.disconnectError, receiptWriteError: report.receiptWriteError }));
    process.exitCode = report.passed ? 0 : 1;
  });
  module.exports = { fixture, runMain, report };
}
