"use strict";
if (require.main === module && process.argv[2] !== '--run') { console.log('Inert; --run exercises newly owned local fixtures only.'); process.exit(0); }
const h = require('./sign-close-fixtures.cjs'), { p, f, db, root, certification } = h, { fs, path, crypto, assert } = f;
const { AsyncLocalStorage } = require('node:async_hooks'), context = new AsyncLocalStorage();
const dbModule = require(path.join(root, 'prisma/db.ts')), originalDb = dbModule.db;
const report = { at: new Date().toISOString(), checks: [], scope: 'Reproduce actual signing/Close publication and organization-wide collector scope on owned synthetic fixtures; no product edits or fabricated signatures/Close states.' };
const sources = () => ({ ...h.sources(), [path.relative(root, __filename).replaceAll('\\', '/')]: p.sha(fs.readFileSync(__filename)) });
function latch() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
async function bounded(promise, label) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label + ' timed out')), 30000); })]); } finally { clearTimeout(timer); } }
const observe = promise => promise.then(value => ({ value }), error => ({ error: p.safeError(error) }));
async function reproduce(label, snapshotFirst) {
  const x = await h.fixture(label);
  if (!snapshotFirst) {
    const { createFiscalYearWithPeriods } = require(path.join(root, 'services/accounting/periods.service.ts'));
    await createFiscalYearWithPeriods(x.organizationId, { name: 'Owned prior-year scope', startDate: new Date('2025-01-01T00:00:00Z'), endDate: new Date('2025-01-31T23:59:59.999Z') }, x.actorId);
    x.periodId = (await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, endDate: { lt: new Date('2026-01-01') } }, orderBy: { startDate: 'asc' } })).id;
  }
  const financialBefore = f.hash(await p.rows(x, p.economicModels)), entered = latch(), releaseSign = latch(), collected = latch(), releaseClose = latch();
  let signPending, closePending, publication, readyRead, held = false;
  dbModule.db = new Proxy(db, { get(target, key) {
    if (key !== '$transaction') { const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; }
    return async (work, options) => {
      const lane = context.getStore();
      if (lane === 'close') {
        return target.$transaction(tx => work(new Proxy(tx, { get(inner, name) {
          if (name === 'closeRun') return new Proxy(inner.closeRun, { get(model, method) {
            if (method === 'create') return async args => { const value = await model.create(args); if (args.data.status === 'RUNNING') publication = value; return value; };
            if (method === 'updateMany') return async args => { if (publication && args.where.id === publication.id && args.where.status === 'RUNNING') { collected.resolve(); await bounded(releaseClose.promise, 'Close finalization release'); } return model.updateMany(args); };
            return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
          } });
          const value = inner[name]; return typeof value === 'function' ? value.bind(inner) : value;
        } })), { ...options, timeout: 45000 });
      }
      if (lane !== 'sign' || !snapshotFirst) return target.$transaction(work, options);
      return target.$transaction(tx => work(new Proxy(tx, { get(inner, name) {
        if (name === 'reconciliationRun') return new Proxy(inner.reconciliationRun, { get(model, method) {
          if (method !== 'findFirst') return typeof model[method] === 'function' ? model[method].bind(model) : model[method];
          return async args => { const value = await model.findFirst(args); if (!held && args.include?.providerAccount) { held = true; assert.equal(value.status, 'READY_FOR_SIGNOFF'); readyRead = value.id; entered.resolve(); await bounded(releaseSign.promise, 'Signing snapshot release'); } return value; };
        } });
        const value = inner[name]; return typeof value === 'function' ? value.bind(inner) : value;
      } })), { ...options, timeout: 45000 });
    };
  } });
  try {
    if (snapshotFirst) { signPending = observe(context.run('sign', () => certification.signReconciliationRun(h.command(x)))); await bounded(entered.promise, 'Actual Serializable source read'); }
    closePending = observe(context.run('close', () => p.assessment(x, label, false))); await bounded(collected.promise, 'Actual collected unsigned evidence');
    assert.ok(publication?.id); assert.equal((await db.closeRun.findUniqueOrThrow({ where: { id: publication.id } })).status, 'RUNNING');
    if (snapshotFirst) releaseSign.resolve(); else signPending = observe(context.run('sign', () => certification.signReconciliationRun(h.command(x))));
    const signed = await bounded(signPending, 'Actual signature commit'); assert.ok(signed.value, JSON.stringify(signed));
    const afterSign = await db.closeRun.findUniqueOrThrow({ where: { id: publication.id } });
    assert.equal(afterSign.status, 'RUNNING'); assert.equal(afterSign.metadata?.staleState, undefined, 'Expected predecessor invalidation gap was not reproduced');
    releaseClose.resolve(); const completed = await bounded(closePending, 'Actual Close finalization'); assert.ok(completed.value, JSON.stringify(completed));
    const row = await db.closeRun.findUniqueOrThrow({ where: { id: publication.id } }), evidence = await db.closeEvidenceItem.findFirstOrThrow({ where: { closeRunId: row.id, organizationId: x.organizationId, sourceType: 'ReconciliationRun', sourceId: x.reconciliationRunId } });
    assert.equal(evidence.sourceHash, null); assert.ok(evidence.sourceLabel.includes('READY_FOR_SIGNOFF')); assert.equal(row.metadata?.staleState, undefined);
    const retainedSigned = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.reconciliationRunId } }); assert.equal(retainedSigned.status, 'SIGNED'); assert.equal(retainedSigned.certificateHash, signed.value.certificateHash);
    assert.equal(f.hash(await p.rows(x, p.economicModels)), financialBefore);
    return { organizationId: x.organizationId, closeRunId: row.id, periodId: x.periodId, signingPeriodId: retainedSigned.accountingPeriodId, snapshotReadRunId: readyRead, status: row.status, staleStateAbsent: true, retainedEvidence: { sourceId: evidence.sourceId, sourceHash: evidence.sourceHash, sourceLabel: evidence.sourceLabel }, actualCertificateHash: retainedSigned.certificateHash, financialUnchanged: true, reproduced: true };
  } finally { releaseSign.resolve(); releaseClose.resolve(); await Promise.allSettled([signPending, closePending].filter(Boolean)); dbModule.db = originalDb; }
}
async function main() {
  await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await h.outside();
  for (const [name, snapshotFirst] of [['snapshot-before-publication', true], ['earlier-period-organization-wide-evidence', false]]) {
    const row = { name }, start = Date.now(); report.checks.push(row);
    try { row.result = await reproduce(name === 'snapshot-before-publication' ? 'snap' : 'old', snapshotFirst); row.passed = true; } catch (error) { row.passed = false; row.error = p.safeError(error); }
    row.elapsedMs = Date.now() - start; console.log(JSON.stringify({ name, passed: row.passed, error: row.error }));
  }
}
if (require.main === module) main().catch(error => { report.error = p.safeError(error); }).finally(async () => {
  dbModule.db = originalDb;
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await h.outside(); report.outsideUnchanged = f.hash(report.outsideBefore) === f.hash(report.outsideAfter); } catch (error) { report.finalizationError = p.safeError(error); }
  await db.$disconnect(); report.passed = !report.error && !report.finalizationError && report.checks.length === 2 && report.checks.every(row => row.passed) && report.sourceStable && report.outsideUnchanged;
  const file = path.join(__dirname, 'sign-close-baseline-' + crypto.randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.map(({ name, passed }) => ({ name, passed })), sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); process.exit(report.passed ? 0 : 1);
});
