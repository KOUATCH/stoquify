// Bounded owned-local read verification. Retained historical states below are
// deliberately synthetic test fixtures; they are not genuine certification.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run after coordinated source freeze.');
} else {
  const f = require('./statement-recipient-fixtures.cjs');
  const { db, fs, path, crypto, assert, root, helper } = f;
  const { PrismaClient } = require('@prisma/client');
  const fromRoot = file => require(path.join(root, file));
  const { assertDisposableDatabaseIdentity } = fromRoot('scripts/disposable-fixture-guard.js');
  const snapshotApi = fromRoot('services/snapshots/close-readiness-snapshot.service.ts');
  const { getCashCommandData } = fromRoot('services/cash-command/cash-command.service.ts');
  const { getProofTrail } = fromRoot('services/evidence/proof-trail.service.ts');
  const { presentCashCommand } = fromRoot('services/cash-command/cash-command-presentation.ts');
  const invalidation = fromRoot('services/accounting/close-assurance-pack.service.ts');
  const dbModule = fromRoot('prisma/db.ts'), originalDb = dbModule.db;
  const run = crypto.randomUUID(), organizations = [], now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1);
  const report = { run, at: now.toISOString(), checks: [], scope: 'Owned isolated localhost database, new synthetic close-history records only. Actual close snapshot, Cash trust projection, proof reader and invalidation service. Historical isCertified rows are adversarial/read-contract fixtures, never professional or release certification. No migration, seeds, financial posting, payments, messages or export delivery.' };
  const files = [
    'services/snapshots/close-readiness-snapshot.service.ts', 'services/snapshots/snapshot-contracts.ts', 'services/snapshots/snapshot-utils.ts',
    'services/cash-command/cash-command.service.ts', 'services/cash-command/cash-command-sources.service.ts',
    'services/cash-command/cash-command-visibility.service.ts', 'services/cash-command/cash-command-presentation.ts',
    'services/evidence/proof-trail.service.ts', 'services/evidence/evidence-grade.service.ts',
    'services/accounting/close-assurance-pack.service.ts', 'services/modules/module-access-batch.service.ts',
    'services/modules/module-entitlement.service.ts', 'prisma/schema.prisma',
    'scripts/disposable-fixture-guard.js',
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/registration-local.cjs',
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/statement-recipient-fixtures.cjs',
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/close-readiness-runtime.cjs',
  ];
  const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
  const financialModels = ['payment', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'supplierInvoice', 'supplierPayment', 'inventoryTransaction'];
  const closeModels = ['closeRun', 'closeChecklistItem', 'closeAssuranceFinding', 'closeEvidenceItem', 'closePackExport', 'accountingPeriod', 'fiscalYear'];
  async function outside() {
    const where = { organizationId: { notIn: organizations } };
    return f.hash(await Promise.all([...financialModels, ...closeModels, 'tenantModuleConfiguration', 'tenantModuleGrant', 'role', 'user', 'businessEvent', 'ledgerAuditEvent'].map(model => db[model].findMany({ where, orderBy: model === 'tenantModuleConfiguration' ? { organizationId: 'asc' } : { id: 'asc' } }))));
  }
  async function financial() { return f.hash(await Promise.all(financialModels.map(model => db[model].findMany({ orderBy: { id: 'asc' } })))); }
  async function fixture(name, status = 'READY') {
    const id = 'workflow_close_read_' + run + '_' + name; organizations.push(id);
    await db.organization.create({ data: { id, name: helper.prefix + 'Close read ' + name + ' ' + run, slug: 'close-read-' + name + '-' + run, currency: 'XAF' } });
    const actor = await db.user.create({ data: { organizationId: id, email: name + '-' + run + '@example.invalid', isActive: true, isVerified: true } });
    const permissions = ['dashboard.read', 'accounting.close.read'];
    await db.role.create({ data: { organizationId: id, code: 'administrator', nameEn: 'Owned close-read observer', permissions, users: { connect: { id: actor.id } } } });
    const slugs = [...fromRoot('services/modules/module-control-contracts.ts').COMMERCIAL_MODULE_SLUGS];
    await db.tenantModuleConfiguration.create({ data: { organizationId: id, manifestHash: 'owned-close-read-' + run, selectedModules: slugs, activeModules: slugs } });
    await db.tenantModuleGrant.createMany({ data: slugs.map(moduleSlug => ({ organizationId: id, moduleSlug, status: 'active', source: 'requested_modules' })) });
    const year = await db.fiscalYear.create({ data: { organizationId: id, name: 'Owned read year', startDate, endDate } });
    const period = await db.accountingPeriod.create({ data: { organizationId: id, fiscalYearId: year.id, name: 'Owned read period', periodNumber: 1, startDate, endDate } });
    const close = await db.closeRun.create({ data: { organizationId: id, periodId: period.id, status, readinessScore: 100, runById: actor.id, metadata: { syntheticReadFixture: true, professionalCertification: false } } });
    return { organizationId: id, actorId: actor.id, periodId: period.id, yearId: year.id, closeRunId: close.id,
      input: { organizationId: id, periodStart: startDate, periodEnd: endDate, now },
      cashInput: { organizationId: id, actorId: actor.id, actorPermissions: permissions, actorRoleCodes: ['administrator'], periodStart: startDate, periodEnd: endDate, now } };
  }
  async function pack(x) {
    return db.closePackExport.create({ data: { organizationId: x.organizationId, periodId: x.periodId, closeRunId: x.closeRunId, fileType: 'json', watermarkId: 'SYNTHETIC-NOT-CERTIFICATION-' + crypto.randomUUID(), contentHash: 'sha256:' + crypto.createHash('sha256').update(run + x.closeRunId).digest('hex'), rowCount: 0, isCertified: true, exportedById: x.actorId, metadata: { syntheticReadFixture: true, professionalCertification: false } } });
  }
  async function proof(x) { return getProofTrail({ organizationId: x.organizationId, subjectType: 'close.run', subjectId: x.closeRunId }, db); }
  async function agreement(x, grade, tone) {
    const before = await financial(), snapshot = await snapshotApi.getCloseReadinessSnapshot(x.input), evidence = await proof(x), cash = await getCashCommandData(x.cashInput);
    const trust = cash.trustSignals.find(item => item.id === 'close_readiness'); assert.ok(trust);
    assert.equal(snapshot.evidenceGrade, grade); assert.equal(evidence.evidenceGrade, grade); assert.equal(trust.evidenceGrade, grade); assert.equal(trust.tone, tone);
    if (grade === 'blocked') {
      assert.equal(snapshot.metrics.certifiedCloseRunCount, 0); assert.ok(snapshot.blockers.length > 0);
      assert.equal(trust.value, 'Review required'); assert.equal(presentCashCommand(cash, 'fr').trustSignals.find(item => item.id === 'close_readiness').value, 'Examen requis');
    }
    assert.equal(await financial(), before);
    return { snapshotGrade: snapshot.evidenceGrade, metrics: snapshot.metrics, blockers: snapshot.blockers.map(row => row.id), proofGrade: evidence.evidenceGrade, proofBlockers: evidence.blockers.map(row => row.id), trust: { value: trust.value, tone: trust.tone, evidenceGrade: trust.evidenceGrade }, sourceHash: snapshot.sourceHash };
  }
  async function check(id, work) {
    const began = Date.now();
    try { report.checks.push({ id, status: 'passed', ...await work(), elapsedMs: Date.now() - began }); }
    catch (error) { report.checks.push({ id, status: 'failed', error: f.safe(error), stack: f.safe(error.stack || error), elapsedMs: Date.now() - began }); }
    console.log(JSON.stringify(report.checks.at(-1)));
  }
  function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: () => resolve() }; }
  async function race(x, retainedPack) {
    const boundary = deferred(), release = deferred(); let held = false;
    const traced = db.$extends({ query: { $allModels: { $allOperations: async ({ model, operation, args, query }) => {
      const result = await query(args);
      if (!held && model === 'CloseRun' && operation === 'findMany' && args.where?.organizationId === x.organizationId) {
        held = true; boundary.resolve(); await release.promise;
      }
      return result;
    } } } });
    const writer = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 20000, maxWait: 10000 } });
    await assertDisposableDatabaseIdentity(writer, helper.database); await helper.withClient(f.target, helper.assertOwned);
    let readerBackendPid;
    dbModule.db = new Proxy(traced, { get(target, property) {
      if (property !== '$transaction') return Reflect.get(target, property);
      return (work, options) => typeof work !== 'function' ? target.$transaction(work, options) : target.$transaction(async tx => {
        const connection = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database');
        assert.equal(connection[0].database, helper.database); readerBackendPid = connection[0].pid;
        return work(tx);
      }, options);
    } });
    let read, timer, mutation;
    try {
      read = snapshotApi.getCloseReadinessSnapshot(x.input);
      await Promise.race([boundary.promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('CloseRun.findMany read boundary was not reached; race was not executed')), 15000); })]);
      clearTimeout(timer);
      mutation = await writer.$transaction(async tx => {
        const connection = await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid, current_database() AS database');
        assert.equal(connection[0].database, helper.database);
        const result = await invalidation.recordCloseCertificationInvalidationsForSourceInTx(tx, x.organizationId, {
          sourceCode: 'INVENTORY_VALUATION_ANNEX', closeRunId: x.closeRunId, closePackExportId: retainedPack.id, sourceId: x.periodId,
          staleReason: 'Owned concurrent evidence revision', previousEvidenceHash: retainedPack.contentHash,
          newEvidenceHash: 'sha256:' + crypto.createHash('sha256').update(run + 'concurrent-source').digest('hex'),
        }, { actorId: x.actorId });
        assert.equal(result.invalidatedCount, 1);
        return { backendPid: connection[0].pid, ...result };
      });
      assert.ok(readerBackendPid); assert.notEqual(readerBackendPid, mutation.backendPid, 'The writer must commit on another PostgreSQL connection');
      // The committed writer is independent from the paused real reader. No
      // source result or evidence is stubbed; only delivery timing is held.
      release.resolve(); const during = await read;
      const oldComplete = during.evidenceGrade === 'certified' && during.metrics.certifiedCloseRunCount === 1 && during.metrics.blockedCloseRunCount === 0 && during.blockers.length === 0;
      const newComplete = during.evidenceGrade === 'blocked' && during.metrics.certifiedCloseRunCount === 0 && during.metrics.blockedCloseRunCount >= 1 && during.blockers.length > 0;
      assert.ok(oldComplete || newComplete, 'The concurrent snapshot must describe one complete evidence state, never a mixed certified/invalidated state');
      dbModule.db = originalDb;
      const after = await agreement(x, 'blocked', 'danger');
      return { readerBackendPid, readerBoundary: 'after actual CloseRun.findMany query before delivering its rows', writer: mutation, coherentObservedState: oldComplete ? 'complete-pre-invalidation' : 'complete-post-invalidation', during: { evidenceGrade: during.evidenceGrade, metrics: during.metrics, blockers: during.blockers.map(row => row.id) }, after };
    } finally {
      clearTimeout(timer); release.resolve(); if (read) await read.catch(() => {}); dbModule.db = originalDb; await writer.$disconnect();
    }
  }
  async function main() {
    await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await outside(); report.financialBefore = await financial();
    await check('missing-certified-export', async () => { const x = await fixture('orphan', 'CERTIFIED'); return { organizationId: x.organizationId, closeRunId: x.closeRunId, ...await agreement(x, 'blocked', 'danger') }; });
    await check('retained-export-and-real-invalidation-race', async () => {
      const x = await fixture('race', 'EXPORTED'), retained = await pack(x), before = await agreement(x, 'certified', 'success');
      const observed = await race(x, retained);
      const after = await db.closePackExport.findUniqueOrThrow({ where: { id: retained.id } });
      assert.equal(after.contentHash, retained.contentHash); assert.equal(after.isCertified, true); assert.equal(after.metadata.staleState.status, 'EVIDENCE_STALE');
      return { organizationId: x.organizationId, closeRunId: x.closeRunId, exportId: retained.id, historicalExportRetained: true, before, ...observed };
    });
    await check('unavailable-checklist', async () => {
      const x = await fixture('checklist');
      await db.closeChecklistItem.create({ data: { organizationId: x.organizationId, periodId: x.periodId, closeRunId: x.closeRunId, key: 'owned-unavailable', domain: 'LEDGER', status: 'UNAVAILABLE', severity: 'HIGH', label: 'Owned unavailable control', detail: 'Synthetic read fixture', sourceService: 'owned-verifier' } });
      return { organizationId: x.organizationId, closeRunId: x.closeRunId, ...await agreement(x, 'blocked', 'danger') };
    });
    await check('unavailable-evidence', async () => {
      const x = await fixture('evidence', 'EXPORTED'); await pack(x);
      await db.closeEvidenceItem.create({ data: { organizationId: x.organizationId, periodId: x.periodId, closeRunId: x.closeRunId, evidenceType: 'REPORT_EXPORT', sourceLabel: 'Owned unavailable evidence', available: false, unavailableReason: 'Synthetic missing source' } });
      return { organizationId: x.organizationId, closeRunId: x.closeRunId, ...await agreement(x, 'blocked', 'danger') };
    });
    await check('individually-stale-certified-export', async () => {
      const x = await fixture('stale-export', 'CERTIFIED'), retained = await pack(x);
      // Deliberately inconsistent historical fixture: artifact invalidation was
      // retained while the run's old status was not changed. No real approval.
      await db.closePackExport.update({ where: { id: retained.id }, data: { metadata: { syntheticReadFixture: true, professionalCertification: false, staleState: { status: 'EVIDENCE_STALE', staleReason: 'Owned retained export-only invalidation' } } } });
      const result = await agreement(x, 'blocked', 'danger');
      const artifact = await db.closePackExport.findUniqueOrThrow({ where: { id: retained.id } });
      assert.equal(artifact.isCertified, true); assert.equal(artifact.contentHash, retained.contentHash);
      await db.closeRun.update({ where: { id: x.closeRunId }, data: { status: 'EXPORTED' } });
      const exportedOnly = await agreement(x, 'operational', 'info'); assert.equal(exportedOnly.metrics.certifiedCloseRunCount, 0);
      return { organizationId: x.organizationId, closeRunId: x.closeRunId, exportId: retained.id, retainedHistoricalArtifactUnchanged: true, certifiedStatusResult: result, exportedStatusResult: exportedOnly };
    });
    await check('scope-exclusions-and-operational-tone', async () => {
      const x = await fixture('scope'), clean = await agreement(x, 'operational', 'info');
      const foreign = await fixture('foreign', 'CERTIFIED');
      await db.closeRun.create({ data: { organizationId: x.organizationId, periodId: x.periodId, status: 'VOIDED', voidedAt: new Date(), readinessScore: 0 } });
      const oldStart = new Date('2020-01-01T00:00:00Z'), oldEnd = new Date('2020-01-31T23:59:59.999Z');
      const year = await db.fiscalYear.create({ data: { organizationId: x.organizationId, name: 'Owned out-of-range year', startDate: oldStart, endDate: oldEnd } });
      const period = await db.accountingPeriod.create({ data: { organizationId: x.organizationId, fiscalYearId: year.id, name: 'Owned out-of-range period', periodNumber: 1, startDate: oldStart, endDate: oldEnd } });
      const old = await db.closeRun.create({ data: { organizationId: x.organizationId, periodId: period.id, status: 'CERTIFIED', readinessScore: 0 } });
      const after = await agreement(x, 'operational', 'info'); assert.equal(after.metrics.recentCloseRunCount, 1); assert.equal(after.metrics.unavailableEvidenceCount, 0); assert.deepEqual(after.metrics, clean.metrics);
      await assert.rejects(() => getProofTrail({ organizationId: x.organizationId, subjectType: 'close.run', subjectId: foreign.closeRunId }, db), error => error.code === 'NOT_FOUND');
      // Existing tenant-wide unavailable evidence remains an obligation even
      // when its run is outside the selected period. A narrower selected-run
      // proof can remain operational while the aggregate truth is blocked.
      await db.closeEvidenceItem.create({ data: { organizationId: x.organizationId, periodId: period.id, closeRunId: old.id, evidenceType: 'REPORT_EXPORT', sourceLabel: 'Owned out-of-range unavailable evidence', available: false } });
      const aggregate = await snapshotApi.getCloseReadinessSnapshot(x.input), selectedProof = await proof(x), cash = await getCashCommandData(x.cashInput);
      const trust = cash.trustSignals.find(row => row.id === 'close_readiness'); assert.ok(trust);
      assert.equal(aggregate.metrics.recentCloseRunCount, 1); assert.equal(aggregate.metrics.unavailableEvidenceCount, 1); assert.equal(aggregate.metrics.certifiedCloseRunCount, 0);
      assert.equal(aggregate.evidenceGrade, 'blocked'); assert.equal(selectedProof.evidenceGrade, 'operational');
      assert.equal(trust.evidenceGrade, 'blocked'); assert.equal(trust.value, 'Review required'); assert.equal(trust.tone, 'danger');
      return { organizationId: x.organizationId, closeRunId: x.closeRunId, foreignCloseRunId: foreign.closeRunId, outOfRangeCloseRunId: old.id, cleanScopedResult: after,
        tenantWideObligation: { selectedRunProofGrade: selectedProof.evidenceGrade, aggregateGrade: aggregate.evidenceGrade, metrics: aggregate.metrics, blockerIds: aggregate.blockers.map(row => row.id), trustValue: trust.value, preservedBroaderScope: true } };
    });
    await check('failed-query-is-not-empty-success', async () => {
      const x = await fixture('query-failure'); let failedReads = 0;
      dbModule.db = db.$extends({ query: { $allModels: { $allOperations: async ({ model, operation, args, query }) => {
        if (model === 'CloseRun' && operation === 'findMany' && args.where?.organizationId === x.organizationId) { failedReads++; throw new Error('Owned controlled close evidence read failure'); }
        return query(args);
      } } } });
      try { await assert.rejects(() => snapshotApi.getCloseReadinessSnapshot(x.input), /Owned controlled close evidence read failure/); assert.ok(failedReads > 0); }
      finally { dbModule.db = originalDb; }
      return { organizationId: x.organizationId, failedReads, propagatedFailure: true, retry: await agreement(x, 'operational', 'info') };
    });
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); }
    finally {
      dbModule.db = originalDb;
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore === report.outsideAfter; report.financialAfter = await financial(); report.noFinancialWrites = report.financialBefore === report.financialAfter; }
      catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...organizations]; report.passed = !report.error && !report.finalizationError && report.checks.length === 7 && report.checks.every(row => row.status === 'passed') && report.sourceStable && report.outsideUnchanged && report.noFinancialWrites;
      const file = path.join(__dirname, 'close-readiness-runtime-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noFinancialWrites: report.noFinancialWrites }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { f, db, helper, root, organizations, sources, outside, financial, fixture, pack, proof, agreement, snapshotApi, getCashCommandData, invalidation };
  if (require.main === module) runMain();
}
