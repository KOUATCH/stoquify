const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['lib/dashboard/snapshot-blocker-presentation.ts', 'lib/dashboard/snapshot-source-blocker-presentation.ts', 'services/daily-habit/daily-habit-digest-presentation.ts', 'services/daily-habit/daily-habit-signal-presentation.ts', 'components/daily-habit/DailyHabitDigestDashboard.tsx', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-source-visibility.ts', 'services/snapshots/tenant-operating-snapshot.service.ts'];
files.push('middleware.ts', 'app/[locale]/(dashboard)/dashboard/layout.tsx', 'components/auth/EnhancedLoginForm.tsx', 'lib/auth-server.ts', 'lib/security/dashboard-session-recovery.ts');
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] }; let browser, page;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Payroll privacy ' + stamp, slug: 'payroll-privacy-' + stamp, currency: 'XAF', requestedModules: ['inventory', 'payroll', 'finance', 'accounting', 'payment_reconciliation'] } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'finance.read', 'payroll.command.read', 'payments.reconciliation.read', 'payroll.reports.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'finance', nameEn: 'Owned privacy reader', permissions, users: { connect: { id: actor.id } } } });
  await db.location.create({ data: { organizationId: org.id, name: 'Owned location', code: 'OWNED' } });
  const employee = await db.payrollEmployee.create({ data: { organizationId: org.id, employeeNumber: 'OWNED', displayName: 'Synthetic private employee', hireDate: new Date('2026-01-01T00:00:00Z') } });
  const period = await db.payrollPeriod.create({ data: { organizationId: org.id, name: 'Owned draft privacy fixture', periodStart: new Date('2026-01-01T00:00:00Z'), periodEnd: new Date('2026-01-31T23:59:59Z'), payDate: new Date('2026-02-01T00:00:00Z'), countryCode: 'CM' } });
  const run = await db.payrollRun.create({ data: { organizationId: org.id, payrollPeriodId: period.id, runNumber: 'OWNED', countryCode: 'CM', countryPackVersion: 'synthetic', countryPackSchemaVersion: 'synthetic', countryPackResolutionHash: 'synthetic', countryPackCapabilityStatus: 'UNAVAILABLE', ruleSetHash: 'synthetic', calculationHash: 'synthetic', attendanceSnapshotHash: 'synthetic' } });
  await db.payrollEmployeeBalanceCase.create({ data: { organizationId: org.id, employeeId: employee.id, payrollRunId: run.id, caseNumber: 'OWNED', caseType: 'RECEIVABLE', amount: '983421.78', outstandingAmount: '983421.78', sourceNetPayableAmount: '-983421.78', reason: 'Synthetic privacy fixture', openedById: actor.id, documentHash: 'synthetic', evidenceHash: 'synthetic' } });
  const effects = async () => JSON.stringify({ cases: await db.payrollEmployeeBalanceCase.findMany({ where: { organizationId: org.id } }), events: await db.payrollEmployeeBalanceEvent.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), businessEvents: await db.businessEvent.count({ where: { organizationId: org.id } }) });

  const before = await effects(); browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: locale === 'en' ? 1440 : 390, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    page = await context.newPage(); const row = { locale, errors: [] }; result.checks.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    const target = '/' + locale + '/dashboard/daily-digest?digest=finance-cash&mode=command';
    await page.goto(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const count = await db.session.updateMany({ where: { userId: actor.id }, data: { expiresAt: new Date(Date.now() - 60000) } });
    assert.ok(count.count > 0); row.expiredSyntheticSessions = count.count;
    const expiredResponse = await context.request.get(base + target, { maxRedirects: 0, timeout: 120000 });
    assert.equal((await expiredResponse.text()).includes('983421.78'), false, 'Expired server response must not expose payroll evidence');
    await page.goto(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('#email')).toBeVisible();
    const url = new URL(page.url()); row.recoveryPath = url.pathname; row.callback = url.searchParams.get('callbackUrl');
    assert.equal(url.pathname, '/' + locale + '/login');
    assert.equal((await page.content()).includes('983421.78'), false, 'Expired page must not expose payroll evidence');
    const deniedShot = 'digest-session-' + stamp + '-' + locale + '-expired.png'; await page.screenshot({ path: path.join(__dirname, deniedShot), animations: 'disabled', caret: 'initial' }); row.expiredScreenshot = deniedShot;
    assert.equal(row.callback, target, 'Session recovery must retain the selected Digest and mode');
    await page.locator('#email').fill(actor.email); await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(base + target, { timeout: 120000 });
    await expect(page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const shot = 'digest-session-' + stamp + '-' + locale + '-restored.png'; await page.screenshot({ path: path.join(__dirname, shot), animations: 'disabled', caret: 'initial' }); row.restoredScreenshot = shot;
    assert.deepEqual(row.errors, []); row.restored = true; console.log(locale + ': expired session and actual form recovery passed'); await context.close();
  }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1;
  if (page && !page.isClosed()) result.failureState = await page.locator('main').last().innerText({ timeout: 5000 }).then(text => f.safe(text, secrets)).catch(() => 'Unavailable');
}).finally(async () => { await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-session-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect(); });
