const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const organizationId = 'workflow_pos_cart_concurrency_2c6e1737-7a42-488f-acf7-249115781b88', base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/pos/pos.service.ts', 'components/pos/ProfessionalPOSSystem.tsx', 'hooks/posHooks/usePosOperations.ts', 'messages/en.json', 'messages/fr.json'];
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { at: new Date().toISOString(), sourcesBefore: sources(), browser: [], scope: 'Owned local cashier login, real cart server actions and persisted quantities; no checkout or provider request.' };
let browser;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  assert.ok((await db.organization.findUniqueOrThrow({ where: { id: organizationId } })).name.startsWith(f.helper.prefix));
  const user = await db.user.findFirstOrThrow({ where: { organizationId } }), session = await db.pOSSession.findFirstOrThrow({ where: { organizationId, userId: user.id, status: 'ACTIVE' } });
  const sale = await db.salesOrder.findFirstOrThrow({ where: { organizationId, createdById: user.id, status: 'DRAFT' }, include: { lines: true } });
  const password = 'Owned-cart-' + crypto.randomUUID() + '!'; secrets.push(password); const passwordHash = await hashPassword(password);
  await db.user.update({ where: { id: user.id }, data: { password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
  const role = await db.role.findUniqueOrThrow({ where: { organizationId_code: { organizationId, code: 'administrator' } } });
  assert.equal(role.nameEn, 'Owned cashier');
  await db.role.update({ where: { id: role.id }, data: { permissions: ['dashboard.read','pos.use','pos.read'] } });
  await db.account.updateMany({ where: { userId: user.id, providerId: 'credential' }, data: { password: passwordHash } });
  assert.equal(await db.cashDrawerTransaction.count({ where: { sessionId: session.id, type: 'OPENING_BALANCE' } }), 1);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
    for (const locale of ['en','fr']) {
      const page = await context.newPage(), sample = { locale, pageErrors: [], screenshots: [] }; report.browser.push(sample);
      page.setDefaultNavigationTimeout(180000); page.setDefaultTimeout(60000); page.on('pageerror', e => sample.pageErrors.push(f.safe(e, secrets)));
      const copy = require(path.join(f.root, 'messages', locale + '.json')).pos;
      const started = Date.now(); await page.goto(base + '/' + locale + '/dashboard/pos');
      const row = page.getByTestId('pos-cart-line').first(), quantity = row.getByRole('spinbutton');
      await expect(quantity).toBeVisible(); sample.readyMs = Date.now() - started;
      const prior = String((await db.salesOrderLine.findUniqueOrThrow({ where: { id: sale.lines[0].id } })).quantity);
      await quantity.fill('25'); await quantity.press('Tab');
      await expect(quantity).toHaveAttribute('aria-invalid','true'); await expect(quantity).toHaveValue('25');
      await expect(row.getByRole('alert')).toHaveText(copy.notifications.quantityNotSavedMessage);
      await expect(page.getByText('Operation Failed', { exact: true })).toHaveCount(0);
      sample.noDuplicateGlobalError = true;
      assert.equal(String((await db.salesOrderLine.findUniqueOrThrow({ where: { id: sale.lines[0].id } })).quantity), prior);
      await expect(page.getByTestId('pos-charge-footer').getByRole('button')).toBeDisabled();
      sample.rejectionRetainsDraftAndStoredQuantity = true;
      for (const width of [1440,768,320]) {
        await page.setViewportSize({ width, height: 1100 }); await row.scrollIntoViewIfNeeded();
        sample['reflow' + width] = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
        const file = 'pos-cart-v122-' + locale + '-' + width + '-' + stamp + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); sample.screenshots.push(file);
      }
      await quantity.fill(locale === 'en' ? '4' : '5'); await quantity.press('Tab');
      await expect(quantity).not.toHaveAttribute('aria-invalid','true');
      assert.equal(String((await db.salesOrderLine.findUniqueOrThrow({ where: { id: sale.lines[0].id } })).quantity), locale === 'en' ? '4' : '5');
      sample.explicitCorrectionSaved = true; assert.equal(sample.pageErrors.length, 0); await page.close();
    }
    assert.equal(await db.payment.count({ where: { organizationId } }), 0); assert.equal(await db.journalEntry.count({ where: { organizationId } }), 0);
    report.passed = true;
  } finally { await context.close(); }
}
main().catch(e => { report.error = f.safe(e, secrets); process.exitCode = 1; }).finally(async () => {
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  const file = path.join(__dirname, 'pos-cart-browser-v122-' + stamp + '.json'); console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await browser?.close(); await db.$disconnect(); }
});
