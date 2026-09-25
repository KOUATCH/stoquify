const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const value = originalTarget(); value.searchParams.set('connection_limit', '2'); return value; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const { observeModuleAccess } = require(path.join(f.root, 'services/modules/module-entitlement.service.ts'));
const { getPaymentTruthSnapshot } = require(path.join(f.root, 'services/snapshots/payment-truth-snapshot.service.ts'));
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const files = ['services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-source-visibility.ts', 'services/modules/module-entitlement.service.ts', 'services/snapshots/payment-truth-snapshot.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] }; let browser;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Finance module read ' + stamp, slug: 'digest-finance-' + stamp, currency: 'XAF' } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password);
  const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'finance.read', 'payments.reconciliation.read', 'analytics.read'];
  await db.role.create({ data: { organizationId: org.id, code: 'owner', nameEn: 'Owned finance reader', permissions, users: { connect: { id: actor.id } } } });
  await db.suspenseItem.create({ data: { organizationId: org.id, type: 'OTHER', amount: '987654.32', currencyCode: 'XAF' } });
  const modules = getModuleCatalog().map(item => item.slug), now = new Date();
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-owned-finance-matrix', selectedModules: modules, activeModules: modules } });
  const grant = (slug, data = {}) => db.tenantModuleGrant.upsert({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: slug } }, create: { organizationId: org.id, moduleSlug: slug, status: 'active', source: 'requested_modules', ...data }, update: { status: 'active', readOnly: false, startsAt: null, endsAt: null, ...data } });
  const effects = async () => JSON.stringify({ suspense: await db.suspenseItem.findMany({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects(), rawBefore = await getPaymentTruthSnapshot({ organizationId: org.id, now });
  const cases = [
    { name: 'explicit-empty', finance: false, recon: false, browser: true, prepare: async () => {} },
    { name: 'active', finance: true, recon: true, browser: true, prepare: async () => { for (const slug of modules) await grant(slug); } },
    { name: 'finance-suspended', finance: false, recon: false, browser: true, prepare: () => grant('finance', { status: 'suspended' }) },
    { name: 'finance-expired', finance: false, recon: false, prepare: () => grant('finance', { endsAt: new Date(now.getTime() - 86400000) }) },
    { name: 'finance-future', finance: false, recon: false, prepare: () => grant('finance', { startsAt: new Date(now.getTime() + 86400000) }) },
    { name: 'finance-missing', finance: false, recon: false, prepare: () => db.tenantModuleGrant.delete({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: 'finance' } } }) },
    { name: 'finance-read-only', finance: true, recon: true, browser: true, prepare: () => grant('finance', { status: 'read_only' }) },
    { name: 'finance-read-only-flag', finance: true, recon: true, prepare: () => grant('finance', { readOnly: true }) },
    { name: 'reconciliation-suspended', finance: true, recon: false, browser: true, prepare: async () => { await grant('finance'); await grant('payment_reconciliation', { status: 'suspended' }); } },
    { name: 'accounting-dependency-suspended', finance: true, recon: false, prepare: async () => { await grant('payment_reconciliation'); await grant('accounting', { status: 'suspended' }); } },
    { name: 'stopped-new-work-retained-read', finance: true, recon: true, browser: true, prepare: async () => { await grant('accounting'); await db.tenantModuleConfiguration.update({ where: { organizationId: org.id }, data: { selectedModules: modules.filter(m => m !== 'finance'), activeModules: modules.filter(m => m !== 'finance'), newWorkStoppedModules: ['finance'] } }); } },
  ];
  const contexts = {};
  for (const test of cases) {
    await test.prepare();
    const decision = async moduleSlug => observeModuleAccess({ organizationId: org.id, userId: actor.id, actorPermissions: permissions, moduleSlug, surfaceType: 'report', surface: 'owned-digest-finance-matrix', mode: 'enforce', accessIntent: 'read', audit: true, now });
    assert.equal((await decision('finance')).allowed, test.finance);
    assert.equal((await decision('payment_reconciliation')).allowed, test.recon);
    const row = { name: test.name, finance: test.finance, reconciliation: test.recon, locales: [] }; result.checks.push(row);
    for (const locale of ['en', 'fr']) {
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions: permissions, actorRoleCodes: ['owner'], locale, now });
      assert.equal(data.digests.some(d => d.id === 'finance-cash'), test.finance, test.name + ': Finance workspace follows grant');
      assert.equal(JSON.stringify(data).includes('987654.32'), test.finance, test.name + ': no suspense detail via owner/weekly/blockers');
      assert.equal(data.digests.flatMap(d => d.actions).some(a => a.href.endsWith('/finance/reconciliation')), test.recon, test.name + ': reconciliation handoff follows destination grant');
      const item = { locale, service: true }; row.locales.push(item);
      if (!test.browser || process.argv.includes('--service-only')) continue;
      if (!browser) browser = await chromium.launch({ headless: true });
      if (!contexts[locale]) {
        const context = await browser.newContext({ viewport: { width: locale === 'en' ? 1440 : 320, height: 1000 }, reducedMotion: 'reduce' });
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
        contexts[locale] = context;
      }
      const page = await contexts[locale].newPage(), errors = []; page.on('pageerror', error => errors.push(f.safe(error, secrets)));
      const response = await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
      assert.equal((await response.text()).includes('987654.32'), test.finance, test.name + ': SSR amount privacy');
      const financeButton = page.getByRole('button', { name: 'Finance', exact: true });
      await expect(page.getByRole('button', { name: locale === 'en' ? 'Owner' : 'Dirigeant', exact: true })).toBeEnabled();
      if (test.finance) { await expect(financeButton).toBeEnabled(); await financeButton.focus(); await page.keyboard.press('Enter'); await expect(financeButton).toHaveAttribute('aria-pressed', 'true'); }
      else { await expect(financeButton).toHaveCount(0); await expect(page.getByText(locale === 'en' ? 'Restricted source details' : 'Détails de source restreints', { exact: true }).first()).toBeVisible(); }
      const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true });
      await expect(command).toBeEnabled(); await command.focus(); await page.keyboard.press('Enter'); await expect(command).toHaveAttribute('aria-pressed', 'true');
      const view = page.locator('#daily-digest-view');
      if (test.recon) await expect(view.locator('a[href$="/finance/reconciliation"]').first()).toBeVisible();
      else await expect(view.locator('a[href$="/finance/reconciliation"]')).toHaveCount(0);
      const screenshot = 'digest-finance-' + stamp + '-' + test.name + '-' + locale + '.png';
      await page.screenshot({ path: path.join(__dirname, screenshot), animations: 'disabled', caret: 'initial' });
      assert.deepEqual(errors, []); item.browser = true; item.screenshot = screenshot;
      await page.close();
    }
    console.log(test.name + ': passed');
  }
  assert.equal((await getPaymentTruthSnapshot({ organizationId: org.id, now })).sourceHash, rawBefore.sourceHash);
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.rawEvidenceUnchanged = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-finance-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: result.passed, checks: result.checks.length, error: result.error })); await db.$disconnect();
});
