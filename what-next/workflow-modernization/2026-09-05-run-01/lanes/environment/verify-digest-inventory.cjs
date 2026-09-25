const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getInventoryCashSnapshot } = require(path.join(f.root, 'services/snapshots/inventory-cash-snapshot.service.ts'));
const { buildBusinessSignalsFromSnapshots } = require(path.join(f.root, 'services/signals/business-signal-rules.service.ts'));
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/signals/business-signal-rules.service.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-signal-presentation.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), browser: [] }; let browser, page;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Inventory digest ' + stamp, slug: 'inventory-digest-' + stamp, currency: 'XAF', requestedModules: ['inventory'] } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'inventory.read', 'inventory.items.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'stockkeeper', nameEn: 'Owned stock reader', permissions, users: { connect: { id: actor.id } } } });
  const location = await db.location.create({ data: { organizationId: org.id, name: 'Owned stock location', code: 'STOCK' } });
  const item = await db.item.create({ data: { organizationId: org.id, nameEn: 'Owned Digest Item', nameFr: 'Article du digest de test', sku: 'DIGEST-' + stamp, slug: 'digest-' + stamp, imageUrls: [] } });
  await db.inventoryLevel.create({ data: { itemId: item.id, locationId: location.id, quantityOnHand: 10, quantityReserved: 10, quantityAvailable: 0, totalValue: 2000000, averageCost: 200000 } });
  const snapshot = await getInventoryCashSnapshot({ organizationId: org.id });
  assert.equal(snapshot.metrics.inventoryValue, 2000000); assert.equal(snapshot.metrics.periodTransactionCount, 0);
  const signals = buildBusinessSignalsFromSnapshots({ organizationId: org.id, snapshots: [snapshot], now: snapshot.generatedAt });
  assert.deepEqual(signals.map(signal => signal.signalType), ['stockout_risk']);
  assert.equal(signals[0].requiredPermission, 'inventory.items.read'); result.snapshotContract = true;
  const effects = async () => JSON.stringify({ stock: await db.inventoryLevel.findMany({ where: { itemId: item.id } }), transactions: await db.inventoryTransaction.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), events: await db.businessEvent.count({ where: { organizationId: org.id } }) });
  const before = await effects(); browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    await db.role.update({ where: { id: role.id }, data: { permissions } });
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 390 : 1440, height: 1100 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password } })).status(), 200);
    page = await context.newPage(); const row = { locale, errors: [] }; result.browser.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    const digestUrl = base + '/' + locale + '/dashboard/daily-digest';
    await page.goto(digestUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true });
    await expect(command).toBeEnabled(); await command.focus(); await page.keyboard.press('Enter');
    const region = page.getByRole('region', { name: locale === 'en' ? 'Actions and risks' : 'Actions et risques', exact: true });
    await expect(region.getByRole('heading', { name: locale === 'en' ? 'Stockout Risk' : 'Risque de rupture de stock', exact: true })).toBeVisible();
    await expect(region.getByText('Dead Stock Cash Exposure', { exact: true })).toHaveCount(0);
    row.screenshot = 'digest-inventory-' + stamp + '-' + locale + '.png';
    await page.screenshot({ path: path.join(__dirname, row.screenshot), animations: 'disabled', caret: 'initial' });
    const target = '/' + locale + '/dashboard/inventory/items', link = region.locator('a[href="' + target + '"]').first();
    await link.focus(); await page.keyboard.press('Enter'); await page.waitForURL(base + target, { timeout: 120000 });
    await expect(page.getByText(item.sku, { exact: true }).first()).toBeVisible(); row.handoff = true;
    // The destination's older item adapter currently exposes nameEn in both locales.
    // Record that separate localization defect, rather than claiming a French item page.
    row.destinationFrenchNameVisible = locale === 'fr' ? await page.getByText(item.nameFr, { exact: true }).isVisible() : null;
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 120000 }); await expect(command).toHaveAttribute('aria-pressed', 'true');
    await db.role.update({ where: { id: role.id }, data: { permissions: ['dashboard.read', 'inventory.read'] } });
    await link.focus(); await page.keyboard.press('Enter'); await page.waitForURL(base + target, { timeout: 120000 });
    await expect(page.getByRole('heading', { name: 'Inventory items is not available for this role', exact: true })).toBeVisible(); row.revocationDenied = true;
    await page.goto(digestUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.getByRole('button', { name: locale === 'en' ? 'Stockkeeper' : 'Magasinier', exact: true })).toBeVisible();
    await expect(page.getByText(locale === 'en' ? 'Your role can view this summary, but opening item details requires additional permission.' : 'Votre rôle peut consulter cette synthèse, mais l’accès aux détails des articles nécessite une autorisation supplémentaire.').first()).toBeVisible();
    await expect(page.locator('main').last().locator('a[href="' + target + '"]')).toHaveCount(0); row.summaryRetained = true;
    assert.deepEqual(row.errors, []); await context.close();
  }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(async error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1;
  if (page && !page.isClosed()) result.failureState = await page.locator('main').last().innerText({ timeout: 5000 }).then(text => f.safe(text, secrets)).catch(() => 'Unavailable');
}).finally(async () => { await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-inventory-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect(); });
