const f = require('./statement-recipient-fixtures.cjs');
const { db, fs, path, crypto, assert } = f;
const { getTenantOperatingSnapshot } = require(path.join(f.root, 'services/snapshots/tenant-operating-snapshot.service.ts'));
const { getBranchOperatingSnapshot } = require(path.join(f.root, 'services/snapshots/branch-operating-snapshot.service.ts'));
const { buildBusinessSignalsFromSnapshots } = require(path.join(f.root, 'services/signals/business-signal-rules.service.ts'));
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const files = ['services/snapshots/snapshot-contracts.ts', 'services/snapshots/tenant-operating-snapshot.service.ts', 'services/snapshots/branch-operating-snapshot.service.ts', 'services/signals/business-signal-rules.service.ts', 'services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-signal-presentation.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [], browser: [] }; let browser;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Overdue ' + stamp, slug: 'overdue-' + stamp, currency: 'XAF', timezone: 'UTC' } });
  const other = await db.organization.create({ data: { name: f.helper.prefix + 'Foreign overdue ' + stamp, slug: 'foreign-overdue-' + stamp } });
  const password = 'Owned-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  const actor = await db.user.create({ data: { organizationId: org.id, email: 'overdue-' + stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
  const permissions = ['dashboard.read', 'purchases.orders.read'];
  const role = await db.role.create({ data: { organizationId: org.id, code: 'manager', nameEn: 'Owned manager', permissions, users: { connect: { id: actor.id } } } });
  const supplier = await db.supplier.create({ data: { organizationId: org.id, name: 'Owned supplier' } });
  const foreignSupplier = await db.supplier.create({ data: { organizationId: other.id, name: 'Foreign supplier' } });
  const site = await db.location.create({ data: { organizationId: org.id, name: 'Site A', code: 'A' } });
  const siteB = await db.location.create({ data: { organizationId: org.id, name: 'Site B', code: 'B' } });
  const foreignSite = await db.location.create({ data: { organizationId: other.id, name: 'Foreign site', code: 'F' } });
  const now = new Date(), past = new Date(now.getTime() - 86400000), future = new Date(now.getTime() + 86400000);
  let serial = 0;
  const order = (overrides = {}) => db.purchaseOrder.create({ data: { organizationId: org.id, supplierId: supplier.id, locationId: site.id, createdById: actor.id, orderNumber: 'OVERDUE-' + stamp + '-' + (++serial), status: 'SUBMITTED', expectedDeliveryDate: past, ...overrides } });
  const late = await order(); await order({ status: 'APPROVED' }); await order({ status: 'PARTIALLY_RECEIVED' });
  await order({ expectedDeliveryDate: null }); await order({ expectedDeliveryDate: future });
  const equal = await order({ expectedDeliveryDate: now });
  await order({ status: 'DRAFT' }); await order({ status: 'RECEIVED' }); await order({ status: 'CANCELLED' }); await order({ deletedAt: now });
  const branchBOrder = await order({ locationId: siteB.id });
  await order({ organizationId: other.id, supplierId: foreignSupplier.id, locationId: foreignSite.id, createdById: null });
  const count = async () => ({ events: await db.businessEvent.count({ where: { organizationId: org.id } }), journals: await db.journalEntry.count({ where: { organizationId: org.id } }), payments: await db.payment.count({ where: { organizationId: org.id } }) });
  const effectsBefore = await count();
  const scope = { organizationId: org.id, now };
  const tenant = await getTenantOperatingSnapshot(scope), branch = await getBranchOperatingSnapshot({ ...scope, locationId: site.id });
  assert.equal(tenant.metrics.pendingPurchaseOrderCount, 7); assert.equal(tenant.metrics.overduePurchaseOrderCount, 4);
  assert.equal(branch.metrics.pendingPurchaseOrderCount, 6); assert.equal(branch.metrics.overduePurchaseOrderCount, 3);
  const signals = snapshot => buildBusinessSignalsFromSnapshots({ organizationId: org.id, snapshots: [snapshot], now }).filter(s => s.signalType === 'purchase_order_receiving_delay');
  assert.equal(signals(tenant)[0].severity, 'medium'); assert.equal(signals(branch)[0].severity, 'high');
  assert.equal(signals(tenant)[0].payload.overduePurchaseOrderCount, 4); assert.equal(signals(tenant)[0].sourceHash, tenant.sourceHash);
  const foreignBranch = await getBranchOperatingSnapshot({ ...scope, locationId: foreignSite.id });
  assert.equal(foreignBranch.metrics.overduePurchaseOrderCount, null); assert.equal(signals(foreignBranch).length, 0);
  result.checks.push('Actual PostgreSQL timestamp boundary: null/future/equal excluded; past included only for three pending statuses; deleted/closed/cancelled/draft excluded; tenant and branch isolation; severity based on overdue count.');
  await db.purchaseOrder.updateMany({ where: { organizationId: org.id, id: { not: late.id } }, data: { expectedDeliveryDate: future } });
  const digestInput = { organizationId: org.id, actorPermissions: permissions, actorRoleCodes: ['manager'], now };
  const digest = await getDailyHabitDigestData({ ...digestInput, locale: 'fr' });
  assert.ok(JSON.stringify(digest).includes('1 commande en attente a dépassé'));
  const denied = await getDailyHabitDigestData({ ...digestInput, actorPermissions: ['dashboard.read'] });
  assert.equal(denied.digests.flatMap(d => d.changes).length, 0);
  const originalCount = db.purchaseOrder.count;
  try {
    db.purchaseOrder.count = async () => { throw new Error('Owned failed source read'); };
    await assert.rejects(() => getDailyHabitDigestData(digestInput), /Owned failed source read/);
  } finally { db.purchaseOrder.count = originalCount; }
  result.checks.push('Actual digest composes localized overdue evidence, filters revoked source permission, and rejects failed source reads rather than returning zero.');
  browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    await db.role.update({ where: { id: role.id }, data: { permissions } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password } })).status(), 200);
    const page = await context.newPage(), row = { locale, screenshots: [], errors: [] }; result.browser.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    await page.goto(base + `/${locale}/dashboard/daily-digest`, { timeout: 120000 });
    const title = locale === 'en' ? 'Purchase Order Receiving Delay' : 'Commandes au-delà de la date de livraison prévue';
    const summary = page.getByRole('region', { name: locale === 'en' ? 'Summary and changes' : 'Synthèse et évolutions', exact: true });
    for (const width of [1440, 768, 320]) {
      await page.setViewportSize({ width, height: 1000 }); await expect(summary.getByText(title, { exact: true })).toBeVisible();
      await expect(summary.getByText(locale === 'en' ? 'Risk score: 50' : 'Score de risque: 50', { exact: true })).toBeVisible();
      if (locale === 'fr') await expect(summary.getByText('Les retards de réception peuvent signaler un risque fournisseur, une rupture de stock ou un décalage des échéances fournisseurs.', { exact: true })).toBeVisible();
      await summary.getByText(title, { exact: true }).scrollIntoViewIfNeeded();
      const shot = `digest-overdue-v161-${stamp}-${locale}-${width}.png`; await page.screenshot({ path: path.join(__dirname, shot), caret: 'initial', animations: 'disabled' }); row.screenshots.push(shot);
    }
    await page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true }).focus(); await page.keyboard.press('Enter');
    const actions = page.getByRole('region', { name: locale === 'en' ? 'Actions and risks' : 'Actions et risques', exact: true });
    const link = actions.locator(`a[href="/${locale}/dashboard/purchase-orders"]`).first(); await expect(link).toBeVisible();
    const handoffStarted = Date.now();
    await link.focus(); await page.keyboard.press('Enter'); await page.waitForURL(new RegExp(`/${locale}/dashboard/purchase-orders$`), { waitUntil: 'domcontentloaded', timeout: 120000 }); row.keyboardSourceHandoff = true; row.handoffMs = Date.now() - handoffStarted;
    await page.goBack(); await expect(summary.getByText(title, { exact: true })).toBeVisible();
    await db.purchaseOrder.update({ where: { id: late.id }, data: { expectedDeliveryDate: future } }); await page.reload(); await expect(summary.getByText(title, { exact: true })).toHaveCount(0);
    await db.purchaseOrder.update({ where: { id: late.id }, data: { expectedDeliveryDate: past } }); await page.reload(); await expect(summary.getByText(title, { exact: true })).toBeVisible(); row.sourceCorrectionAndRecovery = true;
    await db.role.update({ where: { id: role.id }, data: { permissions: ['dashboard.read'] } }); await page.reload(); await expect(summary.getByText(title, { exact: true })).toHaveCount(0); row.currentPermission = true;
    assert.deepEqual(row.errors, []); await context.close();
  }
  assert.deepEqual(await count(), effectsBefore); assert.equal((await db.purchaseOrder.findUniqueOrThrow({ where: { id: late.id } })).status, 'SUBMITTED');
  result.noFinancialEffects = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-overdue-v161-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect();
});
