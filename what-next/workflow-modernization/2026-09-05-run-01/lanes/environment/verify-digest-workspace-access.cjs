const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const value = originalTarget(); value.searchParams.set('connection_limit', '2'); return value; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const files = ['services/daily-habit/daily-habit-digest.service.ts', 'components/daily-habit/DailyHabitDigestDashboard.tsx', 'app/[locale]/(dashboard)/dashboard/analytics/analytics-route-access.tsx', 'app/[locale]/(dashboard)/dashboard/analytics/analytics-route-data-access.ts', 'services/modules/module-entitlement.service.ts', 'messages/en.json', 'messages/fr.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const browserFrom = process.argv.find(value => value.startsWith('--browser-from='))?.split('=')[1];
const result = { at: new Date().toISOString(), browserFrom, sourceBefore: hashes(), checks: [] }; let browser;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Workspace reads ' + stamp, slug: 'digest-workspace-' + stamp, currency: 'XAF', timezone: 'UTC' } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'analytics.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'owner', nameEn: 'Owned workspace reader', permissions, users: { connect: { id: actor.id } } } });
  const location = await db.location.create({ data: { organizationId: org.id, name: 'Owned workspace site', code: 'READ' } });
  const customer = await db.customer.create({ data: { organizationId: org.id, name: 'Owned workspace customer' } });
  const now = new Date(), today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (const [offset, amount] of [[-2, 222], [0, 111]]) await db.salesOrder.create({ data: { organizationId: org.id, customerId: customer.id, locationId: location.id, createdById: actor.id, orderNumber: 'READ-' + offset + '-' + stamp, status: 'COMPLETED', orderDate: new Date(today.getTime() + offset * 86400000), subtotal: amount, total: amount } });
  const modules = getModuleCatalog().map(item => item.slug);
  const grant = (moduleSlug, data = {}) => db.tenantModuleGrant.upsert({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug } }, create: { organizationId: org.id, moduleSlug, status: 'active', source: 'requested_modules', ...data }, update: { status: 'active', readOnly: false, startsAt: null, endsAt: null, ...data } });
  const remove = moduleSlug => db.tenantModuleGrant.delete({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug } } });
  const stop = moduleSlug => db.tenantModuleConfiguration.update({ where: { organizationId: org.id }, data: { selectedModules: modules.filter(m => m !== moduleSlug), activeModules: modules.filter(m => m !== moduleSlug), newWorkStoppedModules: [moduleSlug] } });
  const effects = async () => JSON.stringify({ sales: await db.salesOrder.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } }), payments: await db.payment.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects();
  const cases = [
    { name: 'legacy-default', core: true, weekly: true, destination: true, browser: true, prepare: async () => {} },
    { name: 'explicit-empty', core: false, weekly: false, destination: false, browser: true, prepare: () => db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-workspace-access', selectedModules: modules, activeModules: modules } }) },
    { name: 'both-active', core: true, weekly: true, destination: true, browser: true, prepare: async () => { await grant('dashboard'); await grant('analytics'); } },
    { name: 'analytics-suspended', core: true, weekly: false, destination: false, browser: true, prepare: () => grant('analytics', { status: 'suspended' }) },
    { name: 'analytics-expired', core: true, weekly: false, destination: false, prepare: () => grant('analytics', { endsAt: new Date(now.getTime() - 86400000) }) },
    { name: 'analytics-future', core: true, weekly: false, destination: false, prepare: () => grant('analytics', { startsAt: new Date(now.getTime() + 86400000) }) },
    { name: 'analytics-missing', core: true, weekly: false, destination: false, prepare: () => remove('analytics') },
    { name: 'analytics-read-only', core: true, weekly: true, destination: true, browser: true, prepare: () => grant('analytics', { status: 'read_only' }) },
    { name: 'analytics-read-only-flag', core: true, weekly: true, destination: true, prepare: () => grant('analytics', { readOnly: true }) },
    { name: 'recommended-reports-suspended', core: true, weekly: true, destination: true, prepare: () => grant('reports', { status: 'suspended' }) },
    { name: 'analytics-stopped-retained', core: true, weekly: true, destination: true, browser: true, prepare: () => stop('analytics') },
    { name: 'dashboard-suspended', core: false, weekly: true, destination: true, browser: true, prepare: () => grant('dashboard', { status: 'suspended' }) },
    { name: 'dashboard-expired', core: false, weekly: true, destination: true, prepare: () => grant('dashboard', { endsAt: new Date(now.getTime() - 86400000) }) },
    { name: 'dashboard-future', core: false, weekly: true, destination: true, prepare: () => grant('dashboard', { startsAt: new Date(now.getTime() + 86400000) }) },
    { name: 'dashboard-missing', core: false, weekly: true, destination: true, prepare: () => remove('dashboard') },
    { name: 'dashboard-read-only', core: true, weekly: true, destination: true, prepare: () => grant('dashboard', { status: 'read_only' }) },
    { name: 'dashboard-stopped-retained', core: true, weekly: true, destination: true, prepare: () => stop('dashboard') },
    { name: 'analytics-only-permission', core: false, weekly: true, destination: false, browser: true, permissions: ['analytics.read'], prepare: async () => {} },
    { name: 'analytics-permission-revoked', core: true, weekly: false, destination: true, browser: true, permissions: ['dashboard.read'], prepare: async () => {} },
  ];
  const contexts = {}; let browserEnabled = !browserFrom;
  for (const test of cases) {
    if (test.name === browserFrom) browserEnabled = true;
    await test.prepare(); const actorPermissions = test.permissions ?? permissions;
    await db.role.update({ where: { id: role.id }, data: { permissions: actorPermissions } });
    const row = { name: test.name, core: test.core, weekly: test.weekly, destination: test.destination, locales: [] }; result.checks.push(row);
    for (const locale of ['en', 'fr']) {
      const start = performance.now();
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions, actorRoleCodes: ['owner'], locale, now });
      assert.equal(data.digests.some(d => d.id === 'owner-morning'), test.core, test.name + ': core workspace');
      const weekly = data.digests.find(d => d.id === 'weekly'); assert.equal(Boolean(weekly), test.weekly, test.name + ': weekly workspace');
      if (weekly) { assert.equal(weekly.zones[0].primaryMetric.value, 333); assert.equal(weekly.commandBrief.drillThrough.available, test.destination); }
      const entry = { locale, service: true, serviceMs: Math.round(performance.now() - start) }; row.locales.push(entry);
      if (!test.browser || !browserEnabled || process.argv.includes('--service-only')) continue;
      if (!browser) browser = await chromium.launch({ headless: true });
      if (!contexts[locale]) {
        const context = await browser.newContext({ viewport: { width: locale === 'en' ? 1440 : 320, height: 1000 }, reducedMotion: 'reduce' });
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200); contexts[locale] = context;
      }
      const page = await contexts[locale].newPage(), errors = []; page.on('pageerror', error => errors.push(f.safe(error, secrets)));
      await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const owner = page.getByRole('button', { name: locale === 'en' ? 'Owner' : 'Dirigeant', exact: true });
      if (test.core) await expect(owner).toBeEnabled(); else await expect(owner).toHaveCount(0);
      const selector = page.getByRole('button', { name: locale === 'en' ? 'Weekly' : 'Hebdomadaire', exact: true });
      if (test.weekly) { await expect(selector).toBeEnabled(); await selector.focus(); await page.keyboard.press('Enter'); await expect(selector).toHaveAttribute('aria-pressed', 'true'); }
      else await expect(selector).toHaveCount(0);
      if (!test.core && !test.weekly) await expect(page.getByRole('heading', { name: locale === 'en' ? 'No Daily Digest workspace is available' : 'Aucun espace de digest quotidien disponible', exact: true })).toBeVisible();
      if (test.name === 'analytics-only-permission') {
        await expect(page.getByTitle(weekly.commandBrief.drillThrough.unavailableReason, { exact: true }).first()).toBeDisabled();
        entry.explainedUnavailableHandoff = true;
      }
      entry.screenshot = 'digest-workspace-' + stamp + '-' + test.name + '-' + locale + '.png'; await page.screenshot({ path: path.join(__dirname, entry.screenshot), animations: 'disabled', caret: 'initial' });
      await page.goto(base + '/' + locale + '/dashboard/analytics', { waitUntil: 'domcontentloaded', timeout: 120000 });
      if (test.destination) await expect(page.getByRole('heading', { name: 'Business Pulse Analytics', exact: true })).toBeVisible();
      else {
        const accessCopy = JSON.parse(fs.readFileSync(path.join(f.root, 'messages', locale + '.json'), 'utf8')).analyticsAccess;
        await expect(page.getByRole('heading', { name: accessCopy[test.name === 'analytics-only-permission' ? 'FORBIDDEN' : 'MODULE_UNAVAILABLE'].title, exact: true })).toBeVisible();
      }
      entry.destinationScreenshot = 'digest-workspace-' + stamp + '-' + test.name + '-' + locale + '-destination.png'; await page.screenshot({ path: path.join(__dirname, entry.destinationScreenshot), animations: 'disabled', caret: 'initial' });
      entry.destinationVerified = true; assert.deepEqual(errors, []); entry.browser = true; await page.close();
    }
    console.log(test.name + ': passed');
  }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-workspace-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: result.passed, checks: result.checks.length, error: result.error })); await db.$disconnect();
});
