const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const url = originalTarget(); url.searchParams.set('connection_limit', '2'); return url; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const files = ['app/[locale]/(dashboard)/dashboard/owner-war-room/owner-war-room-route-access.tsx', 'app/[locale]/(dashboard)/dashboard/manager-action-center/manager-action-route-access.tsx', 'actions/owner-war-room/owner-war-room.actions.ts', 'actions/manager-action-center/manager-action-center.actions.ts', 'services/modules/module-entitlement.service.ts', 'messages/en.json', 'messages/fr.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] }; let browser;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Operating destinations ' + stamp, slug: 'operating-dest-' + stamp, currency: 'XAF', timezone: 'UTC' } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  await db.role.create({ data: { organizationId: org.id, code: 'administrator', nameEn: 'Owned operating reader', permissions: ['dashboard.read'], users: { connect: { id: actor.id } } } });
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-operating-read', selectedModules: ['dashboard'], activeModules: ['dashboard'] } });
  const effects = async () => JSON.stringify({ payments: await db.payment.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects();
  const grant = data => db.tenantModuleGrant.upsert({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: 'dashboard' } }, create: { organizationId: org.id, moduleSlug: 'dashboard', source: 'requested_modules', status: 'active', ...data }, update: { status: 'active', readOnly: false, startsAt: null, endsAt: null, ...data } });
  const cases = [
    { name: 'explicit-empty', allowed: false, prepare: async () => {} },
    { name: 'active', allowed: true, prepare: () => grant({}) },
    { name: 'suspended-after-read', allowed: false, prepare: () => grant({ status: 'suspended' }) },
    { name: 'stopped-retained', allowed: true, prepare: async () => { await grant({ status: 'read_only' }); await db.tenantModuleConfiguration.update({ where: { organizationId: org.id }, data: { selectedModules: [], activeModules: [], newWorkStoppedModules: ['dashboard'] } }); } },
  ];
  const destinations = [
    { slug: 'owner-war-room', titles: { en: 'Owner War Room', fr: 'Salle de controle proprietaire' } },
    { slug: 'manager-action-center', titles: { en: 'Manager Action Center', fr: "Centre d'actions manager" } },
    { slug: 'manager-action-center/daily-close', titles: { en: 'Branch daily close', fr: 'Cloture quotidienne du site' } },
  ];
  browser = await chromium.launch({ headless: true }); const pages = {};
  for (const locale of ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: locale === 'en' ? 1440 : 320, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    pages[locale] = await context.newPage();
  }
  for (const test of cases) {
    await test.prepare();
    for (const locale of ['en', 'fr']) for (const destination of destinations) {
      const page = pages[locale], started = performance.now();
      await page.goto(base + '/' + locale + '/dashboard/' + destination.slug, { waitUntil: 'domcontentloaded', timeout: 120000 });
      const title = test.allowed ? destination.titles[locale] : JSON.parse(fs.readFileSync(path.join(f.root, 'messages', locale + '.json'), 'utf8')).operatingWorkspaceAccess.title;
      const content = page.locator('main').last();
      await expect(content.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
      if (!test.allowed) {
        await expect(content.getByRole('heading', { name: destination.titles[locale], exact: true })).toHaveCount(0);
        const back = page.getByRole('link', { name: locale === 'en' ? 'Back to dashboard' : 'Retour au tableau de bord', exact: true });
        await back.focus(); await expect(back).toBeFocused();
      }
      const screenshot = 'operating-dest-' + stamp + '-' + test.name + '-' + locale + '-' + destination.slug.replaceAll('/', '-') + '.png';
      await page.screenshot({ path: path.join(__dirname, screenshot), animations: 'disabled', caret: 'initial' });
      result.checks.push({ name: test.name, locale, route: destination.slug, allowed: test.allowed, passed: true, elapsedMs: Math.round(performance.now() - started), screenshot });
    }
    console.log(test.name + ': passed');
  }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'operating-dest-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: result.passed, checks: result.checks.length, error: result.error })); await db.$disconnect();
});
