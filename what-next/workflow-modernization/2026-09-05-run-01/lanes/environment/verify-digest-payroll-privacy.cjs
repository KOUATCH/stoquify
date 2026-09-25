const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-source-visibility.ts', 'services/snapshots/tenant-operating-snapshot.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] }; let browser, page;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Payroll privacy ' + stamp, slug: 'payroll-privacy-' + stamp, currency: 'XAF', requestedModules: ['inventory', 'payroll'] } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'inventory.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'stockkeeper', nameEn: 'Owned privacy reader', permissions, users: { connect: { id: actor.id } } } });
  await db.location.create({ data: { organizationId: org.id, name: 'Owned location', code: 'OWNED' } });
  const employee = await db.payrollEmployee.create({ data: { organizationId: org.id, employeeNumber: 'OWNED', displayName: 'Synthetic private employee', hireDate: new Date('2026-01-01T00:00:00Z') } });
  const period = await db.payrollPeriod.create({ data: { organizationId: org.id, name: 'Owned draft privacy fixture', periodStart: new Date('2026-01-01T00:00:00Z'), periodEnd: new Date('2026-01-31T23:59:59Z'), payDate: new Date('2026-02-01T00:00:00Z'), countryCode: 'CM' } });
  const run = await db.payrollRun.create({ data: { organizationId: org.id, payrollPeriodId: period.id, runNumber: 'OWNED', countryCode: 'CM', countryPackVersion: 'synthetic', countryPackSchemaVersion: 'synthetic', countryPackResolutionHash: 'synthetic', countryPackCapabilityStatus: 'UNAVAILABLE', ruleSetHash: 'synthetic', calculationHash: 'synthetic', attendanceSnapshotHash: 'synthetic' } });
  await db.payrollEmployeeBalanceCase.create({ data: { organizationId: org.id, employeeId: employee.id, payrollRunId: run.id, caseNumber: 'OWNED', caseType: 'RECEIVABLE', amount: '983421.78', outstandingAmount: '983421.78', sourceNetPayableAmount: '-983421.78', reason: 'Synthetic privacy fixture', openedById: actor.id, documentHash: 'synthetic', evidenceHash: 'synthetic' } });
  const effects = async () => JSON.stringify({ cases: await db.payrollEmployeeBalanceCase.findMany({ where: { organizationId: org.id } }), events: await db.payrollEmployeeBalanceEvent.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), businessEvents: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects(); browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 390 : 1440, height: 1100 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password } })).status(), 200);
    page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(f.safe(error, secrets)));
    for (const state of ['no-permission', 'authorized', 'module-removed', 'permission-revoked']) {
      const allowed = state === 'authorized', statePermissions = state === 'authorized' || state === 'module-removed' ? [...permissions, 'payroll.command.read'] : permissions;
      await db.role.update({ where: { id: role.id }, data: { permissions: statePermissions } });
      await db.organization.update({ where: { id: org.id }, data: { requestedModules: state === 'module-removed' ? ['inventory'] : ['inventory', 'payroll'] } });
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions: statePermissions, actorRoleCodes: ['stockkeeper'], locale });
      assert.equal(JSON.stringify(data).includes('983421.78'), allowed);
      const response = await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
      assert.equal((await response.text()).includes('983421.78'), allowed);
      await expect(page.getByRole('button', { name: locale === 'en' ? 'Stockkeeper' : 'Magasinier', exact: true })).toBeEnabled();
      if (allowed) { const disclosure = page.getByText('Employee balance recovery cases are open', { exact: true }).first(); await expect(disclosure).toBeVisible(); await disclosure.click(); await expect(page.getByText(/983421.78 outstanding/).first()).toBeVisible(); }
      else { await expect(page.getByText(locale === 'en' ? 'Restricted source details' : 'Détails de source restreints', { exact: true }).first()).toBeVisible(); assert.equal((await page.locator('main').last().innerText()).includes('983421.78'), false); }
      result.checks.push({ locale, state, serviceAndHtmlAmountVisible: allowed, errors: [...errors] });
      if (state === 'no-permission') { const output = 'digest-payroll-privacy-' + stamp + '-' + locale + '.png'; await page.screenshot({ path: path.join(__dirname, output), animations: 'disabled', caret: 'initial' }); result.checks.at(-1).screenshot = output; }
      assert.deepEqual(errors, []);
    }
    await context.close();
  }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => { await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-payroll-privacy-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect(); });
