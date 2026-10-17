// Read-only follow-up for one exact, previously verified local synthetic fixture.
// Authoring or syntax-checking this file does not connect to the database.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run after the parent releases the read-only database lane.');
} else {
  const f = require('./statement-recipient-fixtures.cjs');
  const { fs, path, crypto, assert, db, helper, root } = f;
  const fromRoot = file => require(path.join(root, file));
  const { getCloseReadinessSnapshot } = fromRoot('services/snapshots/close-readiness-snapshot.service.ts');
  const { getCloseAssuranceDashboard } = fromRoot('services/accounting/close-assurance.service.ts');
  const { assertDisposableDatabaseIdentity } = fromRoot('scripts/disposable-fixture-guard.js');
  const expected = {
    database: 'stoquify_local_registration_20260906_01',
    receiptSha256: '28588b41512a8fb9c10b867fdef125b3ea66d9981700b5e34f4ca1a07fc5c710',
    organizationId: 'workflow_close_write_denial-recovery_8da2e067-5bdc-47e1-bcb4-3bebea825880',
    periodId: 'cmuoutk62000amau0o507luhp',
    oldRunId: 'cmuoutn5j009cmau0zyjjd18d',
    recoveredRunId: 'cmuoutrym00bwmau09vdk4ovn',
    recoveredExportId: 'cmuoutslv00dmmau06m7i2ljr',
  };
  const predecessorPath = path.join(__dirname, 'close-denial-recovery-runtime-08a45f7e-01e5-4eb7-9b2e-34608f66c393.json');
  const stamp = crypto.randomUUID();
  const report = {
    run: stamp, at: new Date().toISOString(), checks: [],
    scope: 'Read-only service observations for one exact owned local synthetic fixture. No fixture creation, state repair, invalidation, certification, migration, delivery, or product edit. A passed receipt means the aggregate/selected-run discrepancy is reproduced, not that Cash has recovered.',
    expected,
  };
  const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const sourceFiles = [...new Set([__filename, predecessorPath, path.join(root, 'prisma/schema.prisma'),
    ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs|json)$/.test(file)),
  ])].sort();
  const sources = () => Object.fromEntries(sourceFiles.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha256(file)]));
  const financialModels = ['payment', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'supplierInvoice', 'supplierPayment', 'inventoryTransaction'];
  const scopedModels = [...financialModels, 'accountingPeriod', 'closeRun', 'closeChecklistItem', 'closeAssuranceFinding', 'closeEvidenceItem', 'closePackExport', 'ledgerAuditEvent', 'businessEvent', 'businessEventOutbox', 'businessEventAudit', 'stockCountSession'];
  async function fingerprint(models, where) {
    const rows = {};
    for (const model of models) {
      const values = await db[model].findMany({ ...(where ? { where } : {}), orderBy: { id: 'asc' } });
      rows[model] = { count: values.length, hash: f.hash(values) };
    }
    return { hash: f.hash(rows), models: rows };
  }
  async function main() {
    assert.equal(helper.database, expected.database);
    assert.equal(f.target.pathname.slice(1), expected.database);
    assert.ok(['127.0.0.1', 'localhost'].includes(f.target.hostname));
    assert.equal(sha256(predecessorPath), expected.receiptSha256);
    const previous = JSON.parse(fs.readFileSync(predecessorPath, 'utf8'));
    assert.equal(previous.passed, true);
    assert.deepEqual(previous.fixtureOrganizations, [expected.organizationId]);
    assert.equal(previous.fixture.periodId, expected.periodId);
    assert.equal(previous.selectedCloseRunId, expected.oldRunId);
    const recoveredEvidence = previous.checks.find(row => row.id === 'real-reassessment-and-certification-recovery');
    assert.equal(recoveredEvidence?.closeRunId, expected.recoveredRunId);
    assert.equal(recoveredEvidence.exportId, expected.recoveredExportId);
    await assertDisposableDatabaseIdentity(db, expected.database);
    await helper.withClient(f.target, helper.assertOwned);
    const organization = await db.organization.findFirstOrThrow({ where: { id: expected.organizationId }, select: { name: true } });
    assert.ok(organization.name.startsWith(helper.prefix));
    const scope = { organizationId: expected.organizationId };
    report.sourcesBefore = sources();
    report.scopedBefore = await fingerprint(scopedModels, scope);
    report.financialBefore = await fingerprint(financialModels);
    const period = await db.accountingPeriod.findFirstOrThrow({ where: { ...scope, id: expected.periodId } });
    const runs = await db.closeRun.findMany({ where: { ...scope, periodId: period.id }, orderBy: { id: 'asc' }, select: { id: true, status: true, voidedAt: true, metadata: true } });
    const prior = runs.find(row => row.id === expected.oldRunId), recovered = runs.find(row => row.id === expected.recoveredRunId);
    assert.equal(prior?.status, 'BLOCKED'); assert.equal(prior.voidedAt, null); assert.equal(prior.metadata?.staleState?.status, 'EVIDENCE_STALE');
    assert.equal(recovered?.status, 'CERTIFIED'); assert.equal(recovered.voidedAt, null);
    const artifact = await db.closePackExport.findFirstOrThrow({ where: { ...scope, closeRunId: expected.recoveredRunId, id: expected.recoveredExportId } });
    assert.equal(artifact.isCertified, true); assert.equal(artifact.contentHash, recoveredEvidence.contentHash);
    assert.notEqual(artifact.metadata?.staleState?.status, 'EVIDENCE_STALE');
    const selected = await getCloseAssuranceDashboard(expected.organizationId, period.id, expected.recoveredRunId);
    assert.equal(selected.run.id, expected.recoveredRunId); assert.equal(selected.currentProof?.grade, 'certified');
    const aggregate = await getCloseReadinessSnapshot({ organizationId: expected.organizationId, periodStart: period.startDate, periodEnd: period.endDate });
    assert.equal(aggregate.evidenceGrade, 'blocked');
    const blockerIds = aggregate.blockers.map(row => row.id);
    assert.ok(blockerIds.includes('close-runs-blocked')); assert.ok(blockerIds.includes('close-evidence-stale'));
    assert.ok(aggregate.metrics.blockedCloseRunCount >= 1); assert.ok(aggregate.metrics.certifiedCloseRunCount >= 1);
    report.observations = {
      period: { id: period.id, startDate: period.startDate, endDate: period.endDate },
      retainedRuns: runs.map(row => ({ id: row.id, status: row.status, voided: row.voidedAt !== null, stale: row.metadata?.staleState?.status === 'EVIDENCE_STALE' })),
      selected: { runId: selected.run.id, recordedStatus: selected.run.status, grade: selected.currentProof.grade, checkedAt: selected.currentProof.checkedAt, blockerIds: selected.currentProof.blockers.map(row => row.id) },
      aggregate: { status: aggregate.status, uiState: aggregate.uiState, grade: aggregate.evidenceGrade, sourceHash: aggregate.sourceHash, generatedAt: aggregate.generatedAt, metrics: aggregate.metrics, blockers: aggregate.blockers },
      explanation: 'The selected recovered run has current certified export proof. Cash close readiness includes all nonvoided runs overlapping this period. The preserved prior run contributes close-runs-blocked and close-evidence-stale; the weakest grade remains blocked. No supersession or historical-state change is performed here.',
      serviceReadLimit: 'Each service retains its own existing read transaction. Before/after fingerprints check stability of the observed records; this driver does not claim one common transaction across both service calls.',
    };
    report.checks.push({ id: 'recovered-selected-run-certified', status: 'passed' }, { id: 'cash-aggregate-remains-blocked-by-retained-history', status: 'passed' });
  }
  async function run() {
    try { await main(); } catch (error) { report.error = f.safe(error); }
    finally {
      try {
        report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
        if (report.scopedBefore && report.financialBefore) {
          report.scopedAfter = await fingerprint(scopedModels, { organizationId: expected.organizationId });
          report.financialAfter = await fingerprint(financialModels);
          report.scopedUnchanged = report.scopedBefore.hash === report.scopedAfter.hash;
          report.financialUnchanged = report.financialBefore.hash === report.financialAfter.hash;
        }
      } catch (error) { report.finalizationError = f.safe(error); }
      report.passed = !report.error && !report.finalizationError && report.checks.length === 2 && report.sourceStable && report.scopedUnchanged && report.financialUnchanged;
      const file = path.join(__dirname, 'cash-close-recovery-readonly-' + stamp + '.json');
      fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sourceStable: report.sourceStable, scopedUnchanged: report.scopedUnchanged, financialUnchanged: report.financialUnchanged, selectedGrade: report.observations?.selected.grade, aggregateGrade: report.observations?.aggregate.grade }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  if (require.main === module) run();
}
