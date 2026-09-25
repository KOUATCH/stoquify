const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const url = originalTarget(); url.searchParams.set('connection_limit', '2'); return url; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const files = ['services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-digest-presentation.ts', 'components/daily-habit/DailyHabitDigestDashboard.tsx', 'app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx', 'services/operating-access/operating-access-scope.service.ts', 'services/operating-access/operating-access-scope-contracts.ts', 'services/owner-war-room/owner-war-room.service.ts', 'services/manager-action-center/manager-action-center-query.service.ts', 'app/[locale]/(dashboard)/dashboard/owner-war-room/owner-war-room-route-access.tsx', 'messages/en.json', 'messages/fr.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const managerBrowserOnly = process.argv.includes('--manager-browser-only');
const result = { at: new Date().toISOString(), sourceBefore: hashes(), managerBrowserOnly, checks: [] }; let browser, activePage;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Handoff authority ' + stamp, slug: 'handoff-authority-' + stamp, currency: 'XAF', timezone: 'UTC' } });
  const foreign = await db.organization.create({ data: { name: helper.prefix + 'Foreign handoff ' + stamp, slug: 'foreign-handoff-' + stamp } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'owner', nameEn: 'Owned handoff reader', permissions, users: { connect: { id: actor.id } } } });
  const location = await db.location.create({ data: { organizationId: org.id, name: 'Owned managed site', code: 'HANDOFF' } });
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-handoff', selectedModules: ['dashboard'], activeModules: ['dashboard'] } });
  await db.tenantModuleGrant.create({ data: { organizationId: org.id, moduleSlug: 'dashboard', source: 'requested_modules', status: 'active' } });
  const effects = async () => JSON.stringify({ payments: await db.payment.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects();
  const changeLocation = data => db.location.update({ where: { id: location.id }, data });
  const cases = [
    { name: 'owner-label-only', code: 'owner', owner: false, manager: false, browser: true },
    { name: 'administrator', code: 'administrator', owner: true, manager: true, browser: true },
    { name: 'owner-authority-revoked', code: 'owner', owner: false, manager: false, browser: true, cached: 'owner' },
    { name: 'manager-unassigned', code: 'manager', owner: false, manager: false },
    { name: 'manager-assigned', code: 'manager', owner: false, manager: true, browser: true, prepare: () => changeLocation({ managerId: actor.id }) },
    { name: 'manager-inactive-site', code: 'manager', owner: false, manager: false, prepare: () => changeLocation({ isActive: false }) },
    { name: 'manager-deleted-site', code: 'manager', owner: false, manager: false, prepare: () => changeLocation({ isActive: true, deletedAt: new Date() }) },
    { name: 'foreign-site-only', code: 'manager', owner: false, manager: false, prepare: () => db.location.create({ data: { organizationId: foreign.id, name: 'Foreign secret site', code: 'FOREIGN', managerId: actor.id } }) },
    { name: 'manager-assignment-revoked', code: 'manager', owner: false, manager: false, browser: true, cached: 'manager', prepare: () => changeLocation({ managerId: null, deletedAt: null }) },
    { name: 'manager-assignment-restored', code: 'manager', owner: false, manager: true, prepare: () => changeLocation({ managerId: actor.id }) },
  ];
  const contexts = {}, cached = { en: {}, fr: {} };
  const deny = async (page, locale, kind) => {
    const title = kind === 'owner' ? (locale === 'en' ? 'Owner War Room is not available for this role' : 'L’espace Dirigeant est indisponible pour ce rôle') : locale === 'en' ? 'Manager Action Center is unavailable for this operating scope' : "Le centre d'actions est indisponible pour ce perimetre";
    await expect(page.locator('main').last().getByRole('heading', { name: title, exact: true })).toBeVisible();
  };
  for (const test of cases) {
    await test.prepare?.(); await db.role.update({ where: { id: role.id }, data: { code: test.code } });
    const row = { name: test.name, owner: test.owner, manager: test.manager, locales: [] }; result.checks.push(row);
    for (const locale of ['en', 'fr']) {
      const context = { orgId: org.id, userId: actor.id, permissions, roles: [{ id: role.id, name: role.nameEn, code: test.code, permissions }], isSuperUser: false };
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions: permissions, actorRoleCodes: [test.code], operatingAccessContext: context, locale });
      const selectedId = test.code === 'manager' ? 'manager-run-sheet' : 'owner-morning';
      const digest = data.digests.find(d => d.id === selectedId), end = data.digests.find(d => d.id === 'end-of-day'); assert.ok(digest); assert.ok(end);
      assert.equal(digest.commandBrief.drillThrough.available, test.code === 'manager' ? test.manager : test.owner);
      assert.equal(end.commandBrief.drillThrough.available, test.manager);
      assert.ok(!JSON.stringify(data).includes('Foreign secret site'));
      const entry = { locale, service: true }; row.locales.push(entry);
      if (!test.browser || process.argv.includes('--service-only') || (managerBrowserOnly && !test.name.startsWith('manager-'))) continue;
      if (!browser) browser = await chromium.launch({ headless: true });
      if (!contexts[locale]) {
        const browserContext = await browser.newContext({ viewport: { width: locale === 'en' ? 1440 : 320, height: 1000 }, reducedMotion: 'reduce' });
        await browserContext.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        assert.equal((await browserContext.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200); contexts[locale] = browserContext;
      }
      const page = await contexts[locale].newPage();
      activePage = page;
      if (test.cached) { assert.ok(cached[locale][test.cached]); await page.goto(cached[locale][test.cached], { waitUntil: 'domcontentloaded', timeout: 120000 }); await deny(page, locale, test.cached); entry.cachedRevocation = true; entry.denialScreenshot = 'digest-handoff-' + stamp + '-' + test.name + '-' + locale + '-denied.png'; await page.screenshot({ path: path.join(__dirname, entry.denialScreenshot), animations: 'disabled', caret: 'initial' }); }
      await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const selector = page.getByRole('button', { name: test.code === 'manager' ? (locale === 'en' ? 'Manager' : 'Responsable') : (locale === 'en' ? 'Owner' : 'Dirigeant'), exact: true });
      await expect(selector).toBeEnabled(); await selector.focus(); await page.keyboard.press('Enter'); await expect(selector).toHaveAttribute('aria-pressed', 'true');
      const allowed = test.code === 'manager' ? test.manager : test.owner, main = page.locator('main').last();
      const destination = '/' + locale + '/dashboard/' + (test.code === 'manager' ? 'manager-action-center' : 'owner-war-room');
      if (!allowed) {
        await expect(main.getByText(digest.commandBrief.drillThrough.unavailableReason, { exact: true }).first()).toBeVisible();
        await expect(main.locator('a[href="' + destination + '"]')).toHaveCount(0);
        await main.getByText(digest.commandBrief.drillThrough.unavailableReason, { exact: true }).first().scrollIntoViewIfNeeded();
      }
      if (allowed) await main.locator('a[href="' + destination + '"]').first().scrollIntoViewIfNeeded();
      entry.screenshot = 'digest-handoff-' + stamp + '-' + test.name + '-' + locale + '.png'; await page.screenshot({ path: path.join(__dirname, entry.screenshot), animations: 'disabled', caret: 'initial' });
      if (allowed) {
        const kind = test.code === 'manager' ? 'manager' : 'owner'; cached[locale][kind] = base + destination;
        const sourceUrl = page.url();
        const link = main.locator('a[href="' + destination + '"]').first(); await expect(link).toBeVisible(); await link.focus(); await page.keyboard.press('Enter'); await page.waitForURL(base + destination + '#top', { timeout: 120000 });
        const title = kind === 'owner' ? (locale === 'en' ? 'Owner War Room' : 'Salle de controle proprietaire') : (locale === 'en' ? 'Manager Action Center' : "Centre d'actions manager");
        const heading = page.locator('main').last().getByRole('heading', { name: title, exact: true }).first();
        await expect(heading).toBeVisible();
        await expect(page.locator('main').last().getByRole('heading').first()).toBeInViewport();
        entry.destinationBeforeInspection = { headingBounds: await heading.boundingBox(), viewport: page.viewportSize(), scroll: await page.evaluate(() => ({ windowY: window.scrollY, containers: Array.from(document.querySelectorAll('*')).filter(el => el.scrollTop > 0).slice(0, 8).map(el => ({ tag: el.tagName, id: el.id, scrollTop: el.scrollTop })) })) };
        await heading.scrollIntoViewIfNeeded();
        if (kind === 'manager') { await expect(page.locator('main').last().getByText('Owned managed site', { exact: true }).first()).toBeVisible(); await expect(page.getByText('Foreign secret site', { exact: true })).toHaveCount(0); }
        entry.destinationScreenshot = 'digest-handoff-' + stamp + '-' + test.name + '-' + locale + '-destination.png'; await page.screenshot({ path: path.join(__dirname, entry.destinationScreenshot), animations: 'disabled', caret: 'initial' });
        entry.keyboardHandoff = true;
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 120000 });
        await expect(page).toHaveURL(sourceUrl);
        await expect(page.getByRole('button', { name: test.code === 'manager' ? (locale === 'en' ? 'Manager' : 'Responsable') : (locale === 'en' ? 'Owner' : 'Dirigeant'), exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('main').last().locator('a[href="' + destination + '"]').first()).toBeInViewport();
        entry.backRestored = true;
      }
      entry.browser = true; await page.close();
    }
    console.log(test.name + ': passed');
  }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; if (activePage && !activePage.isClosed()) { try { result.failurePage = { url: activePage.url(), state: await activePage.evaluate(() => ({ readyState: document.readyState, headings: Array.from(document.querySelectorAll('main h1')).map(el => el.textContent) })) }; result.failureScreenshot = 'digest-handoff-' + stamp + '-failure.png'; await activePage.screenshot({ path: path.join(__dirname, result.failureScreenshot), animations: 'disabled', caret: 'initial', timeout: 15000 }); } catch (captureError) { result.captureError = f.safe(captureError, secrets); } } }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-handoff-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: result.passed, checks: result.checks.length, error: result.error })); await db.$disconnect();
});
