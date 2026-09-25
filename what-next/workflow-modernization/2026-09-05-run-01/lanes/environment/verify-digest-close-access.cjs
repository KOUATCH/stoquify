const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const value = originalTarget(); value.searchParams.set('connection_limit', '2'); return value; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const { observeModuleAccess } = require(path.join(f.root, 'services/modules/module-entitlement.service.ts'));
const { getCloseReadinessSnapshot } = require(path.join(f.root, 'services/snapshots/close-readiness-snapshot.service.ts'));
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const files = ['services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-source-visibility.ts', 'services/modules/module-entitlement.service.ts', 'services/modules/module-catalog.service.ts', 'services/snapshots/close-readiness-snapshot.service.ts'];
files.push('app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts', 'app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access.tsx', 'actions/accounting/close-assurance.actions.ts');
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] }; let browser;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Close module read ' + stamp, slug: 'digest-close-access-' + stamp, currency: 'XAF' } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'accounting.close.read', 'analytics.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'owner', nameEn: 'Owned close reader', permissions, users: { connect: { id: actor.id } } } });
  const now = new Date(), startDate = new Date(now.getTime() - 8 * 86400000), endDate = new Date(now.getTime() + 86400000);
  const year = await db.fiscalYear.create({ data: { organizationId: org.id, name: 'Owned year', startDate, endDate } });
  const period = await db.accountingPeriod.create({ data: { organizationId: org.id, fiscalYearId: year.id, periodNumber: 1, name: 'Owned period', startDate, endDate } });
  await db.closeRun.create({ data: { organizationId: org.id, periodId: period.id, status: 'BLOCKED', readinessScore: 83 } });
  const modules = getModuleCatalog().map(item => item.slug);
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-owned-close-matrix', selectedModules: modules, activeModules: modules } });
  const grant = (slug, data = {}) => db.tenantModuleGrant.upsert({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: slug } }, create: { organizationId: org.id, moduleSlug: slug, status: 'active', source: 'requested_modules', ...data }, update: { status: 'active', readOnly: false, startsAt: null, endsAt: null, ...data } });
  const effects = async () => JSON.stringify({ runs: await db.closeRun.findMany({ where: { organizationId: org.id } }), periods: await db.accountingPeriod.findMany({ where: { organizationId: org.id } }), exports: await db.closePackExport.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects(), rawBefore = await getCloseReadinessSnapshot({ organizationId: org.id, now });
  const cases = [
    { name: 'explicit-empty', allowed: false, browser: true, prepare: async () => {} },
    { name: 'active', allowed: true, browser: true, prepare: async () => { for (const slug of modules) await grant(slug); } },
    { name: 'suspended', allowed: false, browser: true, prepare: () => grant('close_assurance', { status: 'suspended' }) },
    { name: 'expired', allowed: false, prepare: () => grant('close_assurance', { endsAt: new Date(now.getTime() - 86400000) }) },
    { name: 'future', allowed: false, prepare: () => grant('close_assurance', { startsAt: new Date(now.getTime() + 86400000) }) },
    { name: 'missing', allowed: false, prepare: () => db.tenantModuleGrant.delete({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: 'close_assurance' } } }) },
    { name: 'read-only', allowed: true, browser: true, prepare: () => grant('close_assurance', { status: 'read_only' }) },
    { name: 'read-only-flag', allowed: true, prepare: () => grant('close_assurance', { readOnly: true }) },
    { name: 'required-accounting-suspended', allowed: false, browser: true, prepare: async () => { await grant('close_assurance'); await grant('accounting', { status: 'suspended' }); } },
    { name: 'recommended-reconciliation-suspended', allowed: true, prepare: async () => { await grant('accounting'); await grant('payment_reconciliation', { status: 'suspended' }); } },
    { name: 'stopped-new-work-retained-read', allowed: true, browser: true, prepare: () => db.tenantModuleConfiguration.update({ where: { organizationId: org.id }, data: { selectedModules: modules.filter(m => m !== 'close_assurance'), activeModules: modules.filter(m => m !== 'close_assurance'), newWorkStoppedModules: ['close_assurance'] } }) },
    { name: 'permission-revoked', allowed: false, moduleAllowed: true, browser: true, permissions: ['dashboard.read', 'analytics.read'], prepare: () => db.role.update({ where: { id: role.id }, data: { permissions: ['dashboard.read', 'analytics.read'] } }) },
  ];
  const contexts = {};
  const selectedCases = process.argv.includes('--destination-evidence') ? cases.filter(test => ['explicit-empty', 'active', 'read-only', 'permission-revoked'].includes(test.name)) : cases;
  for (const test of selectedCases) {
    await test.prepare();
    const actorPermissions = test.permissions ?? permissions;
    const decision = await observeModuleAccess({ organizationId: org.id, userId: actor.id, actorPermissions, moduleSlug: 'close_assurance', surfaceType: 'report', surface: 'owned-digest-close-matrix', mode: 'enforce', accessIntent: 'read', audit: true, now });
    assert.equal(decision.allowed, test.moduleAllowed ?? test.allowed);
    const row = { name: test.name, allowed: test.allowed, locales: [] }; result.checks.push(row);
    for (const locale of ['en', 'fr']) {
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions, actorRoleCodes: ['owner'], locale, now });
      const accountant = data.digests.find(d => d.id === 'accountant-close');
      assert.equal(Boolean(accountant), test.allowed, test.name + ': Accountant workspace follows grant and permission');
      if (accountant) assert.equal(accountant.zones[0].primaryMetric.value, 83);
      assert.equal(JSON.stringify(data).includes('close-runs-blocked'), test.allowed, test.name + ': blocker details in owner/weekly');
      assert.equal(data.digests.flatMap(d => d.actions).some(a => a.href.endsWith('/accounting/close')), test.allowed, test.name + ': source handoff');
      if (!test.allowed) assert.ok(data.digests[0].blockers.some(b => b.gate === 'restricted_source' && b.severity === 'high'));
      const item = { locale, service: true }; row.locales.push(item);
      if (!test.browser || process.argv.includes('--service-only')) continue;
      if (!browser) browser = await chromium.launch({ headless: true });
      if (!contexts[locale]) {
        const context = await browser.newContext({ viewport: { width: locale === 'en' ? 1440 : 320, height: 1000 }, reducedMotion: 'reduce' });
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200); contexts[locale] = context;
      }
      const page = await contexts[locale].newPage(), errors = []; page.on('pageerror', error => errors.push(f.safe(error, secrets)));
      const response = await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
      assert.equal((await response.text()).includes('close-runs-blocked'), test.allowed, test.name + ': server-rendered privacy');
      await expect(page.getByRole('button', { name: locale === 'en' ? 'Owner' : 'Dirigeant', exact: true })).toBeEnabled();
      const selector = page.getByRole('button', { name: locale === 'en' ? 'Accountant' : 'Comptable', exact: true });
      if (test.allowed) { await expect(selector).toBeEnabled(); await selector.focus(); await page.keyboard.press('Enter'); await expect(selector).toHaveAttribute('aria-pressed', 'true'); }
      else { await expect(selector).toHaveCount(0); await expect(page.getByText(locale === 'en' ? 'Restricted source details' : 'Détails de source restreints', { exact: true }).first()).toBeVisible(); }
      const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true });
      await expect(command).toBeEnabled(); await command.focus(); await page.keyboard.press('Enter'); await expect(command).toHaveAttribute('aria-pressed', 'true');
      const links = page.locator('#daily-digest-view a[href$="/accounting/close"]');
      if (test.allowed) await expect(links.first()).toBeVisible(); else await expect(links).toHaveCount(0);
      const screenshot = 'digest-close-access-' + stamp + '-' + test.name + '-' + locale + '.png'; await page.screenshot({ path: path.join(__dirname, screenshot), animations: 'disabled', caret: 'initial' });
      await page.goto(base + '/' + locale + '/dashboard/accounting/close', { waitUntil: 'domcontentloaded', timeout: 120000 });
      if (test.allowed) {
        await expect(page.getByRole('heading', { name: locale === 'en' ? 'Close & Assurance Center' : 'Centre De Cloture', exact: true })).toBeVisible();
        await expect(page.getByText(period.name, { exact: false }).first()).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { name: locale === 'en' ? 'Close & Assurance Center' : 'Centre De Cloture', exact: true })).toHaveCount(0);
        await expect(page.getByText(period.name, { exact: false })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: test.name === 'permission-revoked' ? (locale === 'en' ? 'Close center is not available for this role' : 'Accès à la comptabilité refusé') : (locale === 'en' ? 'Close Assurance is not available' : 'L’assurance de clôture est indisponible'), exact: true })).toBeVisible();
      }
      item.destinationReadVerified = true;
      if (process.argv.includes('--destination-evidence')) {
        item.destinationScreenshot = 'digest-close-access-' + stamp + '-' + test.name + '-' + locale + '-destination.png';
        await page.screenshot({ path: path.join(__dirname, item.destinationScreenshot), animations: 'disabled', caret: 'initial' });
        await page.goto(base + '/' + locale + '/dashboard/accounting/close/' + period.id, { waitUntil: 'domcontentloaded', timeout: 120000 });
        if (test.allowed) await expect(page.getByText(period.name, { exact: false }).first()).toBeVisible();
        else {
          await expect(page.getByText(period.name, { exact: false })).toHaveCount(0);
          await expect(page.getByRole('heading', { name: test.name === 'permission-revoked' ? (locale === 'en' ? 'Close assurance details is not available for this role' : 'Accès à la comptabilité refusé') : (locale === 'en' ? 'Close Assurance is not available' : 'L’assurance de clôture est indisponible'), exact: true })).toBeVisible();
        }
        item.periodReadVerified = true;
      }
      assert.deepEqual(errors, []); item.browser = true; item.screenshot = screenshot; await page.close();
    }
    console.log(test.name + ': passed');
  }
  assert.equal((await getCloseReadinessSnapshot({ organizationId: org.id, now })).sourceHash, rawBefore.sourceHash);
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.rawEvidenceUnchanged = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-close-access-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: result.passed, checks: result.checks.length, error: result.error })); await db.$disconnect();
});
