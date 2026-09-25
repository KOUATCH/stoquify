const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const value = originalTarget(); value.searchParams.set('connection_limit', '2'); return value; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const { getInventoryCashSnapshot } = require(path.join(f.root, 'services/snapshots/inventory-cash-snapshot.service.ts'));
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const files = ['services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-source-visibility.ts', 'services/modules/module-entitlement.service.ts', 'services/snapshots/inventory-cash-snapshot.service.ts', 'app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts', 'app/[locale]/(dashboard)/dashboard/inventory/inventory-route-access.tsx', 'actions/itemsShow/getOrgItemsWithInventoryLevels.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] }; let browser;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Stock module read ' + stamp, slug: 'digest-stock-access-' + stamp, currency: 'XAF' } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'inventory.read', 'inventory.items.read', 'analytics.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'owner', nameEn: 'Owned stock reader', permissions, users: { connect: { id: actor.id } } } });
  const location = await db.location.create({ data: { organizationId: org.id, name: 'Owned stock location', code: 'STOCK' } });
  const item = await db.item.create({ data: { organizationId: org.id, nameEn: 'Owned Stock Access Item', nameFr: 'Article de contrôle de stock', sku: 'STOCK-' + stamp, slug: 'stock-' + stamp, imageUrls: [] } });
  await db.inventoryLevel.create({ data: { itemId: item.id, locationId: location.id, quantityOnHand: 10, quantityReserved: 11, quantityAvailable: -1, totalValue: 2468135, averageCost: 246813.5 } });
  const now = new Date(), modules = getModuleCatalog().map(item => item.slug);
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-owned-stock-matrix', selectedModules: modules, activeModules: modules } });
  const grant = (data = {}) => db.tenantModuleGrant.upsert({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: 'inventory' } }, create: { organizationId: org.id, moduleSlug: 'inventory', status: 'active', source: 'requested_modules', ...data }, update: { status: 'active', readOnly: false, startsAt: null, endsAt: null, ...data } });
  const effects = async () => JSON.stringify({ stock: await db.inventoryLevel.findMany({ where: { itemId: item.id } }), item: await db.item.findUnique({ where: { id: item.id } }), transactions: await db.inventoryTransaction.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects(), rawBefore = await getInventoryCashSnapshot({ organizationId: org.id, now });
  const cases = [
    { name: 'explicit-empty', summary: false, details: false, browser: true, prepare: async () => {} },
    { name: 'active', summary: true, details: true, browser: true, prepare: () => grant() },
    { name: 'suspended', summary: false, details: false, browser: true, prepare: () => grant({ status: 'suspended' }) },
    { name: 'expired', summary: false, details: false, prepare: () => grant({ endsAt: new Date(now.getTime() - 86400000) }) },
    { name: 'future', summary: false, details: false, prepare: () => grant({ startsAt: new Date(now.getTime() + 86400000) }) },
    { name: 'missing', summary: false, details: false, prepare: () => db.tenantModuleGrant.delete({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: 'inventory' } } }) },
    { name: 'read-only', summary: true, details: true, browser: true, prepare: () => grant({ status: 'read_only' }) },
    { name: 'read-only-flag', summary: true, details: true, prepare: () => grant({ readOnly: true }) },
    { name: 'stopped-new-work-retained-read', summary: true, details: true, browser: true, prepare: () => db.tenantModuleConfiguration.update({ where: { organizationId: org.id }, data: { selectedModules: modules.filter(m => m !== 'inventory'), activeModules: modules.filter(m => m !== 'inventory'), newWorkStoppedModules: ['inventory'] } }) },
    { name: 'summary-only', summary: true, details: false, browser: true, permissions: ['dashboard.read', 'inventory.read', 'analytics.read'], prepare: async () => {} },
    { name: 'details-only', summary: false, details: true, browser: true, permissions: ['dashboard.read', 'inventory.items.read', 'analytics.read'], prepare: async () => {} },
    { name: 'permission-revoked', summary: false, details: false, browser: true, permissions: ['dashboard.read', 'analytics.read'], prepare: async () => {} },
  ];
  const contexts = {};
  for (const test of cases) {
    await test.prepare(); const actorPermissions = test.permissions ?? permissions;
    await db.role.update({ where: { id: role.id }, data: { permissions: actorPermissions } });
    const row = { name: test.name, summary: test.summary, details: test.details, locales: [] }; result.checks.push(row);
    for (const locale of ['en', 'fr']) {
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions, actorRoleCodes: ['owner'], locale, now });
      const stockkeeper = data.digests.find(d => d.id === 'stockkeeper-stock');
      assert.equal(Boolean(stockkeeper), test.summary, test.name + ': Stockkeeper workspace');
      if (stockkeeper) assert.equal(stockkeeper.zones[0].primaryMetric.value, 2468135);
      assert.equal(JSON.stringify(data).includes('inventory-negative-stock'), test.summary || test.details, test.name + ': source warning details');
      assert.equal(data.digests.flatMap(d => d.actions).some(a => a.href.endsWith('/inventory/items')), test.details, test.name + ': item handoff');
      if (!test.summary && !test.details) assert.ok(data.digests[0].blockers.some(b => b.gate === 'restricted_source' && b.severity === 'high'));
      const entry = { locale, service: true }; row.locales.push(entry);
      if (!test.browser || process.argv.includes('--service-only')) continue;
      if (!browser) browser = await chromium.launch({ headless: true });
      if (!contexts[locale]) {
        const context = await browser.newContext({ viewport: { width: locale === 'en' ? 1440 : 320, height: 1000 }, reducedMotion: 'reduce' });
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200); contexts[locale] = context;
      }
      const page = await contexts[locale].newPage(), errors = []; page.on('pageerror', error => errors.push(f.safe(error, secrets)));
      const response = await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
      assert.equal((await response.text()).includes('inventory-negative-stock'), test.summary || test.details, test.name + ': SSR privacy');
      await expect(page.getByRole('button', { name: locale === 'en' ? 'Owner' : 'Dirigeant', exact: true })).toBeEnabled();
      const selector = page.getByRole('button', { name: locale === 'en' ? 'Stockkeeper' : 'Magasinier', exact: true });
      if (test.summary) { await expect(selector).toBeEnabled(); await selector.focus(); await page.keyboard.press('Enter'); await expect(selector).toHaveAttribute('aria-pressed', 'true'); }
      else await expect(selector).toHaveCount(0);
      if (!test.summary && test.details) {
        // Detail-only inventory signals belong to the cross-domain weekly view.
        const weekly = page.getByRole('button', { name: locale === 'en' ? 'Weekly' : 'Hebdomadaire', exact: true });
        await weekly.focus(); await page.keyboard.press('Enter'); await expect(weekly).toHaveAttribute('aria-pressed', 'true');
      }
      const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true });
      await expect(command).toBeEnabled(); await command.focus(); await page.keyboard.press('Enter'); await expect(command).toHaveAttribute('aria-pressed', 'true');
      const links = page.locator('#daily-digest-view a[href$="/inventory/items"]');
      if (test.details) await expect(links.first()).toBeVisible(); else await expect(links).toHaveCount(0);
      entry.screenshot = 'digest-stock-access-' + stamp + '-' + test.name + '-' + locale + '.png'; await page.screenshot({ path: path.join(__dirname, entry.screenshot), animations: 'disabled', caret: 'initial' });
      if (!process.argv.includes('--digest-only')) {
        await page.goto(base + '/' + locale + '/dashboard/inventory/items', { waitUntil: 'domcontentloaded', timeout: 120000 });
        if (test.details) await expect(page.getByText(item.sku, { exact: true }).first()).toBeVisible();
        else {
          await expect(page.getByText(item.sku, { exact: true })).toHaveCount(0);
          const deniedPermission = !actorPermissions.includes('inventory.items.read');
          await expect(page.getByRole('heading', { name: deniedPermission ? (locale === 'en' ? 'Inventory items is not available for this role' : 'Accès à l’inventaire refusé') : (locale === 'en' ? 'Inventory is not available' : 'L’inventaire est indisponible'), exact: true })).toBeVisible();
        }
        entry.destinationScreenshot = 'digest-stock-access-' + stamp + '-' + test.name + '-' + locale + '-destination.png'; await page.screenshot({ path: path.join(__dirname, entry.destinationScreenshot), animations: 'disabled', caret: 'initial' }); entry.destinationVerified = true;
      }
      assert.deepEqual(errors, []); entry.browser = true; await page.close();
    }
    console.log(test.name + ': passed');
  }
  assert.equal((await getInventoryCashSnapshot({ organizationId: org.id, now })).sourceHash, rawBefore.sourceHash);
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.rawEvidenceUnchanged = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-stock-access-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: result.passed, checks: result.checks.length, error: result.error })); await db.$disconnect();
});
