const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const url = originalTarget(); url.searchParams.set('connection_limit', '2'); return url; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { getTenantOperatingSnapshot } = require(path.join(f.root, 'services/snapshots/tenant-operating-snapshot.service.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/snapshots/tenant-operating-snapshot.service.ts', 'services/snapshots/snapshot-contracts.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-source-visibility.ts', 'lib/dashboard/snapshot-blocker-presentation.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] }, output = path.join(__dirname, 'digest-forecast-currency-' + stamp + '.json');
fs.writeFileSync(output, JSON.stringify({ ...result, state: 'running' }, null, 2), { flag: 'wx' });
let browser, page;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Forecast currency ' + stamp, slug: 'forecast-currency-' + stamp, currency: 'XAF', timezone: 'UTC' } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'payroll.command.read', 'payroll.reports.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'admin', nameEn: 'Owned forecast reader', permissions, users: { connect: { id: actor.id } } } });
  const modules = ['dashboard', 'payroll', 'accounting', 'finance', 'payment_reconciliation'];
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-forecast', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: org.id, moduleSlug, source: 'requested_modules', status: 'active' })) });
  await db.location.create({ data: { organizationId: org.id, name: 'Owned forecast source', code: 'OWNED' } });
  const now = new Date(), start = new Date(now); start.setUTCHours(0, 0, 0, 0); const end = new Date(start.getTime() + 86400000 - 1);
  const period = await db.payrollPeriod.create({ data: { organizationId: org.id, name: 'Synthetic source; no approval or posting proof', periodStart: start, periodEnd: end, payDate: now, countryCode: 'CM' } });
  const run = await db.payrollRun.create({ data: { organizationId: org.id, payrollPeriodId: period.id, runNumber: 'SYNTHETIC', status: 'POSTED', countryCode: 'CM', countryPackVersion: 'synthetic-not-approval', countryPackSchemaVersion: 'synthetic', countryPackResolutionHash: 'synthetic', countryPackCapabilityStatus: 'UNAVAILABLE', ruleSetHash: 'synthetic', calculationHash: 'synthetic', attendanceSnapshotHash: 'synthetic', netPayableAmount: 350000, employerChargeAmount: 90000, metadata: { syntheticReadFixture: true, genuinePostingProofAbsent: true } } });
  const batch = await db.payrollPaymentBatch.create({ data: { organizationId: org.id, payrollRunId: run.id, batchNumber: 'SYNTHETIC', method: 'BANK_TRANSFER', amount: 350000, currency: 'USD', paymentDate: now, requestedById: actor.id } });
  await db.payrollDeclaration.create({ data: { organizationId: org.id, payrollRunId: run.id, authority: 'Synthetic test authority', declarationType: 'SYNTHETIC', periodStart: start, periodEnd: end, dueDate: now, countryCode: 'CM', countryPackVersion: 'synthetic', countryPackSchemaVersion: 'synthetic', countryPackResolutionHash: 'synthetic', amount: 90000, currency: 'XAF' } });
  const effects = async () => JSON.stringify({ batches: await db.payrollPaymentBatch.findMany({ where: { organizationId: org.id } }), declarations: await db.payrollDeclaration.findMany({ where: { organizationId: org.id } }), runs: await db.payrollRun.findMany({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  browser = await chromium.launch({ headless: true });
  for (const state of ['mixed', 'permission-revoked', 'currency-corrected-proof-missing']) {
    const currentPermissions = state === 'permission-revoked' ? ['dashboard.read'] : permissions;
    await db.role.update({ where: { id: role.id }, data: { permissions: currentPermissions } });
    if (state === 'currency-corrected-proof-missing') await db.payrollPaymentBatch.update({ where: { id: batch.id }, data: { currency: 'XAF' } });
    const before = await effects(), source = await getTenantOperatingSnapshot({ organizationId: org.id }), forecast = source.metrics.payrollFinanceForecast;
    assert.equal(forecast.totalUpcomingAmount, null); assert.equal(forecast.upcomingNetPayAmount, null); assert.equal(forecast.upcomingStatutoryLiabilityAmount, null); assert.equal(forecast.authoritative, false);
    assert.equal(forecast.blockerCodes.includes('PAYROLL_FORECAST_CURRENCY_MISMATCH'), state !== 'currency-corrected-proof-missing');
    assert.ok(forecast.blockerCodes.includes('PAYROLL_FORECAST_CERTIFIED_HRIS_INPUT_PROOF_MISSING'));
    const authority = { orgId: org.id, userId: actor.id, permissions: currentPermissions, roles: [{ id: role.id, code: 'admin', name: role.nameEn, permissions: currentPermissions }], isSuperUser: false };
    for (const locale of ['en', 'fr']) {
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions: currentPermissions, actorRoleCodes: ['admin'], operatingAccessContext: authority, locale });
      const encoded = JSON.stringify(data), denied = state === 'permission-revoked';
      const title = locale === 'en' ? 'Payroll forecast currencies cannot be combined' : 'Les devises des prévisions de paie ne peuvent pas être additionnées';
      if (denied) { assert.ok(!encoded.includes('USD')); assert.ok(encoded.includes('restricted_source')); }
      else { assert.equal(encoded.includes(title), state === 'mixed'); assert.ok(encoded.includes(locale === 'en' ? 'Certified HRIS payroll input proof is missing' : 'Les preuves des données RH certifiées pour la paie sont manquantes')); }
      const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 320 : 1440, height: 1100 }, reducedMotion: 'reduce' });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
      page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(f.safe(error, secrets)));
      await page.goto(base + '/' + locale + '/dashboard/daily-digest?digest=owner-morning&mode=command', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const main = page.locator('.dashboard-landing-content');
      await expect(main.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true })).toHaveAttribute('aria-pressed', 'true');
      if (state === 'mixed') {
        const disclosure = main.locator('summary').filter({ hasText: title }).first(); await expect(disclosure).toBeVisible(); await disclosure.focus(); await page.keyboard.press('Enter');
        await expect(disclosure.locator('..').getByText('USD; XAF', { exact: false })).toBeVisible();
      } else await expect(main.getByText(title, { exact: true })).toHaveCount(0);
      if (denied) await expect(main.getByText('USD', { exact: false })).toHaveCount(0);
      else await expect(main.getByText(locale === 'en' ? 'Payroll forecast proof is blocked' : 'Les preuves de prévision de paie sont bloquées', { exact: true }).first()).toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      const screenshot = 'digest-forecast-currency-' + stamp + '-' + locale + '-' + state + '.png'; await page.screenshot({ path: path.join(__dirname, screenshot), fullPage: true, animations: 'disabled', caret: 'initial' });
      assert.deepEqual(errors, []); result.checks.push({ state, locale, amount: forecast.totalUpcomingAmount, blockerCodes: forecast.blockerCodes, screenshot });
      await context.close(); console.log(locale + ' ' + state + ': passed');
    }
    assert.equal(await effects(), before);
  }
  result.noBusinessMutationsDuringReads = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; if (page && !page.isClosed()) { result.failureScreenshot = 'digest-forecast-currency-' + stamp + '-failed.png'; await page.screenshot({ path: path.join(__dirname, result.failureScreenshot), fullPage: true, animations: 'disabled', caret: 'initial' }).catch(() => {}); } }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  if (!result.sourceStable) { result.passed = false; process.exitCode = 1; }
  const value = JSON.stringify(result, null, 2), fd = fs.openSync(output, 'r+'); try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); }
  console.log(JSON.stringify({ output, passed: result.passed, sourceStable: result.sourceStable, error: result.error })); await db.$disconnect();
});
