'use strict';
if (!['--baseline', '--acceptance'].includes(process.argv[2])) { console.log('Inert; explicit owned database mode required.'); process.exit(0); }
const acceptance = process.argv[2] === '--acceptance';
const h = require('./sign-close-fixtures.cjs'), { p, f, db, root } = h, { fs, path, crypto, assert } = f;
const fixtures = require('./suspense-posting-close-fixtures.cjs');
const posting = require(path.join(root, 'services/reconciliation/payment-suspense-workflow.service.ts'));
const correction = require(path.join(root, 'services/reconciliation/payment-suspense-correction.service.ts'));
const { AsyncLocalStorage } = require('node:async_hooks'), lane = new AsyncLocalStorage();
const dbModule = require(path.join(root, 'prisma/db.ts')), originalDb = dbModule.db;
const report = { at: new Date().toISOString(), acceptance, checks: [] };
const sources = () => Object.fromEntries(Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file)).map(file => [path.relative(root, file).split(path.sep).join('/'), p.sha(fs.readFileSync(file))]));
function latch() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: () => resolve() }; }
async function bounded(work) { let timer; try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Owned correction lock barrier timed out')), 20000); })]); } finally { clearTimeout(timer); } }
const observe = work => work.then(value => ({ value }), error => ({ error: p.safeError(error) }));
async function main() {
  await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await h.outside();
  const x = await fixtures.fixture('lock-' + crypto.randomUUID().slice(0, 8), h.organizations), context = fixtures.context;
  await posting.approveSuspensePosting({ ...x.command, control: context(x, x.checkerId) });
  const approver = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned independent reversal reviewer', email: crypto.randomUUID() + '@example.invalid', isActive: true, isVerified: true, emailVerified: true } });
  const draft = { suspenseItemId: x.itemId, reversalDate: new Date().toISOString().slice(0, 10), reason: 'Owned lock ordering reproduction' };
  const preview = await correction.previewSuspenseCorrection(draft, context(x));
  const proposed = await correction.proposeSuspenseCorrection({ ...draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, context(x));
  const reviewed = await correction.reviewSuspenseCorrection(x.itemId, proposed.proposalId, context(x, approver.id));
  const command = { suspenseItemId: x.itemId, proposalId: proposed.proposalId, expectedRevision: reviewed.revision, decision: 'APPROVE', reason: 'Owned independent correction decision' };
  const sourceHeld = latch(), assessmentHeld = latch(), releaseCorrection = latch(), replaySourceAttempt = latch();
  let correctionWork, replayWork, replayAssessmentLocks = 0; const rawErrors = [], pids = {};
  dbModule.db = new Proxy(db, { get(target, key) {
    if (key !== '$transaction') return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
    return (work, options) => target.$transaction(tx => work(new Proxy(tx, { get(inner, key) {
      if (key === '$queryRaw') return async (...args) => {
        const actor = lane.getStore(), sql = Array.isArray(args[0]) ? args[0].join(' ') : args[0]?.sql ?? '', values = Array.isArray(args[0]?.values) ? args[0].values : args.slice(1);
        const source = sql.includes('suspense_items') && sql.includes('FOR UPDATE');
        const assessment = values.some(value => typeof value === 'string' && value.includes('close-assessment-order'));
        if (source || assessment) pids[actor] = (await tx.$queryRawUnsafe('SELECT pg_backend_pid() AS pid'))[0].pid;
        if (actor === 'replay' && source) replaySourceAttempt.resolve();
        let result;
        try { result = await inner.$queryRaw(...args); } catch (error) { rawErrors.push({ actor, code: error.code, postgres: error.meta?.code }); throw error; }
        if (actor === 'correction' && source) { sourceHeld.resolve(); await bounded(releaseCorrection.promise); }
        if (actor === 'replay' && assessment) { replayAssessmentLocks++; assessmentHeld.resolve(); }
        return result;
      };
      return typeof inner[key] === 'function' ? inner[key].bind(inner) : inner[key];
    } })), { ...options, timeout: 30000 });
  } });
  try {
    correctionWork = observe(lane.run('correction', () => correction.decideSuspenseCorrection(command, context(x, approver.id))));
    await bounded(sourceHeld.promise);
    replayWork = observe(lane.run('replay', () => posting.approveSuspensePosting({ ...x.command, control: context(x, x.checkerId) })));
    if (!acceptance) await bounded(assessmentHeld.promise);
    await bounded(replaySourceAttempt.promise);
    const blocking = await f.helper.withClient(f.target, async client => {
      await f.helper.assertOwned(client); const until = Date.now() + 5000;
      do { const blockers = (await client.query('SELECT pg_blocking_pids($1::integer) AS blockers', [pids.replay])).rows[0].blockers; if (blockers.includes(pids.correction)) return { ...pids, observed: true }; await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < until);
      throw Error('Retained replay did not wait on the correction source');
    });
    releaseCorrection.resolve(); const outcomes = await bounded(Promise.all([correctionWork, replayWork]));
    assert.equal(rawErrors.some(error => error.postgres === '40P01'), !acceptance, JSON.stringify({ rawErrors, outcomes }));
    assert.ok(outcomes.some(outcome => outcome.error?.code === 'CONFLICT'));
    if (acceptance) {
      assert.equal(replayAssessmentLocks, 0); assert.equal(outcomes[0].value?.outcome, 'REOPENED');
      assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId, sourceId: x.itemId, sourceType: 'PAYMENT_SUSPENSE' } }), 2);
      assert.equal((await db.suspenseItem.findUniqueOrThrow({ where: { id: x.itemId } })).status, 'REOPENED');
    }
    report.checks.push({ name: 'correction-source-versus-retained-posting-assessment-deadlock', passed: true, blocking, rawErrors, outcomes, replayAssessmentLocks, organizationId: x.organizationId });
  } finally { releaseCorrection.resolve(); await Promise.allSettled([correctionWork, replayWork].filter(Boolean)); dbModule.db = originalDb; }
}
main().catch(error => { report.error = p.safeError(error); }).finally(async () => {
  dbModule.db = originalDb;
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await h.outside(); report.outsideUnchanged = f.hash(report.outsideBefore) === f.hash(report.outsideAfter); } catch (error) { report.finalizationError = p.safeError(error); }
  await db.$disconnect(); report.passed = !report.error && !report.finalizationError && report.checks.length === 1 && report.sourceStable && report.outsideUnchanged;
  const file = path.join(__dirname, 'suspense-correction-lock-' + (acceptance ? 'acceptance-' : 'baseline-') + crypto.randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); process.exit(report.passed ? 0 : 1);
});
