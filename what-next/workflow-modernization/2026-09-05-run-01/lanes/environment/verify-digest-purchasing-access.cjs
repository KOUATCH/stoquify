const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const value = originalTarget(); value.searchParams.set('connection_limit', '2'); return value; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const files = ['services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-digest-presentation.ts', 'services/modules/module-entitlement.service.ts', 'app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts', 'app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-access.tsx', 'actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] }; let browser;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.create({ data: { name: helper.prefix + 'Purchasing read ' + stamp, slug: 'digest-purchasing-' + stamp, currency: 'XAF' } });
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'purchases.orders.read', 'analytics.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'manager', nameEn: 'Owned purchasing reader', permissions, users: { connect: { id: actor.id } } } });
  const site = await db.location.create({ data: { organizationId: org.id, name: 'Owned purchasing site', code: 'PO' } });
  const supplier = await db.supplier.create({ data: { organizationId: org.id, name: 'Owned purchasing supplier' } });
  const now = new Date();
  const order = await db.purchaseOrder.create({ data: { organizationId: org.id, supplierId: supplier.id, locationId: site.id, createdById: actor.id, orderNumber: 'PURCH-' + stamp, status: 'SUBMITTED', expectedDeliveryDate: new Date(now.getTime() - 86400000) } });
  const modules = getModuleCatalog().map(item => item.slug);
  await db.tenantModuleConfiguration.create({ data: { organizationId: org.id, manifestHash: 'synthetic-owned-purchasing', selectedModules: modules, activeModules: modules } });
  const grant = (data = {}) => db.tenantModuleGrant.upsert({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: 'purchasing' } }, create: { organizationId: org.id, moduleSlug: 'purchasing', status: 'active', source: 'requested_modules', ...data }, update: { status: 'active', readOnly: false, startsAt: null, endsAt: null, ...data } });
  const effects = async () => JSON.stringify({ order: await db.purchaseOrder.findUnique({ where: { id: order.id } }), receipts: await db.goodsReceipt.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects();
  const cases = [
    { name: 'explicit-empty', allowed: false, browser: true, prepare: async () => {} },
    { name: 'active', allowed: true, browser: true, prepare: () => grant() },
    { name: 'suspended', allowed: false, browser: true, prepare: () => grant({ status: 'suspended' }) },
    { name: 'expired', allowed: false, prepare: () => grant({ endsAt: new Date(now.getTime() - 86400000) }) },
    { name: 'future', allowed: false, prepare: () => grant({ startsAt: new Date(now.getTime() + 86400000) }) },
    { name: 'missing', allowed: false, prepare: () => db.tenantModuleGrant.delete({ where: { organizationId_moduleSlug: { organizationId: org.id, moduleSlug: 'purchasing' } } }) },
    { name: 'read-only', allowed: true, browser: true, prepare: () => grant({ status: 'read_only' }) },
    { name: 'read-only-flag', allowed: true, prepare: () => grant({ readOnly: true }) },
    { name: 'recommended-inventory-suspended', allowed: true, prepare: () => db.tenantModuleGrant.create({ data: { organizationId: org.id, moduleSlug: 'inventory', status: 'suspended', source: 'requested_modules' } }) },
    { name: 'stopped-new-work-retained', allowed: true, browser: true, prepare: () => db.tenantModuleConfiguration.update({ where: { organizationId: org.id }, data: { selectedModules: modules.filter(m => m !== 'purchasing'), activeModules: modules.filter(m => m !== 'purchasing'), newWorkStoppedModules: ['purchasing'] } }) },
    { name: 'summary-only', allowed: true, details: false, browser: true, permissions: ['dashboard.read', 'analytics.read'], prepare: async () => {} },
    { name: 'permission-revoked', allowed: false, details: false, browser: true, permissions: ['analytics.read'], prepare: async () => {} },
  ];
  const contexts = {};
  for (const test of cases) {
    await test.prepare(); const actorPermissions = test.permissions ?? permissions, details = test.allowed && test.details !== false;
    await db.role.update({ where: { id: role.id }, data: { permissions: actorPermissions } });
    const row = { name: test.name, allowed: test.allowed, details, locales: [] }; result.checks.push(row);
    for (const locale of ['en', 'fr']) {
      const data = await getDailyHabitDigestData({ organizationId: org.id, actorId: actor.id, actorPermissions, actorRoleCodes: ['manager'], locale, now });
      const manager = data.digests.find(d => d.id === 'manager-run-sheet');
      assert.equal(Boolean(manager), actorPermissions.includes('dashboard.read'));
      if (manager) assert.equal(manager.zones[0].primaryMetric.value, test.allowed ? 1 : null);
      if (manager && !test.allowed) assert.equal(manager.zones[0].primaryMetric.state, 'module_unavailable');
      assert.equal(data.digests.flatMap(d => d.actions).some(a => a.href.endsWith('/purchase-orders')), details);
      const detailText = locale === 'en' ? '1 pending purchase order(s) have passed their recorded expected delivery time.' : '1 commande en attente a dépassé l’heure de livraison prévue enregistrée.';
      assert.equal(JSON.stringify(data).includes(detailText), details, test.name + ': serialized receiving detail');
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
      assert.equal((await response.text()).includes(detailText), details, test.name + ': SSR receiving detail');
      const selector = page.getByRole('button', { name: locale === 'en' ? 'Manager' : 'Responsable', exact: true });
      if (manager) { await expect(selector).toBeEnabled(); await selector.focus(); await page.keyboard.press('Enter'); await expect(selector).toHaveAttribute('aria-pressed', 'true'); }
      else await expect(selector).toHaveCount(0);
      const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true });
      await expect(command).toBeEnabled(); await command.focus(); await page.keyboard.press('Enter');
      const links = page.locator('#daily-digest-view a[href$="/purchase-orders"]');
      if (details) await expect(links.first()).toBeVisible(); else await expect(links).toHaveCount(0);
      entry.screenshot = 'digest-purchasing-' + stamp + '-' + test.name + '-' + locale + '.png'; await page.screenshot({ path: path.join(__dirname, entry.screenshot), animations: 'disabled', caret: 'initial' });
      await page.goto(base + '/' + locale + '/dashboard/purchase-orders', { waitUntil: 'domcontentloaded', timeout: 120000 });
      if (details) await expect(page.getByText(order.orderNumber, { exact: true }).first()).toBeVisible();
      else {
        await expect(page.getByText(order.orderNumber, { exact: true })).toHaveCount(0);
        const deniedPermission = !actorPermissions.includes('purchases.orders.read');
        await expect(page.getByRole('heading', { name: deniedPermission ? (locale === 'en' ? 'Purchase order dashboard is not available for this role' : 'Accès aux commandes fournisseurs refusé') : (locale === 'en' ? 'Purchasing is not available' : 'Les achats sont indisponibles'), exact: true })).toBeVisible();
      }
      entry.destinationScreenshot = 'digest-purchasing-' + stamp + '-' + test.name + '-' + locale + '-destination.png'; await page.screenshot({ path: path.join(__dirname, entry.destinationScreenshot), animations: 'disabled', caret: 'initial' });
      entry.destinationVerified = true; assert.deepEqual(errors, []); entry.browser = true; await page.close();
    }
    console.log(test.name + ': passed');
  }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-purchasing-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: result.passed, checks: result.checks.length, error: result.error })); await db.$disconnect();
});
