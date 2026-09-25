const f = require('./exception-link-repair-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getReconciliationRunDetail } = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const run = crypto.randomUUID().slice(0, 12), organizations = [], sourceFile = 'services/reconciliation/payment-reconciliation-certification.service.ts';
const sourceHash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, sourceFile))).digest('hex');
const tables = ['reconciliationRun', 'paymentException', 'suspenseItem', 'matchRecord', 'paymentReconciliationInboxItem', 'ledgerAuditEvent'];
const snapshot = async where => f.hash(await Promise.all(tables.map(n => db[n].findMany({ where, orderBy: { id: 'asc' } }))));
const finance = async () => f.hash(await Promise.all(['journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink'].map(n => db[n].findMany({ orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), sourceFile, sourceBefore: sourceHash(), checks: [], scope: 'Owned synthetic run-detail read verification. Terminal fixture labels only reproduce the >100-row sampling defect; no genuine resolution, sign-off or approval is claimed.' };
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned);
  report.originalBefore = await snapshot({ organizationId: { notIn: organizations } });
  const x = await f.fixture('run-detail-' + run, organizations), foreign = await f.fixture('run-detail-foreign-' + run, organizations);
  const common = { organizationId: x.organizationId, providerAccountId: x.provider.id, reconciliationRunId: x.runId };
  await db.paymentException.createMany({ data: Array.from({ length: 100 }, (_, i) => ({ ...common, id: 'owned-detail-exception-' + run + '-' + i, type: 'OTHER', severity: 'CRITICAL', status: 'RESOLVED', createdAt: new Date(0), evidence: { synthetic: true } })) });
  await db.suspenseItem.createMany({ data: Array.from({ length: 100 }, (_, i) => ({ ...common, id: 'owned-detail-suspense-' + run + '-' + i, type: 'UNKNOWN_CREDIT', severity: 'CRITICAL', status: 'RESOLVED', amount: '1', createdAt: new Date(0), evidence: { synthetic: true } })) });
  await db.matchRecord.createMany({ data: Array.from({ length: 145 }, (_, i) => ({ ...common, id: 'owned-detail-match-' + run + '-' + i, rule: 'MANUAL', status: 'CANDIDATE', metadata: { synthetic: true } })) });
  const emptyRun = await db.reconciliationRun.create({ data: { organizationId: x.organizationId, providerAccountId: x.provider.id, paymentRailId: x.provider.paymentRailId,
    businessDate: new Date('2025-01-01T00:00:00Z'), periodStart: new Date('2025-01-01T00:00:00Z'), periodEnd: new Date('2025-01-02T00:00:00Z'), metadata: { synthetic: true } } });
  report.financialBefore = await finance(); const beforeReads = await snapshot({ organizationId: { in: organizations } });
  const start = Date.now(), detail = await getReconciliationRunDetail(x.organizationId, x.runId); report.readMs = Date.now() - start;
  assert.equal(detail.evidence.matchRecordCount, 145); assert.equal(detail.evidence.openExceptionCount, 1); assert.equal(detail.evidence.openSuspenseCount, 1);
  assert.equal(detail.exceptions.length, 100); assert.ok(detail.exceptions.every(e => e.status === 'RESOLVED'));
  assert.equal(detail.suspenseItems.length, 100); assert.ok(detail.suspenseItems.every(e => e.status === 'RESOLVED'));
  assert.deepEqual(detail.recordCoverage.exceptions, { returned: 100, total: 101, truncated: true });
  assert.deepEqual(detail.recordCoverage.suspenseItems, { returned: 100, total: 101, truncated: true });
  assert.deepEqual(detail.recordCoverage.matchRecords, { returned: 100, total: 145, truncated: true });
  report.checks.push('Unresolved exceptions/suspense beyond 100 resolved sample rows remain counted; matches total 145.');
  const empty = await getReconciliationRunDetail(x.organizationId, emptyRun.id);
  assert.equal(empty.evidence.openExceptionCount, 0); assert.deepEqual(empty.recordCoverage.exceptions, { returned: 0, total: 0, truncated: false });
  await assert.rejects(() => getReconciliationRunDetail(foreign.organizationId, x.runId), e => e.code === 'NOT_FOUND');
  assert.equal((await getReconciliationRunDetail(foreign.organizationId, foreign.runId)).recordCoverage.exceptions.total, 1);
  assert.equal(beforeReads, await snapshot({ organizationId: { in: organizations } })); report.checks.push('Empty, foreign-run refusal and own-tenant reads have no persisted side effects.');
  const transaction = db.$transaction.bind(db); let inserted = false;
  db.$transaction = (work, options) => transaction(tx => work(new Proxy(tx, { get(target, property) {
    if (property === 'paymentException') return new Proxy(target.paymentException, { get(model, method) {
      if (method === 'findMany') return async args => { if (!inserted) { inserted = true; await db.paymentException.create({ data: { ...common, type: 'OTHER', status: 'OPEN', evidence: { synthetic: true, concurrentInsertion: true } } }); } return model.findMany(args); };
      return model[method];
    } }); return target[property];
  } })), options);
  try { const concurrent = await getReconciliationRunDetail(x.organizationId, x.runId); assert.equal(concurrent.recordCoverage.exceptions.total, 101); assert.equal(concurrent.evidence.openExceptionCount, 1); }
  finally { db.$transaction = transaction; }
  assert.ok(inserted); const refreshed = await getReconciliationRunDetail(x.organizationId, x.runId); assert.equal(refreshed.recordCoverage.exceptions.total, 102); assert.equal(refreshed.evidence.openExceptionCount, 2);
  report.checks.push('A real second-connection insert during detail loading appears only on the next snapshot.');
  const beforeFailure = await snapshot({ organizationId: { in: organizations } });
  db.$transaction = (work, options) => transaction(tx => work(new Proxy(tx, { get(target, property) { if (property === 'paymentException') return new Proxy(target.paymentException, { get(model, method) { if (method === 'count') return () => { throw new Error('OWNED_COUNT_FAILURE'); }; return model[method]; } }); return target[property]; } })), options);
  try { await assert.rejects(() => getReconciliationRunDetail(x.organizationId, x.runId), /OWNED_COUNT_FAILURE/); } finally { db.$transaction = transaction; }
  assert.equal(beforeFailure, await snapshot({ organizationId: { in: organizations } })); report.checks.push('Count failure propagates without a false zero result or mutation.');
})().catch(error => { report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 5); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await snapshot({ organizationId: { notIn: organizations } }); report.financialUnchanged = report.financialBefore === await finance();
  report.sourceAfter = sourceHash(); report.sourceStable = report.sourceBefore === report.sourceAfter; await db.$disconnect();
  const file = 'run-detail-v110-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, checks: report.checks, readMs: report.readMs, error: report.error, originalUnchanged: report.originalUnchanged, financialUnchanged: report.financialUnchanged, sourceStable: report.sourceStable }));
  process.exit(!report.error && report.checks.length === 4 && report.originalUnchanged && report.financialUnchanged && report.sourceStable ? 0 : 1);
});
