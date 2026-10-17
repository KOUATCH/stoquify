// Synthetic records only, guarded disposable database; no posting/payment services.
const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const url = originalTarget(); url.searchParams.set('connection_limit', '2'); return url; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { getTenantOperatingSnapshot } = require(path.join(f.root, 'services/snapshots/tenant-operating-snapshot.service.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/signals/business-signal-rules.service.ts', 'services/snapshots/snapshot-contracts.ts', 'services/snapshots/tenant-operating-snapshot.service.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-source-visibility.ts', 'lib/dashboard/snapshot-blocker-presentation.ts', 'lib/dashboard/snapshot-source-blocker-presentation.ts', 'components/daily-habit/DailyHabitDigestDashboard.tsx'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] }, output = path.join(__dirname, 'digest-payroll-currency-' + stamp + '.json');
fs.writeFileSync(output, JSON.stringify({ ...result, state: 'running' }, null, 2), { flag: 'wx' });
let browser, page;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Payroll currency ' + stamp, slug: 'payroll-currency-' + stamp, currency: 'XAF', timezone: 'UTC' } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'payroll.command.read', 'payments.reconciliation.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'admin', nameEn: 'Owned currency reader', permissions, users: { connect: { id: actor.id } } } });
  const modules = ['dashboard', 'payroll', 'accounting', 'finance', 'payment_reconciliation'];
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-currency', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: org.id, moduleSlug, source: 'requested_modules', status: 'active' })) });
  await db.location.create({ data: { organizationId: org.id, name: 'Owned currency source', code: 'OWNED' } });
  const period = await db.payrollPeriod.create({ data: { organizationId: org.id, name: 'Synthetic source; no approval claimed', periodStart: new Date('2020-01-01'), periodEnd: new Date('2020-01-31'), payDate: new Date('2020-02-01'), countryCode: 'CM' } });
  const run = await db.payrollRun.create({ data: { organizationId: org.id, payrollPeriodId: period.id, runNumber: 'SYNTHETIC', countryCode: 'CM', countryPackVersion: 'synthetic-not-approval', countryPackSchemaVersion: 'synthetic', countryPackResolutionHash: 'synthetic', countryPackCapabilityStatus: 'UNAVAILABLE', ruleSetHash: 'synthetic', calculationHash: 'synthetic', attendanceSnapshotHash: 'synthetic' } });
  const employee = await db.payrollEmployee.create({ data: { organizationId: org.id, employeeNumber: 'SYNTHETIC', displayName: 'Synthetic currency test', hireDate: new Date('2020-01-01') } });
  const cases = [];
  for (const currency of ['USD', 'XAF']) {
    const item = await db.payrollEmployeeBalanceCase.create({ data: { organizationId: org.id, employeeId: employee.id, payrollRunId: run.id, caseNumber: 'SYNTHETIC-' + currency, caseType: 'RECEIVABLE', status: 'PARTIALLY_SETTLED', amount: 625, settledAmount: 125, outstandingAmount: 500, sourceNetPayableAmount: -625, currency, reason: 'Synthetic read-only currency evidence', openedById: actor.id, documentHash: 'synthetic', evidenceHash: 'synthetic' } });
    cases.push(item);
    await db.payrollEmployeeBalanceEvent.create({ data: { organizationId: org.id, balanceCaseId: item.id, eventType: 'SETTLE_BANK', amount: 125, currency, eventDate: new Date(), actorId: actor.id, evidenceHash: 'synthetic-not-payment-proof', idempotencyKey: stamp + currency } });
  }
  const effects = async () => JSON.stringify({ cases: await db.payrollEmployeeBalanceCase.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } }), events: await db.payrollEmployeeBalanceEvent.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } }), runs: await db.payrollRun.findMany({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), businessEvents: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  browser = await chromium.launch({ headless: true });
  for (const state of ['mixed', 'permission-revoked', 'recovered']) {
    const currentPermissions = state === 'permission-revoked' ? ['dashboard.read'] : permissions;
    await db.role.update({ where: { id: role.id }, data: { permissions: currentPermissions } });
    if (state === 'recovered') await db.payrollEmployeeBalanceCase.update({ where: { id: cases[0].id }, data: { status: 'CANCELLED', metadata: { syntheticFixtureTransition: true } } });
    const before = await effects(), source = await getTenantOperatingSnapshot({ organizationId: org.id });
    assert.equal(source.metrics.employeeBalanceOutstandingAmount, state === 'recovered' ? 500 : null);
    assert.equal(source.metrics.periodEmployeeBalanceSettlementAmount, null);
    assert.deepEqual(source.metrics.periodEmployeeBalanceSettlementByCurrency.map(x => [x.currencyCode, x.amount]), [['USD', 125], ['XAF', 125]]);
    const contextAuthority = { orgId: org.id, userId: actor.id, permissions: currentPermissions, roles: [{ id: role.id, code: 'admin', name: role.nameEn, permissions: currentPermissions }], isSuperUser: false };
    for (const locale of ['en', 'fr']) {
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions: currentPermissions, actorRoleCodes: ['admin'], operatingAccessContext: contextAuthority, locale });
      const encoded = JSON.stringify(data), denied = state === 'permission-revoked';
      if (denied) { assert.ok(!encoded.includes('125.00 USD')); assert.ok(!encoded.includes('500.00 USD')); assert.ok(encoded.includes('restricted_source')); }
      else { assert.ok(encoded.includes('125.00 USD')); assert.ok(encoded.includes('125.00 XAF')); assert.ok(data.digests.some(d => d.risks.some(r => r.title === (locale === 'en' ? 'Payroll Exposure' : 'Exposition liée à la paie')))); }
      const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 320 : 1440, height: 1100 }, reducedMotion: 'reduce' });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
      page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(f.safe(error, secrets)));
      await page.goto(base + '/' + locale + '/dashboard/daily-digest?digest=owner-morning&mode=command', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const main = page.locator('.dashboard-landing-content');
      await expect(main.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true })).toHaveAttribute('aria-pressed', 'true');
      if (denied) { await expect(main.getByText('125.00 USD', { exact: false })).toHaveCount(0); await expect(main.getByText('500.00 USD', { exact: false })).toHaveCount(0); }
      else {
        const title = locale === 'en' ? 'Employee settlement currencies cannot be combined' : 'Les règlements salariés de devises différentes ne peuvent pas être additionnés';
        await expect(main.getByText(title, { exact: true }).first()).toBeVisible();
        const disclosure = main.locator('summary').filter({ hasText: title }).first();
        await disclosure.focus(); await page.keyboard.press('Enter');
        await expect(disclosure.locator('..').getByText('125.00 USD', { exact: false })).toBeVisible();
        await expect(disclosure.locator('..').getByText('125.00 XAF', { exact: false })).toBeVisible();
        await expect(disclosure.locator('..').getByText(locale === 'en' ? 'No conversion evidence establishes a total in XAF.' : 'Aucune preuve de conversion ne permet d’établir un total en XAF.', { exact: false })).toBeVisible();
        await expect(main.getByText(locale === 'en' ? 'Payroll Exposure' : 'Exposition liée à la paie', { exact: true }).first()).toBeVisible();
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      const screenshot = 'digest-payroll-currency-' + stamp + '-' + locale + '-' + state + '.png';
      await page.screenshot({ path: path.join(__dirname, screenshot), fullPage: true, animations: 'disabled', caret: 'initial' });
      assert.deepEqual(errors, []); result.checks.push({ state, locale, outstandingAmount: source.metrics.employeeBalanceOutstandingAmount, settlementAmount: source.metrics.periodEmployeeBalanceSettlementAmount, screenshot });
      await context.close(); console.log(locale + ' ' + state + ': passed');
    }
    assert.equal(await effects(), before);
  }
  result.noBusinessMutationsDuringReads = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; if (page && !page.isClosed()) { result.failureScreenshot = 'digest-payroll-currency-' + stamp + '-failed.png'; await page.screenshot({ path: path.join(__dirname, result.failureScreenshot), fullPage: true, animations: 'disabled', caret: 'initial' }).catch(() => {}); } }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  if (!result.sourceStable) { result.passed = false; process.exitCode = 1; }
  const value = JSON.stringify(result, null, 2), fd = fs.openSync(output, 'r+'); try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); }
  console.log(JSON.stringify({ output, passed: result.passed, sourceStable: result.sourceStable, error: result.error })); await db.$disconnect();
});
