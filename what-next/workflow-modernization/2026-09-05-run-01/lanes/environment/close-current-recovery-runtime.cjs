// New verifier. Historical delayed-detection drivers and receipts stay unchanged.
// Require-only helpers are safe; execution needs --run and coordinator release.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run after source freeze and coordinator review.');
} else {
  const d = require('./close-denial-recovery-runtime.cjs');
  const { f, db, helper, root, organizations } = d.h, { fs, path, crypto, assert } = f;
  const { PrismaClient } = require('@prisma/client');
  const load = file => require(path.join(root, file));
  const snapshotApi = load('services/snapshots/close-readiness-snapshot.service.ts');
  const { getCashCommandData } = load('services/cash-command/cash-command.service.ts');
  const { resolveTenantWideOperatingAuthority } = load('services/operating-access/operating-access-scope-contracts.ts');
  const { getCloseAssuranceDashboard } = load('services/accounting/close-assurance.service.ts');
  const { getProofTrail } = load('services/evidence/proof-trail.service.ts');
  const { reconcileInventoryClass3 } = load('services/inventory/inventory-reconciliation.service.ts');
  const packApi = load('services/accounting/close-assurance-pack.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const dbModule = load('prisma/db.ts'), originalDb = dbModule.db;
  const run = crypto.randomUUID(), now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1);
  const report = { run, at: now.toISOString(), checks: [], scope: 'Exact owned local DB only. Actual setup, synthetic balanced journal, real READY/T4 assessment, independent zero-variance count posting, reassessment and system certification. Separate synthetic retained-history cases test selection and unresolved obligations, not customer or professional approval. No migrations, seeds, delivery, external effects or source restoration.' };
  report.limitations = ['Actual assessment/certification fixtures cover the current accounting period; later-period cumulative invalidation scope is verified by focused service tests, not manufactured future READY/T4 rows.', 'No new assertion claims professional approval, complete financial-model coverage or cross-service atomicity; the explicit paused snapshot race checks one RepeatableRead transaction.'];
  const files = [...new Set([__filename, path.join(__dirname, 'cash-close-recovery-readonly-4e711acb-b190-418a-826a-f6e8400bf410.json'), ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file))])].sort();
  const sources = () => ({ ...d.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])) });
  const outside = d.outside, financial = d.h.financial;
  async function prepareCashActor(x) {
    assert.ok(organizations.includes(x.organizationId), 'Only new owned fixture actors may receive Cash scope');
    const actorId = x.certifierId || x.actorId;
    await db.user.findFirstOrThrow({ where: { id: actorId, organizationId: x.organizationId, isActive: true } });
    await db.role.create({ data: { organizationId: x.organizationId, code: 'administrator', nameEn: 'Synthetic Cash observer with tenant scope only', permissions: ['dashboard.read', 'accounting.close.read'], users: { connect: { id: actorId } } } });
  }
  async function inputs(x) {
    const period = await db.accountingPeriod.findFirstOrThrow({ where: { id: x.periodId, organizationId: x.organizationId } });
    const actor = await db.user.findFirstOrThrow({ where: { id: x.certifierId || x.actorId, organizationId: x.organizationId, isActive: true }, include: { roles: { select: { code: true, permissions: true } } } });
    const input = { organizationId: x.organizationId, periodStart: period.startDate, periodEnd: period.endDate, now: new Date() };
    const available = new Set(actor.roles.flatMap(role => role.permissions));
    return { input, cashInput: { ...input, actorId: actor.id, actorPermissions: ['dashboard.read', 'accounting.close.read'].filter(permission => available.has(permission)), actorRoleCodes: actor.roles.map(role => role.code) } };
  }
  async function observe(x, expectedGrade, options = {}) {
    const { input, cashInput } = await inputs(x), before = await financial();
    const snapshot = await snapshotApi.getCloseReadinessSnapshot(input);
    const cash = options.skipCash ? null : await getCashCommandData(cashInput);
    const current = await getCloseAssuranceDashboard(x.organizationId, x.periodId);
    const explicit = await getCloseAssuranceDashboard(x.organizationId, x.periodId, x.closeRunId);
    const proof = await getProofTrail({ organizationId: x.organizationId, subjectType: 'close.run', subjectId: x.closeRunId }, db);
    const trust = cash?.trustSignals.find(row => row.id === 'close_readiness'); if (!options.skipCash) assert.ok(trust);
    const subject = cash?.proofSubjects.find(row => row.available && row.subjectType === 'close.run');
    assert.equal(snapshot.evidenceGrade, expectedGrade); if (trust) assert.equal(trust.evidenceGrade, expectedGrade);
    if (options.tone && trust) assert.equal(trust.tone, options.tone);
    if (options.latestId) { assert.equal(current.run.id, options.latestId); if (!options.skipCash) assert.equal(subject?.subjectId, options.latestId); }
    if (options.explicitGrade) { assert.equal(explicit.currentProof.grade, options.explicitGrade); assert.equal(proof.evidenceGrade, options.explicitGrade); }
    if (options.blocker) assert.ok(snapshot.blockers.some(row => row.id === options.blocker), 'Missing expected blocker ' + options.blocker);
    if (options.noBlockers) { assert.equal(snapshot.blockers.length, 0); if (trust) assert.equal(trust.blockers.length, 0); }
    assert.equal((await financial()).hash, before.hash, 'Read surfaces must not write financial records');
    return { grade: snapshot.evidenceGrade, metrics: snapshot.metrics, blockers: snapshot.blockers.map(row => ({ id: row.id, severity: row.severity })), sourceHash: snapshot.sourceHash,
      trust: trust ? { value: trust.value, tone: trust.tone, grade: trust.evidenceGrade } : null, cashSkipped: options.skipCash || null, currentRunId: current.run.id, currentGrade: current.currentProof.grade,
      explicitRunId: explicit.run.id, explicitGrade: explicit.currentProof.grade, proofGrade: proof.evidenceGrade, cashSubjectId: subject?.subjectId };
  }
  async function certify(x) {
    const at = new Date();
    return packApi.exportClosePack(x.organizationId, { closeRunId: x.closeRunId, mode: 'CERTIFIED', correlationId: 'owned-current-recovery-' + crypto.randomUUID() },
      { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: at, now: at });
  }
  async function actualJourney() {
    const x = await d.prepareFixture('current-recovery'); await prepareCashActor(x); report.actualFixture = { ...x.info, closeRunId: x.closeRunId, baseSetupCloseRunId: x.baseSetupCloseRunId, countSetup: x.countSetup };
    report.financialAfterSetup = await financial();
    const prior = await certify(x), before = await observe(x, 'certified', { tone: 'success', latestId: x.closeRunId, explicitGrade: 'certified', noBlockers: true });
    const priorHistory = await d.history(x), priorCounts = await reconcileInventoryClass3({ organizationId: x.organizationId, periodId: x.periodId, currency: 'XAF' }, db);
    const posted = await d.postPreparedCount(x), invalidated = await d.denialState(x), afterCounts = await reconcileInventoryClass3({ organizationId: x.organizationId, periodId: x.periodId, currency: 'XAF' }, db);
    const oldest = await d.denialState({ ...x, closeRunId: x.baseSetupCloseRunId });
    assert.equal(oldest.run.status, 'BLOCKED'); assert.equal(oldest.run.metadata.staleState.status, 'EVIDENCE_STALE'); assert.equal(oldest.events.length, 1);
    assert.equal(invalidated.run.status, 'BLOCKED'); assert.equal(invalidated.run.metadata.staleState.status, 'EVIDENCE_STALE');
    assert.equal(invalidated.events.length, 1); assert.equal(invalidated.outbox.length, 1); assert.equal(invalidated.audit.length, 1);
    const event = invalidated.events[0];
    assert.equal(event.payload.sourceCode, 'INVENTORY_PHYSICAL_COUNT_VALIDATED'); assert.equal(event.payload.sourceId, x.countSetup.countSessionId);
    assert.equal(event.payload.sourceModel, 'StockCountSession'); assert.equal(event.payload.sourceTable, 'stock_count_sessions'); assert.equal(event.payload.sourceEventName, 'inventory.physical_count.validated');
    assert.equal(event.payload.newEvidenceHash, x.countSetup.countSheetHash); assert.equal(event.actorId, x.countSetup.approvedById);
    assert.equal(invalidated.outbox[0].businessEventId, event.id); assert.equal(invalidated.outbox[0].status, 'PENDING');
    assert.equal(afterCounts.status, 'PASSED'); assert.notEqual(afterCounts.evidenceHash, priorCounts.evidenceHash);
    assert.equal(afterCounts.inventoryValue, priorCounts.inventoryValue); assert.equal(afterCounts.ledgerClass3Value, priorCounts.ledgerClass3Value);
    const retained = await d.history(x);
    for (const key of ['evidence', 'checklist', 'findings']) assert.deepEqual(retained[key], priorHistory[key]);
    assert.equal(retained.exports.length, priorHistory.exports.length);
    for (const artifact of retained.exports) { const old = priorHistory.exports.find(row => row.id === artifact.id); assert.ok(old); assert.equal(artifact.contentHash, old.contentHash); assert.equal(artifact.isCertified, old.isCertified); }
    assert.ok(retained.exports.some(row => row.id === prior.exportId && row.metadata.staleState?.status === 'EVIDENCE_STALE'));
    const blocked = await observe(x, 'blocked', { tone: 'danger', latestId: x.closeRunId, explicitGrade: 'blocked', blocker: 'close-evidence-stale' });
    const afterFirstPost = f.hash({ invalidated, retained });
    const retry = await d.postPreparedCount(x); assert.equal(retry.replayed, true);
    assert.equal(f.hash({ invalidated: await d.denialState(x), retained: await d.history(x) }), afterFirstPost);
    const recovered = await d.assessment(x, 'current-recovery'); assert.notEqual(recovered.closeRunId, x.closeRunId);
    const operational = await observe(recovered, 'operational', { tone: 'info', latestId: recovered.closeRunId, explicitGrade: 'operational', noBlockers: true });
    const certified = await certify(recovered), completed = await observe(recovered, 'certified', { tone: 'success', latestId: recovered.closeRunId, explicitGrade: 'certified', noBlockers: true });
    assert.equal(completed.metrics.recentCloseRunCount, 1); assert.equal(completed.metrics.certifiedCloseRunCount, 1); assert.equal(completed.metrics.blockedCloseRunCount, 0);
    assert.equal(f.hash({ invalidated: await d.denialState(x), retained: await d.history(x) }), afterFirstPost);
    const old = await observe(x, 'certified', { tone: 'success', latestId: recovered.closeRunId, explicitGrade: 'blocked', noBlockers: true });
    assert.equal((await financial()).hash, report.financialAfterSetup.hash);
    return { organizationId: x.organizationId, oldRunId: x.closeRunId, recoveredRunId: recovered.closeRunId, countEventId: posted.eventId, invalidationEventId: event.id,
      priorExportId: prior.exportId, recoveredExportId: certified.exportId, oldestRunId: oldest.run.id, oldestInvalidationEventId: oldest.events[0].id,
      sourceProvenance: { code: event.payload.sourceCode, model: event.payload.sourceModel, table: event.payload.sourceTable, event: event.payload.sourceEventName, id: event.payload.sourceId }, before, blocked, operational, completed, explicitRetainedOld: old,
      immediateInvalidationWithoutCertificationAttempt: true, exactPostRetry: true, retainedHistoryHash: afterFirstPost, priorSourceHash: priorCounts.evidenceHash, currentSourceHash: afterCounts.evidenceHash, noOperationFinancialEffects: true };
  }
  async function syntheticFixture(name) {
    const id = 'workflow_close_current_recovery_' + name + '_' + run; organizations.push(id);
    await db.organization.create({ data: { id, name: helper.prefix + 'Close current selection ' + name, slug: 'close-selection-' + name + '-' + run, currency: 'XAF' } });
    const actor = await db.user.create({ data: { organizationId: id, email: name + '-' + run + '@example.invalid', isActive: true, isVerified: true } });
    await db.role.create({ data: { organizationId: id, code: 'administrator', nameEn: 'Synthetic read-contract actor', permissions: ['dashboard.read', 'accounting.close.read'], users: { connect: { id: actor.id } } } });
    const modules = ['dashboard', 'finance', 'accounting', 'close_assurance'];
    await db.tenantModuleConfiguration.create({ data: { organizationId: id, manifestHash: 'synthetic-current-read-' + run, selectedModules: modules, activeModules: modules } });
    await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: id, moduleSlug, status: 'active', source: 'requested_modules' })) });
    const year = await db.fiscalYear.create({ data: { organizationId: id, name: 'Synthetic read year', startDate, endDate } });
    const period = await db.accountingPeriod.create({ data: { organizationId: id, fiscalYearId: year.id, name: 'Synthetic read period', periodNumber: 1, startDate, endDate } });
    return { organizationId: id, actorId: actor.id, periodId: period.id, yearId: year.id };
  }
  async function syntheticRun(x, status, offset, extra = {}) {
    const row = await db.closeRun.create({ data: { organizationId: x.organizationId, periodId: x.periodId, status, readinessScore: 100, runById: x.actorId,
      createdAt: new Date(now.getTime() - 600000 + offset), metadata: { syntheticReadFixture: true, customerApproval: false }, ...extra } });
    return { ...x, closeRunId: row.id };
  }
  async function syntheticPack(x) {
    return db.closePackExport.create({ data: { organizationId: x.organizationId, periodId: x.periodId, closeRunId: x.closeRunId, fileType: 'json', watermarkId: 'SYNTHETIC-READ-NOT-CERTIFICATION-' + crypto.randomUUID(), contentHash: 'sha256:' + crypto.createHash('sha256').update(x.closeRunId).digest('hex'), rowCount: 0, isCertified: true, exportedById: x.actorId, metadata: { syntheticReadFixture: true, customerApproval: false } } });
  }
  async function pinnedRecovery() {
    const receiptFile = path.join(__dirname, 'cash-close-recovery-readonly-4e711acb-b190-418a-826a-f6e8400bf410.json');
    const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8')), expected = receipt.expected;
    assert.equal(expected.database, helper.database);
    const org = await db.organization.findUniqueOrThrow({ where: { id: expected.organizationId } });
    assert.ok(org.name.startsWith(helper.prefix)); assert.ok(!organizations.includes(org.id), 'Pinned fixture must remain outside all write scopes');
    const artifact = await db.closePackExport.findFirstOrThrow({ where: { id: expected.recoveredExportId, organizationId: org.id, closeRunId: expected.recoveredRunId } });
    assert.ok(artifact.exportedById); assert.equal(artifact.isCertified, true);
    const x = { organizationId: org.id, periodId: expected.periodId, closeRunId: expected.recoveredRunId, certifierId: artifact.exportedById };
    const { cashInput } = await inputs(x), skipCash = resolveTenantWideOperatingAuthority({ roleCodes: cashInput.actorRoleCodes }) && cashInput.actorPermissions.includes('dashboard.read') ? null : 'Pinned actor has no established Cash authority; snapshot and explicit/default dashboard only, no role mutation or inferred authority.';
    const before = await outside(), allRuns = await db.closeRun.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } });
    const result = await observe(x, 'certified', { latestId: x.closeRunId, explicitGrade: 'certified', noBlockers: true, skipCash });
    assert.equal(result.metrics.recentCloseRunCount, 1); assert.equal(result.metrics.certifiedCloseRunCount, 1);
    const old = await observe({ ...x, closeRunId: expected.oldRunId }, 'certified', { latestId: x.closeRunId, explicitGrade: 'blocked', noBlockers: true, skipCash });
    assert.deepEqual(await db.closeRun.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } }), allRuns);
    assert.equal((await outside()).hash, before.hash);
    return { readonly: true, organizationId: org.id, historicalReceipt: path.basename(receiptFile), historicalReceiptHash: crypto.createHash('sha256').update(fs.readFileSync(receiptFile)).digest('hex'),
      retainedRunCount: allRuns.length, beforeGrade: receipt.observations.aggregate.grade, result, oldExplicitProof: old, allRetainedRowsUnchanged: true };
  }
  const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: () => resolve() }; };
  async function snapshotRace() {
    const base = await syntheticFixture('race'), old = await syntheticRun(base, 'BLOCKED', 0), x = await syntheticRun(base, 'CERTIFIED', 1000), retained = await syntheticPack(x), { input } = await inputs(x);
    await db.closeRun.update({ where: { id: old.closeRunId }, data: { updatedAt: new Date(), metadata: { syntheticReadFixture: true, staleState: { status: 'EVIDENCE_STALE' } } } });
    const before = await observe(x, 'certified', { latestId: x.closeRunId, explicitGrade: 'certified', noBlockers: true });
    const boundary = deferred(), release = deferred(); let held = false, readerPid, writerPid, timer, read;
    const traced = db.$extends({ query: { $allModels: { $allOperations: async ({ model, operation, args, query }) => {
      const value = await query(args);
      if (!held && model === 'CloseRun' && operation === 'findMany' && args.where?.organizationId === x.organizationId) { held = true; boundary.resolve(); await release.promise; }
      return value;
    } } } });
    const writer = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 20000, maxWait: 10000 } });
    await assertDisposableDatabaseIdentity(writer, helper.database); await helper.withClient(f.target, helper.assertOwned);
    dbModule.db = new Proxy(traced, { get(target, key) { if (key !== '$transaction') return Reflect.get(target, key); return (work, options) => target.$transaction(async tx => {
      assert.equal(options.isolationLevel, 'RepeatableRead'); readerPid = (await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid'))[0].pid; return work(tx);
    }, options); } });
    try {
      read = snapshotApi.getCloseReadinessSnapshot(input); read.catch(() => {});
      await Promise.race([boundary.promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Actual snapshot read boundary not reached')), 15000); })]); clearTimeout(timer);
      await writer.$transaction(async tx => {
        writerPid = (await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid'))[0].pid;
        await packApi.recordCloseCertificationInvalidationsForSourceInTx(tx, x.organizationId, { sourceCode: 'INVENTORY_VALUATION_WRITE', closeRunId: x.closeRunId, closePackExportId: retained.id, sourceId: x.periodId, staleReason: 'Synthetic owned concurrent source revision', newEvidenceHash: 'sha256:' + f.hash(run) }, { actorId: x.actorId });
      });
      assert.notEqual(readerPid, writerPid); release.resolve(); const during = await read;
      assert.equal(during.evidenceGrade, 'certified'); assert.equal(during.blockers.length, 0); assert.equal(during.metrics.certifiedCloseRunCount, 1);
      dbModule.db = originalDb;
      const after = await observe(x, 'blocked', { latestId: x.closeRunId, explicitGrade: 'blocked', blocker: 'close-evidence-stale' });
      return { olderUpdatedRunId: old.closeRunId, currentRunId: x.closeRunId, before, readerPid, writerPid, isolation: 'RepeatableRead', boundary: 'after actual selected CloseRun read', observedOldCompleteSnapshot: true, nextRequest: after };
    } finally { clearTimeout(timer); release.resolve(); if (read) await read.catch(() => {}); dbModule.db = originalDb; await writer.$disconnect(); }
  }
  async function failedRead() {
    const base = await syntheticFixture('query-failure'), x = await syntheticRun(base, 'READY', 0), { input } = await inputs(x);
    const failing = db.$extends({ query: { closeRun: { findMany: async () => { throw new Error('Owned selected-run query fault'); } } } });
    dbModule.db = failing;
    try { await assert.rejects(snapshotApi.getCloseReadinessSnapshot(input), /Owned selected-run query fault/); }
    finally { dbModule.db = originalDb; }
    return { queryFailureRejected: true, faultInjectedOnlyAtQueryBoundary: true, retry: await observe(x, 'operational', { latestId: x.closeRunId, explicitGrade: 'operational' }) };
  }
  async function check(id, work) { const began = Date.now(); const result = await work(); report.checks.push({ id, status: 'passed', elapsedMs: Date.now() - began, ...result }); console.log(JSON.stringify({ id, status: 'passed' })); }
  async function main() {
    await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await outside(); report.financialBeforeSetup = await financial();
    await check('actual-zero-count-current-assessment-recovery', actualJourney);
    await check('pinned-recovered-fixture-now-recovers-readonly', pinnedRecovery);
    await check('real-two-connection-read-invalidation', snapshotRace);
    await check('failed-query-rejects-and-retries', failedRead);
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); report.stack = f.safe(error.stack || error); report.prerequisite = error.prerequisite; }
    finally {
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfter = await financial(); report.noOperationFinancialEffects = report.financialAfterSetup?.hash === report.financialAfter.hash; }
      catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.checks.length === 4 && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-current-recovery-runtime-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { d, f, db, helper, root, organizations, sources, outside, financial, prepareCashActor, inputs, observe, certify };
  if (require.main === module) runMain();
}
