const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const url = originalTarget(); url.searchParams.set('connection_limit', '2'); return url; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { getTenantOperatingSnapshot } = require(path.join(f.root, 'services/snapshots/tenant-operating-snapshot.service.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/signals/business-signal-rules.service.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-signal-presentation.ts', 'services/daily-habit/daily-habit-digest-presentation.ts', 'services/snapshots/tenant-operating-snapshot.service.ts', 'components/daily-habit/DailyHabitDigestDashboard.tsx'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] }, output = path.join(__dirname, 'digest-payroll-history-' + stamp + '.json');
fs.writeFileSync(output, JSON.stringify({ ...result, state: 'running' }, null, 2), { flag: 'wx' });
let browser, page;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Payroll history ' + stamp, slug: 'payroll-history-' + stamp, currency: 'XAF', timezone: 'UTC' } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'payroll.command.read', 'payroll.reports.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'admin', nameEn: 'Owned history reader', permissions, users: { connect: { id: actor.id } } } });
  const modules = ['dashboard', 'payroll', 'accounting', 'finance', 'payment_reconciliation'];
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-history', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: org.id, moduleSlug, source: 'requested_modules', status: 'active' })) });
  await db.location.create({ data: { organizationId: org.id, name: 'Owned source site', code: 'OWNED' } });
  const period = await db.payrollPeriod.create({ data: { organizationId: org.id, name: 'Synthetic historical source; no approval claimed', periodStart: new Date('2020-01-01T00:00:00Z'), periodEnd: new Date('2020-01-31T23:59:59Z'), payDate: new Date('2020-02-01T00:00:00Z'), countryCode: 'CM' } });
  const statuses = ['APPROVED', 'EMITTED', 'PAID', 'POSTED', 'ARCHIVED'];
  await db.payrollRun.createMany({ data: statuses.map(status => ({ organizationId: org.id, payrollPeriodId: period.id, runNumber: 'SYNTHETIC-' + status, status, countryCode: 'CM', countryPackVersion: 'synthetic-not-approval', countryPackSchemaVersion: 'synthetic', countryPackResolutionHash: 'synthetic', countryPackCapabilityStatus: 'UNAVAILABLE', ruleSetHash: 'synthetic', calculationHash: 'synthetic', attendanceSnapshotHash: 'synthetic' })) });
  const effects = async () => JSON.stringify({ runs: await db.payrollRun.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } }), periods: await db.payrollPeriod.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const ctx = { orgId: org.id, userId: actor.id, permissions, roles: [{ id: role.id, code: 'admin', name: role.nameEn, permissions }], isSuperUser: false };
  browser = await chromium.launch({ headless: true });
  for (const state of ['history-only', 'missing-forecast-proof']) {
    if (state === 'missing-forecast-proof') {
      const start = new Date(); start.setUTCHours(0, 0, 0, 0); const end = new Date(start.getTime() + 86400000 - 1);
      await db.payrollPeriod.create({ data: { organizationId: org.id, name: 'Synthetic upcoming period awaiting real proof', periodStart: start, periodEnd: end, payDate: new Date(start.getTime() + 43200000), countryCode: 'CM' } });
    }
    const before = await effects();
    const source = await getTenantOperatingSnapshot({ organizationId: org.id });
    assert.equal(source.metrics.approvedOrPaidPayrollRunCount, statuses.length);
    assert.equal(source.metrics.activeEmployeeBalanceCaseCount, 0);
    assert.equal(source.metrics.payrollFinanceForecast.blockerCodes.length > 0, state === 'missing-forecast-proof');
    for (const locale of ['en', 'fr']) {
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions: permissions, actorRoleCodes: ['admin'], operatingAccessContext: ctx, locale });
      const owner = data.digests.find(d => d.id === 'owner-morning'); assert.ok(owner);
      if (state === 'history-only') { assert.equal(data.summary.visibleActionCount, 0); assert.equal(owner.risks.length, 0); assert.equal(owner.changes.length, 0); }
      else { assert.ok(owner.risks.some(r => r.title === (locale === 'en' ? 'Payroll forecast proof is blocked' : 'Les preuves de prévision de paie sont bloquées'))); assert.ok(owner.actions.some(a => a.href === '/' + locale + '/dashboard/payroll/register')); }
      const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 320 : 1440, height: 1100 }, reducedMotion: 'reduce' });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
      page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(f.safe(error, secrets)));
      await page.goto(base + '/' + locale + '/dashboard/daily-digest?digest=owner-morning&mode=command', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const main = page.locator('.dashboard-landing-content');
      await expect(main.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true })).toHaveAttribute('aria-pressed', 'true');
      if (state === 'history-only') { await expect(main.getByText(locale === 'en' ? 'No visible action is due for this digest.' : 'Aucune action visible pour ce digest.', { exact: true })).toBeVisible(); await expect(main.getByText(locale === 'en' ? 'Payroll Exposure' : 'Exposition liée à la paie', { exact: true })).toHaveCount(0); }
      else { await expect(main.getByText(locale === 'en' ? 'Payroll forecast proof is blocked' : 'Les preuves de prévision de paie sont bloquées', { exact: true }).first()).toBeVisible(); await expect(main.locator('a[href="/' + locale + '/dashboard/payroll/register"]').first()).toBeVisible(); }
      const screenshot = 'digest-payroll-history-' + stamp + '-' + locale + '-' + state + '.png';
      await page.screenshot({ path: path.join(__dirname, screenshot), fullPage: true, animations: 'disabled', caret: 'initial' });
      assert.deepEqual(errors, []); result.checks.push({ state, locale, approvedOrPaidCount: source.metrics.approvedOrPaidPayrollRunCount, forecastBlockerCodes: source.metrics.payrollFinanceForecast.blockerCodes, serviceAndBrowserPassed: true, screenshot });
      await context.close(); console.log(locale + ' ' + state + ': passed');
    }
    assert.equal(await effects(), before);
  }
  result.noBusinessMutationsDuringReads = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; if (page && !page.isClosed()) { result.failureScreenshot = 'digest-payroll-history-' + stamp + '-failed.png'; await page.screenshot({ path: path.join(__dirname, result.failureScreenshot), fullPage: true, animations: 'disabled', caret: 'initial' }).catch(() => {}); } }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  if (!result.sourceStable) { result.passed = false; process.exitCode = 1; }
  const value = JSON.stringify(result, null, 2), fd = fs.openSync(output, 'r+'); try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); }
  console.log(JSON.stringify({ output, passed: result.passed, sourceStable: result.sourceStable, error: result.error })); await db.$disconnect();
});
