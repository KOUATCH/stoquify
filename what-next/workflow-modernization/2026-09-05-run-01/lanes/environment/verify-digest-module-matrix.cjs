const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['lib/dashboard/snapshot-blocker-presentation.ts', 'lib/dashboard/snapshot-source-blocker-presentation.ts', 'services/daily-habit/daily-habit-digest-presentation.ts', 'services/daily-habit/daily-habit-signal-presentation.ts', 'components/daily-habit/DailyHabitDigestDashboard.tsx', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-source-visibility.ts', 'services/snapshots/tenant-operating-snapshot.service.ts'];
files.push('services/modules/module-entitlement.service.ts', 'services/modules/module-catalog.service.ts');
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

  const now = new Date(), before = await effects();
  const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
  const { observeModuleAccess } = require(path.join(f.root, 'services/modules/module-entitlement.service.ts'));
  const { getTenantOperatingSnapshot } = require(path.join(f.root, 'services/snapshots/tenant-operating-snapshot.service.ts'));
  const rawBefore = await getTenantOperatingSnapshot({ organizationId: org.id, now });
  const modules = getModuleCatalog().map(item => item.slug);
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-owned-matrix', selectedModules: modules, activeModules: modules } });
  const grant = (slug, data = {}) => db.tenantModuleGrant.upsert({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: slug } }, create: { organizationId: org.id, moduleSlug: slug, status: 'active', source: 'requested_modules', ...data }, update: { status: 'active', readOnly: false, startsAt: null, endsAt: null, ...data } });
  const cases = [
    { name: 'explicit-empty', allowed: false, browser: true, prepare: async () => {} },
    { name: 'active', allowed: true, browser: true, prepare: async () => { for (const slug of modules) await grant(slug); } },
    { name: 'future-start', allowed: false, prepare: () => grant('payroll', { startsAt: new Date(now.getTime() + 86400000) }) },
    { name: 'expired', allowed: false, browser: true, prepare: () => grant('payroll', { endsAt: new Date(now.getTime() - 86400000) }) },
    { name: 'suspended', allowed: false, prepare: () => grant('payroll', { status: 'suspended' }) },
    { name: 'missing', allowed: false, prepare: () => db.tenantModuleGrant.delete({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: 'payroll' } } }) },
    { name: 'read-only-status', allowed: true, browser: true, prepare: () => grant('payroll', { status: 'read_only' }) },
    { name: 'read-only-flag', allowed: true, prepare: () => grant('payroll', { readOnly: true }) },
    { name: 'new-work-stopped-retained-read', allowed: true, browser: true, prepare: async () => { await grant('payroll'); await db.tenantModuleConfiguration.update({ where: { organizationId: org.id }, data: { selectedModules: modules.filter(slug => slug !== 'payroll'), activeModules: modules.filter(slug => slug !== 'payroll'), newWorkStoppedModules: ['payroll'] } }); } },
    { name: 'recommended-accounting-suspended', allowed: true, prepare: () => grant('accounting', { status: 'suspended' }) },
    { name: 'reactivated', allowed: true, browser: true, prepare: async () => { await grant('accounting'); await grant('payroll'); await db.tenantModuleConfiguration.update({ where: { organizationId: org.id }, data: { selectedModules: modules, activeModules: modules, newWorkStoppedModules: [] } }); } },
  ];
  browser = await chromium.launch({ headless: true });
  const contexts = {};
  for (const locale of ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: locale === 'en' ? 1440 : 390, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    contexts[locale] = context;
  }
  for (const test of cases) {
    await test.prepare();
    const decision = await observeModuleAccess({ organizationId: org.id, userId: actor.id, actorPermissions: permissions, moduleSlug: 'payroll', surfaceType: 'report', surface: 'owned-digest-module-matrix', accessIntent: 'read', mode: 'enforce', audit: true, now });
    assert.equal(decision.allowed, test.allowed, test.name + ': persisted read decision');
    const row = { name: test.name, allowed: test.allowed, decision: decision.result, reason: decision.reason, locales: [] }; result.checks.push(row);
    for (const locale of ['en', 'fr']) {
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions: permissions, actorRoleCodes: ['finance'], locale, now });
      assert.equal(JSON.stringify(data).includes('983421.78'), test.allowed, test.name + ': serialized privacy');
      assert.equal(data.digests.some(digest => digest.id === 'finance-cash'), true, 'Non-payroll finance workspace remains');
      assert.equal(data.digests.flatMap(digest => digest.actions).some(action => action.href.includes('/payroll/payments')), test.allowed, test.name + ': source handoff availability');
      const item = { locale, service: true, browser: false, errors: [] }; row.locales.push(item);
      if (!test.browser) continue;
      page = await contexts[locale].newPage(); page.on('pageerror', error => item.errors.push(f.safe(error, secrets)));
      const response = await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
      assert.equal((await response.text()).includes('983421.78'), test.allowed, test.name + ': HTML privacy');
      const region = page.getByRole('region', { name: locale === 'en' ? 'Source limitations' : 'Limites des sources', exact: true });
      if (test.allowed) {
        const title = locale === 'en' ? 'Employee balance recovery cases are open' : 'Des dossiers de recouvrement de soldes salariés restent ouverts';
        const disclosure = region.locator('summary').filter({ hasText: title }).first();
        await expect(disclosure).toBeVisible(); await disclosure.focus(); await page.keyboard.press('Enter');
        await expect(region.getByText(/983421\.78/).first()).toBeVisible();
      } else {
        await expect(region.getByText(locale === 'en' ? 'Restricted source details' : 'Détails de source restreints', { exact: true }).first()).toBeVisible();
        assert.equal((await region.innerText()).includes('983421.78'), false);
      }
      if (['explicit-empty', 'read-only-status', 'reactivated'].includes(test.name)) {
        await region.scrollIntoViewIfNeeded();
        const shot = 'digest-module-matrix-' + stamp + '-' + test.name + '-' + locale + '.png';
        await page.screenshot({ path: path.join(__dirname, shot), animations: 'disabled', caret: 'initial' }); item.screenshot = shot;
      }
      assert.deepEqual(item.errors, []); item.browser = true; await page.close();
    }
    console.log(test.name + ': EN/FR persisted service' + (test.browser ? ' and browser' : '') + ' passed');
  }
  const rawAfter = await getTenantOperatingSnapshot({ organizationId: org.id, now });
  assert.equal(rawAfter.sourceHash, rawBefore.sourceHash);
  assert.equal(JSON.stringify(rawAfter.blockers), JSON.stringify(rawBefore.blockers));
  assert.equal(await effects(), before);
  result.rawEvidenceUnchanged = true; result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1;
  if (page && !page.isClosed()) result.failureState = await page.locator('main').last().innerText({ timeout: 5000 }).then(text => f.safe(text, secrets)).catch(() => 'Unavailable');
}).finally(async () => { await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-module-matrix-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect(); });
