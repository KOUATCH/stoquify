// One released read-only diagnostic; no fixture repair or new approval.
const u = require('./close-unique-current-runtime.cjs'), h = require('./close-pack-write-race-runtime.cjs');
const { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
const { PrismaClient } = require('@prisma/client');
const { getPaymentReconciliationDashboardData } = require(path.join(root, 'services/reconciliation/payment-reconciliation-dashboard.service.ts'));
const { assertDisposableDatabaseIdentity } = require(path.join(root, 'scripts/disposable-fixture-guard.js'));
const organizationId = 'workflow_close_write_unique-creator-first_787a0280-1a2a-4bf8-9ca8-e9ece0defffb';
const x = { organizationId, periodId: 'cmuoznj1p000ama64dviil1hl', closeRunId: 'cmuoznkl3007ama646yoh4z0t' };
const stamp = crypto.randomUUID(), report = { run: stamp, at: new Date().toISOString(), readonly: true, organizationId, purpose: 'Compare actual payment dashboard on original DB and verifier async-context proxy. No fixture mutation, new assessment, export or approval.' };
const sources = () => ({ ...u.sources(), [path.relative(root, __filename).replaceAll('\\', '/')]: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex') });
async function read(work) { try { const value = await work(); return { success: true, keys: Object.keys(value), summary: value.overview?.summary || null }; } catch (error) { return { success: false, name: error.name, code: error.code, message: f.safe(error), stack: f.safe(error.stack || error) }; } }
async function main() {
  await helper.withClient(f.target, helper.assertOwned); const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId } }); assert.ok(org.name.startsWith(helper.prefix));
  assert.equal(await db.paymentException.count({ where: { organizationId } }), 0); assert.equal(await db.suspenseItem.count({ where: { organizationId } }), 0); assert.equal(await db.reconciliationRun.count({ where: { organizationId } }), 0);
  report.sourcesBefore = sources(); report.outsideBefore = await u.outside();
  report.original = await read(() => getPaymentReconciliationDashboardData(organizationId));
  const writer = new PrismaClient({ datasources: { db: { url: f.target.toString() } }, log: [], transactionOptions: { timeout: 20000, maxWait: 10000 } }); await assertDisposableDatabaseIdentity(writer, helper.database);
  const route = u.routing(x, writer, null);
  try { report.proxy = await read(() => route.run('creator', () => getPaymentReconciliationDashboardData(organizationId))); report.proxyEvents = route.state.events; }
  finally { route.state.release.resolve(); route.state.collectors.resolve(); route.restore(); await writer.$disconnect(); }
}
main().catch(error => { report.error = f.safe(error); }).finally(async () => {
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await u.outside(); report.fixtureAndOutsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; } catch (error) { report.finalizationError = f.safe(error); }
  const file = path.join(__dirname, 'close-unique-current-proxy-readonly-' + stamp + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, original: report.original, proxy: report.proxy, sourceStable: report.sourceStable, fixtureAndOutsideUnchanged: report.fixtureAndOutsideUnchanged, error: report.error, finalizationError: report.finalizationError })); await db.$disconnect();
});
