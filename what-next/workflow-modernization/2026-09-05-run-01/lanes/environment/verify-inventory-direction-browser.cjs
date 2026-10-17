const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert, root, helper } = f;
const { hashPassword } = require(path.join(root, 'lib/password.ts')), { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const files = ['services/inventory/inventory-adjustment.service.ts', 'services/accounting/default-posting-rules.ts', 'services/accounting/control-center.service.ts', 'components/accounting/AccountingControlCenter.tsx'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [], result = { at: new Date().toISOString(), sourceBefore: hashes(), cases: [] }; let browser, page;
async function main() {
  assert.match(process.argv[2] ?? '', /^inventory-direction-[a-f0-9-]+\.json$/);
  const runtime = JSON.parse(fs.readFileSync(path.join(__dirname, process.argv[2]))); assert.ok(runtime.passed && runtime.sourceStable);
  await helper.withClient(f.target, helper.assertOwned);
  const x = runtime.cases.find(c => c.name === 'mixed'), scope = { organizationId: x.organizationId };
  assert.ok((await db.organization.findUniqueOrThrow({ where: { id: x.organizationId } })).name.startsWith(helper.prefix));
  browser = await chromium.launch({ headless: true });
  for (const [locale, width] of [['en', 1440], ['fr', 320]]) {
    const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password);
    const hashed = await hashPassword(password), actor = await db.user.create({ data: { ...scope, email: crypto.randomUUID() + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
    await db.account.create({ data: { userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed } });
    const existing = await db.role.findFirst({ where: { ...scope, code: 'admin' } });
    if (existing) { assert.equal(existing.nameEn, 'Owned inventory observer'); await db.role.update({ where: { id: existing.id }, data: { users: { connect: { id: actor.id } } } }); }
    else await db.role.create({ data: { ...scope, code: 'admin', nameEn: 'Owned inventory observer', permissions: ['dashboard.read', 'accounting.setup.manage'], users: { connect: { id: actor.id } } } });
    const stateHash = async () => f.hash(await Promise.all(['journalEntry', 'journalEntryLine', 'payment', 'organizationAccountingSettings', 'postingRule', 'postingRuleLine'].map(model => db[model].findMany({ where: scope, orderBy: { id: 'asc' } }))));
    const before = await stateHash(), context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(f.safe(e, secrets))); const start = Date.now();
    await page.goto(base + '/' + locale + '/dashboard/accounting/control-center', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await expect(page.getByRole('button', { name: locale === 'fr' ? 'Verrouiller' : 'Lock setup', exact: true })).toBeDisabled();
    const link = page.getByRole('link', { name: locale === 'fr' ? /Statut des regles d.ecriture/ : /Posting rules status/ }).first(); await link.focus(); await page.keyboard.press('Enter');
    await page.locator('#accounting-rules').getByRole('searchbox').fill('INVENTORY_ADJUSTMENT');
    await expect(page.locator('#accounting-rules').getByRole('button', { name: locale === 'fr' ? 'Effacer la recherche' : 'Clear table search', exact: true })).toBeVisible();
    const text = page.locator('#accounting-rules').getByText(locale === 'fr' ? 'Ajustement de stock' : 'Inventory adjustment', { exact: true });
    await expect(text).toBeVisible(); await text.scrollIntoViewIfNeeded();
    const row = text.locator('xpath=ancestor::tr'); await expect(row).toContainText('D 2 / C 2');
    const layout = await page.evaluate(() => ({ viewport: innerWidth, body: document.documentElement.scrollWidth })); assert.ok(layout.body <= layout.viewport + 1);
    assert.equal(await stateHash(), before); assert.deepEqual(errors, []);
    const screenshot = 'inventory-direction-browser-' + stamp + '-' + locale + width + '.png'; await page.screenshot({ path: path.join(__dirname, screenshot), animations: 'disabled' });
    result.cases.push({ locale, width, routeAndNavigationMs: Date.now() - start, localizedRule: true, setupRemainsBlocked: true, keyboardSectionNavigation: true, noConfigurationOrFinancialEffects: true, layout, screenshot });
    await context.close(); console.log(JSON.stringify({ locale, passed: true }));
  }
  result.passed = true;
}
main().catch(async e => { result.passed = false; result.error = f.safe(e, secrets); if (page && !page.isClosed()) { result.failureScreenshot = 'inventory-direction-browser-' + stamp + '-failed.png'; await page.screenshot({ path: path.join(__dirname, result.failureScreenshot) }).catch(() => {}); } }).finally(async () => {
  await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); result.passed = !!result.passed && result.sourceStable;
  const receipt = 'inventory-direction-browser-' + stamp + '.json'; fs.writeFileSync(path.join(__dirname, receipt), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ receipt, passed: result.passed, error: result.error })); await db.$disconnect(); process.exitCode = result.passed ? 0 : 1;
});
